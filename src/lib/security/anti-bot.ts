import "server-only";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * Layer 1 anti-spam for the order form. Nothing here is visible to a real customer.
 *
 * - Signed form token: the checkout page issues one; the order must come back with it, and no
 *   sooner than MIN_FORM_MS after it was issued. A bot that posts straight to /api/orders has no
 *   valid token, and one that replays an old page is cut off by MAX_TOKEN_MS.
 * - Honeypot: a hidden field real people never fill in.
 * - Order caps: an absurd total or item count is refused rather than sent to the shop.
 *
 * Durable per-phone limits and the blocklist live in the Google Sheet (Apps Script), because this
 * process keeps no state across restarts and may run in more than one copy.
 */

const MIN_FORM_MS = 3_000;
const MAX_TOKEN_MS = 6 * 3600_000;

/** Signing key. Set ORDER_TOKEN_SECRET in production so tokens survive a restart or a second instance. */
let fallbackSecret: string | null = null;
function tokenSecret(): string {
  const env = process.env.ORDER_TOKEN_SECRET?.trim() || process.env.GOOGLE_SHEETS_SECRET?.trim();
  if (env && env.length >= 16) return env;
  fallbackSecret ??= randomBytes(32).toString("hex");
  return fallbackSecret;
}

const sign = (payload: string) => createHmac("sha256", tokenSecret()).update(payload).digest("base64url");

/** Called when the checkout page is rendered. */
export function issueOrderToken(now = Date.now()): string {
  const payload = String(now);
  return `${payload}.${sign(payload)}`;
}

export type TokenCheck = "ok" | "missing" | "invalid" | "too-fast" | "expired";

export function checkOrderToken(token: string | undefined, now = Date.now()): TokenCheck {
  if (!token) return "missing";
  const dot = token.lastIndexOf(".");
  if (dot < 1) return "invalid";
  const payload = token.slice(0, dot);
  const given = Buffer.from(token.slice(dot + 1));
  const expected = Buffer.from(sign(payload));
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return "invalid";
  const issuedAt = Number(payload);
  if (!Number.isFinite(issuedAt)) return "invalid";
  const age = now - issuedAt;
  if (age < MIN_FORM_MS) return "too-fast";
  if (age > MAX_TOKEN_MS) return "expired";
  return "ok";
}

const num = (v: string | undefined, fallback: number) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

export const maxOrderTotal = () => num(process.env.MAX_ORDER_TOTAL, 5_000_000);
export const maxOrderItems = () => num(process.env.MAX_ORDER_ITEMS, 20);

export interface OrderGuardInput {
  token?: string;
  /** Honeypot field: empty for a real customer. */
  website?: string;
  lines: { quantity: number }[];
  confirmedTotal: number;
}

export type GuardResult = { ok: true } | { ok: false; reason: string; message: "retry" | "too-large" };

/**
 * Runs before anything is priced or written. `message` picks what the customer is told:
 * "retry" stays vague on purpose (a bot should not learn which check caught it).
 */
export function guardOrder(input: OrderGuardInput, now = Date.now()): GuardResult {
  if (input.website?.trim()) return { ok: false, reason: "honeypot", message: "retry" };
  const token = checkOrderToken(input.token, now);
  if (token !== "ok") return { ok: false, reason: `token-${token}`, message: "retry" };
  const items = input.lines.reduce((s, l) => s + l.quantity, 0);
  if (items > maxOrderItems()) return { ok: false, reason: `items-${items}`, message: "too-large" };
  if (input.confirmedTotal > maxOrderTotal()) return { ok: false, reason: `total-${input.confirmedTotal}`, message: "too-large" };
  return { ok: true };
}
