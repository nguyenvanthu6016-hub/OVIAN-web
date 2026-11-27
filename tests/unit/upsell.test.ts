import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { priceCart } from "@/lib/checkout/pricing";
import type { ShippingRuleSet } from "@/lib/checkout/shipping";
import {
  eligibleVariant,
  isUpsellEligible,
  pickBySeed,
  quantityForSeed,
  seedFrom,
  UPSELL_MIN_COMPARE_AT,
  upsellUnitPrice,
} from "@/lib/checkout/upsell";
import type { Product, Variant } from "@/lib/commerce/types";
import { verifyUpsell } from "@/lib/checkout/upsell-offer";
import { signPayload } from "@/lib/security/signing";

const rules: ShippingRuleSet = {
  sample: true,
  promoFee: 5000,
  rules: [{ id: "hn", label: "HN", provinceCodes: ["ha-noi"], fee: 15000, freeOver: 300000 }],
  fallback: null,
};

function item(
  id: string,
  price: number,
  compareAtPrice: number | null,
  stock: number | null = 10,
  available = true,
): { product: Product; variant: Variant } {
  const variant: Variant = { id, sku: id, title: id, options: {}, price, compareAtPrice, available, inventoryQuantity: stock };
  const product = {
    id: `p-${id}`, handle: id, name: { value: `Name ${id}`, lang: "vi" }, summary: null, description: null, categoryIds: [], images: [],
    options: [], variants: [variant], attributes: [], tags: [], createdAt: "2026-01-01", updatedAt: null, relatedIds: [], isNew: false, translationMissing: false,
  } as Product;
  return { product, variant };
}

// "a" is the cart item; "u" is the product offered at the deeper discount.
const variants = new Map([
  ["a", item("a", 140_000, 200_000)],
  ["u", item("u", 210_000, 300_000)],
  ["cheap", item("cheap", 49_000, 70_000)],
  ["gone", item("gone", 210_000, 300_000, 0, false)],
  ["one-left", item("one-left", 210_000, 300_000, 1)],
  ["not-on-sale", item("not-on-sale", 300_000, null)],
]);

const v = (id: string) => variants.get(id)!.variant;

describe("upsell price", () => {
  it("takes 40% off the original price, not off the sale price", () => {
    // 300.000 original, normally sold at 210.000 (-30%). The offer is 180.000 (-40%).
    expect(upsellUnitPrice(v("u"))).toBe(180_000);
  });

  it("rounds down to a whole thousand đồng", () => {
    expect(upsellUnitPrice({ price: 90_000, compareAtPrice: 129_000 })).toBe(77_000);
  });

  it("never asks more than the price the product already sells at", () => {
    // A product whose "original" is barely above the selling price must not be made dearer.
    expect(upsellUnitPrice({ price: 100_000, compareAtPrice: 101_000 })).toBe(60_000);
    expect(upsellUnitPrice({ price: 50_000, compareAtPrice: 1_000_000 })).toBe(50_000);
  });

  it("has no offer price for a product that is not on sale", () => {
    expect(upsellUnitPrice(v("not-on-sale"))).toBeNull();
  });
});

describe("upsell eligibility", () => {
  it("excludes products below the floor the owner set", () => {
    expect(UPSELL_MIN_COMPARE_AT).toBe(100_000);
    expect(isUpsellEligible(v("cheap"), 1)).toBe(false);
    expect(isUpsellEligible(v("u"), 1)).toBe(true);
  });

  it("excludes sold-out products", () => {
    expect(isUpsellEligible(v("gone"), 1)).toBe(false);
  });

  it("will not offer two when only one is in stock", () => {
    expect(isUpsellEligible(v("one-left"), 1)).toBe(true);
    expect(isUpsellEligible(v("one-left"), 2)).toBe(false);
  });

  it("excludes products with no original price to discount from", () => {
    expect(isUpsellEligible(v("not-on-sale"), 1)).toBe(false);
  });

  it("finds the first usable variant of a product", () => {
    expect(eligibleVariant(variants.get("u")!.product, 1)?.id).toBe("u");
    expect(eligibleVariant(variants.get("cheap")!.product, 1)).toBeNull();
  });
});

describe("offer choice", () => {
  it("is stable for the same checkout and spread across different ones", () => {
    const pool = ["a", "b", "c", "d"];
    const once = pickBySeed(pool, seedFrom("checkout-1"));
    expect(pickBySeed(pool, seedFrom("checkout-1"))).toBe(once);
    const picks = new Set(Array.from({ length: 40 }, (_, i) => pickBySeed(pool, seedFrom(`id-${i}`))));
    expect(picks.size).toBeGreaterThan(1);
  });

  it("offers one unit roughly as often as two", () => {
    const two = Array.from({ length: 200 }, (_, i) => quantityForSeed(seedFrom(`id-${i}`))).filter((q) => q === 2).length;
    expect(two).toBeGreaterThan(50);
    expect(two).toBeLessThan(150);
  });

  it("returns nothing when there is nothing to offer", () => {
    expect(pickBySeed([], 7)).toBeNull();
  });
});

