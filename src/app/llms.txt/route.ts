import { getCommerce, CommerceUnavailableError } from "@/lib/commerce";
import { getContent } from "@/lib/cms";
import { minPrice } from "@/lib/commerce/query";
import { siteUrl } from "@/lib/seo";
import { getDictionary } from "@/lib/i18n/dictionaries";

export const revalidate = 3600;

/**
 * /llms.txt — the shop in one plain-text page, for an agent that would otherwise download a
 * megabyte of HTML to learn what OVIAN sells and how to reach it.
 *
 * Generated from the live catalogue and the same content the site renders, so it cannot drift
 * into describing a shop that no longer exists. Prices are the real current ones; if Sapo is
 * unreachable the file still serves, minus the catalogue, rather than 500ing.
 */
export async function GET() {
  const base = siteUrl();
  const d = getDictionary("vi");
  const settings = await getContent().siteSettings("vi").catch(() => null);

  const lines: string[] = [
    "# OVIAN",
    "",
    `> ${d.meta.slogan}. Đồ dùng cho không gian sống: phòng ngủ, phòng bếp, phòng khách, phòng tắm, góc làm việc. Bán lẻ tại Việt Nam, giao toàn quốc, thanh toán khi nhận hàng (COD).`,
    "",
    "Trang web bằng tiếng Việt; bản tiếng Anh ở /en là bản dịch một phần.",
    "",
  ];

  if (settings) {
    lines.push("## Liên hệ");
    if (settings.legal?.name.value) lines.push(`- Pháp nhân: ${settings.legal.name.value}`);
    if (settings.legal?.address) lines.push(`- Địa chỉ: ${settings.legal.address} (nơi làm việc, không phải cửa hàng đón khách)`);
    if (settings.contactPhone) lines.push(`- Điện thoại / Zalo: ${settings.contactPhone}`);
    if (settings.contactEmail) lines.push(`- Email: ${settings.contactEmail}`);
    for (const s of settings.social) lines.push(`- ${s.label}: ${s.url}`);
    lines.push("");
  }

  lines.push(
    "## Trang chính",
    `- [Trang chủ](${base}/vi): sơ đồ các không gian trong nhà, mỗi ô mở ra một danh mục.`,
    `- [Tất cả sản phẩm](${base}/vi/products): lọc theo danh mục, giá, tình trạng còn hàng.`,
    `- [Hàng mới](${base}/vi/products?sort=newest)`,
    `- [Đang giảm giá](${base}/vi/products?sale=1)`,
    `- [Tra cứu đơn hàng](${base}/vi/track): nhập mã đơn và số điện thoại.`,
    `- [Giới thiệu](${base}/vi/about)`,
    `- [Liên hệ](${base}/vi/contact)`,
    `- [Câu hỏi thường gặp](${base}/vi/faq)`,
    "",
    "## Chính sách",
    `- [Giao hàng](${base}/vi/policies/giao-hang)`,
    `- [Đổi trả](${base}/vi/policies/doi-tra)`,
    `- [Bảo mật](${base}/vi/policies/bao-mat)`,
    `- [Điều khoản sử dụng](${base}/vi/policies/dieu-khoan)`,
    "",
  );

  try {
    const commerce = getCommerce();
    const [cats, products] = await Promise.all([
      commerce.listCategories("vi"),
      commerce.queryProducts({ locale: "vi", pageSize: 500 }),
    ]);
    const rooms = cats.filter((c) => !c.parentId);
    if (rooms.length) {
      lines.push("## Danh mục", ...rooms.map((c) => `- [${c.name.value}](${base}/vi/spaces/${c.handle})`), "");
    }
    if (products.items.length) {
      const money = new Intl.NumberFormat("vi-VN");
      lines.push(
        `## Sản phẩm (${products.items.length})`,
        "",
        "Giá tính bằng đồng (VND), đã là giá bán hiện tại.",
        "",
        ...products.items.map((p) => `- [${p.name.value}](${base}/vi/products/${p.handle}) — ${money.format(minPrice(p))} đ`),
        "",
      );
    }
  } catch (e) {
    if (!(e instanceof CommerceUnavailableError)) throw e;
    lines.push("## Sản phẩm", "", "Danh mục tạm thời không đọc được. Xem " + `${base}/vi/products`, "");
  }

  lines.push(
    "## Ghi chú",
    "- Đặt hàng trên web thanh toán khi nhận hàng; không nhập thẻ trên trang này.",
    "- Đánh giá sản phẩm hiển thị trên web được chép nguyên văn từ gian hàng Shopee của OVIAN.",
    `- Sơ đồ trang: ${base}/sitemap.xml`,
    "",
  );

  return new Response(lines.join("\n"), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
