"use client";

import { useEffect, useState } from "react";
import type { Quote } from "@/lib/checkout/pricing";
import type { Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { t } from "@/lib/i18n/dictionaries";
import { routes } from "@/lib/routes";
import { cartActions, cartSubtotal, useCart } from "@/lib/client/stores";
import { describeChange, fetchQuote } from "@/lib/client/quote";
import { useHydrated } from "@/lib/client/use-hydrated";
import { Button, ButtonLink, EmptyState, Notice, cx, inputClass } from "@/components/ui/primitives";
import { CartLines } from "./cart-lines";
import { TotalsList } from "./summary";

type D = Pick<Dictionary, "cart" | "product" | "checkout" | "errors" | "common">;

export function CartPageClient({ locale, dict }: { locale: Locale; dict: D }) {
  const cart = useCart();
  const hydrated = useHydrated();
  const [quote, setQuote] = useState<Quote | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [couponMsg, setCouponMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const linesKey = cart.lines.map((l) => `${l.variantId}:${l.quantity}:${l.price}`).join("|");

  // Re-price on the server whenever the cart changes (stock/price freshness).
  useEffect(() => {
    if (!cart.lines.length) return;
    const ctrl = new AbortController();
    fetchQuote({ lines: cart.lines, couponCode: cart.couponCode, fulfillment: "pickup" }, ctrl.signal)
      .then((r) => {
        if (!r.ok) return setError(r.error === "unavailable" ? dict.errors.unavailableBody : dict.errors.genericBody);
        setError(null);
        setQuote(r.quote);
        const couponIssue = r.quote.changes.find((c) => c.kind === "coupon");
        if (couponIssue) {
          setCouponMsg({ ok: false, text: describeChange(couponIssue, locale, dict) });
          cartActions.setCoupon(null);
        }
      })
      .catch(() => undefined);
    return () => ctrl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [linesKey, cart.couponCode, locale]);

  if (!hydrated) return <div className="h-64" aria-busy="true" />;

  if (!cart.lines.length) {
    return <EmptyState title={dict.cart.empty} body={dict.cart.emptyHint} action={<ButtonLink href={routes.products(locale)}>{dict.cart.continue}</ButtonLink>} />;
  }

  const lineChanges = quote?.changes.filter((c) => c.kind !== "coupon") ?? [];
  const applyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    const c = code.trim().toUpperCase();
    if (!c) return;
    const r = await fetchQuote({ lines: cart.lines, couponCode: c, fulfillment: "pickup" });
    if (!r.ok) return setCouponMsg({ ok: false, text: dict.errors.genericBody });
    const issue = r.quote.changes.find((x) => x.kind === "coupon");
    if (issue) setCouponMsg({ ok: false, text: describeChange(issue, locale, dict) });
    else {
      cartActions.setCoupon(c);
      setCouponMsg({ ok: true, text: t(dict.cart.couponApplied, { code: c }) });
      setCode("");
    }
  };

  return (
    <div className="grid gap-10 lg:grid-cols-12 lg:gap-12">
      <div className="lg:col-span-7">
        {lineChanges.length ? (
          <Notice title={dict.checkout.changesTitle} className="mb-4">
            <ul className="list-disc space-y-1 pl-5">{lineChanges.map((c, i) => <li key={i}>{describeChange(c, locale, dict)}</li>)}</ul>
            <Button size="sm" variant="secondary" className="mt-3" onClick={() => quote && cartActions.reconcile(quote.lines)}>{dict.checkout.confirmChanges}</Button>
          </Notice>
        ) : null}
        <div className="border-t border-line">
          <CartLines lines={cart.lines} locale={locale} dict={dict} />
        </div>
        <ButtonLink href={routes.products(locale)} variant="ghost" className="mt-4 -ml-3">{dict.cart.continue}</ButtonLink>
      </div>

      <aside className="lg:col-span-5" aria-labelledby="summary-title">
        <div className="rounded-lg bg-surface-alt p-5 md:p-6 lg:sticky lg:top-24">
          <h2 id="summary-title" className="mb-4 text-subheading">{dict.cart.summary}</h2>

          <form onSubmit={applyCoupon} className="mb-5">
            <label htmlFor="coupon" className="mb-1.5 block text-small font-medium">{dict.cart.coupon}</label>
            {cart.couponCode ? (
              <div className="flex items-center justify-between rounded-sm border border-green bg-paper px-3 py-2.5 text-small">
                <span className="font-semibold text-green">{cart.couponCode}</span>
                <button type="button" className="text-caption text-ink-muted underline underline-offset-4 cursor-pointer" onClick={() => { cartActions.setCoupon(null); setCouponMsg(null); }}>{dict.cart.removeCoupon}</button>
              </div>
            ) : (
              <div className="flex gap-2">
                <input id="coupon" value={code} onChange={(e) => setCode(e.target.value)} placeholder={dict.cart.couponPlaceholder} className={cx(inputClass, "uppercase")} autoComplete="off" aria-describedby={couponMsg ? "coupon-msg" : undefined} />
                <Button type="submit" variant="secondary" className="h-12 shrink-0">{dict.cart.applyCoupon}</Button>
              </div>
            )}
            {couponMsg ? <p id="coupon-msg" role="status" className={cx("mt-2 text-caption", couponMsg.ok ? "text-green" : "text-danger")}>{couponMsg.text}</p> : null}
          </form>

          <TotalsList
            locale={locale}
            dict={dict}
            subtotal={quote?.subtotal ?? cartSubtotal(cart)}
            discount={quote?.discount ?? 0}
            couponCode={quote?.coupon?.code}
            shipping={dict.cart.shippingAtCheckout}
            total={quote ? quote.subtotal - quote.discount : cartSubtotal(cart)}
          />
          {error ? <Notice tone="error" className="mt-4">{error}</Notice> : null}
          <ButtonLink href={routes.checkout(locale)} size="lg" className="mt-5 w-full" aria-disabled={!!error}>{dict.cart.checkout}</ButtonLink>
          <p className="mt-3 text-caption text-ink-muted">{dict.checkout.paymentNote}</p>
        </div>
      </aside>
    </div>
  );
}
