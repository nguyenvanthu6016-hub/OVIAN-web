import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale } from "@/lib/i18n/config";
import { ContentPageView, contentMetadata } from "@/components/content/content-page";

export const revalidate = 600;

export async function generateMetadata({ params }: PageProps<"/[locale]/about">): Promise<Metadata> {
  const { locale } = await params;
  return isLocale(locale) ? contentMetadata("about", locale, "/about") : {};
}

export default async function AboutPage({ params }: PageProps<"/[locale]/about">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return <ContentPageView slug="about" locale={locale} />;
}
