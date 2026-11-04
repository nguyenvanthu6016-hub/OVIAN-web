import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { noindex } from "@/lib/seo";
import { AccountShell } from "@/components/account/account-shell";

export async function generateMetadata({ params }: PageProps<"/[locale]/account/login">): Promise<Metadata> {
  const { locale } = await params;
  return isLocale(locale) ? { title: getDictionary(locale).account.login, ...noindex } : {};
}

export default async function LoginPage({ params }: PageProps<"/[locale]/account/login">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return <AccountShell locale={locale} view="login" title={getDictionary(locale).account.login} />;
}
