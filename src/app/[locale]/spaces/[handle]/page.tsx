import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCommerce, CommerceUnavailableError, type Category } from "@/lib/commerce";
import { parseCatalogParams } from "@/lib/catalog-params";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { getDictionary, t } from "@/lib/i18n/dictionaries";
import { routes } from "@/lib/routes";
import { jsonLd, localizedAlternates, siteUrl } from "@/lib/seo";
import { CatalogView } from "@/components/catalog/catalog-view";
import { Breadcrumbs, Notice } from "@/components/ui/primitives";

async function load(handle: string, locale: Locale) {
  const all = await getCommerce().listCategories(locale);
  const cat = all.find((c) => c.handle === handle) ?? null;
  const parent = cat?.parentId ? all.find((c) => c.id === cat.parentId) ?? null : null;
  const children = cat ? all.filter((c) => c.parentId === cat.id) : [];
  const siblings = parent ? all.filter((c) => c.parentId === parent.id) : [];
  return { cat, parent, children, siblings };
}

export async function generateMetadata({ params, searchParams }: PageProps<"/[locale]/spaces/[handle]">): Promise<Metadata> {
  const { locale, handle } = await params;
  if (!isLocale(locale)) return {};
  try {
    const { cat } = await load(handle, locale);
    if (!cat) return {};
    const sp = await searchParams;
    return {
      title: cat.name.value,
      description: cat.description?.value,
      ...localizedAlternates(locale, `/spaces/${handle}`, { enAvailable: locale === "vi" || cat.name.lang === "en" }),
      ...(Object.keys(sp).some((k) => k !== "page") ? { robots: { index: false, follow: true } } : {}),
    };
  } catch {
    return {};
  }
}

const pill =
  "inline-flex h-10 items-center whitespace-nowrap rounded-full border border-line-strong px-4 text-small text-ink hover:border-green hover:text-green aria-[current=page]:border-green aria-[current=page]:bg-green aria-[current=page]:text-on-green";

export default async function SpacePage({ params, searchParams }: PageProps<"/[locale]/spaces/[handle]">) {
  const { locale, handle } = await params;
  if (!isLocale(locale)) notFound();
  const d = getDictionary(locale);
  const sp = await searchParams;
  let data: Awaited<ReturnType<typeof load>>;
  try {
    data = await load(handle, locale);
  } catch (e) {
    if (!(e instanceof CommerceUnavailableError)) throw e;
    return (
      <div className="container-page page-x py-16">
        <Notice tone="error" title={d.errors.unavailableTitle}>{d.errors.unavailableBody}</Notice>
      </div>
    );
  }
  const { cat, parent, children, siblings } = data;
  if (!cat) notFound();
  const tabs: Category[] = children.length ? children : siblings;
  const tabParent = children.length ? cat : parent;

  const crumbs = [
    { href: routes.home(locale), label: d.common.home },
    ...(parent ? [{ href: routes.space(locale, parent.handle), label: parent.name.value }] : []),
    { label: cat.name.value },
  ];

  return (
    <div className="container-page page-x pb-8 pt-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLd({
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: crumbs.map((c, i) => ({
            "@type": "ListItem",
            position: i + 1,
            name: c.label,
            item: `${siteUrl()}${c.href ?? routes.space(locale, cat.handle)}`,
          })),
        })}
      />
      <Breadcrumbs label={d.common.breadcrumb} items={crumbs} />
      <header className="mb-8 mt-4 grid gap-4 border-b border-line pb-8 md:grid-cols-12">
        <div className="md:col-span-7">
          <h1 lang={cat.name.lang} className="text-display">{cat.name.value}</h1>
          {cat.description ? <p lang={cat.description.lang} className="mt-3 max-w-xl text-ink">{cat.description.value}</p> : null}
        </div>
        <p className="text-caption text-ink-muted md:col-span-5 md:self-end md:text-right">
          {[cat.areaM2 ? t(d.home.area, { area: cat.areaM2 }) : null, t(d.common.items, { count: cat.productCount })].filter(Boolean).join(", ")}
        </p>
        {tabs.length && tabParent ? (
          <nav aria-label={d.catalog.subcategories} className="md:col-span-12">
            <ul className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
              <li>
                <Link href={routes.space(locale, tabParent.handle)} aria-current={cat.id === tabParent.id ? "page" : undefined} className={pill}>
                  {d.common.viewAll}
                </Link>
              </li>
              {tabs.map((c) => (
                <li key={c.id}>
                  <Link href={routes.space(locale, c.handle)} lang={c.name.lang} aria-current={c.id === cat.id ? "page" : undefined} className={pill}>
                    {c.name.value}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ) : null}
      </header>
      <CatalogView
        locale={locale}
        query={parseCatalogParams(sp, locale, { categoryHandle: cat.handle })}
        searchParams={sp}
        basePath={routes.space(locale, cat.handle)}
        emptyAction={{ href: routes.products(locale), label: d.common.allProducts }}
      />
    </div>
  );
}
