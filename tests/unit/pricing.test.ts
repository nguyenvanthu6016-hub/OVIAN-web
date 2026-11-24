import { describe, expect, it } from "vitest";
import { priceCart } from "@/lib/checkout/pricing";
import { quoteShipping, type ShippingRuleSet } from "@/lib/checkout/shipping";
import type { Product, Variant } from "@/lib/commerce/types";

const rules: ShippingRuleSet = {
  sample: true,
  rules: [{ id: "hn", label: "HN", provinceCodes: ["ha-noi"], fee: 25000, freeOver: 800000 }],
  fallback: null,
};

function item(id: string, price: number, stock: number | null, available = true): { product: Product; variant: Variant } {
  const variant: Variant = { id, sku: id, title: id, options: {}, price, compareAtPrice: null, available, inventoryQuantity: stock };
  const product = {
    id: `p-${id}`, handle: id, name: { value: `Name ${id}`, lang: "vi" }, summary: null, description: null, categoryIds: [], images: [],
    options: [], variants: [variant], attributes: [], tags: [], createdAt: "2026-01-01", relatedIds: [], isNew: false, translationMissing: false,
  } as Product;
  return { product, variant };
}

const variants = new Map([
  ["a", item("a", 100000, 10)],
  ["b", item("b", 250000, 2)],
  ["c", item("c", 50000, 0, false)],
]);

describe("priceCart", () => {
  it("computes subtotal, delivery fee and total from server prices", () => {
    const q = priceCart({ lines: [{ variantId: "a", quantity: 2, seenPrice: 100000 }], variants, coupon: null, fulfillment: "delivery", provinceCode: "ha-noi", shippingRules: rules });
    expect(q.subtotal).toBe(200000);
    expect(q.shippingFee).toBe(25000);
    expect(q.total).toBe(225000);
    expect(q.changes).toEqual([]);
    expect(q.orderable).toBe(true);
  });

  it("ignores client prices and reports a price change", () => {
    const q = priceCart({ lines: [{ variantId: "a", quantity: 1, seenPrice: 90000 }], variants, coupon: null, fulfillment: "pickup", shippingRules: rules });
    expect(q.total).toBe(100000);
    expect(q.changes).toEqual([{ kind: "price", variantId: "a", name: "Name a", from: 90000, to: 100000 }]);
  });

  it("removes sold-out lines and caps quantities to stock", () => {
    const q = priceCart({ lines: [{ variantId: "b", quantity: 5 }, { variantId: "c", quantity: 1 }, { variantId: "zzz", quantity: 1 }], variants, coupon: null, fulfillment: "pickup", shippingRules: rules });
    expect(q.lines).toHaveLength(1);
    expect(q.lines[0]!.quantity).toBe(2);
    expect(q.changes.map((c) => c.kind).sort()).toEqual(["quantity", "removed", "removed"]);
  });

  it("merges duplicate variant lines", () => {
    const q = priceCart({ lines: [{ variantId: "a", quantity: 1 }, { variantId: "a", quantity: 2 }], variants, coupon: null, fulfillment: "pickup", shippingRules: rules });
    expect(q.lines[0]!.quantity).toBe(3);
  });

  it("pickup never charges shipping", () => {
    const q = priceCart({ lines: [{ variantId: "a", quantity: 1 }], variants, coupon: null, fulfillment: "pickup", provinceCode: "ca-mau", shippingRules: rules });
    expect(q.shippingFee).toBe(0);
    expect(q.shipping.status).toBe("pickup");
    expect(q.orderable).toBe(true);
  });

  it("blocks delivery to an unmatched province without fallback", () => {
    const q = priceCart({ lines: [{ variantId: "a", quantity: 1 }], variants, coupon: null, fulfillment: "delivery", provinceCode: "ca-mau", shippingRules: rules });
    expect(q.shipping.status).toBe("unavailable");
    expect(q.orderable).toBe(false);
  });

  it("applies percentage coupons with cap and min subtotal", () => {
    const coupon = { code: "P10", kind: "percentage" as const, value: 10, minSubtotal: 150000, maxDiscount: 15000 };
    const ok = priceCart({ lines: [{ variantId: "a", quantity: 2 }], variants, coupon, couponCode: "P10", fulfillment: "pickup", shippingRules: rules });
    expect(ok.discount).toBe(15000);
    const tooSmall = priceCart({ lines: [{ variantId: "a", quantity: 1 }], variants, coupon, couponCode: "P10", fulfillment: "pickup", shippingRules: rules });
    expect(tooSmall.discount).toBe(0);
    expect(tooSmall.changes[0]).toMatchObject({ kind: "coupon", reason: "min-subtotal" });
  });

  it("rejects unknown coupons", () => {
    const q = priceCart({ lines: [{ variantId: "a", quantity: 1 }], variants, coupon: null, couponCode: "NOPE", fulfillment: "pickup", shippingRules: rules });
    expect(q.changes[0]).toMatchObject({ kind: "coupon", reason: "invalid" });
  });

  it("free-shipping coupon zeroes the delivery fee", () => {
    const coupon = { code: "FS", kind: "free_shipping" as const, value: 0, minSubtotal: 0 };
    const q = priceCart({ lines: [{ variantId: "a", quantity: 1 }], variants, coupon, couponCode: "FS", fulfillment: "delivery", provinceCode: "ha-noi", shippingRules: rules });
    expect(q.shippingFee).toBe(0);
    expect(q.total).toBe(100000);
  });
});

