"use client";

import Image from "next/image";
import Link from "next/link";
import type { Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { t } from "@/lib/i18n/dictionaries";
import { formatPrice } from "@/lib/i18n/format";
import { routes } from "@/lib/routes";
import { cartActions, type CartLine } from "@/lib/client/stores";
import { QuantityStepper } from "./quantity";

export function CartLines({ lines, locale, dict, compact, onNavigate }: { lines: CartLine[]; locale: Locale; dict: Pick<Dictionary, "cart" | "product">; compact?: boolean; onNavigate?: () => void }) {
  return (
    <ul className="divide-y divide-line">
      {lines.map((l) => (
        <li key={l.variantId} className="flex gap-4 py-4" data-testid="cart-line">
          <Link href={routes.product(locale, l.handle)} onClick={onNavigate} className="shrink-0">
            {l.image ? (
              <Image src={l.image} alt="" width={compact ? 80 : 104} height={compact ? 80 : 104} unoptimized={l.image.endsWith(".svg")} className="rounded-md bg-surface-alt object-cover" style={{ width: compact ? 80 : 104, height: compact ? 80 : 104 }} />
            ) : (
              <span className="block size-20 rounded-md bg-surface-alt" />
            )}
          </Link>
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <Link href={routes.product(locale, l.handle)} onClick={onNavigate} className="block text-small font-semibold text-ink hover:text-green">{l.name}</Link>
                {l.variantTitle ? <p className="text-caption text-ink-muted">{l.variantTitle}</p> : null}
              </div>
              <p className="shrink-0 text-small font-semibold">{formatPrice(l.price * l.quantity, locale)}</p>
            </div>
            <div className="flex items-center justify-between gap-3">
              <QuantityStepper
                id={`qty-${l.variantId}`}
                size="sm"
                value={l.quantity}
                max={l.maxQuantity}
                onChange={(n) => cartActions.setQuantity(l.variantId, n)}
                labels={{ quantity: dict.product.quantity, decrease: dict.product.decrease, increase: dict.product.increase }}
              />
              <button type="button" onClick={() => cartActions.remove(l.variantId)} className="h-9 rounded-md px-2 text-caption text-ink-muted underline underline-offset-4 hover:text-danger cursor-pointer" aria-label={t(dict.cart.remove, { name: l.name })}>
                {dict.cart.removeShort}
              </button>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
