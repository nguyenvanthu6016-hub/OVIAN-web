import { defineArrayMember, defineField, defineType } from "sanity";

/**
 * OVIAN content model. Localised fields are objects { vi, en } — Vietnamese is required,
 * English is optional (the storefront falls back to Vietnamese and marks it lang="vi").
 */

const localeString = defineType({
  name: "localeString",
  title: "Văn bản (vi / en)",
  type: "object",
  fields: [
    defineField({ name: "vi", title: "Tiếng Việt", type: "string", validation: (r) => r.required() }),
    defineField({ name: "en", title: "English", type: "string" }),
  ],
});

const localeText = defineType({
  name: "localeText",
  title: "Đoạn văn (vi / en)",
  type: "object",
  fields: [
    defineField({ name: "vi", title: "Tiếng Việt", type: "text", rows: 4, validation: (r) => r.required() }),
    defineField({ name: "en", title: "English", type: "text", rows: 4 }),
  ],
});

const richBlock = defineArrayMember({
  type: "block",
  styles: [{ title: "Đoạn", value: "normal" }, { title: "Tiêu đề 2", value: "h2" }, { title: "Tiêu đề 3", value: "h3" }],
  lists: [{ title: "Gạch đầu dòng", value: "bullet" }],
  marks: { decorators: [{ title: "Đậm", value: "strong" }], annotations: [] },
});

const localeBlocks = defineType({
  name: "localeBlocks",
  title: "Nội dung (vi / en)",
  type: "object",
  fields: [
    defineField({ name: "vi", title: "Tiếng Việt", type: "array", of: [richBlock] }),
    defineField({ name: "en", title: "English", type: "array", of: [richBlock] }),
  ],
});

const store = defineType({
  name: "store",
  title: "Cửa hàng",
  type: "document",
  fields: [
    defineField({ name: "name", title: "Tên cửa hàng", type: "localeString", validation: (r) => r.required() }),
    defineField({ name: "address", title: "Địa chỉ", type: "string", validation: (r) => r.required() }),
    defineField({ name: "phone", title: "Điện thoại", type: "string" }),
    defineField({ name: "email", title: "Email", type: "string" }),
    defineField({ name: "hours", title: "Giờ mở cửa (mỗi dòng một khung giờ)", type: "array", of: [{ type: "localeString" }] }),
    defineField({ name: "mapUrl", title: "Link Google Maps", type: "url" }),
  ],
});

const siteSettings = defineType({
  name: "siteSettings",
  title: "Cài đặt chung",
  type: "document",
  fields: [
    defineField({ name: "pickupStore", title: "Cửa hàng nhận hàng", type: "reference", to: [{ type: "store" }] }),
    defineField({ name: "contactPhone", title: "Điện thoại liên hệ", type: "string" }),
    defineField({ name: "contactEmail", title: "Email liên hệ", type: "string" }),
    defineField({ name: "social", title: "Mạng xã hội", type: "array", of: [{ type: "object", fields: [{ name: "label", type: "string" }, { name: "url", type: "url" }] }] }),
  ],
});

const editorialCollection = defineType({
  name: "editorialCollection",
  title: "Bộ sưu tập biên tập",
  type: "document",
  fields: [
    defineField({ name: "title", title: "Tên", type: "localeString", validation: (r) => r.required() }),
    defineField({ name: "body", title: "Mô tả ngắn", type: "localeText" }),
    defineField({ name: "sapoProductIds", title: "Mã sản phẩm Sapo (product id)", type: "array", of: [{ type: "string" }], description: "Dán ID sản phẩm trong Sapo, theo thứ tự hiển thị." }),
  ],
});

const homePage = defineType({
  name: "homePage",
  title: "Trang chủ",
  type: "document",
  fields: [
    defineField({ name: "intro", title: "Lời giới thiệu cạnh slogan", type: "localeText" }),
    defineField({ name: "collections", title: "Bộ sưu tập hiển thị", type: "array", of: [{ type: "reference", to: [{ type: "editorialCollection" }] }] }),
    defineField({
      name: "story",
      title: "Khối câu chuyện thương hiệu",
      type: "object",
      fields: [
        { name: "title", title: "Tiêu đề", type: "localeString" },
        { name: "body", title: "Nội dung", type: "localeText" },
        { name: "image", title: "Ảnh (tuỳ chọn)", type: "image", fields: [{ name: "alt", type: "string", title: "Mô tả ảnh" }] },
      ],
    }),
  ],
});

const infoPage = defineType({
  name: "infoPage",
  title: "Trang thông tin / chính sách",
  type: "document",
  description: "Slug cố định: about, giao-hang, doi-tra, bao-mat, dieu-khoan",
  fields: [
    defineField({ name: "title", title: "Tiêu đề", type: "localeString", validation: (r) => r.required() }),
    defineField({ name: "slug", title: "Slug", type: "slug", validation: (r) => r.required() }),
    defineField({ name: "summary", title: "Tóm tắt", type: "localeString" }),
    defineField({ name: "body", title: "Nội dung", type: "localeBlocks" }),
  ],
});

