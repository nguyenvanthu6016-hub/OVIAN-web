import "server-only";
import type { Locale } from "@/lib/i18n/config";
import { getContent } from "@/lib/cms";
import type { CategoryLocalization, ProductLocalization } from "@/lib/cms/types";
import { applyQuery } from "../query";
import type {
  Category,
  CommerceProvider,
  Coupon,
  CreateOrderInput,
  LocalizedText,
  Order,
  OrderStatus,
  Product,
  Variant,
} from "../types";
import { SapoForbidden, SapoNotFound, previewUnpublished, sapoGet, sapoPostOrder } from "./client";

/* ---------- Raw Sapo shapes (only fields we read). Sapo uses name/alias/content; Shopify-style aliases kept defensively. ---------- */
interface RawVariant {
  id: number;
  sku?: string | null;
  title?: string;
  price: string | number;
  compare_at_price?: string | number | null;
  inventory_quantity?: number | null;
  inventory_management?: string | null;
  inventory_policy?: string | null;
  option1?: string | null;
  option2?: string | null;
  option3?: string | null;
  image_id?: number | null;
}
interface RawProduct {
  id: number;
  name?: string;
  title?: string;
  alias?: string;
  handle?: string;
  content?: string | null;
  body_html?: string | null;
  summary?: string | null;
  tags?: string | null;
  created_on?: string;
  created_at?: string;
  published_on?: string | null;
  published_at?: string | null;
  images?: { id: number; src: string; alt?: string | null; width?: number; height?: number }[];
  options?: { name: string; position: number; values?: string[] }[];
  variants?: RawVariant[];
}
interface RawCollection {
  id: number;
  name?: string;
  title?: string;
  alias?: string;
  handle?: string;
  description?: string | null;
  body_html?: string | null;
  image?: { src: string } | null;
}
interface RawOrder {
  id: number;
  name: string;
  created_on?: string;
  created_at?: string;
  financial_status?: string;
  fulfillment_status?: string | null;
  cancelled_on?: string | null;
  cancelled_at?: string | null;
  closed_on?: string | null;
  total_price: string | number;
  subtotal_price?: string | number;
  total_discounts?: string | number;
  phone?: string | null;
  tags?: string | null;
  note_attributes?: { name: string; value: string }[];
  shipping_lines?: { price: string | number }[];
  line_items: { variant_id: number; product_id: number; sku?: string; name?: string; title?: string; variant_title?: string; quantity: number; price: string | number }[];
  customer?: { first_name?: string; last_name?: string; phone?: string | null } | null;
  shipping_address?: { name?: string; phone?: string; address1?: string; province?: string; province_code?: string; district?: string; ward?: string } | null;
}

const PRODUCTS_TTL = 300;
const num = (v: string | number | null | undefined) => (v === null || v === undefined || v === "" ? null : Math.round(Number(v)));
/**
 * Sapo product content is HTML. The storefront renders plain text only (no injected markup),
 * so keep block boundaries as line breaks and decode the common entities.
 */
