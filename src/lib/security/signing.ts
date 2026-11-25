import "server-only";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * One HMAC key for everything the server hands the browser and must trust back: the anti-bot form
 * token and the upsell offer. Keeping it in one place means one environment variable to set, and
 * one place to rotate.
 */

/** Set ORDER_TOKEN_SECRET in production so signatures survive a restart or a second instance. */
let fallbackSecret: string | null = null;
function tokenSecret(): string {
  const env = process.env.ORDER_TOKEN_SECRET?.trim() || process.env.GOOGLE_SHEETS_SECRET?.trim();
  if (env && env.length >= 16) return env;
  fallbackSecret ??= randomBytes(32).toString("hex");
  return fallbackSecret;
}

export const signPayload = (payload: string): string => createHmac("sha256", tokenSecret()).update(payload).digest("base64url");

/** Constant-time comparison, so a wrong signature leaks nothing about the right one. */
export function verifyPayload(payload: string, signature: string): boolean {
  const given = Buffer.from(signature);
  const expected = Buffer.from(signPayload(payload));
  return given.length === expected.length && timingSafeEqual(given, expected);
}
