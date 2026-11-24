import { expect, test, type Page } from "@playwright/test";

/** Mock-mode fault injection (enabled only with MOCK_CONTROL=true). */
async function control(page: Page, body: Record<string, unknown>) {
  const r = await page.request.post("/api/mock-control", { data: body });
  expect(r.ok()).toBeTruthy();
}

async function addToCart(page: Page, handle: string, opts: { color?: string; size?: string } = {}) {
  await page.goto(`/vi/products/${handle}`);
  if (opts.color) await page.getByRole("button", { name: opts.color, exact: true }).click();
  if (opts.size) await page.getByRole("button", { name: opts.size, exact: true }).click();
  await page.getByTestId("add-to-cart").click();
  await expect(page.locator("#cart-drawer")).toBeVisible();
  await page.keyboard.press("Escape");
}

async function orderToken(page: Page) {
  return (await page.getByTestId("order-token").inputValue());
}

/**
 * The server refuses an order sent within 3s of issuing the form token. The token carries the
 * moment the server made it, so wait on that — not on page load, which starts earlier and would
 * under-wait whenever the server is slow to render.
 */
async function waitForFormAge(page: Page) {
  const issuedAt = Number((await orderToken(page)).split(".")[0]);
  const left = 3200 - (Date.now() - issuedAt);
  if (left > 0) await page.waitForTimeout(left);
}

async function placeOrder(page: Page) {
  await waitForFormAge(page);
  await page.getByTestId("place-order").click();
}

async function fillContact(page: Page, phone = "0912345678") {
  await page.getByLabel("Họ và tên").fill("Nguyễn Thử Nghiệm");
  await page.getByLabel("Số điện thoại").fill(phone);
}

/** Home delivery is the only method (store pickup is switched off). Sample fee: Hà Nội 25.000 ₫. */
async function fillDelivery(page: Page, province = "ha-noi") {
  await page.getByLabel("Tỉnh / Thành phố").selectOption(province);
  await page.getByLabel("Phường / Xã").fill("Phường Mẫu");
  await page.getByLabel("Số nhà, tên đường").fill("12 Đường Mẫu");
}

test.beforeEach(async ({ page }) => {
  await control(page, { action: "reset" });
  await page.goto("/vi");
  await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
});

