import type { Locale } from "@/lib/i18n/config";

/**
 * Facets come from product tags in the form "<facet>:<value>" (in Sapo: product tags).
 * Labels live here so editors only need to tag products consistently.
 */
export const facetLabels: Record<string, Record<Locale, string>> = {
  material: { vi: "Chất liệu", en: "Material" },
  color: { vi: "Màu", en: "Colour" },
};

export const facetValueLabels: Record<string, Record<Locale, string>> = {
  "material:go": { vi: "Gỗ", en: "Wood" },
  "material:vai": { vi: "Vải", en: "Fabric" },
  "material:gom": { vi: "Gốm", en: "Ceramic" },
  "material:su": { vi: "Sứ", en: "Porcelain" },
  "material:giay": { vi: "Giấy", en: "Paper" },
  "material:thep": { vi: "Thép", en: "Steel" },
  "material:thuy-tinh": { vi: "Thuỷ tinh", en: "Glass" },
  "material:tre": { vi: "Tre", en: "Bamboo" },
  "material:coi": { vi: "Cói", en: "Seagrass" },
  "material:nhua": { vi: "Nhựa", en: "Plastic" },
  "color:trang": { vi: "Trắng", en: "White" },
  "color:xam": { vi: "Xám", en: "Grey" },
  "color:xanh": { vi: "Xanh", en: "Green" },
  "color:nau": { vi: "Nâu", en: "Brown" },
  "color:tu-nhien": { vi: "Màu tự nhiên", en: "Natural" },
};

export function facetValueLabel(tag: string, locale: Locale): string {
  return facetValueLabels[tag]?.[locale] ?? tag.split(":")[1] ?? tag;
}
