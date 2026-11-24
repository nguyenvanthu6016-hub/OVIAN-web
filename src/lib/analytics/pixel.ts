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
export function track(event: PixelEvent, params: PixelParams = {}, eventId?: string): void {
  if (typeof window === "undefined" || !window.fbq) return;
  try {
    window.fbq("track", event, params, eventId ? { eventID: eventId } : undefined);
  } catch {
    // Analytics must never break the shop.
  }
}
