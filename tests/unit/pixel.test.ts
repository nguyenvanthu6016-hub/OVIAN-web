import { afterEach, describe, expect, it, vi } from "vitest";
import { pixelId, track } from "@/lib/analytics/pixel";

afterEach(() => {
  delete (globalThis as { window?: unknown }).window;
  delete process.env.NEXT_PUBLIC_FACEBOOK_PIXEL_ID;
});

const withFbq = () => {
  const fbq = vi.fn();
  (globalThis as unknown as { window: { fbq: unknown } }).window = { fbq };
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

  it("never lets a broken pixel break the shop", () => {
    const fbq = withFbq();
    fbq.mockImplementation(() => { throw new Error("blocked by the browser"); });
    expect(() => track("AddToCart", { value: 1 })).not.toThrow();
  });
});
