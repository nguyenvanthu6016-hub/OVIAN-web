import type { Coupon, FulfillmentMethod, OrderLine, Product, Variant } from "@/lib/commerce/types";
import { quoteShipping, type ShippingQuote, type ShippingRuleSet } from "./shipping";

export type QuoteChange =
  | { kind: "price"; variantId: string; name: string; from: number; to: number }
  | { kind: "removed"; variantId: string; name: string }
  | { kind: "quantity"; variantId: string; name: string; from: number; to: number }
  | { kind: "coupon"; code: string; reason: "invalid" | "min-subtotal"; minSubtotal?: number };

export interface Quote {
  lines: OrderLine[];
  subtotal: number;
  coupon: { code: string; discount: number; freeShipping: boolean } | null;
  discount: number;
  shipping: ShippingQuote | { status: "pickup"; fee: 0 };
  shippingFee: number;
  total: number;
  changes: QuoteChange[];
  /** false when the order cannot be placed as-is (empty after changes, or delivery unavailable) */
  orderable: boolean;
}

export interface PricingInput {
  lines: { variantId: string; quantity: number; seenPrice?: number }[];
  variants: Map<string, { product: Product; variant: Variant }>;
  coupon: Coupon | null;
  couponCode?: string | null;
  fulfillment: FulfillmentMethod;
  provinceCode?: string | null;
  shippingRules: ShippingRuleSet;
}

/** Pure, deterministic pricing — the single source of truth for totals (server-side). */
export function priceCart(input: PricingInput): Quote {
  const changes: QuoteChange[] = [];
  const lines: OrderLine[] = [];
  const merged = new Map<string, { quantity: number; seenPrice?: number }>();
  for (const l of input.lines) {
    const prev = merged.get(l.variantId);
    merged.set(l.variantId, { quantity: (prev?.quantity ?? 0) + l.quantity, seenPrice: l.seenPrice ?? prev?.seenPrice });
  }

  for (const [variantId, l] of merged) {
    const hit = input.variants.get(variantId);
    if (!hit || !hit.variant.available) {
      changes.push({ kind: "removed", variantId, name: hit ? hit.product.name.value : variantId });
      continue;
    }
    const { product, variant } = hit;
    let quantity = l.quantity;
    if (variant.inventoryQuantity !== null && quantity > variant.inventoryQuantity) {
      changes.push({ kind: "quantity", variantId, name: product.name.value, from: quantity, to: variant.inventoryQuantity });
      quantity = variant.inventoryQuantity;
    }
    if (l.seenPrice !== undefined && l.seenPrice !== variant.price) {
      changes.push({ kind: "price", variantId, name: product.name.value, from: l.seenPrice, to: variant.price });
    }
    lines.push({
      variantId,
      productId: product.id,
      sku: variant.sku,
      name: product.name.value,
      variantTitle: Object.keys(variant.options).length ? variant.title : "",
      quantity,
      unitPrice: variant.price,
      ...(variant.compareAtPrice && variant.compareAtPrice > variant.price ? { compareAtPrice: variant.compareAtPrice } : {}),
      lineTotal: variant.price * quantity,
    });
  }

  const subtotal = lines.reduce((s, l) => s + l.lineTotal, 0);

  let coupon: Quote["coupon"] = null;
  if (input.couponCode) {
    const c = input.coupon;
    if (!c) changes.push({ kind: "coupon", code: input.couponCode, reason: "invalid" });
    else if (subtotal < c.minSubtotal) changes.push({ kind: "coupon", code: c.code, reason: "min-subtotal", minSubtotal: c.minSubtotal });
    else {
      let discount = 0;
      if (c.kind === "percentage") discount = Math.floor((subtotal * c.value) / 100);
      if (c.kind === "fixed") discount = c.value;
      if (c.maxDiscount !== undefined) discount = Math.min(discount, c.maxDiscount);
      discount = Math.min(discount, subtotal);
      coupon = { code: c.code, discount, freeShipping: c.kind === "free_shipping" };
    }
  }
  const discount = coupon?.discount ?? 0;

  let shipping: Quote["shipping"];
  if (input.fulfillment === "pickup") shipping = { status: "pickup", fee: 0 };
  else {
    shipping = quoteShipping(input.shippingRules, input.provinceCode ?? undefined, subtotal - discount);
    if (shipping.status === "ok" && coupon?.freeShipping) shipping = { ...shipping, fee: 0, freeApplied: true };
  }
  const shippingFee = shipping.status === "ok" ? shipping.fee : 0;
  const total = subtotal - discount + shippingFee;
  const orderable = lines.length > 0 && (shipping.status === "ok" || shipping.status === "pickup");

  return { lines, subtotal, coupon, discount, shipping, shippingFee, total, changes, orderable };
}
