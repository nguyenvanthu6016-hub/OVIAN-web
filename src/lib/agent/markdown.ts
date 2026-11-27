import "server-only";
import { getCommerce, CommerceUnavailableError, type Product } from "@/lib/commerce";
import { getContent } from "@/lib/cms";
import { isAvailable, minPrice } from "@/lib/commerce/query";
import { parseDescription } from "@/lib/product/description";
import { importedReviews } from "@/lib/product/reviews";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { siteUrl } from "@/lib/seo";

/**
 * A Markdown rendering of the pages an agent is most likely to want: the shop itself, a room,
 * and a product with its price, stock, specification and reviews.
 *
 * The point is cost. The HTML home page is around 120 KB before images; this is a couple of
 * kilobytes saying the same things. It is generated from the same providers the HTML pages use,
 * so the two cannot describe different shops.
 */

const money = new Intl.NumberFormat("vi-VN");
const price = (p: Product) => `${money.format(minPrice(p))} đ`;

function productLine(p: Product, base: string, locale: Locale): string {
  const stock = isAvailable(p) ? "" : " — hết hàng";
  return `- [${p.name.value}](${base}/${locale}/products/${p.handle}) — ${price(p)}${stock}`;
}

export interface MarkdownPage {
  body: string;
  /** The HTML page this is a rendering of, for a canonical link header. */
  canonical: string;
}

/** null when this path has no Markdown rendering; the caller should leave the HTML alone. */
export async function renderMarkdown(segments: string[]): Promise<MarkdownPage | null> {
  const [maybeLocale, ...rest] = segments;
  if (!maybeLocale || !isLocale(maybeLocale)) return null;
  const locale: Locale = maybeLocale;
  const base = siteUrl();
  const canonical = `${base}/${locale}${rest.length ? `/${rest.join("/")}` : ""}`;
  const commerce = getCommerce();

  try {
    // Home
    if (rest.length === 0) {
      const settings = await getContent().siteSettings(locale).catch(() => null);
      const [cats, newest] = await Promise.all([
        commerce.listCategories(locale),
        commerce.queryProducts({ locale, sort: "newest", pageSize: 12, inStock: true }),
      ]);
      const rooms = cats.filter((c) => !c.parentId);
      const out = [
        "# OVIAN",
        "",
        "Đồ dùng cho không gian sống. Giao toàn quốc, thanh toán khi nhận hàng (COD).",
        "",
      ];
      if (settings?.contactPhone) out.push(`Liên hệ: ${settings.contactPhone} (gọi hoặc Zalo)`, "");
      if (settings?.legal?.address) out.push(`Địa chỉ: ${settings.legal.address}`, "");
      if (rooms.length) {
        out.push("## Không gian", "", ...rooms.map((c) => `- [${c.name.value}](${base}/${locale}/spaces/${c.handle}) — ${c.productCount} sản phẩm`), "");
      }
      if (newest.items.length) {
        out.push("## Hàng mới", "", ...newest.items.map((p) => productLine(p, base, locale)), "");
      }
      out.push(`Toàn bộ danh mục và chính sách: ${base}/llms.txt`, "");
      return { body: out.join("\n"), canonical };
    }

    // A room or category
    if (rest[0] === "spaces" && rest[1]) {
      const cats = await commerce.listCategories(locale);
      const cat = cats.find((c) => c.handle === rest[1]);
      if (!cat) return null;
      const { items } = await commerce.queryProducts({ locale, categoryHandle: cat.handle, pageSize: 200 });
      return {
        body: [
          `# ${cat.name.value}`,
          "",
          ...(cat.description?.value ? [cat.description.value, ""] : []),
          `${items.length} sản phẩm.`,
          "",
          ...items.map((p) => productLine(p, base, locale)),
          "",
        ].join("\n"),
        canonical,
      };
    }

    // The full catalogue
    if (rest[0] === "products" && rest.length === 1) {
      const { items } = await commerce.queryProducts({ locale, pageSize: 500 });
      return {
        body: [`# Tất cả sản phẩm`, "", `${items.length} sản phẩm.`, "", ...items.map((p) => productLine(p, base, locale)), ""].join("\n"),
        canonical,
      };
    }

    // One product
    if (rest[0] === "products" && rest[1]) {
      const p = await commerce.getProduct(rest[1], locale);
      if (!p) return null;
      const out = [`# ${p.name.value}`, ""];
      if (p.summary?.value) out.push(p.summary.value, "");
      out.push(
        `- Giá: ${price(p)}`,
        `- Tình trạng: ${isAvailable(p) ? "còn hàng" : "hết hàng"}`,
        ...(p.variants[0]?.sku ? [`- SKU: ${p.variants[0].sku}`] : []),
        `- Đặt hàng: ${canonical}`,
        "",
      );

      if (p.variants.length > 1) {
        out.push("## Phiên bản", "", ...p.variants.map((v) => `- ${v.title} — ${money.format(v.price)} đ${v.available ? "" : " (hết hàng)"}`), "");
      }
      if (p.attributes.length) {
        out.push("## Thông số", "", ...p.attributes.map((a) => `- ${a.label.value}: ${a.value.value}`), "");
      }

      const desc = parseDescription(p.description?.value);
      if (desc.intro.length) out.push("## Mô tả", "", ...desc.intro.map((l) => l.text), "");
      for (const sec of desc.sections) out.push(`## ${sec.title}`, "", ...sec.lines.map((l) => l.text), "");

      const reviews = importedReviews(p.handle);
      if (reviews.length) {
        const avg = reviews.reduce((s, r) => s + r.rating, 0) / reviews.length;
        out.push(
          `## Đánh giá (${reviews.length}, trung bình ${avg.toFixed(1)}/5)`,
          "",
          "Chép nguyên văn từ gian hàng Shopee của OVIAN.",
          "",
          ...reviews.map((r) => `- ${r.rating}/5 — ${r.body.replace(/\n+/g, " ")} (${r.author})`),
          "",
        );
      }
      return { body: out.join("\n"), canonical };
    }
  } catch (e) {
    if (e instanceof CommerceUnavailableError) return null;
    throw e;
  }
  return null;
}
