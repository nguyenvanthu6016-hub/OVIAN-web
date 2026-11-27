import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCommerce, CommerceUnavailableError, type Product, type Review } from "@/lib/commerce";
import { parseDescription, type DescriptionLine } from "@/lib/product/description";
import { importedReviews } from "@/lib/product/reviews";
import { isAvailable, minPrice } from "@/lib/commerce/query";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { getDictionary, t } from "@/lib/i18n/dictionaries";
import { formatDate } from "@/lib/i18n/format";
import { routes } from "@/lib/routes";
import { jsonLd, localizedAlternates, siteUrl } from "@/lib/seo";
import { ProductGrid } from "@/components/product/product-card";
import { RecentlyViewed } from "@/components/product/product-list-client";
import { ProductPurchase } from "@/components/product/purchase-panel";
import { IconChevronDown, IconStar } from "@/components/ui/icons";
import { Breadcrumbs, Notice } from "@/components/ui/primitives";

export const revalidate = 300;

/**
 * No product is built ahead of time, but returning an empty list lets Next cache each product page
 * after its first visit and refresh it every 5 minutes (or at once via the Sapo webhook), instead
 * of rendering it for every visitor.
 */
export function generateStaticParams() {
  return [];
}

async function getData(handle: string, locale: Locale) {
  const commerce = getCommerce();
  const product = await commerce.getProduct(handle, locale);
  if (!product) return null;
  const [categories, relatedById, reviews] = await Promise.all([
    commerce.listCategories(locale),
    product.relatedIds.length ? commerce.getProductsByIds(product.relatedIds, locale) : Promise.resolve([] as Product[]),
    commerce.listReviews(product.id),
  ]);
  // Reviews customers left on the Shopee listing. They sit alongside whatever the commerce
  // provider knows; in live mode the provider has none, so these are all a shopper sees.
  const imported = importedReviews(product.handle);
  const allReviews = reviews === null && !imported.length ? null : [...imported, ...(reviews ?? [])];
  let related = relatedById;
  if (!related.length && product.categoryIds[0]) {
    const cat = categories.find((c) => c.id === product.categoryIds[0]);
    if (cat) related = (await commerce.queryProducts({ locale, categoryHandle: cat.handle, pageSize: 5 })).items.filter((p) => p.id !== product.id);
  }
  const primaryCat = categories.find((c) => product.categoryIds.includes(c.id) && !c.parentId);
  const subCat = categories.find((c) => product.categoryIds.includes(c.id) && c.parentId === primaryCat?.id);
  return { product, related: related.slice(0, 4), reviews: allReviews, primaryCat, subCat, mode: commerce.mode };
}

export async function generateMetadata({ params }: PageProps<"/[locale]/products/[handle]">): Promise<Metadata> {
  const { locale, handle } = await params;
  if (!isLocale(locale)) return {};
  try {
    const p = await getCommerce().getProduct(handle, locale);
    if (!p) return {};
    const img = p.images[0];
    return {
      title: p.name.value,
      description: (p.summary ?? p.description)?.value.replace(/\s+/g, " ").slice(0, 160),
      // When English copy is only a Vietnamese fallback, the /en URL is noindexed and left out of hreflang.
      ...localizedAlternates(locale, `/products/${handle}`, { enAvailable: locale === "vi" ? true : !p.translationMissing }),
      openGraph: img ? { images: [{ url: img.url, width: img.width, height: img.height, alt: img.alt }] } : undefined,
    };
  } catch {
    return {};
  }
}

