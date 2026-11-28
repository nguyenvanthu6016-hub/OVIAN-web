export interface ShippingRule {
  id: string;
  label: string;
  provinceCodes: string[];
  fee: number;
  /** Subtotal (after discount) at/above which delivery is free; null = never free */
  freeOver: number | null;
  /**
   * How long delivery takes in this zone, [min, max] days. Stated by the zone that charges for
   * it rather than by a second list keyed on zone ids, which drifts the moment a zone is renamed.
   */
  deliveryDays?: [number, number] | null;
}

export interface ShippingRuleSet {
  rules: ShippingRule[];
  /** Applies when no rule matches; null = delivery unavailable for unmatched provinces */
  fallback: { fee: number; freeOver: number | null } | null;
  /**
   * Flat fee actually charged instead of the zone fee, while the zone fee is shown struck
   * through. null = no promotion, customers pay the zone fee.
   */
  promoFee?: number | null;
  /**
   * Delivery is free from this many items in the basket, whatever they cost. null = never.
   * Counted on quantity, not on distinct products: two of the same thing is two items, which
   * is what the shop tells customers and the only reading they will check it against.
   */
  freeFromItems?: number | null;
  /** true when these are sample values (mock mode) */
  sample: boolean;
}

export type ShippingQuote =
  | {
      status: "ok";
      fee: number;
      /** Zone fee before the promotion; equals `fee` when none applies. */
      listFee: number;
      ruleId: string;
      freeApplied: boolean;
      /** [min, max] days for this zone, or null when the zone does not state one. */
      deliveryDays: [number, number] | null;
    }
  | { status: "unavailable" }
  | { status: "needs-province" };

export function quoteShipping(
  rules: ShippingRuleSet,
  provinceCode: string | undefined,
  discountedSubtotal: number,
  itemCount = 0,
): ShippingQuote {
  if (!provinceCode) return { status: "needs-province" };
  const rule = rules.rules.find((r) => r.provinceCodes.includes(provinceCode));
  const base = rule ?? (rules.fallback ? { id: "fallback", ...rules.fallback } : null);
  if (!base) return { status: "unavailable" };
  const listFee = base.fee;
  const freeByBasket = rules.freeFromItems != null && itemCount >= rules.freeFromItems;
  const free = freeByBasket || (base.freeOver !== null && discountedSubtotal >= base.freeOver);
  // A promotion only ever lowers the fee; free shipping still wins over it.
  const promo = rules.promoFee != null && rules.promoFee < listFee ? rules.promoFee : null;
  const deliveryDays = ("deliveryDays" in base ? base.deliveryDays : null) ?? null;
  return { status: "ok", fee: free ? 0 : (promo ?? listFee), listFee, ruleId: base.id, freeApplied: free, deliveryDays };
}
