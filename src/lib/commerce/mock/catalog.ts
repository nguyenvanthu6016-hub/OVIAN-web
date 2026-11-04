/**
 * MOCK MODE SAMPLE CATALOGUE — simulated data, not real OVIAN products or prices.
 * Structure mirrors what the Sapo adapter produces so pages behave identically.
 */

type Tone = "ivory" | "sage" | "stone" | "oak";
type Shape =
  | "shelf" | "box" | "mug" | "bowl" | "towel" | "lamp" | "notebook" | "pot"
  | "shirt" | "basket" | "bottle" | "hanger" | "pillow" | "chair";

export interface MockCategory {
  id: string;
  handle: string;
  vi: string;
  en: string;
  descVi?: string;
  descEn?: string;
  parent?: string;
  areaM2?: number;
}

export interface MockVariant {
  id: string;
  sku: string;
  options: Record<string, string>;
  price: number;
  compareAt?: number;
  stock: number | null;
  tone?: Tone;
}

export interface MockProduct {
  id: string;
  handle: string;
  vi: string;
  /** undefined = English translation missing (tests Vietnamese fallback) */
  en?: string;
  summaryVi: string;
  summaryEn?: string;
  descVi: string;
  descEn?: string;
  categories: string[];
  shape: Shape;
  tones: Tone[];
  options: { key: string; vi: string; en: string }[];
  variants: MockVariant[];
  material: [string, string];
  dimensions: string;
  weight?: string;
  care?: [string, string];
  tags: string[];
  createdAt: string;
  related?: string[];
}

export const mockCategories: MockCategory[] = [
  { id: "c-living", handle: "phong-khach", vi: "Phòng khách", en: "Living room", areaM2: 24, descVi: "Kệ, đèn, hộp đựng và đồ trang trí giữ phòng khách gọn và ấm.", descEn: "Shelves, lamps, storage and small objects to keep the living room calm." },
  { id: "c-kitchen", handle: "bep", vi: "Bếp", en: "Kitchen", areaM2: 10, descVi: "Bát đĩa, cốc, hộp bảo quản cho góc bếp nhỏ.", descEn: "Tableware, cups and food storage for a small kitchen." },
  { id: "c-bedroom", handle: "phong-ngu", vi: "Phòng ngủ", en: "Bedroom", areaM2: 14, descVi: "Gối, áo cơ bản, móc treo và hộp tủ quần áo.", descEn: "Pillows, basics, hangers and wardrobe boxes." },
  { id: "c-bath", handle: "phong-tam", vi: "Phòng tắm", en: "Bathroom", areaM2: 6, descVi: "Khăn, chai chiết, giỏ đựng chịu ẩm.", descEn: "Towels, refill bottles and baskets that handle humidity." },
  { id: "c-work", handle: "goc-lam-viec", vi: "Góc làm việc", en: "Workspace", areaM2: 8, descVi: "Sổ, văn phòng phẩm, đèn bàn và hộp bàn làm việc.", descEn: "Notebooks, stationery, desk lamps and desk storage." },
  { id: "c-balcony", handle: "ban-cong", vi: "Ban công", en: "Balcony", areaM2: 5, descVi: "Chậu cây, ghế gấp, giỏ phơi đồ.", descEn: "Plant pots, folding chairs and laundry baskets." },

  { id: "c-living-shelf", handle: "phong-khach--ke-va-hop", vi: "Kệ và hộp", en: "Shelves & boxes", parent: "c-living" },
  { id: "c-living-light", handle: "phong-khach--den", vi: "Đèn", en: "Lighting", parent: "c-living" },
  { id: "c-kitchen-table", handle: "bep--ban-an", vi: "Bàn ăn", en: "Dining", parent: "c-kitchen" },
  { id: "c-kitchen-store", handle: "bep--bao-quan", vi: "Bảo quản", en: "Food storage", parent: "c-kitchen" },
  { id: "c-bedroom-basics", handle: "phong-ngu--do-mac-co-ban", vi: "Đồ mặc cơ bản", en: "Basics", parent: "c-bedroom" },
  { id: "c-bedroom-bed", handle: "phong-ngu--giuong", vi: "Giường ngủ", en: "Bed", parent: "c-bedroom" },
  { id: "c-bath-care", handle: "phong-tam--cham-soc", vi: "Chăm sóc cá nhân", en: "Personal care", parent: "c-bath" },
  { id: "c-work-paper", handle: "goc-lam-viec--van-phong-pham", vi: "Văn phòng phẩm", en: "Stationery", parent: "c-work" },
];

