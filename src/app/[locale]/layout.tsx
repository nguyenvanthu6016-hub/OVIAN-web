import type { Metadata, Viewport } from "next";
import { Be_Vietnam_Pro } from "next/font/google";
import { notFound } from "next/navigation";
import { isLocale, locales } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { siteUrl } from "@/lib/seo";
import { SiteFooter, SiteHeader } from "@/components/layout/site-chrome";
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
  return (
    <html lang={locale} className={beVietnam.variable}>
      <body className="min-h-dvh">
        <a href="#main" className="sr-only z-50 rounded-md bg-green px-4 py-3 text-on-green focus:not-sr-only focus:fixed focus:left-4 focus:top-4">
          {d.common.skipToContent}
        </a>
        <SiteHeader locale={locale} />
        <main id="main" tabIndex={-1} className="outline-none">{children}</main>
        <SiteFooter locale={locale} />
      </body>
    </html>
  );
}
