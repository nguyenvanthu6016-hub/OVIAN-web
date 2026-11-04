import Link from "next/link";
import { getCommerce, CommerceUnavailableError, type ProductPage, type ProductQuery } from "@/lib/commerce";
import { facetValueLabel } from "@/lib/commerce/facets";
import { hasActiveFilters, toSearch, type RawSearchParams } from "@/lib/catalog-params";
import type { Locale } from "@/lib/i18n/config";
import { getDictionary, t } from "@/lib/i18n/dictionaries";
import { formatPrice } from "@/lib/i18n/format";
import { ProductGrid } from "@/components/product/product-card";
import { IconChevronLeft, IconChevronRight } from "@/components/ui/icons";
import { ButtonLink, EmptyState, Notice, cx } from "@/components/ui/primitives";
import { FilterSidebar, FilterToolbar } from "./filters";

export async function CatalogView({
  locale, query, searchParams, basePath, emptyAction,
}: {
  locale: Locale;
  query: ProductQuery;
  searchParams: RawSearchParams;
  basePath: string;
  emptyAction?: { href: string; label: string };
}) {
  const d = getDictionary(locale);
  let page: ProductPage;
  try {
    page = await getCommerce().queryProducts(query);
  } catch (e) {
    if (e instanceof CommerceUnavailableError) return <Notice tone="error" title={d.errors.unavailableTitle}>{d.errors.unavailableBody}</Notice>;
    throw e;
  }

  const chips: { key: string; value: string | null; label: string }[] = [];
  for (const [key, values] of Object.entries(query.facets ?? {})) for (const v of values) chips.push({ key, value: v, label: facetValueLabel(`${key}:${v}`, locale) });
  if (query.minPrice !== undefined) chips.push({ key: "min", value: null, label: `${d.catalog.priceMin} ${formatPrice(query.minPrice, locale)}` });
  if (query.maxPrice !== undefined) chips.push({ key: "max", value: null, label: `${d.catalog.priceMax} ${formatPrice(query.maxPrice, locale)}` });
  if (query.inStock) chips.push({ key: "stock", value: null, label: d.catalog.inStockOnly });
  if (query.onSale) chips.push({ key: "sale", value: null, label: d.catalog.onSaleOnly });

  return (
    <div className="grid gap-8 lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-12">
      <FilterSidebar facets={page.facets} priceRange={page.priceRange} locale={locale} dict={d} />
      <div>
        <FilterToolbar facets={page.facets} priceRange={page.priceRange} locale={locale} dict={d} total={page.total} activeChips={chips} />
        {page.items.length ? (
          <>
            <ProductGrid products={page.items} locale={locale} dict={d} priorityCount={4} />
            {page.pageCount > 1 ? <Pagination page={page.page} pageCount={page.pageCount} basePath={basePath} searchParams={searchParams} labels={d.catalog} /> : null}
          </>
        ) : (
          <EmptyState
            title={d.catalog.empty}
            body={d.catalog.emptyHint}
            action={hasActiveFilters(query) ? <ButtonLink href={basePath + toSearch(searchParams, { material: null, color: null, min: null, max: null, stock: null, sale: null, page: null })} variant="secondary">{d.catalog.clearAll}</ButtonLink> : emptyAction ? <ButtonLink href={emptyAction.href} variant="secondary">{emptyAction.label}</ButtonLink> : null}
          />
        )}
      </div>
    </div>
  );
}

function Pagination({ page, pageCount, basePath, searchParams, labels }: { page: number; pageCount: number; basePath: string; searchParams: RawSearchParams; labels: { pagination: string; prev: string; next: string; pageOf: string } }) {
  const href = (p: number) => basePath + toSearch(searchParams, { page: p === 1 ? null : String(p) });
  const item = "inline-flex size-11 items-center justify-center rounded-md text-small";
  return (
    <nav aria-label={labels.pagination} className="mt-12 flex items-center justify-center gap-1">
      {page > 1 ? <Link href={href(page - 1)} className={cx(item, "text-ink hover:bg-surface-alt")} aria-label={labels.prev} rel="prev"><IconChevronLeft /></Link> : <span className={cx(item, "text-line-strong")} aria-hidden="true"><IconChevronLeft /></span>}
      {Array.from({ length: pageCount }, (_, i) => i + 1).map((p) => (
        <Link key={p} href={href(p)} aria-current={p === page ? "page" : undefined} className={cx(item, p === page ? "bg-green font-semibold text-on-green" : "text-ink hover:bg-surface-alt")} aria-label={t(labels.pageOf, { page: p, count: pageCount })}>
          {p}
        </Link>
      ))}
      {page < pageCount ? <Link href={href(page + 1)} className={cx(item, "text-ink hover:bg-surface-alt")} aria-label={labels.next} rel="next"><IconChevronRight /></Link> : <span className={cx(item, "text-line-strong")} aria-hidden="true"><IconChevronRight /></span>}
    </nav>
  );
}
