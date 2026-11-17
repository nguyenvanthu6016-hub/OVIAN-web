import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getContent } from "@/lib/cms";
import { isLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { routes } from "@/lib/routes";
import { localizedAlternates } from "@/lib/seo";
import { StoreCard } from "@/components/content/store-card";

export const revalidate = 600;

export async function generateMetadata({ params }: PageProps<"/[locale]/contact">): Promise<Metadata> {
  const { locale } = await params;
  return isLocale(locale) ? { title: getDictionary(locale).pages.contactTitle, ...localizedAlternates(locale, "/contact") } : {};
}

export default async function ContactPage({ params }: PageProps<"/[locale]/contact">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const d = getDictionary(locale);
  const settings = await getContent().siteSettings(locale).catch(() => null);
  return (
    <div className="container-page page-x pb-8 pt-8">
      <h1 className="mb-8 text-display">{d.pages.contactTitle}</h1>
      <div className="grid gap-10 lg:grid-cols-12">
        <div className="space-y-4 lg:col-span-5">
          {settings?.contactPhone || settings?.contactEmail ? (
            <dl className="grid grid-cols-[6rem_1fr] gap-3 text-small">
              {settings.contactPhone ? <><dt className="text-ink-muted">{d.pages.phone}</dt><dd><a className="text-green underline underline-offset-4" href={`tel:${settings.contactPhone.replace(/\s/g, "")}`}>{settings.contactPhone}</a></dd></> : null}
              {settings.contactEmail ? <><dt className="text-ink-muted">{d.pages.email}</dt><dd><a className="text-green underline underline-offset-4" href={`mailto:${settings.contactEmail}`}>{settings.contactEmail}</a></dd></> : null}
            </dl>
          ) : (
            <p className="text-ink-muted">{d.pages.contentMissing}</p>
          )}
          {settings?.zaloPhone || settings?.social.length ? (
            <p className="flex flex-wrap gap-x-5 gap-y-2 text-small">
              {settings.zaloPhone ? (
                <a href={`https://zalo.me/${settings.zaloPhone.replace(/\D/g, "")}`} rel="noopener noreferrer" className="font-semibold text-green underline underline-offset-4">Zalo</a>
              ) : null}
              {settings.social.map((s) => (
                <a key={s.url} href={s.url} rel="noopener noreferrer" className="font-semibold text-green underline underline-offset-4">{s.label}</a>
              ))}
            </p>
          ) : null}
          <p className="flex flex-wrap gap-x-5 gap-y-2 text-small">
            <Link href={routes.track(locale)} className="font-semibold text-green underline underline-offset-4">{d.order.track}</Link>
            <Link href={routes.faq(locale)} className="font-semibold text-green underline underline-offset-4">{d.footer.faq}</Link>
          </p>
        </div>
        <div className="lg:col-span-7"><StoreCard store={settings?.store ?? null} dict={d} /></div>
      </div>
    </div>
  );
}
