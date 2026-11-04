"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useOptimistic, useState, useTransition } from "react";
import type { Facet } from "@/lib/commerce/types";
import type { Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { t } from "@/lib/i18n/dictionaries";
import { formatPrice } from "@/lib/i18n/format";
import { Drawer } from "@/components/ui/drawer";
import { IconClose, IconFilter } from "@/components/ui/icons";
import { Button, cx, inputClass } from "@/components/ui/primitives";

type D = Pick<Dictionary, "catalog" | "common">;

function useUrlState() {
  const router = useRouter();
  const pathname = usePathname();
  const urlSp = useSearchParams();
  const [pending, start] = useTransition();
  // Controls reflect the click immediately; the URL (source of truth) catches up after navigation.
  const [optimistic, setOptimistic] = useOptimistic(urlSp.toString());
  const sp = new URLSearchParams(optimistic);
  const update = (patch: Record<string, string | null>) => {
    const u = new URLSearchParams(optimistic);
    for (const [k, v] of Object.entries(patch)) {
      if (v === null || v === "") u.delete(k);
      else u.set(k, v);
    }
    u.delete("page"); // any filter change resets pagination
    const s = u.toString();
    start(() => {
      setOptimistic(s);
      router.push(`${pathname}${s ? `?${s}` : ""}`, { scroll: false });
    });
  };
  return { sp, update, pending };
}

function FilterBody({ facets, priceRange, locale, dict, idPrefix }: { facets: Facet[]; priceRange: { min: number; max: number } | null; locale: Locale; dict: D; idPrefix: string }) {
  const { sp, update } = useUrlState();
  const selected = (key: string) => (sp.get(key) ?? "").split(",").filter(Boolean);
  const toggle = (key: string, value: string) => {
    const cur = selected(key);
    const next = cur.includes(value) ? cur.filter((v) => v !== value) : [...cur, value];
    update({ [key]: next.join(",") || null });
  };

  return (
    <div className="space-y-7">
      {facets.map((f) => (
        <fieldset key={f.key}>
          <legend className="mb-2 text-small font-semibold text-ink">{f.label}</legend>
          <ul className="space-y-0.5">
            {f.values.map((v) => {
              const id = `${idPrefix}-${f.key}-${v.value}`;
              const checked = selected(f.key).includes(v.value);
              return (
                <li key={v.value}>
                  <label htmlFor={id} className={cx("flex min-h-11 cursor-pointer items-center gap-3 rounded-sm px-1 text-small hover:bg-surface-alt", v.count === 0 && !checked && "opacity-50")}>
                    <input id={id} type="checkbox" className="size-5 accent-green" checked={checked} disabled={v.count === 0 && !checked} onChange={() => toggle(f.key, v.value)} />
                    <span className="flex-1">{v.label}</span>
                    <span className="text-caption text-ink-muted">{v.count}</span>
                  </label>
                </li>
              );
            })}
          </ul>
        </fieldset>
      ))}

      <fieldset>
        <legend className="mb-2 text-small font-semibold text-ink">{dict.catalog.price}</legend>
        {priceRange ? <p className="mb-2 text-caption text-ink-muted">{formatPrice(priceRange.min, locale)} – {formatPrice(priceRange.max, locale)}</p> : null}
        <PriceForm key={`${sp.get("min")}-${sp.get("max")}`} idPrefix={idPrefix} dict={dict} initialMin={sp.get("min") ?? ""} initialMax={sp.get("max") ?? ""} onApply={(mn, mx) => update({ min: mn || null, max: mx || null })} />
      </fieldset>

      <fieldset>
        <legend className="mb-2 text-small font-semibold text-ink">{dict.catalog.availability}</legend>
        {[
          ["stock", dict.catalog.inStockOnly],
          ["sale", dict.catalog.onSaleOnly],
        ].map(([key, label]) => (
          <label key={key} htmlFor={`${idPrefix}-${key}`} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-sm px-1 text-small hover:bg-surface-alt">
            <input id={`${idPrefix}-${key}`} type="checkbox" className="size-5 accent-green" checked={sp.get(key!) === "1"} onChange={(e) => update({ [key!]: e.target.checked ? "1" : null })} />
            {label}
          </label>
        ))}
      </fieldset>
    </div>
  );
}

function PriceForm({ idPrefix, dict, initialMin, initialMax, onApply }: { idPrefix: string; dict: D; initialMin: string; initialMax: string; onApply: (min: string, max: string) => void }) {
  const [min, setMin] = useState(initialMin);
  const [max, setMax] = useState(initialMax);
  return (
    <form
      className="flex items-end gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        onApply(min.replace(/\D/g, ""), max.replace(/\D/g, ""));
      }}
    >
      <div className="flex-1">
        <label htmlFor={`${idPrefix}-min`} className="text-caption text-ink-muted">{dict.catalog.priceMin}</label>
        <input id={`${idPrefix}-min`} inputMode="numeric" className={cx(inputClass, "h-11")} value={min} onChange={(e) => setMin(e.target.value)} placeholder="0" />
      </div>
      <div className="flex-1">
        <label htmlFor={`${idPrefix}-max`} className="text-caption text-ink-muted">{dict.catalog.priceMax}</label>
        <input id={`${idPrefix}-max`} inputMode="numeric" className={cx(inputClass, "h-11")} value={max} onChange={(e) => setMax(e.target.value)} placeholder="2000000" />
      </div>
      <Button type="submit" variant="secondary" className="h-11 px-3">OK</Button>
    </form>
  );
}

