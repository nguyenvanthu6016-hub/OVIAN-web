import { describe, expect, it } from "vitest";
import { isSectionHeading, parseDescription } from "@/lib/product/description";

// The real text Sapo returns for the OVIAN clip-on desk lamp.
const LAMP = [
  "Đèn bàn học OVIAN thiết kế dạng kẹp – Gọn nhẹ & Tiện lợi",
  "Thông số cơ bản:",
  "📏 Chiều cao tổng thể: 450mm",
  "⚡ Nguồn điện: 220V (dây chịu tải 250V – 10A, an toàn)",
  "Đặc điểm nổi bật:",
  "🖇️ Thiết kế kẹp tiện lợi – sử dụng linh hoạt ở nhiều vị trí.",
  "🔄 Cổ đèn uốn dẻo 360° – dễ dàng điều chỉnh góc chiếu sáng.",
  "Chính sách sau bán:",
  "🔄Đèn xảy ra lỗi trong 30 ngày: 1 đổi 1",
].join("\n");

describe("section headings", () => {
  it("recognises a line ending in a colon", () => {
    expect(isSectionHeading("Thông số cơ bản:")).toBe(true);
    expect(isSectionHeading("Chính sách sau bán:")).toBe(true);
  });

  it("recognises a shouted heading, emoji and all", () => {
    expect(isSectionHeading("✨ ĐẶC ĐIỂM NỔI BẬT")).toBe(true);
  });

  it("does not mistake a fact for a heading", () => {
    // Has a colon, but in the middle — this is a value, not a section.
    expect(isSectionHeading("📏 Chiều cao tổng thể: 450mm")).toBe(false);
    expect(isSectionHeading("🔄 Cổ đèn uốn dẻo 360° – dễ dàng điều chỉnh góc chiếu sáng.")).toBe(false);
  });

  it("does not treat a whole paragraph as a heading", () => {
    expect(isSectionHeading("Mang đến ánh sáng tiện lợi cho ban đêm mà không cần bật công tắc, phù hợp phòng ngủ và hành lang:")).toBe(false);
  });
});

describe("parseDescription", () => {
  const parsed = parseDescription(LAMP);

  it("keeps the opening line visible and groups the rest", () => {
    expect(parsed.intro.map((l) => l.text)).toEqual(["Đèn bàn học OVIAN thiết kế dạng kẹp – Gọn nhẹ & Tiện lợi"]);
    expect(parsed.sections.map((s) => s.title)).toEqual(["Thông số cơ bản", "Đặc điểm nổi bật", "Chính sách sau bán"]);
  });

  it("puts every line under the heading it followed", () => {
    expect(parsed.sections[0]!.lines.map((l) => l.text)).toEqual([
      "📏 Chiều cao tổng thể: 450mm",
      "⚡ Nguồn điện: 220V (dây chịu tải 250V – 10A, an toàn)",
    ]);
  });

  it("loses nothing the seller wrote", () => {
    const back = [...parsed.intro.map((l) => l.text), ...parsed.sections.flatMap((s) => s.lines.map((l) => l.text))];
    const originals = LAMP.split("\n").filter((l) => !isSectionHeading(l));
    expect(back).toEqual(originals);
  });

  it("bolds a lead-in but not a measurement or a finished sentence", () => {
    const p = parseDescription(["Tính năng:", "🚶 Cảm biến chuyển động thông minh", "📏 Chiều cao: 450mm", "Tự động bật đèn khi có người."].join("\n"));
    expect(p.sections[0]!.lines.map((l) => l.kind)).toEqual(["label", "text", "text"]);
  });

  it("leaves a description with no headings as plain intro text", () => {
    const p = parseDescription("Một dòng mô tả bình thường, không có đề mục nào cả.");
    expect(p.sections).toEqual([]);
    expect(p.intro).toHaveLength(1);
  });

  it("drops a heading that has nothing under it", () => {
    const p = parseDescription("Mở đầu\nThông số:\n");
    expect(p.sections).toEqual([]);
  });

  it("copes with no description at all", () => {
    expect(parseDescription(null)).toEqual({ intro: [], sections: [] });
    expect(parseDescription("   \n  \n")).toEqual({ intro: [], sections: [] });
  });
});

