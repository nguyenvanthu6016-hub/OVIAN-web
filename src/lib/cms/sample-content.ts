/**
 * SAMPLE CONTENT — used by the automated tests (CONTENT_MODE=sample), never in production.
 * Business facts that OVIAN has not supplied (store address, hours, return windows, fees)
 * are deliberately NOT invented: they read as placeholders to be filled in Sanity.
 */
import type { Locale } from "@/lib/i18n/config";
import type { LocalizedText } from "@/lib/commerce/types";
import type { ShippingRuleSet } from "@/lib/checkout/shipping";
import type { ContentBlock, ContentPage, Faq, HomeContent, JournalPost, SiteSettings } from "./types";

const L = (vi: string, en: string | undefined, locale: Locale): LocalizedText =>
  locale === "en" && en ? { value: en, lang: "en" } : { value: vi, lang: "vi" };

type Bi = { vi: ContentBlock[]; en?: ContentBlock[] };
const B = (b: Bi, locale: Locale) => (locale === "en" && b.en ? { blocks: b.en, lang: "en" as const } : { blocks: b.vi, lang: "vi" as const });

export function mockSiteSettings(locale: Locale): SiteSettings {
  return {
    store: {
      id: "store-main",
      name: L("Cửa hàng OVIAN (dữ liệu mẫu)", "OVIAN store (sample data)", locale),
      address: locale === "vi" ? "Địa chỉ cửa hàng sẽ được cập nhật trong Sanity" : "Store address to be set in Sanity",
      phone: locale === "vi" ? "Số điện thoại cập nhật trong Sanity" : "Phone number to be set in Sanity",
      hours: [L("Giờ mở cửa cập nhật trong Sanity", "Opening hours to be set in Sanity", locale)],
      sample: true,
    },
    showJournal: true,
    // Obviously not a real line: sample mode must still exercise the support button.
    contactPhone: "0900000000",
    zaloPhone: "0900000000",
    social: [],
  };
}

export function mockHome(locale: Locale): HomeContent {
  return {
    intro: L(
      "Đồ dùng tiện nghi cho từng không gian trong nhà, chọn theo kích thước thật và cách bạn sống mỗi ngày.",
      "Everyday essentials for each space in the home, chosen for real dimensions and the way you live day to day.",
      locale,
    ),
    collections: [
      {
        id: "col-small-kitchen",
        title: L("Gọn cho góc bếp nhỏ", "For a small kitchen corner", locale),
        body: L("Những món xếp chồng được, treo được, hoặc dùng được hai việc.", "Things that stack, hang, or do two jobs.", locale),
        productIds: ["p-1005", "p-1006", "p-1007", "p-1015"],
      },
    ],
    story: {
      title: L("Ít đồ hơn, mỗi món dùng được lâu hơn", "Fewer things, each one used for longer", locale),
      body: L(
        "OVIAN chọn đồ theo nơi bạn sống: kích thước vừa góc bếp nhỏ, chất liệu chịu được ẩm phòng tắm, màu sắc không làm rối phòng khách.",
        "OVIAN chooses by where you live: sizes that fit a small kitchen corner, materials that handle bathroom humidity, colours that keep a living room calm.",
        locale,
      ),
    },
  };
}

const placeholder = (vi: string, en: string): Bi => ({
  vi: [{ type: "p", text: `[Nội dung mẫu] ${vi}` }],
  en: [{ type: "p", text: `[Sample content] ${en}` }],
});

