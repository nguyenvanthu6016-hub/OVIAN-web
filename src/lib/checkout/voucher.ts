import type { Coupon } from "@/lib/commerce/types";

/**
 * OVIAN's own checkout voucher, offered to every shopper rather than typed in from an email.
 *
 * It lives here and not in Sapo so the checkout page can show it before the shopper has heard of
 * it. Sapo is still the source of truth for any code a customer types; this one is resolved first
 * because the site, not the backend, is the thing promising it.
 *
 * The amount is never taken from the browser. The checkout sends at most this code, and
 * `priceCart` recomputes the discount from these numbers server-side, so a tampered request buys
 * nothing beyond what the voucher already gives.
 */
export const HOUSE_VOUCHER: Coupon = {
  code: "GIAM10",
  kind: "percentage",
  value: 10,
  minSubtotal: 100_000,
  maxDiscount: 12_000,
};

/** Set HOUSE_VOUCHER_ENABLED=false to withdraw the offer without a deploy. */
export const voucherEnabled = (): boolean => process.env.HOUSE_VOUCHER_ENABLED !== "false";

/** The house voucher when this is its code, otherwise null so the backend lookup takes over. */
export function findHouseVoucher(code: string | null | undefined): Coupon | null {
  if (!code || !voucherEnabled()) return null;
  return code.trim().toUpperCase() === HOUSE_VOUCHER.code ? HOUSE_VOUCHER : null;
}

/**
 * What the checkout should say about the voucher for a cart of this size: offer it, or tell the
 * shopper how much more would earn it. Pure, so the wording is decided in one place and tested.
 */
export type VoucherState =
  | { kind: "applied"; discount: number }
  | { kind: "available"; estimate: number }
  | { kind: "short"; shortfall: number };

/**
 * Takes the voucher rather than reading the module constant, and never looks at the environment:
 * this runs in the browser, where HOUSE_VOUCHER_ENABLED does not exist. Whether to offer the
 * voucher at all is the server's decision, made once when it hands the card its terms.
 */
export function voucherState(voucher: Coupon, subtotal: number, applied: boolean, appliedDiscount = 0): VoucherState {
  if (applied) return { kind: "applied", discount: appliedDiscount };
  if (subtotal < voucher.minSubtotal) return { kind: "short", shortfall: voucher.minSubtotal - subtotal };
  return { kind: "available", estimate: estimateVoucher(voucher, subtotal) };
}

/** The same arithmetic priceCart does, for showing the shopper what they would save. */
export function estimateVoucher(voucher: Coupon, subtotal: number): number {
  if (subtotal < voucher.minSubtotal) return 0;
  const raw = voucher.kind === "percentage" ? Math.floor((subtotal * voucher.value) / 100) : voucher.value;
  return Math.min(raw, voucher.maxDiscount ?? raw, subtotal);
}
