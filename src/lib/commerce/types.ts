import type { Locale } from "@/lib/i18n/config";

/** Text that may be a fallback in another language. `lang` is the language the value is actually written in. */
export interface LocalizedText {
  value: string;
  lang: Locale;
}

export interface ProductImage {
  url: string;
  alt: string;
  width: number;
  height: number;
}

export interface ProductOption {
  /** Stable key, e.g. "color", "size". */
  key: string;
  name: string;
  values: string[];
}

export interface Variant {
  id: string;
  sku: string;
  title: string;
  /** Option key -> value, e.g. { color: "Xám" } */
  options: Record<string, string>;
  /** VND, integer */
  price: number;
  compareAtPrice: number | null;
  available: boolean;
  /** null when inventory is not tracked */
  inventoryQuantity: number | null;
  imageIndex?: number;
}

export interface ProductAttribute {
  key: "material" | "dimensions" | "weight" | "care" | "origin" | string;
  label: LocalizedText;
  value: LocalizedText;
}

export interface Product {
  id: string;
  handle: string;
  name: LocalizedText;
  summary: LocalizedText | null;
  description: LocalizedText | null;
  categoryIds: string[];
  images: ProductImage[];
  options: ProductOption[];
  variants: Variant[];
  attributes: ProductAttribute[];
  /** Facets for filtering (material, color …) */
  tags: string[];
  createdAt: string;
  relatedIds: string[];
  /** created within the last 45 days (computed when mapped, not during render) */
  isNew: boolean;
  /** true when localized copy fell back to Vietnamese */
  translationMissing: boolean;
}

export interface Category {
  id: string;
  handle: string;
  name: LocalizedText;
  description: LocalizedText | null;
  parentId: string | null;
  /** Living-space metadata used by the floor plan (optional, from CMS). */
  areaM2?: number;
  image?: ProductImage;
  productCount: number;
}

export type SortKey = "featured" | "newest" | "price-asc" | "price-desc";

export interface ProductQuery {
  locale: Locale;
  categoryHandle?: string;
  search?: string;
  /** facet key -> selected values */
  facets?: Record<string, string[]>;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  onSale?: boolean;
  sort?: SortKey;
  page?: number;
  pageSize?: number;
}

export interface FacetValue {
  value: string;
  label: string;
  count: number;
}

export interface Facet {
  key: string;
  label: string;
  values: FacetValue[];
}

export interface ProductPage {
  items: Product[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
  facets: Facet[];
  priceRange: { min: number; max: number } | null;
}

export interface Review {
  id: string;
  productId: string;
  author: string;
  rating: number;
  /** Shopee reviews have no title, and inventing one would be writing on the customer's behalf. */
  title?: string;
  body: string;
  /** null when the source did not show a date. Never guessed. */
  createdAt: string | null;
  /** The variant the reviewer bought, as the source labelled it: "Màu tím (C1B), 1m6 x 2m". */
  variant?: string;
  /** Per-criterion notes the reviewer filled in: "Chống muỗi" → "hiệu quả". */
  attributes?: { label: string; value: string }[];
  /**
   * Where the review came from, so the page can say so. "mock" is sample data and is always
   * labelled as such; "shopee" was left on the marketplace listing, not on this site.
   */
  source: "mock" | "verified" | "shopee";
}

export type FulfillmentMethod = "delivery" | "pickup";
export type PaymentMethod = "cod" | "cash_at_store";

export interface CartLineInput {
  variantId: string;
  quantity: number;
}

export interface Address {
  fullName: string;
  phone: string;
  email?: string;
  provinceCode: string;
  /** Vietnam uses a two-tier structure since 07/2025 (province → ward/commune); district kept optional for Sapo. */
  district?: string;
  ward: string;
  street: string;
}

export interface Coupon {
  code: string;
  kind: "percentage" | "fixed" | "free_shipping";
  value: number;
  minSubtotal: number;
  /** Optional cap for percentage discounts (VND) */
  maxDiscount?: number;
}

export interface OrderLine {
  variantId: string;
  productId: string;
  sku: string;
  name: string;
  variantTitle: string;
  quantity: number;
  unitPrice: number;
  /** Price before the discount, when the product is on sale. Display only. */
  compareAtPrice?: number;
  /** true when this line came from the checkout upsell, priced at the deeper discount. */
  upsell?: true;
  lineTotal: number;
}

export interface CreateOrderInput {
  checkoutId: string;
  locale: Locale;
  lines: OrderLine[];
  fulfillment: FulfillmentMethod;
  payment: PaymentMethod;
  customer: { fullName: string; phone: string; email?: string };
  shippingAddress: Address | null;
  pickupStoreId: string | null;
  note?: string;
  couponCode: string | null;
  subtotal: number;
  discount: number;
  shippingFee: number;
  total: number;
}

export type OrderStatus = "pending" | "confirmed" | "ready_for_pickup" | "shipping" | "completed" | "cancelled";

export interface Order {
  ref: string;
  externalId: string;
  createdAt: string;
  status: OrderStatus;
  financialStatus: "pending" | "paid";
  fulfillment: FulfillmentMethod;
  payment: PaymentMethod;
  lines: OrderLine[];
  subtotal: number;
  discount: number;
  shippingFee: number;
  total: number;
  customerName: string;
  customerPhone: string;
  shippingAddress: Address | null;
  simulated: boolean;
  /** Carrier and tracking number entered by staff (Google Sheet backend). */
  shipment?: { carrier: string | null; trackingNumber: string | null } | null;
}

export class CommerceUnavailableError extends Error {
  constructor(message = "Commerce backend unavailable", public readonly causeDetail?: string) {
    super(message);
    this.name = "CommerceUnavailableError";
  }
}

export class OrderOutcomeUnknownError extends Error {
  constructor(message = "Order creation result unknown") {
    super(message);
    this.name = "OrderOutcomeUnknownError";
  }
}

export interface CommerceProvider {
  readonly mode: "mock" | "live";
  listCategories(locale: Locale): Promise<Category[]>;
  getCategory(handle: string, locale: Locale): Promise<Category | null>;
  queryProducts(query: ProductQuery): Promise<ProductPage>;
  getProduct(handle: string, locale: Locale): Promise<Product | null>;
  getProductsByIds(ids: string[], locale: Locale): Promise<Product[]>;
  /** Uncached, authoritative variant lookup for checkout. */
  getVariantsFresh(variantIds: string[]): Promise<Map<string, { product: Product; variant: Variant }>>;
  findCoupon(code: string): Promise<Coupon | null>;
  listReviews(productId: string): Promise<Review[] | null>;
  createOrder(input: CreateOrderInput): Promise<Order>;
  /** Reconcile an unknown outcome: find an order created for this checkoutId. */
  findOrderByCheckoutId(checkoutId: string): Promise<Order | null>;
  getOrder(ref: string): Promise<Order | null>;
}
