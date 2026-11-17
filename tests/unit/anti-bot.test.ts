import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { checkOrderToken, guardOrder, issueOrderToken } from "@/lib/security/anti-bot";
import { sheetsOrders, OrderRefusedError } from "@/lib/orders/sheets";
import { resetMockState } from "@/lib/commerce/mock/provider";
import type { CreateOrderInput } from "@/lib/commerce/types";
import { loadAppsScript } from "./apps-script-harness";

const SECRET = "test-secret-0123456789abcdefghij";
const FOUR_SECONDS_AGO = () => Date.now() - 4_000;

beforeEach(() => {
  process.env.ORDER_TOKEN_SECRET = "anti-bot-test-secret-0123456789";
});
afterEach(() => {
  for (const k of ["ORDER_TOKEN_SECRET", "MAX_ORDER_TOTAL", "MAX_ORDER_ITEMS"]) delete process.env[k];
});

const order = (over: Partial<Parameters<typeof guardOrder>[0]> = {}) => ({
  token: issueOrderToken(FOUR_SECONDS_AGO()),
  lines: [{ quantity: 1 }],
  confirmedTotal: 140_000,
  ...over,
});

describe("order form token", () => {
  it("accepts a token the checkout page issued a few seconds ago", () => {
    expect(checkOrderToken(issueOrderToken(FOUR_SECONDS_AGO()))).toBe("ok");
  });

  it("rejects a missing, malformed or tampered token", () => {
    expect(checkOrderToken(undefined)).toBe("missing");
    expect(checkOrderToken("nonsense")).toBe("invalid");
    const good = issueOrderToken(FOUR_SECONDS_AGO());
    // Same age claimed, signature from another key: a bot cannot mint its own token.
    expect(checkOrderToken(`${good.split(".")[0]}.AAAA${good.split(".")[1]!.slice(4)}`)).toBe("invalid");
    // Age rewritten to look older while keeping the original signature.
    expect(checkOrderToken(`${Date.now() - 10_000}.${good.split(".")[1]}`)).toBe("invalid");
  });

  it("rejects a form submitted in under 3 seconds, and one left open for hours", () => {
    expect(checkOrderToken(issueOrderToken(Date.now() - 500))).toBe("too-fast");
    expect(checkOrderToken(issueOrderToken(Date.now() - 7 * 3600_000))).toBe("expired");
  });

  it("does not accept a token signed with a different secret", () => {
    const token = issueOrderToken(FOUR_SECONDS_AGO());
    process.env.ORDER_TOKEN_SECRET = "a-completely-different-secret-00";
    expect(checkOrderToken(token)).toBe("invalid");
  });
});

describe("guardOrder", () => {
  it("lets a normal order through", () => {
    expect(guardOrder(order())).toEqual({ ok: true });
  });

  it("refuses when the hidden honeypot field is filled in", () => {
    const r = guardOrder(order({ website: "http://spam.example" }));
    expect(r).toMatchObject({ ok: false, reason: "honeypot", message: "retry" });
  });

  it("refuses an order posted without a valid token", () => {
    expect(guardOrder(order({ token: undefined })).ok).toBe(false);
    expect(guardOrder(order({ token: issueOrderToken() })).ok).toBe(false); // instant submit
  });

  it("refuses absurd quantities and totals, and says so plainly", () => {
    expect(guardOrder(order({ lines: [{ quantity: 15 }, { quantity: 10 }] }))).toMatchObject({ ok: false, message: "too-large" });
    expect(guardOrder(order({ confirmedTotal: 9_000_000 }))).toMatchObject({ ok: false, message: "too-large" });
    // Both limits are configurable.
    process.env.MAX_ORDER_ITEMS = "40";
    process.env.MAX_ORDER_TOTAL = "20000000";
    expect(guardOrder(order({ lines: [{ quantity: 25 }], confirmedTotal: 9_000_000 }))).toEqual({ ok: true });
  });

  it("checks the honeypot before anything else, so a bot learns nothing from the reply", () => {
    const r = guardOrder(order({ token: undefined, website: "x", confirmedTotal: 9_000_000 }));
    expect(r).toMatchObject({ reason: "honeypot", message: "retry" });
  });
});

