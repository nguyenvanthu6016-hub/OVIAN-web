import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { noindex } from "@/lib/seo";
import { CartPageClient } from "@/components/cart/cart-page";
import { getContent } from "@/lib/cms";
import { shopPromises } from "@/lib/checkout/promises";
import { promiseLines } from "@/components/layout/promo-bar";

export async function generateMetadata({ params }: PageProps<"/[locale]/cart">): Promise<Metadata> {
  const { locale } = await params;
  return isLocale(locale) ? { title: getDictionary(locale).cart.title, ...noindex } : {};
}

export default async function CartPage({ params }: PageProps<"/[locale]/cart">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const d = getDictionary(locale);
  // One more item earns free delivery, and the voucher is waiting at the next step: the two
  // facts most likely to turn a full cart into an order.
  const promises = promiseLines(shopPromises(await getContent().shippingRules().catch(() => null)), locale, d);
  return (
    <div className="container-page page-x min-h-screen pb-8 pt-8">
      <h1 className="mb-8 text-display">{d.cart.title}</h1>
      <CartPageClient locale={locale} dict={{ cart: d.cart, product: d.product, checkout: d.checkout, errors: d.errors, common: d.common }} promises={promises} />
    </div>
  );
}
