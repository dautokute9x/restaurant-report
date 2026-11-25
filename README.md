# Restaurant Performance Report: bản website

Website tĩnh để phân tích và báo cáo kết quả kinh doanh nhà hàng từ báo cáo POS: Dish Sales, Order Type, Time Sales và Promotion.

Website không cần máy chủ hay cơ sở dữ liệu. Mọi file POS được đọc và xử lý ngay trong trình duyệt của bạn, không gửi lên đâu cả.

## Thư mục gồm

| File | Vai trò |
|---|---|
| `index.html` | Toàn bộ ứng dụng: giao diện, engine tính toán, dữ liệu mẫu |
| `vendor/exceljs.min.js` | Đọc file .xlsx và xuất Excel |

Giữ nguyên cấu trúc thư mục khi đưa lên hosting. `index.html` phải nằm cùng chỗ với thư mục `vendor/`.

## Cách chạy

**Chạy ngay trên máy:** giải nén, rồi mở `index.html` bằng Chrome hoặc Edge. Cách này không cần mạng, chỉ thiếu font Quicksand nếu máy đang offline.

**Đưa lên mạng (miễn phí), chọn 1 trong các cách:**

1. **Netlify Drop:** vào app.netlify.com/drop, kéo cả thư mục đã giải nén vào. Netlify trả về ngay một link dạng `ten-ngau-nhien.netlify.app`, đổi tên được trong Site settings.
2. **Cloudflare Pages:** dash.cloudflare.com → Workers & Pages → Create → Pages → Upload assets → kéo thư mục vào.
3. **GitHub Pages:** tạo repository mới, upload các file, rồi vào Settings → Pages → Deploy from branch `main` / root.
4. **Server công ty** (IIS, Nginx, Apache): chép thư mục vào thư mục web. Không cần cấu hình gì thêm.

**Gắn tên miền riêng:** cả ba dịch vụ trên đều cho trỏ tên miền riêng (ví dụ `baocao.tennhahang.vn`) trong phần Domain settings.

## Dữ liệu được lưu ở đâu

Mọi thứ được lưu trong trình duyệt bạn đang dùng (IndexedDB và localStorage), gồm:

- file POS đã thả vào;
- bảng giá, giá vốn, hoa hồng app, kế hoạch;
- nhật ký sự kiện và kế hoạch hành động.

Hệ quả là:

- **Mở lại website trên cùng máy, cùng trình duyệt:** dữ liệu vẫn còn.
- **Đổi máy, đổi trình duyệt, hoặc xóa dữ liệu duyệt web:** phải thả lại file POS. Bảng giá thì nhập lại bằng file Excel đã lưu.
- **Người khác mở cùng link:** họ chỉ thấy dữ liệu mẫu, không thấy dữ liệu của bạn.

Website có thẻ `noindex` để Google không đưa vào kết quả tìm kiếm. Nếu muốn khóa hẳn bằng mật khẩu, dùng Cloudflare Access (miễn phí cho dưới 50 người) hoặc tính năng Password protection của Netlify (gói trả phí).

## Quy trình hằng tháng

1. Xuất 4 báo cáo từ POS cho kỳ hiện tại và kỳ so sánh (tháng trước hoặc cùng kỳ năm trước).
2. Mở website → bước **1 Dữ liệu** → thả file vào đúng ô từng kỳ. Kiểm tra các dấu ✓ đối chiếu.
3. Lần đầu dùng: bấm **Tải file mẫu giá và giá vốn**, sửa giá niêm yết và điền giá vốn, rồi **Nhập file giá và giá vốn**. Nhập luôn % hoa hồng app, số ghế và kế hoạch.
4. Bấm **Phân tích →**, đọc lần lượt Level 01, 02, 03, Menu và Scorecard.
5. Sang bước **3 Báo cáo**: sửa kế hoạch hành động. Sau đó bấm **Copy tóm tắt** để gửi Zalo, hoặc **In / Xuất PDF** (trong hộp thoại in chọn "Lưu dưới dạng PDF"), **Xuất Excel**.

## Claude viết nhận xét (tùy chọn)

Ở bước 1, mục "Claude viết nhận xét", dán khóa API Anthropic (lấy tại console.anthropic.com) để bật nút **Viết lại nhận xét bằng Claude** và ô hỏi đáp.

- Khóa chỉ lưu trong trình duyệt của bạn.
- Mỗi lần bấm, website gửi bản tóm tắt số liệu (không phải file POS gốc) tới api.anthropic.com. Chi phí tính theo tài khoản API của bạn.
- Không lưu khóa trên máy dùng chung.

Không có khóa thì các nút này được ẩn, mọi tính năng khác vẫn chạy bình thường.

## Ghi chú về số liệu

- Mọi số tiền là **doanh thu thuần chưa VAT**. Trong báo cáo POS, Gross Sales là doanh thu đã gồm VAT, không phải doanh thu trước giảm giá.
- Khi chưa có bảng giá niêm yết, **tiền giảm giá chỉ là số ước tính**: lấy giá bán phổ biến nhất của mỗi món trên từng kênh làm giá niêm yết, vì app (ShopeeFood, Grab...) có bảng giá riêng cao hơn tại quầy. File giá chỉ cần giá menu tại quầy.
- Các dòng bao bì, phí giao và món thêm (TA Packaging, Packaging, Delivery Fee, Add sauce, Add Topping) không tính vào số món/bill và ma trận menu, nhưng vẫn tính doanh thu và giá vốn. Danh sách này sửa được ở bước 1.
- Kênh bán được tách theo cột Order Category của Dish Sales, nên Xanh Ngon tách riêng khỏi "Take Away - Customer".
- Level 03 tách riêng hiệu ứng **ngày cuối tuần**: T7–CN bán gấp 2–3 lần ngày thường, nên kỳ có thêm một ngày cuối tuần không được tính là năng suất tăng.
- Ở mỗi level, các hiệu ứng cộng lại đúng bằng chênh lệch tổng. Website tự kiểm tra và báo ở mục "Lưu ý về dữ liệu".
