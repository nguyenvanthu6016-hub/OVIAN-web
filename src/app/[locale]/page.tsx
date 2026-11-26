import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCommerce, CommerceUnavailableError, type Product } from "@/lib/commerce";
import { getContent } from "@/lib/cms";
import { isLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { formatDate } from "@/lib/i18n/format";
import { routes } from "@/lib/routes";
import { jsonLd, localizedAlternates, siteUrl } from "@/lib/seo";
import { FloorPlan } from "@/components/home/floor-plan";
import { getSpacesSafe } from "@/components/layout/site-chrome";
import { ProductGrid } from "@/components/product/product-card";
import { ButtonLink, Notice, SectionHeading } from "@/components/ui/primitives";

export const revalidate = 300;

export async function generateMetadata({ params }: PageProps<"/[locale]">): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const d = getDictionary(locale);
  return { title: { absolute: `OVIAN — ${d.meta.slogan}` }, description: d.meta.defaultDescription, ...localizedAlternates(locale, "") };
}

export default async function HomePage({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const d = getDictionary(locale);
  const commerce = getCommerce();
  const content = getContent();

  const [spaces, home, journal] = await Promise.all([
    getSpacesSafe(locale),
    content.home(locale).catch(() => null),
    content.journal(locale).catch(() => []),
  ]);

  let newest: Product[] = [];
  let sale: Product[] = [];
  let collectionProducts: Product[] = [];
  let unavailable = false;
  try {
    const col = home?.collections[0];
    const [n, s, c] = await Promise.all([
      commerce.queryProducts({ locale, sort: "newest", pageSize: 4, inStock: true }),
      commerce.queryProducts({ locale, onSale: true, pageSize: 4 }),
      col ? commerce.getProductsByIds(col.productIds, locale) : Promise.resolve([]),
    ]);
    newest = n.items;
    sale = s.items;
    collectionProducts = c;
  } catch (e) {
    if (!(e instanceof CommerceUnavailableError)) throw e;
    unavailable = true;
  }

  const totalArea = spaces.reduce((s, x) => s + (x.areaM2 ?? 0), 0);
  const collection = home?.collections[0];

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd({ "@context": "https://schema.org", "@type": "Organization", name: "OVIAN", slogan: d.meta.slogan, url: siteUrl(), logo: `${siteUrl()}/brand/ovian-logo-green-bg.png` })} />

      <section className="container-page page-x grid gap-8 pb-16 pt-8 md:pt-12 lg:grid-cols-12 lg:gap-12 lg:pb-24" aria-labelledby="hero-title">
        <div className="flex flex-col justify-between gap-8 lg:col-span-4 lg:py-2">
          <div>
            <h1 id="hero-title" className="text-display">{d.meta.slogan}</h1>
            {home?.intro ? <p className="mt-4 max-w-md text-body text-ink">{home.intro.value}</p> : null}
          </div>
          <div className="space-y-4">
            <div>
              <h2 className="text-subheading">{d.home.planTitle}</h2>
              <p className="mt-1 max-w-sm text-small text-ink-muted">{d.home.planIntro}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <ButtonLink href={routes.products(locale)}>{d.common.allProducts}</ButtonLink>
              <ButtonLink href={routes.newArrivals(locale)} variant="secondary">{d.nav.newArrivals}</ButtonLink>
            </div>
            {totalArea ? <p className="text-caption text-ink-muted">{locale === "vi" ? `Nhà mẫu ${totalArea} m²` : `Sample home, ${totalArea} m²`}</p> : null}
          </div>
        </div>
        <div className="lg:col-span-8">
          <FloorPlan spaces={spaces} locale={locale} dict={d} />
        </div>
      </section>

      {unavailable ? (
        <div className="container-page page-x">
          <Notice tone="error" title={d.errors.unavailableTitle}>{d.errors.unavailableBody}</Notice>
        </div>
      ) : null}

      {collection && collectionProducts.length ? (
        <section className="container-page page-x pb-20" aria-labelledby="col-title">
          <SectionHeading id="col-title" title={collection.title.value} intro={collection.body?.value} />
          <ProductGrid products={collectionProducts} locale={locale} dict={d} priorityCount={2} />
        </section>
      ) : null}

      {newest.length ? (
        <section className="container-page page-x pb-20" aria-labelledby="new-title">
          <SectionHeading id="new-title" title={d.home.newArrivals} action={<Link href={routes.newArrivals(locale)} className="text-small font-semibold text-green underline underline-offset-4">{d.common.viewAll}</Link>} />
          <ProductGrid products={newest} locale={locale} dict={d} priorityCount={collection && collectionProducts.length ? 0 : 2} />
        </section>
      ) : null}

      {home?.story ? (
        <section className="page-x pb-20" aria-labelledby="story-title">
          <div className="container-page grid gap-6 rounded-lg bg-green px-6 py-12 text-on-green md:grid-cols-12 md:px-12 md:py-16">
            <h2 id="story-title" className="text-heading text-on-green md:col-span-5">{home.story.title.value}</h2>
            <div className="md:col-span-6 md:col-start-7">
              <p lang={home.story.body.lang} className="text-body text-on-green/90">{home.story.body.value}</p>
              <Link href={routes.about(locale)} className="mt-6 inline-flex h-11 items-center rounded-md bg-yellow px-5 text-small font-semibold text-ink hover:brightness-95">
                {d.home.storyCta}
              </Link>
            </div>
          </div>
        </section>
      ) : null}

      {sale.length ? (
        <section className="container-page page-x pb-20" aria-labelledby="sale-title">
          <SectionHeading id="sale-title" title={d.home.onSale} action={<Link href={routes.onSale(locale)} className="text-small font-semibold text-green underline underline-offset-4">{d.common.viewAll}</Link>} />
          <ProductGrid products={sale} locale={locale} dict={d} />
        </section>
      ) : null}

      {journal.length ? (
        <section className="container-page page-x" aria-labelledby="journal-title">
          <SectionHeading id="journal-title" title={d.home.journalTitle} action={<Link href={routes.journal(locale)} className="text-small font-semibold text-green underline underline-offset-4">{d.common.viewAll}</Link>} />
          <ul className="grid gap-x-8 gap-y-6 border-t border-line pt-6 md:grid-cols-3">
            {journal.slice(0, 3).map((p) => (
              <li key={p.slug}>
                <Link href={routes.post(locale, p.slug)} className="group block">
                  <p className="text-caption text-ink-muted">{[p.category?.value, formatDate(p.date, locale)].filter(Boolean).join(", ")}</p>
                  <h3 lang={p.title.lang} className="mt-1 text-subheading group-hover:underline group-hover:underline-offset-4">{p.title.value}</h3>
                  <p lang={p.excerpt.lang} className="mt-1 text-small text-ink-muted">{p.excerpt.value}</p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </>
  );
}
