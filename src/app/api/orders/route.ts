import { placeOrder } from "@/lib/checkout/place-order";
import { orderRequestSchema } from "@/lib/checkout/schema";
import { handleError, json, limitFor, validationError } from "@/lib/api";
import { clientIp, rateLimit } from "@/lib/security/rate-limit";

export async function POST(req: Request) {
  const rl = rateLimit(`orders:${clientIp(req)}`, limitFor(10), 60_000);
  if (!rl.ok) return json({ error: "rate-limited" }, 429, { "Retry-After": String(rl.retryAfter) });
  const parsed = orderRequestSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return validationError(parsed.error);
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
    }
  } catch (e) {
    return handleError(e, "orders");
  }
}
