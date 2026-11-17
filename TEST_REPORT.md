# OVIAN Storefront — Test Report

Run date: 2026-11-04. Environment: Windows 11, Node 26.13, Chromium (Playwright 1.64.1), Next.js 16.4.2. **All results are Mock Mode.** Nothing has run against a real Sapo store or Sanity project (no credentials yet).

## Pre-publish optimisation 2026-11-17

Changes: Next.js 16.4.2 → **16.4.6** (fixes moderate advisory GHSA-mfr8-8qww-v76h; `npm audit --omit=dev`: 0 vulnerabilities); product and journal pages cached per page (ISR, 5 min) instead of rendered per visit; Sapo catalogue snapshot built once per request; `collects` paginated (was capped at 250 links); server bundle no longer traces the whole project (standalone output 31 MB, no docs or source copied in); optimised images kept 30 days; first home product images preloaded; checkout and cart reserve a full screen so the footer does not jump; `/api/mock-control` always off in production builds; startup configuration check (`src/instrumentation.ts`); 19 unused text strings removed.

| Check | Result |
|---|---|
| Typecheck, lint, production build (no warnings) | Pass |
| Vitest | 58 / 58 |
| Playwright Mock Mode | 36 / 36 |
| Playwright live Sapo, read-only | 18 / 18 |
| Product page server time | 805 ms first visit, 8 ms from cache (`x-nextjs-cache: HIT`) |

Lab speed, production build, **real Sapo data**, Pixel 7 emulation, 4× CPU throttle, about 1.6 Mbps (two warm runs; lab numbers vary run to run and are not field data):

| Page | LCP before | LCP after | CLS before | CLS after |
|---|---|---|---|---|
| /vi | 1260 ms | 1260–1380 ms | 0.000 | 0.000 |
| /vi/products | 1308 ms | 1232–1280 ms | 0.000 | 0.000 |
| /vi/spaces/phong-ngu | 1096 ms | 1380–1584 ms | 0.000 | 0.000 |
| product page | 1312 ms | 1612–1708 ms | 0.000 | 0.000 |
| /vi/checkout (empty cart) | 960 ms | 1028–1080 ms | 0.085 | **0.000** |

LCP differences between before and after are within run-to-run noise; every page is under the 2.5 s target. The measurable gains are server response time for product pages, layout stability on checkout, and a smaller, cleaner deployment. INP is still not measured.

## Re-run 2026-11-12 (delivery only)

Store pickup switched off. Typecheck, lint pass; Vitest **58 / 58** (new: pickup refused by default, delivery still works); Playwright Mock Mode **36 / 36** (scenarios 14-15 now check that only home delivery is shown and that the quote and order APIs refuse pickup with 400; the other checkout scenarios use a Hà Nội delivery address, sample fee 25.000 ₫); Playwright live Sapo **18 / 18**.

## Live Google Sheet test 2026-11-12 (owner-approved test order)

Owner deployed the Apps Script web app and ran `setup`. With `ORDERS_ENABLED=true` set only for this run (dev server stopped afterwards; `.env.local` still has `ORDERS_ENABLED=false`):

| Check | Result |
|---|---|
| Health check (`GET /exec`) | `{"ok":true,"service":"ovian-orders"}` |
| Wrong secret | `unauthorized`, nothing written |
| Quote on real Sapo variant (motion-sensor lamp, sale price) | 140.000 ₫, no changes, orderable |
| `POST /api/orders` (store pickup, test customer "ĐƠN THỬ", phone 0900000001) | **201, OV00001**, about 6 s |
| Same checkoutId submitted twice more in parallel | both returned OV00001; OV00002 does not exist (no duplicate row) |
| Tracking with wrong phone | 404 |
| Tracking with right phone (lower-case ref) | OV00001, status pending, unpaid, phone masked, no carrier yet |
| Script `find` by checkoutId | row found, total 140000, phone kept as 0900000001 |

Not yet verified in the live sheet: a home-delivery order (address columns) and staff edits (status, carrier, tracking number) shown on the tracking page. Both are covered by unit tests against the same script. Note: order creation takes about 6 s (Apps Script); the checkout button shows a waiting state meanwhile.

## Re-run 2026-11-12 (Sheet columns for manual fulfilment)

Sheet now has 30 columns: added carrier (list), tracking number, ship date, received date, actual shipping cost, handled by, "stock deducted in Sapo" checkbox, cancel/return reason. Carrier and tracking number are shown on the tracking page; staff-only columns are not returned. Typecheck, lint pass; Vitest **56 / 56**; Playwright Mock Mode **36 / 36** (new: tracking page shows carrier and tracking number). Real Apps Script deployment still untested.

