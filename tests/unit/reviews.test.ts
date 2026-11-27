import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The loader reads content/reviews relative to process.cwd() once per process, so each test
 * points cwd at a throwaway folder and drops the cache. Importing fresh per test keeps the
 * module-level cache from leaking between cases.
 */
let dir: string;
let cwd: ReturnType<typeof vi.spyOn>;

async function load() {
  const mod = await import("@/lib/product/reviews");
  mod.resetImportedReviews();
  return mod;
}

function writeFile(name: string, body: unknown) {
  writeFileSync(join(dir, "content", "reviews", name), JSON.stringify(body), "utf8");
}

const review = (over: Record<string, unknown> = {}) => ({
  author: "n*****2",
  rating: 5,
  date: "2025-10-26T12:45:00+07:00",
  attributes: [],
  body: "Hàng tốt",
  mediaCount: 0,
  ...over,
});

const file = (over: Record<string, unknown> = {}) => ({
  productHandle: "den-ngu",
  productName: "Đèn ngủ",
  source: "shopee",
  status: "pending",
  reviews: [review()],
  ...over,
});

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "ovian-reviews-"));
  mkdirSync(join(dir, "content", "reviews"), { recursive: true });
  cwd = vi.spyOn(process, "cwd").mockReturnValue(dir);
});

afterEach(() => {
  cwd.mockRestore();
  rmSync(dir, { recursive: true, force: true });
  vi.restoreAllMocks();
});

describe("reading transcribed reviews", () => {
  it("returns the reviews for a product, marked as coming from Shopee", async () => {
    writeFile("den-ngu.json", file());
    const { importedReviews } = await load();
    const out = importedReviews("den-ngu");
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ author: "n*****2", rating: 5, source: "shopee", body: "Hàng tốt" });
  });

  it("gives every review a stable id and no invented title", async () => {
    writeFile("den-ngu.json", file({ reviews: [review(), review({ author: "k*****1" })] }));
    const { importedReviews } = await load();
    const out = importedReviews("den-ngu");
    expect(out.map((r) => r.id)).toEqual(["den-ngu-shopee-0", "den-ngu-shopee-1"]);
    expect(out.every((r) => r.title === undefined)).toBe(true);
  });

  it("knows nothing about a product with no file", async () => {
    writeFile("den-ngu.json", file());
    const { importedReviews } = await load();
    expect(importedReviews("man-ngu")).toEqual([]);
  });

  it("returns nothing at all when the folder is missing", async () => {
    rmSync(join(dir, "content"), { recursive: true, force: true });
    const { importedReviews } = await load();
    expect(importedReviews("den-ngu")).toEqual([]);
  });
});

describe("ordering", () => {
  it("puts the newest review first", async () => {
    writeFile(
      "den-ngu.json",
      file({
        reviews: [
          review({ author: "cu", date: "2024-01-02T10:00:00+07:00" }),
          review({ author: "moi", date: "2026-05-10T19:17:00+07:00" }),
          review({ author: "giua", date: "2025-09-15T22:48:00+07:00" }),
        ],
      }),
    );
    const { importedReviews } = await load();
    expect((await importedReviews("den-ngu")).map((r) => r.author)).toEqual(["moi", "giua", "cu"]);
  });

  it("puts a review with no date last rather than guessing one", async () => {
    writeFile(
      "den-ngu.json",
      file({
        reviews: [
          review({ author: "khong-ngay", date: null }),
          review({ author: "co-ngay", date: "2024-01-02T10:00:00+07:00" }),
        ],
      }),
    );
    const { importedReviews } = await load();
    const out = importedReviews("den-ngu");
    expect(out.map((r) => r.author)).toEqual(["co-ngay", "khong-ngay"]);
    expect(out[1]?.createdAt).toBeNull();
  });
});

describe("what the customer wrote is carried through untouched", () => {
  it("keeps typos, spacing and line breaks exactly", async () => {
    const body = "Vk ck mình mới sinh em bé.\nSản phẩm tốt, ánh sáng ấm k chói. Nên mua nhed\nCảm ơn shop";
    writeFile("den-ngu.json", file({ reviews: [review({ body })] }));
    const { importedReviews } = await load();
    expect(importedReviews("den-ngu")[0]?.body).toBe(body);
  });

  it("carries the variant and the per-criterion notes", async () => {
    writeFile(
      "man-ngu.json",
      file({
        productHandle: "man-ngu",
        reviews: [
          review({
            variant: "Màu tím (C1B), 1m6 x 2m",
            attributes: [{ label: "Chống muỗi", value: "lo nho chong muoi" }],
          }),
        ],
      }),
    );
    const { importedReviews } = await load();
    expect(importedReviews("man-ngu")[0]).toMatchObject({
      variant: "Màu tím (C1B), 1m6 x 2m",
      attributes: [{ label: "Chống muỗi", value: "lo nho chong muoi" }],
    });
  });
});

describe("a hand-edited file that is wrong", () => {
  it("skips a malformed file instead of taking the product page down", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    writeFileSync(join(dir, "content", "reviews", "broken.json"), "{ not json", "utf8");
    writeFile("den-ngu.json", file());
    const { importedReviews } = await load();
    expect(importedReviews("den-ngu")).toHaveLength(1);
    expect(warn).toHaveBeenCalled();
  });

  it.each([
    ["a rating above five", file({ reviews: [review({ rating: 6 })] })],
    ["an empty body", file({ reviews: [review({ body: "" })] })],
    ["a date that is not a date", file({ reviews: [review({ date: "hôm qua" })] })],
    ["no reviews at all", file({ reviews: [] })],
    ["a source that is not Shopee", file({ source: "tiktok" })],
  ])("rejects %s", async (_label, bad) => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    writeFile("den-ngu.json", bad);
    const { importedReviews } = await load();
    expect(importedReviews("den-ngu")).toEqual([]);
    expect(warn).toHaveBeenCalled();
  });
});

describe("the real files shipped with the shop", () => {
  it("every one of them parses, so the shop never silently loses reviews", async () => {
    cwd.mockRestore();
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { importedReviews, resetImportedReviews } = await import("@/lib/product/reviews");
    resetImportedReviews();
    const handles = [
      "den-cam-ngu-mini-ovian-den-cam-bien-1w-den-mini-dieu-chinh-do-sang-80lm-an-toan-chay-no-ul94",
      "man-ngu-co-cua-1-be-ovian-vai-tyn52-mat-luoi-sieu-nho-chong-muoi-day-hoa-tiet-tinh-te",
      "den-cam-bien-chuyen-dong-ovian-2-muc-sang-40-60lm-cong-suat-0-6w-sieu-tiet-kiem-dien",
      "den-cam-ngu-mini-ovian-den-cam-bien-0-3w-1-muc-sang-40lm-dat-an-toan-chay-no-ul94v0-thiet-ke-gon",
    ];
    for (const h of handles) expect(importedReviews(h).length, h).toBeGreaterThan(0);
    expect(warn, "a shipped review file failed validation").not.toHaveBeenCalled();
    resetImportedReviews();
  });
});
