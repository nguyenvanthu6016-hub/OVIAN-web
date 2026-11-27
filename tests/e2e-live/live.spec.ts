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

test("product description is split into drawers that start closed @mobile", async ({ page }) => {
  await page.goto("/vi/products/den-cam-bien-chuyen-dong-ovian-2-muc-sang-40-60lm-cong-suat-0-6w-sieu-tiet-kiem-dien");
  const details = page.locator("section[aria-labelledby='details-title']");
  const drawers = details.locator("details");
  expect(await drawers.count()).toBeGreaterThan(2);
  for (const d of await drawers.all()) expect(await d.evaluate((e) => (e as HTMLDetailsElement).open)).toBe(false);

  // The seller's own headings become the drawer labels, and the detail stays hidden behind them
  // until the shopper asks for it.
  const first = drawers.first();
  const body = first.locator("summary + div");
  await expect(body).toBeHidden();
  await expect(first.locator("summary")).not.toHaveText("");
  await first.locator("summary").click();
  await expect(body).toBeVisible();
  expect((await body.innerText()).trim().length).toBeGreaterThan(30);
});

test("reviews transcribed from Shopee show on the product, sourced and unedited @mobile", async ({ page }) => {
  await page.goto("/vi/products/man-ngu-co-cua-1-be-ovian-vai-tyn52-mat-luoi-sieu-nho-chong-muoi-day-hoa-tiet-tinh-te");
  const section = page.locator("section[aria-labelledby='reviews-title']");

  // The shopper is told where these came from before reading them.
  await expect(section.getByText(/gian hàng Shopee của OVIAN/)).toBeVisible();
  await expect(section.getByText("Sản phẩm chưa có đánh giá.")).toBeHidden();
  expect(await section.locator("li").count()).toBe(8);

  // Quoted as the customer typed it: the complaint is intact, and so are the typos.
  await expect(section.getByText(/mới ngắn hơn mặc dù chung kich thước/)).toBeVisible();
  await expect(section.getByText(/lo nho chong muoi/)).toBeVisible();

  // The variant they bought is on the review, which is the whole point for a product sold by size.
  await expect(section.getByText(/Màu tím \(C1B\), 1m6 x 2m/)).toBeVisible();
  await noHorizontalOverflow(page);
});

test("the star rating is shown to shoppers but not claimed to Google", async ({ page }) => {
  await page.goto("/vi/products/man-ngu-co-cua-1-be-ovian-vai-tyn52-mat-luoi-sieu-nho-chong-muoi-day-hoa-tiet-tinh-te");
  await expect(page.locator("section[aria-labelledby='reviews-title']").getByText(/Trung bình 5/)).toBeVisible();

  // These reviews were collected by Shopee, not by this site, so marking them up as the shop's
  // own aggregate rating would be a claim the shop cannot stand behind.
  const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
  const product = blocks.map((b) => JSON.parse(b)).find((o) => o["@type"] === "Product");
  expect(product).toBeTruthy();
  expect(product.aggregateRating, "aggregateRating must stay out of the Product markup").toBeUndefined();
  expect(JSON.stringify(blocks)).not.toContain("aggregateRating");
});

test("a product with no transcribed reviews still says so plainly @mobile", async ({ page }) => {
  await page.goto("/vi/products/bong-den-led-9w-dui-e27-anh-sang-vang-am-den-trang-tri-noi-ngoai-that");
  const section = page.locator("section[aria-labelledby='reviews-title']");
  await expect(section.getByText(/gian hàng Shopee của OVIAN/)).toBeHidden();
  expect(await section.locator("li").count()).toBe(0);
});

/**
 * The machine-readable surface: what an agent reads when it wants to answer a question about
 * OVIAN without downloading and parsing the whole shop.
 */
