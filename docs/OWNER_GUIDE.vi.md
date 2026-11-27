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

Mô tả dài được web tự chia thành các mục đóng/mở. Khách thấy đoạn mở đầu, muốn xem chi tiết thì
bấm vào từng mục.

**Web nhận ra đề mục theo ba cách, không cần anh/chị đổi cách viết:**

1. Dòng kết thúc bằng dấu hai chấm — `Thông số cơ bản:`
2. Dòng VIẾT HOA TOÀN BỘ — `✨ ĐẶC ĐIỂM NỔI BẬT`
3. Dòng Viết Hoa Đầu Mỗi Từ — `💤 Thiết Kế Hoàn Hảo`

Emoji đứng trước không ảnh hưởng gì.

Nếu một mô tả **không có đề mục nào** trong ba kiểu trên, web lấy các dòng ngắn có emoji làm đề
mục — `🌳 Chất liệu`, `📏 Kích thước`. Nhờ vậy gần như mọi sản phẩm đều chia được.

**Web không sửa, không bỏ, không đảo chữ nào anh/chị viết** — chỉ nhóm lại. Có bài test kiểm tra
điều này trên toàn bộ mô tả thật của 51 sản phẩm.

### Hai sản phẩm hiện chưa chia được

- **Đèn ngủ chất liệu Acrylic** — mô tả trong Sapo chỉ là dòng chữ "Điều chỉnh mức sáng" lặp lại
  rất nhiều lần. Đây là lỗi nội dung trong Sapo, cần viết lại mô tả.
- **Máy xông tinh dầu** — mô tả là một danh sách `- Thương hiệu: ...`, `- Model: ...` phẳng,
  không có đề mục nào. Vẫn hiện bình thường, chỉ là không chia mục.

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

## 6d. Đánh giá sản phẩm lấy từ Shopee

Sapo không có chỗ chứa đánh giá, và API đánh giá của Shopee thì chưa được duyệt. Nên hiện
tại đánh giá trên web được **chép tay từ ảnh chụp màn hình Shopee** vào các file trong thư mục
`content/reviews/`, mỗi sản phẩm một file.

### Thêm đánh giá cho một sản phẩm mới

1. Chụp màn hình phần đánh giá trên Shopee, **phải thấy tên sản phẩm** hoặc nói rõ sản phẩm nào.
2. Gửi cho người làm web. File mới sẽ được tạo trong `content/reviews/`, đặt tên đúng bằng mã
   sản phẩm trên web (phần cuối đường dẫn, ví dụ `.../products/man-ngu-co-cua-1-be-...`).
3. Deploy. Đánh giá hiện ngay trên trang sản phẩm đó.

Sản phẩm không có file thì mục đánh giá vẫn hiện câu "Sản phẩm chưa có đánh giá." như cũ.
Không cần làm gì thêm.

### Bốn quy tắc, và lý do

**Chép đúng nguyên văn, giữ cả lỗi chính tả.** Khách viết "Vk ck mình mới sinh em bé" thì web
hiện đúng như vậy. Sửa cho đẹp là tự viết hộ khách, và người đọc nhận ra ngay — một mục đánh giá
mà câu nào cũng tròn trịa thì ai cũng đoán là shop tự gõ.

**Giữ nguyên tên bị che.** `n*****2` để nguyên. Không bịa tên đầy đủ.

**Không ghi mã đơn hàng.** Ảnh chụp từ trang quản lý người bán có mã đơn; đó là số giao dịch
của khách.

**Không xoá đánh giá chê.** Một lời chê thật giữa những lời khen làm cả mục đáng tin hơn hẳn.

### Hai điều web cố tình không làm

**Không khai báo số sao với Google.** Sao vẫn hiện cho khách xem, nhưng phần dữ liệu có cấu trúc
gửi Google thì không có `aggregateRating`. Google có quy định riêng về đánh giá lấy từ sàn khác;
khai báo vào có thể bị phạt cả website.

**Không hiện ảnh khách chụp.** Ảnh và video khách đính kèm không lấy được từ ảnh chụp màn hình.
Khi nào Shopee duyệt API thì mới có — đó là lý do đáng chờ, vì ảnh khách chụp thật bán hàng
tốt hơn mọi câu chữ.

### Nếu một file bị sai

Web không sập. File sai sẽ bị bỏ qua, sản phẩm đó hiện "chưa có đánh giá", và dòng cảnh báo
ghi vào log máy chủ. Các sản phẩm khác không ảnh hưởng.

## 6e. Web nói chuyện được với trợ lý AI

Ngày càng nhiều người hỏi ChatGPT, Gemini… thay vì tự tìm trên Google. Những trợ lý đó đọc web
bằng máy, không bằng mắt. Phần này làm cho chúng đọc đúng.

### Web đang cung cấp những gì

