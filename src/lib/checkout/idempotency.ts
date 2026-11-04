import "server-only";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

/**
 * Durable idempotency store for order submission.
 *
 * Storage: a JSON file (IDEMPOTENCY_STORE_PATH). Writes are serialised in-process and replaced
 * atomically (write temp + rename), so a crash never leaves a half-written file.
 * Durable across restarts on a single host (VPS/Docker with a volume).
 * NOT shared across serverless instances — see ARCHITECTURE §5 for the production option.
 *
 * Only non-personal data is stored: checkoutId, request fingerprint, status, order ref, timestamps.
 */

export type IdemRecord =
  | { status: "pending"; fingerprint: string; startedAt: number }
  | { status: "created"; fingerprint: string; orderRef: string; simulated: boolean; createdAt: number }
  | { status: "unknown"; fingerprint: string; startedAt: number };

const TTL_MS = 7 * 24 * 3600 * 1000;
/** A pending record older than this means the process died mid-request → reconcile. */
export const PENDING_STALE_MS = 60_000;

const storePath = () => resolve(process.cwd(), process.env.IDEMPOTENCY_STORE_PATH || ".data/idempotency.json");

let chain: Promise<unknown> = Promise.resolve();
function serialised<T>(fn: () => Promise<T>): Promise<T> {
  const next = chain.then(fn, fn);
  chain = next.catch(() => undefined);
  return next;
}

async function load(): Promise<Record<string, IdemRecord>> {
  try {
    return JSON.parse(await readFile(storePath(), "utf8")) as Record<string, IdemRecord>;
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return {};
    throw e; // a corrupt store must fail loudly rather than allow duplicates
  }
}

async function save(data: Record<string, IdemRecord>) {
  const p = storePath();
  await mkdir(dirname(p), { recursive: true });
  const now = Date.now();
  for (const [k, v] of Object.entries(data)) {
    const t = v.status === "created" ? v.createdAt : v.startedAt;
    if (now - t > TTL_MS) delete data[k];
  }
  const tmp = `${p}.${process.pid}.${now}.tmp`;
  await writeFile(tmp, JSON.stringify(data), "utf8");
  await rename(tmp, p);
}

export type BeginResult =
  | { kind: "new" }
  | { kind: "existing"; record: IdemRecord }
  | { kind: "conflict" };

/** Atomically claim a checkoutId. Returns the existing record if it was already used. */
export function beginCheckout(checkoutId: string, fingerprint: string): Promise<BeginResult> {
  return serialised(async () => {
    const data = await load();
    const existing = data[checkoutId];
    if (existing) {
      if (existing.fingerprint !== fingerprint && existing.status === "created") return { kind: "conflict" };
      return { kind: "existing", record: existing };
    }
    data[checkoutId] = { status: "pending", fingerprint, startedAt: Date.now() };
    await save(data);
    return { kind: "new" };
  });
}

export function finishCheckout(checkoutId: string, record: IdemRecord): Promise<void> {
  return serialised(async () => {
    const data = await load();
    data[checkoutId] = record;
    await save(data);
  });
}

/** Release a claim when the backend definitively rejected the order (nothing was created). */
export function releaseCheckout(checkoutId: string): Promise<void> {
  return serialised(async () => {
    const data = await load();
    delete data[checkoutId];
    await save(data);
  });
}
