# Hướng dẫn vận hành website OVIAN

Tài liệu cho chủ cửa hàng. Chi tiết kỹ thuật xem `README.md` và `ARCHITECTURE.md`.

## 1. Website lấy dữ liệu từ đâu

| Dữ liệu | Quản lý ở |
|---|---|
| Sản phẩm, biến thể (màu, cỡ), giá, giá khuyến mãi, tồn kho, danh mục | **Sapo** |
| Đơn hàng, trạng thái đơn | **Sapo** |
| Tên/mô tả tiếng Anh, thông số, sản phẩm dùng cùng | **Sanity** (tài liệu "Nội dung sản phẩm", liên kết bằng ID Sapo) |
| Trang chủ, bộ sưu tập, nhật ký, chính sách, câu hỏi thường gặp | **Sanity** |
| Địa chỉ, giờ mở cửa cửa hàng nhận hàng | **Sanity** (tài liệu "Cửa hàng" + "Cài đặt chung") |
| Phí giao hàng theo tỉnh | **Sanity** (tài liệu "Phí giao hàng") |

## 2. Chế độ Mẫu và chế độ Thật

- **Mẫu (mặc định):** sản phẩm, giá, đơn hàng đều là dữ liệu mô phỏng. Thanh trên cùng ghi rõ "chế độ mẫu". Không có đơn thật nào được tạo.
- **Thật:** đặt `COMMERCE_MODE=live` trong file môi trường của máy chủ, khởi động lại. Nội dung các trang (giới thiệu, chính sách, phí giao hàng) nằm trong mã nguồn, mục 7 bên dưới.
- Ở chế độ Thật, nút **Đặt hàng** bị khoá cho tới khi đặt `ORDERS_ENABLED=true` và đã cấu hình Google Sheet (mục 5). Chỉ bật sau khi đã đặt thử 1 đơn thành công.

## 3. Kết nối Sapo

1. Trong Sapo: Cấu hình → Ứng dụng → tạo ứng dụng riêng (private app) với quyền đọc sản phẩm, đọc/ghi đơn hàng, đọc khuyến mãi.
2. Đưa thông tin cho người quản trị máy chủ để điền vào file môi trường (không gửi qua chat công khai, không đưa vào Git):
   `SAPO_STORE_DOMAIN`, và `SAPO_ACCESS_TOKEN` **hoặc** `SAPO_API_KEY` + `SAPO_API_SECRET`.
3. Tạo webhook sản phẩm (products/create, products/update, products/delete) trỏ về `https://<tên-miền>/api/webhooks/sapo` để website cập nhật ngay khi sửa sản phẩm.

## 4. Quản lý sản phẩm

- Tạo/sửa sản phẩm trong Sapo như bình thường. Sản phẩm **đang hoạt động** trong Sapo, có ít nhất một phiên bản và **không** gắn tag `an-web` sẽ tự lên website (tối đa ~5 phút).
- **Không gian (danh mục):** dùng danh mục (collection) trong Sapo. Danh mục con đặt alias dạng `cha--con`, ví dụ `bep--bao-quan` nằm trong `bep`.
- **Bộ lọc:** gắn tag sản phẩm dạng `material:go`, `color:xanh`… (xem danh sách trong `src/lib/commerce/facets.ts`).
- **Giá khuyến mãi:** điền "Giá so sánh" (compare at price) lớn hơn giá bán; website tự hiện nhãn "Giảm …%".
- **Tồn kho:** cập nhật trong Sapo. Website luôn kiểm tra lại tồn kho và giá ngay trước khi đặt hàng.
- **Tiếng Anh:** tạo "Nội dung sản phẩm" trong Sanity với ID sản phẩm Sapo. Nếu chưa có, trang tiếng Anh hiện nội dung tiếng Việt kèm ghi chú, và không được lập chỉ mục tiếng Anh trên Google.

## 5. Xử lý đơn hàng

OVIAN không dùng gói website của Sapo. **Đơn từ website được ghi vào Google Sheet** của cửa hàng, mỗi đơn một dòng. Cách cài đặt và ý nghĩa từng cột xem [GOOGLE_SHEETS_ORDERS.vi.md](GOOGLE_SHEETS_ORDERS.vi.md).