test.describe("agent-readable surface", () => {
  test("llms.txt names the business, how to reach it, and what it sells", async ({ request }) => {
    const res = await request.get("/llms.txt");
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toContain("text/plain");
    const body = await res.text();
    expect(body).toContain("0909651935");
    expect(body).toContain("Hộ kinh doanh OVIAN");
    expect(body).toContain("/vi/policies/doi-tra");
    // Real prices from the live catalogue, not a static blurb.
    expect(body).toMatch(/— [\d.]+ đ/);
    expect(body.split("\n").filter((l) => l.startsWith("- ["))).not.toHaveLength(0);
  });

  test("the home page advertises its machine-readable copies", async ({ request }) => {
    const link = (await request.get("/vi")).headers()["link"] ?? "";
    expect(link).toContain('</llms.txt>; rel="alternate"');
    expect(link).toContain('rel="alternate"; type="text/markdown"');
  });

  test("an agent asking for Markdown gets Markdown, far smaller than the HTML", async ({ request }) => {
    const path = `/vi/products/${SALE_PRODUCT.handle}`;
    const html = await (await request.get(path)).text();
    const res = await request.get(path, { headers: { Accept: "text/markdown" } });
    expect(res.headers()["content-type"]).toContain("text/markdown");
    const md = await res.text();
    expect(md).toContain("# ");
    expect(md).toContain("Giá:");
    expect(md.length).toBeLessThan(html.length / 5);

    // Never cached: one CDN copy of this URL served to a shopper would show them raw Markdown.
    expect(res.headers()["cache-control"]).toContain("no-store");
    expect(res.headers()["x-robots-tag"]).toContain("noindex");
  });

  test("a browser still gets the shop, not Markdown", async ({ request }) => {
    for (const accept of [
      "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
      "*/*",
    ]) {
      const res = await request.get("/vi", { headers: { Accept: accept } });
      expect(res.headers()["content-type"], accept).toContain("text/html");
    }
  });

  test("the sitemap dates product pages from Sapo's own modified_on", async ({ request }) => {
    const xml = await (await request.get("/sitemap.xml")).text();
    const lastmods = [...xml.matchAll(/<lastmod>([^<]+)<\/lastmod>/g)].map((m) => m[1]!);
    expect(lastmods.length).toBeGreaterThan(10);
    for (const d of lastmods) expect(Number.isNaN(Date.parse(d)), d).toBe(false);
    // Dates must be real, not "now" stamped on everything at build time.
    expect(new Set(lastmods).size).toBeGreaterThan(1);
    expect(Math.max(...lastmods.map((d) => Date.parse(d)))).toBeLessThanOrEqual(Date.now() + 60_000);
  });

  test("structured data answers who OVIAN is and what a product costs", async ({ page }) => {
    await page.goto("/vi");
    const nodes = (await page.locator('script[type="application/ld+json"]').allTextContents()).map((t) => JSON.parse(t));
    const types = nodes.map((n) => n["@type"]);
    expect(types).toContain("Organization");
    expect(types).toContain("WebSite");
    expect(types).toContain("ItemList");

    const org = nodes.find((n) => n["@type"] === "Organization");
    expect(org.telephone).toBe("0909651935");
    expect(org.address?.streetAddress).toBeTruthy();
    expect(org.address?.addressCountry).toBe("VN");
    expect(org.sameAs).toEqual(expect.arrayContaining([expect.stringContaining("facebook.com"), expect.stringContaining("tiktok.com")]));

    // Prices readable without running the page's JavaScript.
    const list = nodes.find((n) => n["@type"] === "ItemList");
    expect(list.itemListElement.length).toBeGreaterThan(0);
    for (const el of list.itemListElement) {
      expect(el.item.offers.priceCurrency).toBe("VND");
      expect(typeof el.item.offers.price).toBe("number");
      expect(el.item.offers.price).toBeGreaterThan(0);
      expect(el.item.offers.seller["@id"]).toBe(org["@id"]);
    }
  });

  test("the legal pages the audit asked for are linked from the home page", async ({ page }) => {
    await page.goto("/vi");
    for (const slug of ["dieu-khoan", "bao-mat", "doi-tra", "giao-hang"]) {
      await expect(page.locator(`a[href="/vi/policies/${slug}"]`).first()).toBeAttached();
    }
    await expect(page.locator('a[href="/vi/about"]').first()).toBeAttached();
    await expect(page.locator('a[href="/vi/contact"]').first()).toBeAttached();
  });
});

const NIGHT_LIGHT = "den-cam-ngu-mini-ovian-den-cam-bien-1w-den-mini-dieu-chinh-do-sang-80lm-an-toan-chay-no-ul94";

test.describe("the product page a shopper actually reads", () => {
  test("a description written with emoji Title Case headings still splits into drawers @mobile", async ({ page }) => {
    // This product is why: its headings are "🌟 Đặc Điểm Nổi Bật", with no colon and not in
    // capitals, so it rendered as one unbroken wall of text while other products split fine.
    await page.goto(`/vi/products/${NIGHT_LIGHT}`);
    const drawers = page.locator("section[aria-labelledby='details-title'] details");
    expect(await drawers.count()).toBeGreaterThanOrEqual(5);
    for (const d of await drawers.all()) expect(await d.evaluate((e) => (e as HTMLDetailsElement).open)).toBe(false);

    const titles = await drawers.locator("summary").allInnerTexts();
    expect(titles).toContain("Đặc Điểm Nổi Bật");
    expect(titles).toContain("Ứng Dụng");

    const body = drawers.first().locator("summary + div");
    await expect(body).toBeHidden();
    await drawers.first().locator("summary").click();
    await expect(body).toBeVisible();
  });

  test("the star rating sits by the price and jumps to the reviews @mobile", async ({ page }) => {
    await page.goto(`/vi/products/${NIGHT_LIGHT}`);
    const jump = page.getByTestId("rating-jump");
    await expect(jump).toBeVisible();
    await expect(jump).toHaveAttribute("href", "#reviews-title");
    await expect(jump).toContainText("10 đánh giá");

    // It must land clear of the sticky header, not behind it.
    await jump.click();
    const heading = page.locator("#reviews-title");
    await expect(heading).toBeInViewport();
    const [top, headerHeight] = await page.evaluate(() => [
      document.getElementById("reviews-title")!.getBoundingClientRect().top,
      document.querySelector("header")!.getBoundingClientRect().height,
    ]);
    expect(top).toBeGreaterThanOrEqual(headerHeight - 1);
  });

  test("reviews come before the other products, not after them @mobile", async ({ page }) => {
    await page.goto(`/vi/products/${NIGHT_LIGHT}`);
    const order = await page.evaluate(() =>
      [...document.querySelectorAll("section[aria-labelledby]")].map((s) => s.getAttribute("aria-labelledby")),
    );
    expect(order.indexOf("reviews-title")).toBeGreaterThan(-1);
    expect(order.indexOf("related-title")).toBeGreaterThan(-1);
    expect(order.indexOf("reviews-title")).toBeLessThan(order.indexOf("related-title"));
  });

  test("the source note is a quiet caption, not a tinted banner @mobile", async ({ page }) => {
    await page.goto(`/vi/products/${NIGHT_LIGHT}`);
    const note = page.locator("section[aria-labelledby='reviews-title']").getByText(/gian hàng Shopee của OVIAN/);
    await expect(note).toBeVisible();
    const bg = await note.evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(bg === "rgba(0, 0, 0, 0)" || bg === "transparent", `note still has a background: ${bg}`).toBe(true);
  });
});