- **`ovianvietnam.com/llms.txt`** — toàn bộ shop trong một trang chữ: liên hệ, danh mục, **giá
  thật của từng sản phẩm**, các trang chính sách. Tự sinh ra từ Sapo nên không bao giờ lỗi thời.
- **Bản Markdown của mọi trang.** Trợ lý nào xin bản gọn thì nhận được bản chữ. Trang sản phẩm
  nặng 191 KB ở dạng web, còn bản chữ chỉ 5 KB — nhẹ hơn 98%. Khách dùng trình duyệt vẫn thấy
  web bình thường, không ảnh hưởng gì.
- **Thông tin doanh nghiệp dạng máy đọc** trên mọi trang: tên pháp nhân, địa chỉ, số điện thoại,
  link Facebook và TikTok. Nhờ vậy trợ lý trả lời "OVIAN ở đâu, gọi số nào" mà không đoán bừa.
- **Giá sản phẩm dạng máy đọc** ngay trên trang chủ, kèm đơn vị tiền và còn hàng hay hết.
- **Sơ đồ trang có ngày sửa thật** của từng sản phẩm, lấy từ Sapo. Máy tìm kiếm biết sản phẩm nào
  vừa đổi mà không phải quét lại cả web.

### Chủ shop cần làm gì

Không cần làm gì thường xuyên. Nhưng hai thứ này nếu có thì tốt hơn:

1. **Mã số thuế / số đăng ký hộ kinh doanh.** Hiện chưa có nên web bỏ trống — không bịa. Khi
   anh/chị đưa, nó sẽ vào cả chân trang lẫn phần máy đọc.
2. **Đường dẫn gian hàng Shopee và TikTok Shop.** Hiện mới có Facebook và TikTok. Thêm Shopee
   giúp trợ lý xác nhận shop trên sàn và web này là cùng một OVIAN.

### Những gì cố tình không làm

**Không đóng dấu ngày "hôm nay" cho mọi trang trong sơ đồ.** Các trang chính sách nằm trong mã
nguồn, không có ngày sửa thật. Khai ngày giả thì máy tìm kiếm quét lại cả web mỗi ngày vô ích,
và lần sau nó không tin nữa. Trang nào không biết ngày thì bỏ trống.

**Bản Markdown không cho lưu đệm (cache).** Web nằm sau CDN — nếu CDN lỡ lưu bản chữ rồi trả cho
khách thật thì khách thấy một đống chữ thô thay vì cửa hàng. Có bài test riêng kiểm tra trình
duyệt luôn nhận đúng bản web.

## 6f. Voucher ở trang thanh toán

Khách đến trang thanh toán là thấy ngay một thẻ ưu đãi, không cần biết mã, bấm một cái là áp dụng.

**Điều kiện hiện tại:** giảm **10%** giá trị đơn, **tối đa 12.000 đ**, đơn **từ 100.000 đ**.
Mã là `GIAM10` — khách không cần gõ, nhưng ai biết mã vẫn gõ được ở trang giỏ hàng.

### Thẻ hiện ba kiểu, tuỳ giỏ hàng

| Giỏ hàng | Khách thấy |
|---|---|
| Từ 100.000 đ | "Dùng ngay, bớt 11.200 đ" — bấm là áp dụng |
| Đã áp dụng | "Đã giảm 11.200 đ" kèm nút bỏ |
| Dưới 100.000 đ | "Mua thêm 44.000 đ nữa để dùng được ưu đãi này" |

Dòng cuối là cố ý: thay vì ẩn ưu đãi đi, web nói cho khách biết còn thiếu bao nhiêu.

### Cộng dồn với ưu đãi mua thêm

Có. Khách nhận ưu đãi mua thêm sẽ được **cả ba**: sản phẩm thêm giảm 40%, miễn phí giao hàng,
và 10% trên toàn đơn. Đây là quyết định của chủ shop ngày 2026-11-27.

Ví dụ thật: đơn 100.000 đ + mua thêm sản phẩm 200.000 đ
→ sản phẩm thêm còn 120.000 đ → tạm tính 220.000 đ
→ giảm 12.000 đ (10% bị chặn ở mức tối đa) → **miễn ship** → tổng **208.000 đ**.

### Đổi điều kiện hoặc tắt hẳn

- **Tắt ngay, không cần deploy:** thêm biến `HOUSE_VOUCHER_ENABLED=false` trong Hostinger.
  Thẻ biến mất, và mã `GIAM10` cũng hết hiệu lực luôn.
- **Đổi phần trăm / mức tối đa / đơn tối thiểu:** sửa trong `src/lib/checkout/voucher.ts`, cần
  deploy. Báo người làm web.

### Điều quan trọng về tiền

Số tiền giảm **luôn do máy chủ tính lại**, không lấy từ trình duyệt. Khách có sửa gì trong trình
duyệt cũng không giảm được nhiều hơn mức trên. Mã và số tiền giảm được ghi vào Google Sheet ở
hai cột **"Mã giảm giá"** và **"Giảm giá"** như mọi mã khác.

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