const C = (vi: string, en: string): [string, string] => [vi, en];
const color = { key: "color", vi: "Màu", en: "Colour" };
const size = { key: "size", vi: "Kích thước", en: "Size" };

export const mockProducts: MockProduct[] = [
  {
    id: "p-1001", handle: "ke-go-soi-3-tang", vi: "Kệ gỗ sồi 3 tầng", en: "Three-tier oak shelf",
    summaryVi: "Kệ đứng vừa góc tường 60 cm.", summaryEn: "A standing shelf that fits a 60 cm wall corner.",
    descVi: "Ba tầng gỗ sồi ghép, chịu tải 15 kg mỗi tầng. Đặt sách, hộp đựng hoặc cây nhỏ. Lắp bằng 8 vít, không cần khoan tường.",
    descEn: "Three tiers of finger-jointed oak, each holding up to 15 kg. For books, boxes or small plants. Assembles with 8 screws, no wall drilling.",
    categories: ["c-living", "c-living-shelf"], shape: "shelf", tones: ["oak", "ivory"], options: [color],
    variants: [
      { id: "v-1001-1", sku: "OV-SH-001-OAK", options: { color: "Gỗ tự nhiên" }, price: 1890000, stock: 12, tone: "oak" },
      { id: "v-1001-2", sku: "OV-SH-001-WHT", options: { color: "Trắng ngà" }, price: 1890000, stock: 3, tone: "ivory" },
    ],
    material: C("Gỗ sồi ghép, sơn gốc nước", "Finger-jointed oak, water-based finish"), dimensions: "60 × 30 × 90 cm", weight: "7,2 kg",
    care: C("Lau bằng khăn ẩm, tránh nắng trực tiếp.", "Wipe with a damp cloth, keep out of direct sun."),
    tags: ["material:go", "color:tu-nhien", "color:trang"], createdAt: "2026-09-02", related: ["p-1002", "p-1003", "p-1004"],
  },
  {
    id: "p-1002", handle: "hop-vai-co-nap", vi: "Hộp vải có nắp", en: "Lidded fabric box",
    summaryVi: "Hộp gấp gọn khi không dùng.", summaryEn: "Folds flat when not in use.",
    descVi: "Vải cotton pha lanh, khung bìa cứng. Vừa ngăn kệ 30 cm. Gấp phẳng khi cất.",
    descEn: "Cotton-linen blend over a card frame. Fits a 30 cm shelf. Folds flat for storage.",
    categories: ["c-living", "c-living-shelf", "c-bedroom"], shape: "box", tones: ["stone", "sage"], options: [size, color],
    variants: [
      { id: "v-1002-1", sku: "OV-BX-002-S-GRY", options: { size: "Nhỏ 25 cm", color: "Xám đá" }, price: 249000, stock: 30, tone: "stone" },
      { id: "v-1002-2", sku: "OV-BX-002-L-GRY", options: { size: "Lớn 35 cm", color: "Xám đá" }, price: 329000, stock: 18, tone: "stone" },
      { id: "v-1002-3", sku: "OV-BX-002-S-GRN", options: { size: "Nhỏ 25 cm", color: "Xanh rêu" }, price: 249000, stock: 0, tone: "sage" },
      { id: "v-1002-4", sku: "OV-BX-002-L-GRN", options: { size: "Lớn 35 cm", color: "Xanh rêu" }, price: 329000, stock: 6, tone: "sage" },
    ],
    material: C("Cotton 55%, lanh 45%", "55% cotton, 45% linen"), dimensions: "25 × 25 × 25 cm / 35 × 35 × 30 cm",
    care: C("Hút bụi hoặc lau nhẹ; không giặt máy.", "Vacuum or spot clean; do not machine wash."),
    tags: ["material:vai", "color:xam", "color:xanh"], createdAt: "2026-08-10", related: ["p-1001", "p-1010"],
  },
  {
    id: "p-1003", handle: "den-ban-giay-xep", vi: "Đèn bàn chao giấy", en: "Paper shade table lamp",
    summaryVi: "Ánh sáng vàng dịu cho góc đọc sách.", summaryEn: "Soft warm light for a reading corner.",
    descVi: "Chao giấy dó, chân thép sơn tĩnh điện. Bóng E27 tối đa 9 W LED (không kèm bóng).",
    descEn: "Dó paper shade on a powder-coated steel base. Takes an E27 bulb up to 9 W LED (bulb not included).",
    categories: ["c-living", "c-living-light", "c-work"], shape: "lamp", tones: ["ivory"], options: [],
    variants: [{ id: "v-1003-1", sku: "OV-LP-003", options: {}, price: 890000, compareAt: 1090000, stock: 9, tone: "ivory" }],
    material: C("Giấy dó, thép", "Dó paper, steel"), dimensions: "Ø 28 × 42 cm", weight: "1,1 kg",
    tags: ["material:giay", "material:thep", "color:trang"], createdAt: "2026-10-01", related: ["p-1001", "p-1013"],
  },
  {
    id: "p-1004", handle: "chau-gom-men-mo", vi: "Chậu gốm men mờ", en: "Matte glazed ceramic pot",
    summaryVi: "Có lỗ thoát nước và đĩa lót.", summaryEn: "With a drainage hole and saucer.",
    descVi: "Gốm Bát Tràng nung 1.200 °C, men mờ. Kèm đĩa lót cùng màu.",
    descEn: "Bát Tràng stoneware fired at 1,200 °C with a matte glaze. Matching saucer included.",
    categories: ["c-living", "c-balcony"], shape: "pot", tones: ["sage", "stone"], options: [size],
    variants: [
      { id: "v-1004-1", sku: "OV-PT-004-S", options: { size: "Ø 12 cm" }, price: 159000, stock: 40, tone: "sage" },
      { id: "v-1004-2", sku: "OV-PT-004-M", options: { size: "Ø 18 cm" }, price: 239000, stock: 22, tone: "sage" },
      { id: "v-1004-3", sku: "OV-PT-004-L", options: { size: "Ø 24 cm" }, price: 359000, stock: 2, tone: "stone" },
    ],
    material: C("Gốm sứ men mờ", "Matte glazed stoneware"), dimensions: "Ø 12 / 18 / 24 cm",
    tags: ["material:gom", "color:xanh"], createdAt: "2026-07-21", related: ["p-1016"],
  },
  {
    id: "p-1005", handle: "coc-su-trang-350ml", vi: "Cốc sứ trắng 350 ml", en: "White porcelain mug 350 ml",
    summaryVi: "Quai cầm vừa bốn ngón tay.", summaryEn: "A handle that fits four fingers.",
    descVi: "Sứ trắng nung cao, dùng được lò vi sóng và máy rửa bát. Thành dày giữ nhiệt lâu hơn.",
    descEn: "High-fired white porcelain, microwave and dishwasher safe. Thick walls keep drinks warm longer.",
    categories: ["c-kitchen", "c-kitchen-table", "c-work"], shape: "mug", tones: ["ivory", "stone"], options: [color],
    variants: [
      { id: "v-1005-1", sku: "OV-MG-005-WHT", options: { color: "Trắng" }, price: 129000, stock: 80, tone: "ivory" },
      { id: "v-1005-2", sku: "OV-MG-005-GRY", options: { color: "Xám tro" }, price: 129000, stock: 25, tone: "stone" },
    ],
    material: C("Sứ", "Porcelain"), dimensions: "Ø 8,5 × 9,5 cm", weight: "320 g",
    care: C("Dùng được máy rửa bát.", "Dishwasher safe."),
    tags: ["material:su", "color:trang", "color:xam"], createdAt: "2026-06-12", related: ["p-1006", "p-1007"],
  },
  {
    id: "p-1006", handle: "bat-su-mieng-rong", vi: "Bát sứ miệng rộng", en: "Wide porcelain bowl",
    summaryVi: "Dùng cho mì, salad, cơm trộn.", summaryEn: "For noodles, salads and rice bowls.",
    descVi: "Bát sứ đáy rộng, xếp chồng gọn. Bộ 2 chiếc.",
    descEn: "Wide-based porcelain bowls that stack neatly. Set of 2.",
    categories: ["c-kitchen", "c-kitchen-table"], shape: "bowl", tones: ["ivory"], options: [],
    variants: [{ id: "v-1006-1", sku: "OV-BW-006", options: {}, price: 219000, compareAt: 259000, stock: 50, tone: "ivory" }],
    material: C("Sứ", "Porcelain"), dimensions: "Ø 18 × 7 cm",
    tags: ["material:su", "color:trang"], createdAt: "2026-05-03", related: ["p-1005", "p-1007"],
  },
  {
    id: "p-1007", handle: "hop-thuy-tinh-bao-quan", vi: "Hộp thuỷ tinh bảo quản", en: "Glass food container",
    summaryVi: "Nắp tre có gioăng silicone.", summaryEn: "Bamboo lid with a silicone seal.",
    descVi: "Thuỷ tinh borosilicate chịu nhiệt, nắp tre kín khí. Dùng cho đồ khô, ngũ cốc, cà phê.",
    descEn: "Heat-resistant borosilicate glass with an airtight bamboo lid. For dry goods, cereal and coffee.",
    categories: ["c-kitchen", "c-kitchen-store"], shape: "bottle", tones: ["stone", "oak"], options: [size],
    variants: [
      { id: "v-1007-1", sku: "OV-GC-007-05", options: { size: "500 ml" }, price: 149000, stock: 60, tone: "stone" },
      { id: "v-1007-2", sku: "OV-GC-007-10", options: { size: "1 lít" }, price: 189000, stock: 35, tone: "stone" },
      { id: "v-1007-3", sku: "OV-GC-007-15", options: { size: "1,5 lít" }, price: 229000, stock: 0, tone: "oak" },
    ],
    material: C("Thuỷ tinh borosilicate, tre, silicone", "Borosilicate glass, bamboo, silicone"), dimensions: "Ø 10 × 12 / 18 / 24 cm",
    tags: ["material:thuy-tinh", "material:tre"], createdAt: "2026-09-15", related: ["p-1005"],
  },
  {
    id: "p-1008", handle: "ao-thun-cotton-co-tron", vi: "Áo thun cotton cổ tròn", en: "Crew neck cotton T-shirt",
    summaryVi: "Cotton 100%, dáng suông.", summaryEn: "100% cotton, relaxed fit.",
    descVi: "Vải cotton 180 g/m², đã xử lý co rút. Dáng suông, mặc ở nhà hay ra ngoài đều được.",
    descEn: "180 g/m² pre-shrunk cotton jersey. Relaxed fit for home or out.",
    categories: ["c-bedroom", "c-bedroom-basics"], shape: "shirt", tones: ["ivory", "sage", "stone"], options: [color, size],
    variants: [
      ...(["S", "M", "L", "XL"] as const).flatMap((sz, i) => [
        { id: `v-1008-w${i}`, sku: `OV-TS-008-WHT-${sz}`, options: { color: "Trắng", size: sz }, price: 199000, stock: sz === "XL" ? 0 : 20, tone: "ivory" as Tone },
        { id: `v-1008-g${i}`, sku: `OV-TS-008-GRN-${sz}`, options: { color: "Xanh rêu", size: sz }, price: 199000, stock: 10, tone: "sage" as Tone },
        { id: `v-1008-s${i}`, sku: `OV-TS-008-GRY-${sz}`, options: { color: "Xám đá", size: sz }, price: 199000, stock: sz === "S" ? 1 : 8, tone: "stone" as Tone },
      ]),
    ],
    material: C("Cotton 100%", "100% cotton"), dimensions: "S – XL",
    care: C("Giặt máy 30 °C, lộn trái khi phơi.", "Machine wash 30 °C, dry inside out."),
    tags: ["material:vai", "color:trang", "color:xanh", "color:xam"], createdAt: "2026-10-12", related: ["p-1009", "p-1010"],
  },
  {
    id: "p-1009", handle: "moc-treo-go-bo-5", vi: "Móc treo gỗ, bộ 5", en: "Wooden hangers, set of 5",
    summaryVi: "Vai móc bo tròn, không để lại vết trên áo.", summaryEn: "Rounded shoulders that leave no marks.",
    descVi: "Gỗ keo phủ dầu, móc thép không gỉ xoay 360°. Bộ 5 chiếc.",
    descEn: "Oiled acacia with a 360° stainless steel hook. Set of 5.",
    categories: ["c-bedroom", "c-bedroom-basics"], shape: "hanger", tones: ["oak"], options: [],
    variants: [{ id: "v-1009-1", sku: "OV-HG-009", options: {}, price: 179000, stock: 45, tone: "oak" }],
    material: C("Gỗ keo, thép không gỉ", "Acacia wood, stainless steel"), dimensions: "44 × 23 cm",
    tags: ["material:go"], createdAt: "2026-04-18", related: ["p-1008", "p-1002"],
  },
  {
    id: "p-1010", handle: "vo-goi-lanh", vi: "Vỏ gối vải lanh", en: "Linen pillowcase",
    summaryVi: "Thoáng mát cho mùa hè.", summaryEn: "Breathable for summer nights.",
    descVi: "Lanh giặt mềm, khoá kéo ẩn. Bộ 2 vỏ gối 50 × 70 cm.",
    descEn: "Stone-washed linen with a hidden zip. Set of 2, 50 × 70 cm.",
    categories: ["c-bedroom", "c-bedroom-bed"], shape: "pillow", tones: ["sage", "ivory"], options: [color],
    variants: [
      { id: "v-1010-1", sku: "OV-PC-010-GRN", options: { color: "Xanh rêu" }, price: 390000, compareAt: 450000, stock: 14, tone: "sage" },
      { id: "v-1010-2", sku: "OV-PC-010-NAT", options: { color: "Trắng ngà" }, price: 390000, compareAt: 450000, stock: 16, tone: "ivory" },
    ],
    material: C("Lanh 100%", "100% linen"), dimensions: "50 × 70 cm",
    care: C("Giặt máy 40 °C, không sấy nóng.", "Machine wash 40 °C, no hot tumble dry."),
    tags: ["material:vai", "color:xanh", "color:trang"], createdAt: "2026-10-20", related: ["p-1008"],
  },
  {
    id: "p-1011", handle: "khan-tam-cotton-han", vi: "Khăn tắm cotton Hàn", en: "Waffle cotton bath towel",
    summaryVi: "Dệt tổ ong, khô nhanh.", summaryEn: "Waffle weave, dries fast.",
    descVi: "Cotton dệt tổ ong, nhẹ và khô nhanh trong phòng tắm ẩm.",
    descEn: "Waffle-woven cotton, light and quick to dry in a humid bathroom.",
    categories: ["c-bath"], shape: "towel", tones: ["ivory", "sage"], options: [size, color],
    variants: [
      { id: "v-1011-1", sku: "OV-TW-011-F-WHT", options: { size: "Mặt 34 × 80 cm", color: "Trắng" }, price: 119000, stock: 70, tone: "ivory" },
      { id: "v-1011-2", sku: "OV-TW-011-B-WHT", options: { size: "Tắm 70 × 140 cm", color: "Trắng" }, price: 289000, stock: 30, tone: "ivory" },
      { id: "v-1011-3", sku: "OV-TW-011-F-GRN", options: { size: "Mặt 34 × 80 cm", color: "Xanh rêu" }, price: 119000, stock: 20, tone: "sage" },
      { id: "v-1011-4", sku: "OV-TW-011-B-GRN", options: { size: "Tắm 70 × 140 cm", color: "Xanh rêu" }, price: 289000, stock: 0, tone: "sage" },
    ],
    material: C("Cotton 100%", "100% cotton"), dimensions: "34 × 80 / 70 × 140 cm",
    tags: ["material:vai", "color:trang", "color:xanh"], createdAt: "2026-03-30", related: ["p-1012", "p-1015"],
  },
  {
    id: "p-1012", handle: "chai-chiet-pet-300ml", vi: "Chai chiết PET 300 ml",
    // English intentionally missing: exercises the Vietnamese fallback.
    summaryVi: "Chiết dầu gội, sữa tắm gọn kệ.",
    descVi: "Nhựa PET trong, đầu bơm inox. Dán nhãn được bằng bút dầu. Bộ 3 chai.",
    categories: ["c-bath", "c-bath-care"], shape: "bottle", tones: ["stone"], options: [],
    variants: [{ id: "v-1012-1", sku: "OV-BT-012", options: {}, price: 159000, stock: 55, tone: "stone" }],
    material: C("Nhựa PET, inox", "PET plastic, stainless steel"), dimensions: "Ø 6 × 18 cm",
    tags: ["material:nhua"], createdAt: "2026-10-28", related: ["p-1011"],
  },
  {
    id: "p-1013", handle: "so-tay-giay-tai-che-a5", vi: "Sổ tay giấy tái chế A5", en: "Recycled paper notebook A5",
    summaryVi: "Mở phẳng 180°, 160 trang.", summaryEn: "Lies flat at 180°, 160 pages.",
    descVi: "Giấy tái chế 80 g/m², dòng kẻ chấm 5 mm. Gáy khâu chỉ mở phẳng.",
    descEn: "80 g/m² recycled paper with a 5 mm dot grid. Thread-sewn spine lies flat.",
    categories: ["c-work", "c-work-paper"], shape: "notebook", tones: ["oak", "sage", "stone"], options: [color],
    variants: [
      { id: "v-1013-1", sku: "OV-NB-013-KRF", options: { color: "Nâu kraft" }, price: 69000, stock: 100, tone: "oak" },
      { id: "v-1013-2", sku: "OV-NB-013-GRN", options: { color: "Xanh rêu" }, price: 69000, stock: 60, tone: "sage" },
      { id: "v-1013-3", sku: "OV-NB-013-GRY", options: { color: "Xám đá" }, price: 69000, stock: 60, tone: "stone" },
    ],
    material: C("Giấy tái chế", "Recycled paper"), dimensions: "14,8 × 21 cm",
    tags: ["material:giay", "color:nau", "color:xanh", "color:xam"], createdAt: "2026-08-25", related: ["p-1014", "p-1003"],
  },
  {
    id: "p-1014", handle: "khay-go-de-ban", vi: "Khay gỗ để bàn", en: "Wooden desk tray",
    summaryVi: "Ba ngăn cho bút, kẹp, sổ nhỏ.", summaryEn: "Three compartments for pens, clips and small notebooks.",
    descVi: "Gỗ sồi nguyên khối, đáy lót nỉ chống trượt.",
    descEn: "Solid oak with a felt non-slip base.",
    categories: ["c-work"], shape: "box", tones: ["oak"], options: [],
    variants: [{ id: "v-1014-1", sku: "OV-DT-014", options: {}, price: 349000, stock: 0, tone: "oak" }],
    material: C("Gỗ sồi, nỉ", "Oak, felt"), dimensions: "30 × 12 × 4 cm",
    tags: ["material:go"], createdAt: "2026-02-14", related: ["p-1013"],
  },
  {
    id: "p-1015", handle: "gio-coi-dan-tay", vi: "Giỏ cói đan tay", en: "Hand-woven seagrass basket",
    summaryVi: "Đựng đồ giặt, chăn mỏng hoặc đồ chơi.", summaryEn: "For laundry, throws or toys.",
    descVi: "Cói đan tay ở Nga Sơn, quai cầm hai bên. Mỗi chiếc có vân đan khác nhau một chút.",
    descEn: "Seagrass hand-woven in Nga Sơn with two handles. Each weave varies slightly.",
    categories: ["c-bath", "c-balcony", "c-living"], shape: "basket", tones: ["oak"], options: [size],
    variants: [
      { id: "v-1015-1", sku: "OV-BK-015-M", options: { size: "Vừa Ø 30 cm" }, price: 279000, stock: 15, tone: "oak" },
      { id: "v-1015-2", sku: "OV-BK-015-L", options: { size: "Lớn Ø 40 cm" }, price: 389000, compareAt: 429000, stock: 7, tone: "oak" },
    ],
    material: C("Cói tự nhiên", "Natural seagrass"), dimensions: "Ø 30 × 28 / Ø 40 × 36 cm",
    care: C("Để nơi khô thoáng, phơi nắng nhẹ nếu bị ẩm.", "Keep dry; air in light sun if damp."),
    tags: ["material:coi", "color:tu-nhien"], createdAt: "2026-09-28", related: ["p-1011", "p-1016"],
  },
  {
    id: "p-1016", handle: "ghe-gap-go-keo", vi: "Ghế gấp gỗ keo", en: "Folding acacia chair",
    summaryVi: "Gấp dẹt 6 cm, treo lên tường được.", summaryEn: "Folds to 6 cm and hangs on a wall.",
    descVi: "Gỗ keo phủ dầu chống nước, chịu tải 100 kg. Dùng cho ban công hoặc thêm chỗ ngồi khi có khách.",
    descEn: "Acacia with a water-resistant oil finish, holds 100 kg. For the balcony or an extra seat for guests.",
    categories: ["c-balcony"], shape: "chair", tones: ["oak"], options: [],
    variants: [{ id: "v-1016-1", sku: "OV-CH-016", options: {}, price: 690000, stock: 5, tone: "oak" }],
    material: C("Gỗ keo", "Acacia wood"), dimensions: "45 × 52 × 80 cm", weight: "3,4 kg",
    tags: ["material:go", "color:tu-nhien"], createdAt: "2026-07-01", related: ["p-1004", "p-1015"],
  },
];

