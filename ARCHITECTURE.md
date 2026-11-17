# OVIAN Storefront — Architecture

Last updated: 2026-11-04

## 1. Brand audit (Phase 0)

Sources inspected, in order of authority:

1. Published OVIAN Brand Guideline (Design System artifact, `claude.ai/artifact/3qC6VDSGJLD4NQ1yiwa5Lm`) — `README.md`, `tokens.json`, logo group. Treated as source of truth.
2. Local spec `../OVIAN-Brand/OVIAN-brand-identity.md` (consistent with 1).
3. Logo files `../OVIAN-Brand/ovian-logo-{green,yellow,white,black,green-bg}.png` (767×254 transparent PNG; green-bg is 993×993). Copied unchanged to `public/brand/`.

### Authoritative brand requirements

| Area | Rule |
|---|---|
| Name / slogan | OVIAN · “Trọn vẹn không gian sống” (never altered) |
| Business | Đồ dùng tiện nghi cho không gian sống. Catalogue organised **by living space** (phòng khách, phòng ngủ, bếp, phòng tắm, góc làm việc, ban công), minimal like Muji but not a copy |
| Logo | Logotype “ovian” with ©. **No symbol/icon exists — do not invent one.** Always use image files, never retype in a font |
| Logo pairing | Green on white/ivory/light green (default for web); yellow on OVIAN green or dark photo; white on green/ink/dark photo; black for one-colour print. Never yellow on light backgrounds |
| Logo clear space | 1X on every side, X = height of the “i” dot (≈ 13% of logo height in the PNG). Min width 100 px on web |
| Logo don'ts | No stretching, rotation, recolouring, shadows/outlines/gradients/glow, removing ©, busy photos |
| Colours | `ovian-green #2F5E3A` (primary: brand blocks, primary buttons, headings), `ovian-yellow #FEC724` (accent only: small highlights, labels, on green), `surface #FAF7EF`, `ink #1F2A22`, `surface-alt #E6EFE8`, `ink-muted #56635A`, `line #DCD8CC`, `on-green #FFFFFF`. Ratio ≈ 70 neutral / 20 green / 10 yellow |
| Text pairs | ink or green on surface/surface-alt; yellow or white on green. **No yellow text on light backgrounds** |
| Type | Be Vietnam Pro only (Google Fonts, OFL licence — free for web). Fallback Inter, Roboto, system-ui. Display 40/48 700, heading 26/34 600, subheading 19/28 600, body 17/27 400, caption 13/18 500 (+0.02em). Body line length 60–75 characters |
| Spacing | 4 px base: 4, 8, 16, 24, 32, 48, 64 |
| Radius | 4 (labels, inputs), 8 (buttons, product cards), 16 (large image blocks, brand blocks) — “soft like the dot of the i” |
| Voice | Vietnamese first, plain and specific; no hype words (“siêu”, “đỉnh”, “số 1”), no stacked exclamation marks, no emoji; always give real specs (cm, material, colour, weight) and frame products by the space they serve |
| Photography | Products on plain surface/white backgrounds, natural light, no cluttered props; each space opens with one wide room photograph |

### Missing / conflicting brand information

- **No real product or lifestyle photography** is in the project. Mock Mode uses neutral, clearly labelled SVG placeholders (`public/mock/`). Real images must come from Sapo (product images) and Sanity (editorial).
- **No vector logo** (only ~770 px PNG). Fine for web; header renders the logo at 104–120 px width.
- **No dark theme guidance for the site** beyond token dark values; storefront ships light theme only (brand surfaces are light by definition).
- **No iconography set** defined. UI uses a small set of hand-drawn 1.5 px stroke line icons (`src/components/ui/icons.tsx`) — functional UI icons only (cart, search, menu), never a brand symbol.
- Tone-of-voice section is marked “initial proposal” by the brand; copy follows it.
- The ui-ux-pro-max skill suggested an emerald/orange palette and Rubik/Nunito fonts. **Rejected** — conflicts with the official guideline.

## 2. Design direction

**Concept: “Mặt bằng” (the floor plan).** OVIAN sells by living space, so the signature element is a floor-plan index: the homepage hero is an architectural plan of a home drawn in thin green lines, each room a tile that opens its catalogue (room label + area in m² + item count). This is the one bold element; everything else stays quiet — ivory pages, generous whitespace, green headings, product photography on plain surfaces, yellow used only as a pin (sale label, cart count on green, the active room).

- Distinct from MUJI: MUJI uses product-category grids, red accents and a banner carousel. OVIAN uses a room-first plan, green/ivory, and no carousel.
- Layout: left-aligned editorial text, 12-column grid, max width 1320 px, 16 px mobile gutters / 32 px desktop.
- Motion: minimal — 150–200 ms colour/opacity transitions, drawers slide 200 ms, all disabled under `prefers-reduced-motion`.
- Avoided defaults: no all-caps eyebrows, no “→” appended to CTAs, no numbered markers unless the content is a sequence (checkout steps are), no gradient washes, no identical shadowed cards.

