# OVIAN Storefront — Implementation Plan

| Phase | Scope | Acceptance criteria | Depends on |
|---|---|---|---|
| 0 Discovery | Brand audit, asset inventory, tooling check | Audit in ARCHITECTURE §1 | — |
| 1 Architecture & API | Sapo capability matrix, data model, modes, idempotency design | docs/SAPO_API.md, ARCHITECTURE §3–10 | Phase 0 |
| 2 Foundation | Next.js 16 + TS strict + Tailwind 4, tokens, fonts, i18n routing, UI primitives, header/mega menu/drawer/footer | `npm run build` passes; logo + tokens render | 1 |
| 3 Storefront | Home (floor plan), catalogue, category, search + suggestions, filters (URL state), PDP, cart | Pages render in mock at 375–1440 px without overflow | 2 |
| 4 Commerce | Quote API, shipping rules, coupons, checkout (COD / pickup cash), idempotent order API, confirmation, tracking | E2E 10–20, 23–24 pass in mock | 3 |
| 5 Content & i18n | Sanity schemas (`studio/`), GROQ provider, policy/about/journal/store pages, EN fallback, hreflang, sitemap, robots, JSON-LD | Pages render from mock content; Sanity provider compiles | 2 |
| 6 Marketing | Wishlist, recently viewed, cross-sell, reviews (mock only), promotions, mock account pages | Features work in mock; live states honest | 3 |
| 7 QA | typecheck, lint, vitest, Playwright E2E + axe + screenshots, build | TEST_REPORT.md filled | all |
| 8 Handover | README (owner guide), deployment (Docker), env docs, acceptance checklist | Docs complete | all |

Blocked until owner input: Sapo credentials/test store (live verification), Sanity project id (live content), real store address/hours, real shipping fees, real imagery, approval for shared idempotency store on serverless hosting.
