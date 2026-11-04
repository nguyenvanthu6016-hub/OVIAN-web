import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { parseCatalogParams } from "@/lib/catalog-params";
import { isLocale } from "@/lib/i18n/config";
import { getDictionary, t } from "@/lib/i18n/dictionaries";
import { routes } from "@/lib/routes";
import { noindex } from "@/lib/seo";
import { CatalogView } from "@/components/catalog/catalog-view";
import { SearchBox } from "@/components/layout/search-box";
import { getSpacesSafe } from "@/components/layout/site-chrome";

export async function generateMetadata({ params }: PageProps<"/[locale]/search">): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  return { title: getDictionary(locale).search.title, ...noindex };
}

export default async function SearchPage({ params, searchParams }: PageProps<"/[locale]/search">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const d = getDictionary(locale);
  const sp = await searchParams;
  const q = (Array.isArray(sp.q) ? sp.q[0] : sp.q)?.trim() ?? "";
  const spaces = q ? [] : await getSpacesSafe(locale);
  const labels = { label: d.search.label, placeholder: d.search.placeholder, submit: d.search.submit, products: d.search.products, spaces: d.search.spaces };
  return (
    <div className="container-page page-x pb-8 pt-8">
      <h1 className="text-display">{q ? t(d.search.resultsFor, { q }) : d.search.title}</h1>
      <div className="mb-10 mt-6 max-w-xl">
        <SearchBox key={q} locale={locale} initial={q} labels={labels} />
      </div>
      {q ? (
        <CatalogView
          locale={locale}
          query={parseCatalogParams(sp, locale)}
          searchParams={sp}
          basePath={routes.search(locale)}
          emptyAction={{ href: routes.products(locale), label: d.common.allProducts }}
        />
      ) : (
        <div>
          <p className="text-ink-muted">{d.search.prompt}</p>
          <ul className="mt-6 flex flex-wrap gap-2">
            {spaces.map((s) => (
              <li key={s.handle}>
                <Link href={routes.space(locale, s.handle)} className="inline-flex h-10 items-center rounded-full border border-line-strong px-4 text-small hover:border-green hover:text-green">{s.name}</Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
