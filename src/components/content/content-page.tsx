import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getContent } from "@/lib/cms";
import type { Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { routes } from "@/lib/routes";
import { localizedAlternates } from "@/lib/seo";
import { Breadcrumbs, Notice } from "@/components/ui/primitives";
import { Blocks } from "./blocks";

export async function contentMetadata(slug: string, locale: Locale, path: string): Promise<Metadata> {
  const page = await getContent().page(slug, locale).catch(() => null);
  if (!page) return {};
  return {
    title: page.title.value,
    description: page.summary?.value,
    ...localizedAlternates(locale, path, { enAvailable: locale === "vi" || page.body.lang === "en" }),
  };
}

/** Sanity-driven information page (about, policies). */
export async function ContentPageView({ slug, locale }: { slug: string; locale: Locale }) {
  const d = getDictionary(locale);
  const page = await getContent().page(slug, locale).catch(() => null);
  if (!page) notFound();
  return (
    <article className="container-page page-x pb-8 pt-6">
      <Breadcrumbs label={d.common.breadcrumb} items={[{ href: routes.home(locale), label: d.common.home }, { label: page.title.value }]} />
      <header className="mb-10 mt-4 max-w-2xl">
        <h1 lang={page.title.lang} className="text-display">{page.title.value}</h1>
        {page.summary ? <p lang={page.summary.lang} className="mt-3 text-subheading font-normal text-ink-muted">{page.summary.value}</p> : null}
      </header>
      {locale === "en" && page.body.lang === "vi" ? <Notice className="mb-6 max-w-2xl">{d.pages.viFallback}</Notice> : null}
      {page.body.blocks.length ? <Blocks body={page.body} /> : <p className="text-ink-muted">{d.pages.contentMissing}</p>}
    </article>
  );
}
