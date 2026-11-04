export interface ShippingRule {
  id: string;
  label: string;
  provinceCodes: string[];
  fee: number;
  /** Subtotal (after discount) at/above which delivery is free; null = never free */
  freeOver: number | null;
}

export interface ShippingRuleSet {
  rules: ShippingRule[];
  /** Applies when no rule matches; null = delivery unavailable for unmatched provinces */
  fallback: { fee: number; freeOver: number | null } | null;
  /** true when these are sample values (mock mode) */
  sample: boolean;
}

export type ShippingQuote =
  | { status: "ok"; fee: number; ruleId: string; freeApplied: boolean }
  | { status: "unavailable" }
  | { status: "needs-province" };

export function quoteShipping(rules: ShippingRuleSet, provinceCode: string | undefined, discountedSubtotal: number): ShippingQuote {
  if (!provinceCode) return { status: "needs-province" };
  const rule = rules.rules.find((r) => r.provinceCodes.includes(provinceCode));
  const base = rule ?? (rules.fallback ? { id: "fallback", ...rules.fallback } : null);
  if (!base) return { status: "unavailable" };
  const free = base.freeOver !== null && discountedSubtotal >= base.freeOver;
  return { status: "ok", fee: free ? 0 : base.fee, ruleId: base.id, freeApplied: free };
}
