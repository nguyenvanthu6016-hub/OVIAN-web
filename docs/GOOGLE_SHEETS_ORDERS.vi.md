# Nhận đơn hàng web vào Google Sheet

Khách đặt hàng trên form của website OVIAN. Máy chủ website tính lại giá, tồn kho, mã giảm giá và phí giao, rồi gửi đơn tới **Google Apps Script** (miễn phí). Script ghi đơn thành **một dòng** trong Google Sheet của anh/chị. Khách không thấy Google Form hay Google Sheet.

Mã script: [`integrations/google-sheets/Code.gs`](../integrations/google-sheets/Code.gs).

## Cài đặt (khoảng 10 phút, làm một lần)

1. **Tạo Google Sheet mới** bằng tài khoản Google của cửa hàng, đặt tên ví dụ `OVIAN – Đơn hàng web`.
2. Trong Sheet: **Tiện ích mở rộng → Apps Script**. Xoá đoạn mã mẫu, dán **toàn bộ** nội dung file `Code.gs`, bấm **Lưu** (biểu tượng đĩa).
3. **Đặt mã bí mật:** bên trái chọn **Cài đặt dự án** (bánh răng) → kéo xuống **Thuộc tính tập lệnh** → **Thêm thuộc tính tập lệnh**:
   | Thuộc tính | Giá trị |
   |---|---|
   | `OVIAN_SECRET` | Giá trị của dòng `GOOGLE_SHEETS_SECRET=` trong file `.env.local` của website (copy phần sau dấu `=`) |
   | `NOTIFY_EMAIL` | *(không bắt buộc)* email nhận thông báo khi có đơn mới |

   Bấm **Lưu thuộc tính tập lệnh**. Không gửi mã bí mật qua chat hay email.
4. **Chạy cài đặt một lần:** quay lại **Trình chỉnh sửa** (biểu tượng `< >`), ở thanh trên chọn hàm **`setup`** → bấm **Chạy**.
   - Google sẽ xin quyền. Vì đây là script của chính anh/chị, nếu thấy cảnh báo "Google chưa xác minh ứng dụng này": bấm **Nâng cao → Đi tới … (không an toàn)** → **Cho phép**.
   - Sheet sẽ có trang tính **"Đơn hàng"** với dòng tiêu đề màu xanh.
5. **Triển khai thành Web App:** góc trên bên phải **Triển khai → Tùy chọn triển khai mới** → biểu tượng bánh răng → **Ứng dụng web**:
   - **Thực thi với tư cách:** Tôi (email của anh/chị)
   - **Người có quyền truy cập:** **Bất kỳ ai**. Cần như vậy để máy chủ website gọi được. Không có mã bí mật thì không ai đọc hay ghi được đơn.
   - Bấm **Triển khai**, rồi copy **URL ứng dụng web** (kết thúc bằng `/exec`).
6. **Kiểm tra:** mở URL đó trên trình duyệt. Thấy `{"ok":true,"service":"ovian-orders"}` là đúng.
7. **Gửi URL `/exec`** cho người quản trị website để điền vào `GOOGLE_SHEETS_WEBAPP_URL`. Sau khi đặt thử 1 đơn thành công thì mới bật `ORDERS_ENABLED=true`.

## Mỗi đơn hàng trong Sheet (30 cột)

Hàm `setup` tạo sẵn tiêu đề, màu, ghi chú, định dạng ngày/tiền và độ rộng cột. Rê chuột lên tiêu đề có tam giác nhỏ ở góc để xem ghi chú.
- **Nền vàng nhạt:** cột anh/chị tự điền.
- **Nền xanh nhạt:** website tự ghi, không cần sửa.

