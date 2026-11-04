"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { IconClose } from "./icons";
import { cx } from "./primitives";

/**
 * Accessible drawer built on <dialog> (native focus trap, Esc to close, inert background).
 */
export function Drawer({
  open, onClose, title, side = "right", closeLabel, children, footer, id,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  side?: "left" | "right";
  closeLabel: string;
  children: ReactNode;
  footer?: ReactNode;
  id?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) {
      d.showModal();
      document.documentElement.style.overflow = "hidden";
    }
    if (!open && d.open) {
      d.close();
    }
    return () => {
      document.documentElement.style.overflow = "";
    };
  }, [open]);

  return (
    <dialog
      ref={ref}
      id={id}
      aria-labelledby={id ? `${id}-title` : undefined}
      onClose={() => { document.documentElement.style.overflow = ""; onClose(); }}
      onCancel={(e) => { e.preventDefault(); onClose(); }}
      onClick={(e) => { if (e.target === ref.current) onClose(); }}
      className={cx(
        "ovian-drawer fixed inset-y-0 m-0 h-dvh max-h-none w-[min(26rem,100vw)] max-w-none bg-surface p-0 text-ink backdrop:bg-ink/40",
        side === "right" ? "right-0 left-auto" : "left-0 right-auto",
      )}
      data-side={side}
    >
      <div className="flex h-full flex-col">
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-line px-4">
          <h2 id={id ? `${id}-title` : undefined} className="text-subheading">{title}</h2>
          <button type="button" onClick={onClose} className="inline-flex size-11 items-center justify-center rounded-md text-ink hover:bg-surface-alt" aria-label={closeLabel}>
            <IconClose />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">{children}</div>
        {footer ? <div className="shrink-0 border-t border-line bg-surface p-4">{footer}</div> : null}
      </div>
    </dialog>
  );
}