## Re-run 2026-11-10 (orders to Google Sheets)

| Check | Result |
|---|---|
| Typecheck, lint, production build | Pass |
| Vitest unit | **52 / 52 pass** (18 new) |
| Playwright Mock Mode | 35 / 35 pass |
| Playwright live Sapo, read-only | 18 / 18 pass |
| Secrets / Sheet URL in client bundle | None found |

New tests (`tests/unit/sheets-orders.test.ts`) run the real `integrations/google-sheets/Code.gs` in a VM with fake Apps Script services: header setup, one row per order with readable columns, sequential `OV00001` numbers, same checkoutId → same order and one row, formula-looking customer text stored as text, pickup row, staff status/paid edits visible in tracking, find by checkoutId, wrong secret and invalid data rejected without writing, owner email. Website client: timeout and HTML replies on create are "unknown outcome", a rejection is an outage, orders off unless enabled and configured. End to end `placeOrder` → script: parallel and repeated submits write one row; a timeout after the row was written is found by "check again" without a second row.

Not tested yet: the real Google Apps Script deployment (owner has not deployed it). Needs one approved test order.

## Re-run 2026-11-07

| Check | Result |
|---|---|
| Typecheck, lint | Pass |
| Vitest unit | 34 / 34 pass |
| Playwright E2E + axe, Mock Mode (`npx playwright test`) | **35 / 35 pass** |
| Playwright **live Sapo, read-only** (`npx playwright test -c playwright.live.config.ts`) | **18 / 18 pass**, twice in a row |

Live suite (`tests/e2e-live/live.spec.ts`, desktop 1440 + Pixel 7) runs against ovianshop.mysapo.net with the local preview flag and order writes off. It never submits an order. Checks: real catalogue and preview notice on home, Sapo room collection on the floor plan, listing count and Sapo CDN images, sale price + struck original + "Giảm 30%" on a product, `?sale=1` filter, server quote uses the live Sapo price (ignores a browser-sent price), unknown coupon → "invalid", add to cart → checkout shows "ordering disabled" and the order button is disabled, 404 for unknown product, no horizontal overflow on mobile, axe WCAG 2.2 AA on home/listing/product with real data (0 violations).

Note: run the two suites one at a time. Both start `npm run dev` on port 3000 and reuse a server that is already running, so a live-mode server would make the mock suite fail (and the reverse).

Sapo data finding (bulk 30% price import by the owner): 140 / 161 variants updated correctly. 21 were skipped by Sapo: 12 variants with no SKU, and the 9 variants of "Mùng chụp tự bung", whose SKUs are duplicated across sizes (MCBFS-N/-V/-B each used for 1m2, 1m6 and 1m8).

## Summary

| Check | Result |
|---|---|
| TypeScript `tsc --noEmit` (strict, noUncheckedIndexedAccess) | Pass, 0 errors |
| ESLint (next core-web-vitals + typescript, React 19 hook rules) | Pass, 0 problems |
| Vitest unit/integration | **34 / 34 pass** |
| Playwright E2E + accessibility | **35 / 35 pass** (desktop 1440 + Pixel 7) |
| Production build `next build` | Pass |
| `npm audit --omit=dev` | 0 vulnerabilities (16 moderate in dev-only ESLint/minimatch chain) |
| Secrets in client bundle (`.next/static`) | None found |

## Unit / integration (Vitest)

- Pricing: server prices override client prices, price-change detection, sold-out removal, stock capping, duplicate-line merge, pickup = 0 shipping, unmatched province blocks delivery, percentage (cap + minimum), fixed, free-shipping and invalid coupons.
- Shipping rules: needs-province, free-over threshold, fallback.
- Catalogue: category incl. children, multi-facet, diacritic-insensitive search ("coc su" → "Cốc sứ"), sort + pagination, English fallback flag.
- Validation: phone normalisation (+84), delivery requires address, UUID checkout id, quantity bounds.
- SEO helper: fallback English pages drop `hreflang="en"` and are noindexed.
- Idempotency: single claim, 10 concurrent claims → exactly one wins, conflicting reuse, release; `placeOrder` repeated and parallel submissions → one order; price change → rejected; timeout after creation → reconciled with no duplicate; pickup stored as cash-at-store, unpaid.

## E2E scenarios (Playwright, mock fault injection via `/api/mock-control`)

