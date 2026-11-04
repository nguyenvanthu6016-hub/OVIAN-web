import "server-only";
import { randomInt } from "node:crypto";
import type { Locale } from "@/lib/i18n/config";
import { applyQuery } from "../query";
import {
  CommerceUnavailableError,
  OrderOutcomeUnknownError,
  type Category,
  type CommerceProvider,
  type Coupon,
  type CreateOrderInput,
  type LocalizedText,
  type Order,
  type Product,
  type Review,
  type Variant,
} from "../types";
import { mockCategories, mockCoupons, mockProducts, mockReviewSeeds, type MockProduct } from "./catalog";

/**
 * Mutable mock state. Lives on globalThis so dev-server HMR and route handlers share it.
 * Fault controls exist so E2E tests can simulate stock/price changes, outages and timeouts.
 */
export interface MockFaults {
  /** "unavailable": every call throws CommerceUnavailableError; "order-timeout": order is created but the call reports unknown outcome */
  mode: "none" | "unavailable" | "order-timeout";
  delayMs: number;
}

interface MockState {
  stock: Map<string, number | null>;
  price: Map<string, number>;
  orders: Map<string, Order & { checkoutId: string }>;
  faults: MockFaults;
}

const g = globalThis as unknown as { __ovianMock?: MockState };

function freshState(): MockState {
  const stock = new Map<string, number | null>();
  const price = new Map<string, number>();
  for (const p of mockProducts) for (const v of p.variants) {
    stock.set(v.id, v.stock);
    price.set(v.id, v.price);
  }
  return { stock, price, orders: new Map(), faults: { mode: "none", delayMs: 0 } };
}

export function mockState(): MockState {
  g.__ovianMock ??= freshState();
  return g.__ovianMock;
}

export function resetMockState() {
  g.__ovianMock = freshState();
}

const txt = (vi: string, en: string | undefined, locale: Locale): LocalizedText =>
  locale === "en" && en ? { value: en, lang: "en" } : { value: vi, lang: "vi" };

function toProduct(m: MockProduct, locale: Locale): Product {
  const st = mockState();
  const variants: Variant[] = m.variants.map((v) => {
    const stock = st.stock.get(v.id) ?? null;
    const optionTitle = Object.values(v.options).join(" / ");
    return {
      id: v.id,
      sku: v.sku,
      title: optionTitle || txt("Mặc định", "Default", locale).value,
      options: v.options,
      price: st.price.get(v.id) ?? v.price,
      compareAtPrice: v.compareAt ?? null,
      available: stock === null || stock > 0,
      inventoryQuantity: stock,
      imageIndex: v.tone ? Math.max(0, m.tones.indexOf(v.tone)) : 0,
    };
  });
  const name = txt(m.vi, m.en, locale);
  const description = txt(m.descVi, m.descEn, locale);
  const altBase = name.value;
  return {
    id: m.id,
    handle: m.handle,
    name,
    summary: txt(m.summaryVi, m.summaryEn, locale),
    description,
    categoryIds: m.categories,
    images: m.tones.map((tone, i) => ({
      url: `/mock/${m.shape}-${tone}.svg`,
      alt: `${altBase} — ${locale === "vi" ? "ảnh mẫu" : "sample image"} ${i + 1}`,
      width: 800,
      height: 800,
    })),
    options: m.options.map((o) => ({
      key: o.key,
      name: locale === "en" ? o.en : o.vi,
      values: [...new Set(m.variants.map((v) => v.options[o.key]).filter((x): x is string => !!x))],
    })),
    variants,
    attributes: [
      { key: "material", label: txt("Chất liệu", "Material", locale), value: txt(m.material[0], m.material[1], locale) },
      { key: "dimensions", label: txt("Kích thước", "Dimensions", locale), value: { value: m.dimensions, lang: locale } },
      ...(m.weight ? [{ key: "weight", label: txt("Khối lượng", "Weight", locale), value: { value: m.weight, lang: locale } }] : []),
      ...(m.care ? [{ key: "care", label: txt("Bảo quản", "Care", locale), value: txt(m.care[0], m.care[1], locale) }] : []),
    ],
    tags: m.tags,
    createdAt: m.createdAt,
    relatedIds: m.related ?? [],
    isNew: Date.now() - Date.parse(m.createdAt) < 45 * 864e5,
    translationMissing: locale === "en" && (!m.en || !m.descEn),
  };
}

