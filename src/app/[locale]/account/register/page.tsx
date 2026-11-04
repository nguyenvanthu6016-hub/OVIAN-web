import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { noindex } from "@/lib/seo";
import { AccountShell } from "@/components/account/account-shell";

export async function generateMetadata({ params }: PageProps<"/[locale]/account/register">): Promise<Metadata> {
  const { locale } = await params;
  return isLocale(locale) ? { title: getDictionary(locale).account.register, ...noindex } : {};
}

export default async function RegisterPage({ params }: PageProps<"/[locale]/account/register">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return <AccountShell locale={locale} view="register" title={getDictionary(locale).account.register} />;
}