## 3. System architecture

```
Browser ──► Next.js 16 (App Router, RSC)
             ├─ src/app/[locale]/…        pages (vi | en)
             ├─ src/app/api/…             route handlers (BFF): quote, orders, tracking, coupons, search, webhooks, health
             ├─ src/lib/commerce/         CommerceProvider interface
             │     ├─ mock/               in-memory catalogue + simulated orders (COMMERCE_MODE=mock)
             │     └─ sapo/               Sapo Admin REST adapter (COMMERCE_MODE=live) — server-only
             ├─ src/lib/cms/              ContentProvider: Sanity GROQ over HTTP, or mock content
             ├─ src/lib/checkout/         pricing, shipping rules, validation, idempotency store
             └─ src/lib/i18n/             locales, dictionaries, formatters
```

- Pages are Server Components; client components only for cart, filters drawer, variant picker, checkout form, wishlist, menus.
- `server-only` boundaries: everything in `src/lib/commerce/sapo`, `src/lib/checkout/idempotency.ts`, and env access to secrets.
- Mode switch: `COMMERCE_MODE=mock|live`, `CONTENT_MODE=mock|sanity`. Pages call `getCommerce()` / `getContent()` and never know the mode.
- **Live mode never falls back to mock.** A Sapo failure raises `CommerceUnavailableError`; pages render the “store temporarily unavailable” state and checkout disables submission while preserving the form.

## 4. Data model

See `src/lib/commerce/types.ts`. Key points:

- `Product.id` = Sapo product id (string). Sanity `productLocalization.sapoProductId` joins editorial data. Names are never keys.
- `Variant.id` = Sapo variant id; `price`, `compareAtPrice`, `available`, `inventoryQuantity` come only from commerce.
- `Category` = Sapo collection (custom/smart collection). Tree depth via collection handle prefix convention `phong-khach/ke-sach` or Sanity `categoryTree` (documented; Sapo collections are flat).
- Localised fields: `name`, `description` resolved as `{ value, lang }` so the UI can mark Vietnamese fallback with `lang="vi"`.

## 5. Checkout & orders

1. Client sends cart lines `{variantId, quantity}` + fulfillment + address + coupon to `POST /api/checkout/quote`.
2. Server re-reads every variant from commerce (no cache), checks stock, re-prices, validates coupon, computes shipping from rules, returns a signed-free quote plus a `changes[]` list (price changed, out of stock, quantity reduced).
3. Client shows changes; customer confirms. Client sends the same payload + `checkoutId` (UUID generated once per checkout session and persisted in `sessionStorage`) + `quoteTotal` to `POST /api/orders`.
4. Server recomputes the quote. If `total !== quoteTotal` → 409 with the new quote (customer must reconfirm).
5. Idempotency: `IdempotencyStore` (durable JSON file store by default, `IDEMPOTENCY_STORE_PATH`) records `checkoutId → pending|created(orderRef)|failed`. A repeated `checkoutId` returns the stored result; a `pending` entry returns 202 “processing”. In live mode the checkoutId is also written to the Sapo order (`note_attributes` + tag `ck-<id>`) so that an *unknown* result (timeout) can be reconciled by searching recent orders before any retry.
6. Payment: `cod` (home delivery) or `cash_at_store` (pickup). Orders are created with `financial_status: "pending"`. Never marked paid.
7. **Order backend (since 2026-11-10).** The catalogue comes from Sapo, but orders go to an `OrderBackend` (`src/lib/orders`), chosen by `ORDER_BACKEND`: `mock` (Mock Mode default), **`sheets` (live default)** or `sapo`. OVIAN does not have the Sapo website plan, so live orders are written to the owner's **Google Sheet** through a Google Apps Script web app (`integrations/google-sheets/Code.gs`, setup in `docs/GOOGLE_SHEETS_ORDERS.vi.md`). The website server calls the script with a shared secret (`GOOGLE_SHEETS_SECRET`, server-only); the browser never sees the URL or secret. The script takes a lock, de-duplicates by `checkoutId`, assigns `OV00001`-style numbers, stores customer text as text (no formula injection) and keeps the original order data in a hidden JSON column used for tracking. Create is a single attempt; a timeout, network error, non-JSON reply or script error is an *unknown* outcome reconciled with `find` by checkoutId. Staff change status and "paid" in the sheet; tracking reads them back. Checkout needs `ORDERS_ENABLED=true`. Sapo stock is not decremented by web orders (manual).
8. **Delivery only (since 2026-11-12).** Store pickup is behind `STORE_PICKUP_ENABLED` (default off). When off, checkout shows home delivery (COD) only, the cart quotes for delivery, and both `/api/checkout/quote` and `/api/orders` reject `fulfillment: "pickup"` with 400. The pickup code path is kept for a later switch-on.