Website **chỉ có giao tận nhà, thanh toán tiền mặt khi nhận hàng (COD)**. Lựa chọn "Nhận tại cửa hàng" đã tắt từ 12/11/2026. Muốn bật lại: đặt `STORE_PICKUP_ENABLED=true` trên máy chủ rồi khởi động lại; không cần sửa code.

- Cập nhật cột **Trạng thái** (Mới → Đã xác nhận → Đang giao / Sẵn sàng nhận → Hoàn tất / Đã huỷ). Khách tra cứu đơn bằng **mã đơn + số điện thoại** sẽ thấy trạng thái này.
- Tích **Đã thu tiền** khi đã nhận tiền thật.
- Gọi xác nhận theo số điện thoại trên đơn.
- **Tồn kho Sapo không tự trừ** khi có đơn web: trừ trong Sapo khi xác nhận đơn.
- Muốn ẩn sản phẩm khỏi website: gắn tag `an-web` trong Sapo.

## 5b. Chống bot spam đơn

Website tự chặn bot bằng nhiều lớp ẩn; khách thật không phải làm gì thêm. Mỗi số điện thoại đặt tối đa **3 đơn/24 giờ**. Muốn chặn hẳn một số, thêm vào trang tính **"Chặn"** trong Google Sheet. Xem [ANTI_SPAM.vi.md](ANTI_SPAM.vi.md).

## 5c. Ảnh phòng trên sơ đồ trang chủ

Mỗi ô phòng trên sơ đồ mặt bằng đang vẽ sẵn đồ đạc theo kiểu bản vẽ (giường, sofa, bếp, bồn tắm, bàn làm việc). Muốn thay bằng **ảnh chụp phòng thật**: vào Sapo → danh mục phòng đó → tải ảnh đại diện cho danh mục. Website tự dùng ảnh đó, không cần sửa code.

Ảnh nên chụp ngang (khổ 3:2), rộng tối thiểu 1200px, sáng và ít chi tiết rối ở góc trên bên trái, vì tên phòng nằm ở đó. Không dùng ảnh quảng cáo có chữ.

## 5d. Đo lường quảng cáo Facebook

Website đã có sẵn Meta Pixel; chỉ cần dán Pixel ID vào biến `NEXT_PUBLIC_FACEBOOK_PIXEL_ID` rồi deploy lại. Các sự kiện xem trang, thêm giỏ, vào thanh toán và **đặt hàng kèm số tiền** đều được gửi tự động. Xem [FACEBOOK_PIXEL.vi.md](FACEBOOK_PIXEL.vi.md).

## 6. Đổi phí giao hàng

**Đang chạy:** đồng giá **5.000 ₫ toàn quốc**, đơn từ 300.000 ₫ miễn phí. Ở trang thanh toán, khách thấy phí vùng (10.000 ₫ hoặc 15.000 ₫) bị gạch và chỉ trả 5.000 ₫.

Muốn **tắt ưu đãi**: trong `src/lib/cms/ovian-content.ts`, đổi `promoFee: 5_000` thành `promoFee: null`. Khách sẽ trả lại phí vùng và không còn giá gạch. Muốn đổi mức: sửa con số đó.

Biểu phí vùng (giá bị gạch) và mức đồng giá đều được ghi trên trang Chính sách giao hàng, nên giá gạch là giá có thật chứ không phải giá bịa.

Sanity → "Phí giao hàng" → thêm vùng, chọn mã tỉnh (danh sách trong `docs/SHIPPING.md`), điền phí và mức miễn phí. Có hiệu lực sau khoảng 1 phút. Tỉnh không thuộc vùng nào sẽ **không giao được** trừ khi bật "Giao tới tỉnh không có trong danh sách".

## 5e. Mô tả sản phẩm tự chia thành mục xổ

Website đọc phần mô tả anh/chị viết trong Sapo và **tự chia thành các mục đóng/mở**, thay vì đổ một khối chữ dài. Khách lướt thấy phần mở đầu, muốn xem chi tiết thì bấm vào mục.