export const mockCoupons = [
  { code: "OVIAN10", kind: "percentage" as const, value: 10, minSubtotal: 300000, maxDiscount: 200000 },
  { code: "GIAM50K", kind: "fixed" as const, value: 50000, minSubtotal: 500000 },
  { code: "FREESHIP", kind: "free_shipping" as const, value: 0, minSubtotal: 0 },
];

export const mockReviewSeeds: Record<string, { author: string; rating: number; title: string; body: string; date: string }[]> = {
  "p-1001": [
    { author: "Khách mẫu A", rating: 5, title: "Vừa góc phòng", body: "Lắp mất khoảng 20 phút, đứng vững.", date: "2026-10-02" },
    { author: "Khách mẫu B", rating: 4, title: "Gỗ đẹp", body: "Màu gỗ sáng hơn ảnh một chút.", date: "2026-10-15" },
  ],
  "p-1005": [{ author: "Khách mẫu C", rating: 5, title: "Cầm chắc tay", body: "Thành dày, cà phê nguội chậm hơn.", date: "2026-09-20" }],
  "p-1011": [
    { author: "Khách mẫu D", rating: 4, title: "Khô nhanh", body: "Phơi trong phòng tắm vẫn khô trong ngày.", date: "2026-08-08" },
    { author: "Khách mẫu E", rating: 5, title: "Mềm", body: "Giặt vài lần thì mềm hơn.", date: "2026-09-01" },
    { author: "Khách mẫu F", rating: 3, title: "Hơi mỏng", body: "Mỏng hơn khăn bông thường.", date: "2026-09-30" },
  ],
};
