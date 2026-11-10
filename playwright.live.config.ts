import { defineConfig, devices } from "@playwright/test";

/**
 * Read-only smoke tests against the real Sapo store (COMMERCE_MODE=live, credentials in .env.local).
 * Never submits an order: ORDERS_ENABLED=false (orders would go to the owner's Google Sheet) and no test clicks "Đặt hàng".
 * Run: npx playwright test -c playwright.live.config.ts
 */
const port = Number(process.env.PORT ?? 3000);

export default defineConfig({
  testDir: "tests/e2e-live",
  workers: 1,
  retries: 0,
  timeout: 90_000,
  reporter: [["list"], ["html", { open: "never", outputFolder: "playwright-report-live" }]],
  use: { baseURL: `http://localhost:${port}`, trace: "retain-on-failure", screenshot: "only-on-failure" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } }, grepInvert: /@mobile-only/ },
    { name: "mobile", use: { ...devices["Pixel 7"] }, grep: /@mobile/ },
  ],
  webServer: {
    command: "npm run dev",
    port,
    reuseExistingServer: true,
    timeout: 120_000,
    env: { COMMERCE_MODE: "live", ORDERS_ENABLED: "false", SAPO_LIST_UNPUBLISHED: "true" },
  },
});