const postCategory = defineType({ name: "postCategory", title: "Chủ đề nhật ký", type: "document", fields: [defineField({ name: "title", type: "localeString", validation: (r) => r.required() })] });

const post = defineType({
  name: "post",
  title: "Bài nhật ký",
  type: "document",
  fields: [
    defineField({ name: "title", title: "Tiêu đề", type: "localeString", validation: (r) => r.required() }),
    defineField({ name: "slug", title: "Slug", type: "slug", options: { source: "title.vi" }, validation: (r) => r.required() }),
    defineField({ name: "date", title: "Ngày đăng", type: "date", validation: (r) => r.required() }),
    defineField({ name: "category", title: "Chủ đề", type: "reference", to: [{ type: "postCategory" }] }),
    defineField({ name: "excerpt", title: "Tóm tắt", type: "localeText" }),
    defineField({ name: "body", title: "Nội dung", type: "localeBlocks" }),
  ],
});

const faq = defineType({
  name: "faq",
  title: "Câu hỏi thường gặp",
  type: "document",
  fields: [
    defineField({ name: "question", title: "Câu hỏi", type: "localeString", validation: (r) => r.required() }),
    defineField({ name: "answer", title: "Trả lời", type: "localeText", validation: (r) => r.required() }),
    defineField({ name: "order", title: "Thứ tự", type: "number" }),
  ],
});

const productLocalization = defineType({
  name: "productLocalization",
  title: "Nội dung sản phẩm (dịch / bổ sung)",
  type: "document",
  description: "Liên kết bằng ID sản phẩm Sapo. Giá, tồn kho, biến thể luôn lấy từ Sapo.",
  fields: [
    defineField({ name: "sapoProductId", title: "ID sản phẩm Sapo", type: "string", validation: (r) => r.required() }),
    defineField({ name: "name", title: "Tên hiển thị", type: "localeString" }),
    defineField({ name: "summary", title: "Mô tả ngắn", type: "localeString" }),
    defineField({ name: "description", title: "Mô tả", type: "localeText" }),
    defineField({
      name: "attributes",
      title: "Thông số (chất liệu, kích thước, bảo quản…)",
      type: "array",
      of: [{ type: "object", fields: [
        { name: "key", type: "string", title: "Khoá", options: { list: ["material", "dimensions", "weight", "care", "origin"] } },
        { name: "label", type: "localeString", title: "Nhãn" },
        { name: "value", type: "localeString", title: "Giá trị" },
      ] }],
    }),
    defineField({ name: "relatedSapoIds", title: "Sản phẩm dùng cùng (ID Sapo)", type: "array", of: [{ type: "string" }] }),
  ],
  preview: { select: { title: "name.vi", subtitle: "sapoProductId" } },
});

const categoryLocalization = defineType({
  name: "categoryLocalization",
  title: "Nội dung không gian (danh mục)",
  type: "document",
  fields: [
    defineField({ name: "handle", title: "Alias danh mục trong Sapo", type: "string", validation: (r) => r.required() }),
    defineField({ name: "name", title: "Tên (English)", type: "localeString" }),
    defineField({ name: "description", title: "Mô tả", type: "localeText" }),
    defineField({ name: "areaM2", title: "Diện tích hiển thị trên mặt bằng (m²)", type: "number" }),
  ],
});

const shippingRates = defineType({
  name: "shippingRates",
  title: "Phí giao hàng",
  type: "document",
  description: "Chỉ người có quyền Administrator nên sửa tài liệu này. Thay đổi có hiệu lực trong ~1 phút.",
  fields: [
    defineField({
      name: "zones",
      title: "Vùng giao hàng",
      type: "array",
      of: [{ type: "object", fields: [
        { name: "label", type: "string", title: "Tên vùng", validation: (r: { required: () => unknown }) => r.required() },
        { name: "provinceCodes", type: "array", title: "Mã tỉnh/thành", of: [{ type: "string" }], description: "Ví dụ: ha-noi, ho-chi-minh (xem docs/SHIPPING.md)" },
        { name: "fee", type: "number", title: "Phí (VND)", validation: (r: { required: () => { min: (n: number) => unknown } }) => r.required().min(0) },
        { name: "freeOver", type: "number", title: "Miễn phí cho đơn từ (VND, để trống nếu không)" },
      ] }],
    }),
    defineField({ name: "fallbackEnabled", title: "Giao tới tỉnh không có trong danh sách", type: "boolean", initialValue: false }),
    defineField({ name: "fallbackFee", title: "Phí cho tỉnh còn lại (VND)", type: "number" }),
    defineField({ name: "fallbackFreeOver", title: "Miễn phí cho đơn từ (tỉnh còn lại)", type: "number" }),
  ],
});

export const schemaTypes = [
  localeString, localeText, localeBlocks,
  siteSettings, store, homePage, editorialCollection, infoPage, post, postCategory, faq,
  productLocalization, categoryLocalization, shippingRates,
];
