import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { beginCheckout, finishCheckout, releaseCheckout } from "@/lib/checkout/idempotency";
import { placeOrder } from "@/lib/checkout/place-order";
import { mockState, resetMockState } from "@/lib/commerce/mock/provider";
import type { OrderRequest } from "@/lib/checkout/schema";

beforeEach(() => {
  process.env.IDEMPOTENCY_STORE_PATH = join(mkdtempSync(join(tmpdir(), "ovian-idem-")), "store.json");
  process.env.COMMERCE_MODE = "mock";
  process.env.CONTENT_MODE = "mock";
  resetMockState();
});

describe("idempotency store", () => {
  it("claims once, then returns the existing record", async () => {
    expect((await beginCheckout("a", "fp")).kind).toBe("new");
    const again = await beginCheckout("a", "fp");
    expect(again.kind).toBe("existing");
  });
  it("concurrent claims: exactly one wins", async () => {
    const results = await Promise.all(Array.from({ length: 10 }, () => beginCheckout("race", "fp")));
    expect(results.filter((r) => r.kind === "new")).toHaveLength(1);
  });
  it("flags reuse of a completed checkoutId with a different cart", async () => {
    await beginCheckout("b", "fp1");
    await finishCheckout("b", { status: "created", fingerprint: "fp1", orderRef: "OV1", simulated: true, createdAt: Date.now() });
    expect((await beginCheckout("b", "fp2")).kind).toBe("conflict");
  });
  it("release allows a fresh attempt", async () => {
    await beginCheckout("c", "fp");
    await releaseCheckout("c");
    expect((await beginCheckout("c", "fp")).kind).toBe("new");
  });
});

const req = (over: Partial<OrderRequest> = {}): OrderRequest => ({
  checkoutId: "3b241101-e2bb-4255-8caf-4136c566a962",
  locale: "vi",
  lines: [{ variantId: "v-1005-1", quantity: 2, seenPrice: 129000 }],
  couponCode: null,
  fulfillment: "pickup",
  customer: { fullName: "Khách Thử", phone: "0912345678", email: "" },
  address: null,
  confirmedTotal: 258000,
  ...over,
});

describe("placeOrder (mock)", () => {
  it("creates one order and returns the same order for repeated submissions", async () => {
    const first = await placeOrder(req());
    expect(first.kind).toBe("created");
    const second = await placeOrder(req());
    expect(second.kind).toBe("created");
    if (first.kind === "created" && second.kind === "created") expect(second.order.ref).toBe(first.order.ref);
    expect(mockState().orders.size).toBe(1);
  });

  it("parallel double submit creates exactly one order", async () => {
    const rs = await Promise.all([placeOrder(req()), placeOrder(req()), placeOrder(req())]);
    expect(mockState().orders.size).toBe(1);
    expect(rs.filter((r) => r.kind === "created").length).toBeGreaterThanOrEqual(1);
    expect(rs.every((r) => r.kind === "created" || r.kind === "processing")).toBe(true);
  });

  it("rejects when the confirmed total no longer matches (price change)", async () => {
    mockState().price.set("v-1005-1", 139000);
    const r = await placeOrder(req());
    expect(r.kind).toBe("changed");
    expect(mockState().orders.size).toBe(0);
  });

  it("timeout after creation is reconciled without a duplicate", async () => {
    mockState().faults = { mode: "order-timeout", delayMs: 0 };
    expect((await placeOrder(req())).kind).toBe("unknown");
    mockState().faults = { mode: "none", delayMs: 0 };
    const retry = await placeOrder(req());
    expect(retry.kind).toBe("created");
    expect(mockState().orders.size).toBe(1);
  });

  it("marks pickup orders as cash at store and never paid", async () => {
    const r = await placeOrder(req());
    if (r.kind !== "created") throw new Error(r.kind);
    expect(r.order.payment).toBe("cash_at_store");
    const stored = [...mockState().orders.values()][0]!;
    expect(stored.financialStatus).toBe("pending");
  });
});
