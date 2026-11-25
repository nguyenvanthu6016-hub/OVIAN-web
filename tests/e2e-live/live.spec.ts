import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

/**
 * Read-only checks against the real Sapo catalogue. Product facts used here were read from Sapo
 * on 2026-11-07; if the owner changes the product, update SALE_PRODUCT.
 */
const SALE_PRODUCT = {
  handle: "den-cam-bien-chuyen-dong-ovian-2-muc-sang-40-60lm-cong-suat-0-6w-sieu-tiet-kiem-dien",
  variantId: "234991533",
  price: "140.000",
  compareAt: "200.000",
};

const noHorizontalOverflow = async (page: Page) => {
  const { sw, vw } = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, vw: window.innerWidth }));
  expect(sw, `page is ${sw}px wide in a ${vw}px viewport`).toBeLessThanOrEqual(vw);
};

test.beforeAll(async ({ request }) => {
  test.setTimeout(180_000);
  const health = await (await request.get("/api/health")).json();
  expect(health.commerce, "server must run in live mode for these tests").toBe("live");
  // Dev server compiles routes on first visit and may reload the page; compile them up front.
  for (const path of ["/vi", "/vi/products", `/vi/products/${SALE_PRODUCT.handle}`, "/vi/cart", "/vi/checkout", "/vi/products/khong-ton-tai-123"]) {
    await request.get(path);
  }
});

test("home: real catalogue, rooms from Sapo, no sample notice @mobile", async ({ page }) => {
  await page.goto("/vi");
  await expect(page.getByText("chế độ mẫu")).toHaveCount(0);
  await expect(page.getByRole("navigation", { name: /sơ đồ|không gian/i }).getByRole("link").first()).toBeVisible();
  await expect(page.getByRole("navigation", { name: /Mặt bằng nhà/ }).getByText(/Phòng Ngủ/i)).toBeVisible();
  await expect(page.getByText("Ảnh mẫu")).toHaveCount(0); // no mock placeholder images
  await noHorizontalOverflow(page);
});

test("listing shows every Sapo product and real images @mobile", async ({ page }) => {
  await page.goto("/vi/products");
  await expect(page.getByText(/^\d+ sản phẩm$/)).toHaveText(/^(\d+) sản phẩm$/);
  const count = Number((await page.getByText(/^\d+ sản phẩm$/).textContent())?.match(/\d+/)?.[0]);
  expect(count).toBeGreaterThanOrEqual(40);
  const firstImg = page.locator("main img").first();
  await expect(firstImg).toHaveAttribute("src", /dktcdn\.net|_next\/image/);
  await noHorizontalOverflow(page);
});

test("sale: product page shows sale price, struck original and discount badge @mobile", async ({ page }) => {
  await page.goto(`/vi/products/${SALE_PRODUCT.handle}`);
  const main = page.locator("main");
  await expect(main.getByText(`${SALE_PRODUCT.price} ₫`).first()).toBeVisible();
  await expect(main.locator("s", { hasText: SALE_PRODUCT.compareAt }).first()).toBeVisible();
  await expect(main.getByText(/Giảm 30%/).first()).toBeVisible();
  await noHorizontalOverflow(page);
});

test("sale filter lists discounted products", async ({ page }) => {
  await page.goto("/vi/products?sale=1");
  const count = Number((await page.getByText(/^\d+ sản phẩm$/).textContent())?.match(/\d+/)?.[0]);
  expect(count).toBeGreaterThan(0);
  await expect(page.locator("main s").first()).toBeVisible();
});

test("server quote uses the live Sapo price, not the browser's", async ({ request }) => {
  const res = await request.post("/api/checkout/quote", {
    data: { lines: [{ variantId: SALE_PRODUCT.variantId, quantity: 2, unitPrice: 1 }], couponCode: null, fulfillment: "delivery", provinceCode: null },
  });
  expect(res.ok()).toBeTruthy();
  const { quote } = await res.json();
  const unit = Number(SALE_PRODUCT.price.replace(/\./g, ""));
  expect(quote.lines[0].unitPrice).toBe(unit);
  expect(quote.total).toBe(unit * 2);
  expect(quote.shippingFee).toBe(0); // province not chosen yet
  expect(quote.shipping.status).toBe("needs-province");
});

test("unknown coupon is rejected as invalid, not as an outage", async ({ request }) => {
  const res = await request.post("/api/checkout/quote", {
    data: { lines: [{ variantId: SALE_PRODUCT.variantId, quantity: 1 }], couponCode: "KHONGTONTAI", fulfillment: "delivery", provinceCode: null },
  });
  expect(res.ok()).toBeTruthy();
  const { quote } = await res.json();
  expect(quote.changes).toContainEqual(expect.objectContaining({ kind: "coupon", reason: "invalid" }));
});

test("add to cart, checkout shows ordering disabled and the order button is locked @mobile", async ({ page }) => {
  await page.goto(`/vi/products/${SALE_PRODUCT.handle}`);
  await page.locator("main").getByRole("button", { name: "Thêm vào giỏ" }).first().click();
  // Wait until the cart is stored in this browser before leaving the page.
  await page.waitForFunction(
    (id) => Object.keys(localStorage).some((k) => (localStorage.getItem(k) ?? "").includes(id)),
    SALE_PRODUCT.variantId,
  );
  await page.goto("/vi/checkout");
  // The notice appears once the client has asked the server whether ordering is enabled.
  await expect(page.getByText(/Đặt hàng trực tuyến đang tạm tắt/)).toBeVisible({ timeout: 20_000 });
  await expect(page.locator("main").getByText(`${SALE_PRODUCT.price} ₫`).first()).toBeVisible();
  await expect(page.getByRole("button", { name: /^Đặt hàng/ })).toBeDisabled();
  await noHorizontalOverflow(page);
});

test("unknown product returns 404", async ({ page }) => {
  const res = await page.goto("/vi/products/khong-ton-tai-123");
  expect(res?.status()).toBe(404);
});

for (const path of ["/vi", "/vi/products", `/vi/products/${SALE_PRODUCT.handle}`]) {
  test(`axe WCAG 2.2 AA on live data: ${path} @mobile`, async ({ page }) => {
    await page.goto(path, { waitUntil: "networkidle" });
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
      .exclude("nextjs-portal")
      .analyze();
    const summary = results.violations.map((v) => `${v.id} (${v.impact}): ${v.nodes.length} node(s) — ${v.nodes[0]?.target.join(" ")}`);
    expect(summary, summary.join("\n")).toEqual([]);
  });
}

test("support: the real OVIAN Zalo number is one tap away @mobile", async ({ page }) => {
  await page.goto("/vi");
  await expect(page.getByTestId("zalo-fab")).toHaveAttribute("href", "https://zalo.me/0909651935");
  await page.goto("/vi/track");
  const card = page.getByRole("region", { name: /Cần OVIAN hỗ trợ/ });
  await expect(card.getByRole("link", { name: /Gọi 0909651935/ })).toHaveAttribute("href", "tel:0909651935");
});
