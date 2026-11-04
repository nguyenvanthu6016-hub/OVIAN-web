// Visual QA: full-page screenshots of representative pages at several viewports.
import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";
const base = process.env.BASE_URL ?? "http://localhost:3000";
const out = process.argv[2] ?? "qa/screenshots";
mkdirSync(out, { recursive: true });
const pages = (process.env.PAGES ?? "/vi,/vi/products,/vi/spaces/bep,/vi/products/ao-thun-cotton-co-tron,/vi/cart,/vi/checkout,/en").split(",");
const widths = (process.env.WIDTHS ?? "375,768,1440").split(",").map(Number);
const browser = await chromium.launch();
for (const w of widths) {
  const ctx = await browser.newContext({ viewport: { width: w, height: 900 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  if (process.env.WITH_CART) {
    await page.goto(base + "/vi/products/ao-thun-cotton-co-tron");
    await page.getByTestId("add-to-cart").click();
    await page.keyboard.press("Escape");
  }
  for (const p of pages) {
    await page.goto(base + p, { waitUntil: "networkidle" });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    const name = `${w}${p.replace(/[/?=&]/g, "_")}.png`;
    await page.screenshot({ path: `${out}/${name}`, fullPage: true });
    console.log(`${name}${overflow > 0 ? `  HORIZONTAL OVERFLOW ${overflow}px` : ""}`);
  }
  await ctx.close();
}
await browser.close();
