import type { Product, Variant } from "@/lib/commerce/types";

/**
 * Checkout upsell: one extra product offered while the customer is confirming an order.
 *
 * The deal, agreed with the owner on 2026-11-25: the suggested product is sold at 40% off its
 * original price (instead of the usual 30%) and the whole order ships free. Half the time the
 * offer is for a single unit, half the time for two of the same product.
 *
 * Every number here is recomputed on the server at quote and at order time. The browser only ever
 * says *which* offer it accepted; it never says what the offer costs.
 */

/** Total discount off the original price for an upsell line (the shop's usual sale is 30%). */
export const UPSELL_DISCOUNT = 0.4;

/** Cheap products are excluded: 40% off plus free delivery does not pay for itself. */
export const UPSELL_MIN_COMPARE_AT = 100_000;

/** An offer the customer did not act on quickly is not honoured — prices move. */
export const UPSELL_TTL_MS = 6 * 3600_000;

export type UpsellQuantity = 1 | 2;

/**
 * What the customer pays per unit: 40% off the original price, rounded down to a whole thousand
 * đồng so the figure reads like a price rather than an arithmetic result. Never above the price
 * the product already sells at, so an upsell can only ever be a better deal.
 */
export function upsellUnitPrice(variant: Pick<Variant, "price" | "compareAtPrice">): number | null {
  const original = variant.compareAtPrice;
  if (!original || original <= variant.price) return null;
  const discounted = Math.floor((original * (1 - UPSELL_DISCOUNT)) / 1000) * 1000;
  return Math.max(0, Math.min(discounted, variant.price));
}

/** Can this variant be offered, for this many units? */
export function isUpsellEligible(variant: Variant, quantity: UpsellQuantity): boolean {
  if (!variant.available) return false;
  if (variant.inventoryQuantity !== null && variant.inventoryQuantity < quantity) return false;
  if (!variant.compareAtPrice || variant.compareAtPrice < UPSELL_MIN_COMPARE_AT) return false;
  return upsellUnitPrice(variant) !== null;
}

/** The first variant of a product that could carry the offer, or null. */
export function eligibleVariant(product: Product, quantity: UpsellQuantity): Variant | null {
  return product.variants.find((v) => isUpsellEligible(v, quantity)) ?? null;
}

/**
 * A stable number from the checkout id, so the same checkout keeps seeing the same offer across
 * re-renders and reloads instead of a new product every second. FNV-1a: small and good enough for
 * choosing an item from a list.
 */
export function seedFrom(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export const pickBySeed = <T,>(items: T[], seed: number): T | null => (items.length ? (items[seed % items.length] ?? null) : null);

/** Half the checkouts are offered two units instead of one. */
export const quantityForSeed = (seed: number): UpsellQuantity => ((seed >>> 8) % 2 === 0 ? 1 : 2);
