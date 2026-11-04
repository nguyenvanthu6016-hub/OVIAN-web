import type { ProductQuery, SortKey } from "@/lib/commerce/types";
import { facetLabels } from "@/lib/commerce/facets";
import type { Locale } from "@/lib/i18n/config";

export type RawSearchParams = Record<string, string | string[] | undefined>;

const sorts: SortKey[] = ["featured", "newest", "price-asc", "price-desc"];
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const intOrUndef = (v: string | undefined) => {
  if (!v) return undefined;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? Math.round(n) : undefined;
};

/** URL is the source of truth for filters: ?material=go,vai&color=xanh&min=100000&max=500000&stock=1&sale=1&sort=newest&page=2 */
export function parseCatalogParams(sp: RawSearchParams, locale: Locale, extra: Partial<ProductQuery> = {}): ProductQuery {
  const facets: Record<string, string[]> = {};
  for (const key of Object.keys(facetLabels)) {
    const v = one(sp[key]);
    if (v) facets[key] = v.split(",").map((s) => s.trim()).filter((s) => /^[a-z0-9-]{1,40}$/.test(s)).slice(0, 20);
  }
  const sort = one(sp.sort) as SortKey | undefined;
  return {
    locale,
    facets,
    minPrice: intOrUndef(one(sp.min)),
    maxPrice: intOrUndef(one(sp.max)),
    inStock: one(sp.stock) === "1",
    onSale: one(sp.sale) === "1",
    sort: sort && sorts.includes(sort) ? sort : "featured",
    page: Math.max(1, intOrUndef(one(sp.page)) ?? 1),
    search: one(sp.q)?.slice(0, 80) || undefined,
    ...extra,
  };
}

export function hasActiveFilters(q: ProductQuery) {
  return Object.values(q.facets ?? {}).some((v) => v.length) || q.minPrice !== undefined || q.maxPrice !== undefined || !!q.inStock || !!q.onSale;
}

/** Serialise back to a query string (used for pagination links). */
export function toSearch(sp: RawSearchParams, patch: Record<string, string | null>): string {
  const u = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    const s = one(v);
    if (s) u.set(k, s);
  }
  for (const [k, v] of Object.entries(patch)) {
    if (v === null || v === "") u.delete(k);
    else u.set(k, v);
  }
  const s = u.toString();
  return s ? `?${s}` : "";
}
