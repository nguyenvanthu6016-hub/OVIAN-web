# Sapo API Capability Matrix

Checked 2026-11-04 against public docs at support.sapo.vn (API reference for the Sapo Web/Admin REST API). **No merchant credentials are configured yet, so nothing below has been tested against the OVIAN account.**

Important open question: the public reference documents the `https://{store}.mysapo.net/admin/*.json` API. Sapo Omnichannel (POS + web channel) stores also live on `*.mysapo.net`, but the docs do not state that every resource (especially POS inventory per location and POS orders) is exposed for Omnichannel plans. This must be confirmed with the owner's account (Settings → Apps → private app) or Sapo support.

Auth options seen in docs: OAuth app (`/admin/oauth/authorize` → `/admin/oauth/access_token`, permanent token, scopes such as `read_products,write_orders`). Private-app access (API key + secret, HTTP Basic) is common practice for Sapo but **not described on the pages we could read** → Unverified. The adapter supports both: `SAPO_ACCESS_TOKEN` (sent as `X-Sapo-Access-Token`) or `SAPO_API_KEY` + `SAPO_API_SECRET` (Basic).

| # | Capability | Status | Docs | Permission | Implemented | Tested | Notes / workaround |
|---|---|---|---|---|---|---|---|
| 1 | Authentication | Supported (OAuth); Basic Unverified | /oauth | — | Yes (both) | No | Need credentials |
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
| 17 | Rate limits | Unverified | — | — | Client retries 429 with backoff, max 2 | No | |
| 18 | Pagination & filtering | Partially documented (`limit`, `page`, `since_id`, `fields`) | /article | — | Yes | No | Filtering by collection: `collection_id` param Unverified; adapter falls back to `collects` |
| 19 | Error handling | Standard HTTP codes assumed | — | — | Yes | Mock only | |
| 20 | Duplicate prevention / external ref | **No idempotency key documented** | — | — | Server store + `note_attributes` ckid + tag | Mock only | See ARCHITECTURE §5 |
| — | Shipping lines on order | Assumed (`shipping_lines`) | Unverified | write_orders | Yes | No | Must confirm totals in Sapo match storefront total |
| — | Pickup / payment method label | `gateway` free text Unverified | — | — | `gateway: "COD"` / `"Tiền mặt tại cửa hàng"` + tag `pickup` | No | Owner must confirm how pickup orders should appear in Sapo |
| — | Product reviews | Not available in Sapo | — | — | Mock only | — | Live: reviews hidden until a source is chosen |

## What the owner needs to provide

1. Store domain (`xxx.mysapo.net`).
2. A private app or OAuth app with scopes: `read_products`, `read_orders`, `write_orders`, `read_price_rules` (and `read_content` if collections need it).
3. A **test store** or explicit approval before the first real `POST /admin/orders.json`.
4. Confirmation of how pickup + cash-at-store orders should be represented (tag, gateway, source).