describe("priceCart with an upsell", () => {
  const cart = [{ variantId: "a", quantity: 1 }];
  const base = { variants, coupon: null, fulfillment: "delivery" as const, provinceCode: "ha-noi", shippingRules: rules };

  it("adds the offer as its own line and makes delivery free", () => {
    const q = priceCart({ ...base, lines: cart, upsell: { variantId: "u", quantity: 1 } });
    expect(q.lines).toHaveLength(2);
    const line = q.lines.find((l) => l.upsell)!;
    expect(line.unitPrice).toBe(180_000);
    expect(line.compareAtPrice).toBe(300_000);
    expect(q.subtotal).toBe(320_000);
    expect(q.shippingFee).toBe(0);
    expect(q.total).toBe(320_000);
    expect(q.upsell).toEqual({ variantId: "u", quantity: 1 });
  });

  it("keeps the standard fee visible so the saving can be shown", () => {
    const q = priceCart({ ...base, lines: cart, upsell: { variantId: "u", quantity: 1 } });
    expect(q.shipping.status === "ok" && q.shipping.listFee).toBe(15_000);
  });

  it("prices two units at the offer price", () => {
    const q = priceCart({ ...base, lines: cart, upsell: { variantId: "u", quantity: 2 } });
    expect(q.lines.find((l) => l.upsell)!.lineTotal).toBe(360_000);
  });

  it("refuses an offer for something already in the cart at the normal price", () => {
    const q = priceCart({ ...base, lines: [{ variantId: "u", quantity: 1 }], upsell: { variantId: "u", quantity: 1 } });
    expect(q.lines).toHaveLength(1);
    expect(q.lines[0]!.unitPrice).toBe(210_000);
    expect(q.upsell).toBeNull();
  });

  it("refuses an offer on its own, with nothing else bought", () => {
    const q = priceCart({ ...base, lines: [{ variantId: "zzz", quantity: 1 }], upsell: { variantId: "u", quantity: 1 } });
    expect(q.upsell).toBeNull();
    expect(q.orderable).toBe(false);
  });

  it("drops an offer whose product sold out, leaving the rest of the order intact", () => {
    const q = priceCart({ ...base, lines: cart, upsell: { variantId: "gone", quantity: 1 } });
    expect(q.upsell).toBeNull();
    expect(q.lines).toHaveLength(1);
    expect(q.shippingFee).toBe(5_000);
    expect(q.orderable).toBe(true);
  });

  it("charges the normal promotional fee when no offer was taken", () => {
    const q = priceCart({ ...base, lines: cart });
    expect(q.upsell).toBeNull();
    expect(q.shippingFee).toBe(5_000);
  });
});

describe("accepting an offer", () => {
  beforeEach(() => { process.env.ORDER_TOKEN_SECRET = "upsell-test-secret-0123456789abc"; });
  afterEach(() => { delete process.env.ORDER_TOKEN_SECRET; });

  const sign = (variantId: string, quantity: number, issuedAt: number) => signPayload(`${variantId}|${quantity}|${issuedAt}`);
  const accepted = (over: Partial<{ variantId: string; quantity: number; issuedAt: number; signature: string }> = {}) => {
    const issuedAt = over.issuedAt ?? Date.now();
    const variantId = over.variantId ?? "u";
    const quantity = over.quantity ?? 1;
    return { variantId, quantity, issuedAt, signature: over.signature ?? sign(variantId, quantity, issuedAt) };
  };

  it("accepts an offer the server itself signed", () => {
    expect(verifyUpsell(accepted())).toEqual({ variantId: "u", quantity: 1 });
  });

  it("rejects a different product under a valid signature", () => {
    const real = accepted({ variantId: "u" });
    expect(verifyUpsell({ ...real, variantId: "something-dearer" })).toBeNull();
  });

  it("rejects two units when only one was offered", () => {
    const real = accepted({ quantity: 1 });
    expect(verifyUpsell({ ...real, quantity: 2 })).toBeNull();
  });

  it("rejects a made-up signature", () => {
    expect(verifyUpsell(accepted({ signature: "not-a-real-signature-at-all" }))).toBeNull();
  });

  it("rejects an offer left open for longer than six hours", () => {
    expect(verifyUpsell(accepted({ issuedAt: Date.now() - 7 * 3600_000 }))).toBeNull();
  });

  it("rejects an offer dated in the future", () => {
    expect(verifyUpsell(accepted({ issuedAt: Date.now() + 60_000 }))).toBeNull();
  });

  it("treats no offer as no offer", () => {
    expect(verifyUpsell(null)).toBeNull();
    expect(verifyUpsell(undefined)).toBeNull();
  });
});
