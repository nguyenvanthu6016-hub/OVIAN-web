import type { Locale } from "@/lib/i18n/config";

/** All internal links go through here so locale prefixes stay consistent. */
export const routes = {
  home: (l: Locale) => `/${l}`,
  products: (l: Locale) => `/${l}/products`,
  product: (l: Locale, handle: string) => `/${l}/products/${handle}`,
  space: (l: Locale, handle: string) => `/${l}/spaces/${handle}`,
  search: (l: Locale, q?: string) => `/${l}/search${q ? `?q=${encodeURIComponent(q)}` : ""}`,
  cart: (l: Locale) => `/${l}/cart`,
  checkout: (l: Locale) => `/${l}/checkout`,
  orderConfirmed: (l: Locale) => `/${l}/order/confirmed`,
  track: (l: Locale) => `/${l}/track`,
  wishlist: (l: Locale) => `/${l}/wishlist`,
  account: (l: Locale) => `/${l}/account`,
  login: (l: Locale) => `/${l}/account/login`,
  register: (l: Locale) => `/${l}/account/register`,
  about: (l: Locale) => `/${l}/about`,
  journal: (l: Locale) => `/${l}/journal`,
  post: (l: Locale, slug: string) => `/${l}/journal/${slug}`,
  contact: (l: Locale) => `/${l}/contact`,
  store: (l: Locale) => `/${l}/store`,
  faq: (l: Locale) => `/${l}/faq`,
  policy: (l: Locale, slug: "giao-hang" | "doi-tra" | "bao-mat" | "dieu-khoan") => `/${l}/policies/${slug}`,
  newArrivals: (l: Locale) => `/${l}/products?sort=newest`,
  onSale: (l: Locale) => `/${l}/products?sale=1`,
};

/** Swap the locale segment of a pathname. */
export function switchLocalePath(pathname: string, to: Locale): string {
  const parts = pathname.split("/");
  if (parts[1] === "vi" || parts[1] === "en") parts[1] = to;
  else parts.splice(1, 0, to);
  return parts.join("/") || `/${to}`;
}