const ENTITIES: Record<string, string> = { nbsp: " ", amp: "&", lt: "<", gt: ">", quot: '"', "#39": "'", apos: "'" };
const stripHtml = (html: string) =>
  html
    .replace(/<\s*(br|\/p|\/div|\/li|\/h[1-6]|\/tr)\b[^>]*>/gi, "\n")
    .replace(/<\s*li\b[^>]*>/gi, "• ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&(nbsp|amp|lt|gt|quot|#39|apos);/g, (_, e: string) => ENTITIES[e] ?? "")
    .replace(/[ \t\f\v\u00a0]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
const lt = (value: string, lang: Locale): LocalizedText => ({ value, lang });

/**
 * Find a discount code. `/discount_codes/lookup.json` returned 403 on the OVIAN account (2026-11-04)
 * even with price-rule read permission, so on 401/403 fall back to scanning price rules and their codes.
 * Case-insensitive match, as customers type codes freely.
 */
async function lookupDiscountCode(code: string): Promise<{ price_rule_id: number; code: string } | null> {
  try {
    const { discount_code } = await sapoGet<{ discount_code: { price_rule_id: number; code: string } }>(
      `/discount_codes/lookup.json?code=${encodeURIComponent(code)}`,
    );
    return discount_code;
  } catch (e) {
    if (e instanceof SapoNotFound) return null;
    if (!(e instanceof SapoForbidden)) throw e;
  }
  const { price_rules } = await sapoGet<{ price_rules: { id: number }[] }>(`/price_rules.json?limit=250`, { revalidate: 60, tags: ["discounts"] });
  const wanted = code.toUpperCase();
  for (const rule of price_rules) {
    const { discount_codes } = await sapoGet<{ discount_codes: { code: string }[] }>(`/price_rules/${rule.id}/discount_codes.json`, {
      revalidate: 60,
      tags: ["discounts"],
    });
    const hit = discount_codes.find((d) => d.code.toUpperCase() === wanted);
    if (hit) return { price_rule_id: rule.id, code: hit.code };
  }
  return null;
}

/** Fetch every published product, paginated (limit 250). Cached + tagged for webhook revalidation. */
async function fetchAllProducts(): Promise<RawProduct[]> {
  const out: RawProduct[] = [];
  for (let page = 1; page <= 40; page++) {
    const { products } = await sapoGet<{ products: RawProduct[] }>(`/products.json?limit=250&page=${page}`, {
      revalidate: PRODUCTS_TTL,
      tags: ["products"],
    });
    out.push(...products);
    if (products.length < 250) break;
  }
  // Auto-publish rule: any product published in Sapo with at least one variant appears on the site.
  const includeUnpublished = previewUnpublished();
  return out.filter((p) => {
    if (includeUnpublished) return (p.variants?.length ?? 0) > 0;
    const published = "published_on" in p ? p.published_on : "published_at" in p ? p.published_at : "unknown";
    return published !== null && (p.variants?.length ?? 0) > 0;
  });
}

/**
 * Category tree: Sapo collections are flat. Convention: alias "phong-khach--ke-va-hop" is a child of "phong-khach".
 * Product membership comes from /collects.json (custom collections). Smart collections: Unverified.
 */
async function fetchCollections(): Promise<{ collections: RawCollection[]; membership: Map<number, number[]> }> {
  const [{ custom_collections }, collects] = await Promise.all([
    sapoGet<{ custom_collections: RawCollection[] }>(`/custom_collections.json?limit=250`, { revalidate: PRODUCTS_TTL, tags: ["products"] }),
    sapoGet<{ collects: { collection_id: number; product_id: number }[] }>(`/collects.json?limit=250`, { revalidate: PRODUCTS_TTL, tags: ["products"] }),
  ]);
  const membership = new Map<number, number[]>();
  for (const c of collects.collects) membership.set(c.product_id, [...(membership.get(c.product_id) ?? []), c.collection_id]);
  return { collections: custom_collections, membership };
}

function mapCategory(c: RawCollection, all: RawCollection[], locale: Locale, counts: Map<string, number>, loc?: CategoryLocalization): Category {
  const handle = c.alias ?? c.handle ?? String(c.id);
  const parentHandle = handle.includes("--") ? handle.split("--")[0] : null;
  const parent = parentHandle ? all.find((x) => (x.alias ?? x.handle) === parentHandle) : undefined;
  const viName = c.name ?? c.title ?? handle;
  const desc = c.description ?? c.body_html;
  return {
    id: String(c.id),
    handle,
    name: locale === "en" && loc?.nameEn ? lt(loc.nameEn, "en") : lt(viName, "vi"),
    description: locale === "en" && loc?.descriptionEn ? lt(loc.descriptionEn, "en") : desc ? lt(stripHtml(desc), "vi") : null,
    parentId: parent ? String(parent.id) : null,
    areaM2: loc?.areaM2,
    image: c.image?.src ? { url: c.image.src, alt: viName, width: 1200, height: 800 } : undefined,
    productCount: counts.get(String(c.id)) ?? 0,
  };
}

function mapProduct(p: RawProduct, locale: Locale, membership: Map<number, number[]>, loc: ProductLocalization | undefined): Product {
  const viName = p.name ?? p.title ?? "";
  const viDesc = p.content ?? p.body_html ?? "";
  const optionDefs = (p.options ?? []).sort((a, b) => a.position - b.position);
  const optionKey = (i: number) => `opt${i + 1}`;
  const defaultTitle = (t?: string) => !t || /default/i.test(t) || t === "Mặc định";
  const hasRealOptions = optionDefs.length > 0 && !(optionDefs.length === 1 && (p.variants ?? []).length === 1 && defaultTitle(p.variants?.[0]?.title));

  const variants: Variant[] = (p.variants ?? []).map((v) => {
    const tracked = !!v.inventory_management;
    const qty = tracked ? (v.inventory_quantity ?? 0) : null;
    const allowOversell = v.inventory_policy === "continue";
    const options: Record<string, string> = {};
    if (hasRealOptions) [v.option1, v.option2, v.option3].forEach((o, i) => { if (o && optionDefs[i]) options[optionKey(i)] = o; });
    const price = num(v.price) ?? 0;
    const compare = num(v.compare_at_price);
    return {
      id: String(v.id),
      sku: v.sku ?? "",
      title: hasRealOptions ? Object.values(options).join(" / ") : viName,
      options,
      price,
      compareAtPrice: compare && compare > price ? compare : null,
      available: !tracked || allowOversell || (qty ?? 0) > 0,
      inventoryQuantity: qty,
      imageIndex: v.image_id ? Math.max(0, (p.images ?? []).findIndex((im) => im.id === v.image_id)) : 0,
    };
  });

  const nameEn = loc?.nameEn;
  const descEn = loc?.descriptionEn;
  const useEn = locale === "en";
  const name = useEn && nameEn ? lt(nameEn, "en") : lt(loc?.nameVi ?? viName, "vi");
  const description = useEn && descEn ? lt(descEn, "en") : viDesc || loc?.descriptionVi ? lt(loc?.descriptionVi ?? stripHtml(viDesc), "vi") : null;
  const summarySrc = useEn && loc?.summaryEn ? lt(loc.summaryEn, "en") : loc?.summaryVi ? lt(loc.summaryVi, "vi") : p.summary ? lt(stripHtml(p.summary), "vi") : null;
  const translationMissing = useEn && (!nameEn || !descEn);
  if (translationMissing) console.info(`[i18n-fallback] product ${p.id} missing English copy`);

  return {
    id: String(p.id),
    handle: p.alias ?? p.handle ?? String(p.id),
    name,
    summary: summarySrc,
    description,
    categoryIds: (membership.get(p.id) ?? []).map(String),
    images: (p.images ?? []).map((im) => ({ url: im.src, alt: im.alt || name.value, width: im.width ?? 1000, height: im.height ?? 1000 })),
    options: hasRealOptions
      ? optionDefs.map((o, i) => ({ key: optionKey(i), name: o.name, values: o.values ?? [...new Set(variants.map((v) => v.options[optionKey(i)]).filter((x): x is string => !!x))] }))
      : [],
    variants,
    attributes: (loc?.attributes ?? []).map((a) => ({
      key: a.key,
      label: useEn && a.labelEn ? lt(a.labelEn, "en") : lt(a.labelVi, "vi"),
      value: useEn && a.valueEn ? lt(a.valueEn, "en") : lt(a.valueVi, "vi"),
    })),
    tags: (p.tags ?? "").split(",").map((t) => t.trim()).filter((t) => t.includes(":")),
    createdAt: p.created_on ?? p.created_at ?? new Date(0).toISOString(),
    relatedIds: loc?.relatedSapoIds ?? [],
    isNew: Date.now() - Date.parse(p.created_on ?? p.created_at ?? "") < 45 * 864e5,
    translationMissing,
  };
}

async function snapshot(locale: Locale) {
  const [raw, { collections, membership }, locs] = await Promise.all([fetchAllProducts(), fetchCollections(), getContent().productLocalizations()]);
  const products = raw.map((p) => mapProduct(p, locale, membership, locs.products.get(String(p.id))));
  const counts = new Map<string, number>();
  for (const p of products) for (const c of p.categoryIds) counts.set(c, (counts.get(c) ?? 0) + 1);
  const categories = collections.map((c) => mapCategory(c, collections, locale, counts, locs.categories.get(c.alias ?? c.handle ?? "")));
  // Parent counts include children.
  for (const c of categories) if (!c.parentId) c.productCount += categories.filter((x) => x.parentId === c.id).reduce((s, x) => s + x.productCount, 0);
  return { products, categories };
}

function mapOrderStatus(o: RawOrder): OrderStatus {
  if (o.cancelled_on ?? o.cancelled_at) return "cancelled";
  if (o.closed_on) return "completed";
  if (o.fulfillment_status === "fulfilled") return (o.tags ?? "").includes("pickup") ? "ready_for_pickup" : "shipping";
  if ((o.tags ?? "").includes("confirmed")) return "confirmed";
  return "pending";
}

function mapOrder(o: RawOrder): Order {
  const pickup = (o.tags ?? "").split(",").map((t) => t.trim()).includes("pickup");
  const sa = o.shipping_address;
  return {
    ref: o.name.replace(/^#/, ""),
    externalId: String(o.id),
    createdAt: o.created_on ?? o.created_at ?? "",
    status: mapOrderStatus(o),
    financialStatus: o.financial_status === "paid" ? "paid" : "pending",
    fulfillment: pickup ? "pickup" : "delivery",
    payment: pickup ? "cash_at_store" : "cod",
    lines: o.line_items.map((l) => ({
      variantId: String(l.variant_id),
      productId: String(l.product_id),
      sku: l.sku ?? "",
      name: l.title ?? l.name ?? "",
      variantTitle: l.variant_title ?? "",
      quantity: l.quantity,
      unitPrice: num(l.price) ?? 0,
      lineTotal: (num(l.price) ?? 0) * l.quantity,
    })),
    subtotal: num(o.subtotal_price) ?? 0,
    discount: num(o.total_discounts) ?? 0,
    shippingFee: (o.shipping_lines ?? []).reduce((s, l) => s + (num(l.price) ?? 0), 0),
    total: num(o.total_price) ?? 0,
    customerName: [o.customer?.last_name, o.customer?.first_name].filter(Boolean).join(" ") || sa?.name || "",
    customerPhone: o.phone ?? o.customer?.phone ?? sa?.phone ?? "",
    shippingAddress: sa && !pickup
      ? { fullName: sa.name ?? "", phone: sa.phone ?? "", provinceCode: sa.province_code ?? sa.province ?? "", district: sa.district, ward: sa.ward ?? "", street: sa.address1 ?? "" }
      : null,
    simulated: false,
  };
}

function splitName(full: string) {
  const parts = full.trim().split(/\s+/);
  return { last_name: parts.slice(0, -1).join(" ") || parts[0] || "", first_name: parts.length > 1 ? parts.at(-1)! : "" };
}

export const sapoProvider: CommerceProvider = {
  mode: "live",
  async listCategories(locale) {
    return (await snapshot(locale)).categories;
  },
  async getCategory(handle, locale) {
    return (await snapshot(locale)).categories.find((c) => c.handle === handle) ?? null;
  },
  async queryProducts(query) {
    const { products, categories } = await snapshot(query.locale);
    return applyQuery(products, query, categories);
  },
  async getProduct(handle, locale) {
    return (await snapshot(locale)).products.find((p) => p.handle === handle) ?? null;
  },
  async getProductsByIds(ids, locale) {
    const { products } = await snapshot(locale);
    return ids.map((id) => products.find((p) => p.id === id)).filter((p): p is Product => !!p);
  },
  async getVariantsFresh(variantIds) {
    // Authoritative: uncached per-product reads.
    const out = new Map<string, { product: Product; variant: Variant }>();
    const variants = await Promise.all(
      [...new Set(variantIds)].map((id) => sapoGet<{ variant: RawVariant & { product_id: number } }>(`/variants/${encodeURIComponent(id)}.json`).catch((e) => {
        if (e instanceof SapoNotFound) return null;
        throw e;
      })),
    );
    const productIds = [...new Set(variants.filter(Boolean).map((v) => v!.variant.product_id))];
    const products = await Promise.all(productIds.map((pid) => sapoGet<{ product: RawProduct }>(`/products/${pid}.json`)));
    for (const { product: rp } of products) {
      const product = mapProduct(rp, "vi", new Map(), undefined);
      for (const v of product.variants) if (variantIds.includes(v.id)) out.set(v.id, { product, variant: v });
    }
    return out;
  },
  async findCoupon(code): Promise<Coupon | null> {
    // Discount code lookup → price rule. Only simple percentage / fixed rules with an optional
    // minimum subtotal are honoured; anything more complex is rejected rather than guessed.
    try {
      const discount_code = await lookupDiscountCode(code.trim());
      if (!discount_code) return null;
      const { price_rule: r } = await sapoGet<{
        price_rule: {
          value_type: "percentage" | "fixed_amount";
          value: string;
          target_type: string;
          starts_on?: string; starts_at?: string; ends_on?: string | null; ends_at?: string | null;
          prerequisite_subtotal_range?: { greater_than_or_equal_to?: string } | null;
          entitled_product_ids?: number[];
          entitled_variant_ids?: number[];
          entitled_collection_ids?: number[];
        };
      }>(`/price_rules/${discount_code.price_rule_id}.json`);
      const now = Date.now();
      const start = Date.parse(r.starts_on ?? r.starts_at ?? "");
      const end = Date.parse(r.ends_on ?? r.ends_at ?? "");
      if ((start && start > now) || (end && end < now)) return null;
      const scoped = (r.entitled_product_ids?.length ?? 0) + (r.entitled_variant_ids?.length ?? 0) + (r.entitled_collection_ids?.length ?? 0) > 0;
      if (scoped) return null; // product-scoped rules not supported by the storefront yet
      const min = num(r.prerequisite_subtotal_range?.greater_than_or_equal_to) ?? 0;
      if (r.target_type === "shipping_line") return { code: discount_code.code, kind: "free_shipping", value: 0, minSubtotal: min };
      return {
        code: discount_code.code,
        kind: r.value_type === "percentage" ? "percentage" : "fixed",
        value: Math.abs(Number(r.value)),
        minSubtotal: min,
      };
    } catch (e) {
      if (e instanceof SapoNotFound) return null;
      throw e;
    }
  },
  async listReviews() {
    return null; // No verified review source in live mode.
  },
  async createOrder(input: CreateOrderInput) {
    const pickup = input.fulfillment === "pickup";
    const name = splitName(input.customer.fullName);
    const body = {
      order: {
        line_items: input.lines.map((l) => ({ variant_id: Number(l.variantId), quantity: l.quantity, price: l.unitPrice })),
        customer: { ...name, phone: input.customer.phone, ...(input.customer.email ? { email: input.customer.email } : {}) },
        phone: input.customer.phone,
        ...(input.customer.email ? { email: input.customer.email } : {}),
        ...(input.shippingAddress
          ? {
              shipping_address: {
                ...splitName(input.shippingAddress.fullName),
                name: input.shippingAddress.fullName,
                phone: input.shippingAddress.phone,
                address1: input.shippingAddress.street,
                ward: input.shippingAddress.ward,
                district: input.shippingAddress.district,
                province_code: input.shippingAddress.provinceCode,
                country_code: "VN",
              },
            }
          : {}),
        shipping_lines: pickup ? [] : [{ title: "Giao hàng OVIAN", code: "ovian-zone", price: input.shippingFee }],
        ...(input.couponCode && input.discount > 0
          ? { discount_codes: [{ code: input.couponCode, amount: input.discount, type: "fixed_amount" }] }
          : {}),
        financial_status: "pending",
        gateway: pickup ? "Tiền mặt tại cửa hàng" : "COD",
        source_name: "ovian-web",
        tags: ["ovian-web", pickup ? "pickup" : "delivery", `ck-${input.checkoutId}`].join(", "),
        note: [pickup ? "NHẬN TẠI CỬA HÀNG — thanh toán tiền mặt tại quầy" : "GIAO HÀNG — thu tiền mặt khi giao (COD)", input.note].filter(Boolean).join("\n"),
        note_attributes: [
          { name: "checkout_id", value: input.checkoutId },
          { name: "fulfillment", value: input.fulfillment },
          { name: "payment", value: input.payment },
          { name: "storefront_total", value: String(input.total) },
          ...(input.pickupStoreId ? [{ name: "pickup_store", value: input.pickupStoreId }] : []),
        ],
      },
    };
    const { order } = await sapoPostOrder<{ order: RawOrder }>(`/orders.json`, body);
    const mapped = mapOrder(order);
    if (mapped.total !== input.total) {
      // Do not hide it: the order exists, flag for staff to review.
      console.error(`[sapo] total mismatch for order ${mapped.ref}: storefront ${input.total} vs sapo ${mapped.total}`);
    }
    return mapped;
  },
  async findOrderByCheckoutId(checkoutId) {
    const since = new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString();
    const { orders } = await sapoGet<{ orders: RawOrder[] }>(`/orders.json?status=any&limit=250&created_on_min=${encodeURIComponent(since)}`);
    const hit = orders.find((o) => o.note_attributes?.some((a) => a.name === "checkout_id" && a.value === checkoutId) || (o.tags ?? "").includes(`ck-${checkoutId}`));
    return hit ? mapOrder(hit) : null;
  },
  async getOrder(ref) {
    const clean = ref.trim().replace(/^#/, "");
    const { orders } = await sapoGet<{ orders: RawOrder[] }>(`/orders.json?status=any&name=${encodeURIComponent(`#${clean}`)}`);
    const hit = orders.find((o) => o.name.replace(/^#/, "") === clean);
    return hit ? mapOrder(hit) : null;
  },
};
