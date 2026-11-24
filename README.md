# OVIAN Storefront

E-commerce storefront for **OVIAN — Trọn vẹn không gian sống**. Next.js 16 (App Router, TypeScript strict, Tailwind CSS 4), Sapo as the commerce backend, Sanity for editorial content, Vietnamese and English.

- Architecture, brand audit, security and data flow: [ARCHITECTURE.md](ARCHITECTURE.md)
- Sapo API capability matrix: [docs/SAPO_API.md](docs/SAPO_API.md)
- Owner operations guide (Vietnamese): [docs/OWNER_GUIDE.vi.md](docs/OWNER_GUIDE.vi.md)
- Shipping configuration and province codes: [docs/SHIPPING.md](docs/SHIPPING.md)
- Status and test results: [PROGRESS.md](PROGRESS.md), [TEST_REPORT.md](TEST_REPORT.md)

## Run locally

Requirements: Node.js ≥ 20.9 (tested on 26), npm.

```bash
npm install
```

```bash
cp .env.example .env.local
```

```bash
npm run dev
```

Open http://localhost:3000 (redirects to `/vi`). With the defaults the store runs in **Mock Mode**: sample catalogue, sample content, simulated orders — every page says so in the top bar.

## Modes

| Variable | Values | Effect |
|---|---|---|
| `COMMERCE_MODE` | `mock` (default) / `live` | Mock catalogue and simulated orders, or the real Sapo store |
| `CONTENT_MODE` | empty (default) / `sanity` / `sample` | Empty: OVIAN's real content from `src/lib/cms/ovian-content.ts`. `sanity`: Sanity CMS. `sample`: placeholder copy, tests only |
| `ORDER_BACKEND` | empty (auto) / `sheets` / `sapo` | Where orders go. Auto = simulated in Mock Mode, Google Sheet in live mode |
| `ORDERS_ENABLED` | `false` (default) / `true` | In live mode, checkout is disabled until this is `true` (and the Sheet URL + secret are set) |
| `GOOGLE_SHEETS_WEBAPP_URL`, `GOOGLE_SHEETS_SECRET` | server-only | Apps Script web app that writes orders to the owner's Google Sheet, see [docs/GOOGLE_SHEETS_ORDERS.vi.md](docs/GOOGLE_SHEETS_ORDERS.vi.md) |
| `SAPO_LIST_UNPUBLISHED` | `true` / `false` | `true`: every active Sapo product is listed (no Sapo website plan needed) |
| `WEB_HIDE_TAG` | default `an-web` | Sapo products with this tag are hidden |
| `NEXT_PUBLIC_FACEBOOK_PIXEL_ID` | empty (default) | Meta Pixel id. Empty: no tracking script is served and the CSP stays closed. Read at build time — see [docs/FACEBOOK_PIXEL.vi.md](docs/FACEBOOK_PIXEL.vi.md) |
| `STORE_PICKUP_ENABLED` | `false` (default) / `true` | Store pickup at checkout. Off: home delivery (COD) only, and the server refuses pickup orders |
| `ORDER_TOKEN_SECRET` | server-only | Signs the hidden anti-spam form token. Set it in production (see [docs/ANTI_SPAM.vi.md](docs/ANTI_SPAM.vi.md)) |
| `MAX_ORDER_TOTAL`, `MAX_ORDER_ITEMS` | default 5.000.000 ₫ / 20 | Orders above either limit are refused online |

Switching modes needs only an env change and a restart; no page code changes. **Live mode never falls back to mock data**: if Sapo is unreachable, pages show an "unavailable" state and checkout is blocked while keeping what the customer typed.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` / `npm start` | Production build / server |
| `npm run build:turbopack` | Same build with Turbopack (faster locally) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint (Next core-web-vitals + TS) |
| `npm test` | Vitest unit tests (pricing, shipping, filters, validation, idempotency) |
| `npm run test:e2e` | Playwright E2E + axe accessibility (needs `MOCK_CONTROL=true`, mock mode) |
| `node qa/screens.mjs` | Full-page screenshots at 375/768/1440 into `qa/screenshots` |
| `node qa/vitals.mjs` | Lab LCP/CLS on a running production server (`BASE_URL`) |

## Project layout

```
src/app/[locale]/…        pages (vi | en)
src/app/api/…             server endpoints: quote, orders, tracking, search, webhooks, health
src/lib/commerce/         CommerceProvider interface + mock/ and sapo/ adapters
src/lib/cms/              ContentProvider: ovian-content.ts (real, default), sanity.ts, sample-content.ts (tests)
src/lib/checkout/         pricing, shipping rules, validation, idempotency, order placement
src/lib/i18n/             locales, dictionaries, formatting
src/components/           UI primitives, layout, product, cart, checkout, catalog
studio/                   Sanity Studio schemas (separate install)
public/brand/             official OVIAN logo files (unchanged copies)
public/mock/              neutral placeholder images for Mock Mode only
```

## Deploy

The app is hosting-agnostic (`output: "standalone"`).

**Build note**: `npm run build` uses webpack, not Turbopack. Turbopack compiles the CSS in a child Node process, which shared hosting blocks — Hostinger's build failed with `node process exited before we could connect to it` on `globals.css`. webpack does it in-process. `npm run build:turbopack` is the faster local alternative.

**Docker / VPS** (recommended first target — the idempotency store needs a persistent disk):

```bash
docker compose up -d --build
```

`docker-compose.yml` reads `.env.production` and mounts a volume at `/app/.data` for the order idempotency store. Put a reverse proxy (Caddy or Nginx) in front for HTTPS and set `NEXT_PUBLIC_SITE_URL` to the final `https://` domain. Health check: `GET /api/health`.

**Vercel**: works for browsing, but the file-based idempotency store is not shared between serverless instances. Before taking real orders on Vercel, replace it with a shared store (e.g. Upstash Redis) — this needs a decision on cost (see ARCHITECTURE §5).

**Startup check**: in production the server log prints `[config]` lines for anything missing (public URL, Sapo credentials, Google Sheet, ordering switch, sample content). Read them after the first start.

**Caching / sync**: catalogue reads are cached 5 minutes and invalidated by the Sapo product webhook (`/api/webhooks/sapo`) and the Sanity webhook (`/api/revalidate`). Checkout always re-reads price and stock from Sapo, uncached.

Do not deploy to production or enable `ORDERS_ENABLED` until the live checklist in [PROGRESS.md](PROGRESS.md) is done.