**Cách viết để web chia đúng.** Một dòng được coi là **tên mục** khi:

- kết thúc bằng dấu hai chấm — `Thông số cơ bản:`, `Chính sách sau bán:`; hoặc
- viết hoa toàn bộ — `✨ ĐẶC ĐIỂM NỔI BẬT`.

Mọi dòng phía dưới thuộc về mục đó, cho tới tên mục tiếp theo. Các dòng trước tên mục đầu tiên luôn hiện sẵn, không cần bấm.

Một dòng ngắn mở đầu bằng biểu tượng cảm xúc, **không có dấu hai chấm giữa dòng và không kết thúc bằng dấu chấm**, sẽ được **in đậm** — ví dụ `🚶 Cảm biến chuyển động thông minh`. Dòng có dạng `📏 Chiều cao: 450mm` thì giữ chữ thường, vì đó là thông số chứ không phải đề mục.

Website **không sửa, không bỏ, không đảo** chữ nào anh/chị viết — chỉ nhóm lại.

Sản phẩm viết liền một đoạn, không có tên mục nào, vẫn hiện bình thường như cũ.

## 5f. Biểu tượng phòng trên sơ đồ trang chủ

Các hình trong ô phòng được vẽ lại ngày 26/11/2026 theo **góc nhìn ngang** (giường, bếp, sofa, bàn làm việc, bồn rửa, ghế băng) thay cho kiểu nhìn từ trên xuống — kiểu cũ bắt người xem phải đoán. Muốn thay bằng ảnh thật: đặt **ảnh đại diện cho nhóm sản phẩm (collection)** trong Sapo, website sẽ tự ưu tiên ảnh đó. Ảnh cần sạch, không có chữ quảng cáo.

## 6b. Ưu đãi thêm ở trang thanh toán (upsale)

Khi khách đang điền thông tin đặt hàng, website gợi ý thêm **một sản phẩm nữa**. Nếu khách đồng ý:

- sản phẩm đó được **giảm 40%** so với giá gốc, thay vì 30% như bình thường;
- **cả đơn được miễn phí giao hàng**, kể cả khi chưa đạt 300.000 ₫.

Mỗi đơn chỉ có **một** ưu đãi. Một nửa số lần, website mời lấy **2 cái** cùng sản phẩm đó (cả 2 đều giảm 40%); nửa còn lại mời lấy **1 cái**.

**Sản phẩm nào được gợi ý.** Ưu tiên sản phẩm **cùng danh mục** với món khách đang mua. Phải còn hàng, đang giảm giá, và **giá gốc từ 100.000 ₫ trở lên** — món rẻ hơn không được gợi ý, vì giảm 40% cộng miễn phí ship thì không còn lãi. Nếu danh mục đó không có món nào đủ điều kiện, website mới tìm trong toàn bộ cửa hàng.

**Tiền.** Mỗi đơn có upsale, anh/chị mất thêm 10% giá gốc của món đó cộng tiền ship. Đổi lại là một món bán được mà lẽ ra không bán được. Nên theo dõi vài tuần rồi quyết định giữ hay bỏ.

**Tắt hoàn toàn:** thêm biến môi trường `UPSELL_ENABLED` = `false` trong Hostinger rồi deploy lại. Không cần sửa mã.

**Nếu ưu đãi không hiện:** mở `ovianvietnam.com/api/checkout/upsell` không xem được bằng tay, nhưng khi báo tôi, tôi đọc được lý do website trả về — `disabled` (đã tắt bằng biến môi trường), `no-candidates` (không sản phẩm nào đủ điều kiện), `cart-unknown` (không đọc được giỏ hàng). Nhờ vậy không phải đoán mò rồi deploy lại nhiều lần.

**Đổi mức giảm hoặc giá sàn:** sửa `UPSELL_DISCOUNT` và `UPSELL_MIN_COMPARE_AT` trong `src/lib/checkout/upsell.ts`.

**Trong Google Sheet**, dòng hàng của món upsale có ghi `(ưu đãi thêm -40%)` để anh/chị biết vì sao giá dòng đó thấp hơn bình thường. Phần này cần **deploy lại `Code.gs`** mới hiện.

