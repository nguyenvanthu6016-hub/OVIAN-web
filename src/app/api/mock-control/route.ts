import { z } from "zod";
import { commerceMode } from "@/lib/commerce";
import { mockState, resetMockState } from "@/lib/commerce/mock/provider";
import { json } from "@/lib/api";

/**
 * TEST-ONLY fault injection for Mock Mode (E2E scenarios: stock/price change, outage, timeout).
 * Disabled unless COMMERCE_MODE=mock AND MOCK_CONTROL=true, and always disabled in production builds.
 */
const schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("reset") }),
  z.object({ action: z.literal("stock"), variantId: z.string(), stock: z.number().int().nullable() }),
  z.object({ action: z.literal("price"), variantId: z.string(), price: z.number().int().positive() }),
  z.object({ action: z.literal("faults"), mode: z.enum(["none", "unavailable", "order-timeout"]), delayMs: z.number().int().min(0).max(30000).default(0) }),
]);

export async function POST(req: Request) {
  // Never available in a production build, whatever the environment says.
  if (process.env.NODE_ENV === "production" || commerceMode() !== "mock" || process.env.MOCK_CONTROL !== "true") return json({ error: "not-found" }, 404);
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json({ error: "validation" }, 400);
  const st = mockState();
  const a = parsed.data;
  if (a.action === "reset") resetMockState();
  if (a.action === "stock") st.stock.set(a.variantId, a.stock);
  if (a.action === "price") st.price.set(a.variantId, a.price);
  if (a.action === "faults") st.faults = { mode: a.mode, delayMs: a.delayMs };
  return json({ ok: true });
}
