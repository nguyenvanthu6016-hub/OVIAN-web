/**
 * Meta (Facebook) Pixel. Switched on by NEXT_PUBLIC_FACEBOOK_PIXEL_ID; with no id nothing is
 * loaded and every call here is a no-op, so the site runs the same without it.
 *
 * Only what an ad report needs is sent: the event name, the amount and the product ids.
 * No name, phone number, email or address ever goes to Meta.
 */

declare global {
  interface Window {
    fbq?: ((...args: unknown[]) => void) & { queue?: unknown[]; loaded?: boolean };
    _fbq?: unknown;
  }
}

export const pixelId = (): string => process.env.NEXT_PUBLIC_FACEBOOK_PIXEL_ID?.trim() ?? "";

type PixelEvent = "PageView" | "ViewContent" | "AddToCart" | "InitiateCheckout" | "Purchase";

interface PixelParams {
  value?: number;
  currency?: "VND";
  content_ids?: string[];
  content_type?: "product";
  num_items?: number;
}

/**
 * `eventId` lets Meta discard a duplicate if the same event is ever also sent from the server
 * (Conversions API). For an order, pass the order number.
 */
type Pending = [PixelEvent, PixelParams, string | undefined];

/**
 * The pixel script loads after the page becomes interactive, so an event raised while a page is
 * opening — ViewContent on a product page, InitiateCheckout on checkout — can run before `fbq`
 * exists. That is the common case for someone arriving straight from an ad, so those events wait
 * here and are sent by flushPending() as soon as the script is ready.
 */
const pending: Pending[] = [];

function send(event: PixelEvent, params: PixelParams, eventId?: string): void {
  try {
    window.fbq!("track", event, params, eventId ? { eventID: eventId } : undefined);
  } catch {
    // Analytics must never break the shop.
  }
}

export function track(event: PixelEvent, params: PixelParams = {}, eventId?: string): void {
  if (typeof window === "undefined") return;
  if (!window.fbq) {
    if (!pixelId() || pending.length >= 20) return;
    pending.push([event, params, eventId]);
    waitForPixel();
    return;
  }
  send(event, params, eventId);
}

/** Sends anything held while the pixel script was still loading. */
export function flushPending(): void {
  if (typeof window === "undefined" || !window.fbq) return;
  for (const [event, params, eventId] of pending.splice(0)) send(event, params, eventId);
}

/**
 * Watches for the pixel script to appear, then flushes. Polling rather than next/script's
 * onReady, which does not fire for an inline script — the symptom was ViewContent never
 * arriving for a visitor who landed straight on a product page.
 */
let watching = false;
function waitForPixel(): void {
  if (watching) return;
  watching = true;
  let tries = 0;
  const timer = setInterval(() => {
    tries += 1;
    if (window.fbq) flushPending();
    if (window.fbq || tries >= 40) {
      clearInterval(timer);
      watching = false;
    }
  }, 150);
}

/**
 * Reports an event at most once per browser session for a given id. Used for Purchase: the
 * checkout form hands the same order back when "Kiểm tra lại" finds an order that was already
 * created, and that must not count as a second sale. Meta also de-duplicates on eventID, so a
 * browser that refuses sessionStorage is still covered.
 */
export function trackOnce(event: PixelEvent, params: PixelParams, eventId: string): void {
  if (typeof window === "undefined") return;
  const key = `ovian.pixel.${event}.${eventId}`;
  try {
    if (window.sessionStorage.getItem(key)) return;
    window.sessionStorage.setItem(key, "1");
  } catch {
    // Private mode or storage disabled: fall through and let Meta de-duplicate.
  }
  track(event, params, eventId);
}
