import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { placeOrder, checkOrderStatus, fingerprint } from "@/lib/checkout/place-order";
import { sheetsOrders } from "@/lib/orders/sheets";
import { ordersEnabled, orderBackendName } from "@/lib/orders";
import { CommerceUnavailableError, OrderOutcomeUnknownError, type CreateOrderInput } from "@/lib/commerce/types";
import { resetMockState } from "@/lib/commerce/mock/provider";
import type { OrderRequest } from "@/lib/checkout/schema";
import { loadAppsScript } from "./apps-script-harness";

const SECRET = "test-secret-0123456789abcdefghij";
let gs: ReturnType<typeof loadAppsScript>;

beforeEach(() => {
  process.env.IDEMPOTENCY_STORE_PATH = join(mkdtempSync(join(tmpdir(), "ovian-sheets-")), "store.json");
  process.env.COMMERCE_MODE = "mock";
  process.env.CONTENT_MODE = "sample";
  process.env.STORE_PICKUP_ENABLED = "true"; // these tests use a pickup cart; default-off is tested below
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

const input = (over: Partial<CreateOrderInput> = {}): CreateOrderInput => ({
  checkoutId: "3b241101-e2bb-4255-8caf-4136c566a962",
  locale: "vi",
  lines: [{ variantId: "v1", productId: "p1", sku: "SKU-1", name: "Đèn ngủ", variantTitle: "Trắng", quantity: 2, unitPrice: 140000, lineTotal: 280000 }],
  fulfillment: "delivery",
  payment: "cod",
  customer: { fullName: "Nguyễn Văn A", phone: "0912345678" },
  shippingAddress: { fullName: "Nguyễn Văn A", phone: "0912345678", provinceCode: "ha-noi", ward: "Phường Láng", street: "12 Ngõ 34" },
  pickupStoreId: null,
  note: "Gọi trước 30 phút",
  couponCode: null,
  subtotal: 280000,
  discount: 0,
  shippingFee: 25000,
  total: 305000,
  ...over,
});

describe("Apps Script (Code.gs)", () => {
  it("setup writes the header row", () => {
    expect(gs.rows[0]?.[1]).toBe("Mã đơn");
  });

  it("creates one row with readable columns and sequential order numbers", async () => {
    const o = await sheetsOrders.createOrder(input());
    expect(o.ref).toBe("OV00001");
    expect(o.simulated).toBe(false);
    const row = gs.rows[1]!;
    expect(row[gs.col("Trạng thái")]).toBe("Mới");
    expect(row[gs.col("Số điện thoại")]).toBe("0912345678"); // leading zero kept (stored as text)
    expect(row[gs.col("Tỉnh/Thành")]).toBe("Hà Nội");
    expect(row[gs.col("Cách nhận")]).toBe("Giao tận nhà");
    expect(row[gs.col("Sản phẩm")]).toBe("2 × Đèn ngủ (Trắng) [SKU-1] = 280.000 ₫");
    expect(row[gs.col("Tổng cộng")]).toBe(305000);
    const second = await sheetsOrders.createOrder(input({ checkoutId: "aaaaaaaa-e2bb-4255-8caf-4136c566a962" }));
    expect(second.ref).toBe("OV00002");
  });

  it("same checkoutId twice returns the same order and writes one row", async () => {
    const a = await sheetsOrders.createOrder(input());
    const b = await sheetsOrders.createOrder(input());
    expect(b.ref).toBe(a.ref);
    expect(gs.rows.length).toBe(2); // header + 1
  });

  it("customer text that looks like a formula is stored as text", async () => {
    await sheetsOrders.createOrder(input({ customer: { fullName: '=IMPORTXML("http://x")', phone: "0912345678" }, note: "+84 gọi lại" }));
    const raw = gs.rawAppends[0]!;
    expect(raw[gs.col("Họ tên")]).toBe('\'=IMPORTXML("http://x")');
    expect(raw[gs.col("Ghi chú của khách")]).toBe("'+84 gọi lại");
  });

  it("pickup order has no address and cash-at-store payment", async () => {
    const o = await sheetsOrders.createOrder(input({ fulfillment: "pickup", payment: "cash_at_store", shippingAddress: null, shippingFee: 0, total: 280000 }));
    expect(o.fulfillment).toBe("pickup");
    expect(o.shippingAddress).toBeNull();
    expect(gs.rows[1]![gs.col("Thanh toán")]).toBe("Tiền mặt tại cửa hàng");
  });

  it("status and payment edited by staff in the sheet show up in tracking", async () => {
    const o = await sheetsOrders.createOrder(input());
    gs.rows[1]![gs.col("Trạng thái")] = "Đang giao";
    gs.rows[1]![gs.col("Đã thu tiền")] = true;
    const t = await sheetsOrders.getOrder(o.ref.toLowerCase());
    expect(t?.status).toBe("shipping");
    expect(t?.financialStatus).toBe("paid");
    expect(t?.customerPhone).toBe("0912345678");
    expect(await sheetsOrders.getOrder("OV99999")).toBeNull();
  });

  it("has the agreed columns, with the two technical columns last", () => {
    const h = gs.api.HEADERS;
    for (const c of ["Đơn vị vận chuyển", "Mã vận đơn", "Ngày giao", "Ngày khách nhận", "Phí ship thực tế", "Người xử lý", "Đã trừ tồn kho Sapo", "Lý do huỷ / hoàn"]) {
      expect(h).toContain(c);
    }
    expect(h.slice(-2)).toEqual(["Mã phiên (không sửa)", "Dữ liệu (không sửa)"]);
    expect(h).toHaveLength(30);
  });

  it("new row starts with staff columns empty and both checkboxes unticked", async () => {
    await sheetsOrders.createOrder(input());
    const row = gs.rows[1]!;
    expect(row[gs.col("Đã thu tiền")]).toBe(false);
    expect(row[gs.col("Đã trừ tồn kho Sapo")]).toBe(false);
    expect(row[gs.col("Mã vận đơn")]).toBe("");
    expect(row[gs.col("Người xử lý")]).toBe("");
  });

  it("carrier and tracking number entered by staff reach the tracking page; internal columns do not", async () => {
    const o = await sheetsOrders.createOrder(input());
    expect((await sheetsOrders.getOrder(o.ref))?.shipment).toBeNull();
    const row = gs.rows[1]!;
    row[gs.col("Đơn vị vận chuyển")] = "GHN";
    row[gs.col("Mã vận đơn")] = "GHN123456VN";
    row[gs.col("Phí ship thực tế")] = 22000;
    row[gs.col("Người xử lý")] = "Lan";
    row[gs.col("Ghi chú nội bộ")] = "khách quen";
    const t = await sheetsOrders.getOrder(o.ref);
    expect(t?.shipment).toEqual({ carrier: "GHN", trackingNumber: "GHN123456VN" });
    expect(JSON.stringify(t)).not.toContain("Lan");
    expect(JSON.stringify(t)).not.toContain("22000");
    expect(JSON.stringify(t)).not.toContain("khách quen");
  });

  it("setup refuses to run again once orders exist", async () => {
    await sheetsOrders.createOrder(input());
    expect(() => gs.api.setup()).toThrow(/đã có đơn hàng/);
  });

  it("finds an order by checkoutId (reconciliation)", async () => {
    const o = await sheetsOrders.createOrder(input());
    expect((await sheetsOrders.findOrderByCheckoutId(input().checkoutId))?.ref).toBe(o.ref);
    expect(await sheetsOrders.findOrderByCheckoutId("missing-id")).toBeNull();
  });

  it("rejects a wrong secret without writing", () => {
    expect(gs.post({ secret: "wrong", action: "create", payload: {} })).toEqual({ ok: false, error: "unauthorized" });
    expect(gs.rows.length).toBe(1);
  });

  it("rejects invalid order data without writing", () => {
    const r = gs.post({ secret: SECRET, action: "create", payload: { ...input(), fulfillment: "pickup", lines: [] } });
    expect(r).toEqual({ ok: false, error: "bad-request:lines" });
    expect(gs.rows.length).toBe(1);
  });

  it("emails the owner when NOTIFY_EMAIL is set", async () => {
    gs.props.set("NOTIFY_EMAIL", "owner@example.com");
    await sheetsOrders.createOrder(input());
    expect(gs.mails).toHaveLength(1);
    expect(gs.mails[0]!.subject).toContain("OV00001");
  });

  it("doGet is a health check without order data", () => {
    expect(JSON.parse(gs.api.doGet().content)).toEqual({ ok: true, service: "ovian-orders" });
  });
});

describe("website Sheets client", () => {
  it("a timeout on create means outcome unknown (never a blind retry)", async () => {
    vi.stubGlobal("fetch", async () => { throw new DOMException("timeout", "TimeoutError"); });
    await expect(sheetsOrders.createOrder(input())).rejects.toBeInstanceOf(OrderOutcomeUnknownError);
  });
  it("an HTML reply (wrong deployment) on create means outcome unknown", async () => {
    vi.stubGlobal("fetch", async () => new Response("<html>Sign in</html>", { status: 200 }));
    await expect(sheetsOrders.createOrder(input())).rejects.toBeInstanceOf(OrderOutcomeUnknownError);
  });
  it("a definite rejection is an outage, not unknown", async () => {
    process.env.GOOGLE_SHEETS_SECRET = "another-secret-0123456789abcdef";
    await expect(sheetsOrders.createOrder(input())).rejects.toBeInstanceOf(CommerceUnavailableError);
  });
  it("orders are off unless explicitly enabled and configured", () => {
    expect(orderBackendName()).toBe("sheets");
    expect(ordersEnabled()).toBe(true);
    process.env.ORDERS_ENABLED = "false";
    expect(ordersEnabled()).toBe(false);
    process.env.ORDERS_ENABLED = "true";
    delete process.env.GOOGLE_SHEETS_WEBAPP_URL;
    expect(ordersEnabled()).toBe(false);
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

describe("placeOrder → Google Sheet (end to end with the real script)", () => {
  it("prices on the server and writes exactly one row for repeated and parallel submits", async () => {
    const rs = await Promise.all([placeOrder(req()), placeOrder(req()), placeOrder(req())]);
    expect(rs.every((r) => r.kind === "created" || r.kind === "processing")).toBe(true);
    const again = await placeOrder(req());
    expect(again.kind).toBe("created");
    expect(gs.rows.length).toBe(2);
    expect(gs.rows[1]![gs.col("Tổng cộng")]).toBe(258000);
  });

  it("timeout after the row was written: 'check again' finds it, no second row", async () => {
    const realFetch = gs.fetch;
    vi.stubGlobal("fetch", async (url: string, init: { body: string }) => {
      await realFetch(url, init); // the script writes the row…
      throw new DOMException("timeout", "TimeoutError"); // …but the reply never arrives
    });
    const r = await placeOrder(req());
    expect(r.kind).toBe("unknown");
    vi.stubGlobal("fetch", realFetch);
    const check = await checkOrderStatus(req().checkoutId, fingerprint(req()));
    expect(check.kind).toBe("created");
    expect(gs.rows.length).toBe(2);
  });

  it("checkout is disabled when orders are switched off", async () => {
    process.env.ORDERS_ENABLED = "false";
    expect((await placeOrder(req())).kind).toBe("disabled");
    expect(gs.rows.length).toBe(1);
  });
});
