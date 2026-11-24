# Gắn Meta Pixel (Facebook Pixel)

Website đã có sẵn phần đo lường. Anh/chị **chỉ cần dán mã Pixel ID**, không cần dán đoạn mã nào vào website.

## Bước 1: Lấy Pixel ID

1. Vào **business.facebook.com** → menu trái → **Trình quản lý sự kiện (Events Manager)**.
2. Chưa có pixel: bấm **Kết nối nguồn dữ liệu** → **Web** → **Meta Pixel** → đặt tên, ví dụ `OVIAN Website`.
3. Khi Facebook hỏi cách cài đặt, chọn **Cài đặt mã thủ công**. Anh/chị **không cần copy đoạn mã** họ đưa, website đã có sẵn.
4. Lấy **Pixel ID**: dãy số khoảng 15–16 chữ số, nằm ngay dưới tên pixel.

## Bước 2: Dán vào Hostinger

Thêm một biến môi trường:

| Khoá | Giá trị |
|---|---|
| `NEXT_PUBLIC_FACEBOOK_PIXEL_ID` | Dãy số Pixel ID |

Rồi bấm **Triển khai lại (deploy)**.

**Bắt buộc phải deploy lại, không chỉ khởi động lại.** Mã pixel được nhúng vào lúc build, nên chỉ lưu biến thôi sẽ không có tác dụng.

## Bước 3: Kiểm tra

1. Cài tiện ích **Meta Pixel Helper** cho Chrome.
2. Mở **ovianvietnam.com**, bấm vào biểu tượng tiện ích. Phải thấy pixel của anh/chị và sự kiện **PageView**.
3. Trong Trình quản lý sự kiện của Facebook, tab **Kiểm tra sự kiện (Test Events)**, nhập địa chỉ website rồi thao tác thử trên web để xem sự kiện chạy về.

## Website gửi những sự kiện nào

| Sự kiện | Khi nào | Kèm thông tin |
|---|---|---|
| `PageView` | Mỗi lần xem trang | — |
| `AddToCart` | Bấm "Thêm vào giỏ" | Số tiền, mã sản phẩm, số lượng |
| `InitiateCheckout` | Vào trang thanh toán khi giỏ có hàng | Tổng tiền giỏ, số món |
| `Purchase` | Đặt hàng thành công | **Tổng tiền đơn**, mã sản phẩm, số món |

**Tỷ lệ đặt hàng** anh/chị hỏi chính là `Purchase` chia cho `PageView` (hoặc chia cho `InitiateCheckout` nếu muốn xem tỷ lệ hoàn tất thanh toán). Facebook tự tính trong phần báo cáo quảng cáo.

Mã đơn hàng được gửi kèm làm **mã nhận dạng sự kiện**, nên nếu sau này thêm Conversions API thì một đơn không bị đếm hai lần.

## Dữ liệu nào được gửi, dữ liệu nào không

**Có gửi:** trang đã xem, mã sản phẩm, số lượng, số tiền.

**Không gửi:** họ tên, số điện thoại, email, địa chỉ giao hàng. Tôi cố ý không gửi những thông tin này.

Trang **Chính sách bảo mật** đã được cập nhật để nói rõ việc dùng Meta Pixel và cách khách từ chối. Đây là việc bắt buộc, vì trước đó chính sách cam kết không chia sẻ dữ liệu cho bên thứ ba.

## Tắt pixel

Xoá giá trị của `NEXT_PUBLIC_FACEBOOK_PIXEL_ID` (để trống) rồi deploy lại. Website sẽ không tải bất kỳ mã nào của Facebook nữa.

## Lưu ý kỹ thuật

- Website có lớp bảo mật chặn script lạ (CSP). Phần mở khoá cho Facebook **đã làm sẵn** và chỉ bật khi có Pixel ID. Đây là lý do thường gặp khiến pixel dán theo hướng dẫn trên mạng không chạy trên website kiểu này.
- Khoảng 20–30% khách dùng trình chặn quảng cáo sẽ không được ghi nhận. Muốn đo chính xác hơn phải thêm **Conversions API** (gửi sự kiện từ máy chủ). Việc này cần thêm một mã truy cập từ Facebook — báo tôi khi cần.
