import "server-only";
import { createHash } from "node:crypto";
import { getOrderBackend, ordersEnabled } from "@/lib/orders";
import { CommerceUnavailableError, OrderOutcomeUnknownError, type Order } from "@/lib/commerce/types";
import { OrderRefusedError } from "@/lib/orders/sheets";
import { getContent } from "@/lib/cms";
import { beginCheckout, finishCheckout, PENDING_STALE_MS, releaseCheckout } from "./idempotency";
import type { Quote } from "./pricing";
import { storePickupEnabled } from "./fulfillment";
import { buildQuote } from "./quote";
import type { OrderRequest } from "./schema";

export type PlaceOrderResult =
  | { kind: "created"; order: PublicOrderConfirmation }
  | { kind: "processing" }
  | { kind: "unknown" }
  | { kind: "changed"; quote: Quote }
  | { kind: "not-orderable"; quote: Quote }
  | { kind: "conflict" }
  | { kind: "disabled" }
  | { kind: "pickup-disabled" }
  | { kind: "blocked"; message: "too-many" | "blocked" };

/** What the confirmation page receives — only data the customer just entered or the order totals. */
export interface PublicOrderConfirmation {
  ref: string;
  simulated: boolean;
  createdAt: string;
  fulfillment: Order["fulfillment"];
  payment: Order["payment"];
  lines: Order["lines"];
  subtotal: number;
  discount: number;
  shippingFee: number;
  total: number;
  phoneMasked: string;
}

export function maskPhone(phone: string) {
  return phone.length > 4 ? `${"•".repeat(Math.max(0, phone.length - 3))}${phone.slice(-3)}` : "•••";
}

function toPublic(o: Order): PublicOrderConfirmation {
  return {
    ref: o.ref,
    simulated: o.simulated,
    createdAt: o.createdAt,
    fulfillment: o.fulfillment,
    payment: o.payment,
    lines: o.lines,
    subtotal: o.subtotal,
    discount: o.discount,
    shippingFee: o.shippingFee,
    total: o.total,
    phoneMasked: maskPhone(o.customerPhone),
  };
}

export function fingerprint(req: OrderRequest): string {
  const lines = [...req.lines].map((l) => `${l.variantId}x${l.quantity}`).sort().join(",");
  // The upsell changes what is bought and what it costs, so two carts that differ only by the
  // offer must not share a fingerprint.
  const upsell = req.upsell ? `${req.upsell.variantId}x${req.upsell.quantity}` : "";
  return createHash("sha256")
    .update([lines, upsell, req.fulfillment, req.couponCode ?? "", req.address?.provinceCode ?? "", req.customer.phone].join("|"))
    .digest("hex")
    .slice(0, 32);
}

async function reconcile(checkoutId: string, fp: string): Promise<PlaceOrderResult | null> {
  const found = await getOrderBackend().findOrderByCheckoutId(checkoutId);
  if (!found) return null;
  await finishCheckout(checkoutId, { status: "created", fingerprint: fp, orderRef: found.ref, simulated: found.simulated, createdAt: Date.now() });
  return { kind: "created", order: toPublic(found) };
}

export async function placeOrder(req: OrderRequest): Promise<PlaceOrderResult> {
  if (!ordersEnabled()) return { kind: "disabled" };
  if (req.fulfillment === "pickup" && !storePickupEnabled()) return { kind: "pickup-disabled" };
  const orders = getOrderBackend();

  const fp = fingerprint(req);
  const claim = await beginCheckout(req.checkoutId, fp);

  if (claim.kind === "conflict") return { kind: "conflict" };
  if (claim.kind === "existing") {
    const r = claim.record;
    if (r.status === "created") {
      const order = await orders.getOrder(r.orderRef).catch(() => null);
      if (order) return { kind: "created", order: toPublic(order) };
      // Order exists but cannot be re-read right now: still never create a second one.
      return { kind: "processing" };
    }
    const age = Date.now() - r.startedAt;
    if (r.status === "pending" && age < PENDING_STALE_MS) return { kind: "processing" };
    // Stale pending or unknown outcome: look for the order before anything else.
    const rec = await reconcile(req.checkoutId, fp);
    if (rec) return rec;
    if (r.status === "unknown" && age < 30_000) return { kind: "unknown" };
    // Nothing found after the grace period → safe to try again under the same checkoutId.
    await finishCheckout(req.checkoutId, { status: "pending", fingerprint: fp, startedAt: Date.now() });
  }

  let quote: Quote;
  try {
    quote = await buildQuote({
      lines: req.lines,
      couponCode: req.couponCode,
      fulfillment: req.fulfillment,
      provinceCode: req.fulfillment === "delivery" ? req.address?.provinceCode : null,
      upsell: req.upsell,
    });
  } catch (e) {
    await releaseCheckout(req.checkoutId);
    throw e;
  }
  if (quote.changes.length > 0 || quote.total !== req.confirmedTotal) {
    await releaseCheckout(req.checkoutId);
    return { kind: "changed", quote };
  }
  if (!quote.orderable) {
    await releaseCheckout(req.checkoutId);
    return { kind: "not-orderable", quote };
  }

  const settings = req.fulfillment === "pickup" ? await getContent().siteSettings(req.locale) : null;

  try {
    const order = await orders.createOrder({
      checkoutId: req.checkoutId,
      locale: req.locale,
      lines: quote.lines,
      fulfillment: req.fulfillment,
      payment: req.fulfillment === "pickup" ? "cash_at_store" : "cod",
      customer: { fullName: req.customer.fullName, phone: req.customer.phone, email: req.customer.email || undefined },
      shippingAddress:
        req.fulfillment === "delivery" && req.address
          ? {
              fullName: req.customer.fullName,
              phone: req.customer.phone,
              email: req.customer.email || undefined,
              provinceCode: req.address.provinceCode!,
              ward: req.address.ward!,
              street: req.address.street!,
            }
          : null,
      pickupStoreId: settings?.store?.id ?? null,
      note: req.note,
      couponCode: quote.coupon?.code ?? null,
      subtotal: quote.subtotal,
      discount: quote.discount,
      shippingFee: quote.shippingFee,
      total: quote.total,
    });
    await finishCheckout(req.checkoutId, { status: "created", fingerprint: fp, orderRef: order.ref, simulated: order.simulated, createdAt: Date.now() });
    return { kind: "created", order: toPublic(order) };
  } catch (e) {
    if (e instanceof OrderOutcomeUnknownError) {
      await finishCheckout(req.checkoutId, { status: "unknown", fingerprint: fp, startedAt: Date.now() });
      return { kind: "unknown" };
    }
    if (e instanceof OrderRefusedError) {
      await releaseCheckout(req.checkoutId);
      return { kind: "blocked", message: e.rule };
    }
    if (e instanceof CommerceUnavailableError) await releaseCheckout(req.checkoutId);
    throw e;
  }
}

/** For the "Check again" button after an unknown outcome. */
export async function checkOrderStatus(checkoutId: string, fp: string | null): Promise<PlaceOrderResult> {
  const found = await getOrderBackend().findOrderByCheckoutId(checkoutId);
  if (found) {
    if (fp) await finishCheckout(checkoutId, { status: "created", fingerprint: fp, orderRef: found.ref, simulated: found.simulated, createdAt: Date.now() });
    return { kind: "created", order: toPublic(found) };
  }
  return { kind: "unknown" };
}
