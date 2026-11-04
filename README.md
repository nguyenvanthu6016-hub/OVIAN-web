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
| `CONTENT_MODE` | `mock` (default) / `sanity` | Bundled sample copy, or Sanity CMS |
| `SAPO_ALLOW_ORDER_WRITES` | `false` (default) / `true` | In live mode, checkout is disabled until this is `true` |

Switching modes needs only an env change and a restart; no page code changes. **Live mode never falls back to mock data**: if Sapo is unreachable, pages show an "unavailable" state and checkout is blocked while keeping what the customer typed.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` / `npm start` | Production build / server |
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
src/lib/cms/              ContentProvider: mock content or Sanity (GROQ over HTTP)
src/lib/checkout/         pricing, shipping rules, validation, idempotency, order placement
src/lib/i18n/             locales, dictionaries, formatting
src/components/           UI primitives, layout, product, cart, checkout, catalog
studio/                   Sanity Studio schemas (separate install)
public/brand/             official OVIAN logo files (unchanged copies)
public/mock/              neutral placeholder images for Mock Mode only
```

## Deploy

The app is hosting-agnostic (`output: "standalone"`).

**Docker / VPS** (recommended first target — the idempotency store needs a persistent disk):

```bash
docker compose up -d --build
```

`docker-compose.yml` reads `.env.production` and mounts a volume at `/app/.data` for the order idempotency store. Put a reverse proxy (Caddy or Nginx) in front for HTTPS and set `NEXT_PUBLIC_SITE_URL` to the final `https://` domain. Health check: `GET /api/health`.

**Vercel**: works for browsing, but the file-based idempotency store is not shared between serverless instances. Before taking real orders on Vercel, replace it with a shared store (e.g. Upstash Redis) — this needs a decision on cost (see ARCHITECTURE §5).

**Caching / sync**: catalogue reads are cached 5 minutes and invalidated by the Sapo product webhook (`/api/webhooks/sapo`) and the Sanity webhook (`/api/revalidate`). Checkout always re-reads price and stock from Sapo, uncached.

Do not deploy to production or enable `SAPO_ALLOW_ORDER_WRITES` until the live checklist in [PROGRESS.md](PROGRESS.md) is done.
