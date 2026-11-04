"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { t } from "@/lib/i18n/dictionaries";
import { routes, switchLocalePath } from "@/lib/routes";
import { cartCount, cartDrawer, useCart, useWishlist } from "@/lib/client/stores";
import { Drawer } from "@/components/ui/drawer";
import { IconBag, IconChevronDown, IconChevronLeft, IconChevronRight, IconClose, IconHeart, IconMenu, IconSearch, IconUser } from "@/components/ui/icons";
import { cx } from "@/components/ui/primitives";
import { Logo } from "./logo";
import { SearchBox } from "./search-box";

export interface NavSpace {
  handle: string;
  name: string;
  lang: Locale;
  areaM2?: number;
  count: number;
  children: { handle: string; name: string; lang: Locale }[];
}

type D = Pick<Dictionary, "common" | "nav" | "search" | "cart">;

export function HeaderClient({ locale, spaces, dict }: { locale: Locale; spaces: NavSpace[]; dict: D }) {
  const pathname = usePathname();
  const [mega, setMega] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileLevel, setMobileLevel] = useState<NavSpace | null>(null);
  const cart = useCart();
  const wishlist = useWishlist();
  const count = cartCount(cart);
  const megaRef = useRef<HTMLDivElement>(null);
  const megaBtn = useRef<HTMLButtonElement>(null);

  // Close menus on navigation.
  const [prevPath, setPrevPath] = useState(pathname);
  if (prevPath !== pathname) {
    setPrevPath(pathname);
    setMega(false);
    setSearchOpen(false);
    setMobileOpen(false);
    setMobileLevel(null);
  }

  useEffect(() => {
    if (!mega) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { setMega(false); megaBtn.current?.focus(); }
    };
    const onClick = (e: MouseEvent) => {
      if (!megaRef.current?.contains(e.target as Node) && !megaBtn.current?.contains(e.target as Node)) setMega(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, [mega]);

  const other: Locale = locale === "vi" ? "en" : "vi";
  const iconBtn = "relative inline-flex size-11 items-center justify-center rounded-md text-ink transition-colors duration-150 hover:bg-surface-alt hover:text-green";
  const navLink = "inline-flex h-11 items-center rounded-md px-3 text-small font-medium text-ink transition-colors duration-150 hover:text-green";

  return (
    <>
      <div className="container-page page-x flex h-16 items-center gap-2 md:h-[4.5rem]">
        <button type="button" className={cx(iconBtn, "lg:hidden -ml-2")} aria-label={dict.nav.openMenu} aria-expanded={mobileOpen} aria-controls="mobile-nav" onClick={() => setMobileOpen(true)}>
          <IconMenu />
        </button>
        <Link href={routes.home(locale)} className="-ml-2 shrink-0 rounded-md" aria-label={`OVIAN — ${dict.common.home}`}>
          <Logo width={104} priority alt="OVIAN" />
        </Link>

        <nav aria-label={dict.common.menu} className="ml-6 hidden flex-1 items-center gap-1 lg:flex">
          <button
            ref={megaBtn}
            type="button"
            className={cx(navLink, "gap-1 cursor-pointer", mega && "text-green")}
            aria-expanded={mega}
            aria-controls="mega-menu"
            onClick={() => setMega((v) => !v)}
          >
            {dict.nav.spaces}
            <IconChevronDown size={16} className={cx("transition-transform duration-150", mega && "rotate-180")} />
          </button>
          <Link href={routes.newArrivals(locale)} className={navLink}>{dict.nav.newArrivals}</Link>
          <Link href={routes.onSale(locale)} className={navLink}>{dict.nav.onSale}</Link>
          <Link href={routes.journal(locale)} className={navLink}>{dict.nav.journal}</Link>
          <Link href={routes.about(locale)} className={navLink}>{dict.nav.about}</Link>
        </nav>

        <div className="ml-auto flex items-center gap-0.5">
          <button type="button" className={iconBtn} aria-label={dict.common.search} aria-expanded={searchOpen} aria-controls="search-panel" onClick={() => setSearchOpen((v) => !v)}>
            {searchOpen ? <IconClose /> : <IconSearch />}
          </button>
          <Link
            href={switchLocalePath(pathname, other)}
            hrefLang={other}
            lang={other}
            className="hidden h-11 items-center rounded-md px-2.5 text-caption font-semibold text-ink hover:bg-surface-alt hover:text-green sm:inline-flex"
            aria-label={`${dict.common.language}: ${dict.common.switchTo}`}
          >
            {other.toUpperCase()}
          </Link>
          <Link href={routes.wishlist(locale)} className={cx(iconBtn, "hidden sm:inline-flex")} aria-label={`${dict.common.wishlist}${wishlist.length ? ` (${wishlist.length})` : ""}`}>
            <IconHeart />
          </Link>
          <Link href={routes.account(locale)} className={cx(iconBtn, "hidden md:inline-flex")} aria-label={dict.common.account}>
            <IconUser />
          </Link>
          <button type="button" className={iconBtn} onClick={() => cartDrawer.open()} aria-label={`${dict.common.cart}, ${t(dict.common.items, { count })}`} data-testid="cart-button">
            <IconBag />
            {count > 0 ? (
              <span aria-hidden="true" className="absolute right-0.5 top-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-green px-1 text-[11px] font-semibold leading-none text-on-green">
                {count > 99 ? "99+" : count}
              </span>
            ) : null}
          </button>
        </div>
      </div>

      {/* Search panel */}
      <div id="search-panel" hidden={!searchOpen} className="border-t border-line bg-surface">
        <div className="container-page page-x py-4">
          {searchOpen ? (
            <SearchBox locale={locale} autoFocus labels={{ label: dict.search.label, placeholder: dict.search.placeholder, submit: dict.search.submit, products: dict.search.products, spaces: dict.search.spaces }} onNavigate={() => setSearchOpen(false)} />
          ) : null}
        </div>
      </div>

      {/* Desktop mega menu */}
      <div id="mega-menu" ref={megaRef} hidden={!mega} className="absolute inset-x-0 top-full z-40 border-y border-line bg-surface shadow-[0_16px_32px_-24px_rgba(31,42,34,0.35)]">
        <div className="container-page page-x grid grid-cols-6 gap-6 py-8">
          {spaces.map((s) => (
            <div key={s.handle} className="min-w-0">
              <Link href={routes.space(locale, s.handle)} lang={s.lang} className="group block rounded-sm">
                <span className="block text-subheading text-green group-hover:underline group-hover:underline-offset-4">{s.name}</span>
                {s.areaM2 ? <span className="text-caption text-ink-muted">{t("{area} m²", { area: s.areaM2 })}</span> : null}
              </Link>
              {s.children.length ? (
                <ul className="mt-3 space-y-1.5 border-t border-line pt-3">
                  {s.children.map((c) => (
                    <li key={c.handle}>
                      <Link href={routes.space(locale, c.handle)} lang={c.lang} className="text-small text-ink hover:text-green hover:underline hover:underline-offset-4">{c.name}</Link>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ))}
          <div className="col-span-6 flex items-center gap-6 border-t border-line pt-4 text-small">
            <Link href={routes.products(locale)} className="font-semibold text-green hover:underline hover:underline-offset-4">{dict.common.allProducts}</Link>
            <Link href={routes.newArrivals(locale)} className="text-ink hover:text-green">{dict.nav.newArrivals}</Link>
            <Link href={routes.onSale(locale)} className="text-ink hover:text-green">{dict.nav.onSale}</Link>
          </div>
        </div>
      </div>

      {/* Mobile multi-level drawer */}
      <Drawer id="mobile-nav" open={mobileOpen} onClose={() => { setMobileOpen(false); setMobileLevel(null); }} side="left" title={mobileLevel ? mobileLevel.name : dict.common.menu} closeLabel={dict.common.close}>
        {mobileLevel ? (
          <div className="p-2">
            <button type="button" onClick={() => setMobileLevel(null)} className="flex h-12 w-full items-center gap-2 rounded-md px-3 text-small text-ink-muted hover:bg-surface-alt">
              <IconChevronLeft size={18} /> {dict.common.back}
            </button>
            <ul>
              <li>
                <Link href={routes.space(locale, mobileLevel.handle)} className="flex h-12 items-center rounded-md px-3 font-semibold text-green hover:bg-surface-alt">
                  {t(dict.nav.allInSpace, { name: mobileLevel.name.toLowerCase() })}
                </Link>
              </li>
              {mobileLevel.children.map((c) => (
                <li key={c.handle}>
                  <Link href={routes.space(locale, c.handle)} lang={c.lang} className="flex h-12 items-center rounded-md px-3 text-ink hover:bg-surface-alt">{c.name}</Link>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="p-2">
            <p className="px-3 pb-1 pt-3 text-caption text-ink-muted">{dict.nav.spaces}</p>
            <ul>
              {spaces.map((s) => (
                <li key={s.handle}>
                  {s.children.length ? (
                    <button type="button" onClick={() => setMobileLevel(s)} className="flex h-12 w-full items-center justify-between rounded-md px-3 text-left text-ink hover:bg-surface-alt">
                      <span lang={s.lang}>{s.name}</span>
                      <IconChevronRight size={18} className="text-ink-muted" />
                    </button>
                  ) : (
                    <Link href={routes.space(locale, s.handle)} lang={s.lang} className="flex h-12 items-center rounded-md px-3 text-ink hover:bg-surface-alt">{s.name}</Link>
                  )}
                </li>
              ))}
            </ul>
            <div className="mx-3 my-3 border-t border-line" />
            <ul>
              {[
                [routes.products(locale), dict.common.allProducts],
                [routes.newArrivals(locale), dict.nav.newArrivals],
                [routes.onSale(locale), dict.nav.onSale],
                [routes.journal(locale), dict.nav.journal],
                [routes.about(locale), dict.nav.about],
                [routes.store(locale), dict.nav.store],
                [routes.wishlist(locale), dict.common.wishlist],
                [routes.account(locale), dict.common.account],
              ].map(([href, label]) => (
                <li key={href}>
                  <Link href={href!} className="flex h-12 items-center rounded-md px-3 text-ink hover:bg-surface-alt">{label}</Link>
                </li>
              ))}
              <li>
                <Link href={switchLocalePath(pathname, other)} hrefLang={other} lang={other} className="flex h-12 items-center rounded-md px-3 text-ink hover:bg-surface-alt">
                  {dict.common.switchTo}
                </Link>
              </li>
            </ul>
          </div>
        )}
      </Drawer>
    </>
  );
}
