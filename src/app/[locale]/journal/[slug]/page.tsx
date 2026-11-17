import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getContent } from "@/lib/cms";
import { isLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { formatDate } from "@/lib/i18n/format";
import { routes } from "@/lib/routes";
import { jsonLd, localizedAlternates, siteUrl } from "@/lib/seo";
import { Blocks } from "@/components/content/blocks";
import { Breadcrumbs, Notice } from "@/components/ui/primitives";

export const revalidate = 600;

/** Cache each post after its first visit (see the product page for the same pattern). */
export function generateStaticParams() {
  return [];
}

export async function generateMetadata({ params }: PageProps<"/[locale]/journal/[slug]">): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!isLocale(locale)) return {};
  const post = await getContent().journalPost(slug, locale).catch(() => null);
  if (!post) return {};
  return {
    title: post.title.value,
    description: post.excerpt.value,
    ...localizedAlternates(locale, `/journal/${slug}`, { enAvailable: locale === "vi" || post.body.lang === "en" }),
    openGraph: { type: "article", publishedTime: post.date },
  };
}

export default async function PostPage({ params }: PageProps<"/[locale]/journal/[slug]">) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();
  const d = getDictionary(locale);
  const post = await getContent().journalPost(slug, locale).catch(() => null);
  if (!post) notFound();
  return (
    <article className="container-page page-x pb-8 pt-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd({ "@context": "https://schema.org", "@type": "Article", headline: post.title.value, datePublished: post.date, inLanguage: post.body.lang, publisher: { "@type": "Organization", name: "OVIAN" }, url: `${siteUrl()}${routes.post(locale, slug)}` })} />
      <Breadcrumbs label={d.common.breadcrumb} items={[{ href: routes.home(locale), label: d.common.home }, { href: routes.journal(locale), label: d.pages.journalTitle }, { label: post.title.value }]} />
      <header className="mb-10 mt-4 max-w-2xl">
        <p className="text-caption text-ink-muted">{[post.category?.value, formatDate(post.date, locale)].filter(Boolean).join(", ")}</p>
        <h1 lang={post.title.lang} className="mt-2 text-display">{post.title.value}</h1>
        <p lang={post.excerpt.lang} className="mt-3 text-subheading font-normal text-ink-muted">{post.excerpt.value}</p>
      </header>
      {locale === "en" && post.body.lang === "vi" ? <Notice className="mb-6 max-w-2xl">{d.pages.viFallback}</Notice> : null}
      <Blocks body={post.body} />
    </article>
  );
}
