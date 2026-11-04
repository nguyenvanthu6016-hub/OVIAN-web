import { timingSafeEqual } from "node:crypto";
import { revalidateTag } from "next/cache";
import { json } from "@/lib/api";

/** Sanity webhook -> POST /api/revalidate with header Authorization: Bearer REVALIDATE_SECRET */
export async function POST(req: Request) {
  const secret = process.env.REVALIDATE_SECRET;
  const given = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!secret || given.length !== secret.length || !timingSafeEqual(Buffer.from(given), Buffer.from(secret))) {
    return json({ error: "unauthorized" }, 401);
  }
  revalidateTag("content", "max");
  revalidateTag("products", "max");
  return json({ ok: true });
}
