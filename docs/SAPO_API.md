# Sapo API Capability Matrix

Checked 2026-11-04 against public docs at support.sapo.vn (API reference for the Sapo Web/Admin REST API). **No merchant credentials are configured yet, so nothing below has been tested against the OVIAN account.**

Important open question: the public reference documents the `https://{store}.mysapo.net/admin/*.json` API. Sapo Omnichannel (POS + web channel) stores also live on `*.mysapo.net`, but the docs do not state that every resource (especially POS inventory per location and POS orders) is exposed for Omnichannel plans. This must be confirmed with the owner's account (Settings → Apps → private app) or Sapo support.

Auth options seen in docs: OAuth app (`/admin/oauth/authorize` → `/admin/oauth/access_token`, permanent token, scopes such as `read_products,write_orders`). Private-app access (API key + secret, HTTP Basic) is common practice for Sapo but **not described on the pages we could read** → Unverified. The adapter supports both: `SAPO_ACCESS_TOKEN` (sent as `X-Sapo-Access-Token`) or `SAPO_API_KEY` + `SAPO_API_SECRET` (Basic).

| # | Capability | Status | Docs | Permission | Implemented | Tested | Notes / workaround |
|---|---|---|---|---|---|---|---|
| 1 | Authentication | Basic key:secret **Verified** 2026-11-04 | /oauth | — | Yes (both) | Live read | |
| 2 | Product listing | Supported | /product `GET /admin/products.json` | read_products | Yes | Mock only | `limit` ≤250, `page`, `since_id` (pagination documented on article endpoint, assumed same) |
| 3 | Product details | Supported | /product `GET /admin/products/{id}.json` | read_products | Yes | Mock only | |
| 4 | Variants | Supported | /product-variant | read_products | Yes | Mock only | option1..3, price, compare_at_price, inventory_quantity, sku |
| 5 | Product images | Supported | /product-image | read_products | Yes | Mock only | |
| 6 | Categories | Supported (flat collections) | /customcollection, /smartcollection, /collect | read_products | Yes | Mock only | No nesting in Sapo; tree via handle prefix `parent--child` convention |
| 7 | Prices | Supported | variant price/compare_at_price | read_products | Yes | Mock only | |
| 8 | Inventory quantities | Supported per variant (`inventory_quantity`) | /product-variant | read_products | Yes | Mock only | Per-location POS stock: Unverified |
| 9 | Availability | Derived (`inventory_management`, `inventory_policy`, quantity) | /product-variant | read_products | Yes | Mock only | |
| 10 | Customers | Supported | /customer | read/write_customers | Not used | — | Guest checkout passes customer inline on order |
| 11 | Order creation | Supported `POST /admin/orders.json` | /gioi-thieu-order-api | write_orders | Yes | No | Docs: payment info not stored, any `financial_status` allowed. We send `pending` |
| 12 | Order retrieval | Supported | same | read_orders | Yes | No | Lookup by `name` filter Unverified; fallback: list recent + match |
| 13 | Order status updates | Supported (close/open/cancel, fulfillments) | same, /fulfillment | write_orders | Read only | No | Storefront only reads status |
| 14 | Discounts | Price rules + discount codes exist | /price-rule, /discountcode | read_price_rules | Yes (lookup code) | No | Evaluating rule conditions server-side is partial (percentage/fixed, min subtotal). Others → rejected safely |
| 15 | Inventory sync | Via product webhooks / polling | /sapo-webhook | — | Yes (revalidate) | No | No `inventory_levels/*` topic documented |
| 16 | Webhooks | Supported `POST /admin/webhooks.json` | /sapo-webhook | app | Yes (`/api/webhooks/sapo`) | No | HMAC header name not documented on page; assumed `X-Sapo-Hmac-Sha256` (Shopify-style). **Unverified** |
| 17 | Rate limits | Verified: `x-sapo-api-call-limit`, bucket 40 | — | — | Client retries 429 with backoff, max 2 | No | |
| 18 | Pagination & filtering | Partially documented (`limit`, `page`, `since_id`, `fields`) | /article | — | Yes | No | Filtering by collection: `collection_id` param Unverified; adapter falls back to `collects` |
| 19 | Error handling | Standard HTTP codes assumed | — | — | Yes | Mock only | |
| 20 | Duplicate prevention / external ref | **No idempotency key documented** | — | — | Server store + `note_attributes` ckid + tag | Mock only | See ARCHITECTURE §5 |
| — | Shipping lines on order | Assumed (`shipping_lines`) | Unverified | write_orders | Yes | No | Must confirm totals in Sapo match storefront total |
| — | Pickup / payment method label | `gateway` free text Unverified | — | — | `gateway: "COD"` / `"Tiền mặt tại cửa hàng"` + tag `pickup` | No | Owner must confirm how pickup orders should appear in Sapo |
| — | Product reviews | Not available in Sapo | — | — | Mock only | — | Live: reviews hidden until a source is chosen |

