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

1. ~~Sapo store domain + credentials~~ — done 2026-11-04 (ovianshop.mysapo.net, read verified). Still needed: written approval (or a test store) before any real order write. **Rotate the API key/secret before go-live** (they were shared in chat).
1a. Sapo plan upgrade with the web channel, then publish products to it (in progress by owner). Until then only the local preview flag shows products.
1b. Room collections in Sapo: `phong-ngu` done; `phong-khach`, `bep`, `phong-tam`, `goc-lam-viec`, `ban-cong` pending.
2. How pickup / cash-at-store orders should look in Sapo (tag, gateway, source) — current proposal in docs/OWNER_GUIDE.vi.md §5.
3. Sanity project id (and who may edit shipping fees).
4. Real store address, phone, opening hours; real shipping fees per region; return policy text.
5. Real product and room photography.
6. Hosting choice. If serverless (Vercel), approve a shared idempotency store (e.g. Upstash Redis, has a cost).

## Next actions

1. With credentials: run read-only probes (`/products.json`, `/custom_collections.json`, `/collects.json`, `/variants/{id}.json`, `/discount_codes/lookup.json`, `/orders.json?status=any&limit=1`) and update docs/SAPO_API.md.
2. Create one order in the test store; compare Sapo totals, tags, note attributes with the storefront; adjust `sapo/provider.ts` mapping.
3. Verify webhook HMAC header with a real delivery.
4. Improve listing/PDP LCP (static rendering of the unfiltered listing, fewer client islands).
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

- [ ] Sapo read endpoints verified with real data
- [ ] Test-store order matches storefront totals (incl. shipping, discount)
- [ ] Pickup/COD representation approved by owner
- [ ] Shipping fees entered in Sanity, store info entered
- [ ] Policies written
- [ ] Webhooks configured and verified
- [ ] Persistent volume (or shared store) for idempotency
- [ ] HTTPS domain, `NEXT_PUBLIC_SITE_URL` set
- [ ] `SAPO_ALLOW_ORDER_WRITES=true` only after the above
