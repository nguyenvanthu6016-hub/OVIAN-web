"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Product, Variant } from "@/lib/commerce/types";
import type { Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { t } from "@/lib/i18n/dictionaries";
import { formatPrice } from "@/lib/i18n/format";
import { cartActions, cartDrawer, pushRecent } from "@/lib/client/stores";
import { track } from "@/lib/analytics/pixel";
import { QuantityStepper } from "@/components/cart/quantity";
import { IconCheck } from "@/components/ui/icons";
import { Badge, Button, Price, cx } from "@/components/ui/primitives";
import { Gallery } from "./gallery";
import { WishlistButton } from "./wishlist-button";

type D = Pick<Dictionary, "product" | "common">;

function initialSelection(p: Product): Record<string, string> {
  const v = p.variants.find((x) => x.available) ?? p.variants[0];
  return v ? { ...v.options } : {};
}

function findVariant(p: Product, sel: Record<string, string>): Variant | undefined {
  return p.variants.find((v) => p.options.every((o) => v.options[o.key] === sel[o.key]));
}

/** Gallery + purchase controls share the selected variant (for variant images). */
export function ProductPurchase({ product, locale, dict }: { product: Product; locale: Locale; dict: D }) {
  const [sel, setSel] = useState<Record<string, string>>(() => initialSelection(product));
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const [showSticky, setShowSticky] = useState(false);
  const mainBtn = useRef<HTMLDivElement>(null);
  const variant = findVariant(product, sel);

  useEffect(() => pushRecent(product.id), [product.id]);

  useEffect(() => {
    const el = mainBtn.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([e]) => setShowSticky(!e!.isIntersecting && e!.boundingClientRect.top < 0), { threshold: 0 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // A value is selectable if some available variant matches it together with the other current selections.
  const valueState = useMemo(() => {
    const m = new Map<string, boolean>();
    for (const o of product.options)
      for (const val of o.values) {
        const ok = product.variants.some((v) => v.available && v.options[o.key] === val && product.options.every((o2) => o2.key === o.key || !sel[o2.key] || v.options[o2.key] === sel[o2.key]));
        m.set(`${o.key}:${val}`, ok);
      }
    return m;
  }, [product, sel]);

  const max = variant?.inventoryQuantity ?? null;
  const available = !!variant?.available;
  const low = available && max !== null && max <= 3;

  const add = () => {
    if (!variant || !available) return;
    track("AddToCart", {
      value: variant.price * qty,
      currency: "VND",
      content_ids: [variant.id],
      content_type: "product",
      num_items: qty,
    });
    cartActions.add(
      {
        variantId: variant.id,
        productId: product.id,
        handle: product.handle,
        name: product.name.value,
        variantTitle: Object.keys(variant.options).length ? variant.title : "",
        price: variant.price,
        compareAt: variant.compareAtPrice,
        image: product.images[variant.imageIndex ?? 0]?.url ?? product.images[0]?.url ?? null,
        maxQuantity: max,
      },
      qty,
    );
    setAdded(true);
    setTimeout(() => setAdded(false), 2500);
    cartDrawer.open();
  };

  const priceEl = variant ? (
    <Price size="lg" price={variant.price} compareAt={variant.compareAtPrice} locale={locale} labels={{ original: dict.product.originalPrice, sale: dict.product.salePrice }} />
  ) : null;

  const percent = variant?.compareAtPrice ? Math.round((1 - variant.price / variant.compareAtPrice) * 100) : 0;

  return (
    <>
      <div className="lg:col-span-7">
        <Gallery images={product.images} activeIndex={variant?.imageIndex} labels={{ gallery: dict.product.gallery, imageOf: dict.product.imageOf, zoom: dict.product.zoom, close: dict.common.close }} />
      </div>

      <div className="lg:col-span-5">
        <div className="lg:sticky lg:top-24">
          <h1 lang={product.name.lang} className={product.name.value.length > 60 ? "text-subheading font-semibold md:text-heading" : "text-heading md:text-display"}>{product.name.value}</h1>
          {product.summary ? <p lang={product.summary.lang} className="mt-2 text-ink-muted">{product.summary.value}</p> : null}

          <div className="mt-5 flex flex-wrap items-center gap-3">
            {priceEl}
            {percent > 0 ? <Badge>{t(dict.product.sale, { percent })}</Badge> : null}
          </div>

          {product.options.map((o) => (
            <fieldset key={o.key} className="mt-6">
              <legend className="mb-2 text-small text-ink">
                <span className="font-semibold">{o.name}</span>
                {sel[o.key] ? <span className="text-ink-muted">: {sel[o.key]}</span> : null}
              </legend>
              <div className="flex flex-wrap gap-2">
                {o.values.map((val) => {
                  const ok = valueState.get(`${o.key}:${val}`);
                  const active = sel[o.key] === val;
                  return (
                    <button
                      key={val}
                      type="button"
                      aria-pressed={active}
                      onClick={() => {
                        const next = { ...sel, [o.key]: val };
                        // If the combination doesn't exist, jump to the first variant that has this value.
                        if (!findVariant(product, next)) {
                          const v = product.variants.find((x) => x.options[o.key] === val && x.available) ?? product.variants.find((x) => x.options[o.key] === val);
                          if (v) return setSel({ ...v.options });
                        }
                        setSel(next);
                        setQty(1);
                      }}
                      className={cx(
                        "inline-flex min-h-11 items-center rounded-md border px-4 text-small transition-colors duration-150 cursor-pointer",
                        active ? "border-green bg-green text-on-green" : "border-line-strong bg-paper text-ink hover:border-green",
                        !ok && !active && "text-ink-muted line-through decoration-ink-muted/60",
                      )}
                    >
                      {val}
                    </button>
                  );
                })}
              </div>
            </fieldset>
          ))}

          <p className={cx("mt-5 flex items-center gap-2 text-small", available ? "text-green" : "text-danger")} aria-live="polite">
            <span aria-hidden="true" className={cx("size-2 rounded-full", available ? "bg-green" : "bg-danger")} />
            {!available ? dict.product.soldOut : low ? t(dict.product.lowStock, { count: max! }) : dict.product.inStock}
          </p>

          <div ref={mainBtn} className="mt-4 flex flex-wrap items-center gap-3">
            <QuantityStepper id="pdp-qty" value={qty} onChange={setQty} max={max} labels={{ quantity: dict.product.quantity, decrease: dict.product.decrease, increase: dict.product.increase }} />
            <Button size="lg" className="min-w-48 flex-1" disabled={!available} onClick={add} data-testid="add-to-cart">
              {added ? <><IconCheck size={20} /> {dict.product.added}</> : available ? dict.product.addToCart : dict.product.soldOut}
            </Button>
          </div>
          <div className="mt-3">
            <WishlistButton variant="full" productId={product.id} name={product.name.value} labels={{ save: dict.product.save, saved: dict.product.saved }} />
          </div>
          {variant?.sku ? <p className="mt-4 text-caption text-ink-muted">{dict.product.sku}: {variant.sku}</p> : null}
        </div>
      </div>

      {/* Mobile sticky purchase bar */}
      <div className={cx("fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface/95 px-4 py-3 backdrop-blur-sm transition-transform duration-200 lg:hidden", showSticky ? "translate-y-0" : "translate-y-full")} aria-hidden={!showSticky}>
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-caption text-ink-muted">{product.name.value}{variant && Object.keys(variant.options).length ? `, ${variant.title}` : ""}</p>
            <p className="text-small font-semibold">{variant ? formatPrice(variant.price, locale) : ""}</p>
          </div>
          <Button size="lg" disabled={!available} onClick={add} tabIndex={showSticky ? 0 : -1}>
            {available ? dict.product.addToCart : dict.product.soldOut}
          </Button>
        </div>
      </div>
    </>
  );
}