const pages: Record<string, { title: [string, string]; summary?: [string, string]; body: Bi }> = {
  about: {
    title: ["Câu chuyện OVIAN", "The OVIAN story"],
    summary: ["Trọn vẹn không gian sống.", "Trọn vẹn không gian sống — a complete living space."],
    body: {
      vi: [
        { type: "p", text: "OVIAN bán đồ dùng tiện nghi cho không gian sống. Thay vì xếp sản phẩm theo loại hàng, OVIAN sắp xếp theo nơi bạn dùng chúng: phòng khách, phòng ngủ, bếp, phòng tắm, góc làm việc và ban công." },
        { type: "h2", text: "Cách OVIAN chọn đồ" },
        { type: "ul", items: ["Ghi rõ kích thước, chất liệu, khối lượng.", "Ưu tiên đồ dùng được lâu, dễ thay thế từng phần.", "Màu sắc trung tính để các món đặt cạnh nhau không rối mắt."] },
        { type: "p", text: "[Nội dung mẫu] Câu chuyện thương hiệu đầy đủ sẽ được OVIAN cập nhật trong Sanity." },
      ],
      en: [
        { type: "p", text: "OVIAN sells everyday essentials for living spaces. Instead of grouping products by type, OVIAN arranges them by where you use them: living room, bedroom, kitchen, bathroom, workspace and balcony." },
        { type: "h2", text: "How OVIAN chooses" },
        { type: "ul", items: ["Real dimensions, materials and weight on every product.", "Things that last and can be replaced part by part.", "Neutral colours so items sit together calmly."] },
        { type: "p", text: "[Sample content] The full brand story will be added by OVIAN in Sanity." },
      ],
    },
  },
  "giao-hang": {
    title: ["Chính sách giao hàng", "Delivery policy"],
    body: {
      vi: [
        { type: "h2", text: "Hình thức nhận hàng" },
        { type: "p", text: "Giao tận nhà, thanh toán tiền mặt khi nhận hàng (COD). OVIAN không nhận thanh toán trực tuyến." },
        { type: "p", text: "OVIAN không nhận thanh toán trực tuyến." },
        { type: "h2", text: "Phí giao hàng" },
        { type: "p", text: "Phí giao hàng tính theo tỉnh/thành và hiển thị ở bước thanh toán trước khi bạn đặt hàng." },
        { type: "p", text: "[Nội dung mẫu] Thời gian giao dự kiến cho từng khu vực sẽ được OVIAN cập nhật." },
      ],
      en: [
        { type: "h2", text: "Ways to receive" },
        { type: "p", text: "Home delivery, pay cash on delivery (COD). OVIAN does not accept online payment." },
        { type: "p", text: "OVIAN does not accept online payment." },
        { type: "h2", text: "Delivery fees" },
        { type: "p", text: "Delivery fees depend on the province and are shown at checkout before you place the order." },
        { type: "p", text: "[Sample content] Estimated delivery times per region will be added by OVIAN." },
      ],
    },
  },
  "doi-tra": { title: ["Chính sách đổi trả", "Returns and exchanges"], body: placeholder("Điều kiện và thời hạn đổi trả sẽ được OVIAN cập nhật trong Sanity.", "Return conditions and time limits will be added by OVIAN in Sanity.") },
  "bao-mat": {
    title: ["Chính sách bảo mật", "Privacy policy"],
    body: {
      vi: [
        { type: "p", text: "Khi đặt hàng, OVIAN dùng họ tên, số điện thoại, email (nếu có) và địa chỉ giao hàng để xử lý và giao đơn. Thông tin đơn được lưu trong Google Sheets (Google Drive) của OVIAN. Giỏ hàng, sản phẩm đã lưu và sản phẩm vừa xem chỉ lưu trên trình duyệt của bạn." },
        { type: "p", text: "[Nội dung mẫu] Chính sách bảo mật đầy đủ sẽ được OVIAN cập nhật trong Sanity." },
      ],
      en: [
        { type: "p", text: "When you order, OVIAN uses your name, phone number, email (if given) and delivery address to process and deliver the order. Order details are stored in OVIAN's Google Sheets (Google Drive). Your cart, saved products and recently viewed products are stored only in your browser." },
        { type: "p", text: "[Sample content] The full privacy policy will be added by OVIAN in Sanity." },
      ],
    },
  },
  "dieu-khoan": { title: ["Điều khoản sử dụng", "Terms and conditions"], body: placeholder("Điều khoản sử dụng sẽ được OVIAN cập nhật trong Sanity.", "Terms and conditions will be added by OVIAN in Sanity.") },
};

export function mockPage(slug: string, locale: Locale): ContentPage | null {
  const p = pages[slug];
  if (!p) return null;
  return {
    slug,
    title: L(p.title[0], p.title[1], locale),
    summary: p.summary ? L(p.summary[0], p.summary[1], locale) : null,
    body: B(p.body, locale),
  };
}

export const mockPageSlugs = Object.keys(pages);

