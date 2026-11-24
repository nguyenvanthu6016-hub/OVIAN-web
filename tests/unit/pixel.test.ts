import { afterEach, describe, expect, it, vi } from "vitest";
import { pixelId, track, trackOnce } from "@/lib/analytics/pixel";

afterEach(() => {
  delete (globalThis as { window?: unknown }).window;
  delete process.env.NEXT_PUBLIC_FACEBOOK_PIXEL_ID;
});

function fakeSessionStorage() {
  const map = new Map<string, string>();
  return { getItem: (k: string) => map.get(k) ?? null, setItem: (k: string, v: string) => void map.set(k, v) };
}

const withFbq = (sessionStorage: unknown = fakeSessionStorage()) => {
  const fbq = vi.fn();
  (globalThis as unknown as { window: { fbq: unknown; sessionStorage: unknown } }).window = { fbq, sessionStorage };
  return fbq;
};

describe("Meta Pixel helper", () => {
  it("is off until a pixel id is configured", () => {
    expect(pixelId()).toBe("");
    process.env.NEXT_PUBLIC_FACEBOOK_PIXEL_ID = " 123456789 ";
    expect(pixelId()).toBe("123456789");
  });

  it("does nothing when the pixel never loaded", () => {
    (globalThis as unknown as { window: Record<string, unknown> }).window = {};
    expect(() => track("Purchase", { value: 150000, currency: "VND" })).not.toThrow();
  });

  it("sends the event with its amount, and the order number as the event id", () => {
    const fbq = withFbq();
    track("Purchase", { value: 150000, currency: "VND", content_ids: ["234991533"], num_items: 1 }, "OV00002");
    expect(fbq).toHaveBeenCalledWith(
      "track",
      "Purchase",
      { value: 150000, currency: "VND", content_ids: ["234991533"], num_items: 1 },
      { eventID: "OV00002" },
    );
  });

  it("leaves out the event id when there is none", () => {
    const fbq = withFbq();
    track("PageView");
    expect(fbq).toHaveBeenCalledWith("track", "PageView", {}, undefined);
  });

  it("counts one order once, however many times the page reports it", () => {
    const fbq = withFbq();
    const sale = { value: 150000, currency: "VND" as const };
    // "Kiểm tra lại" hands the same created order back to the page.
    trackOnce("Purchase", sale, "OV00002");
    trackOnce("Purchase", sale, "OV00002");
    trackOnce("Purchase", sale, "OV00002");
    expect(fbq).toHaveBeenCalledTimes(1);
  });

  it("still counts a genuinely different order", () => {
    const fbq = withFbq();
    trackOnce("Purchase", { value: 150000 }, "OV00002");
    trackOnce("Purchase", { value: 99000 }, "OV00003");
    expect(fbq).toHaveBeenCalledTimes(2);
  });

  it("falls back to reporting when the browser refuses storage, leaving Meta to de-duplicate", () => {
    const blocked = { getItem: () => { throw new Error("blocked"); }, setItem: () => { throw new Error("blocked"); } };
    const fbq = withFbq(blocked);
    trackOnce("Purchase", { value: 150000 }, "OV00002");
    expect(fbq).toHaveBeenCalledWith("track", "Purchase", { value: 150000 }, { eventID: "OV00002" });
  });

  it("never lets a broken pixel break the shop", () => {
    const fbq = withFbq();
    fbq.mockImplementation(() => { throw new Error("blocked by the browser"); });
    expect(() => track("AddToCart", { value: 1 })).not.toThrow();
  });
});
