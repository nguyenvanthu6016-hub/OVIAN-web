/**
 * OVIAN's real content, supplied by the owner on 2026-11-17 (the filled-in
 * OVIAN_noi_dung_website.docx) and used in production (CONTENT_MODE=ovian, the default).
 *
 * Everything here is the owner's own words, lightly edited for the page. Nothing is invented:
 * what the owner has not supplied yet is marked TODO below and simply left out of the site.
 *
 * TODO (owner): tax code / business registration number for the footer; a contact email;
 * English translations (pages fall back to Vietnamese, marked lang="vi"); journal posts.
 */
import type { Locale } from "@/lib/i18n/config";
import type { LocalizedText } from "@/lib/commerce/types";
import type { ShippingRuleSet } from "@/lib/checkout/shipping";
import type { ContentBlock, ContentPage, Faq, HomeContent, JournalPost, SiteSettings } from "./types";

const L = (vi: string, en: string | undefined, locale: Locale): LocalizedText =>
  locale === "en" && en ? { value: en, lang: "en" } : { value: vi, lang: "vi" };

type Bi = { vi: ContentBlock[]; en?: ContentBlock[] };
const B = (b: Bi, locale: Locale) => (locale === "en" && b.en ? { blocks: b.en, lang: "en" as const } : { blocks: b.vi, lang: "vi" as const });

export const OVIAN_PHONE = "0909651935";
const ADDRESS = "55/28 Tây Lân, Bình Tân, TP. Hồ Chí Minh";

export function ovianSiteSettings(locale: Locale): SiteSettings {
  return {
    // The address is a workplace, not a shop customers visit, so there is no store page.
    store: null,
    showJournal: false,
    contactPhone: OVIAN_PHONE,
    zaloPhone: OVIAN_PHONE,
    legal: { name: L("Hộ kinh doanh OVIAN", "OVIAN household business", locale), address: ADDRESS },
    social: [
      { label: "Facebook", url: "https://www.facebook.com/profile.php?id=61558891335204" },
      { label: "TikTok", url: "https://www.tiktok.com/@oviansd" },
    ],
  };
}

