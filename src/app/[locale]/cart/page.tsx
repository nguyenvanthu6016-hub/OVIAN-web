import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { noindex } from "@/lib/seo";
import { CartPageClient } from "@/components/cart/cart-page";

export async function generateMetadata({ params }: PageProps<"/[locale]/cart">): Promise<Metadata> {
  const { locale } = await params;
  return isLocale(locale) ? { title: getDictionary(locale).cart.title, ...noindex } : {};
}

export default async function CartPage({ params }: PageProps<"/[locale]/cart">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const d = getDictionary(locale);
  return (
    <div className="container-page page-x pb-8 pt-8">
      <h1 className="mb-8 text-display">{d.cart.title}</h1>
      <CartPageClient locale={locale} dict={{ cart: d.cart, product: d.product, checkout: d.checkout, errors: d.errors, common: d.common }} />
    </div>
  );
}
