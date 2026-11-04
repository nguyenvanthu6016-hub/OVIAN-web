import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const pages = ["/vi", "/en", "/vi/products", "/vi/spaces/bep", "/vi/products/ao-thun-cotton-co-tron", "/vi/cart", "/vi/checkout", "/vi/track", "/vi/journal", "/vi/faq", "/vi/policies/giao-hang"];

for (const path of pages) {
  test(`axe WCAG 2.2 AA: ${path} @mobile`, async ({ page }) => {
    await page.goto(path, { waitUntil: "networkidle" });
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
      .exclude("nextjs-portal") // Next.js dev overlay
      .analyze();
    const summary = results.violations.map((v) => `${v.id} (${v.impact}): ${v.nodes.length} node(s) — ${v.nodes[0]?.target.join(" ")}`);
    expect(summary, summary.join("\n")).toEqual([]);
  });
}

test("keyboard: skip link and mega menu", async ({ page }) => {
  await page.goto("/vi");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Bỏ qua, tới nội dung chính" })).toBeFocused();
  const btn = page.getByRole("button", { name: "Không gian" });
  await btn.focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("#mega-menu")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator("#mega-menu")).toBeHidden();
  await expect(btn).toBeFocused();
});
