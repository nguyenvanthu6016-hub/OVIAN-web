import { afterEach, describe, expect, it, vi } from "vitest";
import { HOUSE_VOUCHER, estimateVoucher, findHouseVoucher, voucherEnabled, voucherState } from "@/lib/checkout/voucher";

afterEach(() => {
  delete process.env.HOUSE_VOUCHER_ENABLED;
  vi.unstubAllEnvs();
});

describe("the voucher's terms", () => {
  it("is 10% capped at 12.000 đ on orders from 100.000 đ", () => {
    expect(HOUSE_VOUCHER).toMatchObject({ kind: "percentage", value: 10, maxDiscount: 12_000, minSubtotal: 100_000 });
  });

  it.each([
    [100_000, 10_000],
    [112_000, 11_200],
    [119_999, 11_999],
    [120_000, 12_000],
    // The cap holds however large the order gets.
    [500_000, 12_000],
    [5_000_000, 12_000],
  ])("an order of %i đ saves %i đ", (subtotal, expected) => {
    expect(estimateVoucher(HOUSE_VOUCHER, subtotal)).toBe(expected);
  });

  it("gives nothing below the minimum", () => {
    expect(estimateVoucher(HOUSE_VOUCHER, 99_999)).toBe(0);
    expect(estimateVoucher(HOUSE_VOUCHER, 0)).toBe(0);
  });

  it("rounds down to the đồng, never up", () => {
    // 10% of 100.005 is 10.000,5 — the shopper is never charged the half đồng.
    expect(estimateVoucher(HOUSE_VOUCHER, 100_005)).toBe(10_000);
  });
});

describe("what the checkout card says", () => {
  it("offers the voucher with the amount it would save", () => {
    expect(voucherState(HOUSE_VOUCHER, 112_000, false)).toEqual({ kind: "available", estimate: 11_200 });
  });

  it("says how much more is needed when the basket is short", () => {
    expect(voucherState(HOUSE_VOUCHER, 80_000, false)).toEqual({ kind: "short", shortfall: 20_000 });
  });

  it("is exactly at the line, not short, on the minimum itself", () => {
    expect(voucherState(HOUSE_VOUCHER, 100_000, false).kind).toBe("available");
  });

  it("reports the discount the server actually applied, not its own guess", () => {
    // If the two ever disagreed, the shopper must be shown the one that was charged.
    expect(voucherState(HOUSE_VOUCHER, 112_000, true, 9_000)).toEqual({ kind: "applied", discount: 9_000 });
  });

  it("does not read the environment, because the browser cannot", () => {
    vi.stubEnv("HOUSE_VOUCHER_ENABLED", "false");
    expect(voucherState(HOUSE_VOUCHER, 112_000, false).kind).toBe("available");
  });
});

describe("resolving the code", () => {
  it("knows its own code, whatever case it is typed in", () => {
    expect(findHouseVoucher("GIAM10")).toBe(HOUSE_VOUCHER);
    expect(findHouseVoucher("giam10")).toBe(HOUSE_VOUCHER);
    expect(findHouseVoucher("  Giam10  ")).toBe(HOUSE_VOUCHER);
  });

  it("leaves every other code to the backend", () => {
    expect(findHouseVoucher("FREESHIP")).toBeNull();
    expect(findHouseVoucher("GIAM100")).toBeNull();
    expect(findHouseVoucher("")).toBeNull();
    expect(findHouseVoucher(null)).toBeNull();
  });

  it("stops honouring the code once the owner withdraws the offer", () => {
    vi.stubEnv("HOUSE_VOUCHER_ENABLED", "false");
    expect(voucherEnabled()).toBe(false);
    expect(findHouseVoucher("GIAM10")).toBeNull();
  });
});