| # | Scenario | Result |
|---|---|---|
| 1–4 | Browse via floor plan, search suggestions + Enter, multi-filter with URL state, open PDP | Pass |
| 5–9 | Variant (colour + size), add, quantity change, remove, invalid and valid coupon (OVIAN10 −39.800 ₫) | Pass |
| 10–13 | Delivery, fee by province (Hà Nội 25.000, Đà Nẵng 45.000 sample), unmatched province blocked, COD order | Pass |
| 14–15 | Store pickup, no fee, cash at store | Pass |
| 16 | Item sells out before checkout → change shown, order blocked until reviewed | Pass |
| 17 | Price changes between quote and submit → 409, customer re-confirms new total | Pass |
| 18 | Backend unavailable → checkout blocked, typed data kept, catalogue shows outage state | Pass |
| 19 | Order created but response times out → "Kiểm tra lại" finds the same order | Pass |
| 20 | 5 parallel + 1 repeat submission with one checkoutId → one order ref | Pass |
| 21–22 | Language switch keeps page; English fallback product shows Vietnamese with `lang="vi"`, note, noindex, no en hreflang | Pass |
| 23–24 | Tracking with correct phone shows status (masked data); wrong phone → generic not-found (UI and API 404) | Pass |
| — | Mobile: multi-level drawer navigation, no horizontal overflow | Pass |
| — | Keyboard: skip link, mega menu opens with Enter, Esc closes and returns focus | Pass |

Real write testing against Sapo: **not done** (requires a test store and approval).

## Bugs found by tests and fixed

1. Delivery orders were re-priced on the server without the province, so every COD order was rejected as "changed" (scenario 10–13). Fixed in `place-order.ts`.
2. Filter checkboxes did not reflect a click until navigation finished. Now optimistic (`useOptimistic`).
3. Language link's accessible name did not contain its visible text "EN" (axe `label-content-name-mismatch`, all pages). Fixed.
4. Pages that call `notFound()` returned HTTP 200 because a locale-wide `loading.tsx` started streaming first. Removed; 404s verified.
5. Proxy matcher lost an escape and skipped every path except `/`. Fixed; un-prefixed URLs redirect to `/vi`.

## Accessibility

axe-core (tags wcag2a/aa, wcag21a/aa, wcag22aa) on 11 pages × 2 viewports: 0 violations after fix 3. Manual checks done: focus ring visible on all controls, drawers use native `<dialog>` (focus trap, Esc), forms have visible labels and inline errors linked with `aria-describedby`, reduced-motion disables transitions. Not done: screen-reader walkthrough (NVDA/VoiceOver), 200% zoom audit. Automated checks do not prove full WCAG 2.2 AA conformance.

## Visual QA

Full-page screenshots (`node qa/screens.mjs`) of home, catalogue, space, PDP, cart, checkout, English home at 375 / 768 / 1440 px. Observations:
- No horizontal overflow at any width.
- Logo: green on ivory header, yellow on green footer (allowed pairs); clear space applied; ≥ 100 px wide.
- Yellow appears only as badges, the hover pin on the floor plan, the CTA on the green brand block and the footer slogan — never as text on a light background.
- Floor plan reflows from 4-column plan (desktop) to 2-column stacked plan (mobile).
- Mock product images are deliberately plain line drawings labelled "Ảnh mẫu · Sample image".
Not checked: Safari/Firefox rendering, real product photography.

## Performance (lab, production build)

Pixel 7 emulation, 4× CPU throttle, ~1.6 Mbps / 150 ms network. Lab numbers, not field Core Web Vitals.

| Page | LCP | CLS | Long-task time | JS transferred |
|---|---|---|---|---|
| /vi | 1452 ms | 0.000 | 999 ms | 159 KB |
| /vi/products | 3084 ms | 0.000 | 2311 ms | 165 KB |
| /vi/products/ke-go-soi-3-tang | 2844 ms | 0.000 | 1395 ms | 163 KB |
| /vi/checkout | 2152 ms | 0.073 | 1613 ms | 170 KB |

Listing and PDP exceed the 2.5 s LCP target under this throttling. Likely causes: server render per request (search params) and hydration of many small client islands. INP not measured.

## Remaining risks / unverified

- Every Sapo endpoint shape, auth header and webhook HMAC header (see docs/SAPO_API.md).
- Whether Sapo accepts `shipping_lines`, `discount_codes` and `note_attributes` on order create so the Sapo total equals the storefront total.
- Sanity provider and studio schemas compile but have not run against a real project.
- Idempotency store is single-host; not safe on multi-instance serverless.
- In-memory rate limiting is per process.
