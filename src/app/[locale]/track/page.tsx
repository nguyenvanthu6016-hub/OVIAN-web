import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { noindex } from "@/lib/seo";
import { TrackOrderForm } from "@/components/checkout/order-views";

export async function generateMetadata({ params }: PageProps<"/[locale]/track">): Promise<Metadata> {
  const { locale } = await params;
  return isLocale(locale) ? { title: getDictionary(locale).order.track, ...noindex } : {};
}

export default async function TrackPage({ params }: PageProps<"/[locale]/track">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const d = getDictionary(locale);
  return (
    <div className="container-page page-x pb-8 pt-8">
      <h1 className="mb-6 text-display">{d.order.track}</h1>
      <TrackOrderForm locale={locale} dict={{ order: d.order, checkout: d.checkout, cart: d.cart, common: d.common }} />
    </div>
  );
}
