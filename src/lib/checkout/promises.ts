import type { ShippingRuleSet } from "@/lib/checkout/shipping";
import { HOUSE_VOUCHER, voucherEnabled } from "@/lib/checkout/voucher";

/**
 * The four things OVIAN promises a shopper, read from the same configuration that charges them.
 *
 * Every surface that states a promise — the bar at the top of the page, the line under a price,
 * the checkout — asks this. The point is that nothing can advertise a deal the checkout will not
 * honour: turn the voucher off and the bar stops mentioning it, change the delivery fee and the
 * product page changes with it.
 */
export interface ShopPromises {
  /** Flat delivery fee charged everywhere, or null when customers pay the zone fee. */
  shipFee: number | null;
  /** Items in the basket that earn free delivery, or null when that offer is off. */
  freeFromItems: number | null;
  /** Percentage off at checkout, or null when the voucher is withdrawn. */
  voucherPercent: number | null;
  voucherMax: number | null;
  voucherMinSubtotal: number | null;
}

export function shopPromises(rules: ShippingRuleSet | null): ShopPromises {
  const voucher = voucherEnabled() ? HOUSE_VOUCHER : null;
  return {
    shipFee: rules?.promoFee ?? null,
    freeFromItems: rules?.freeFromItems ?? null,
    voucherPercent: voucher ? voucher.value : null,
    voucherMax: voucher?.maxDiscount ?? null,
    voucherMinSubtotal: voucher ? voucher.minSubtotal : null,
  };
}

/** True when there is at least one promise worth taking up a line of the page for. */
export const hasPromises = (p: ShopPromises): boolean =>
  p.shipFee !== null || p.freeFromItems !== null || p.voucherPercent !== null;