## Live read-only probe — 2026-11-04 (ovianshop.mysapo.net)

GET requests only, private app (API key + secret, HTTP Basic). No writes were made.

| Endpoint | Result | Finding |
|---|---|---|
| Basic auth (key:secret) | **Works** | Verified |
| Rate limit | Header `x-sapo-api-call-limit`, bucket **40** | Verified |
| `GET /products/count.json`, `/products.json?limit=250&page=n` | 200 | 51 products. Fields `name`, `alias`, `content` (HTML), `summary`, `created_on`, `published_on`; prices are **numbers** — matches the adapter |
| `GET /variants/{id}.json` | 200 | price + `inventory_quantity` readable uncached (checkout re-read works) |
| Images | `bizweb.dktcdn.net` | Covered by `*.dktcdn.net` in next.config |
| `GET /custom_collections.json`, `/smart_collections.json`, `/collects.json` | 200, **0 collections** | No categories exist yet |
| `GET /orders/count.json?status=any`, `/orders.json` | 200, 0 orders | Order read permission OK; write permission **not tested** |
| `GET /webhooks.json` | 200, 0 webhooks | |
| `GET /price_rules.json` | 403 on 11-04, **200 on 11-05** after the owner added the permission | 0 price rules exist |
| `GET /discount_codes/lookup.json` | **403** even with the permission | Adapter falls back to scanning `/price_rules.json` + `/price_rules/{id}/discount_codes.json` (the second call is untested: no rules exist yet) |
| `GET /shop.json`, `/locations.json` | 403 | Not used by the storefront |

Update 2026-11-05: owner created collection `phong-ngu` (34 products). The web channel is not on the owner's Sapo plan yet (upgrade in progress), so products cannot be published. For local preview only, `SAPO_PREVIEW_UNPUBLISHED=true` lists unpublished products; it is ignored in production builds and forces ordering off. Verified locally: listing (51), PDP with variants, cart, quote against real variant prices, unknown coupon → "invalid", checkout shows "ordering disabled".

Update 2026-11-05 (promotions): owner reports a promotion created in Sapo, but the API shows **0 variants with `compare_at_price` and 0 `price_rules`**. `/discounts.json` and `/price_lists.json` answer `403 access_denied` (OAuth-style, unlike the generic 403 of non-existent paths), which suggests these endpoints exist but the private app lacks the scope. Likely the promotion lives in Sapo Omnichannel "Khuyến mãi" programmes or price lists, which the storefront does not read yet. Shape of those resources: unknown until readable.

Data observations (blocking for go-live, owner side):
- **All 51 products have `published_on = null`** (not published to the web channel). The adapter only lists published products, so the live site would show an empty catalogue. Owner must publish the products to the website channel in Sapo (we do not override this flag).
- **No collections.** Every product carries the same tags `Shopee`, `OVIAN - Bedroom`, `Khởi tạo sản phẩm`, `product_type` is empty. Room categories (floor plan) need collections in Sapo, aliases matching the rooms (e.g. `phong-ngu`, `bep`, child `phong-ngu--den-ngu`).
- No `facet:value` tags → filters show only price/availability until tags are added.
- No `compare_at_price` set → no sale badges (correct behaviour).
- 55 of 161 variants have stock ≤ 0, `inventory_policy = deny` → shown as sold out (correct).
- Option names are inconsistent (`Màu sắc`, `Màu`, `MÀU SẮC`) — cosmetic; owner may normalise.

## What the owner needs to provide

1. Store domain (`xxx.mysapo.net`).
2. A private app or OAuth app with scopes: `read_products`, `read_orders`, `write_orders`, `read_price_rules` (and `read_content` if collections need it).
3. A **test store** or explicit approval before the first real `POST /admin/orders.json`.
4. Confirmation of how pickup + cash-at-store orders should be represented (tag, gateway, source).
