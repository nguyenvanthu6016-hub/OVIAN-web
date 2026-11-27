import type { Metadata, Viewport } from "next";
import { Be_Vietnam_Pro } from "next/font/google";
import { notFound } from "next/navigation";
import { isLocale, locales } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { jsonLd, organizationLd, siteUrl } from "@/lib/seo";
import { SiteFooter, SiteHeader } from "@/components/layout/site-chrome";
import { FacebookPixel } from "@/components/analytics/facebook-pixel";
import { ZaloFab } from "@/components/support/zalo-support";
import { getContent } from "@/lib/cms";
import "../globals.css";

const beVietnam = Be_Vietnam_Pro({
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-be-vietnam",
});

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: LayoutProps<"/[locale]">): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const d = getDictionary(locale);
  return {
    metadataBase: new URL(siteUrl()),
    title: { default: `OVIAN — ${d.meta.slogan}`, template: "%s | OVIAN" },
    description: d.meta.defaultDescription,
    openGraph: { siteName: "OVIAN", locale: locale === "vi" ? "vi_VN" : "en_US", type: "website", images: [{ url: "/brand/ovian-logo-green-bg.png", width: 993, height: 993, alt: "OVIAN" }] },
    twitter: { card: "summary" },
    icons: { icon: "/brand/ovian-logo-green-bg.png" },
  };
}

export const viewport: Viewport = {
  themeColor: "#faf7ef",
  width: "device-width",
  initialScale: 1,
};

export default async function LocaleLayout({ children, params }: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const d = getDictionary(locale);
  // Support is a nicety; a content outage must not take the whole site down with it.
  const settings = await getContent().siteSettings(locale).catch(() => null);
  return (
    <html lang={locale} className={beVietnam.variable}>
      <body className="min-h-dvh">
        {/* OVIAN as an entity, on every page rather than only the home page: the Offer on a
            product page names its seller by @id, and that reference has to resolve wherever an
            agent happens to land. */}
        {settings ? <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(organizationLd(settings, d.meta.slogan))} /> : null}
        <a href="#main" className="sr-only z-50 rounded-md bg-green px-4 py-3 text-on-green focus:not-sr-only focus:fixed focus:left-4 focus:top-4">
          {d.common.skipToContent}
        </a>
        <SiteHeader locale={locale} />
        <main id="main" tabIndex={-1} className="outline-none">{children}</main>
        <SiteFooter locale={locale} />
        {settings?.zaloPhone ? <ZaloFab phone={settings.zaloPhone} dict={{ support: d.support }} /> : null}
        <FacebookPixel />
      </body>
    </html>
  );
}
