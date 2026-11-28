import { defineConfig, devices } from "@playwright/test";

const port = Number(process.env.PORT ?? 3000);

export default defineConfig({
  testDir: "tests/e2e",
  // Mock state is shared server-side, so scenarios run one at a time.
  workers: 1,
  fullyParallel: false,
  retries: 0,
  timeout: 60_000,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: `http://localhost:${port}`,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } }, grepInvert: /@mobile-only/ },
    { name: "mobile", use: { ...devices["Pixel 7"] }, grep: /@mobile/ },
  ],
  webServer: {
    command: "npm run dev",
    port,
    reuseExistingServer: true,
    timeout: 120_000,
    env: {
      COMMERCE_MODE: "mock",
      CONTENT_MODE: "sample",
      MOCK_CONTROL: "true",
      // A throwaway id so the Meta Pixel actually renders under test. The shop buys its traffic
      // with that pixel: without this the funnel test would pass on a page that never loads it.
      // Outbound requests to Meta are aborted inside the test.
      NEXT_PUBLIC_FACEBOOK_PIXEL_ID: "1234567890123456",
      // A throwaway id so the Meta Pixel actually renders under test. The shop's ad account is
      // its livelihood: without this the funnel test below would pass on a page that never
      // loads the pixel at all. Outbound requests to Meta are blocked in the test itself.
    },
  },
});
