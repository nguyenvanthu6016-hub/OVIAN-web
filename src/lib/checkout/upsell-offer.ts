import "server-only";
import { getCommerce } from "@/lib/commerce";
import type { Locale } from "@/lib/i18n/config";
import type { Product, ProductImage, Variant } from "@/lib/commerce/types";
import { signPayload, verifyPayload } from "@/lib/security/signing";
import {
  eligibleVariant,
  pickBySeed,
  quantityForSeed,
  seedFrom,
  UPSELL_TTL_MS,
  upsellUnitPrice,
  type UpsellQuantity,
} from "./upsell";

/** Everything the checkout page needs to draw the offer. Prices here are for display only. */
export interface UpsellOffer {
  variantId: string;
  productHandle: string;
  name: string;
  variantTitle: string;
  image: ProductImage | null;
  quantity: UpsellQuantity;
  /** What the customer pays per unit under the offer. */
  unitPrice: number;
  /** What the same unit costs without the offer. */
  listPrice: number;
  /** Price before any discount. */
  compareAtPrice: number;
  issuedAt: number;
  signature: string;
}

/** What comes back from the browser when an offer is accepted. */
export interface AcceptedUpsell {
  variantId: string;
  quantity: number;
  issuedAt: number;
  signature: string;
}

const payloadFor = (variantId: string, quantity: number, issuedAt: number) => `${variantId}|${quantity}|${issuedAt}`;

/**
 * Re-check an accepted offer. Returns what to price, or null — in which case the order is simply
 * priced without an upsell rather than refused, so a stale tab never loses a customer their order.
 */
export function verifyUpsell(accepted: AcceptedUpsell | null | undefined, now = Date.now()): { variantId: string; quantity: UpsellQuantity } | null {
  if (!accepted) return null;
  if (accepted.quantity !== 1 && accepted.quantity !== 2) return null;
  if (!Number.isFinite(accepted.issuedAt)) return null;
  const age = now - accepted.issuedAt;
  if (age < 0 || age > UPSELL_TTL_MS) return null;
  if (!verifyPayload(payloadFor(accepted.variantId, accepted.quantity, accepted.issuedAt), accepted.signature)) return null;
  return { variantId: accepted.variantId, quantity: accepted.quantity };
}

function toOffer(product: Product, variant: Variant, quantity: UpsellQuantity, now: number): UpsellOffer | null {
  const unitPrice = upsellUnitPrice(variant);
  if (unitPrice === null || variant.compareAtPrice === null) return null;
  const issuedAt = now;
  return {
    variantId: variant.id,
    productHandle: product.handle,
    name: product.name.value,
    variantTitle: Object.keys(variant.options).length ? variant.title : "",
    image: product.images[variant.imageIndex ?? 0] ?? product.images[0] ?? null,
    quantity,
    unitPrice,
    listPrice: variant.price,
    compareAtPrice: variant.compareAtPrice,
    issuedAt,
    signature: signPayload(payloadFor(variant.id, quantity, issuedAt)),
  };
}

/**
 * Choose one product to offer. Preference is a product from the same category as something already
 * in the cart — the owner's choice, on the grounds that a lamp buyer is likelier to want another
 * lamp. When that category has nothing eligible, the search widens to the whole catalogue rather
 * than showing no offer at all.
 */
export async function buildUpsellOffer(
  checkoutId: string,
  cartVariantIds: string[],
  locale: Locale,
  now = Date.now(),
): Promise<UpsellOffer | null> {
  // One switch the owner can throw from the hosting panel if the margin stops being worth it.
  if (process.env.UPSELL_ENABLED === "false") return null;
  if (!cartVariantIds.length) return null;
  const commerce = getCommerce();

  const inCart = await commerce.getVariantsFresh(cartVariantIds);
  if (inCart.size === 0) return null;
  const cartProductIds = new Set([...inCart.values()].map((h) => h.product.id));
  const cartCategoryIds = [...new Set([...inCart.values()].flatMap((h) => h.product.categoryIds))].sort();

  const seed = seedFrom(checkoutId);
  const quantity = quantityForSeed(seed);

  const eligible = (items: Product[]): { product: Product; variant: Variant }[] =>
    items
      .filter((p) => !cartProductIds.has(p.id))
      .map((p) => ({ product: p, variant: eligibleVariant(p, quantity) }))
      .filter((x): x is { product: Product; variant: Variant } => x.variant !== null);

  let pool: { product: Product; variant: Variant }[] = [];

  const categoryId = pickBySeed(cartCategoryIds, seed);
  if (categoryId) {
    const categories = await commerce.listCategories(locale);
    const handle = categories.find((c) => c.id === categoryId)?.handle;
    if (handle) {
      const page = await commerce.queryProducts({ locale, categoryHandle: handle, inStock: true, pageSize: 60 });
      pool = eligible(page.items);
    }
  }

  if (!pool.length) {
    const page = await commerce.queryProducts({ locale, inStock: true, onSale: true, pageSize: 60 });
    pool = eligible(page.items);
  }

  // Sorted so the same seed always lands on the same product, whatever order the backend returned.
  pool.sort((a, b) => a.variant.id.localeCompare(b.variant.id));
  const chosen = pickBySeed(pool, seed);
  return chosen ? toOffer(chosen.product, chosen.variant, quantity, now) : null;
}
