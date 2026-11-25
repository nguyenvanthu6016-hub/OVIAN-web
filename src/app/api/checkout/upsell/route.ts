import { buildUpsellOffer } from "@/lib/checkout/upsell-offer";
import { upsellRequestSchema } from "@/lib/checkout/schema";
import { handleError, json, limitFor, validationError } from "@/lib/api";
import { clientIp, rateLimit } from "@/lib/security/rate-limit";

export async function POST(req: Request) {
  const rl = rateLimit(`upsell:${clientIp(req)}`, limitFor(30), 60_000);
  if (!rl.ok) return json({ error: "rate-limited" }, 429, { "Retry-After": String(rl.retryAfter) });
  const parsed = upsellRequestSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return validationError(parsed.error);
  try {
    const { checkoutId, lines, locale } = parsed.data;
    // No offer is a normal answer, not an error: the checkout page simply shows nothing. The
    // reason rides along so an empty checkout can be diagnosed without another deploy.
    return json(await buildUpsellOffer(checkoutId, lines.map((l) => l.variantId), locale));
  } catch (e) {
    return handleError(e, "upsell");
  }
}
