import { z } from "zod";
import { checkOrderStatus } from "@/lib/checkout/place-order";
import { handleError, json, limitFor } from "@/lib/api";
import { clientIp, rateLimit } from "@/lib/security/rate-limit";

const schema = z.object({ checkoutId: z.string().uuid() });

/** Reconciles an unknown order outcome. The checkoutId is a random UUID held only by the customer browser. */
export async function POST(req: Request) {
  const rl = rateLimit(`order-status:${clientIp(req)}`, limitFor(20), 60_000);
  if (!rl.ok) return json({ error: "rate-limited" }, 429);
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json({ error: "validation" }, 400);
  try {
    const r = await checkOrderStatus(parsed.data.checkoutId, null);
    return r.kind === "created" ? json({ status: "created", order: r.order }) : json({ status: "unknown" }, 202);
  } catch (e) {
    return handleError(e, "order-status");
  }
}
