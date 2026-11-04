import "server-only";
import { NextResponse } from "next/server";
import type { ZodError } from "zod";
import { CommerceUnavailableError } from "@/lib/commerce/types";

export function json(data: unknown, status = 200, headers: Record<string, string> = {}) {
  return NextResponse.json(data, { status, headers: { "Cache-Control": "no-store", ...headers } });
}

export function validationError(err: ZodError) {
  return json(
    {
      error: "validation",
      fields: err.issues.map((i) => ({ path: i.path.join("."), code: i.message })),
    },
    400,
  );
}

export function handleError(e: unknown, where: string) {
  if (e instanceof CommerceUnavailableError) {
    // Log the technical cause (never secrets or customer data); return a generic message.
    console.error(`[${where}] commerce unavailable: ${e.message}${e.causeDetail ? ` (${e.causeDetail})` : ""}`);
    return json({ error: "unavailable" }, 503);
  }
  console.error(`[${where}] unexpected error`, e instanceof Error ? e.message : e);
  return json({ error: "server" }, 500);
}

/** Rate limits are relaxed when the test control is enabled (E2E). */
export function limitFor(base: number) {
  return process.env.MOCK_CONTROL === "true" ? base * 20 : base;
}