const posts: { slug: string; date: string; title: [string, string?]; excerpt: [string, string?]; category: [string, string]; body: Bi }[] = [
  {
    slug: "sap-xep-bep-10-m2",
    date: "2026-10-18",
    title: ["Sắp xếp một căn bếp 10 m²", "Arranging a 10 m² kitchen"],
    excerpt: ["Ba nguyên tắc: dùng chiều cao, gom theo việc, để trống mặt bếp.", "Three rules: use height, group by task, keep the counter clear."],
    category: ["Bếp", "Kitchen"],
    body: {
      vi: [
        { type: "p", text: "Bếp nhỏ cần ít đồ hơn, nhưng mỗi món phải đặt đúng chỗ." },
        { type: "h2", text: "Dùng chiều cao" },
        { type: "p", text: "Kệ treo và hộp xếp chồng giải phóng mặt bếp cho việc nấu." },
        { type: "h2", text: "Gom theo việc" },
        { type: "p", text: "Đặt cốc, cà phê và ấm cạnh nhau. Đặt bát, đũa gần chỗ dọn cơm." },
      ],
      en: [
        { type: "p", text: "A small kitchen needs fewer things, each in the right place." },
        { type: "h2", text: "Use height" },
        { type: "p", text: "Hanging shelves and stacking boxes free the counter for cooking." },
        { type: "h2", text: "Group by task" },
        { type: "p", text: "Keep cups, coffee and kettle together. Keep bowls and chopsticks near where you serve." },
      ],
    },
  },
  {
    slug: "chon-khan-cho-phong-tam-am",
    date: "2026-09-30",
    title: ["Chọn khăn cho phòng tắm ẩm", "Choosing towels for a humid bathroom"],
    excerpt: ["Dệt tổ ong khô nhanh hơn khăn bông dày.", "Waffle weave dries faster than thick terry."],
    category: ["Phòng tắm", "Bathroom"],
    body: {
      vi: [{ type: "p", text: "Ở khí hậu nồm ẩm, khăn mỏng dệt tổ ong khô trong ngày, ít mùi hơn." }],
      en: [{ type: "p", text: "In humid weather, thin waffle towels dry within a day and stay fresher." }],
    },
  },
  {
    slug: "goc-lam-viec-ban-cong",
    date: "2026-08-12",
    // English intentionally missing — exercises the Vietnamese fallback.
    title: ["Một góc làm việc ngoài ban công"],
    excerpt: ["Ghế gấp, khay gỗ và một chậu cây là đủ."],
    category: ["Ban công", "Balcony"],
    body: { vi: [{ type: "p", text: "Ban công 5 m² vẫn đủ cho một góc làm việc buổi sáng nếu mọi thứ gấp gọn được." }] },
  },
];

export function mockJournal(locale: Locale): JournalPost[] {
  return posts.map((p) => ({
    slug: p.slug,
    date: p.date,
    title: L(p.title[0], p.title[1], locale),
    excerpt: L(p.excerpt[0], p.excerpt[1], locale),
    category: L(p.category[0], p.category[1], locale),
    body: B(p.body, locale),
  }));
}

export function mockFaqs(locale: Locale): Faq[] {
  const f: [string, string, string, string][] = [
    ["OVIAN nhận thanh toán thế nào?", "Tiền mặt khi nhận hàng (COD). OVIAN không nhận thanh toán trực tuyến.", "How can I pay?", "Cash on delivery (COD). OVIAN does not accept online payment."],
    ["Phí giao hàng bao nhiêu?", "Phí tính theo tỉnh/thành và hiện ở bước thanh toán trước khi đặt.", "How much is delivery?", "The fee depends on your province and is shown at checkout before you order."],
    ["Làm sao tra cứu đơn hàng?", "Vào trang Tra cứu đơn hàng, nhập mã đơn và số điện thoại bạn dùng khi đặt.", "How do I track my order?", "Open Track an order and enter the order number with the phone number used when ordering."],
    ["Có cần tạo tài khoản không?", "Không. Bạn đặt hàng chỉ với họ tên và số điện thoại.", "Do I need an account?", "No. You can order with just your name and phone number."],
  ];
  return f.map(([qv, av, qe, ae]) => ({ question: L(qv, qe, locale), answer: L(av, ae, locale) }));
}

/** SAMPLE shipping fees for mock mode only — not OVIAN's real prices. */
export const mockShippingRules: ShippingRuleSet = {
  sample: true,
  rules: [
    { id: "zone-hn", label: "Hà Nội (mẫu)", provinceCodes: ["ha-noi"], fee: 25000, freeOver: 800000 },
    { id: "zone-north", label: "Miền Bắc (mẫu)", provinceCodes: ["hai-phong", "bac-ninh", "hung-yen", "ninh-binh", "quang-ninh", "phu-tho", "thai-nguyen", "tuyen-quang", "lang-son", "cao-bang", "lao-cai", "lai-chau", "dien-bien", "son-la"], fee: 35000, freeOver: 1200000 },
    { id: "zone-central", label: "Miền Trung (mẫu)", provinceCodes: ["thanh-hoa", "nghe-an", "ha-tinh", "quang-tri", "hue", "da-nang", "quang-ngai", "gia-lai", "khanh-hoa", "dak-lak", "lam-dong"], fee: 45000, freeOver: 1500000 },
    { id: "zone-south", label: "Miền Nam (mẫu)", provinceCodes: ["ho-chi-minh", "dong-nai", "tay-ninh", "vinh-long", "dong-thap", "an-giang", "can-tho"], fee: 45000, freeOver: 1500000 },
  ],
  // Cà Mau intentionally unmatched with no fallback → exercises the "delivery unavailable" path.
  fallback: null,
};
