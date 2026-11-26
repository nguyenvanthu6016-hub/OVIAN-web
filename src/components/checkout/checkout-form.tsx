"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { Quote } from "@/lib/checkout/pricing";
import type { PublicOrderConfirmation } from "@/lib/checkout/place-order";
import { provinces } from "@/lib/checkout/provinces";
import type { StoreInfo } from "@/lib/cms/types";
import type { Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { t } from "@/lib/i18n/dictionaries";
import { formatPrice } from "@/lib/i18n/format";
import { routes } from "@/lib/routes";
import { cartActions, useCart } from "@/lib/client/stores";
import { describeChange, fetchQuote, fetchUpsellOffer } from "@/lib/client/quote";
import type { AcceptedUpsell, UpsellOffer } from "@/lib/checkout/upsell-offer";
import { useHydrated } from "@/lib/client/use-hydrated";
import { track, trackOnce } from "@/lib/analytics/pixel";
import { TotalsList } from "@/components/cart/summary";
import { IconStore, IconTruck } from "@/components/ui/icons";
import { Button, ButtonLink, EmptyState, Field, Notice, cx, inputClass } from "@/components/ui/primitives";

type D = Pick<Dictionary, "checkout" | "cart" | "errors" | "common" | "order">;

const CHECKOUT_KEY = "ovian.checkoutId";
export const LAST_ORDER_KEY = "ovian.lastOrder";

function getCheckoutId(): string {
  try {
    const existing = sessionStorage.getItem(CHECKOUT_KEY);
    if (existing) return existing;
    const id = crypto.randomUUID();
    sessionStorage.setItem(CHECKOUT_KEY, id);
    return id;
  } catch {
    return crypto.randomUUID();
  }
}

const DRAFT_KEY = "ovian.checkoutDraft";
interface Draft { fullName: string; phone: string; email: string; fulfillment: "delivery" | "pickup"; provinceCode: string; ward: string; street: string; note: string }
const emptyDraft: Draft = { fullName: "", phone: "", email: "", fulfillment: "delivery", provinceCode: "", ward: "", street: "", note: "" };

type Status =
  | { kind: "idle" }
  | { kind: "submitting" }
  | { kind: "unknown" }
  | { kind: "processing" }
  | { kind: "error"; message: string };

export function CheckoutForm({ locale, dict, store, ordersEnabled, pickupEnabled, sampleShipping, orderToken }: { locale: Locale; dict: D; store: StoreInfo | null; ordersEnabled: boolean; pickupEnabled: boolean; sampleShipping: boolean; orderToken: string }) {
  const router = useRouter();
  const cart = useCart();
  const hydrated = useHydrated();
  // Restore an unsent draft (nothing leaves the browser until the customer confirms).
  const [f, setF] = useState<Draft>(() => {
    if (typeof window === "undefined") return emptyDraft;
    try {
      const raw = sessionStorage.getItem(DRAFT_KEY);
      const draft = raw ? { ...emptyDraft, ...(JSON.parse(raw) as Partial<Draft>) } : emptyDraft;
      // A draft saved while pickup was offered must not keep a method that no longer exists.
      return pickupEnabled ? draft : { ...draft, fulfillment: "delivery" };
    } catch {
      return emptyDraft;
    }
  });
  const [errors, setErrors] = useState<Partial<Record<keyof Draft, string>>>({});
  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [offer, setOffer] = useState<UpsellOffer | null>(null);
  const [upsellTaken, setUpsellTaken] = useState(false);
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const inFlight = useRef(false);
  // Anti-spam honeypot: hidden from people, so anything in here came from a script.
  const honeypot = useRef<HTMLInputElement>(null);
  const errorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!hydrated) return;
    try { sessionStorage.setItem(DRAFT_KEY, JSON.stringify(f)); } catch { /* ignore */ }
  }, [f, hydrated]);

  const linesKey = cart.lines.map((l) => `${l.variantId}:${l.quantity}:${l.price}`).join("|");
  const province = f.fulfillment === "delivery" ? f.provinceCode : "";

  // "Reached checkout with a cart", reported once per visit to this page.
  const reportedCheckout = useRef(false);
  useEffect(() => {
    if (!hydrated || reportedCheckout.current || !cart.lines.length) return;
    reportedCheckout.current = true;
    track("InitiateCheckout", {
      value: cart.lines.reduce((s, l) => s + l.price * l.quantity, 0),
      currency: "VND",
      content_ids: cart.lines.map((l) => l.variantId),
      content_type: "product",
      num_items: cart.lines.reduce((s, l) => s + l.quantity, 0),
    });
  }, [hydrated, cart.lines]);

  const acceptedUpsell: AcceptedUpsell | null =
    upsellTaken && offer
      ? { variantId: offer.variantId, quantity: offer.quantity, issuedAt: offer.issuedAt, signature: offer.signature }
      : null;

  // Asked for once per visit. The offer is tied to the checkout id, so it does not change under
  // the customer while they fill the form.
  const offerAsked = useRef(false);
  useEffect(() => {
    if (!hydrated || offerAsked.current || !cart.lines.length) return;
    offerAsked.current = true;
    let alive = true;
    fetchUpsellOffer({ checkoutId: getCheckoutId(), locale, lines: cart.lines })
      .then((o) => { if (alive) setOffer(o); })
      .catch(() => undefined);
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, linesKey, locale]);

  useEffect(() => {
    if (!cart.lines.length) return;
    const ctrl = new AbortController();
    fetchQuote({ lines: cart.lines, couponCode: cart.couponCode, fulfillment: f.fulfillment, provinceCode: province || null, upsell: acceptedUpsell }, ctrl.signal)
      .then((r) => {
        if (r.ok) { setQuote(r.quote); setQuoteError(null); }
        else setQuoteError(r.error === "unavailable" || r.error === "network" ? dict.checkout.errorUnavailable : dict.errors.genericBody);
      })
      .catch(() => undefined);
    return () => ctrl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [linesKey, cart.couponCode, f.fulfillment, province, upsellTaken, offer?.variantId]);

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => {
    setF((p) => ({ ...p, [k]: v }));
    if (errors[k]) setErrors((e) => ({ ...e, [k]: undefined }));
  };

  if (!hydrated) return <div className="h-96" aria-busy="true" />;
  if (!cart.lines.length && status.kind !== "submitting") {
    return <EmptyState title={dict.cart.empty} body={dict.cart.emptyHint} action={<ButtonLink href={routes.products(locale)}>{dict.cart.continue}</ButtonLink>} />;
  }

  const validate = (): boolean => {
    const e: typeof errors = {};
    const req = (k: keyof Draft, label: string) => { if (!f[k].trim()) e[k] = t(dict.checkout.fieldRequired, { field: label.toLowerCase() }); };
    req("fullName", dict.checkout.fullName);
    const phone = f.phone.replace(/[\s.-]/g, "").replace(/^\+?84/, "0");
    if (!/^0\d{9}$/.test(phone)) e.phone = dict.checkout.fieldPhone;
    if (f.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim())) e.email = dict.checkout.fieldEmail;
    if (f.fulfillment === "delivery") {
      if (!f.provinceCode) e.provinceCode = t(dict.checkout.fieldRequired, { field: dict.checkout.province.toLowerCase() });
      req("ward", dict.checkout.ward);
      req("street", dict.checkout.street);
      if (f.street.trim() && f.street.trim().length < 3) e.street = t(dict.checkout.fieldRequired, { field: dict.checkout.street.toLowerCase() });
    }
    setErrors(e);
    const first = Object.keys(e)[0];
    if (first) document.getElementById(`co-${first}`)?.focus();
    return !first;
  };

  const finish = (order: PublicOrderConfirmation) => {
    // Reported once per order number: the same order comes back here when "Kiểm tra lại" finds an
    // order that was already created. The order number is also the event id, so a Conversions API
    // copy of this event is not counted twice either.
    trackOnce(
      "Purchase",
      {
        value: order.total,
        currency: "VND",
        content_ids: order.lines.map((l) => l.variantId),
        content_type: "product",
        num_items: order.lines.reduce((s, l) => s + l.quantity, 0),
      },
      order.ref,
    );
    try {
      sessionStorage.setItem(LAST_ORDER_KEY, JSON.stringify(order));
      sessionStorage.removeItem(CHECKOUT_KEY);
      sessionStorage.removeItem(DRAFT_KEY);
    } catch { /* ignore */ }
    cartActions.clear();
    router.push(routes.orderConfirmed(locale));
  };

  const showError = (message: string) => {
    setStatus({ kind: "error", message });
    setTimeout(() => errorRef.current?.focus(), 0);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (inFlight.current) return; // double-click guard (server idempotency is the real protection)
    if (!validate() || !quote) return;
    if (quote.changes.length) return showError(dict.checkout.changesBody);
    if (!quote.orderable) return showError(dict.checkout.shippingUnavailable);
    inFlight.current = true;
    setStatus({ kind: "submitting" });
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          checkoutId: getCheckoutId(),
          locale,
          lines: cart.lines.map((l) => ({ variantId: l.variantId, quantity: l.quantity, seenPrice: l.price })),
          couponCode: cart.couponCode,
          upsell: acceptedUpsell,
          fulfillment: f.fulfillment,
          customer: { fullName: f.fullName, phone: f.phone, email: f.email },
          address: f.fulfillment === "delivery" ? { provinceCode: f.provinceCode, ward: f.ward, street: f.street } : null,
          note: f.note || undefined,
          confirmedTotal: quote.total,
          token: orderToken,
          website: honeypot.current?.value || undefined,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { status?: string; order?: PublicOrderConfirmation; quote?: Quote; error?: string };
      if (res.status === 201 && data.order) return finish(data.order);
      if (res.status === 202) { setStatus({ kind: data.status === "processing" ? "processing" : "unknown" }); return; }
      if (res.status === 409 && data.quote) { setQuote(data.quote); return showError(dict.checkout.changesBody); }
      if (res.status === 422 && data.quote) { setQuote(data.quote); return showError(dict.checkout.shippingUnavailable); }
      if (res.status === 429) return showError(data.status === "blocked" ? dict.checkout.errorBlocked : dict.checkout.errorRateLimited);
      if (res.status === 400 && data.status === "refused") return showError(data.error === "too-large" ? dict.checkout.errorTooLarge : dict.checkout.errorRefused);
      if (res.status === 400) return showError(dict.checkout.errorValidation);
      if (data.status === "disabled") return showError(dict.checkout.liveOrdersDisabled);
      return showError(dict.checkout.errorUnavailable);
    } catch {
      // Network failure: the order may or may not exist. Same checkoutId makes the retry safe.
      setStatus({ kind: "unknown" });
    } finally {
      inFlight.current = false;
    }
  };

  /**
   * Re-sends the SAME request with the SAME checkoutId. The server reconciles first (finds the order
   * if it was created) and only re-attempts creation after the grace period — never a duplicate.
   */
  const checkAgain = () => submit({ preventDefault() {} } as React.FormEvent);

  const busy = status.kind === "submitting" || status.kind === "processing";
  const locked = busy || status.kind === "unknown";
  const ship = quote?.shipping;
  const originalByVariant = new Map(quote?.lines.map((l) => [l.variantId, l.compareAtPrice]) ?? []);
  // The server decides whether the offer actually applied; the button only records the intent.
  const upsellLine = quote?.lines.find((l) => l.upsell) ?? null;
  const shippingLabel: string | number =
    f.fulfillment === "pickup" ? dict.checkout.shippingFree
      : !ship || ship.status === "needs-province" ? dict.checkout.shippingChooseProvince
      : ship.status === "unavailable" ? "—"
      : ship.status === "ok" && ship.fee === 0 ? dict.checkout.shippingFree
      : ship.status === "ok" ? ship.fee : "—";

  const step = "rounded-lg border border-line bg-paper p-5 md:p-6";
  const stepTitle = "mb-5 flex items-center gap-3 text-subheading";
  const num = "inline-flex size-7 items-center justify-center rounded-full bg-green text-caption font-semibold text-on-green";

  return (
    <form onSubmit={submit} noValidate className="grid gap-10 lg:grid-cols-12 lg:gap-12" aria-busy={busy}>
      {/* Honeypot. Kept out of the accessibility tree and off the keyboard path, so only a script fills it. */}
      <div aria-hidden="true" className="pointer-events-none absolute left-[-9999px] top-0 h-0 w-0 overflow-hidden">
        <label htmlFor="co-website">Website</label>
        <input id="co-website" ref={honeypot} type="text" name="website" tabIndex={-1} autoComplete="off" defaultValue="" />
      </div>
      <input type="hidden" name="t" value={orderToken} data-testid="order-token" readOnly />
      <div className="min-w-0 space-y-6 lg:col-span-7">
        {!ordersEnabled ? <Notice tone="error">{dict.checkout.liveOrdersDisabled}</Notice> : null}

        <fieldset className={step} disabled={locked}>
          <legend className="sr-only">{dict.checkout.stepContact}</legend>
          <h2 className={stepTitle} aria-hidden="true"><span className={num}>1</span>{dict.checkout.stepContact}</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <Field id="co-fullName" label={dict.checkout.fullName} error={errors.fullName}>
                <input id="co-fullName" className={inputClass} autoComplete="name" value={f.fullName} onChange={(e) => set("fullName", e.target.value)} aria-invalid={!!errors.fullName} aria-describedby={errors.fullName ? "co-fullName-error" : undefined} required maxLength={80} />
              </Field>
            </div>
            <Field id="co-phone" label={dict.checkout.phone} hint={dict.checkout.phoneHint} error={errors.phone}>
              <input id="co-phone" className={inputClass} type="tel" inputMode="tel" autoComplete="tel" value={f.phone} onChange={(e) => set("phone", e.target.value)} aria-invalid={!!errors.phone} aria-describedby={errors.phone ? "co-phone-error" : "co-phone-hint"} required maxLength={15} />
            </Field>
            <Field id="co-email" label={dict.checkout.email} optionalLabel={dict.common.optional} error={errors.email}>
              <input id="co-email" className={inputClass} type="email" autoComplete="email" value={f.email} onChange={(e) => set("email", e.target.value)} aria-invalid={!!errors.email} aria-describedby={errors.email ? "co-email-error" : undefined} maxLength={120} />
            </Field>
          </div>
        </fieldset>

        <fieldset className={step} disabled={locked}>
          <legend className="sr-only">{pickupEnabled ? dict.checkout.stepFulfillment : dict.checkout.stepDelivery}</legend>
          <h2 className={stepTitle} aria-hidden="true"><span className={num}>2</span>{pickupEnabled ? dict.checkout.stepFulfillment : dict.checkout.stepDelivery}</h2>
          {pickupEnabled ? (
            <div role="radiogroup" aria-label={dict.checkout.stepFulfillment} className="grid gap-3 sm:grid-cols-2">
              {([
                ["delivery", dict.checkout.delivery, dict.checkout.deliveryDesc, IconTruck],
                ["pickup", dict.checkout.pickup, dict.checkout.pickupDesc, IconStore],
              ] as const).map(([value, label, desc, Icon]) => (
                <label key={value} className={cx("flex cursor-pointer gap-3 rounded-md border p-4 transition-colors duration-150", f.fulfillment === value ? "border-green bg-surface-alt" : "border-line-strong hover:border-green")}>
                  <input type="radio" name="fulfillment" value={value} checked={f.fulfillment === value} onChange={() => set("fulfillment", value)} className="mt-1 size-5 accent-green" data-testid={`fulfillment-${value}`} />
                  <span>
                    <span className="flex items-center gap-2 font-semibold text-ink"><Icon size={20} className="text-green" />{label}</span>
                    <span className="mt-1 block text-caption text-ink-muted">{desc}</span>
                  </span>
                </label>
              ))}
            </div>
          ) : (
            <p className="flex items-center gap-2 rounded-md border border-green bg-surface-alt p-4 font-semibold text-ink" data-testid="fulfillment-delivery-only">
              <IconTruck size={20} className="text-green" />
              {dict.checkout.delivery}
              <span className="font-normal text-ink-muted">· {dict.checkout.deliveryDesc}</span>
            </p>
          )}

          {f.fulfillment === "delivery" ? (
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <Field id="co-provinceCode" label={dict.checkout.province} error={errors.provinceCode}>
                  <select id="co-provinceCode" className={inputClass} value={f.provinceCode} onChange={(e) => set("provinceCode", e.target.value)} aria-invalid={!!errors.provinceCode} autoComplete="address-level1">
                    <option value="">{dict.checkout.provincePlaceholder}</option>
                    {provinces.map((p) => <option key={p.code} value={p.code}>{p.name}</option>)}
                  </select>
                </Field>
              </div>
              <Field id="co-ward" label={dict.checkout.ward} error={errors.ward}>
                <input id="co-ward" className={inputClass} value={f.ward} onChange={(e) => set("ward", e.target.value)} aria-invalid={!!errors.ward} autoComplete="address-level3" maxLength={80} />
              </Field>
              <Field id="co-street" label={dict.checkout.street} error={errors.street}>
                <input id="co-street" className={inputClass} value={f.street} onChange={(e) => set("street", e.target.value)} aria-invalid={!!errors.street} autoComplete="address-line1" maxLength={160} />
              </Field>
              {ship?.status === "unavailable" ? <Notice tone="error" className="md:col-span-2">{pickupEnabled ? dict.checkout.shippingUnavailable : dict.checkout.shippingUnavailableNoPickup}</Notice> : null}
              {sampleShipping ? <p className="text-caption text-ink-muted md:col-span-2">{dict.common.mockBadge}: {dict.checkout.shippingFee}</p> : null}
            </div>
          ) : (
            <div className="mt-6 rounded-md bg-surface-alt p-4 text-small">
              <p className="font-semibold text-ink">{dict.checkout.pickupStore}</p>
              {store ? (
                <div className="mt-2 space-y-1">
                  <p lang={store.name.lang} className="text-green">{store.name.value}</p>
                  <p>{store.address}</p>
                  {store.phone ? <p>{store.phone}</p> : null}
                  {store.hours.length ? <p className="text-ink-muted">{dict.checkout.hours}: {store.hours.map((h) => h.value).join("; ")}</p> : null}
                </div>
              ) : (
                <p className="mt-2 text-ink-muted">{dict.checkout.storeInfoMissing}</p>
              )}
            </div>
          )}

          <div className="mt-6">
            <Field id="co-note" label={dict.checkout.note} optionalLabel={dict.common.optional}>
              <textarea id="co-note" rows={3} className={cx(inputClass, "h-auto py-3")} value={f.note} onChange={(e) => set("note", e.target.value)} maxLength={500} />
            </Field>
          </div>
        </fieldset>

        <section className={step} aria-labelledby="pay-title">
          <h2 id="pay-title" className={stepTitle}><span className={num} aria-hidden="true">3</span>{dict.checkout.payment}</h2>
          <p className="flex items-center gap-3 rounded-md border border-green bg-surface-alt p-4 font-semibold text-ink" data-testid="payment-method">
            {f.fulfillment === "pickup" ? dict.checkout.paymentStore : dict.checkout.paymentCod}
          </p>
          <p className="mt-3 text-caption text-ink-muted">{dict.checkout.paymentNote}</p>
        </section>
      </div>

      <aside className="min-w-0 lg:col-span-5" aria-labelledby="co-summary">
        <div className="space-y-5 rounded-lg bg-surface-alt p-5 md:p-6 lg:sticky lg:top-24">
          <div className="flex items-baseline justify-between">
            <h2 id="co-summary" className="text-subheading">{dict.checkout.summary}</h2>
            <Link href={routes.cart(locale)} className="text-caption font-semibold text-green underline underline-offset-4">{dict.checkout.edit}</Link>
          </div>
          <ul className="space-y-3">
            {cart.lines.map((l) => (
              <li key={l.variantId} className="flex min-w-0 gap-3 text-small">
                {l.image ? <Image src={l.image} alt="" width={56} height={56} unoptimized={l.image.endsWith(".svg")} className="size-14 shrink-0 rounded-sm object-cover" /> : null}
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{l.name}</span>
                  <span className="text-caption text-ink-muted">{[l.variantTitle, `× ${l.quantity}`].filter(Boolean).join(" ")}</span>
                </span>
                <SummaryLinePrice price={l.price} compareAt={originalByVariant.get(l.variantId) ?? l.compareAt} quantity={l.quantity} locale={locale} dict={dict} />
              </li>
            ))}
            {upsellLine ? (
              <li className="flex min-w-0 gap-3 rounded-sm bg-surface p-2 text-small" data-testid="upsell-line">
                {offer?.image ? (
                  <Image src={offer.image.url} alt="" width={56} height={56} unoptimized={offer.image.url.endsWith(".svg")} className="size-14 shrink-0 rounded-sm object-cover" />
                ) : null}
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{upsellLine.name}</span>
                  <span className="block text-caption text-green">{[dict.checkout.upsellBadge, `× ${upsellLine.quantity}`].join(" · ")}</span>
                  <button type="button" className="mt-0.5 text-caption text-ink-muted underline underline-offset-4" onClick={() => setUpsellTaken(false)}>
                    {dict.checkout.upsellRemove}
                  </button>
                </span>
                <SummaryLinePrice price={upsellLine.unitPrice} compareAt={upsellLine.compareAtPrice} quantity={upsellLine.quantity} locale={locale} dict={dict} />
              </li>
            ) : null}
          </ul>

          {offer && !upsellLine ? (
            <UpsellCard
              offer={offer}
              locale={locale}
              dict={dict}
              onAdd={() => {
                setUpsellTaken(true);
                track("AddToCart", {
                  value: offer.unitPrice * offer.quantity,
                  currency: "VND",
                  content_ids: [offer.variantId],
                  content_type: "product",
                  num_items: offer.quantity,
                });
              }}
            />
          ) : null}

          {quote?.changes.length ? (
            <Notice title={dict.checkout.changesTitle}>
              <ul className="list-disc space-y-1 pl-5" data-testid="quote-changes">{quote.changes.map((c, i) => <li key={i}>{describeChange(c, locale, dict)}</li>)}</ul>
              <Button
                size="sm"
                variant="secondary"
                className="mt-3"
                onClick={() => {
                  cartActions.reconcile(quote.lines);
                  if (quote.changes.some((c) => c.kind === "coupon")) cartActions.setCoupon(null);
                  setStatus({ kind: "idle" });
                }}
              >
                {dict.checkout.confirmChanges}
              </Button>
            </Notice>
          ) : null}

          {quote ? (
            <TotalsList
              locale={locale}
              dict={dict}
              subtotal={quote.subtotal}
              discount={quote.discount}
              couponCode={quote.coupon?.code}
              shipping={shippingLabel}
              shippingListPrice={ship?.status === "ok" && ship.listFee > ship.fee ? ship.listFee : null}
              total={quote.total}
            />
          ) : (
            <p className="text-small text-ink-muted" aria-live="polite">{quoteError ?? dict.common.loading}</p>
          )}
          {quoteError && quote ? <Notice tone="error">{quoteError}</Notice> : null}

          <div ref={errorRef} tabIndex={-1} className="outline-none" aria-live="assertive">
            {status.kind === "error" ? <Notice tone="error">{status.message}</Notice> : null}
            {status.kind === "processing" ? (
              <Notice>
                {dict.checkout.errorProcessing}
                <Button size="sm" variant="secondary" className="mt-3" onClick={checkAgain}>{dict.checkout.checkAgain}</Button>
              </Notice>
            ) : null}
            {status.kind === "unknown" ? (
              <Notice tone="error">
                {dict.checkout.errorUnknown}
                <Button size="sm" variant="secondary" className="mt-3" onClick={checkAgain}>{dict.checkout.checkAgain}</Button>
              </Notice>
            ) : null}
          </div>

          <Button
            type="submit"
            size="lg"
            className="w-full"
            disabled={!ordersEnabled || locked || !quote || !!quoteError || !quote.orderable || quote.changes.length > 0}
            data-testid="place-order"
          >
            {busy ? dict.checkout.placing : `${dict.checkout.placeOrder}${quote ? `, ${formatPrice(quote.total, locale)}` : ""}`}
          </Button>
          <p className="text-caption text-ink-muted">{dict.checkout.agree}</p>
        </div>
      </aside>
    </form>
  );
}