export default async function ProductPage({ params }: PageProps<"/[locale]/products/[handle]">) {
  const { locale, handle } = await params;
  if (!isLocale(locale)) notFound();
  const d = getDictionary(locale);
  let data: Awaited<ReturnType<typeof getData>>;
  try {
    data = await getData(handle, locale);
  } catch (e) {
    if (!(e instanceof CommerceUnavailableError)) throw e;
    return (
      <div className="container-page page-x py-16">
        <Notice tone="error" title={d.errors.unavailableTitle}>{d.errors.unavailableBody}</Notice>
      </div>
    );
  }
  if (!data) notFound();
  const { product: p, related, reviews, primaryCat, subCat } = data;

  const crumbs = [
    { href: routes.home(locale), label: d.common.home },
    ...(primaryCat ? [{ href: routes.space(locale, primaryCat.handle), label: primaryCat.name.value }] : []),
    ...(subCat ? [{ href: routes.space(locale, subCat.handle), label: subCat.name.value }] : []),
    { label: p.name.value },
  ];
  // The seller's blob becomes an intro plus drawers the shopper opens when they want the detail.
  const description = parseDescription(p.description?.value);
  const specs = p.attributes.filter((a) => a.key !== "care");
  const care = p.attributes.find((a) => a.key === "care");
  const url = `${siteUrl()}${routes.product(locale, p.handle)}`;

  const ld = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.name.value,
    description: p.description?.value,
    sku: p.variants[0]?.sku,
    brand: { "@type": "Brand", name: "OVIAN" },
    image: p.images.map((i) => (i.url.startsWith("http") ? i.url : `${siteUrl()}${i.url}`)),
    offers: {
      "@type": "AggregateOffer",
      priceCurrency: "VND",
      lowPrice: minPrice(p),
      highPrice: Math.max(...p.variants.map((v) => v.price)),
      offerCount: p.variants.length,
      availability: isAvailable(p) ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      url,
    },
    // aggregateRating is intentionally omitted, even now that the page shows reviews. These were
    // written on OVIAN's Shopee listing, not collected by this site, and Google's structured-data
    // policy does not accept ratings carried over from a marketplace. The stars still show to
    // shoppers; only the machine-readable claim is withheld.
  };

  return (
    <div className="container-page page-x pb-8 pt-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(ld)} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLd({
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: crumbs.map((c, i) => ({ "@type": "ListItem", position: i + 1, name: c.label, item: c.href ? `${siteUrl()}${c.href}` : url })),
        })}
      />
      {/* The last crumb is this product's own name, which the heading below already carries, so it
          is dropped from the visible trail. Search engines still get the full trail above. */}
      <Breadcrumbs label={d.common.breadcrumb} items={crumbs.slice(0, -1)} />

      <div className="mt-6 grid gap-8 lg:grid-cols-12 lg:gap-12">
        <ProductPurchase product={p} locale={locale} dict={d} />
      </div>

      <section className="mt-16 grid gap-10 border-t border-line pt-10 lg:grid-cols-12" aria-labelledby="details-title">
        <h2 id="details-title" className="text-heading lg:col-span-4">{d.product.details}</h2>
        <div className="lg:col-span-8">
          {p.translationMissing && locale === "en" ? <p className="mb-4 text-caption text-ink-muted">{d.product.viCopyNote}</p> : null}
          {description.intro.length ? (
            <div lang={p.description?.lang} className="max-w-prose space-y-2 text-body">
              <Lines lines={description.intro} />
            </div>
          ) : null}
          <div className="mt-8 divide-y divide-line border-y border-line">
            {description.sections.map((section, i) => (
              <Disclosure key={`${section.title}-${i}`} title={section.title}>
                <div lang={p.description?.lang} className="max-w-prose space-y-2 text-small">
                  <Lines lines={section.lines} />
                </div>
              </Disclosure>
            ))}
            {specs.length ? (
              <Disclosure title={d.product.specs}>
                <dl className="grid grid-cols-[minmax(0,10rem)_1fr] gap-x-6 gap-y-2 text-small">
                  {specs.map((a) => (
                    <div key={a.key} className="contents">
                      <dt lang={a.label.lang} className="text-ink-muted">{a.label.value}</dt>
                      <dd lang={a.value.lang} className="text-ink">{a.value.value}</dd>
                    </div>
                  ))}
                </dl>
              </Disclosure>
            ) : null}
            {care ? (
              <Disclosure title={d.product.care}>
                <p lang={care.value.lang} className="text-small">{care.value.value}</p>
              </Disclosure>
            ) : null}
            <Disclosure title={d.product.shipping}>
              <p className="text-small">{d.product.shippingBody}</p>
            </Disclosure>
            <Disclosure title={d.product.returns}>
              <p className="text-small">
                {d.product.returnsBody}{" "}
                <Link href={routes.policy(locale, "doi-tra")} className="font-semibold text-green underline underline-offset-4">{d.product.returnsLink}</Link>
              </p>
            </Disclosure>
          </div>
        </div>
      </section>

      {related.length ? (
        <section className="mt-20" aria-labelledby="related-title">
          <h2 id="related-title" className="mb-6 text-heading">{d.product.related}</h2>
          <ProductGrid products={related} locale={locale} dict={d} />
        </section>
      ) : null}

      <Reviews reviews={reviews} locale={locale} dict={d} />

      <RecentlyViewed locale={locale} dict={d} excludeId={p.id} title={d.product.recentlyViewed} />
    </div>
  );
}