describe("Google Sheet spam rules", () => {
  let gs: ReturnType<typeof loadAppsScript>;

  const input = (over: Partial<CreateOrderInput> = {}): CreateOrderInput => ({
    checkoutId: crypto.randomUUID(),
    locale: "vi",
    lines: [{ variantId: "v1", productId: "p1", sku: "SKU-1", name: "Đèn ngủ", variantTitle: "", quantity: 1, unitPrice: 140000, lineTotal: 140000 }],
    fulfillment: "delivery",
    payment: "cod",
    customer: { fullName: "Nguyễn Văn A", phone: "0912345678" },
    shippingAddress: { fullName: "Nguyễn Văn A", phone: "0912345678", provinceCode: "ha-noi", ward: "Phường Láng", street: "12 Ngõ 34" },
    pickupStoreId: null,
    couponCode: null,
    subtotal: 140000,
    discount: 0,
    shippingFee: 25000,
    total: 165000,
    ...over,
  });

  beforeEach(() => {
    process.env.IDEMPOTENCY_STORE_PATH = join(mkdtempSync(join(tmpdir(), "ovian-bot-")), "store.json");
    process.env.COMMERCE_MODE = "mock";
    process.env.ORDER_BACKEND = "sheets";
    process.env.ORDERS_ENABLED = "true";
    process.env.GOOGLE_SHEETS_WEBAPP_URL = "https://script.google.com/macros/s/TEST/exec";
    process.env.GOOGLE_SHEETS_SECRET = SECRET;
    resetMockState();
    gs = loadAppsScript(SECRET);
    gs.api.setup();
    vi.stubGlobal("fetch", gs.fetch);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    for (const k of ["ORDER_BACKEND", "ORDERS_ENABLED", "GOOGLE_SHEETS_WEBAPP_URL", "GOOGLE_SHEETS_SECRET"]) delete process.env[k];
  });

  it("allows the first three orders from a phone, then refuses the fourth", async () => {
    for (let i = 0; i < 3; i++) await sheetsOrders.createOrder(input());
    await expect(sheetsOrders.createOrder(input())).rejects.toMatchObject({ rule: "too-many" });
    expect(gs.rows.length).toBe(4); // header + 3 accepted orders, nothing written for the refusal
  });

  it("counts the same person however they wrote their number", async () => {
    await sheetsOrders.createOrder(input({ customer: { fullName: "A", phone: "0912345678" } }));
    await sheetsOrders.createOrder(input({ customer: { fullName: "A", phone: "+84912345678" } }));
    await sheetsOrders.createOrder(input({ customer: { fullName: "A", phone: "84912345678" } }));
    await expect(sheetsOrders.createOrder(input())).rejects.toBeInstanceOf(OrderRefusedError);
  });

  it("does not count orders older than 24 hours", async () => {
    for (let i = 0; i < 3; i++) await sheetsOrders.createOrder(input());
    for (const row of gs.rows.slice(1)) row[gs.col("Thời gian")] = new Date(Date.now() - 30 * 3600_000);
    const o = await sheetsOrders.createOrder(input());
    expect(o.ref).toBe("OV00004");
  });

  it("a different phone is unaffected by someone else's limit", async () => {
    for (let i = 0; i < 3; i++) await sheetsOrders.createOrder(input());
    const other = await sheetsOrders.createOrder(input({ customer: { fullName: "B", phone: "0987654321" } }));
    expect(other.ref).toBe("OV00004");
  });

  it("refuses any order from a phone on the blocklist sheet", async () => {
    gs.block("0912345678", "spam");
    await expect(sheetsOrders.createOrder(input())).rejects.toMatchObject({ rule: "blocked" });
    expect(gs.rows.length).toBe(1); // header only
    const other = await sheetsOrders.createOrder(input({ customer: { fullName: "B", phone: "0987654321" } }));
    expect(other.ref).toBe("OV00001"); // the refusal did not use up an order number
  });

  it("the limit can be raised or switched off by the owner", async () => {
    gs.props.set("MAX_ORDERS_PER_PHONE_DAY", "0");
    for (let i = 0; i < 5; i++) await sheetsOrders.createOrder(input());
    expect(gs.rows.length).toBe(6);
  });

  it("retrying an accepted order is never caught by the limit", async () => {
    const same = input();
    for (let i = 0; i < 3; i++) await sheetsOrders.createOrder(input());
    const first = await sheetsOrders.createOrder(same).catch(() => null);
    expect(first).toBeNull(); // 4th distinct order is refused
    gs.props.set("MAX_ORDERS_PER_PHONE_DAY", "4");
    const created = await sheetsOrders.createOrder(same);
    const retry = await sheetsOrders.createOrder(same); // same checkoutId: duplicate check runs first
    expect(retry.ref).toBe(created.ref);
    expect(gs.rows.length).toBe(5);
  });
});
