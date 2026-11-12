// DỄ SỬA: Thay tên và mô tả website ở đây.
window.SITE_CONFIG = {
  name: "NGHỀ TRADER | THƯ VIỆN GIAO DỊCH",
  description: "Khám phá kiến thức giao dịch qua video, tài liệu và những mô hình nến quan trọng. Học có phương pháp, giao dịch có kỷ luật."
};

// MUỐN THÊM TÀI LIỆU: Tải file lên thư mục tai-lieu, rồi thêm một mục vào danh sách bên dưới.
// Chú ý: mỗi mục trừ mục cuối cùng phải có dấu phẩy sau dấu }.
window.DOCUMENTS = [
  {
    title: "Tự học hay có người hướng dẫn?",
    description: "So sánh trải nghiệm tự học và có người hướng dẫn trong quá trình tiếp cận kiến thức giao dịch.",
    category: "Video kiến thức",
    cover: "assets/tu-hoc-co-thay-kem.svg",
    type: "MP4",
    file: "tai-lieu/tu-hoc-vs-co-thay-kem.mp4",
    date: "2026-11-12",
    size: "12,6 MB"
  },
  {
    title: "Ảnh chụp kết quả và PassView: Khác biệt về minh bạch",
    description: "Tìm hiểu sự khác nhau giữa ảnh chụp và quyền xem thông tin tài khoản qua PassView.",
    category: "Video kiến thức",
    cover: "assets/passview-minh-bach.svg",
    type: "MP4",
    file: "tai-lieu/anh-chup-vs-passview-nguoi-that.mp4",
    date: "2026-11-12",
    size: "11 MB"
  },
  {
    title: "Giao dịch theo trí nhớ hay theo hệ thống?",
    description: "Ví dụ so sánh việc tìm đường bằng trí nhớ và Google Maps để nói về phương pháp giao dịch.",
    category: "Video kiến thức",
    cover: "assets/google-maps-giao-dich.svg",
    type: "MP4",
    file: "tai-lieu/lai-xe-theo-tri-nho-vs-google-maps.mp4",
    date: "2026-11-12",
    size: "7,9 MB"
  },
  {
    title: "TradePro Bot AI – Giới thiệu hệ thống",
    description: "Video giới thiệu công cụ giao dịch tự động và cách tiếp cận quản trị rủi ro.",
    category: "Video kiến thức",
    cover: "assets/tradepro-bot-ai.svg",
    type: "MP4",
    file: "tai-lieu/tradepro-bot-ai.mp4",
    date: "2026-11-12",
    size: "14,6 MB"
  },
  {
    title: "Bot truyền thống và Bot AI – Điểm khác biệt",
    description: "So sánh hai hướng tiếp cận tự động hóa giao dịch và các điểm cần lưu ý.",
    category: "Video kiến thức",
    cover: "assets/bot-cu-va-bot-ai.svg",
    type: "MP4",
    file: "tai-lieu/tradepro-bot-cu-vs-bot-ai.mp4",
    date: "2026-11-12",
    size: "6,2 MB"
  },
  {
    title: "TradePro Recap – Tổng hợp hoạt động",
    description: "Video recap tổng hợp hoạt động và những khoảnh khắc của TradePro.",
    category: "Recap",
    cover: "assets/recap-tradepro.svg",
    type: "MP4",
    file: "tai-lieu/recap-tradepro.mp4",
    date: "2026-11-12",
    size: "14,8 MB"
  },

  {
    title: "Nến Búa (Hammer) – Nhận diện mô hình",
    description: "Tìm hiểu mô hình nến búa trong phân tích hành động giá.",
    category: "Video kiến thức",
    cover: "assets/nen-bua.svg",
    type: "MP4",
    file: "tai-lieu/NgheTrader_NenBua.mp4",
    date: "2026-11-12",
    size: "3,7 MB"
  },
  {
    title: "Nến Nhấn Chìm Tăng – Bullish Engulfing",
    description: "Video kiến thức về mô hình nến nhấn chìm tăng và cách quan sát tín hiệu giá.",
    category: "Video kiến thức",
    cover: "assets/nhan-chim-tang.svg",
    type: "MP4",
    file: "tai-lieu/NgheTrader_NhanChimTang.mp4",
    date: "2026-11-12",
    size: "3,9 MB"
  },
  {
    title: "Nến Sao Băng (Shooting Star)",
    description: "Tìm hiểu đặc điểm của mô hình nến sao băng trong phân tích kỹ thuật.",
    category: "Video kiến thức",
    cover: "assets/sao-bang.svg",
    type: "MP4",
    file: "tai-lieu/NgheTrader_SaoBang.mp4",
    date: "2026-11-12",
    size: "4,7 MB"
  },
  {
    title: "Video kiến thức giao dịch – Thuyết minh tiếng Việt",
    description: "Video chia sẻ kiến thức giao dịch bằng tiếng Việt.",
    category: "Video kiến thức",
    cover: "assets/video-thuyet-minh.svg",
    type: "MP4",
    file: "tai-lieu/out_vi_giong_sub.mp4",
    date: "2026-11-12",
    size: "5,5 MB"
  },
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
