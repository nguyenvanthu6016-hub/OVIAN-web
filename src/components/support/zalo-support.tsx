import { IconChat } from "@/components/ui/icons";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { t } from "@/lib/i18n/dictionaries";

type D = Pick<Dictionary, "support">;

/** Zalo opens by phone number; the link wants digits only. */
/** One place builds the Zalo link, so the checkout and the support card cannot disagree. */
export const zaloHref = (phone: string) => `https://zalo.me/${phone.replace(/\D/g, "")}`;

/**
 * A quiet way to reach a person. OVIAN takes cash on delivery and handles returns by hand, so a
 * customer with a problem has nothing to self-serve — they need the shop. This sits out of the
 * way until it is wanted, above the mobile purchase bar so it never covers "add to cart".
 */
export function ZaloFab({ phone, dict }: { phone: string; dict: D }) {
  return (
    <a
      href={zaloHref(phone)}
      target="_blank"
      rel="noopener noreferrer"
      data-testid="zalo-fab"
      className="fixed bottom-20 right-4 z-30 inline-flex items-center gap-2 rounded-full border border-green/30 bg-paper py-2.5 pl-3 pr-4 text-small font-semibold text-green shadow-[0_8px_24px_-12px_rgba(31,42,34,0.45)] transition-colors hover:bg-surface-alt focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green lg:bottom-6 lg:right-6"
    >
      <IconChat size={20} />
      {dict.support.fab}
    </a>
  );
}

/**
 * Shown where a customer is most likely to need help: just after ordering, and while tracking.
 * It names the number in full, because a Zalo link does nothing on a desktop without the app.
 */
export function SupportCard({ phone, dict, orderRef }: { phone: string; dict: D; orderRef?: string }) {
  return (
    <section className="rounded-md border border-line bg-surface-alt p-5" aria-labelledby="support-title">
      <h2 id="support-title" className="flex items-center gap-2 text-subheading">
        <IconChat size={22} />
        {dict.support.title}
      </h2>
      <p className="mt-2 max-w-prose text-small">
        {orderRef ? t(dict.support.bodyWithRef, { ref: orderRef }) : dict.support.body}
      </p>
      <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
        <a
          href={zaloHref(phone)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-sm bg-green px-4 py-2.5 text-small font-semibold text-on-green focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green"
        >
          {t(dict.support.openZalo, { phone })}
        </a>
        <a href={`tel:${phone.replace(/\D/g, "")}`} className="text-small font-semibold text-green underline underline-offset-4">
          {t(dict.support.call, { phone })}
        </a>
      </p>
      <p className="mt-3 text-caption text-ink-muted">{dict.support.hint}</p>
    </section>
  );
}