/** A cart line in the order summary: struck original price, the price paid, and the saving. */
function SummaryLinePrice({
  price, compareAt, quantity, locale, dict,
}: {
  price: number;
  compareAt?: number | null;
  quantity: number;
  locale: Locale;
  dict: Pick<D, "cart">;
}) {
  const onSale = compareAt != null && compareAt > price;
  const off = onSale ? Math.round((1 - price / compareAt) * 100) : 0;
  return (
    <span className="shrink-0 text-right">
      {onSale ? (
        <>
          <s className="block text-caption font-normal text-ink-muted">{formatPrice(compareAt * quantity, locale)}</s>
          <span className="block font-semibold text-green">{formatPrice(price * quantity, locale)}</span>
          <span className="block text-caption text-green">{t(dict.cart.saved, { percent: off })}</span>
        </>
      ) : (
        formatPrice(price * quantity, locale)
      )}
    </span>
  );
}

/**
 * The checkout offer: one product at the deeper discount, with delivery on the house. Drawn as a
 * single quiet card rather than a banner — it sits beside an order the customer has already
 * decided on, and should read as a kindness, not a sales pitch.
 */
function UpsellCard({ offer, locale, dict, onAdd }: { offer: UpsellOffer; locale: Locale; dict: Pick<D, "checkout">; onAdd: () => void }) {
  const total = offer.unitPrice * offer.quantity;
  const wouldPay = offer.listPrice * offer.quantity;
  return (
    <section className="rounded-sm border border-green/35 bg-surface p-4" aria-labelledby="upsell-title" data-testid="upsell-offer">
      <h3 id="upsell-title" className="text-caption font-semibold uppercase tracking-wide text-green">{dict.checkout.upsellTitle}</h3>
      <div className="mt-3 flex gap-3">
        {offer.image ? (
          <Image
            src={offer.image.url}
            alt=""
            width={72}
            height={72}
            unoptimized={offer.image.url.endsWith(".svg")}
            className="size-18 shrink-0 rounded-sm object-cover"
          />
        ) : null}
        <div className="min-w-0 flex-1">
          <p className="text-small font-medium">{offer.name}</p>
          {offer.variantTitle ? <p className="text-caption text-ink-muted">{offer.variantTitle}</p> : null}
          <p className="mt-1 flex flex-wrap items-baseline gap-2">
            <s className="text-caption text-ink-muted">{formatPrice(wouldPay, locale)}</s>
            <span className="text-small font-semibold text-green">{formatPrice(total, locale)}</span>
            <span className="text-caption font-semibold text-green">{dict.checkout.upsellBadge}</span>
          </p>
        </div>
      </div>
      <p className="mt-3 text-caption text-ink-muted">{offer.quantity === 2 ? dict.checkout.upsellTwo : dict.checkout.upsellOne}</p>
      <Button size="sm" variant="secondary" className="mt-3 w-full" onClick={onAdd}>
        {offer.quantity === 2 ? dict.checkout.upsellAddTwo : dict.checkout.upsellAddOne}
      </Button>
    </section>
  );
}
