import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getContent } from "@/lib/cms";
import { isLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { localizedAlternates } from "@/lib/seo";
import { StoreCard } from "@/components/content/store-card";

export const revalidate = 600;

export async function generateMetadata({ params }: PageProps<"/[locale]/store">): Promise<Metadata> {
  const { locale } = await params;
  return isLocale(locale) ? { title: getDictionary(locale).pages.storeTitle, ...localizedAlternates(locale, "/store") } : {};
}

export default async function StorePage({ params }: PageProps<"/[locale]/store">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const d = getDictionary(locale);
  const settings = await getContent().siteSettings(locale).catch(() => null);
  if (!settings?.store) notFound(); // OVIAN has no shop customers can visit
  return (
    <div className="container-page page-x pb-8 pt-8">
      <h1 className="mb-3 text-display">{d.pages.storeTitle}</h1>
      <p className="mb-8 max-w-xl text-ink-muted">{d.pages.storeIntro}</p>
      <div className="max-w-2xl"><StoreCard store={settings?.store ?? null} dict={d} /></div>
    </div>
  );
}
