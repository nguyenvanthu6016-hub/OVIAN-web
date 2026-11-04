import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { routes } from "@/lib/routes";
import { noindex } from "@/lib/seo";
import { WishlistGrid } from "@/components/product/product-list-client";
import { ButtonLink, EmptyState } from "@/components/ui/primitives";

export async function generateMetadata({ params }: PageProps<"/[locale]/wishlist">): Promise<Metadata> {
  const { locale } = await params;
  return isLocale(locale) ? { title: getDictionary(locale).wishlist.title, ...noindex } : {};
}

export default async function WishlistPage({ params }: PageProps<"/[locale]/wishlist">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const d = getDictionary(locale);
  return (
    <div className="container-page page-x pb-8 pt-8">
      <h1 className="text-display">{d.wishlist.title}</h1>
      <p className="mb-8 mt-2 text-caption text-ink-muted">{d.wishlist.note}</p>
      <WishlistGrid locale={locale} dict={d} empty={<EmptyState title={d.wishlist.empty} action={<ButtonLink href={routes.products(locale)}>{d.cart.continue}</ButtonLink>} />} />
    </div>
  );
}
