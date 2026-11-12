# WEBSITE THƯ VIỆN TÀI LIỆU - GITHUB PAGES

Mẫu website tiếng Việt có tìm kiếm không dấu, lọc danh mục, đọc PDF ngay trên web và tải về.
Không cần cài đặt phần mềm, server, cơ sở dữ liệu hay API key.

## 1. ĐĂNG LÊN GITHUB (KHOẢNG VÀI BƯỚC)

1. Truy cập https://github.com/new và đăng nhập.
2. Repository name: `thu-vien-tai-lieu` (hoặc tên bạn chọn).
3. Chọn **Public** rồi nhấn **Create repository**.
4. Trên máy tính, **giải nén file ZIP** đã nhận. Mở thư mục `github_thu_vien_tai_lieu`.
5. Trong repository, bấm **Add file > Upload files** (với repo mới, có thể bấm **uploading an existing file**).
6. Kéo thả **toàn bộ các mục BÊN TRONG** thư mục đã giải nén (bao gồm `index.html`, `data.js`, `.nojekyll`, `README.md` và thư mục `tai-lieu`) vào vùng upload. **Không** upload nguyên file ZIP.
7. Bấm **Commit changes** hoặc **Propose changes** theo giao diện GitHub.
8. Vào **Settings > Pages**.
9. Trong **Build and deployment**, chọn **Deploy from a branch**. Chọn branch **main**, folder **/(root)**, rồi **Save**.
10. Vào lại **Settings > Pages** và mở **Visit site** khi website được xuất bản. Link có dạng:
    `https://TEN-TAI-KHOAN.github.io/thu-vien-tai-lieu/`

**Quan trọng:** `index.html` phải nằm ngay ngoài cùng (root) của repository, không nằm lồng trong thư mục ZIP.

## 2. THÊM FILE PDF / WORD / EXCEL / POWERPOINT

1. Mở repository > chọn thư mục **tai-lieu**.
2. Chọn **Add file > Upload files**, thả tài liệu vào và bấm **Commit changes**.
3. Quay lại repository, mở `data.js`, bấm nút **Edit this file** (hình bút chì).
4. Trong danh sách `window.DOCUMENTS`, thêm một mục giống mẫu dưới đây. Nhớ đặt dấu phẩy ngăn cách các mục:

```js
{
  title: "Bài giảng tuần 1",
  description: "Nội dung chính của bài giảng.",
  category: "Bài giảng",
  type: "PDF",
  file: "tai-lieu/bai-giang-tuan-1.pdf",
  date: "2026-11-12",
  size: "1.5 MB"
}
```

5. Nhấn **Commit changes** để lưu.
6. Đợi phiên bản mới xuất bản và tải lại trang web.

Lưu ý: Đường dẫn `file` phải **trùng chính xác** với tên file trên GitHub, gồm cả chữ hoa/chữ thường và dấu cách nếu có. Nên dùng tên file không dấu, ví dụ `bai-giang-tuan-1.pdf`.

## 3. ĐỔI TÊN WEBSITE

Trong file `data.js`, sửa giá trị `name` và `description` trong `window.SITE_CONFIG`.

## 4. XÓA TÀI LIỆU MẪU

- Mở `data.js` và xóa mục "Hướng dẫn sử dụng thư viện tài liệu" khỏi `window.DOCUMENTS`.
- Có thể xóa `tai-lieu/huong-dan-mau.pdf` trên GitHub.

## 5. CÁCH XEM / TẢI

- PDF: nhấn **Đọc PDF** để xem trong cửa sổ nổi; có nút **Mở tab mới** nếu trình duyệt không hỗ trợ.
- File khác: nhấn **Xem tệp** để mở bằng khả năng mặc định của trình duyệt hoặc nhấn **Tải về**.
- Tìm kiếm hỗ trợ tiếng Việt **có dấu và không dấu**.
- Tài liệu trong repository Public đều công khai. Không đăng tài liệu riêng tư, thông tin mật hoặc nội dung bạn không có quyền chia sẻ.

## 6. LƯU Ý KỸ THUẬT

- GitHub Pages là website tĩnh. Không có giao diện quản trị tải file riêng: bạn thêm tài liệu bằng GitHub và cập nhật `data.js`.
- GitHub giới hạn tải file qua trình duyệt khoảng **25 MiB mỗi file**, tối đa **100 file mỗi lần**. Với file lớn cần phương án khác.
- Xem PDF phụ thuộc vào trình duyệt; có nút mở tab mới làm phương án thay thế.
- Website dùng đường dẫn tương đối nên hoạt động với cả `username.github.io/repository/` lẫn tên miền tùy chỉnh.

Tài liệu chính thức:
- https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site
- https://docs.github.com/en/repositories/working-with-files/managing-files/adding-a-file-to-a-repository
