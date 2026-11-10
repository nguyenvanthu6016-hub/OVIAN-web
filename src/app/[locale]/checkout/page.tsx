import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ordersEnabled } from "@/lib/orders";
import { getContent } from "@/lib/cms";
import { isLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { noindex } from "@/lib/seo";
import { CheckoutForm } from "@/components/checkout/checkout-form";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/[locale]/checkout">): Promise<Metadata> {
  const { locale } = await params;
  return isLocale(locale) ? { title: getDictionary(locale).checkout.title, ...noindex } : {};
}

export default async function CheckoutPage({ params }: PageProps<"/[locale]/checkout">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const d = getDictionary(locale);
  const content = getContent();
  const [settings, rules] = await Promise.all([content.siteSettings(locale).catch(() => null), content.shippingRules().catch(() => null)]);
  return (
    <div className="container-page page-x pb-8 pt-8">
      <h1 className="mb-8 text-display">{d.checkout.title}</h1>
      <CheckoutForm
        locale={locale}
        dict={{ checkout: d.checkout, cart: d.cart, errors: d.errors, common: d.common, order: d.order }}
        store={settings?.store ?? null}
        ordersEnabled={ordersEnabled()}
        sampleShipping={!!rules?.sample}
      />
    </div>
  );
}
