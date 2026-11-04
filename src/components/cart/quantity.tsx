"use client";

import { IconMinus, IconPlus } from "@/components/ui/icons";

export function QuantityStepper({
  value, onChange, max, min = 1, labels, id, size = "md",
}: {
  value: number;
  onChange: (n: number) => void;
  max?: number | null;
  min?: number;
  labels: { quantity: string; decrease: string; increase: string };
  id: string;
  size?: "sm" | "md";
}) {
  const hi = Math.min(99, max ?? 99);
  const btn = size === "sm" ? "size-9" : "size-11";
  return (
    <div className="inline-flex items-center rounded-md border border-line-strong bg-paper" role="group" aria-label={labels.quantity}>
      <button type="button" className={`${btn} inline-flex items-center justify-center text-ink hover:text-green disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed`} onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min} aria-label={labels.decrease}>
        <IconMinus size={18} />
      </button>
      <label htmlFor={id} className="sr-only">{labels.quantity}</label>
      <input
        id={id}
        type="number"
        inputMode="numeric"
        min={min}
        max={hi}
        value={value}
        onChange={(e) => {
          const n = Number(e.target.value);
          if (Number.isFinite(n)) onChange(Math.min(hi, Math.max(min, Math.round(n))));
        }}
        className="h-9 w-10 border-0 bg-transparent text-center text-small font-semibold [appearance:textfield] focus-visible:outline-2 focus-visible:outline-green [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      />
      <button type="button" className={`${btn} inline-flex items-center justify-center text-ink hover:text-green disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed`} onClick={() => onChange(Math.min(hi, value + 1))} disabled={value >= hi} aria-label={labels.increase}>
        <IconPlus size={18} />
      </button>
    </div>
  );
}
