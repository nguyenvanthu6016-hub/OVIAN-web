"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import type { Locale } from "@/lib/i18n/config";
import { formatPrice } from "@/lib/i18n/format";
import { routes } from "@/lib/routes";
import { IconSearch } from "@/components/ui/icons";
import { inputClass } from "@/components/ui/primitives";

interface Suggestion {
  products: { handle: string; name: string; lang: string; price: number; image: string | null }[];
  categories: { handle: string; name: string }[];
}

/** Combobox search with live suggestions (ARIA 1.2 combobox + listbox). */
export function SearchBox({
  locale, labels, autoFocus, initial = "", onNavigate,
}: {
  locale: Locale;
  labels: { label: string; placeholder: string; submit: string; products: string; spaces: string };
  autoFocus?: boolean;
  initial?: string;
  onNavigate?: () => void;
}) {
  const router = useRouter();
  const id = useId();
  const [q, setQ] = useState(initial);
  const [data, setData] = useState<Suggestion>({ products: [], categories: [] });
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);

  const shown = q.trim().length >= 2 ? data : { products: [], categories: [] };
  const options = [
    ...shown.categories.map((c) => ({ key: `c-${c.handle}`, href: routes.space(locale, c.handle), label: c.name, kind: "space" as const })),
    ...shown.products.map((p) => ({ key: `p-${p.handle}`, href: routes.product(locale, p.handle), label: p.name, kind: "product" as const, p })),
  ];

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) return;
    const ctrl = new AbortController();
    const t = setTimeout(() => {
      fetch(`/api/search/suggest?q=${encodeURIComponent(term)}&locale=${locale}`, { signal: ctrl.signal })
        .then((r) => (r.ok ? r.json() : { products: [], categories: [] }))
        .then((d: Suggestion) => {
          setData(d);
          setActive(-1);
          setOpen(true);
        })
        .catch(() => undefined);
    }, 180);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [q, locale]);

  const go = (href: string) => {
    setOpen(false);
    onNavigate?.();
    router.push(href);
  };

  return (
    <form
      role="search"
      className="relative"
      onSubmit={(e) => {
        e.preventDefault();
        const opt = options[active];
        if (opt) go(opt.href);
        else if (q.trim()) go(routes.search(locale, q.trim()));
      }}
    >
      <label htmlFor={`${id}-q`} className="sr-only">{labels.label}</label>
      <div className="relative">
        <input
          ref={inputRef}
          id={`${id}-q`}
          type="search"
          name="q"
          autoComplete="off"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => options.length && setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 120)}
          onKeyDown={(e) => {
            if (!open || !options.length) return;
            if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => (a + 1) % options.length); }
            if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => (a <= 0 ? options.length - 1 : a - 1)); }
            if (e.key === "Escape") { setOpen(false); setActive(-1); }
          }}
          placeholder={labels.placeholder}
          role="combobox"
          aria-expanded={open && options.length > 0}
          aria-controls={`${id}-list`}
          aria-autocomplete="list"
          aria-activedescendant={active >= 0 ? `${id}-opt-${active}` : undefined}
          className={`${inputClass} pr-14`}
        />
        <button type="submit" className="absolute right-1 top-1 inline-flex size-10 items-center justify-center rounded-sm text-green hover:bg-surface-alt" aria-label={labels.submit}>
          <IconSearch />
        </button>
      </div>
      {open && options.length > 0 ? (
        <ul id={`${id}-list`} role="listbox" aria-label={labels.label} className="absolute inset-x-0 top-full z-50 mt-1 max-h-[60vh] overflow-y-auto rounded-md border border-line bg-paper py-1 shadow-[0_8px_24px_-12px_rgba(31,42,34,0.25)]">
          {options.map((o, i) => (
            <li
              key={o.key}
              id={`${id}-opt-${i}`}
              role="option"
              aria-selected={i === active}
              onMouseDown={(e) => { e.preventDefault(); go(o.href); }}
              onMouseEnter={() => setActive(i)}
              className={`flex cursor-pointer items-center gap-3 px-3 py-2 ${i === active ? "bg-surface-alt" : ""}`}
            >
              {o.kind === "product" ? (
                <>
                  {o.p.image ? <Image src={o.p.image} alt="" width={40} height={40} unoptimized={o.p.image.endsWith(".svg")} className="size-10 rounded-sm object-cover" /> : <span className="size-10 rounded-sm bg-surface-alt" />}
                  <span className="min-w-0 flex-1">
                    <span lang={o.p.lang} className="block truncate text-small text-ink">{o.label}</span>
                    <span className="text-caption text-ink-muted">{formatPrice(o.p.price, locale)}</span>
                  </span>
                </>
              ) : (
                <span className="text-small">
                  <span className="text-ink-muted">{labels.spaces}: </span>
                  <span className="font-semibold text-green">{o.label}</span>
                </span>
              )}
            </li>
          ))}
        </ul>
      ) : null}
    </form>
  );
}
