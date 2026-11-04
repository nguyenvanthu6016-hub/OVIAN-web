import type { Category, Facet, Product, ProductPage, ProductQuery } from "./types";
import { facetLabels, facetValueLabel } from "./facets";

export const DEFAULT_PAGE_SIZE = 12;

export function minPrice(p: Product): number {
  const prices = p.variants.map((v) => v.price);
  return prices.length ? Math.min(...prices) : 0;
}

export function isAvailable(p: Product): boolean {
  return p.variants.some((v) => v.available);
}

export function isOnSale(p: Product): boolean {
  return p.variants.some((v) => v.compareAtPrice !== null && v.compareAtPrice > v.price);
}

function normalize(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .trim();
}

export function matchesSearch(p: Product, q: string): boolean {
  const terms = normalize(q).split(/\s+/).filter(Boolean);
  if (!terms.length) return true;
  const hay = normalize([p.name.value, p.summary?.value ?? "", p.variants.map((v) => v.sku).join(" "), p.tags.join(" ")].join(" "));
  return terms.every((t) => hay.includes(t));
}

/** Score for suggestion ranking: name prefix > name contains > other */
export function searchScore(p: Product, q: string): number {
  const n = normalize(p.name.value);
  const nq = normalize(q);
  if (n.startsWith(nq)) return 3;
  if (n.includes(nq)) return 2;
  return 1;
}

/** In-memory filtering used by mock and by the live adapter over a cached catalogue snapshot. */
export function applyQuery(all: Product[], query: ProductQuery, categories: Category[]): ProductPage {
  const locale = query.locale;
  let scope = all;
  if (query.categoryHandle) {
    const cat = categories.find((c) => c.handle === query.categoryHandle);
    if (!cat) scope = [];
    else {
      const ids = new Set([cat.id, ...categories.filter((c) => c.parentId === cat.id).map((c) => c.id)]);
      scope = scope.filter((p) => p.categoryIds.some((id) => ids.has(id)));
    }
  }
  if (query.search) scope = scope.filter((p) => matchesSearch(p, query.search!));

  // Facets are computed on the scope BEFORE facet filters so counts stay meaningful; each facet
  // excludes its own selection (standard multi-select behaviour).
  const selected = query.facets ?? {};
  const passFacets = (p: Product, except?: string) =>
    Object.entries(selected).every(([key, values]) => {
      if (key === except || !values.length) return true;
      return values.some((v) => p.tags.includes(`${key}:${v}`));
    });
  const passOthers = (p: Product) => {
    const price = minPrice(p);
    if (query.minPrice !== undefined && price < query.minPrice) return false;
    if (query.maxPrice !== undefined && price > query.maxPrice) return false;
    if (query.inStock && !isAvailable(p)) return false;
    if (query.onSale && !isOnSale(p)) return false;
    return true;
  };

  const facetKeys = Object.keys(facetLabels);
  const facets: Facet[] = facetKeys
    .map((key) => {
      const pool = scope.filter((p) => passOthers(p) && passFacets(p, key));
      const counts = new Map<string, number>();
      for (const p of pool) for (const tag of p.tags) if (tag.startsWith(`${key}:`)) counts.set(tag, (counts.get(tag) ?? 0) + 1);
      // keep selected values visible even with zero count
      for (const v of selected[key] ?? []) if (!counts.has(`${key}:${v}`)) counts.set(`${key}:${v}`, 0);
      return {
        key,
        label: facetLabels[key]![locale],
        values: [...counts.entries()]
          .map(([tag, count]) => ({ value: tag.slice(key.length + 1), label: facetValueLabel(tag, locale), count }))
          .sort((a, b) => a.label.localeCompare(b.label, locale)),
      };
    })
    .filter((f) => f.values.length > 0);

  const prices = scope.map(minPrice);
  const priceRange = prices.length ? { min: Math.min(...prices), max: Math.max(...prices) } : null;

  let items = scope.filter((p) => passOthers(p) && passFacets(p));
  const sort = query.sort ?? "featured";
  items = [...items].sort((a, b) => {
    if (sort === "price-asc") return minPrice(a) - minPrice(b);
    if (sort === "price-desc") return minPrice(b) - minPrice(a);
    if (sort === "newest") return b.createdAt.localeCompare(a.createdAt);
    // featured: available first, then original order
    return Number(isAvailable(b)) - Number(isAvailable(a));
  });

  const pageSize = query.pageSize ?? DEFAULT_PAGE_SIZE;
  const total = items.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(Math.max(1, query.page ?? 1), pageCount);
  return {
    items: items.slice((page - 1) * pageSize, page * pageSize),
    total,
    page,
    pageSize,
    pageCount,
    facets,
    priceRange,
  };
}