export function FilterSidebar(props: { facets: Facet[]; priceRange: { min: number; max: number } | null; locale: Locale; dict: D }) {
  return (
    <aside aria-label={props.dict.catalog.filters} className="hidden lg:block">
      <FilterBody {...props} idPrefix="side" />
    </aside>
  );
}

export function FilterToolbar({
  facets, priceRange, locale, dict, total, activeChips,
}: {
  facets: Facet[];
  priceRange: { min: number; max: number } | null;
  locale: Locale;
  dict: D;
  total: number;
  activeChips: { key: string; value: string | null; label: string }[];
}) {
  const { sp, update, pending } = useUrlState();
  const [open, setOpen] = useState(false);
  const sort = sp.get("sort") ?? "featured";
  const removeChip = (c: { key: string; value: string | null }) => {
    if (c.value === null) return update({ [c.key]: null });
    const next = (sp.get(c.key) ?? "").split(",").filter((v) => v && v !== c.value);
    update({ [c.key]: next.join(",") || null });
  };

  return (
    <div className="mb-6 space-y-3" aria-busy={pending}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-small text-ink-muted" aria-live="polite">{t(dict.catalog.results, { count: total })}</p>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="md" className="lg:hidden" onClick={() => setOpen(true)} aria-controls="filter-drawer" aria-expanded={open}>
            <IconFilter size={18} /> {dict.catalog.showFilters}
            {activeChips.length ? <span className="ml-1 inline-flex size-5 items-center justify-center rounded-full bg-green text-[11px] text-on-green">{activeChips.length}</span> : null}
          </Button>
          <label htmlFor="sort" className="sr-only">{dict.catalog.sort}</label>
          <select id="sort" value={sort} onChange={(e) => update({ sort: e.target.value === "featured" ? null : e.target.value })} className={cx(inputClass, "h-11 w-auto pr-8 text-small")}>
            <option value="featured">{dict.catalog.sortFeatured}</option>
            <option value="newest">{dict.catalog.sortNewest}</option>
            <option value="price-asc">{dict.catalog.sortPriceAsc}</option>
            <option value="price-desc">{dict.catalog.sortPriceDesc}</option>
          </select>
        </div>
      </div>
      {activeChips.length ? (
        <div className="flex flex-wrap items-center gap-2" aria-label={dict.catalog.activeFilters} role="group">
          {activeChips.map((c) => (
            <button key={`${c.key}-${c.value}`} type="button" onClick={() => removeChip(c)} className="inline-flex h-9 items-center gap-1.5 rounded-full bg-surface-alt pl-3 pr-2 text-caption text-green hover:bg-line cursor-pointer" aria-label={t(dict.catalog.removeFilter, { label: c.label })}>
              {c.label} <IconClose size={14} />
            </button>
          ))}
          <button
            type="button"
            className="h-9 px-2 text-caption font-semibold text-ink underline underline-offset-4 cursor-pointer"
            onClick={() => update(Object.fromEntries(["material", "color", "min", "max", "stock", "sale"].map((k) => [k, null])))}
          >
            {dict.catalog.clearAll}
          </button>
        </div>
      ) : null}

      <Drawer
        id="filter-drawer"
        open={open}
        onClose={() => setOpen(false)}
        side="left"
        title={dict.catalog.filters}
        closeLabel={dict.common.close}
        footer={<Button className="w-full" size="lg" onClick={() => setOpen(false)}>{t(dict.catalog.applyFilters, { count: total })}</Button>}
      >
        <div className="p-4">
          <FilterBody facets={facets} priceRange={priceRange} locale={locale} dict={dict} idPrefix="drawer" />
        </div>
      </Drawer>
    </div>
  );
}
