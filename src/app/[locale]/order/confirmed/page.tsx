import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { noindex } from "@/lib/seo";
import { OrderConfirmation } from "@/components/checkout/order-views";

export async function generateMetadata({ params }: PageProps<"/[locale]/order/confirmed">): Promise<Metadata> {
  const { locale } = await params;
  return isLocale(locale) ? { title: getDictionary(locale).order.confirmedTitle, ...noindex } : {};
}

export default async function OrderConfirmedPage({ params }: PageProps<"/[locale]/order/confirmed">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const d = getDictionary(locale);
  return (
    <div className="container-page page-x pb-8 pt-10">
      <OrderConfirmation locale={locale} dict={{ order: d.order, checkout: d.checkout, cart: d.cart, common: d.common }} />
    </div>
  );
}