**Limitation:** the file store is durable on a single VPS/Docker host with a volume; on serverless (Vercel) it is not shared between instances. Production on serverless needs a shared store (Redis/Upstash or a small Postgres) — requires owner approval (cost).

## 5b. Anti-spam on the order form (2026-11-17)

Layered, and invisible to a real customer (`src/lib/security/anti-bot.ts`, enforced in `/api/orders` before anything is priced or written):

1. **Signed form token.** The checkout page issues `HMAC-SHA256(issuedAt)` keyed by `ORDER_TOKEN_SECRET` (falling back to `GOOGLE_SHEETS_SECRET`, then a random per-process key). The order must carry it, be at least 3 s and at most 6 h old. A script posting straight at the API has no token, and the timestamp cannot be rewritten without the key.
2. **Honeypot.** Hidden `website` field (off-screen, `aria-hidden`, `tabIndex=-1`). Anything in it is a script. Checked first, so the reply never reveals which rule caught the request.
3. **Order caps.** `MAX_ORDER_ITEMS` (20) and `MAX_ORDER_TOTAL` (5.000.000 ₫).
4. **Per-IP windows.** 10/minute and 5/hour (in-memory, per process).
5. **Durable rules in the Google Sheet** (Apps Script, inside the write lock and after the duplicate check, so a retry of an accepted order is never caught): a phone on the `Chặn` sheet is refused (`refused:blocked`), and more than `MAX_ORDERS_PER_PHONE_DAY` (3) orders from one number in 24 h is refused (`refused:too-many`). Numbers compare by last 9 digits. Both are decided before a row is written, so the client maps them to `OrderRefusedError` → a definite no, never an unknown outcome.

Messages to the customer stay vague for 1–2 ("reload and try again") and explicit for 3 and 5, which real people can hit.

## 6. Guest order tracking

`POST /api/orders/track` with `{ orderRef, phone }`. The server fetches the order from the order backend (Google Sheet in live mode) and compares the normalised phone (last 9 digits). Mismatch and not-found return the same generic 404 to avoid enumeration. Responses expose masked contact data only. Rate-limited per IP (in-memory token bucket; replace with shared store for multi-instance).

## 7. Shipping rules

`ShippingRuleSet` (Sanity document `shippingRates`, or `src/lib/checkout/shipping-config.mock.ts` in mock): ordered rules matching `provinceCode` list → fee, optional `freeOver` threshold, plus a `default` rule or `unavailable`. Unmatched province with no default → checkout blocks home delivery and tells the customer to choose pickup or contact the store. Pickup = 0 fee. Server recomputes on every quote. Mock fees are **sample values**, not OVIAN prices.

## 8. Internationalisation

- Routes `/vi/...` and `/en/...`; `/` redirects by `Accept-Language` (default `vi`) via `src/proxy.ts`.
- UI strings in `src/lib/i18n/dictionaries/{vi,en}.ts` (typed; `en` must satisfy the `vi` shape).
- Business data formatting via `Intl` (`vi-VN` / `en-US`), prices always VND.
- Missing English product copy → Vietnamese text rendered with `lang="vi"` + a small “Vietnamese description” note; the product page sets `<meta name="robots" content="noindex">` on the `/en` variant only when *both* name and description are fallbacks, and hreflang omits that `en` alternate. Fallbacks are logged (`[i18n-fallback] product <id>`) for editorial follow-up.

## 9. Security

- Secrets only in server env (`SAPO_*`, `SANITY_READ_TOKEN`, `SAPO_WEBHOOK_SECRET`). No `NEXT_PUBLIC_` secrets.
- Zod validation on every route handler input; output encoded by React.
- Security headers in `next.config.ts` (CSP, X-Frame-Options DENY, Referrer-Policy, Permissions-Policy, nosniff).
- Rate limiting on `/api/orders`, `/api/orders/track`, `/api/coupons/validate`.
- Webhook endpoint verifies HMAC (`X-Sapo-Hmac-Sha256`, **header name unverified** — see API matrix) before revalidating cache tags.
- Minimal PII: guest checkout data goes straight to Sapo; the idempotency store keeps only checkoutId, status, order ref, timestamp.
- Cart, wishlist, recently viewed live in `localStorage` (no PII).

## 10. Caching / sync (Hybrid Sync)

- Catalogue reads cached with `fetch` `next: { revalidate: 300, tags: ['products'] }` (live).
- Product webhooks (`products/create|update|delete`) → `revalidateTag('products')`. Inventory has no webhook topic in the docs, so stock on listings may be up to 5 min stale; **checkout always re-reads stock and price uncached**.
- Sanity content cached 600 s with tag `content`; Sanity webhook → `/api/revalidate?secret=`.
