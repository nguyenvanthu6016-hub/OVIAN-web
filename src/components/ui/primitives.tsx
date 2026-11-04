import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import type { Locale } from "@/lib/i18n/config";
import { formatPrice } from "@/lib/i18n/format";
import { IconAlert, IconChevronRight } from "./icons";

export function cx(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}

/* ---------- Buttons ---------- */
type Variant = "primary" | "secondary" | "ghost" | "accent";
type Size = "md" | "lg" | "sm";
const base =
  "inline-flex items-center justify-center gap-2 rounded-md font-semibold transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer select-none";
const variants: Record<Variant, string> = {
  primary: "bg-green text-on-green hover:bg-green-deep",
  secondary: "border border-green text-green bg-transparent hover:bg-surface-alt",
  ghost: "text-green hover:bg-surface-alt",
  accent: "bg-yellow text-ink hover:brightness-95",
};
const sizes: Record<Size, string> = {
  sm: "h-9 px-3 text-small",
  md: "h-11 px-5 text-small",
  lg: "h-12 px-6 text-body",
};

export function buttonClass(variant: Variant = "primary", size: Size = "md", extra?: string) {
  return cx(base, variants[variant], sizes[size], extra);
}

export function Button({ variant = "primary", size = "md", className, ...rest }: ComponentProps<"button"> & { variant?: Variant; size?: Size }) {
  return <button type="button" className={buttonClass(variant, size, className)} {...rest} />;
}

export function ButtonLink({ variant = "primary", size = "md", className, ...rest }: ComponentProps<typeof Link> & { variant?: Variant; size?: Size }) {
  return <Link className={buttonClass(variant, size, className)} {...rest} />;
}

/* ---------- Form fields ---------- */
export const inputClass =
  "block w-full h-12 rounded-sm border border-line-strong bg-paper px-3 text-body text-ink placeholder:text-ink-muted/80 transition-colors duration-150 hover:border-ink-muted focus-visible:border-green focus-visible:outline-2 focus-visible:outline-green focus-visible:outline-offset-0 aria-[invalid=true]:border-danger";

export function Field({
  id, label, hint, error, optionalLabel, children,
}: { id: string; label: string; hint?: string; error?: string; optionalLabel?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-small font-medium text-ink">
        {label}
        {optionalLabel ? <span className="font-normal text-ink-muted"> ({optionalLabel})</span> : null}
      </label>
      {children}
      {hint && !error ? <p id={`${id}-hint`} className="text-caption text-ink-muted">{hint}</p> : null}
      {error ? (
        <p id={`${id}-error`} className="flex items-start gap-1.5 text-caption text-danger" role="alert">
          <IconAlert size={16} className="mt-px shrink-0" />
          {error}
        </p>
      ) : null}
    </div>
  );
}

/* ---------- Price ---------- */
export function Price({
  price, compareAt, locale, size = "md", labels,
}: {
  price: number;
  compareAt?: number | null;
  locale: Locale;
  size?: "md" | "lg";
  labels: { original: string; sale: string };
}) {
  const onSale = compareAt != null && compareAt > price;
  return (
    <span className={cx("inline-flex flex-wrap items-baseline gap-x-2", size === "lg" ? "text-heading font-semibold" : "text-body font-semibold")}>
      {onSale ? <span className="sr-only">{labels.sale}:</span> : null}
      <span className={onSale ? "text-green" : "text-ink"}>{formatPrice(price, locale)}</span>
      {onSale ? (
        <>
          <span className="sr-only">{labels.original}:</span>
          <s className={cx("font-normal text-ink-muted", size === "lg" ? "text-body" : "text-small")}>{formatPrice(compareAt!, locale)}</s>
        </>
      ) : null}
    </span>
  );
}

/* ---------- Badge ---------- */
export function Badge({ tone = "accent", children, className }: { tone?: "accent" | "green" | "muted"; children: ReactNode; className?: string }) {
  const tones = {
    accent: "bg-yellow text-ink",
    green: "bg-green text-on-green",
    muted: "bg-surface-alt text-green",
  };
  return <span className={cx("inline-flex h-6 items-center rounded-sm px-2 text-caption", tones[tone], className)}>{children}</span>;
}

/* ---------- Breadcrumbs ---------- */
export function Breadcrumbs({ items, label }: { items: { href?: string; label: string }[]; label: string }) {
  return (
    <nav aria-label={label} className="text-caption text-ink-muted">
      <ol className="flex flex-wrap items-center gap-1">
        {items.map((it, i) => (
          <li key={i} className="flex items-center gap-1">
            {i > 0 ? <IconChevronRight size={14} className="text-line-strong" /> : null}
            {it.href ? (
              <Link href={it.href} className="underline-offset-4 hover:text-green hover:underline">{it.label}</Link>
            ) : (
              <span aria-current="page" className="text-ink">{it.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

/* ---------- Notices / empty states ---------- */
export function Notice({ tone = "info", title, children, className }: { tone?: "info" | "error" | "sample"; title?: string; children: ReactNode; className?: string }) {
  const tones = {
    info: "bg-surface-alt text-ink border-transparent",
    error: "bg-danger-bg text-ink border-danger/30",
    sample: "bg-paper text-ink border-line",
  };
  return (
    <div role={tone === "error" ? "alert" : "status"} className={cx("rounded-md border p-4 text-small", tones[tone], className)}>
      {title ? <p className="mb-1 font-semibold text-ink">{title}</p> : null}
      <div>{children}</div>
    </div>
  );
}

export function EmptyState({ title, body, action }: { title: string; body?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-lg bg-surface-alt px-6 py-10 md:px-10">
      <p className="text-subheading text-green">{title}</p>
      {body ? <p className="max-w-prose text-ink-muted">{body}</p> : null}
      {action}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cx("animate-pulse rounded-md bg-line/60 motion-reduce:animate-none", className)} />;
}

/* ---------- Section heading ---------- */
export function SectionHeading({ title, intro, action, id }: { title: string; intro?: string; action?: ReactNode; id?: string }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-x-6 gap-y-2 md:mb-8">
      <div className="max-w-2xl">
        <h2 id={id} className="text-heading">{title}</h2>
        {intro ? <p className="mt-1 text-ink-muted">{intro}</p> : null}
      </div>
      {action}
    </div>
  );
}
