import { formatPrice } from "@/lib/i18n/format";
import { t, type Dictionary } from "@/lib/i18n/dictionaries";
import type { Locale } from "@/lib/i18n/config";
import { hasPromises, type ShopPromises } from "@/lib/checkout/promises";

/**
 * The three reasons to keep going, stated once at the top of every page: what delivery costs,
 * when it is free, and that the price drops again at checkout.
 *
 * Most visitors arrive from an ad straight onto a product, never see the home page, and decide
 * in a few seconds. Server-rendered with no JavaScript and no state: this sits in the same
 * document as the checkout, and anything that can throw here can take the page down — and the
 * InitiateCheckout event with it.
 */
export function PromoBar({ promises, locale, dict }: { promises: ShopPromises; locale: Locale; dict: Pick<Dictionary, "promo"> }) {
  if (!hasPromises(promises)) return null;
  const items = promiseLines(promises, locale, dict);
  if (!items.length) return null;

  return (
    <div className="bg-green text-on-green" data-testid="promo-bar">
      <p className="container-page page-x flex flex-wrap items-center justify-center gap-x-4 gap-y-0.5 py-2 text-center text-caption">
        {items.map((text, i) => (
          <span key={i} className="inline-flex items-center gap-4">
            {i > 0 ? <span aria-hidden="true" className="hidden opacity-50 sm:inline">·</span> : null}
            {text}
          </span>
        ))}
      </p>
    </div>
  );
}

/** The same three sentences the product page and the cart use, so the shop says one thing. */
export function promiseLines(p: ShopPromises, locale: Locale, dict: Pick<Dictionary, "promo">): string[] {
  const out: string[] = [];
  if (p.shipFee !== null) out.push(t(dict.promo.shipFlat, { fee: formatPrice(p.shipFee, locale) }));
  if (p.freeFromItems !== null) out.push(t(dict.promo.shipFree, { count: p.freeFromItems }));
  if (p.voucherPercent !== null) out.push(t(dict.promo.voucher, { percent: p.voucherPercent }));
  return out;
}
