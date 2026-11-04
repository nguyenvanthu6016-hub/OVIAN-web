import "server-only";
import { getCommerce } from "@/lib/commerce";
import { getContent } from "@/lib/cms";
import { priceCart, type Quote } from "./pricing";

export interface QuoteInput {
  lines: { variantId: string; quantity: number; seenPrice?: number }[];
  couponCode?: string | null;
  fulfillment: "delivery" | "pickup";
  provinceCode?: string | null;
}

/** Authoritative server-side quote: fresh stock & prices, verified coupon, configured shipping. */
export async function buildQuote(req: QuoteInput): Promise<Quote> {
  const commerce = getCommerce();
  const [variants, coupon, shippingRules] = await Promise.all([
    commerce.getVariantsFresh(req.lines.map((l) => l.variantId)),
    req.couponCode ? commerce.findCoupon(req.couponCode) : Promise.resolve(null),
    getContent().shippingRules(),
  ]);
  return priceCart({
    lines: req.lines,
    variants,
    coupon,
    couponCode: req.couponCode,
    fulfillment: req.fulfillment,
    provinceCode: req.provinceCode,
    shippingRules,
  });
}