/** Description lines as the seller wrote them; the ones they meant as sub-headings stand out. */
function Lines({ lines }: { lines: DescriptionLine[] }) {
  return (
    <>
      {lines.map((l, i) =>
        l.kind === "label"
          ? <p key={i} className="pt-1 font-semibold text-ink first:pt-0">{l.text}</p>
          : <p key={i}>{l.text}</p>,
      )}
    </>
  );
}

function Disclosure({ title, children, open }: { title: string; children: React.ReactNode; open?: boolean }) {
  return (
    <details className="group py-1" open={open}>
      <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-4 text-small font-semibold text-ink [&::-webkit-details-marker]:hidden">
        {title}
        <IconChevronDown size={18} className="text-ink-muted transition-transform duration-150 group-open:rotate-180" />
      </summary>
      <div className="pb-5">{children}</div>
    </details>
  );
}

function Stars({ rating, label }: { rating: number; label: string }) {
  return (
    <span className="inline-flex items-center gap-0.5 text-green" role="img" aria-label={label}>
      {[1, 2, 3, 4, 5].map((i) => <IconStar key={i} size={16} filled={i <= Math.round(rating)} />)}
    </span>
  );
}

function Reviews({ reviews, locale, dict }: { reviews: Review[] | null; locale: Locale; dict: ReturnType<typeof getDictionary> }) {
  const avg = reviews?.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;
  const avgStr = avg.toLocaleString(locale === "vi" ? "vi-VN" : "en-US", { maximumFractionDigits: 1 });
  return (
    <section className="mt-20 grid gap-8 border-t border-line pt-10 lg:grid-cols-12" aria-labelledby="reviews-title">
      <div className="lg:col-span-4">
        <h2 id="reviews-title" className="text-heading">{dict.product.reviews}</h2>
        {reviews?.length ? (
          <div className="mt-3 flex items-center gap-3">
            <Stars rating={avg} label={t(dict.product.rating, { rating: avgStr })} />
            <span className="text-small text-ink-muted">{t(dict.product.reviewsAverage, { rating: avgStr })}, {t(dict.product.reviewsCount, { count: reviews.length })}</span>
          </div>
        ) : null}
        {reviews?.some((r) => r.source === "mock") ? <p className="mt-3 rounded-sm bg-surface-alt px-3 py-2 text-caption text-green">{dict.product.reviewsMockNote}</p> : null}
        {/* Said once, at the top, rather than stamped on every entry: these were written on the
            Shopee listing, not here, and a shopper deserves to know that before reading them. */}
        {reviews?.some((r) => r.source === "shopee") ? <p className="mt-3 rounded-sm bg-surface-alt px-3 py-2 text-caption text-green">{dict.product.reviewsShopeeNote}</p> : null}
      </div>
      <div className="lg:col-span-8">
        {reviews === null ? (
          <p className="text-ink-muted">{dict.product.reviewsUnavailable}</p>
        ) : reviews.length === 0 ? (
          <p className="text-ink-muted">{dict.product.reviewsNone}</p>
        ) : (
          <ul className="divide-y divide-line">
            {reviews.map((r) => (
              <li key={r.id} className="py-5 first:pt-0">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <Stars rating={r.rating} label={t(dict.product.rating, { rating: r.rating })} />
                  {r.title ? <p className="text-small font-semibold text-ink">{r.title}</p> : null}
                </div>
                {r.attributes?.length ? (
                  <dl className="mt-2 space-y-0.5 text-small">
                    {r.attributes.map((a) => (
                      <div key={a.label} className="flex flex-wrap gap-x-1.5">
                        <dt className="text-ink-muted">{a.label}:</dt>
                        <dd lang="vi" className="min-w-0 text-ink">{a.value}</dd>
                      </div>
                    ))}
                  </dl>
                ) : null}
                {/* Preserve the line breaks the customer typed; their paragraphing is theirs. */}
                <p lang="vi" className="mt-1.5 whitespace-pre-line text-small">{r.body}</p>
                <p className="mt-1.5 text-caption text-ink-muted">
                  {[r.author, r.createdAt ? formatDate(r.createdAt, locale) : null, r.variant].filter(Boolean).join(" · ")}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