function toCategory(c: (typeof mockCategories)[number], locale: Locale): Category {
  const ids = new Set([c.id, ...mockCategories.filter((x) => x.parent === c.id).map((x) => x.id)]);
  return {
    id: c.id,
    handle: c.handle,
    name: txt(c.vi, c.en, locale),
    description: c.descVi ? txt(c.descVi, c.descEn, locale) : null,
    parentId: c.parent ?? null,
    areaM2: c.areaM2,
    productCount: mockProducts.filter((p) => p.categories.some((id) => ids.has(id))).length,
  };
}

async function gate() {
  const { faults } = mockState();
  if (faults.delayMs) await new Promise((r) => setTimeout(r, faults.delayMs));
  if (faults.mode === "unavailable") throw new CommerceUnavailableError("Mock outage (simulated)");
}

function newRef(): string {
  // Non-sequential, not guessable on its own; tracking still requires the phone number.
  return `OV${randomInt(100000, 999999)}`;
}

export const mockProvider: CommerceProvider = {
  mode: "mock",
  async listCategories(locale) {
    await gate();
    return mockCategories.map((c) => toCategory(c, locale));
  },
  async getCategory(handle, locale) {
    await gate();
    const c = mockCategories.find((x) => x.handle === handle);
    return c ? toCategory(c, locale) : null;
  },
  async queryProducts(query) {
    await gate();
    const all = mockProducts.map((p) => toProduct(p, query.locale));
    return applyQuery(all, query, mockCategories.map((c) => toCategory(c, query.locale)));
  },
  async getProduct(handle, locale) {
    await gate();
    const m = mockProducts.find((p) => p.handle === handle);
    return m ? toProduct(m, locale) : null;
  },
  async getProductsByIds(ids, locale) {
    await gate();
    return ids.map((id) => mockProducts.find((p) => p.id === id)).filter((p): p is MockProduct => !!p).map((p) => toProduct(p, locale));
  },
  async getVariantsFresh(variantIds) {
    await gate();
    const out = new Map<string, { product: Product; variant: Variant }>();
    for (const m of mockProducts) {
      const product = toProduct(m, "vi");
      for (const v of product.variants) if (variantIds.includes(v.id)) out.set(v.id, { product, variant: v });
    }
    return out;
  },
  async findCoupon(code): Promise<Coupon | null> {
    await gate();
    return mockCoupons.find((c) => c.code === code.trim().toUpperCase()) ?? null;
  },
  async listReviews(productId): Promise<Review[]> {
    await gate();
    return (mockReviewSeeds[productId] ?? []).map((r, i) => ({
      id: `${productId}-r${i}`,
      productId,
      author: r.author,
      rating: r.rating,
      title: r.title,
      body: r.body,
      createdAt: r.date,
      source: "mock",
    }));
  },
  async createOrder(input: CreateOrderInput) {
    await gate();
    const st = mockState();
    // Stock decrement mirrors Sapo inventory behaviour.
    for (const l of input.lines) {
      const s = st.stock.get(l.variantId);
      if (s !== null && s !== undefined) st.stock.set(l.variantId, Math.max(0, s - l.quantity));
    }
    const order: Order & { checkoutId: string } = {
      ref: newRef(),
      externalId: `mock-${Date.now()}`,
      checkoutId: input.checkoutId,
      createdAt: new Date().toISOString(),
      status: "pending",
      financialStatus: "pending",
      fulfillment: input.fulfillment,
      payment: input.payment,
      lines: input.lines,
      subtotal: input.subtotal,
      discount: input.discount,
      shippingFee: input.shippingFee,
      total: input.total,
      customerName: input.customer.fullName,
      customerPhone: input.customer.phone,
      shippingAddress: input.shippingAddress,
      simulated: true,
    };
    st.orders.set(order.ref, order);
    if (st.faults.mode === "order-timeout") {
      // Simulates: Sapo created the order but our request timed out.
      throw new OrderOutcomeUnknownError("Simulated timeout after order creation");
    }
    return order;
  },
  async findOrderByCheckoutId(checkoutId) {
    await gate();
    for (const o of mockState().orders.values()) if (o.checkoutId === checkoutId) return o;
    return null;
  },
  async getOrder(ref) {
    await gate();
    return mockState().orders.get(ref.trim().toUpperCase()) ?? null;
  },
};
