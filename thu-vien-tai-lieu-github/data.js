// DỄ SỬA: Thay tên và mô tả website ở đây.
window.SITE_CONFIG = {
  name: "THƯ VIỆN TÀI LIỆU",
  description: "Tìm kiếm, đọc trực tuyến và tải về các tài liệu được chia sẻ miễn phí. Mọi thứ đều được sắp xếp để bạn dễ dàng khám phá."
};

// MUỐN THÊM TÀI LIỆU: Tải file lên thư mục tai-lieu, rồi thêm một mục vào danh sách bên dưới.
// Chú ý: mỗi mục trừ mục cuối cùng phải có dấu phẩy sau dấu }.
window.DOCUMENTS = [
  {
    title: "Hướng dẫn sử dụng thư viện tài liệu",
    description: "Tài liệu PDF mẫu hướng dẫn cách tìm kiếm, xem trực tuyến và tải về. Bạn có thể xóa file mẫu khi đưa tài liệu thật lên.",
    category: "Hướng dẫn",
    type: "PDF",
    file: "tai-lieu/huong-dan-mau.pdf",
    date: "2026-11-12",
    size: "PDF mẫu"
  }

  // VÍ DỤ CÁCH THÊM MỘT FILE MỚI (bỏ dấu // ở từng dòng để sử dụng):
  // ,{
  //   title: "Kiến thức Forex cơ bản",
  //   description: "Tài liệu dành cho người mới bắt đầu.",
  //   category: "Forex",
  //   type: "PDF",
  //   file: "tai-lieu/kien-thuc-forex.pdf",
  //   date: "2026-11-12",
  //   size: "2 MB"
  // }
];
