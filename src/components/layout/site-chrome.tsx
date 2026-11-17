import Link from "next/link";
import { getCommerce, commerceMode, type Category } from "@/lib/commerce";
import { getContent } from "@/lib/cms";
import type { Locale } from "@/lib/i18n/config";
import { getDictionary, t } from "@/lib/i18n/dictionaries";
import { routes } from "@/lib/routes";
import { CartDrawer } from "@/components/cart/cart-drawer";
import { HeaderClient, type NavSections, type NavSpace } from "./header-client";
import { Logo } from "./logo";

export function buildSpaces(categories: Category[]): NavSpace[] {
  return categories
    // An empty room would lead to a page with nothing on it; it comes back as soon as it has a product.
    .filter((c) => !c.parentId && c.productCount > 0)
    .map((c) => ({
      handle: c.handle,
      name: c.name.value,
      lang: c.name.lang,
      areaM2: c.areaM2,
      count: c.productCount,
      children: categories.filter((x) => x.parentId === c.id).map((x) => ({ handle: x.handle, name: x.name.value, lang: x.name.lang })),
    }));
}

/** Nav must render even if the commerce backend is down — fall back to an empty list, never fake data. */
export async function getSpacesSafe(locale: Locale): Promise<NavSpace[]> {
  try {
    return buildSpaces(await getCommerce().listCategories(locale));
  } catch {
    return [];
  }
}

/** Sections the site offers right now; a failed content read hides the optional ones. */
async function navSections(locale: Locale): Promise<NavSections> {
  const settings = await getContent().siteSettings(locale).catch(() => null);
  return { journal: !!settings?.showJournal, store: !!settings?.store };
}

export async function SiteHeader({ locale }: { locale: Locale }) {
  const dict = getDictionary(locale);
  const [spaces, sections] = await Promise.all([getSpacesSafe(locale), navSections(locale)]);
  return (
    <>
      {commerceMode() === "mock" ? (
        <div className="bg-surface-alt text-caption text-green">
          <p className="container-page page-x py-1.5">{dict.common.mockNotice}</p>
        </div>
      ) : null}
      <header className="sticky top-0 z-30 border-b border-line bg-surface/95 backdrop-blur-sm">
        <div className="relative">
          <HeaderClient locale={locale} spaces={spaces} dict={{ common: dict.common, nav: dict.nav, search: dict.search, cart: dict.cart }} sections={sections} />
        </div>
      </header>
      <CartDrawer locale={locale} dict={{ cart: dict.cart, product: dict.product, common: dict.common }} />
    </>
  );
}

export async function SiteFooter({ locale }: { locale: Locale }) {
  const dict = getDictionary(locale);
  const [spaces, settings] = await Promise.all([getSpacesSafe(locale), getContent().siteSettings(locale).catch(() => null)]);
  const col = "space-y-2.5 text-small";
  const link = "text-on-green/85 hover:text-on-green hover:underline underline-offset-4";
  return (
    <footer className="mt-24 bg-green text-on-green">
      <div className="container-page page-x grid gap-10 py-14 md:grid-cols-12">
        <div className="md:col-span-4">
          <Logo variant="yellow" width={120} alt="OVIAN" />
          <p className="mt-3 max-w-xs text-body text-yellow">{dict.meta.slogan}</p>
          <p className="mt-4 max-w-xs text-small text-on-green/80">{dict.footer.payment}</p>
          {settings?.contactPhone ? (
            <p className="mt-4 text-small">
              <a href={`tel:${settings.contactPhone.replace(/\s/g, "")}`} className={link}>{dict.pages.phone}: {settings.contactPhone}</a>
              {settings.zaloPhone ? (
                <>
                  {" · "}
                  <a href={`https://zalo.me/${settings.zaloPhone.replace(/\D/g, "")}`} rel="noopener noreferrer" className={link}>Zalo</a>
                </>
              ) : null}
            </p>
          ) : null}
        </div>
        <nav aria-label={dict.footer.shop} className="md:col-span-3">
          <h2 className="mb-3 text-small font-semibold text-on-green">{dict.footer.shop}</h2>
          <ul className={col}>
            {spaces.map((s) => (
              <li key={s.handle}><Link href={routes.space(locale, s.handle)} className={link} lang={s.lang}>{s.name}</Link></li>
            ))}
            <li><Link href={routes.products(locale)} className={link}>{dict.common.allProducts}</Link></li>
          </ul>
        </nav>
        <nav aria-label={dict.footer.help} className="md:col-span-3">
          <h2 className="mb-3 text-small font-semibold text-on-green">{dict.footer.help}</h2>
          <ul className={col}>
            <li><Link href={routes.track(locale)} className={link}>{dict.footer.trackOrder}</Link></li>
            <li><Link href={routes.policy(locale, "giao-hang")} className={link}>{dict.footer.shippingPolicy}</Link></li>
            <li><Link href={routes.policy(locale, "doi-tra")} className={link}>{dict.footer.returnPolicy}</Link></li>
            <li><Link href={routes.faq(locale)} className={link}>{dict.footer.faq}</Link></li>
          </ul>
        </nav>
        <nav aria-label={dict.footer.company} className="md:col-span-2">
          <h2 className="mb-3 text-small font-semibold text-on-green">{dict.footer.company}</h2>
          <ul className={col}>
            <li><Link href={routes.about(locale)} className={link}>{dict.footer.about}</Link></li>
            {settings?.showJournal ? <li><Link href={routes.journal(locale)} className={link}>{dict.footer.journal}</Link></li> : null}
            {settings?.store ? <li><Link href={routes.store(locale)} className={link}>{dict.footer.stores}</Link></li> : null}
            <li><Link href={routes.contact(locale)} className={link}>{dict.footer.contact}</Link></li>
          </ul>
        </nav>
      </div>
      <div className="border-t border-on-green/15">
        <div className="container-page page-x flex flex-wrap items-center justify-between gap-3 py-5 text-caption text-on-green/75">
          <div>
            <p>{t(dict.footer.rights, { year: new Date().getFullYear() })}</p>
            {settings?.legal ? (
              <p className="mt-1" lang={settings.legal.name.lang}>
                {[settings.legal.name.value, settings.legal.address, settings.legal.taxId && `${dict.footer.taxId}: ${settings.legal.taxId}`].filter(Boolean).join(" · ")}
              </p>
            ) : null}
          </div>
          <ul className="flex flex-wrap gap-4">
            <li><Link href={routes.policy(locale, "bao-mat")} className={link}>{dict.footer.privacy}</Link></li>
            <li><Link href={routes.policy(locale, "dieu-khoan")} className={link}>{dict.footer.terms}</Link></li>
            {settings?.social.map((s) => <li key={s.url}><a href={s.url} rel="noopener noreferrer" className={link}>{s.label}</a></li>)}
          </ul>
        </div>
      </div>
    </footer>
  );
}
