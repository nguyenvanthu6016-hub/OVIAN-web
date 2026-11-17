import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getContent } from "@/lib/cms";
import { isLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { formatDate } from "@/lib/i18n/format";
import { routes } from "@/lib/routes";
import { localizedAlternates } from "@/lib/seo";
import { EmptyState } from "@/components/ui/primitives";

export const revalidate = 600;

export async function generateMetadata({ params }: PageProps<"/[locale]/journal">): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const d = getDictionary(locale);
  return { title: d.pages.journalTitle, description: d.pages.journalIntro, ...localizedAlternates(locale, "/journal") };
}

export default async function JournalPage({ params }: PageProps<"/[locale]/journal">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const d = getDictionary(locale);
  const posts = await getContent().journal(locale).catch(() => []);
  if (!posts.length) notFound(); // no posts yet: the section does not exist for visitors
  return (
    <div className="container-page page-x pb-8 pt-8">
      <header className="mb-10 max-w-2xl">
        <h1 className="text-display">{d.pages.journalTitle}</h1>
        <p className="mt-3 text-ink-muted">{d.pages.journalIntro}</p>
      </header>
      {posts.length ? (
        <ul className="divide-y divide-line border-y border-line">
          {posts.map((p) => (
            <li key={p.slug}>
              <Link href={routes.post(locale, p.slug)} className="group grid gap-2 py-7 md:grid-cols-12 md:gap-8">
                <p className="text-caption text-ink-muted md:col-span-3">{formatDate(p.date, locale)}{p.category ? <><br className="hidden md:block" /><span className="md:hidden">, </span>{p.category.value}</> : null}</p>
                <div className="md:col-span-8">
                  <h2 lang={p.title.lang} className="text-heading group-hover:underline group-hover:underline-offset-4">{p.title.value}</h2>
                  <p lang={p.excerpt.lang} className="mt-2 text-ink-muted">{p.excerpt.value}</p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState title={d.pages.contentMissing} />
      )}
    </div>
  );
}
