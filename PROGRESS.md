# OVIAN Storefront — Progress

Last updated: 2026-11-04

## Current phase

Phases 0–7 done in Mock Mode. Phase 8 (handover) docs written. **Live integration is blocked on owner inputs.**

## Done

- Brand audit from the official Brand Guideline artifact, logos copied unchanged, tokens in `globals.css`.
- Design concept "Mặt bằng" (floor-plan home index); Be Vietnam Pro; minimal motion.
- Next.js 16 / TS strict / Tailwind 4 foundation, vi/en routing (`proxy.ts`), dictionaries, formatting.
- Commerce interface with Mock and Sapo adapters; content interface with Mock and Sanity (GROQ) providers.
- Pages: home, all products, spaces (categories + sub-spaces), search with suggestions, filters (URL state, mobile drawer), PDP (gallery + zoom, variants, stock, sticky mobile bar, specs, reviews, related, recently viewed), cart, checkout (COD / pickup cash), confirmation, tracking, wishlist, account (mock only), about, journal, policies, FAQ, contact, store, 404/error.
- Server: quote, idempotent order creation with reconciliation, tracking with phone verification, search suggest, webhooks, revalidate, health, rate limiting, security headers.
- SEO: metadata, canonical, hreflang with fallback handling, sitemap, robots, Product/Breadcrumb/Organization/FAQ/Article JSON-LD.
- Tests: 34 unit, 35 E2E/a11y; visual QA screenshots; lab performance run.
- Sanity Studio schemas (`studio/`), Dockerfile, compose file, owner guide.

## Blockers (owner input needed)

1. ~~Sapo store domain + credentials~~ — done 2026-11-04 (ovianshop.mysapo.net, read verified). **REMINDER for the owner: rotate the Sapo API key/secret before go-live** (they were shared in chat).
1a. ~~Sapo website plan~~ — owner decided 2026-11-10 not to upgrade. Catalogue: every active Sapo product (`SAPO_LIST_UNPUBLISHED=true`, hide with tag `an-web`). **Orders go to the owner's Google Sheet** via Apps Script; shipping and payment handled manually.
1b. ~~Room collections~~ — done: phong-ngu, phong-khach, phong-bep, phong-tam, goc-lam-viec, do-dung-ngoai-troi.
2. ~~Google Sheet setup~~ — done 2026-11-12: script deployed, test order OV00001 written and verified (see TEST_REPORT). Owner should delete the OV00001 test row. `ORDERS_ENABLED` stays `false` until store info and real shipping fees are in (otherwise customers would see sample fees).
1c. Owner decision 2026-11-12: **home delivery (COD) only**, store pickup switched off (`STORE_PICKUP_ENABLED=false`).
2a. Bulk 30% price import: 21 variants skipped (12 without SKU, 9 "Mùng chụp tự bung" with duplicate SKUs). Owner will fix later.
3. ~~Sanity~~ — owner chose to keep content in code (`src/lib/cms/ovian-content.ts`), 2026-11-12.
4. ~~Store info, shipping fees, policies~~ — supplied 2026-11-17 and live in the content file. **Still missing: tax code / business registration number for the footer, and a contact email.**
5. Real product and room photography.
6. Hosting choice. If serverless (Vercel), approve a shared idempotency store (e.g. Upstash Redis, has a cost).

## Next actions

1. With credentials: run read-only probes (`/products.json`, `/custom_collections.json`, `/collects.json`, `/variants/{id}.json`, `/discount_codes/lookup.json`, `/orders.json?status=any&limit=1`) and update docs/SAPO_API.md.
2. After the owner deploys the Apps Script: one approved test order into the Sheet; check the row, tracking and duplicate protection.
3. Verify webhook HMAC header with a real delivery.
4. ~~Improve listing/PDP speed~~ — done 2026-11-17 (ISR for product pages, see TEST_REPORT). INP still unmeasured.
5. Screen-reader pass (NVDA + VoiceOver), Safari/Firefox visual pass.

## Key decisions

- Brand guideline overrides the UI skill's generic palette/fonts.
- Catalogue filtering is in-memory over a cached product snapshot (fine for a catalogue of a few thousand items; revisit beyond that).
- Category hierarchy via Sapo collection alias `parent--child` (Sapo collections are flat).
- Facets from product tags `facet:value`.
- Reviews: mock-only; hidden in live mode until a verified source exists. No ratings in JSON-LD.
- Customer accounts: mock-only preview; live mode shows "not available yet".
- Order confirmation renders only from the creation response held in this browser session, never from a URL.

## Live go-live checklist

- [ ] Redeploy `Code.gs` (new version) so the "Chặn" blocklist and the 3 orders/phone/day limit are live
- [ ] Set `ORDER_TOKEN_SECRET` on the server

- [ ] Sapo read endpoints verified with real data
- [ ] Test-store order matches storefront totals (incl. shipping, discount)
- [ ] Pickup/COD representation approved by owner
- [ ] Shipping fees entered in Sanity, store info entered
- [ ] Policies written
- [ ] Webhooks configured and verified
- [ ] Persistent volume (or shared store) for idempotency
- [ ] HTTPS domain, `NEXT_PUBLIC_SITE_URL` set
- [x] Google Sheet script deployed, test order written and checked (2026-11-12)
- [x] Real store info + shipping fees in (2026-11-17)
- [ ] Owner reviews the drafted "Điều khoản sử dụng" page
- [ ] Tax code / business registration number for the footer
- [ ] `ORDERS_ENABLED=true`
- [ ] Rotate Sapo API key/secret (owner) and the Sheet secret if it was ever shared
