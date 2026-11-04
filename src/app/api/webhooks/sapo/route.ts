import { createHmac, timingSafeEqual } from "node:crypto";
import { revalidateTag } from "next/cache";
import { json } from "@/lib/api";

/**
 * Sapo webhook receiver -> cache invalidation (Hybrid Sync).
 * The HMAC header name is NOT confirmed in the Sapo docs; we accept the Shopify-style
 * X-Sapo-Hmac-Sha256 (base64 HMAC-SHA256 of the raw body). Verify with a real webhook before go-live.
 */
export async function POST(req: Request) {
  const secret = process.env.SAPO_WEBHOOK_SECRET;
  if (!secret) return json({ error: "not-configured" }, 503);
  const raw = await req.text();
  const given = req.headers.get("x-sapo-hmac-sha256") ?? "";
  const expected = createHmac("sha256", secret).update(raw, "utf8").digest("base64");
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return json({ error: "unauthorized" }, 401);

  const topic = req.headers.get("x-sapo-topic") ?? "";
  if (topic.startsWith("products/") || topic.startsWith("collections/") || topic === "") revalidateTag("products", "max");
  return json({ ok: true });
}