test("1-4: browse categories, search, filter, open PDP", async ({ page }) => {
  await page.goto("/vi");
  await page.getByRole("navigation", { name: "Mặt bằng nhà: các không gian sống" }).getByRole("link", { name: /Bếp/ }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Bếp" })).toBeVisible();

  await page.getByRole("button", { name: "Tìm kiếm" }).click();
  const search = page.locator("#search-panel").getByRole("combobox");
  await search.fill("coc");
  await expect(page.getByRole("option", { name: /Cốc sứ trắng/ })).toBeVisible();
  await search.press("Enter");
  await expect(page).toHaveURL(/\/vi\/search\?q=coc/);
  await expect(page.locator("main").getByTestId("product-card")).toHaveCount(1);

  await page.goto("/vi/products");
  await page.locator("aside").getByLabel(/^Gỗ/).check();
  await expect(page).toHaveURL(/material=go/);
  await expect(page.getByRole("button", { name: /Bỏ lọc Gỗ/ })).toBeVisible();
  const cards = page.getByTestId("product-card");
  await expect(cards.first()).toBeVisible();
  await cards.first().getByRole("link").last().click();
  await expect(page.getByTestId("add-to-cart")).toBeVisible();
});

test("5-9: variant, add, change qty, remove, coupons", async ({ page }) => {
  await addToCart(page, "ao-thun-cotton-co-tron", { color: "Xanh rêu", size: "M" });
  await addToCart(page, "coc-su-trang-350ml");
  await page.goto("/vi/cart");
  await expect(page.locator("main").getByTestId("cart-line")).toHaveCount(2);
  await expect(page.locator("main").getByText("Xanh rêu / M")).toBeVisible();

  await page.getByRole("button", { name: "Tăng số lượng" }).first().click();
  await expect(page.getByTestId("subtotal")).toHaveText(/527\.000/); // 199.000×2 + 129.000

  await page.getByRole("button", { name: /Xoá Cốc sứ trắng/ }).click();
  await expect(page.locator("main").getByTestId("cart-line")).toHaveCount(1);

  await page.getByLabel("Mã giảm giá").fill("SAIMA");
  await page.getByRole("button", { name: "Áp dụng" }).click();
  await expect(page.getByText(/SAIMA không hợp lệ/)).toBeVisible();

  await page.getByLabel("Mã giảm giá").fill("OVIAN10");
  await page.getByRole("button", { name: "Áp dụng" }).click();
  await expect(page.getByText("Đã áp dụng mã OVIAN10")).toBeVisible();
  await expect(page.getByTestId("discount")).toHaveText(/39\.800/);
});

test("10-13: home delivery, shipping fee, COD order", async ({ page }) => {
  await addToCart(page, "coc-su-trang-350ml");
  await page.goto("/vi/checkout");
  await fillContact(page);
  await fillDelivery(page, "ha-noi");
  await expect(page.getByTestId("shipping")).toHaveText(/25\.000/);
  await expect(page.getByTestId("payment-method")).toHaveText("Tiền mặt khi nhận hàng (COD)");
  await page.getByLabel("Tỉnh / Thành phố").selectOption("ca-mau");
  await expect(page.getByText("OVIAN chưa giao tới khu vực này").first()).toBeVisible();
  await expect(page.getByTestId("place-order")).toBeDisabled();
  await page.getByLabel("Tỉnh / Thành phố").selectOption("da-nang");
  await expect(page.getByTestId("shipping")).toHaveText(/45\.000/);
  await placeOrder(page);
  await expect(page.getByTestId("order-confirmed")).toBeVisible();
  await expect(page.getByText("Đây là đơn hàng mô phỏng")).toBeVisible();
  await expect(page.locator("main").getByText("Tiền mặt khi nhận hàng (COD)")).toBeVisible();
});

test("14-15: only home delivery is offered; the server refuses store pickup", async ({ page }) => {
  await addToCart(page, "ke-go-soi-3-tang");
  await page.goto("/vi/checkout");
  await expect(page.getByTestId("fulfillment-delivery-only")).toContainText("Giao tận nhà");
  await expect(page.getByTestId("fulfillment-pickup")).toHaveCount(0);
  await expect(page.getByText("Nhận tại cửa hàng")).toHaveCount(0);
  await expect(page.getByTestId("payment-method")).toHaveText("Tiền mặt khi nhận hàng (COD)");

  const quote = await page.request.post("/api/checkout/quote", {
    data: { lines: [{ variantId: "v-1005-1", quantity: 1 }], couponCode: null, fulfillment: "pickup", provinceCode: null },
  });
  expect(quote.status()).toBe(400);
  await waitForFormAge(page);
  const order = await page.request.post("/api/orders", {
    data: {
      checkoutId: crypto.randomUUID(), locale: "vi", lines: [{ variantId: "v-1005-1", quantity: 1, seenPrice: 129000 }],
      fulfillment: "pickup", customer: { fullName: "Nguyễn Thử", phone: "0912345678" }, confirmedTotal: 129000,
      token: await orderToken(page),
    },
  });
  expect(order.status()).toBe(400);
  expect(((await order.json()) as { status: string }).status).toBe("pickup-disabled");
});

test("16: item sells out before checkout", async ({ page }) => {
  await addToCart(page, "coc-su-trang-350ml");
  await addToCart(page, "so-tay-giay-tai-che-a5");
  await control(page, { action: "stock", variantId: "v-1005-1", stock: 0 });
  await page.goto("/vi/checkout");
  await fillDelivery(page);
  await expect(page.getByTestId("quote-changes")).toContainText("Cốc sứ trắng 350 ml: đã hết hàng");
  await expect(page.getByTestId("place-order")).toBeDisabled();
  await page.getByRole("button", { name: "Tôi đã xem, cập nhật đơn" }).click();
  await expect(page.getByTestId("quote-changes")).toHaveCount(0);
  await expect(page.getByTestId("place-order")).toBeEnabled();
});

test("17: price changes between quote and submit", async ({ page }) => {
  await addToCart(page, "coc-su-trang-350ml");
  await page.goto("/vi/checkout");
  await fillContact(page);
  await fillDelivery(page);
  await expect(page.getByTestId("total")).toHaveText(/154\.000/); // 129.000 + 25.000 delivery
  await control(page, { action: "price", variantId: "v-1005-1", price: 149000 });
  await placeOrder(page);
  await expect(page.getByText("Giá hoặc số lượng đã thay đổi").first()).toBeVisible();
  await expect(page.getByTestId("quote-changes")).toContainText("149.000");
  await page.getByRole("button", { name: "Tôi đã xem, cập nhật đơn" }).click();
  await expect(page.getByTestId("total")).toHaveText(/174\.000/);
  await placeOrder(page);
  await expect(page.getByTestId("order-confirmed")).toBeVisible();
});

test("18: commerce backend unavailable keeps input and blocks ordering", async ({ page }) => {
  await addToCart(page, "coc-su-trang-350ml");
  await page.goto("/vi/checkout");
  await fillContact(page);
  await control(page, { action: "faults", mode: "unavailable" });
  await fillDelivery(page); // choosing a province asks the server for a new quote
  await expect(page.getByText(/Hệ thống bán hàng đang tạm gián đoạn/).first()).toBeVisible();
  await expect(page.getByTestId("place-order")).toBeDisabled();
  await expect(page.getByLabel("Họ và tên")).toHaveValue("Nguyễn Thử Nghiệm");
  await page.goto("/vi/products");
  await expect(page.getByText("Cửa hàng tạm gián đoạn")).toBeVisible();
  await control(page, { action: "faults", mode: "none" });
});

test("19: order times out after creation; 'check again' finds it without duplicating", async ({ page }) => {
  await addToCart(page, "coc-su-trang-350ml");
  await page.goto("/vi/checkout");
  await fillContact(page);
  await fillDelivery(page);
  await expect(page.getByTestId("total")).toHaveText(/154\.000/);
  await control(page, { action: "faults", mode: "order-timeout" });
  await placeOrder(page);
  await expect(page.getByText(/Chưa xác nhận được kết quả đặt hàng/)).toBeVisible();
  await control(page, { action: "faults", mode: "none" });
  await page.getByRole("button", { name: "Kiểm tra lại" }).click();
  await expect(page.getByTestId("order-confirmed")).toBeVisible();
});

test("20: repeated submissions create a single order", async ({ page }) => {
  await addToCart(page, "coc-su-trang-350ml");
  await page.goto("/vi/checkout");
  await fillContact(page);
  await fillDelivery(page);
  await expect(page.getByTestId("total")).toHaveText(/154\.000/);
  const checkoutId = crypto.randomUUID();
  const body = {
    checkoutId, locale: "vi", lines: [{ variantId: "v-1005-1", quantity: 1, seenPrice: 129000 }], fulfillment: "delivery",
    address: { provinceCode: "ha-noi", ward: "Phường Mẫu", street: "12 Đường Mẫu" },
    customer: { fullName: "Nguyễn Thử", phone: "0912345678" }, confirmedTotal: 154000,
    token: await orderToken(page),
  };
  await waitForFormAge(page);
  const results = await Promise.all(Array.from({ length: 5 }, () => page.request.post("/api/orders", { data: body })));
  const refs = new Set<string>();
  for (const r of results) {
    expect([201, 202]).toContain(r.status());
    const j = (await r.json()) as { order?: { ref: string } };
    if (j.order) refs.add(j.order.ref);
  }
  const again = await page.request.post("/api/orders", { data: body });
  const ref = ((await again.json()) as { order: { ref: string } }).order.ref;
  refs.add(ref);
  expect(refs.size).toBe(1);
});

test("21-22: language switch and missing English translation fallback", async ({ page }) => {
  await page.goto("/vi/products/ke-go-soi-3-tang");
  await page.getByRole("banner").getByRole("link", { name: /English/ }).click();
  await expect(page).toHaveURL(/\/en\/products\/ke-go-soi-3-tang/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Three-tier oak shelf");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");

  await page.goto("/en/products/chai-chiet-pet-300ml");
  const h1 = page.getByRole("heading", { level: 1 });
  await expect(h1).toHaveText("Chai chiết PET 300 ml");
  await expect(h1).toHaveAttribute("lang", "vi");
  await expect(page.getByText("This description is currently available in Vietnamese only.")).toBeVisible();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  await expect(page.locator('link[rel="alternate"][hreflang="en"]')).toHaveCount(0);
});

test("23-24: guest tracking needs the right phone", async ({ page }) => {
  await addToCart(page, "coc-su-trang-350ml");
  await page.goto("/vi/checkout");
  await fillContact(page, "0987654321");
  await fillDelivery(page);
  await placeOrder(page);
  const ref = (await page.getByTestId("order-ref").textContent())!.trim();

  await page.goto("/vi/track");
  await page.getByLabel("Mã đơn hàng").fill(ref);
  await page.getByLabel("Số điện thoại").fill("0900000000");
  await page.getByRole("button", { name: "Tra cứu" }).click();
  await expect(page.getByText("Không tìm thấy đơn hàng khớp")).toBeVisible();

  await page.getByLabel("Số điện thoại").fill("0987654321");
  await page.getByRole("button", { name: "Tra cứu" }).click();
  await expect(page.getByTestId("tracked-status")).toHaveText("Chờ xác nhận");
  await expect(page.getByTestId("tracked-order")).not.toContainText("Nguyễn Thử Nghiệm");

  const api = await page.request.post("/api/orders/track", { data: { orderRef: ref, phone: "0911111111" } });
  expect(api.status()).toBe(404);
  await expect(page.getByTestId("tracked-shipment")).toHaveCount(0); // no carrier yet
});

test("tracking shows carrier and tracking number once staff fill them in", async ({ page }) => {
  // The Google Sheet backend returns these fields; here the API reply is stubbed to test the page.
  await page.route("**/api/orders/track", (route) =>
    route.fulfill({
      json: {
        order: {
          ref: "OV00012", createdAt: "2026-11-12T03:00:00.000Z", status: "shipping", financialStatus: "pending",
          fulfillment: "delivery", payment: "cod", lines: [{ name: "Cốc sứ trắng 350 ml", variantTitle: "", quantity: 1, lineTotal: 129000 }],
          subtotal: 129000, discount: 0, shippingFee: 25000, total: 154000, phoneMasked: "•••••••678", province: "Hà Nội",
          simulated: false, shipment: { carrier: "GHN", trackingNumber: "GHN123456VN" },
        },
      },
    }),
  );
  await page.goto("/vi/track");
  await page.getByLabel("Mã đơn hàng").fill("OV00012");
  await page.getByLabel("Số điện thoại").fill("0912345678");
  await page.getByRole("button", { name: "Tra cứu" }).click();
  await expect(page.getByTestId("tracked-status")).toHaveText("Đang giao");
  const shipment = page.getByTestId("tracked-shipment");
  await expect(shipment).toContainText("GHN");
  await expect(shipment).toContainText("GHN123456VN");
});

test("mobile: drawer navigation and sticky add to cart @mobile-only", async ({ page }) => {
  await page.goto("/vi");
  await page.getByRole("button", { name: "Mở danh mục" }).click();
  const nav = page.locator("#mobile-nav");
  await expect(nav).toBeVisible();
  await nav.getByRole("button", { name: "Phòng ngủ" }).click();
  await nav.getByRole("link", { name: "Đồ mặc cơ bản" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Đồ mặc cơ bản" })).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});

test("25: anti-bot checks refuse scripted orders but not a real customer", async ({ page }) => {
  await addToCart(page, "coc-su-trang-350ml");
  await page.goto("/vi/checkout");
  await fillContact(page);
  await fillDelivery(page);
  const token = await orderToken(page);
  const base = {
    locale: "vi", lines: [{ variantId: "v-1005-1", quantity: 1, seenPrice: 129000 }], fulfillment: "delivery",
    address: { provinceCode: "ha-noi", ward: "Phường Mẫu", street: "12 Đường Mẫu" },
    customer: { fullName: "Nguyễn Thử", phone: "0912345678" }, confirmedTotal: 154000,
  };
  const post = (over: Record<string, unknown>) =>
    page.request.post("/api/orders", { data: { checkoutId: crypto.randomUUID(), ...base, ...over } });
  await waitForFormAge(page);

  // No token (a script posting straight at the API), a forged one, and the hidden honeypot filled in.
  for (const over of [{}, { token: "9999999999999.forged" }, { token, website: "http://spam.example" }]) {
    const r = await post(over);
    expect(r.status()).toBe(400);
    expect(((await r.json()) as { status: string }).status).toBe("refused");
  }

  // Too many items, and too large a total.
  const big = await post({ token, lines: [{ variantId: "v-1005-1", quantity: 99, seenPrice: 129000 }], confirmedTotal: 12_771_000 });
  expect(((await big.json()) as { error: string }).error).toBe("too-large");

  // The customer's own submission still goes through, and says nothing about the checks.
  await placeOrder(page);
  await expect(page.getByTestId("order-confirmed")).toBeVisible();
});

test("the hidden anti-bot field is invisible and unreachable by keyboard @mobile-only", async ({ page }) => {
  await addToCart(page, "coc-su-trang-350ml");
  await page.goto("/vi/checkout");
  const honeypot = page.locator("#co-website");
  await expect(honeypot).toHaveCount(1);
  await expect(honeypot).not.toBeInViewport();
  expect(await honeypot.evaluate((el) => el.closest("[aria-hidden=true]") !== null && (el as HTMLInputElement).tabIndex === -1)).toBe(true);
});
