"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import type { PublicOrderConfirmation } from "@/lib/checkout/place-order";
import type { Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { t } from "@/lib/i18n/dictionaries";
import { formatDate, formatPrice } from "@/lib/i18n/format";
import { routes } from "@/lib/routes";
import { TotalsList } from "@/components/cart/summary";
import { IconCheck } from "@/components/ui/icons";
import { Button, ButtonLink, EmptyState, Field, Notice, inputClass } from "@/components/ui/primitives";
import { LAST_ORDER_KEY } from "./checkout-form";

type D = Pick<Dictionary, "order" | "checkout" | "cart" | "common">;

function Lines({ lines, locale }: { lines: { name: string; variantTitle: string; quantity: number; lineTotal: number }[]; locale: Locale }) {
  return (
    <ul className="divide-y divide-line border-y border-line">
      {lines.map((l, i) => (
        <li key={i} className="flex justify-between gap-4 py-3 text-small">
          <span>
            <span className="font-medium">{l.name}</span>
            <span className="block text-caption text-ink-muted">{[l.variantTitle, `× ${l.quantity}`].filter(Boolean).join(" ")}</span>
          </span>
          <span>{formatPrice(l.lineTotal, locale)}</span>
        </li>
      ))}
    </ul>
  );
}

/** Rendered only from the order-creation response this browser just received — never from a URL. */
export function OrderConfirmation({ locale, dict }: { locale: Locale; dict: D }) {
  const raw = useSyncExternalStore(
    () => () => {},
    () => {
      try { return sessionStorage.getItem(LAST_ORDER_KEY) ?? ""; } catch { return ""; }
    },
    () => null,
  );
  const order = useMemo<PublicOrderConfirmation | null | undefined>(() => {
    if (raw === null) return undefined;
    try { return raw ? (JSON.parse(raw) as PublicOrderConfirmation) : null; } catch { return null; }
  }, [raw]);

  if (order === undefined) return <div className="h-64" aria-busy="true" />;
  if (order === null) {
    return <EmptyState title={dict.order.notFoundTitle} body={dict.order.notFoundBody} action={<ButtonLink href={routes.track(locale)}>{dict.order.track}</ButtonLink>} />;
  }
  const pickup = order.fulfillment === "pickup";
  return (
    <div className="grid gap-10 lg:grid-cols-12">
      <div className="lg:col-span-7">
        <p className="inline-flex size-12 items-center justify-center rounded-full bg-green text-on-green"><IconCheck size={26} /></p>
        <h1 className="mt-5 text-display" data-testid="order-confirmed">{dict.order.confirmedTitle}</h1>
        <p className="mt-3 text-body">{t(dict.order.confirmedBody, { ref: order.ref, phone: order.phoneMasked })}</p>
        {order.simulated ? <Notice tone="sample" className="mt-5">{dict.order.simulatedNote}</Notice> : null}
        <dl className="mt-8 grid gap-4 sm:grid-cols-3">
          <div className="rounded-md bg-surface-alt p-4"><dt className="text-caption text-ink-muted">{dict.order.ref}</dt><dd className="mt-1 text-subheading text-green" data-testid="order-ref">{order.ref}</dd></div>
          <div className="rounded-md bg-surface-alt p-4"><dt className="text-caption text-ink-muted">{dict.order.method}</dt><dd className="mt-1 font-semibold">{pickup ? dict.checkout.pickup : dict.checkout.delivery}</dd></div>
          <div className="rounded-md bg-surface-alt p-4"><dt className="text-caption text-ink-muted">{dict.order.payment}</dt><dd className="mt-1 font-semibold">{pickup ? dict.checkout.paymentStore : dict.checkout.paymentCod}</dd></div>
        </dl>
        <h2 className="mt-10 text-subheading">{dict.order.nextSteps}</h2>
        <p className="mt-2 max-w-prose">{pickup ? dict.order.nextPickup : dict.order.nextDelivery}</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <ButtonLink href={routes.products(locale)}>{dict.cart.continue}</ButtonLink>
          <ButtonLink href={routes.track(locale)} variant="secondary">{dict.order.track}</ButtonLink>
        </div>
      </div>
      <aside className="lg:col-span-5">
        <div className="rounded-lg border border-line bg-paper p-5 md:p-6">
          <h2 className="mb-3 text-subheading">{dict.checkout.summary}</h2>
          <p className="mb-4 text-caption text-ink-muted">{t(dict.order.placedOn, { date: formatDate(order.createdAt, locale) })}</p>
          <Lines lines={order.lines} locale={locale} />
          <div className="mt-4">
            <TotalsList locale={locale} dict={dict} subtotal={order.subtotal} discount={order.discount} shipping={order.shippingFee === 0 ? dict.checkout.shippingFree : order.shippingFee} total={order.total} />
          </div>
        </div>
      </aside>
    </div>
  );
}

interface TrackedOrder {
  ref: string;
  createdAt: string;
  status: "pending" | "confirmed" | "ready_for_pickup" | "shipping" | "completed" | "cancelled";
  financialStatus: "pending" | "paid";
  fulfillment: "delivery" | "pickup";
  lines: { name: string; variantTitle: string; quantity: number; lineTotal: number }[];
  subtotal: number;
  discount: number;
  shippingFee: number;
  total: number;
  phoneMasked: string;
  province: string | null;
  shipment?: { carrier: string | null; trackingNumber: string | null } | null;
  simulated: boolean;
}

export function TrackOrderForm({ locale, dict }: { locale: Locale; dict: D }) {
  const [ref, setRef] = useState("");
  const [phone, setPhone] = useState("");
  const [state, setState] = useState<{ kind: "idle" | "loading" | "not-found" | "error" | "limited" } | { kind: "found"; order: TrackedOrder }>({ kind: "idle" });

  const statusLabel: Record<TrackedOrder["status"], string> = {
    pending: dict.order.statusPending,
    confirmed: dict.order.statusConfirmed,
    ready_for_pickup: dict.order.statusReadyForPickup,
    shipping: dict.order.statusShipping,
    completed: dict.order.statusCompleted,
    cancelled: dict.order.statusCancelled,
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ref.trim() || !phone.trim()) return setState({ kind: "not-found" });
    setState({ kind: "loading" });
    try {
      const res = await fetch("/api/orders/track", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderRef: ref.trim(), phone: phone.trim() }) });
      if (res.ok) return setState({ kind: "found", order: ((await res.json()) as { order: TrackedOrder }).order });
      setState({ kind: res.status === 404 ? "not-found" : res.status === 429 ? "limited" : "error" });
    } catch {
      setState({ kind: "error" });
    }
  };

  return (
    <div className="grid gap-10 lg:grid-cols-12">
      <form onSubmit={submit} className="space-y-4 lg:col-span-5" noValidate>
        <p className="text-ink-muted">{dict.order.trackIntro}</p>
        <Field id="track-ref" label={dict.order.ref}>
          <input id="track-ref" className={`${inputClass} uppercase`} value={ref} onChange={(e) => setRef(e.target.value)} autoComplete="off" maxLength={20} />
        </Field>
        <Field id="track-phone" label={dict.checkout.phone}>
          <input id="track-phone" className={inputClass} type="tel" inputMode="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={15} />
        </Field>
        <Button type="submit" size="lg" disabled={state.kind === "loading"}>{dict.order.trackSubmit}</Button>
        <div aria-live="polite">
          {state.kind === "not-found" ? <Notice tone="error">{dict.order.trackNotFound}</Notice> : null}
          {state.kind === "limited" ? <Notice tone="error">{dict.checkout.errorRateLimited}</Notice> : null}
          {state.kind === "error" ? <Notice tone="error">{dict.checkout.errorUnavailable}</Notice> : null}
        </div>
      </form>
      {state.kind === "found" ? (
        <section className="rounded-lg border border-line bg-paper p-5 md:p-6 lg:col-span-7" aria-labelledby="tracked-title" data-testid="tracked-order">
          <h2 id="tracked-title" className="text-subheading">{dict.order.ref} {state.order.ref}</h2>
          <p className="text-caption text-ink-muted">{t(dict.order.placedOn, { date: formatDate(state.order.createdAt, locale) })}</p>
          {state.order.simulated ? <Notice tone="sample" className="mt-4">{dict.order.simulatedNote}</Notice> : null}
          <dl className="my-5 grid gap-3 sm:grid-cols-3">
            <div><dt className="text-caption text-ink-muted">{dict.order.status}</dt><dd className="font-semibold text-green" data-testid="tracked-status">{statusLabel[state.order.status]}</dd></div>
            <div><dt className="text-caption text-ink-muted">{dict.order.method}</dt><dd className="font-semibold">{state.order.fulfillment === "pickup" ? dict.checkout.pickup : `${dict.checkout.delivery}${state.order.province ? `, ${state.order.province}` : ""}`}</dd></div>
            <div><dt className="text-caption text-ink-muted">{dict.order.payment}</dt><dd className="font-semibold">{state.order.financialStatus === "paid" ? dict.order.paymentPaid : dict.order.paymentPending}</dd></div>
          </dl>
          {state.order.shipment ? (
            <dl className="mb-5 grid gap-3 rounded-md bg-surface-alt p-4 sm:grid-cols-2" data-testid="tracked-shipment">
              {state.order.shipment.carrier ? (
                <div><dt className="text-caption text-ink-muted">{dict.order.carrier}</dt><dd className="font-semibold">{state.order.shipment.carrier}</dd></div>
              ) : null}
              {state.order.shipment.trackingNumber ? (
                <div><dt className="text-caption text-ink-muted">{dict.order.trackingNumber}</dt><dd className="font-semibold tabular-nums">{state.order.shipment.trackingNumber}</dd></div>
              ) : null}
            </dl>
          ) : null}
          <Lines lines={state.order.lines} locale={locale} />
          <div className="mt-4">
            <TotalsList locale={locale} dict={dict} subtotal={state.order.subtotal} discount={state.order.discount} shipping={state.order.shippingFee === 0 ? dict.checkout.shippingFree : state.order.shippingFee} total={state.order.total} />
          </div>
        </section>
      ) : null}
    </div>
  );
}