describe("quoteShipping", () => {
  it("requires a province", () => expect(quoteShipping(rules, undefined, 1).status).toBe("needs-province"));
  it("is free over the threshold", () => expect(quoteShipping(rules, "ha-noi", 800000)).toMatchObject({ status: "ok", fee: 0, freeApplied: true }));

  describe("flat promotional fee", () => {
    // Two zones, as OVIAN has, so the struck price is checked per zone.
    const promo: ShippingRuleSet = {
      ...rules,
      promoFee: 5000,
      rules: [...rules.rules, { id: "dn", label: "DN", provinceCodes: ["da-nang"], fee: 45000, freeOver: 800000 }],
    };

    it("charges the flat fee and keeps the zone fee to show struck through", () => {
      expect(quoteShipping(promo, "ha-noi", 100000)).toMatchObject({ status: "ok", fee: 5000, listFee: 25000 });
      // A cheaper zone is struck at its own price, not somebody else's.
      expect(quoteShipping(promo, "da-nang", 100000)).toMatchObject({ fee: 5000, listFee: 45000 });
    });

    it("still gives free delivery over the threshold", () =>
      expect(quoteShipping(promo, "ha-noi", 800000)).toMatchObject({ fee: 0, listFee: 25000, freeApplied: true }));

    it("never raises a fee that is already lower", () =>
      expect(quoteShipping({ ...rules, promoFee: 30000 }, "ha-noi", 100000)).toMatchObject({ fee: 25000, listFee: 25000 }));

    it("charges the zone fee when there is no promotion", () =>
      expect(quoteShipping(rules, "ha-noi", 100000)).toMatchObject({ fee: 25000, listFee: 25000 }));

    it("is what the customer actually pays", () => {
      const q = priceCart({ lines: [{ variantId: "a", quantity: 1 }], variants, coupon: null, fulfillment: "delivery", provinceCode: "ha-noi", shippingRules: promo });
      expect(q.shippingFee).toBe(5000);
      expect(q.total).toBe(q.subtotal + 5000);
    });
  });
  it("uses fallback when configured", () =>
    expect(quoteShipping({ ...rules, fallback: { fee: 60000, freeOver: null } }, "ca-mau", 100)).toMatchObject({ status: "ok", fee: 60000 }));
});
