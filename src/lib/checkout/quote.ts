import "server-only";
import { getCommerce } from "@/lib/commerce";
import { getContent } from "@/lib/cms";
import { priceCart, type Quote } from "./pricing";
import { verifyUpsell, type AcceptedUpsell } from "./upsell-offer";

export interface QuoteInput {
  lines: { variantId: string; quantity: number; seenPrice?: number }[];
  couponCode?: string | null;
  fulfillment: "delivery" | "pickup";
  provinceCode?: string | null;
  /** Straight from the browser — the signature is checked here, never trusted. */
  upsell?: AcceptedUpsell | null;
}

/** Authoritative server-side quote: fresh stock & prices, verified coupon, configured shipping. */
export async function buildQuote(req: QuoteInput): Promise<Quote> {
  const commerce = getCommerce();
  const upsell = verifyUpsell(req.upsell);
  // One lookup covers the cart and the upsell, so the offer is priced from live data like any line.
  const variantIds = [...new Set([...req.lines.map((l) => l.variantId), ...(upsell ? [upsell.variantId] : [])])];
  const [variants, coupon, shippingRules] = await Promise.all([
    commerce.getVariantsFresh(variantIds),
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
    upsell,
  });
}