export function ovianHome(locale: Locale): HomeContent {
  return {
    // Dropped at the owner's request on 2026-11-26: the heading already says this, and the
    // homepage reads better going straight to the rooms. Put a line back here to show one again.
    intro: null,
    collections: [],
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

/* ---------------------------------------------------------------- shipping */

const SOUTH = ["ho-chi-minh", "dong-nai", "tay-ninh", "can-tho", "an-giang", "dong-thap", "vinh-long", "ca-mau"];
const REST = [
  "ha-noi", "hai-phong", "bac-ninh", "hung-yen", "ninh-binh", "quang-ninh", "phu-tho", "thai-nguyen",
  "tuyen-quang", "lang-son", "cao-bang", "lao-cai", "lai-chau", "dien-bien", "son-la",
  "thanh-hoa", "nghe-an", "ha-tinh", "quang-tri", "hue", "da-nang", "quang-ngai", "gia-lai",
  "khanh-hoa", "dak-lak", "lam-dong",
];
const FREE_OVER = 300_000;

/**
 * Two zones, agreed with the owner on 2026-11-17: the central provinces are charged the
 * northern rate. Together the lists cover all 34 provinces, so no order is ever left
 * without a fee — there is no fallback on purpose.
 */
export const ovianShippingRules: ShippingRuleSet = {
  // Ongoing promotion agreed with the owner on 2026-11-24: every order pays 5.000 đ, and the
  // zone fee below is shown struck through. Both are stated on the delivery policy page.
  promoFee: 5_000,
  sample: false,
  rules: [
    { id: "zone-south", label: "Phía Nam", provinceCodes: SOUTH, fee: 10_000, freeOver: FREE_OVER },
    { id: "zone-north", label: "Phía Bắc", provinceCodes: REST, fee: 15_000, freeOver: FREE_OVER },
  ],
  fallback: null,
};

/* ------------------------------------------------------------------- pages */

const pages: Record<string, { title: [string, string]; summary?: [string, string]; body: Bi }> = {
  about: {
    title: ["Câu chuyện OVIAN", "The OVIAN story"],
    summary: ["Trọn vẹn không gian sống.", "A complete living space."],
    body: {
      vi: [
        { type: "p", text: "Hạnh phúc đôi khi bắt đầu từ những điều giản dị nhất." },
        { type: "p", text: "Một ngôi nhà không cần phải có thật nhiều thứ để trở nên đủ đầy. Đôi khi, sự thoải mái đến từ một góc bếp gọn gàng, những vật dụng được sắp xếp ngăn nắp, hay đơn giản là khi những công việc thường ngày trở nên nhẹ nhàng hơn một chút." },
        { type: "p", text: "Chính những điều tưởng chừng nhỏ bé ấy lại góp phần tạo nên cảm giác bình yên và hạnh phúc trong mỗi gia đình." },
        { type: "p", text: "Ra đời vào năm 2023, OVIAN mang theo một mong muốn giản dị: giúp cuộc sống hằng ngày trở nên thuận tiện, dễ dàng và trọn vẹn hơn thông qua những sản phẩm gia dụng thiết thực." },
        { type: "p", text: "Chúng tôi tin rằng, một sản phẩm tốt không nhất thiết phải cầu kỳ hay phô trương. Giá trị thực sự nằm ở cách sản phẩm đáp ứng nhu cầu, mang lại sự tiện lợi và đồng hành cùng người sử dụng qua thời gian." },
        { type: "p", text: "Bởi vậy, OVIAN luôn hướng đến sự hài hòa giữa thiết kế tinh tế, công năng hữu ích, chất lượng bền bỉ và mức giá hợp lý. Mỗi sản phẩm được lựa chọn với sự quan tâm đến chất liệu, tính an toàn và trải nghiệm sử dụng, để không chỉ phù hợp với không gian sống mà còn thực sự có ích trong sinh hoạt hằng ngày." },
        { type: "h2", text: "Thấu hiểu bắt đầu từ những điều nhỏ nhất" },
        { type: "p", text: "Chúng tôi hiểu rằng, giữa nhịp sống bận rộn, thời gian dành cho bản thân và những người thân yêu luôn đáng quý. Một món đồ tiện dụng có thể giúp tiết kiệm vài phút mỗi ngày. Một giải pháp sắp xếp hợp lý có thể khiến việc chăm sóc nhà cửa bớt vất vả. Và khi những điều nhỏ bé ấy được cải thiện, cuộc sống cũng dần trở nên thoải mái hơn." },
        { type: "p", text: "Không chỉ quan tâm đến trải nghiệm khi lựa chọn sản phẩm, OVIAN còn mong muốn khách hàng cảm thấy an tâm trong quá trình sử dụng. Chính sách đổi trả trong 60 ngày sử dụng được áp dụng cho mọi sản phẩm của OVIAN, như một phần trong cam kết đồng hành và đặt sự hài lòng của khách hàng lên hàng đầu." },
        { type: "p", text: "Chúng tôi không mong mỗi ngôi nhà đều giống nhau, bởi mỗi gia đình có một nếp sống, một thói quen và một cách cảm nhận hạnh phúc riêng. Điều OVIAN hướng đến là mang lại những lựa chọn phù hợp, để mỗi người có thể chăm chút cho tổ ấm theo cách của mình." },
        { type: "h2", text: "Trọn vẹn không gian sống" },
        { type: "p", text: "Với chúng tôi, sự trọn vẹn không đến từ những điều lớn lao. Đó là khi một vật dụng nhỏ thực hiện tốt vai trò của nó, khi không gian sống trở nên dễ chịu hơn, khi những công việc thường ngày bớt đi một chút nhọc nhằn và khi mỗi người có thêm thời gian tận hưởng những khoảnh khắc ý nghĩa." },
        { type: "p", text: "Bởi một cuộc sống trọn vẹn được tạo nên từ những điều nhỏ bé, giản dị và đáng trân trọng mỗi ngày." },
      ],
    },
  },

  "giao-hang": {
    title: ["Chính sách giao hàng", "Delivery policy"],
    body: {
      vi: [
        { type: "h2", text: "Phí giao hàng" },
        { type: "p", text: "OVIAN giao hàng toàn quốc. Phí giao hiện ở bước thanh toán, trước khi bạn đặt hàng." },
        { type: "h3", text: "Đang áp dụng: đồng giá 5.000 ₫ toàn quốc" },
        { type: "p", text: "Mọi đơn hàng chỉ chịu phí giao 5.000 ₫, bất kể ở tỉnh nào. Đơn từ 300.000 ₫ được miễn phí giao hàng hoàn toàn." },
        { type: "h3", text: "Biểu phí tiêu chuẩn" },
        { type: "p", text: "Đây là mức phí theo khu vực, áp dụng khi chương trình đồng giá ở trên kết thúc:" },
        { type: "ul", items: [
          "TP. Hồ Chí Minh, Đồng Nai, Tây Ninh, Cần Thơ, An Giang, Đồng Tháp, Vĩnh Long, Cà Mau: 10.000 ₫",
          "Các tỉnh, thành phố còn lại: 15.000 ₫",
          "Miễn phí giao hàng cho đơn từ 300.000 ₫",
        ] },
        { type: "h2", text: "Thời gian giao hàng" },
        { type: "ul", items: [
          "TP. Hồ Chí Minh: 1,5 – 2 ngày",
          "Hà Nội: 2 – 3 ngày",
          "Các khu vực khác: OVIAN báo thời gian dự kiến khi gọi xác nhận đơn",
        ] },
        { type: "p", text: "Đơn đặt trước 14h được gửi đi trong ngày. Đơn đặt sau 14h được gửi đi trước 12h ngày hôm sau." },
        { type: "p", text: "OVIAN giao hàng qua Shopee Express, Viettel Post và GHN." },
        { type: "h2", text: "Thanh toán" },
        { type: "p", text: "Thanh toán tiền mặt khi nhận hàng (COD). OVIAN không nhận thanh toán trực tuyến." },
        { type: "p", text: "Bạn được kiểm tra hàng trước khi thanh toán." },
        { type: "h2", text: "Khi có sự cố" },
        { type: "ul", items: [
          "Nếu bạn không nhận hàng, OVIAN đóng gói lại và gửi lại cho đơn vị vận chuyển.",
          "Thiếu hàng trong kiện: báo cho OVIAN trong vòng 7 ngày kể từ khi nhận.",
          "Hàng hư hỏng: xử lý theo chính sách đổi trả 60 ngày.",
        ] },
      ],
    },
  },

  "doi-tra": {
    title: ["Chính sách đổi trả", "Returns and exchanges"],
    body: {
      vi: [
        { type: "h2", text: "Đổi trả trong 60 ngày" },
        { type: "p", text: "Mọi sản phẩm của OVIAN được đổi trả trong vòng 60 ngày kể từ khi bạn nhận hàng, không cần nêu lý do." },
        { type: "h2", text: "Phí vận chuyển đổi trả" },
        { type: "ul", items: [
          "Trong 30 ngày đầu: OVIAN chịu toàn bộ phí vận chuyển.",
          "Từ ngày thứ 31 đến ngày thứ 60: bạn chịu phí vận chuyển.",
        ] },
        { type: "h2", text: "Hoàn tiền" },
        { type: "p", text: "OVIAN hoàn tiền bằng chuyển khoản sau khi nhận lại hàng." },
        { type: "h2", text: "Cách gửi yêu cầu đổi trả" },
        { type: "p", text: `Nhắn tin cho OVIAN qua fanpage Facebook hoặc Zalo ${OVIAN_PHONE}, kèm mã đơn hàng.` },
        { type: "h2", text: "Bảo hành" },
        { type: "p", text: "Tất cả sản phẩm của OVIAN được bảo hành 60 ngày." },
      ],
    },
  },

  "bao-mat": {
    title: ["Chính sách bảo mật", "Privacy policy"],
    body: {
      vi: [
        { type: "h2", text: "Thông tin OVIAN thu thập" },
        { type: "p", text: "Khi bạn đặt hàng, OVIAN dùng họ tên, số điện thoại, email (nếu có) và địa chỉ giao hàng để xử lý và giao đơn." },
        { type: "h2", text: "Nơi lưu trữ" },
        { type: "p", text: "Thông tin đơn hàng được lưu trong Google Sheets thuộc tài khoản Google của OVIAN. Giỏ hàng, sản phẩm đã lưu và sản phẩm vừa xem chỉ lưu trên trình duyệt của bạn, OVIAN không đọc được." },
        { type: "h2", text: "Chia sẻ thông tin" },
        { type: "p", text: "OVIAN chuyển họ tên, số điện thoại và địa chỉ của bạn cho đơn vị vận chuyển (Shopee Express, Viettel Post, GHN) để giao đơn." },
        { type: "p", text: "Website có dùng Meta Pixel của Facebook để đo hiệu quả quảng cáo. Công cụ này ghi nhận bạn đã xem trang nào, thêm sản phẩm nào vào giỏ và đặt hàng với tổng tiền bao nhiêu, rồi gửi cho Meta. Meta cũng lưu một cookie trên trình duyệt của bạn để nhận ra lượt truy cập." },
        { type: "p", text: "OVIAN KHÔNG gửi họ tên, số điện thoại, email hay địa chỉ của bạn cho Meta, và đã tắt tính năng tự động đọc thông tin trong biểu mẫu của Meta." },
        { type: "p", text: "Bạn có thể chặn việc này bằng cách bật chế độ chặn theo dõi của trình duyệt, hoặc chỉnh trong phần cài đặt quảng cáo của tài khoản Facebook." },
        { type: "p", text: "Ngoài hai trường hợp trên, OVIAN không bán hay chia sẻ thông tin của bạn cho bên thứ ba nào khác." },
        { type: "h2", text: "Quyền của bạn" },
        { type: "p", text: `Bạn có thể yêu cầu xem, sửa hoặc xoá thông tin của mình bằng cách liên hệ OVIAN qua số ${OVIAN_PHONE} hoặc fanpage Facebook.` },
        { type: "h2", text: "Đơn vị chịu trách nhiệm" },
        { type: "p", text: `Hộ kinh doanh OVIAN — ${ADDRESS}.` },
      ],
    },
  },

  "dieu-khoan": {
    title: ["Điều khoản sử dụng", "Terms and conditions"],
    body: {
      vi: [
        { type: "h2", text: "Về website này" },
        { type: "p", text: `Website này do Hộ kinh doanh OVIAN (${ADDRESS}) vận hành. Khi đặt hàng trên website, bạn đồng ý với các điều khoản dưới đây.` },
        { type: "h2", text: "Đặt hàng và xác nhận" },
        { type: "p", text: "Bạn đặt hàng với họ tên và số điện thoại, không cần tạo tài khoản. Sau khi bạn đặt, OVIAN gọi điện xác nhận trước khi gửi hàng. Đơn chỉ được giao sau khi đã xác nhận." },
        { type: "p", text: "Giá và tồn kho trên website được lấy từ hệ thống bán hàng của OVIAN và được kiểm tra lại ngay trước khi bạn đặt. Nếu có sai sót, OVIAN sẽ báo bạn trước khi giao và bạn có quyền huỷ đơn." },
        { type: "h2", text: "Giá và thanh toán" },
        { type: "p", text: "Giá hiển thị bằng đồng Việt Nam. OVIAN chỉ nhận tiền mặt khi giao hàng (COD), không nhận thanh toán trực tuyến." },
        { type: "h2", text: "Giao hàng, đổi trả và bảo mật" },
        { type: "p", text: "Việc giao hàng theo Chính sách giao hàng. Việc đổi trả và bảo hành theo Chính sách đổi trả. Thông tin cá nhân được xử lý theo Chính sách bảo mật." },
        { type: "h2", text: "Huỷ đơn" },
        { type: "p", text: "Bạn có thể huỷ đơn trước khi OVIAN gửi hàng, bằng cách gọi hoặc nhắn tin cho OVIAN kèm mã đơn hàng." },
        { type: "h2", text: "Nội dung website" },
        { type: "p", text: "Hình ảnh, văn bản và thiết kế trên website thuộc về OVIAN. Vui lòng không sao chép để dùng cho mục đích thương mại khi chưa có sự đồng ý của OVIAN." },
        { type: "h2", text: "Thay đổi điều khoản" },
        { type: "p", text: "OVIAN có thể cập nhật các điều khoản này. Bản đang hiển thị trên trang là bản có hiệu lực." },
        { type: "h2", text: "Liên hệ" },
        { type: "p", text: `Gọi hoặc nhắn Zalo ${OVIAN_PHONE}, hoặc nhắn tin qua fanpage Facebook của OVIAN.` },
      ],
    },
  },
};

export function ovianPage(slug: string, locale: Locale): ContentPage | null {
  const p = pages[slug];
  if (!p) return null;
  return {
    slug,
    title: L(p.title[0], p.title[1], locale),
    summary: p.summary ? L(p.summary[0], p.summary[1], locale) : null,
    body: B(p.body, locale),
  };
}

/** No journal posts yet: the owner will write them, and the section stays hidden until then. */
export function ovianJournal(_locale: Locale): JournalPost[] {
  void _locale;
  return [];
}

export function ovianFaqs(locale: Locale): Faq[] {
  const f: [string, string, string, string][] = [
    [
      "Phí giao hàng bao nhiêu?",
      "10.000 ₫ ở TP. Hồ Chí Minh và các tỉnh lân cận, 15.000 ₫ ở các tỉnh còn lại. Miễn phí giao hàng cho đơn từ 300.000 ₫.",
      "How much is delivery?",
      "10,000 ₫ in Ho Chi Minh City and nearby provinces, 15,000 ₫ elsewhere. Free over 300,000 ₫.",
    ],
    [
      "Bao lâu thì tôi nhận được hàng?",
      "TP. Hồ Chí Minh 1,5 – 2 ngày, Hà Nội 2 – 3 ngày. Đơn đặt trước 14h được gửi đi trong ngày.",
      "How long does delivery take?",
      "Ho Chi Minh City 1.5 – 2 days, Hanoi 2 – 3 days. Orders placed before 2pm ship the same day.",
    ],
    [
      "Tôi có được kiểm tra hàng trước khi trả tiền không?",
      "Có. Bạn kiểm tra hàng rồi mới trả tiền mặt cho người giao.",
      "Can I check the parcel before paying?",
      "Yes. You check the parcel first, then pay the courier in cash.",
    ],
    [
      "Đổi trả thế nào?",
      "Đổi trả trong 60 ngày kể từ khi nhận hàng, không cần nêu lý do. Trong 30 ngày đầu OVIAN chịu phí vận chuyển.",
      "How do returns work?",
      "Within 60 days of delivery, no reason needed. OVIAN pays the shipping in the first 30 days.",
    ],
    [
      "Làm sao tra cứu đơn hàng?",
      "Vào trang Tra cứu đơn hàng, nhập mã đơn và số điện thoại bạn dùng khi đặt.",
      "How do I track my order?",
      "Open Track an order and enter the order number with the phone number used when ordering.",
    ],
    [
      "Có cần tạo tài khoản không?",
      "Không. Bạn đặt hàng chỉ với họ tên và số điện thoại.",
      "Do I need an account?",
      "No. You can order with just your name and phone number.",
    ],
  ];
  return f.map(([qv, av, qe, ae]) => ({ question: L(qv, qe, locale), answer: L(av, ae, locale) }));
}
