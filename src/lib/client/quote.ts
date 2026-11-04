"use client";

import type { Quote, QuoteChange } from "@/lib/checkout/pricing";
import type { Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { t } from "@/lib/i18n/dictionaries";
import { formatPrice } from "@/lib/i18n/format";
import type { CartLine } from "./stores";

export type QuoteResult = { ok: true; quote: Quote } | { ok: false; error: "unavailable" | "rate-limited" | "validation" | "network" };

export async function fetchQuote(body: {
  lines: CartLine[];
  couponCode: string | null;
  fulfillment: "delivery" | "pickup";
  provinceCode?: string | null;
}, signal?: AbortSignal): Promise<QuoteResult> {
  try {
    const res = await fetch("/api/checkout/quote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal,
      body: JSON.stringify({
        lines: body.lines.map((l) => ({ variantId: l.variantId, quantity: l.quantity, seenPrice: l.price })),
        couponCode: body.couponCode || null,
        fulfillment: body.fulfillment,
        provinceCode: body.provinceCode || null,
      }),
    });
    if (res.ok) return { ok: true, quote: ((await res.json()) as { quote: Quote }).quote };
    if (res.status === 503) return { ok: false, error: "unavailable" };
    if (res.status === 429) return { ok: false, error: "rate-limited" };
    return { ok: false, error: "validation" };
  } catch (e) {
    if ((e as Error).name === "AbortError") throw e;
    return { ok: false, error: "network" };
  }
}

export function describeChange(c: QuoteChange, locale: Locale, d: Pick<Dictionary, "checkout" | "cart">): string {
  switch (c.kind) {
    case "price": return t(d.checkout.changePrice, { name: c.name, from: formatPrice(c.from, locale), to: formatPrice(c.to, locale) });
    case "removed": return t(d.checkout.changeStock, { name: c.name });
    case "quantity": return t(d.checkout.changeQty, { name: c.name, count: c.to });
    case "coupon":
      return c.reason === "min-subtotal"
        ? t(d.cart.couponMinSubtotal, { code: c.code, amount: formatPrice(c.minSubtotal ?? 0, locale) })
        : t(d.cart.couponInvalid, { code: c.code });
  }
}
