import { IconChat, IconChevronDown } from "@/components/ui/icons";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { t } from "@/lib/i18n/dictionaries";

type D = Pick<Dictionary, "support">;

/** Zalo opens by phone number; the link wants digits only. */
/** One place builds the Zalo link, so the checkout and the support card cannot disagree. */
export const zaloHref = (phone: string) => `https://zalo.me/${phone.replace(/\D/g, "")}`;

/**
 * Messenger, by the only route Meta still supports. The embeddable chat bubble (the Customer
 * Chat Plugin) was shut off in May 2024 and its old snippets render nothing, so a visitor is
 * sent to the Messenger app on a phone, or messenger.com on a desktop.
 */
export const messengerHref = (pageId: string) => `https://m.me/${pageId.replace(/\D/g, "")}`;

export interface SupportChannels {
  zaloPhone?: string;
  messengerPageId?: string;
}

/** True when there is at least one way to reach a person; otherwise nothing is rendered. */
export const hasSupport = (c: SupportChannels): boolean => !!(c.zaloPhone || c.messengerPageId);

/**
 * A quiet way to reach a person. OVIAN takes cash on delivery and handles returns by hand, so a
 * customer with a problem has nothing to self-serve — they need the shop.
 *
 * One button rather than one per channel: this floats over a phone screen that already carries a
 * purchase bar, and a second bubble would crowd the thing the shop is actually here to sell.
 * Built on <details>, so the panel opens, closes and takes the Escape key with no JavaScript at
 * all — it costs nothing on a site whose weakest point is how long it takes to appear.
 */
export function SupportFab({ channels, dict }: { channels: SupportChannels; dict: D }) {
  if (!hasSupport(channels)) return null;
  const only = !channels.zaloPhone !== !channels.messengerPageId;

  // With a single channel there is nothing to choose, so the button is that channel's link.
  if (only) {
    const href = channels.zaloPhone ? zaloHref(channels.zaloPhone) : messengerHref(channels.messengerPageId!);
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" data-testid="support-fab" className={fabClass}>
        <IconChat size={20} />
        {dict.support.fab}
      </a>
    );
  }

  return (
    <details className="group fixed bottom-20 right-4 z-30 lg:bottom-6 lg:right-6" data-testid="support-fab">
      <summary className={`${fabClass} relative cursor-pointer list-none [&::-webkit-details-marker]:hidden`}>
        <IconChat size={20} />
        {dict.support.fab}
        <IconChevronDown size={16} className="transition-transform duration-150 group-open:rotate-180" />
      </summary>
      <div className="absolute bottom-full right-0 mb-2 w-60 rounded-md border border-line bg-paper p-2 shadow-[0_12px_32px_-12px_rgba(31,42,34,0.5)]">
        <p className="px-2 pb-1 pt-1 text-caption text-ink-muted">{dict.support.pick}</p>
        {channels.messengerPageId ? (
          <a
            href={messengerHref(channels.messengerPageId)}
            target="_blank"
            rel="noopener noreferrer"
            data-testid="support-messenger"
            className={channelClass}
          >
            {dict.support.messenger}
          </a>
        ) : null}
        {channels.zaloPhone ? (
          <a href={zaloHref(channels.zaloPhone)} target="_blank" rel="noopener noreferrer" data-testid="support-zalo" className={channelClass}>
            {t(dict.support.zalo, { phone: channels.zaloPhone })}
          </a>
        ) : null}
      </div>
    </details>
  );
}

const fabClass =
  "inline-flex items-center gap-2 rounded-full border border-green/30 bg-paper py-2.5 pl-3 pr-4 text-small font-semibold text-green shadow-[0_8px_24px_-12px_rgba(31,42,34,0.45)] transition-colors hover:bg-surface-alt focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green";

const channelClass =
  "flex min-h-11 items-center rounded-sm px-2 text-small font-semibold text-green hover:bg-surface-alt focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-green";

/**
 * Shown where a customer is most likely to need help: just after ordering, and while tracking.
 * It names the number in full, because a Zalo link does nothing on a desktop without the app.
 */
export function SupportCard({ channels, dict, orderRef }: { channels: SupportChannels; dict: D; orderRef?: string }) {
  const { zaloPhone, messengerPageId } = channels;
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
        {zaloPhone ? (
          <a
            href={zaloHref(zaloPhone)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-sm bg-green px-4 py-2.5 text-small font-semibold text-on-green focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green"
          >
            {t(dict.support.openZalo, { phone: zaloPhone })}
          </a>
        ) : null}
        {messengerPageId ? (
          <a href={messengerHref(messengerPageId)} target="_blank" rel="noopener noreferrer" className="text-small font-semibold text-green underline underline-offset-4">
            {dict.support.messenger}
          </a>
        ) : null}
        {zaloPhone ? (
          <a href={`tel:${zaloPhone.replace(/\D/g, "")}`} className="text-small font-semibold text-green underline underline-offset-4">
            {t(dict.support.call, { phone: zaloPhone })}
          </a>
        ) : null}
      </p>
      <p className="mt-3 text-caption text-ink-muted">{dict.support.hint}</p>
    </section>
  );
}
