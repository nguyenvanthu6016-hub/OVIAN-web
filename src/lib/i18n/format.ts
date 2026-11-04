import { intlLocale, type Locale } from "./config";

const vndFormatters = new Map<Locale, Intl.NumberFormat>();

/** Prices are always VND. Vietnamese: "1.290.000 ₫"; English: "₫1,290,000". */
export function formatPrice(amount: number, locale: Locale): string {
  let f = vndFormatters.get(locale);
  if (!f) {
    f = new Intl.NumberFormat(intlLocale[locale], { style: "currency", currency: "VND", maximumFractionDigits: 0 });
    vndFormatters.set(locale, f);
  }
  return f.format(amount);
}

export function formatDate(iso: string, locale: Locale): string {
  return new Intl.DateTimeFormat(intlLocale[locale], { day: "numeric", month: "long", year: "numeric" }).format(new Date(iso));
}

export function formatNumber(n: number, locale: Locale): string {
  return new Intl.NumberFormat(intlLocale[locale]).format(n);
}
