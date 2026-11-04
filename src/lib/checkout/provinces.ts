/** Vietnam's 34 provincial-level units (effective 1 July 2025). Codes are stable slugs used by shipping rules. */
export const provinces = [
  { code: "ha-noi", name: "Hà Nội" },
  { code: "ho-chi-minh", name: "TP. Hồ Chí Minh" },
  { code: "hai-phong", name: "Hải Phòng" },
  { code: "da-nang", name: "Đà Nẵng" },
  { code: "hue", name: "Huế" },
  { code: "can-tho", name: "Cần Thơ" },
  { code: "an-giang", name: "An Giang" },
  { code: "bac-ninh", name: "Bắc Ninh" },
  { code: "ca-mau", name: "Cà Mau" },
  { code: "cao-bang", name: "Cao Bằng" },
  { code: "dak-lak", name: "Đắk Lắk" },
  { code: "dien-bien", name: "Điện Biên" },
  { code: "dong-nai", name: "Đồng Nai" },
  { code: "dong-thap", name: "Đồng Tháp" },
  { code: "gia-lai", name: "Gia Lai" },
  { code: "ha-tinh", name: "Hà Tĩnh" },
  { code: "hung-yen", name: "Hưng Yên" },
  { code: "khanh-hoa", name: "Khánh Hòa" },
  { code: "lai-chau", name: "Lai Châu" },
  { code: "lam-dong", name: "Lâm Đồng" },
  { code: "lang-son", name: "Lạng Sơn" },
  { code: "lao-cai", name: "Lào Cai" },
  { code: "nghe-an", name: "Nghệ An" },
  { code: "ninh-binh", name: "Ninh Bình" },
  { code: "phu-tho", name: "Phú Thọ" },
  { code: "quang-ngai", name: "Quảng Ngãi" },
  { code: "quang-ninh", name: "Quảng Ninh" },
  { code: "quang-tri", name: "Quảng Trị" },
  { code: "son-la", name: "Sơn La" },
  { code: "tay-ninh", name: "Tây Ninh" },
  { code: "thai-nguyen", name: "Thái Nguyên" },
  { code: "thanh-hoa", name: "Thanh Hóa" },
  { code: "tuyen-quang", name: "Tuyên Quang" },
  { code: "vinh-long", name: "Vĩnh Long" },
] as const;

export type ProvinceCode = (typeof provinces)[number]["code"];

export function provinceName(code: string): string {
  return provinces.find((p) => p.code === code)?.name ?? code;
}
