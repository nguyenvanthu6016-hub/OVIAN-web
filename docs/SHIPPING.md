# Shipping fees

Fees are **configuration, not code**. They live in the Sanity document `shippingRates` (Live/Sanity mode) or in `src/lib/cms/mock-content.ts` (Mock Mode, sample values only — not OVIAN prices).

## How a fee is chosen

1. Store pickup → fee 0, always.
2. Home delivery → the first zone whose `provinceCodes` contains the customer's province.
3. No zone matches → the fallback fee if `fallbackEnabled` is on; otherwise delivery is **unavailable** for that province and the customer is asked to choose pickup or contact the store.
4. If the order subtotal (after discount) is at or above the zone's `freeOver`, the fee becomes 0.
5. A `free_shipping` discount code sets the fee to 0.

The server recalculates this on every quote and again right before the order is created. The browser's number is never trusted.

## Province codes (34 units, effective 1 July 2025)

| Code | Name | Code | Name |
|---|---|---|---|
| ha-noi | Hà Nội | ho-chi-minh | TP. Hồ Chí Minh |
| hai-phong | Hải Phòng | da-nang | Đà Nẵng |
| hue | Huế | can-tho | Cần Thơ |
| an-giang | An Giang | bac-ninh | Bắc Ninh |
| ca-mau | Cà Mau | cao-bang | Cao Bằng |
| dak-lak | Đắk Lắk | dien-bien | Điện Biên |
| dong-nai | Đồng Nai | dong-thap | Đồng Tháp |
| gia-lai | Gia Lai | ha-tinh | Hà Tĩnh |
| hung-yen | Hưng Yên | khanh-hoa | Khánh Hòa |
| lai-chau | Lai Châu | lam-dong | Lâm Đồng |
| lang-son | Lạng Sơn | lao-cai | Lào Cai |
| nghe-an | Nghệ An | ninh-binh | Ninh Bình |
| phu-tho | Phú Thọ | quang-ngai | Quảng Ngãi |
| quang-ninh | Quảng Ninh | quang-tri | Quảng Trị |
| son-la | Sơn La | tay-ninh | Tây Ninh |
| thai-nguyen | Thái Nguyên | thanh-hoa | Thanh Hóa |
| tuyen-quang | Tuyên Quang | vinh-long | Vĩnh Long |

Source list: `src/lib/checkout/provinces.ts`. Addresses use province → ward/commune → street (no district level since the 2025 reform).

## Example Sanity configuration

| label | provinceCodes | fee | freeOver |
|---|---|---|---|
| Nội thành | ha-noi | (OVIAN to decide) | (optional) |
| Miền Bắc | hai-phong, bac-ninh, … | … | … |

OVIAN has not supplied real fees yet; nothing in the codebase is an actual OVIAN price.
