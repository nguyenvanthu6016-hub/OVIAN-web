import { commerceMode } from "@/lib/commerce";
import { contentMode } from "@/lib/cms";
import { json } from "@/lib/api";

export const dynamic = "force-dynamic";

/** Liveness for Docker/load balancers. Does not call Sapo (avoids burning rate limit). */
export function GET() {
  return json({ ok: true, commerce: commerceMode(), content: contentMode(), time: new Date().toISOString() });
}