/**
 * OVIAN's sellers write headings three different ways, all of them present in the live
 * catalogue. Before these, a quarter of the shop rendered as one unbroken wall of text.
 */
describe("the heading styles the real catalogue actually uses", () => {
  it("reads Title Case as a heading, the way a seller means it", () => {
    expect(isSectionHeading("💤 Thiết Kế Hoàn Hảo")).toBe(true);
    expect(isSectionHeading("🌟 Đặc Điểm Nổi Bật")).toBe(true);
    expect(isSectionHeading("Vì Sao Nên Chọn Đèn Ngủ OVIAN?")).toBe(true);
  });

  it("reads Vietnamese shouted in capitals as a heading", () => {
    expect(isSectionHeading("✨ ĐẶC ĐIỂM NỔI BẬT")).toBe(true);
    expect(isSectionHeading("🏠 ỨNG DỤNG")).toBe(true);
  });

  it("does not mistake an ordinary sentence for a heading", () => {
    expect(isSectionHeading("Gỗ cao su tự nhiên, bền đẹp, thân thiện với môi trường.")).toBe(false);
    expect(isSectionHeading("🔹 Cảm biến ánh sáng quang học thông minh")).toBe(false);
  });

  it("does not mistake a fact written as key and value for a heading", () => {
    expect(isSectionHeading("✔ Kích thước: 35x100cm – lý tưởng cho mọi tư thế ngủ")).toBe(false);
    expect(isSectionHeading("✨ Thương hiệu: OVIAN")).toBe(false);
  });
});

describe("a description with no headings at all", () => {
  const PLAIN = [
    "Đặc điểm sản phẩm",
    "🌳 Chất liệu",
    "Gỗ cao su tự nhiên, bền đẹp.",
    "📏 Kích thước",
    "Chiều cao: 1m80.",
    "🎨 Màu sắc",
    "3 lựa chọn: màu gỗ tự nhiên, màu cánh gián.",
  ].join("\n");

  it("falls back to the seller's emoji lead-ins so it still opens and closes", () => {
    const d = parseDescription(PLAIN);
    expect(d.sections.map((s) => s.title)).toEqual(["Chất liệu", "Kích thước", "Màu sắc"]);
    expect(d.intro.map((l) => l.text)).toEqual(["Đặc điểm sản phẩm"]);
  });

  it("does not flatten a description that already has real headings", () => {
    const d = parseDescription(
      ["🌟 Đặc Điểm Nổi Bật", "🔹 Cảm biến thông minh", "Tự động bật khi trời tối.", "🔹 Tiết kiệm điện", "Công suất thấp.", "🏠 Ứng Dụng", "🏡 Phòng ngủ"].join("\n"),
    );
    // Two named sections, not four nameless ones.
    expect(d.sections.map((s) => s.title)).toEqual(["Đặc Điểm Nổi Bật", "Ứng Dụng"]);
    expect(d.sections[0]?.lines).toHaveLength(4);
  });
});

describe("a heading with nothing under it", () => {
  it("keeps its words instead of being deleted", () => {
    const d = parseDescription(["📜 Thông Tin Chi Tiết", "📍 Chất liệu:", "Cao su non", "Vải lưới"].join("\n"));
    expect(d.sections).toHaveLength(1);
    expect(d.sections[0]?.title).toBe("Chất liệu");
    // The parent heading survives as a lead-in rather than vanishing from the page.
    expect(d.sections[0]?.lines[0]).toEqual({ kind: "label", text: "Thông Tin Chi Tiết" });
  });

  it("keeps a trailing heading that has nothing after it", () => {
    const d = parseDescription(["Thông số:", "Cao 450mm", "Cam Kết Từ OVIAN"].join("\n"));
    const all = d.sections.flatMap((s) => s.lines.map((l) => l.text)).concat(d.intro.map((l) => l.text));
    expect(all).toContain("Cam Kết Từ OVIAN");
  });
});
