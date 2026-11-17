# Chống bot spam đơn hàng

Website có nhiều lớp chặn bot, **khách thật không thấy gì cả**: không có captcha, không phải chọn hình.

## Website tự chặn những gì

| Lớp | Cách hoạt động | Khách thật có bị ảnh hưởng? |
|---|---|---|
| **Mã form ẩn** | Trang thanh toán cấp một mã đã ký. Đơn phải gửi kèm mã này, và chỉ hợp lệ sau 3 giây kể từ khi mở trang, trong vòng 6 giờ. | Không. Khách điền tên, số điện thoại, địa chỉ luôn mất hơn 3 giây. |
| **Ô bẫy ẩn** | Một ô nhập liệu người không nhìn thấy và không bấm tới được. Bot tự động thường điền vào. | Không |
| **Trần đơn hàng** | Quá **20 món** hoặc quá **5.000.000 ₫** thì không đặt được online. | Hiếm. Khách sẽ được mời liên hệ OVIAN. |
| **Giới hạn theo máy** | Tối đa 10 đơn/phút và 5 đơn/giờ từ cùng một kết nối. | Không |
| **Giới hạn theo số điện thoại** | Tối đa **3 đơn trong 24 giờ** cho mỗi số. | Có thể. Khách đặt nhiều lần trong ngày sẽ được mời gọi cho OVIAN. |
| **Danh sách chặn** | Số điện thoại trong trang tính **"Chặn"** không đặt được đơn nào. | Chỉ khi anh/chị tự thêm số vào |

Bot bị chặn ở 3 lớp đầu chỉ thấy thông báo chung chung "Không gửi được đơn", không biết vì sao, nên khó dò tìm cách lách.

## Việc của anh/chị

### 1. Chặn một số điện thoại quấy rối
Mở Google Sheet → trang tính **"Chặn"** → thêm một dòng:

| Số điện thoại | Lý do | Ngày thêm |
|---|---|---|
| 0912345678 | Đặt đơn ảo 3 lần | 17/11/2026 |

Chỉ cột **Số điện thoại** là bắt buộc. Bỏ chặn thì xoá dòng đó đi. Website nhận ngay, không cần làm gì thêm.

Số được so theo **9 chữ số cuối**, nên ghi `0912345678`, `+84912345678` hay `84912345678` đều như nhau.

### 2. Đổi giới hạn đơn mỗi số điện thoại
Mặc định 3 đơn/24 giờ. Muốn đổi: Apps Script → **⚙ Cài đặt dự án → Thuộc tính tập lệnh** → thêm `MAX_ORDERS_PER_PHONE_DAY`, giá trị là số mới. Đặt `0` để tắt hẳn giới hạn này.

### 3. Đổi trần giá trị đơn
Sửa `MAX_ORDER_TOTAL` (đồng) và `MAX_ORDER_ITEMS` (số món) trong file cấu hình máy chủ, rồi khởi động lại.

### 4. Khi đưa website lên mạng
- Đặt `ORDER_TOKEN_SECRET` là một chuỗi ngẫu nhiên dài. Thiếu nó, mỗi lần khởi động lại máy chủ, khách đang mở sẵn trang thanh toán sẽ phải tải lại trang một lần.
- Nên đặt website sau **Cloudflare** (gói miễn phí): có sẵn chống bot và chống tấn công làm sập web.
- **Luôn gọi xác nhận trước khi gửi hàng.** Với đơn COD, đây vẫn là chốt chặn chắc nhất.

## Khi nào cần thêm lớp nữa

Nếu vẫn bị spam, bước tiếp theo là **Cloudflare Turnstile** (miễn phí): đa số khách không phải bấm gì. Cần tạo tài khoản Cloudflare và lấy 2 mã. Báo tôi khi cần.

Chưa khuyên dùng xác thực OTP qua SMS/Zalo: chặn rất chắc nhưng tốn phí mỗi tin nhắn và làm khách ngại đặt hàng.

## Kiểm tra khi nghi có vấn đề

- Nhật ký máy chủ ghi dòng `[anti-bot] order refused from <IP>: <lý do>` mỗi lần từ chối. Nếu thấy nhiều dòng `token-missing`, có bot đang gọi thẳng vào hệ thống và **đã bị chặn**.
- Nếu khách thật báo không đặt được: hỏi mã lỗi trên màn hình, và kiểm tra xem số của họ có trong trang "Chặn" hoặc đã đặt quá 3 đơn hôm nay chưa.
