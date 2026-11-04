import "server-only";
import { CommerceUnavailableError, OrderOutcomeUnknownError } from "../types";

/**
 * Minimal Sapo Admin REST client (https://{store}.mysapo.net/admin/*.json).
 * Endpoint shapes follow support.sapo.vn API reference. See docs/SAPO_API.md for what is verified.
 * Never import this from client components: it reads secrets.
 */

export interface SapoConfig {
  domain: string;
  accessToken?: string;
  apiKey?: string;
  apiSecret?: string;
  allowOrderWrites: boolean;
}

export function readSapoConfig(): SapoConfig {
  const domain = process.env.SAPO_STORE_DOMAIN?.trim();
  if (!domain || domain === "your-store.mysapo.net") {
    throw new CommerceUnavailableError("SAPO_STORE_DOMAIN is not configured");
  }
  const accessToken = process.env.SAPO_ACCESS_TOKEN?.trim() || undefined;
  const apiKey = process.env.SAPO_API_KEY?.trim() || undefined;
  const apiSecret = process.env.SAPO_API_SECRET?.trim() || undefined;
  if (!accessToken && !(apiKey && apiSecret)) {
    throw new CommerceUnavailableError("Sapo credentials are not configured");
  }
  return { domain, accessToken, apiKey, apiSecret, allowOrderWrites: process.env.SAPO_ALLOW_ORDER_WRITES === "true" };
}

function headers(cfg: SapoConfig): HeadersInit {
  const h: Record<string, string> = { "Content-Type": "application/json", Accept: "application/json" };
  if (cfg.accessToken) h["X-Sapo-Access-Token"] = cfg.accessToken;
  else h.Authorization = `Basic ${Buffer.from(`${cfg.apiKey}:${cfg.apiSecret}`).toString("base64")}`;
  return h;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export interface SapoGetOptions {
  /** seconds; undefined = no cache (authoritative reads) */
  revalidate?: number;
  tags?: string[];
}

export async function sapoGet<T>(path: string, opts: SapoGetOptions = {}): Promise<T> {
  const cfg = readSapoConfig();
  const url = `https://${cfg.domain}/admin${path}`;
  let lastError = "";
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url, {
        headers: headers(cfg),
        signal: AbortSignal.timeout(10_000),
        ...(opts.revalidate === undefined
          ? { cache: "no-store" as const }
          : { next: { revalidate: opts.revalidate, tags: opts.tags } }),
      });
      if (res.status === 429 || res.status >= 500) {
        lastError = `HTTP ${res.status}`;
        const retryAfter = Number(res.headers.get("Retry-After")) || 0.5 * 2 ** attempt;
        await sleep(Math.min(retryAfter, 4) * 1000);
        continue;
      }
      if (res.status === 404) throw new SapoNotFound();
      if (!res.ok) throw new CommerceUnavailableError("Sapo request failed", `HTTP ${res.status} ${path}`);
      return (await res.json()) as T;
    } catch (e) {
      if (e instanceof SapoNotFound || e instanceof CommerceUnavailableError) throw e;
      lastError = e instanceof Error ? e.name : "network";
      await sleep(300 * 2 ** attempt);
    }
  }
  throw new CommerceUnavailableError("Sapo unavailable", `${lastError} ${path}`);
}

export class SapoNotFound extends Error {
  constructor() {
    super("Sapo resource not found");
  }
}

/**
 * POST without retries. Any ambiguous failure (timeout, network, 5xx) becomes OrderOutcomeUnknownError
 * so the caller reconciles before trying again — never blind-retry an order creation.
 */
export async function sapoPostOrder<T>(path: string, body: unknown): Promise<T> {
  const cfg = readSapoConfig();
  if (!cfg.allowOrderWrites) {
    throw new CommerceUnavailableError("Order writes disabled (SAPO_ALLOW_ORDER_WRITES is not true)");
  }
  let res: Response;
  try {
    res = await fetch(`https://${cfg.domain}/admin${path}`, {
      method: "POST",
      headers: headers(cfg),
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(20_000),
      cache: "no-store",
    });
  } catch {
    throw new OrderOutcomeUnknownError();
  }
  if (res.status >= 500) throw new OrderOutcomeUnknownError(`Sapo HTTP ${res.status}`);
  if (res.status === 429) throw new CommerceUnavailableError("Sapo rate limited");
  if (!res.ok) {
    // 4xx: request rejected, no order created. Log status only — the body may echo customer data.
    console.error(`[sapo] order rejected HTTP ${res.status}`);
    throw new CommerceUnavailableError("Sapo rejected the order", `HTTP ${res.status}`);
  }
  return (await res.json()) as T;
}
