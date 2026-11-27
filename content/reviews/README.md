# Đánh giá chép tay từ sàn

Mỗi file JSON trong thư mục này là đánh giá của **một sản phẩm**, chép nguyên văn từ
ảnh chụp màn hình Shopee mà chủ shop gửi.

**Các file ở đây đang chạy trên web.** `src/lib/product/reviews.ts` đọc cả thư mục này một
lần mỗi tiến trình, kiểm tra từng file, rồi trang sản phẩm hiện đánh giá khớp theo mã sản phẩm
(`productHandle` phải đúng bằng phần cuối đường dẫn sản phẩm trên web).

File sai định dạng bị bỏ qua kèm cảnh báo trong log — sản phẩm đó mất đánh giá, nhưng web
không sập và các sản phẩm khác không ảnh hưởng. `tests/unit/reviews.test.ts` kiểm tra mọi file
trong thư mục này đều đọc được, nên một file hỏng sẽ làm test đỏ trước khi kịp deploy.

## Quy tắc khi chép

- **Chép đúng nguyên văn.** Giữ cả lỗi chính tả, dấu cách thừa, câu cụt. Sửa cho đẹp
  là biến lời khách thành lời shop viết, và người đọc nhận ra ngay.
- **Giữ nguyên tên như sàn hiển thị.** Tên bị che (`n*****2`) để nguyên dạng bị che.
  Không bịa tên đầy đủ.
- **Không ghi mã đơn hàng.** Ảnh chụp từ trang quản lý người bán có mã đơn; đó là số
  giao dịch của khách, không đưa lên web.
- `date: null` nghĩa là ảnh chụp không hiện ngày. Không đoán ngày.
- `variant` là dòng "Phân loại hàng" trên Shopee (màu, kích thước), chép nguyên văn.
  Không có thì bỏ trường này đi.
- `attributes` là các dòng khách chấm theo tiêu chí ("Chất liệu:", "Chống muỗi:").
  Shopee cho mỗi ngành hàng một bộ tiêu chí khác nhau, nên đừng ép về một bộ chung.
- `needsCheck` là chỗ chữ trong ảnh mờ hoặc nhập nhằng, chủ shop cần đọc lại và xác nhận.
- `mediaCount` chỉ ghi lại số ảnh/video khách đính kèm. Không lấy được nội dung ảnh
  từ ảnh chụp màn hình, nên web sẽ không hiện chúng.

## Đã làm khi gắn vào web

1. `Review["source"]` có thêm `"shopee"`, và trang nói rõ một lần ở đầu mục rằng đánh giá được
   viết trên gian hàng Shopee chứ không phải trên web này.
2. `Review["title"]` thành tuỳ chọn — đánh giá Shopee không có tiêu đề, bịa ra một cái là tự
   viết hộ khách.
3. `aggregateRating` **vẫn không** có trong dữ liệu có cấu trúc gửi Google. Sao hiện cho khách
   xem bình thường; chỉ phần máy đọc là không khai.
4. `next.config.ts` có `outputFileTracingIncludes` cho thư mục này. Bản build `standalone` chỉ
   đóng gói file nào nó thấy được import; thiếu dòng đó thì thư mục này không lên Hostinger và
   mọi sản phẩm lặng lẽ mất đánh giá.
