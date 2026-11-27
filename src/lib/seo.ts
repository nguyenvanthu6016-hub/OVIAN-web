import type { Metadata } from "next";
import type { Locale } from "@/lib/i18n/config";
import type { Product } from "@/lib/commerce/types";
import { isAvailable, minPrice } from "@/lib/commerce/query";

export function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
}

/**
 * Canonical + hreflang for a path that exists in both locales.
 * `path` is the locale-less path, e.g. "/products/ke-go".
 * Set `enAvailable: false` when English content is only a Vietnamese fallback: the en URL is then
 * noindexed and dropped from hreflang so search engines are not told it is English.
 */
export function localizedAlternates(locale: Locale, path: string, opts: { enAvailable?: boolean } = {}): Pick<Metadata, "alternates" | "robots"> {
  const enAvailable = opts.enAvailable ?? true;
  const languages: Record<string, string> = { vi: `/vi${path}`, "x-default": `/vi${path}` };
  if (enAvailable) languages.en = `/en${path}`;
  return {
    alternates: { canonical: `/${locale}${path}`, languages },
    ...(locale === "en" && !enAvailable ? { robots: { index: false, follow: true } } : {}),
  };
}

export const noindex: Pick<Metadata, "robots"> = { robots: { index: false, follow: false } };

export function jsonLd(data: unknown) {
  return { __html: JSON.stringify(data).replace(/</g, "\u003c") };
}

/** The id every schema node points at, so an agent reads one OVIAN rather than one per page. */
export const ORG_ID = () => `${siteUrl()}/#organization`;

/**
 * OVIAN as an entity: who to ring, where the business is registered, and the profiles that prove
 * the shop on Facebook, TikTok and here are the same people. Built from the content provider so
 * it cannot drift from the footer, and so nothing here is invented — a field OVIAN has not given
 * is left out rather than filled with a plausible guess.
 *
 * Organization, not LocalBusiness: the address is a workplace, not a shop customers can visit,
 * and LocalBusiness would invite agents to send people to the door.
 */
export function organizationLd(settings: {
  contactPhone?: string;
  contactEmail?: string;
  legal?: { name: { value: string }; address?: string; taxId?: string };
  social: { label: string; url: string }[];
}, slogan: string) {
  const url = siteUrl();
  const phone = settings.contactPhone?.trim();
  const sameAs = settings.social.map((s) => s.url).filter(Boolean);
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": ORG_ID(),
    name: "OVIAN",
    legalName: settings.legal?.name.value,
    slogan,
    url,
    logo: `${url}/brand/ovian-logo-green-bg.png`,
    ...(phone ? { telephone: phone } : {}),
    ...(settings.contactEmail ? { email: settings.contactEmail } : {}),
    ...(settings.legal?.taxId ? { taxID: settings.legal.taxId } : {}),
    ...(settings.legal?.address
      ? { address: { "@type": "PostalAddress", streetAddress: settings.legal.address, addressCountry: "VN" } }
      : {}),
    ...(sameAs.length ? { sameAs } : {}),
    ...(phone
      ? {
          contactPoint: {
            "@type": "ContactPoint",
            contactType: "customer support",
            telephone: phone,
            availableLanguage: ["vi"],
          },
        }
      : {}),
  };
}

/** The site itself, so an agent can name the search endpoint instead of guessing at query strings. */
export function webSiteLd(locale: Locale, name: string) {
  const url = siteUrl();
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${url}/#website`,
    url: `${url}/${locale}`,
    name,
    inLanguage: locale,
    publisher: { "@id": ORG_ID() },
    potentialAction: {
      "@type": "SearchAction",
      target: { "@type": "EntryPoint", urlTemplate: `${url}/${locale}/search?q={search_term_string}` },
      "query-input": "required name=search_term_string",
    },
  };
}

/**
 * The products on a page as an ItemList of Offers. The prices are already on screen in HTML; this
 * restates them in a form an agent can read without parsing a layout, with the currency, the
 * stock state and the page to buy from spelled out. Built from the same Product objects the page
 * renders, so the two cannot disagree.
 */
export function itemListLd(products: Product[], locale: Locale, name: string) {
  const url = siteUrl();
  const abs = (u: string) => (u.startsWith("http") ? u : `${url}${u}`);
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name,
    numberOfItems: products.length,
    itemListElement: products.map((p, i) => ({
      "@type": "ListItem",
      position: i + 1,
      item: {
        "@type": "Product",
        name: p.name.value,
        url: `${url}/${locale}/products/${p.handle}`,
        ...(p.images[0] ? { image: abs(p.images[0].url) } : {}),
        ...(p.variants[0]?.sku ? { sku: p.variants[0].sku } : {}),
        brand: { "@type": "Brand", name: "OVIAN" },
        offers: {
          "@type": "Offer",
          price: minPrice(p),
          priceCurrency: "VND",
          availability: isAvailable(p) ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
          url: `${url}/${locale}/products/${p.handle}`,
          seller: { "@id": ORG_ID() },
        },
      },
    })),
  };
}
