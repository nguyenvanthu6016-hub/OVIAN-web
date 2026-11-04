import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale, locales } from "@/lib/i18n/config";
import { ContentPageView, contentMetadata } from "@/components/content/content-page";

export const revalidate = 600;
const policySlugs = ["giao-hang", "doi-tra", "bao-mat", "dieu-khoan"];

export function generateStaticParams() {
  return locales.flatMap((locale) => policySlugs.map((slug) => ({ locale, slug })));
}

export async function generateMetadata({ params }: PageProps<"/[locale]/policies/[slug]">): Promise<Metadata> {
  const { locale, slug } = await params;
  return isLocale(locale) && policySlugs.includes(slug) ? contentMetadata(slug, locale, `/policies/${slug}`) : {};
}

export default async function PolicyPage({ params }: PageProps<"/[locale]/policies/[slug]">) {
  const { locale, slug } = await params;
  if (!isLocale(locale) || !policySlugs.includes(slug)) notFound();
  return <ContentPageView slug={slug} locale={locale} />;
}
