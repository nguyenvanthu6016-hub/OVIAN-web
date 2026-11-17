/**
 * Runs once when the server starts. In production it checks the configuration and prints clear
 * warnings, so a misconfigured deployment is noticed in the server log instead of by customers.
 * It never prints secret values.
 */
export function register() {
  if (process.env.NODE_ENV !== "production" || process.env.NEXT_RUNTIME === "edge") return;
  const env = process.env;
  const problems: string[] = [];
  const live = env.COMMERCE_MODE === "live";

  const site = env.NEXT_PUBLIC_SITE_URL ?? "";
  if (!/^https:\/\//.test(site) || /localhost|127\.0\.0\.1/.test(site)) {
    problems.push("NEXT_PUBLIC_SITE_URL must be the public https:// address (used for canonical links, sitemap and robots.txt).");
  }
  if (!live) problems.push("COMMERCE_MODE is not \"live\": the site shows SAMPLE products and simulated orders.");
  if (env.MOCK_CONTROL === "true") problems.push("MOCK_CONTROL=true is for tests only. Set it to false (it is ignored in production anyway).");
  if (live && (!env.SAPO_STORE_DOMAIN || !(env.SAPO_ACCESS_TOKEN || (env.SAPO_API_KEY && env.SAPO_API_SECRET)))) {
    problems.push("Sapo domain or credentials are missing: the catalogue will show the \"unavailable\" state.");
  }
  if (live && env.ORDER_BACKEND !== "sapo") {
    if (!env.GOOGLE_SHEETS_WEBAPP_URL || !env.GOOGLE_SHEETS_SECRET) problems.push("Google Sheet URL or secret is missing: checkout stays disabled.");
    else if (env.ORDERS_ENABLED !== "true") problems.push("ORDERS_ENABLED is not \"true\": customers cannot place orders yet.");
  }
  if ((env.CONTENT_MODE ?? "mock") === "mock") {
    problems.push("CONTENT_MODE=mock: store info, shipping fees and policies come from the built-in content file. Make sure it holds OVIAN's real content, not the samples.");
  }

  if (problems.length === 0) console.info("[config] production configuration looks complete.");
  else for (const p of problems) console.warn(`[config] ${p}`);
}
