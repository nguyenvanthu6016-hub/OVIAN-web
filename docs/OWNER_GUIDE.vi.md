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
- **Thật:** đặt `COMMERCE_MODE=live` và `CONTENT_MODE=sanity` trong file môi trường của máy chủ, khởi động lại.
- Ở chế độ Thật, nút **Đặt hàng** bị khoá cho tới khi đặt `SAPO_ALLOW_ORDER_WRITES=true`. Chỉ bật sau khi đã thử đặt hàng trên cửa hàng Sapo thử nghiệm.

## 3. Kết nối Sapo

1. Trong Sapo: Cấu hình → Ứng dụng → tạo ứng dụng riêng (private app) với quyền đọc sản phẩm, đọc/ghi đơn hàng, đọc khuyến mãi.
2. Đưa thông tin cho người quản trị máy chủ để điền vào file môi trường (không gửi qua chat công khai, không đưa vào Git):
   `SAPO_STORE_DOMAIN`, và `SAPO_ACCESS_TOKEN` **hoặc** `SAPO_API_KEY` + `SAPO_API_SECRET`.
3. Tạo webhook sản phẩm (products/create, products/update, products/delete) trỏ về `https://<tên-miền>/api/webhooks/sapo` để website cập nhật ngay khi sửa sản phẩm.

## 4. Quản lý sản phẩm

- Tạo/sửa sản phẩm trong Sapo như bình thường. Sản phẩm **đang hiển thị** trong Sapo và có ít nhất một biến thể sẽ tự lên website (tối đa ~5 phút, hoặc ngay nếu có webhook).
- **Không gian (danh mục):** dùng danh mục (collection) trong Sapo. Danh mục con đặt alias dạng `cha--con`, ví dụ `bep--bao-quan` nằm trong `bep`.
- **Bộ lọc:** gắn tag sản phẩm dạng `material:go`, `color:xanh`… (xem danh sách trong `src/lib/commerce/facets.ts`).
- **Giá khuyến mãi:** điền "Giá so sánh" (compare at price) lớn hơn giá bán; website tự hiện nhãn "Giảm …%".
- **Tồn kho:** cập nhật trong Sapo. Website luôn kiểm tra lại tồn kho và giá ngay trước khi đặt hàng.
- **Tiếng Anh:** tạo "Nội dung sản phẩm" trong Sanity với ID sản phẩm Sapo. Nếu chưa có, trang tiếng Anh hiện nội dung tiếng Việt kèm ghi chú, và không được lập chỉ mục tiếng Anh trên Google.

## 5. Xử lý đơn hàng

Đơn từ website vào Sapo với tag `ovian-web` và:

| Cách nhận | Tag | Thanh toán | Ghi chú đơn |
|---|---|---|---|
| Giao tận nhà | `delivery` | COD — thu tiền mặt khi giao | "GIAO HÀNG — thu tiền mặt khi giao (COD)" |
| Nhận tại cửa hàng | `pickup` | Tiền mặt tại quầy | "NHẬN TẠI CỬA HÀNG — thanh toán tiền mặt tại quầy" |

- Đơn luôn ở trạng thái **chưa thanh toán**. Chỉ đánh dấu đã thanh toán trong Sapo khi đã nhận tiền thật.
- Gọi xác nhận theo số điện thoại trên đơn. Khách tra cứu đơn bằng **mã đơn + số điện thoại**.
- Nếu tổng tiền trong Sapo khác tổng trên website, máy chủ ghi log `total mismatch` — kiểm tra đơn đó trước khi xử lý.

## 6. Đổi phí giao hàng

Sanity → "Phí giao hàng" → thêm vùng, chọn mã tỉnh (danh sách trong `docs/SHIPPING.md`), điền phí và mức miễn phí. Có hiệu lực sau khoảng 1 phút. Tỉnh không thuộc vùng nào sẽ **không giao được** trừ khi bật "Giao tới tỉnh không có trong danh sách".

## 7. Sửa nội dung

Trong Sanity Studio: Trang chủ, Bộ sưu tập, Bài nhật ký, Trang thông tin (slug: `about`, `giao-hang`, `doi-tra`, `bao-mat`, `dieu-khoan`), Câu hỏi thường gặp, Cửa hàng. Mỗi trường có ô Tiếng Việt (bắt buộc) và English (không bắt buộc). Bấm Publish; website cập nhật trong vài phút (ngay lập tức nếu đã cài webhook `/api/revalidate`).

## 8. Khi có sự cố

| Hiện tượng | Kiểm tra |
|---|---|
| Website báo "Cửa hàng tạm gián đoạn" | Sapo có hoạt động không; token còn hiệu lực không; log máy chủ dòng `commerce unavailable` |
| Nút Đặt hàng bị khoá ở chế độ Thật | `SAPO_ALLOW_ORDER_WRITES` chưa bật |
| Khách báo "chưa xác nhận được kết quả" | Tìm đơn trong Sapo theo tag `ck-…`/số điện thoại trước khi tạo đơn hộ — đơn có thể đã được tạo |
| Sản phẩm mới chưa lên | Sản phẩm đã hiển thị trong Sapo chưa; đợi 5 phút hoặc kiểm tra webhook |
| `/api/health` không trả về `ok` | Máy chủ không chạy — khởi động lại container |
