import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { parseCatalogParams } from "@/lib/catalog-params";
import { isLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { routes } from "@/lib/routes";
import { localizedAlternates } from "@/lib/seo";
import { CatalogView } from "@/components/catalog/catalog-view";
import { Breadcrumbs } from "@/components/ui/primitives";

export async function generateMetadata({ params, searchParams }: PageProps<"/[locale]/products">): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const sp = await searchParams;
  const d = getDictionary(locale);
  const filtered = Object.keys(sp).some((k) => k !== "page");
  return {
    title: d.catalog.title,
    ...localizedAlternates(locale, "/products"),
    // Filtered permutations are not indexed; canonical points at the clean listing.
    ...(filtered ? { robots: { index: false, follow: true } } : {}),
  };
}

export default async function ProductsPage({ params, searchParams }: PageProps<"/[locale]/products">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const sp = await searchParams;
  const d = getDictionary(locale);
  const query = parseCatalogParams(sp, locale);
  const title = query.onSale ? d.nav.onSale : query.sort === "newest" ? d.nav.newArrivals : d.catalog.title;
  return (
    <div className="container-page page-x pb-8 pt-6">
      <Breadcrumbs label={d.common.breadcrumb} items={[{ href: routes.home(locale), label: d.common.home }, { label: title }]} />
      <h1 className="mb-8 mt-4 text-display">{title}</h1>
      <CatalogView locale={locale} query={query} searchParams={sp} basePath={routes.products(locale)} />
    </div>
  );
}