**Giá luôn do máy chủ tính.** Trình duyệt chỉ nói "khách đồng ý lấy ưu đãi này"; số tiền thì máy chủ đọc lại giá Sapo rồi tự tính. Khách không thể sửa giá, không thể tự nhận ưu đãi cho món khác, và ưu đãi hết hạn sau 6 tiếng.

## 6c. Chăm sóc khách hàng qua Zalo

Số dùng cho CSKH là **0909651935** — cùng số hotline, lấy từ `zaloPhone` trong `src/lib/cms/ovian-content.ts`. Đổi số ở đó là đổi hết mọi chỗ.

Khách gặp nút hỗ trợ ở ba nơi:

1. **Nút tròn góc dưới bên phải**, có mặt trên mọi trang. Trên điện thoại nút nằm **phía trên** thanh "Thêm vào giỏ", không che nút mua — có test tự động canh khoảng cách này mỗi lần chạy.
2. **Trang xác nhận đơn hàng**, ngay sau khi khách đặt xong.
3. **Trang tra cứu đơn hàng**, nơi khách vào khi muốn biết đơn đi tới đâu.

Mỗi khối có hai cách liên hệ: **mở Zalo** và **gọi điện** (bấm là quay số trên điện thoại). Có ghi sẵn câu nhắc khách gửi kèm mã đơn hàng.

**Chưa công bố giờ làm việc.** Tôi không tự đặt ra giờ hỗ trợ. Khi anh/chị cho biết giờ nhận tin (ví dụ 8:00–21:00 hằng ngày), báo tôi thêm vào.

## 7. Sửa nội dung

Nội dung các trang (Câu chuyện OVIAN, chính sách giao hàng, đổi trả, bảo mật, điều khoản, câu hỏi thường gặp, phí giao hàng theo vùng, số điện thoại, mạng xã hội) nằm trong một file mã nguồn duy nhất: `src/lib/cms/ovian-content.ts`. Muốn sửa, báo người quản trị website; sau khi sửa phải build và khởi động lại.

Hai mục bật/tắt nhanh trong file đó:
- `store: null` → ẩn trang Cửa hàng. Điền thông tin cửa hàng vào đây nếu sau này mở cửa hàng đón khách.
- `showJournal: false` → ẩn mục Nhật ký. Đổi thành `true` khi đã có bài thật trong `ovianJournal`.

Một phòng chưa có sản phẩm nào sẽ tự ẩn khỏi menu và trang chủ, và hiện lại ngay khi anh/chị thêm sản phẩm vào phòng đó trong Sapo.

### 7b. Sửa nội dung bằng Sanity (chưa dùng)

Trong Sanity Studio: Trang chủ, Bộ sưu tập, Bài nhật ký, Trang thông tin (slug: `about`, `giao-hang`, `doi-tra`, `bao-mat`, `dieu-khoan`), Câu hỏi thường gặp, Cửa hàng. Mỗi trường có ô Tiếng Việt (bắt buộc) và English (không bắt buộc). Bấm Publish; website cập nhật trong vài phút (ngay lập tức nếu đã cài webhook `/api/revalidate`).

## 8. Khi có sự cố

| Hiện tượng | Kiểm tra |
|---|---|
| Website báo "Cửa hàng tạm gián đoạn" | Sapo có hoạt động không; token còn hiệu lực không; log máy chủ dòng `commerce unavailable` |
| Nút Đặt hàng bị khoá ở chế độ Thật | `ORDERS_ENABLED` chưa bật, hoặc thiếu URL/mã bí mật Google Sheet |
| Khách báo "chưa xác nhận được kết quả" | Tìm đơn trong Sapo theo tag `ck-…`/số điện thoại trước khi tạo đơn hộ — đơn có thể đã được tạo |
| Sản phẩm mới chưa lên | Sản phẩm có đang hoạt động trong Sapo không, có tag `an-web` không; đợi 5 phút |
| `/api/health` không trả về `ok` | Máy chủ không chạy — khởi động lại container |
