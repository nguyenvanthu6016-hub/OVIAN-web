import { placeOrder } from "@/lib/checkout/place-order";
import { orderRequestSchema } from "@/lib/checkout/schema";
import { handleError, json, limitFor, validationError } from "@/lib/api";
import { clientIp, rateLimit } from "@/lib/security/rate-limit";
import { guardOrder } from "@/lib/security/anti-bot";

export async function POST(req: Request) {
  const ip = clientIp(req);
  // Two windows: a burst guard, and a slower one a bot cannot wait out cheaply.
  for (const [limit, windowMs] of [[limitFor(10), 60_000], [limitFor(5), 3600_000]] as const) {
    const rl = rateLimit(`orders:${windowMs}:${ip}`, limit, windowMs);
    if (!rl.ok) return json({ error: "rate-limited" }, 429, { "Retry-After": String(rl.retryAfter) });
  }
  const parsed = orderRequestSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return validationError(parsed.error);

  const guard = guardOrder(parsed.data);
  if (!guard.ok) {
    console.warn(`[anti-bot] order refused from ${ip}: ${guard.reason}`);
    return json({ status: "refused", error: guard.message }, 400);
  }

  try {
    const r = await placeOrder(parsed.data);
    switch (r.kind) {
      case "created": return json({ status: "created", order: r.order }, 201);
      case "processing": return json({ status: "processing" }, 202);
      case "unknown": return json({ status: "unknown" }, 202);
      case "changed": return json({ status: "changed", quote: r.quote }, 409);
      case "not-orderable": return json({ status: "not-orderable", quote: r.quote }, 422);
      case "conflict": return json({ status: "conflict" }, 409);
      case "disabled": return json({ status: "disabled" }, 503);
      case "pickup-disabled": return json({ status: "pickup-disabled" }, 400);
      case "blocked": return json({ status: "blocked", error: r.message }, 429);
    }
  } catch (e) {
    return handleError(e, "orders");
  }
}
