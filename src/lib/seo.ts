import type { Metadata } from "next";
import type { Locale } from "@/lib/i18n/config";

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
