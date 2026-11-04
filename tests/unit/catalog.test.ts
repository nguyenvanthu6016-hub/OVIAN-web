import { describe, expect, it } from "vitest";
import { parseCatalogParams, toSearch } from "@/lib/catalog-params";
import { orderRequestSchema, phoneSchema, trackRequestSchema } from "@/lib/checkout/schema";
import { mockProvider } from "@/lib/commerce/mock/provider";
import { localizedAlternates } from "@/lib/seo";
import { switchLocalePath } from "@/lib/routes";

describe("catalog params", () => {
  it("parses facets, prices and sort, rejecting junk", () => {
    const q = parseCatalogParams({ material: "go,vai,<script>", min: "100000", max: "abc", sort: "price-asc", page: "2", sale: "1" }, "vi");
    expect(q.facets).toEqual({ material: ["go", "vai"] });
    expect(q.minPrice).toBe(100000);
    expect(q.maxPrice).toBeUndefined();
    expect(q.sort).toBe("price-asc");
    expect(q.page).toBe(2);
    expect(q.onSale).toBe(true);
  });
  it("defaults unknown sort", () => expect(parseCatalogParams({ sort: "evil" }, "vi").sort).toBe("featured"));
  it("serialises with patches", () => expect(toSearch({ a: "1", page: "3" }, { page: null, b: "2" })).toBe("?a=1&b=2"));
});

describe("mock catalogue query", () => {
  it("filters by category including children", async () => {
    const r = await mockProvider.queryProducts({ locale: "vi", categoryHandle: "bep", pageSize: 50 });
    expect(r.total).toBeGreaterThan(0);
    expect(r.items.every((p) => p.categoryIds.some((c) => c.startsWith("c-kitchen")))).toBe(true);
  });
  it("multi-facet filtering and diacritic-insensitive search", async () => {
    const wood = await mockProvider.queryProducts({ locale: "vi", facets: { material: ["go"] }, pageSize: 50 });
    expect(wood.items.every((p) => p.tags.includes("material:go"))).toBe(true);
    const s = await mockProvider.queryProducts({ locale: "vi", search: "coc su", pageSize: 50 });
    expect(s.items.map((p) => p.handle)).toContain("coc-su-trang-350ml");
  });
  it("sorts by price ascending and paginates", async () => {
    const r = await mockProvider.queryProducts({ locale: "vi", sort: "price-asc", pageSize: 5, page: 2 });
    expect(r.page).toBe(2);
    expect(r.items).toHaveLength(5);
    const prices = r.items.map((p) => Math.min(...p.variants.map((v) => v.price)));
    expect([...prices].sort((a, b) => a - b)).toEqual(prices);
  });
  it("falls back to Vietnamese and marks missing English", async () => {
    const p = await mockProvider.getProduct("chai-chiet-pet-300ml", "en");
    expect(p?.name.lang).toBe("vi");
    expect(p?.translationMissing).toBe(true);
    const ok = await mockProvider.getProduct("ke-go-soi-3-tang", "en");
    expect(ok?.name).toEqual({ value: "Three-tier oak shelf", lang: "en" });
  });
});

describe("validation", () => {
  it("normalises Vietnamese phones", () => {
    expect(phoneSchema.parse("+84 912 345 678")).toBe("0912345678");
    expect(phoneSchema.safeParse("12345").success).toBe(false);
  });
  const base = { checkoutId: "3b241101-e2bb-4255-8caf-4136c566a962", locale: "vi", lines: [{ variantId: "v", quantity: 1 }], fulfillment: "delivery", customer: { fullName: "Nguyễn An", phone: "0912345678" }, confirmedTotal: 1 };
  it("requires an address for delivery only", () => {
    expect(orderRequestSchema.safeParse(base).success).toBe(false);
    expect(orderRequestSchema.safeParse({ ...base, fulfillment: "pickup" }).success).toBe(true);
    expect(orderRequestSchema.safeParse({ ...base, address: { provinceCode: "ha-noi", ward: "Phường A", street: "12 Đường B" } }).success).toBe(true);
  });
  it("rejects non-UUID checkout ids and oversized quantities", () => {
    expect(orderRequestSchema.safeParse({ ...base, fulfillment: "pickup", checkoutId: "1" }).success).toBe(false);
    expect(orderRequestSchema.safeParse({ ...base, fulfillment: "pickup", lines: [{ variantId: "v", quantity: 500 }] }).success).toBe(false);
  });
  it("track requires phone", () => expect(trackRequestSchema.safeParse({ orderRef: "OV123456" }).success).toBe(false));
});

describe("i18n SEO helpers", () => {
  it("drops en hreflang and noindexes en when English is a fallback", () => {
    const m = localizedAlternates("en", "/products/x", { enAvailable: false });
    expect(m.alternates?.languages).not.toHaveProperty("en");
    expect(m.robots).toEqual({ index: false, follow: true });
  });
  it("switches locale segment", () => {
    expect(switchLocalePath("/vi/products/a", "en")).toBe("/en/products/a");
    expect(switchLocalePath("/", "en")).toBe("/en/");
  });
});
