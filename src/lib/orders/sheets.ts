import "server-only";
import {
  CommerceUnavailableError,
  OrderOutcomeUnknownError,
  type CreateOrderInput,
  type Order,
  type OrderLine,
  type OrderStatus,
} from "@/lib/commerce/types";
import { provinceName } from "@/lib/checkout/provinces";

/**
 * Orders stored in the owner's Google Sheet through a Google Apps Script web app
 * (integrations/google-sheets/Code.gs). Called from the server only: the web app URL and the
 * shared secret never reach the browser. The script de-duplicates by checkoutId under a lock,
 * so a retried request after a timeout returns the same order instead of a second row.
 */

export interface SheetsConfig {
  url: string;
  secret: string;
}

export function readSheetsConfig(): SheetsConfig {
  const url = process.env.GOOGLE_SHEETS_WEBAPP_URL?.trim();
  const secret = process.env.GOOGLE_SHEETS_SECRET?.trim();
  if (!url || !/^https:\/\/script\.google(usercontent)?\.com\//.test(url)) {
    throw new CommerceUnavailableError("GOOGLE_SHEETS_WEBAPP_URL is not configured");
  }
  if (!secret || secret.length < 24) throw new CommerceUnavailableError("GOOGLE_SHEETS_SECRET is not configured");
  return { url, secret };
}

export function sheetsConfigured(): boolean {
  try {
    readSheetsConfig();
    return true;
  } catch {
    return false;
  }
}

/** Order as returned by the Apps Script. */
export interface SheetOrder {
  ref: string;
  createdAt: string;
  status: OrderStatus;
  paid: boolean;
  fulfillment: "delivery" | "pickup";
  payment: "cod" | "cash_at_store";
  lines: OrderLine[];
  subtotal: number;
  discount: number;
  shippingFee: number;
  total: number;
  customerName: string;
  customerPhone: string;
  provinceCode: string | null;
  ward: string | null;
  street: string | null;
  carrier?: string | null;
  trackingNumber?: string | null;
}

type ScriptResponse = { ok: true; order: SheetOrder | null; duplicate?: boolean } | { ok: false; error: string };

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function call(cfg: SheetsConfig, action: string, payload: unknown, timeoutMs: number): Promise<ScriptResponse> {
  const res = await fetch(cfg.url, {
    method: "POST",
    // Apps Script answers with a 302 to googleusercontent.com; fetch follows it (as a GET), which is the documented pattern.
    redirect: "follow",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ secret: cfg.secret, action, payload }),
    signal: AbortSignal.timeout(timeoutMs),
    cache: "no-store",
  });
  if (!res.ok) throw new HttpError(res.status);
  const text = await res.text();
  try {
    return JSON.parse(text) as ScriptResponse;
  } catch {
    // An HTML page here usually means the web app is not deployed for "Anyone" or the URL is wrong.
    throw new HttpError(res.status, "non-json");
  }
}

class HttpError extends Error {
  constructor(readonly status: number, readonly kind = "http") {
    super(`Apps Script HTTP ${status} ${kind}`);
  }
}

/** Reads: retried twice; any failure is an outage, never mock data. */
async function read(action: string, payload: unknown): Promise<SheetOrder | null> {
  const cfg = readSheetsConfig();
  let last = "";
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const r = await call(cfg, action, payload, 15_000);
      if (!r.ok) throw new CommerceUnavailableError("Google Sheet rejected the request", r.error);
      return r.order;
    } catch (e) {
      if (e instanceof CommerceUnavailableError) throw e;
      last = e instanceof Error ? e.message : "network";
      await sleep(400 * 2 ** attempt);
    }
  }
  throw new CommerceUnavailableError("Google Sheet unavailable", last);
}

export function toOrder(o: SheetOrder): Order {
  const delivery = o.fulfillment === "delivery";
  return {
    ref: o.ref,
    externalId: o.ref,
    createdAt: o.createdAt,
    status: o.status,
    financialStatus: o.paid ? "paid" : "pending",
    fulfillment: o.fulfillment,
    payment: o.payment,
    lines: o.lines,
    subtotal: o.subtotal,
    discount: o.discount,
    shippingFee: o.shippingFee,
    total: o.total,
    customerName: o.customerName,
    customerPhone: o.customerPhone,
    shippingAddress:
      delivery && o.provinceCode
        ? { fullName: o.customerName, phone: o.customerPhone, provinceCode: o.provinceCode, ward: o.ward ?? "", street: o.street ?? "" }
        : null,
    simulated: false,
    shipment: o.carrier || o.trackingNumber ? { carrier: o.carrier ?? null, trackingNumber: o.trackingNumber ?? null } : null,
  };
}

export const sheetsOrders = {
  /**
   * Single attempt, no blind retry. A definite rejection (bad secret, invalid data) means no row was
   * written; anything ambiguous (timeout, network, 5xx, unreadable reply) may have written one, so the
   * caller reconciles with findOrderByCheckoutId before trying again.
   */
  async createOrder(input: CreateOrderInput): Promise<Order> {
    const cfg = readSheetsConfig();
    let r: ScriptResponse;
    try {
      r = await call(
        cfg,
        "create",
        {
          checkoutId: input.checkoutId,
          locale: input.locale,
          fulfillment: input.fulfillment,
          payment: input.payment,
          customer: input.customer,
          address: input.shippingAddress
            ? {
                provinceCode: input.shippingAddress.provinceCode,
                provinceName: provinceName(input.shippingAddress.provinceCode),
                ward: input.shippingAddress.ward,
                street: input.shippingAddress.street,
              }
            : null,
          lines: input.lines,
          couponCode: input.couponCode,
          subtotal: input.subtotal,
          discount: input.discount,
          shippingFee: input.shippingFee,
          total: input.total,
          note: input.note ?? "",
        },
        30_000,
      );
    } catch (e) {
      throw new OrderOutcomeUnknownError(`Google Sheet order outcome unknown: ${e instanceof Error ? e.message : "error"}`);
    }
    // "server-error" is raised by the script after it may already have written the row.
    if (!r.ok && r.error === "server-error") throw new OrderOutcomeUnknownError("Google Sheet script error during create");
    if (!r.ok) throw new CommerceUnavailableError("Google Sheet rejected the order", r.error);
    if (!r.order) throw new OrderOutcomeUnknownError("Google Sheet returned no order");
    return toOrder(r.order);
  },
  async findOrderByCheckoutId(checkoutId: string): Promise<Order | null> {
    const o = await read("find", { checkoutId });
    return o ? toOrder(o) : null;
  },
  async getOrder(ref: string): Promise<Order | null> {
    const o = await read("get", { ref: ref.trim().toUpperCase() });
    return o ? toOrder(o) : null;
  },
};