| # | Cột | Ai điền | Khách thấy khi tra cứu? |
|---|---|---|---|
| 1 | Thời gian | Website | Có (ngày đặt) |
| 2 | Mã đơn (`OV00001`, tăng dần) | Website | Có |
| 3 | **Trạng thái**: Mới / Đã xác nhận / Đang giao / Sẵn sàng nhận / Hoàn tất / Đã huỷ | Anh/chị chọn | **Có** |
| 4 | **Đã thu tiền** (ô tích) | Anh/chị | Có (Đã/Chưa thanh toán) |
| 5 | **Đơn vị vận chuyển**: chọn GHN, GHTK, Viettel Post, J&T Express, Ninja Van, VNPost, Ahamove, Grab/Be, Tự giao, Khác, hoặc gõ tên khác | Anh/chị | **Có** |
| 6 | **Mã vận đơn** | Anh/chị | **Có** |
| 7 | Ngày giao (ngày gửi cho bên vận chuyển) | Anh/chị | Không |
| 8 | Ngày khách nhận | Anh/chị | Không |
| 9 | Phí ship thực tế (OVIAN trả bên vận chuyển) | Anh/chị | Không |
| 10 | Người xử lý | Anh/chị | Không |
| 11 | **Đã trừ tồn kho Sapo** (ô tích) | Anh/chị | Không |
| 12 | Lý do huỷ / hoàn | Anh/chị | Không |
| 13–15 | Họ tên, Số điện thoại (giữ số 0 đầu), Email | Website | Chỉ số điện thoại, đã che bớt |
| 16–17 | Cách nhận, Thanh toán (hiện luôn là Giao tận nhà, COD) | Website | Có |
| 18–20 | Tỉnh/Thành, Phường/Xã, Số nhà, đường (trống nếu nhận tại cửa hàng) | Website | Chỉ tỉnh/thành |
| 21 | Ghi chú của khách | Website | Không |
| 22 | Sản phẩm: mỗi món một dòng, ví dụ `2 × Pin 3A (6 Viên) [SKU] = 48.000 ₫` | Website | Có |
| 23–27 | Tạm tính, Mã giảm giá, Giảm giá, Phí giao (khách trả), Tổng cộng | Website (máy chủ tính) | Có |
| 28 | **Ghi chú nội bộ** | Anh/chị | Không |
| 29–30 | *(ẩn)* Mã phiên, Dữ liệu gốc | Website | **Không sửa, không xoá.** Hai cột này chống tạo trùng đơn và phục vụ trang tra cứu. |

Gợi ý quy trình một đơn giao tận nhà:
1. Gọi xác nhận, chọn **Đã xác nhận**, ghi **Người xử lý**.
2. Trừ tồn kho trong Sapo, tích **Đã trừ tồn kho Sapo**.
3. Gửi hàng: chọn **Đơn vị vận chuyển**, nhập **Mã vận đơn**, **Ngày giao**, **Phí ship thực tế**, chọn **Đang giao**. Khách tra cứu sẽ thấy mã vận đơn.
4. Khách nhận và trả tiền: nhập **Ngày khách nhận**, tích **Đã thu tiền**, chọn **Hoàn tất**.
5. Nếu huỷ hoặc khách không nhận: chọn **Đã huỷ**, ghi **Lý do huỷ / hoàn**, cộng lại tồn kho trong Sapo nếu đã trừ.

## Lưu ý khi vận hành

- **Không đổi tên** trang tính "Đơn hàng", **không đổi** dòng tiêu đề và thứ tự cột. Muốn thêm cột riêng thì thêm **ở bên phải** cột ẩn cuối cùng, hoặc dùng trang tính khác. Chỉ chạy `setup` khi Sheet còn trống (nếu đã có đơn, script sẽ từ chối chạy lại).
- **Tồn kho Sapo không tự trừ** khi có đơn web. Hãy trừ trong Sapo khi xác nhận đơn, để website hiển thị đúng còn/hết hàng.
- Muốn **ẩn một sản phẩm khỏi website**: gắn tag `an-web` cho sản phẩm đó trong Sapo.
- **Sửa mã script** sau này: dán mã mới → Lưu → **Triển khai → Quản lý các bản triển khai → Chỉnh sửa (bút chì) → Phiên bản: Phiên bản mới → Triển khai**. Làm vậy URL `/exec` giữ nguyên. Nếu tạo "Triển khai mới" thì URL sẽ đổi.
- **Nếu mã bí mật bị lộ:** tạo mã mới, đổi ở **cả hai nơi** (`OVIAN_SECRET` trong Apps Script và `GOOGLE_SHEETS_SECRET` trên máy chủ), rồi khởi động lại website.
- Giới hạn miễn phí của Google (tài khoản thường) dư cho cửa hàng nhỏ. Email thông báo bị giới hạn khoảng 100 email/ngày.
- Dữ liệu khách (tên, số điện thoại, địa chỉ) nằm trong Google Drive của anh/chị. Chỉ chia sẻ Sheet cho người cần xử lý đơn.

## Khi có sự cố

| Hiện tượng | Kiểm tra |
|---|---|
| Website báo "Đặt hàng trực tuyến đang tạm tắt" | `ORDERS_ENABLED` chưa là `true`, hoặc thiếu URL / mã bí mật trên máy chủ |
| Khách thấy "chưa xác nhận được kết quả" | Script trả lời chậm. Xem Sheet: đơn có thể đã có. Khách bấm "Kiểm tra lại" sẽ ra đúng đơn, không tạo trùng. |
| Mở URL `/exec` thấy trang đăng nhập Google | Mục "Người có quyền truy cập" chưa là **Bất kỳ ai**. Sửa trong Quản lý các bản triển khai. |
| Đơn không vào Sheet, nhật ký máy chủ có `unauthorized` | `OVIAN_SECRET` và `GOOGLE_SHEETS_SECRET` không giống nhau |
| Lỗi "Chưa có trang tính Đơn hàng" | Chưa chạy hàm `setup`, hoặc trang tính đã bị đổi tên |
