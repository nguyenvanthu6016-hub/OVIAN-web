"use client";

import { toggleWishlist, useWishlist } from "@/lib/client/stores";
import { IconHeart } from "@/components/ui/icons";
import { cx } from "@/components/ui/primitives";

export function WishlistButton({ productId, name, labels, variant = "icon" }: { productId: string; name: string; labels: { save: string; saved: string }; variant?: "icon" | "full" }) {
  const ids = useWishlist();
  const saved = ids.includes(productId);
  if (variant === "full") {
    return (
      <button
        type="button"
        aria-pressed={saved}
        onClick={() => toggleWishlist(productId)}
        className="inline-flex h-12 items-center justify-center gap-2 rounded-md border border-line-strong px-4 text-small font-semibold text-ink transition-colors duration-150 hover:border-green hover:text-green cursor-pointer"
      >
        <IconHeart filled={saved} className={saved ? "text-green" : ""} />
        {saved ? labels.saved : labels.save}
      </button>
    );
  }
  return (
    <button
      type="button"
      aria-pressed={saved}
      aria-label={`${labels.save}: ${name}`}
      onClick={() => toggleWishlist(productId)}
      className={cx(
        "relative z-10 inline-flex size-10 items-center justify-center rounded-full bg-surface/85 transition-colors duration-150 hover:bg-surface cursor-pointer",
        saved ? "text-green" : "text-ink",
      )}
    >
      <IconHeart size={20} filled={saved} />
    </button>
  );
}
