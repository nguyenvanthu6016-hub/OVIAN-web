// Lab measurement of LCP / CLS / TBT-ish long tasks on the production build. Not field data.
import { chromium, devices } from "@playwright/test";
const base = process.env.BASE_URL ?? "http://localhost:3100";
// PATHS="/vi,/vi/products" overrides the default (mock catalogue) list.
const paths = process.env.PATHS ? process.env.PATHS.split(",") : ["/vi", "/vi/products", "/vi/products/ke-go-soi-3-tang", "/vi/checkout"];
const browser = await chromium.launch();
for (const path of paths) {
  const ctx = await browser.newContext({ ...devices["Pixel 7"] });
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  await cdp.send("Network.emulateNetworkConditions", { offline: false, latency: 150, downloadThroughput: (1.6 * 1024 * 1024) / 8, uploadThroughput: (750 * 1024) / 8 });
  await page.addInitScript(() => {
    window.__v = { lcp: 0, cls: 0, longTasks: 0 };
    new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__v.lcp = e.startTime; }).observe({ type: "largest-contentful-paint", buffered: true });
    new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__v.cls += e.value; }).observe({ type: "layout-shift", buffered: true });
    new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__v.longTasks += Math.max(0, e.duration - 50); }).observe({ type: "longtask", buffered: true });
  });
  await page.goto(base + path, { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);
  const v = await page.evaluate(() => window.__v);
  const ttfb = await page.evaluate(() => Math.round(performance.getEntriesByType("navigation")[0]?.responseStart ?? 0));
  const js = await page.evaluate(() => performance.getEntriesByType("resource").filter((r) => r.initiatorType === "script").reduce((s, r) => s + (r.transferSize || 0), 0));
  console.log(`${path.slice(0, 44).padEnd(44)} TTFB ${ttfb}ms  LCP ${Math.round(v.lcp)}ms  CLS ${v.cls.toFixed(3)}  blocking ${Math.round(v.longTasks)}ms  JS ${(js / 1024).toFixed(0)}KB`);
  await ctx.close();
}
await browser.close();
