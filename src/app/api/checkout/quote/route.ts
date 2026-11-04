import { buildQuote } from "@/lib/checkout/quote";
import { quoteRequestSchema } from "@/lib/checkout/schema";
import { handleError, json, limitFor, validationError } from "@/lib/api";
import { clientIp, rateLimit } from "@/lib/security/rate-limit";

export async function POST(req: Request) {
  const rl = rateLimit(`quote:${clientIp(req)}`, limitFor(60), 60_000);
  if (!rl.ok) return json({ error: "rate-limited" }, 429, { "Retry-After": String(rl.retryAfter) });
  const body = await req.json().catch(() => null);
  const parsed = quoteRequestSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);
  try {
    return json({ quote: await buildQuote(parsed.data) });
  } catch (e) {
    return handleError(e, "quote");
  }
}
