import type { Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { formatPrice } from "@/lib/i18n/format";

/** Order totals block shared by cart and checkout. `shipping` is a pre-formatted label or amount. */
export function TotalsList({
  locale, dict, subtotal, discount, couponCode, shipping, total,
}: {
  locale: Locale;
  dict: Pick<Dictionary, "cart">;
  subtotal: number;
  discount: number;
  couponCode?: string | null;
  shipping: number | string;
  total: number;
}) {
  return (
    <dl className="space-y-2 text-small">
      <div className="flex justify-between gap-4">
        <dt className="text-ink-muted">{dict.cart.subtotal}</dt>
        <dd data-testid="subtotal">{formatPrice(subtotal, locale)}</dd>
      </div>
      {discount > 0 ? (
        <div className="flex justify-between gap-4">
          <dt className="text-ink-muted">{dict.cart.discount}{couponCode ? ` (${couponCode})` : ""}</dt>
          <dd className="text-green" data-testid="discount">−{formatPrice(discount, locale)}</dd>
        </div>
      ) : null}
      <div className="flex justify-between gap-4">
        <dt className="text-ink-muted">{dict.cart.shipping}</dt>
        <dd data-testid="shipping">{typeof shipping === "number" ? formatPrice(shipping, locale) : shipping}</dd>
      </div>
      <div className="flex items-baseline justify-between gap-4 border-t border-line pt-3">
        <dt className="font-semibold text-ink">{dict.cart.total}</dt>
        <dd className="text-subheading text-ink" data-testid="total">{formatPrice(total, locale)}</dd>
      </div>
    </dl>
  );
}
