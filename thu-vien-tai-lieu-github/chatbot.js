/*!
 * Trợ lý Nghề Trader — chatbot tự động + giọng nói (nghe & đọc tiếng Việt)
 * Giọng đọc: file tạo sẵn bằng VieNeu-TTS (giọng Kim Thanh, nữ miền Nam) trong assets/voice/, thiếu file thì dùng giọng trình duyệt.
 * Chạy hoàn toàn trên trình duyệt, không cần máy chủ.
 * Muốn nối với AI thật sau này: đặt window.NT_CHATBOT_CONFIG = { aiEndpoint: "https://..." }
 * trước khi nạp file này. Endpoint nhận POST {message, history} và trả về {reply}.
 */
(function () {
  'use strict';
  if (window.__ntChatbot) return; window.__ntChatbot = true;

  var CFG = Object.assign({
    zalo: 'https://zalo.me/g/pflrrz190',
    phone: '0905890399',
    phoneLabel: '0905 890 399',
    email: 'support@giaiphapgiaodich.com',
    website: 'https://giaiphapgiaodich.com/',
    home: './',
    aiEndpoint: ''
  }, window.NT_CHATBOT_CONFIG || {});
  if (window.SITE_CONFIG && window.SITE_CONFIG.zalo) CFG.zalo = window.SITE_CONFIG.zalo;

  var LOGO = 'assets/logo-nghe-trader.webp';
  var UA = navigator.userAgent || '';
  var INAPP = /Zalo|FBAN|FBAV|FB_IAB|FBIOS|Instagram|musical_ly|TikTok|Bytedance|BytedanceWebview|Line\//i.test(UA);
  var IOS = /iPhone|iPad|iPod/i.test(UA);
  var INAPP_MSG = 'Anh/chị đang mở trang **bên trong ứng dụng** (Zalo, Facebook hoặc TikTok). Các ứng dụng này thường **chặn micro**, nên em không nghe được.\nAnh/chị bấm dấu **⋯** ở góc trên, chọn **Mở bằng trình duyệt** (Chrome hoặc Safari), rồi thử lại nhé. Anh/chị vẫn có thể gõ câu hỏi ở đây.';
  var NOTE = 'Nội dung mang tính giáo dục, không phải khuyến nghị đầu tư. Giao dịch có rủi ro.';
  var ZALO = '[Nhóm Zalo hỗ trợ](' + CFG.zalo + ')';
  var CALL = '[gọi ' + CFG.phoneLabel + '](tel:' + CFG.phone + ')';

  /* ------------------------------------------------------------------ */
  /*  KIẾN THỨC                                                          */
  /*  keys: cụm từ KHÔNG DẤU. Có thể ghi [cụm, trọng số].                */
  /* ------------------------------------------------------------------ */
  var KB = [
    { id: 'bot_identity', keys: ['ban la ai', 'em la ai', 'nguoi that', 'may hay nguoi', 'chatbot', 'tro ly ao', 'robot tra loi'],
      a: 'Dạ, em là **trợ lý ảo** của Nghề Trader, được đội ngũ huấn luyện để tư vấn nhanh cho anh/chị bất cứ lúc nào.\nCần trao đổi sâu hơn với chuyên viên thì anh/chị nhắn ' + ZALO + ' hoặc ' + CALL + ', bên em hỗ trợ ngay. Còn bây giờ, anh/chị đang quan tâm điều gì để em tư vấn ạ?',
      follow: ['Lớp học TradePro là gì?', 'Liên hệ tư vấn'] },

    { id: 'human', keys: ['gap nguoi', 'nhan vien', 'noi chuyen voi nguoi', 'admin', 'tu van vien', 'nguoi tu van', 'gap tu van'],
      a: 'Dạ, để nói chuyện với người tư vấn, anh/chị chọn một cách:\n- Vào ' + ZALO + ' và nhắn tin.\n- Hoặc ' + CALL + '.\n- Hoặc gửi email [' + CFG.email + '](mailto:' + CFG.email + ').',
      follow: ['Xem thử miễn phí', 'Lớp học TradePro là gì?'] },

    { id: 'price', keys: ['gia', 'hoc phi', 'chi phi', 'bao nhieu tien', 'phi', 'bao nhieu', 'dang ky', 'cach dang ky', 'tham gia', 'mua', 'thanh toan', 'lich hoc', 'khai giang'],
      a: 'Dạ, học phí và chi phí sẽ **tùy chương trình** anh/chị chọn: lớp học, Bot AI hay kết hợp. Để báo **đúng và có ưu đãi phù hợp nhất**, chuyên viên bên em sẽ tư vấn trực tiếp qua ' + ZALO + ' hoặc anh/chị ' + CALL + '.\nCho em hỏi nhanh: anh/chị đã từng giao dịch chưa, hay mới bắt đầu tìm hiểu ạ? Em gợi ý luôn chương trình hợp với anh/chị.',
      follow: ['Xem thử miễn phí', 'Lớp học TradePro là gì?'] },

    { id: 'profit', keys: ['loi nhuan', 'co loi', 'co lai', 'cam ket', 'bao loi', 'an toan khong', 'lua dao', 'co mat tien', 'mat tien', 'lai bao nhieu', 'thu nhap', 'kiem duoc', 'kiem tien', 'giau', 'uy tin', ['rui ro', 1]],
      a: 'Em nói thẳng để anh/chị yên tâm: **không ai có thể cam kết lợi nhuận** trong giao dịch, kể cả Nghề Trader. Giao dịch có rủi ro và anh/chị có thể mất tiền.\nĐiều anh/chị nên làm là **tự kiểm chứng**:\n- Xem thử các video miễn phí trước khi tham gia.\n- Hỏi về **PassView**: công cụ chỉ cho xem tài khoản thật, minh bạch hơn ảnh chụp kết quả.\n- Hỏi kỹ đội ngũ trong ' + ZALO + ' trước khi quyết định.\n' + NOTE,
      follow: ['PassView là gì?', 'Quản trị rủi ro', 'Xem thử miễn phí'] },

    { id: 'trust', keys: [['co that khong', 4], ['that khong', 3], ['lua', 3], ['uy tin khong', 4], ['tin duoc khong', 4], ['kiem chung', 3], ['that hay gia', 4]],
      a: 'Dạ anh/chị cẩn thận là rất đúng, thị trường này có nhiều nơi không minh bạch. Bên em không muốn anh/chị tin bằng lời, mà **tự kiểm chứng**: xem tài khoản thật qua **PassView**, xem thử video miễn phí, vào ' + ZALO + ' xem cộng đồng, hoặc gặp trực tiếp tại TMLabs Coffee.\nAnh/chị muốn kiểm chứng theo cách nào trước ạ?',
      follow: ['PassView là gì?', 'Xem thử miễn phí', 'Liên hệ tư vấn'] },

    { id: 'class', keys: ['lop hoc', 'lop tradepro', 'lop hoc tradepro', 'khoa hoc', 'hoc trade', 'hoc giao dich', 'dao tao', 'muon hoc', 'hoc o dau', 'giao trinh', 'lo trinh'],
      a: '**Lớp học TradePro** là lớp học giao dịch của Nghề Trader. Anh/chị học kiến thức **có hệ thống**, có **người hướng dẫn**, và được hỗ trợ trong nhóm Zalo trong suốt quá trình học.\nĐiểm khác với tự học: có người chỉ ra lỗi sai sớm, đi theo lộ trình thay vì học lan man.\nHọc phí và lịch học: anh/chị hỏi trực tiếp qua ' + ZALO + ' nhé.',
      video: 'tu-hoc-vs-co-thay-kem.mp4',
      follow: ['Tự học hay có thầy?', 'Xem thử miễn phí', 'Học phí bao nhiêu?'] },

    { id: 'self_vs_mentor', keys: ['tu hoc', 'co thay', 'nguoi huong dan', 'thay kem', 'tu mo mam'],
      a: 'Tự học thì **tiết kiệm**, nhưng dễ học lan man, tốn thời gian thử sai và tự rút kinh nghiệm bằng tiền thật.\nCó **người hướng dẫn** thì đi theo lộ trình, có người sửa lỗi sớm và giữ kỷ luật. Giống học lái xe: tự tập được, nhưng có thầy kèm thì vững nhanh hơn.\nCách nào cũng cần anh/chị kiên trì và quản trị rủi ro.',
      video: 'tu-hoc-vs-co-thay-kem.mp4',
      follow: ['Lớp học TradePro là gì?', 'Người mới bắt đầu học gì?'] },

    { id: 'bot_compare', keys: [['bot cu', 4], ['bot truyen thong', 4], ['so sanh bot', 4], ['khac bot', 3]],
      a: 'Bot giao dịch truyền thống thường chạy theo **luật cố định** (ví dụ: đường trung bình cắt nhau thì vào lệnh), nên dễ “đứng hình” khi thị trường đổi trạng thái.\n**Bot AI** hướng tới việc phân tích nhiều yếu tố hơn để thích nghi với thị trường.\nDù là bot nào, vẫn **có rủi ro** và cần quản trị vốn. Video dưới đây so sánh chi tiết.',
      video: 'tradepro-bot-cu-vs-bot-ai.mp4',
      follow: ['Bot AI TradePro là gì?', 'Bot có cam kết lợi nhuận không?'] },

    { id: 'bot_ai', keys: ['bot ai', 'bot', 'robot', 'giao dich tu dong', 'tu dong', 'ea', 'auto trade', 'bot tradepro', 'bot ai tradepro'],
      a: '**Bot AI TradePro** là công cụ **giao dịch tự động** ứng dụng AI. Thay vì ngồi canh màn hình và vào lệnh bằng cảm xúc, hệ thống thực hiện theo phương pháp đã định sẵn, giúp giữ kỷ luật.\nLưu ý: bot **không loại bỏ rủi ro** và không ai cam kết lợi nhuận. Muốn biết điều kiện sử dụng, anh/chị hỏi qua ' + ZALO + '.',
      video: 'tradepro-bot-ai.mp4',
      follow: ['Bot cũ khác Bot AI thế nào?', 'PassView là gì?', 'Bot có cam kết lợi nhuận không?'] },

    { id: 'passview', keys: ['passview', 'pass view', 'path view', 'pathview', 'xem tai khoan', 'minh bach', 'tai khoan that', 'anh chup ket qua', 'anh chup', 'theo doi tai khoan'],
      a: '**PassView** là công cụ **chỉ cho xem** (view-only) thông tin tài khoản giao dịch. Người xem thấy lệnh và kết quả thật, nhưng **không thể đặt hay sửa lệnh**.\nVì sao quan trọng? Ảnh chụp kết quả thì dễ cắt ghép, còn PassView cho anh/chị **tự xem tài khoản thật**, minh bạch hơn.',
      video: 'anh-chup-vs-passview-nguoi-that.mp4',
      follow: ['Bot AI TradePro là gì?', 'Xem thử miễn phí'] },

    { id: 'trial', keys: ['xem thu', 'dung thu', 'thu truoc', 'mien phi', 'free', 'trial', 'truoc khi tham gia', 'xem truoc'],
      a: 'Dạ có! Anh/chị có thể **xem thử trước khi tham gia**:\n- Toàn bộ video trong [thư viện](' + CFG.home + '#thu-vien) đều **xem miễn phí**.\n- Hỏi thêm trong ' + ZALO + ' để biết cách xem trước các sản phẩm.',
      follow: ['Mô hình nến cơ bản', 'Lớp học TradePro là gì?'] },

    { id: 'zalo', keys: ['zalo', 'nhom', 'cong dong', 'group', 'hoi dap'],
      a: 'Nghề Trader có **nhóm Zalo cộng đồng** để hỗ trợ học viên, cập nhật tin tức thị trường và giải đáp thắc mắc.\nBấm vào đây để tham gia: ' + ZALO + '.',
      follow: ['Tin tức thị trường', 'Báo cáo kết quả'] },

    { id: 'reports', keys: ['bao cao', 'ket qua tuan', 'ket qua thang', 'report', 'tong ket'],
      a: 'Nghề Trader gửi **báo cáo kết quả theo tuần và theo tháng** cho cộng đồng. Anh/chị theo dõi trong ' + ZALO + '.\nKết quả quá khứ không đảm bảo cho tương lai. Muốn kiểm chứng, anh/chị hỏi về **PassView**.',
      follow: ['PassView là gì?', 'Tin tức thị trường'] },

    { id: 'news', keys: ['tin tuc', 'cap nhat thi truong', 'nhan dinh', 'ban tin', 'thi truong hom nay', 'tin hom nay'],
      a: 'Tin tức và cập nhật thị trường được gửi **hằng ngày** trong ' + ZALO + ', anh/chị vào là theo dõi được ngay.\nBên em không hô mua bán theo kiểu phím lệnh, mà giúp anh/chị **hiểu thị trường và tự ra quyết định có kỷ luật**. Anh/chị đang giao dịch vàng hay Forex ạ?',
      follow: ['Báo cáo kết quả', 'Liên hệ tư vấn'] },

    { id: 'contact', keys: ['lien he', 'so dien thoai', 'sdt', 'hotline', 'goi dien', 'email', 'dia chi', 'van phong', 'tu van', 'gap truc tiep', ['o dau', 1]],
      a: 'Anh/chị liên hệ Nghề Trader qua:\n- Điện thoại: ' + CALL + '\n- Email: [' + CFG.email + '](mailto:' + CFG.email + ')\n- ' + ZALO + '\n- Website: [giaiphapgiaodich.com](' + CFG.website + ')\n- Địa điểm: TMLabs Coffee, 84A Nguyễn Cửu Vân, Phường Gia Định, TP. Hồ Chí Minh.',
      follow: ['Học phí bao nhiêu?', 'Xem thử miễn phí'] },

    { id: 'about', keys: [['nghe trader', 3], 've nghe trader', 'gioi thieu', 'ben em', 'ben ban', 'cong ty', 'thuong hieu'],
      a: '**Nghề Trader** là thương hiệu giáo dục giao dịch. Bên em có:\n- **Lớp học TradePro**: học có lộ trình, có người hướng dẫn.\n- **Bot AI TradePro**: công cụ giao dịch tự động.\n- **PassView**: xem tài khoản thật, minh bạch.\n- Nhóm Zalo hỗ trợ, tin tức hằng ngày, báo cáo tuần và tháng.\n- Thư viện video kiến thức **xem miễn phí**.',
      follow: ['Lớp học TradePro là gì?', 'Bot AI TradePro là gì?', 'PassView là gì?'] },

    { id: 'method', keys: ['tri nho', 'he thong', 'phuong phap', 'google maps', 'ky luat', 'cam xuc'],
      a: 'Giao dịch theo **trí nhớ và cảm xúc** giống lái xe theo trí nhớ: lúc đúng lúc sai, khó lặp lại.\nGiao dịch theo **hệ thống** giống dùng Google Maps: có quy tắc rõ ràng khi nào vào lệnh, khi nào thoát, rủi ro bao nhiêu. Nhờ vậy anh/chị kỷ luật hơn và dễ rút kinh nghiệm.',
      video: 'lai-xe-theo-tri-nho-vs-google-maps.mp4',
      follow: ['Quản trị rủi ro', 'Lớp học TradePro là gì?'] },

    { id: 'risk', keys: ['quan tri rui ro', 'quan ly von', 'cat lo', 'stop loss', 'sl', 'tp', 'chot loi', 'von bao nhieu', 'von it', 'don bay', 'chay tai khoan'],
      a: '**Quản trị rủi ro** là phần quan trọng nhất. Vài nguyên tắc nhiều người áp dụng:\n- Chỉ dùng tiền **có thể chấp nhận mất**.\n- Luôn đặt **cắt lỗ (stop loss)** trước khi vào lệnh.\n- Giới hạn rủi ro mỗi lệnh ở một phần nhỏ tài khoản (nhiều người chọn khoảng 1–2%).\n- Cẩn thận với **đòn bẩy**: lời nhanh thì lỗ cũng nhanh.\n' + NOTE,
      follow: ['Người mới bắt đầu học gì?', 'Bot AI TradePro là gì?'] },

    { id: 'forex', keys: ['forex', 'ngoai hoi', 'fx', 'cap tien', 'eurusd', 'eur usd', 'vang', 'xau', 'xauusd', 'gold', 'trade la gi', 'giao dich la gi'],
      a: '**Forex** là thị trường ngoại hối, nơi người ta mua bán **các cặp tiền tệ** như EUR/USD. Nhiều sàn còn cho giao dịch **vàng** (XAU/USD).\nGiá lên xuống liên tục theo cung cầu và tin tức. Giao dịch thường dùng **đòn bẩy**, nên lợi nhuận và rủi ro đều lớn. Người mới nên học nền tảng và quản trị rủi ro trước.',
      follow: ['Mô hình nến cơ bản', 'Quản trị rủi ro', 'Người mới bắt đầu học gì?'] },

    { id: 'beginner', keys: ['nguoi moi', 'bat dau', 'moi hoc', 'chua biet gi', 'hoc tu dau', 'newbie', 'moi vao'],
      a: 'Người mới có thể đi theo thứ tự này:\n- **Bước 1**: hiểu cây nến (giá mở, đóng, cao, thấp).\n- **Bước 2**: học các mô hình nến cơ bản (nến búa, sao băng, nhấn chìm…).\n- **Bước 3**: học **quản trị rủi ro** trước khi dùng tiền thật.\n- **Bước 4**: luyện trên tài khoản demo, giao dịch theo hệ thống.\nThư viện video của Nghề Trader có sẵn các bài này, [xem miễn phí](' + CFG.home + '#thu-vien).',
      follow: ['Cây nến là gì?', 'Quản trị rủi ro', 'Lớp học TradePro là gì?'] },

    { id: 'videos', keys: [['video', 2], 'thu vien', 'tai lieu', 'bai hoc', 'xem o dau'],
      a: 'Tất cả video bài học nằm trong [thư viện](' + CFG.home + '#thu-vien), xem miễn phí. Có các nhóm: mô hình nến, so sánh và hiểu về sản phẩm, kiến thức giao dịch.\nAnh/chị muốn tìm hiểu chủ đề nào? Em gợi ý video phù hợp.',
      follow: ['Mô hình nến cơ bản', 'Bot AI TradePro là gì?', 'PassView là gì?'] },

    /* ---------- Kiến thức nến ---------- */
    { id: 'candle_basic', keys: ['nen la gi', 'cay nen', 'bieu do nen', 'than nen', 'bong nen', 'rau nen', 'candlestick', 'nen nhat', 'doc nen'],
      a: 'Mỗi **cây nến** thể hiện giá trong một khung thời gian (ví dụ 1 giờ):\n- **Thân nến**: từ giá mở cửa đến giá đóng cửa. Nến tăng: đóng cao hơn mở. Nến giảm: đóng thấp hơn mở.\n- **Bóng (râu) nến**: cho biết giá cao nhất và thấp nhất đã chạm tới.\nNhìn thân và bóng, anh/chị biết bên mua hay bên bán đang mạnh hơn.',
      follow: ['Mô hình nến cơ bản', 'Nến búa là gì?', 'Doji là gì?'] },

    { id: 'candle_list', keys: ['mo hinh nen', 'cac mo hinh', 'mau nen', 'tin hieu nen', 'nen dao chieu'],
      a: 'Các mô hình nến có trong thư viện:\n- 1 nến: **nến búa**, **búa ngược**, **người treo cổ**, **sao băng**, **Doji**.\n- 2 nến: **nhấn chìm tăng**, **nhấn chìm giảm**.\n- 3 nến: **sao mai**, **sao hôm**.\nAnh/chị hỏi tên mô hình nào, em giải thích và gợi ý video.\nLưu ý: mô hình nến cần xem trong **bối cảnh xu hướng** và chờ **xác nhận**, không nên vào lệnh chỉ vì một cây nến.',
      follow: ['Nến búa là gì?', 'Sao băng là gì?', 'Nhấn chìm tăng là gì?'] },

    { id: 'inv_hammer', keys: [['bua nguoc', 5], 'inverted hammer'],
      a: '**Nến búa ngược**: thân nhỏ nằm ở **phía dưới**, **bóng trên dài**, bóng dưới rất ngắn. Thường được chú ý khi xuất hiện **sau một đợt giảm**.\nÝ nghĩa: bên mua đã thử đẩy giá lên, báo hiệu lực bán có thể đang yếu đi. Cần **nến xác nhận** tăng phía sau.',
      video: 'NgheTrader_BuaNguoc.mp4', follow: ['Nến búa là gì?', 'Sao băng là gì?'] },

    { id: 'hammer', keys: ['nen bua', 'bua', 'hammer', 'cay bua'],
      a: '**Nến búa (Hammer)**: thân nhỏ nằm ở **phía trên**, **bóng dưới dài** (thường gấp 2 lần thân trở lên), gần như không có bóng trên. Thường được chú ý **sau một đợt giảm**.\nÝ nghĩa: giá từng bị bán mạnh xuống nhưng bên mua kéo lên lại, gợi ý khả năng **đảo chiều tăng**. Nên chờ **nến xác nhận** trước khi đánh giá.',
      video: 'NgheTrader_NenBua.mp4', follow: ['Người treo cổ là gì?', 'Búa ngược là gì?'] },

    { id: 'hanging', keys: ['nguoi treo co', 'treo co', 'hanging man'],
      a: '**Người treo cổ (Hanging Man)** có hình dạng **giống nến búa** (thân nhỏ ở trên, bóng dưới dài), nhưng xuất hiện **ở vùng giá tăng / gần đỉnh**.\nÝ nghĩa: cảnh báo đà tăng có thể **suy yếu**. Cần nến giảm xác nhận phía sau.',
      video: 'NgheTrader_NguoiTreoCo.mp4', follow: ['Nến búa là gì?', 'Sao băng là gì?'] },

    { id: 'shooting', keys: ['sao bang', 'shooting star'],
      a: '**Sao băng (Shooting Star)**: thân nhỏ ở **phía dưới**, **bóng trên dài**, xuất hiện **sau một đợt tăng**.\nÝ nghĩa: giá từng được đẩy lên cao nhưng bị bán xuống lại, cảnh báo khả năng **đảo chiều giảm**. Hình dạng giống búa ngược, chỉ khác **vị trí** trong xu hướng.',
      video: 'NgheTrader_SaoBang.mp4', follow: ['Búa ngược là gì?', 'Sao hôm là gì?'] },

    { id: 'doji', keys: ['doji', 'do ji'],
      a: '**Doji**: giá mở cửa và đóng cửa **gần như bằng nhau**, nên thân nến rất mỏng như dấu cộng.\nÝ nghĩa: bên mua và bên bán đang **cân bằng, do dự**. Bản thân Doji không nói tăng hay giảm, mà phải xem **bối cảnh xu hướng** và cây nến tiếp theo.',
      video: 'NgheTrader_Doji.mp4', follow: ['Sao mai là gì?', 'Mô hình nến cơ bản'] },

    { id: 'engulf_up', keys: [['nhan chim tang', 5], 'bullish engulfing'],
      a: '**Nhấn chìm tăng (Bullish Engulfing)** gồm 2 nến, thường xuất hiện **sau đợt giảm**:\n- Nến 1: nến giảm.\n- Nến 2: nến tăng có **thân bao trùm toàn bộ thân** nến 1.\nÝ nghĩa: bên mua giành lại thế chủ động, gợi ý khả năng **đảo chiều tăng**.',
      video: 'NgheTrader_NhanChimTang.mp4', follow: ['Nhấn chìm giảm là gì?', 'Sao mai là gì?'] },

    { id: 'engulf_down', keys: [['nhan chim giam', 5], 'bearish engulfing'],
      a: '**Nhấn chìm giảm (Bearish Engulfing)** gồm 2 nến, thường xuất hiện **sau đợt tăng**:\n- Nến 1: nến tăng.\n- Nến 2: nến giảm có **thân bao trùm toàn bộ thân** nến 1.\nÝ nghĩa: bên bán áp đảo, cảnh báo khả năng **đảo chiều giảm**.',
      video: 'NgheTrader_NhanChimGiam.mp4', follow: ['Nhấn chìm tăng là gì?', 'Sao hôm là gì?'] },

    { id: 'engulf', keys: ['nhan chim', 'engulfing'],
      a: 'Mô hình **nhấn chìm** gồm 2 nến: nến sau có **thân bao trùm hoàn toàn** thân nến trước và ngược màu.\n- **Nhấn chìm tăng**: sau đợt giảm, nến tăng nuốt nến giảm, gợi ý đảo chiều tăng.\n- **Nhấn chìm giảm**: sau đợt tăng, nến giảm nuốt nến tăng, cảnh báo đảo chiều giảm.',
      follow: ['Nhấn chìm tăng là gì?', 'Nhấn chìm giảm là gì?'] },

    { id: 'morning', keys: [['sao mai', 5], 'morning star'],
      a: '**Sao Mai (Morning Star)** gồm 3 nến, xuất hiện **sau đợt giảm**:\n- Nến 1: nến giảm dài.\n- Nến 2: nến thân nhỏ (do dự).\n- Nến 3: nến tăng mạnh, đóng cửa vượt quá nửa thân nến 1.\nÝ nghĩa: đà giảm chững lại và bên mua quay lại, gợi ý khả năng **hồi phục**.',
      video: 'NgheTrader_SaoMai.mp4', follow: ['Sao hôm là gì?', 'Doji là gì?'] },

    { id: 'evening', keys: [['sao hom', 5], 'evening star'],
      a: '**Sao Hôm (Evening Star)** là ngược lại của Sao Mai, gồm 3 nến, xuất hiện **sau đợt tăng**:\n- Nến 1: nến tăng dài.\n- Nến 2: nến thân nhỏ (do dự).\n- Nến 3: nến giảm mạnh, đóng cửa sâu vào thân nến 1.\nÝ nghĩa: đà tăng **suy yếu**, cảnh báo khả năng đảo chiều giảm.',
      video: 'NgheTrader_SaoHom.mp4', follow: ['Sao mai là gì?', 'Sao băng là gì?'] },

    { id: 'thanks', keys: ['cam on', 'thank', 'thanks', 'ok em', 'hay qua', 'tot qua'],
      a: 'Dạ không có gì ạ! Anh/chị cần hỏi thêm cứ nhắn em, hoặc vào ' + ZALO + ' để được đội ngũ hỗ trợ trực tiếp nhé.',
      follow: ['Xem thử miễn phí', 'Liên hệ tư vấn'] }
  ];

  var WELCOME = 'Chào anh/chị! Em là tư vấn viên của **Nghề Trader**.\nAnh/chị đang quan tâm **học giao dịch bài bản**, công cụ **Bot AI**, hay muốn **kiểm chứng kết quả qua PassView** ạ? Anh/chị cứ gõ câu hỏi, hoặc bấm **📞** để nói chuyện trực tiếp với em.';
  var STARTERS = ['Lớp học TradePro là gì?', 'Bot AI TradePro là gì?', 'PassView là gì?', 'Xem thử miễn phí', 'Mô hình nến cơ bản', 'Liên hệ tư vấn'];
  var FALLBACK = 'Dạ, câu này anh/chị hỏi rất đúng chỗ. Để em tư vấn **sát với trường hợp của anh/chị** nhất, cho em hỏi thêm một chút: anh/chị đã từng giao dịch chưa, và điều anh/chị đang muốn giải quyết nhất là gì ạ?\nNếu cần câu trả lời chi tiết ngay, chuyên viên bên em hỗ trợ trực tiếp qua ' + ZALO + ' hoặc anh/chị ' + CALL + '.';
  var SALES_FALLBACK = [
    { id: 'fb_capital', hint: ['von', 'tien', 'bao nhieu de', 'it tien', 'trieu', 'nap'],
      a: 'Dạ, chuyện vốn thì mỗi người một hoàn cảnh nên em không muốn tư vấn chung chung. Quan trọng nhất là chỉ dùng **số tiền anh/chị chấp nhận được rủi ro**, rồi bắt đầu đúng phương pháp.\nAnh/chị đang dự định bắt đầu với số vốn khoảng bao nhiêu, và đã có kinh nghiệm giao dịch chưa ạ? Chuyên viên bên em sẽ gợi ý lộ trình hợp với anh/chị qua ' + ZALO + '.',
      follow: ['Quản trị rủi ro', 'Lớp học TradePro là gì?', 'Liên hệ tư vấn'] },
    { id: 'fb_busy', hint: ['ban qua', 'ban ron', 'ban viec', 'ban lam', 'khong co thoi gian', 'di lam', 'it thoi gian', 'canh lenh', 'ngoi canh'],
      a: 'Dạ em hiểu, đa số anh chị bên em cũng đi làm bận rộn, không thể ngồi canh màn hình cả ngày. Vì vậy nhiều người chọn **Bot AI TradePro** để giao dịch theo phương pháp định sẵn, hoặc học qua video lúc rảnh.\nAnh/chị thường rảnh vào buổi nào trong ngày ạ? Em gợi ý cách phù hợp nhất.',
      follow: ['Bot AI TradePro là gì?', 'Xem thử miễn phí', 'Học phí bao nhiêu?'] },
    { id: 'fb_loss', hint: ['thua', 'lo', 'chay', 'mat tien', 'am von', 'cay'],
      a: 'Dạ em rất hiểu cảm giác đó, phần lớn người mới thua lỗ không phải vì kém, mà vì **thiếu phương pháp và để cảm xúc quyết định**. Đây đúng là điều Lớp học TradePro tập trung khắc phục: lộ trình rõ ràng, có người kèm, và quản trị rủi ro chặt chẽ.\nAnh/chị chia sẻ thêm giúp em, anh/chị thường thua vì vào lệnh vội hay vì không cắt lỗ ạ?',
      follow: ['Lớp học TradePro là gì?', 'Quản trị rủi ro', 'Liên hệ tư vấn'] },
    { id: 'fb_trust', hint: ['that khong', 'tin', 'that su', 'that ko', 'kiem chung', 'review', 'danh gia', 'chung minh'],
      a: 'Dạ anh/chị cẩn thận là rất đúng, thị trường này có nhiều nơi không minh bạch. Bên em không muốn anh/chị tin bằng lời, mà **tự kiểm chứng**: xem tài khoản thật qua **PassView**, xem thử video miễn phí, vào nhóm Zalo xem cộng đồng, hoặc gặp trực tiếp tại TMLabs Coffee.\nAnh/chị muốn kiểm chứng theo cách nào trước ạ?',
      follow: ['PassView là gì?', 'Xem thử miễn phí', 'Liên hệ tư vấn'] },
    { id: 'fb_generic2', hint: [],
      a: 'Dạ, em ghi nhận câu hỏi của anh/chị. Phần này chuyên viên bên em sẽ trả lời **chính xác và chi tiết hơn** qua ' + ZALO + ' hoặc ' + CALL + '.\nTrong lúc đó, anh/chị đang quan tâm **học bài bản**, dùng **Bot AI**, hay **kiểm chứng kết quả** trước ạ?',
      follow: ['Lớp học TradePro là gì?', 'Bot AI TradePro là gì?', 'PassView là gì?'] }
  ];
  var fbTurn = 0;
  function salesFallback(text) {
    var q = norm(text), best = null, bs = 0;
    SALES_FALLBACK.forEach(function (f) {
      var sc = 0; f.hint.forEach(function (h) { if (q.indexOf(' ' + h + ' ') > -1) sc += h.split(' ').length; });
      if (sc > bs) { bs = sc; best = f; }
    });
    if (best) return best;
    fbTurn++;
    return fbTurn % 2 ? { id: 'fallback', a: FALLBACK, follow: STARTERS } : SALES_FALLBACK[SALES_FALLBACK.length - 1];
  }

  /* ------------------------------------------------------------------ */
  /*  TÌM CÂU TRẢ LỜI                                                    */
  /* ------------------------------------------------------------------ */
  function norm(s) {
    return ' ' + String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd').replace(/[^a-z0-9]+/g, ' ').trim() + ' ';
  }
  KB.forEach(function (it) {
    it._k = it.keys.map(function (k) {
      var p = Array.isArray(k) ? k[0] : k, w = Array.isArray(k) ? k[1] : p.split(' ').length;
      return { p: norm(p), w: w };
    });
  });
  function findIntent(text) {
    var q = norm(text);
    if (/^ (xin )?chao( |$)|^ (hello|hi|alo|hey) /.test(q) && q.split(' ').length <= 6) {
      var rest = q.replace(/^ (xin )?chao (em|ban|anh|chi|ad|shop)? ?|^ (hello|hi|alo|hey) /, ' ');
      if (rest.trim().length < 3) return { id: 'greet', a: 'Dạ, em chào anh/chị! Anh/chị đang quan tâm điều gì ạ?', follow: STARTERS };
    }
    var best = null, bestScore = 0;
    KB.forEach(function (it) {
      var sc = 0;
      it._k.forEach(function (k) { if (q.indexOf(k.p) > -1) sc += k.w; });
      if (sc > bestScore) { bestScore = sc; best = it; }
    });
    return bestScore > 0 ? best : null;
  }
  window.NT_CHATBOT_MATCH = function (t) { var r = findIntent(t); return r ? r.id : null; }; // để kiểm thử

  /* ------------------------------------------------------------------ */
  /*  GIAO DIỆN                                                          */
  /* ------------------------------------------------------------------ */
  var CSS = '' +
'.ntc-fab{position:fixed;right:20px;bottom:20px;z-index:45;display:flex;align-items:center;gap:10px;border:0;cursor:pointer;background:#daa94f;color:#161208;border-radius:40px;padding:8px 18px 8px 8px;font:800 15px/1.1 system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif;box-shadow:0 12px 30px #0009,0 0 0 6px #daa94f2e;transition:transform .2s}' +
'.ntc-fab:hover{transform:translateY(-2px)}.ntc-fab img{width:42px;height:42px;border-radius:50%;background:#fff;border:2px solid #fff;object-fit:contain}' +
'.ntc-fab small{display:block;font-weight:600;font-size:11.5px;opacity:.75;margin-top:2px}.ntc-fab .ntc-dot{position:absolute;left:38px;top:8px;width:11px;height:11px;border-radius:50%;background:#2fd17a;border:2px solid #daa94f}' +
'.ntc-fab.ntc-hide{display:none}' +
'.ntc-panel{position:fixed;right:20px;bottom:20px;z-index:46;width:380px;max-width:calc(100vw - 24px);height:600px;max-height:calc(100vh - 40px);display:none;flex-direction:column;background:#0d1b2b;border:1px solid #33506b;border-radius:20px;overflow:hidden;box-shadow:0 26px 70px #000b;font-family:system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif;color:#eaf2fb}' +
'.ntc-panel.ntc-open{display:flex}' +
'.ntc-head{display:flex;align-items:center;gap:11px;padding:12px 12px 12px 14px;background:linear-gradient(135deg,#07111f,#16304a);border-bottom:1px solid #2a4056}' +
'.ntc-head img{width:40px;height:40px;border-radius:50%;background:#fff;border:2px solid #dbb36e;object-fit:contain}' +
'.ntc-head b{display:block;font-size:15px}.ntc-head span{font-size:12px;color:#8fd8a8}' +
'.ntc-head .ntc-sp{flex:1}' +
'.ntc-ib{width:36px;height:36px;border-radius:10px;border:1px solid #3c5670;background:#14293d;color:#eaf2fb;display:grid;place-items:center;cursor:pointer;padding:0}' +
'.ntc-ib:hover{border-color:#daa94f}.ntc-ib.ntc-on{background:#daa94f;color:#161208;border-color:#daa94f}.ntc-ib svg{width:18px;height:18px}' +
'.ntc-quick{display:flex;gap:8px;padding:9px 12px;background:#0a1624;border-bottom:1px solid #2a4056}' +
'.ntc-quick a{display:flex;align-items:center;justify-content:center;gap:7px;border-radius:11px;padding:9px 12px;font-weight:800;font-size:14px;text-decoration:none}' +
'.ntc-qcall{flex:1;background:#2fa866;color:#fff}.ntc-qcall:hover{background:#38bf75}.ntc-qcall svg{width:17px;height:17px}' +
'.ntc-qzalo{background:#16304a;color:#eaf2fb;border:1px solid #3c5670}.ntc-qzalo:hover{border-color:#daa94f}' +
'.ntc-body{flex:1;overflow-y:auto;padding:14px 12px;display:flex;flex-direction:column;gap:10px;scroll-behavior:smooth}' +
'.ntc-msg{max-width:88%;padding:10px 13px;border-radius:15px;font-size:14.5px;line-height:1.5;word-wrap:break-word}' +
'.ntc-msg p{margin:0 0 6px}.ntc-msg p:last-child{margin:0}.ntc-msg ul{margin:4px 0 6px;padding-left:18px}.ntc-msg li{margin:2px 0}' +
'.ntc-msg a{color:#f0c874;text-decoration:underline;text-underline-offset:2px}' +
'.ntc-bot{align-self:flex-start;background:#16293d;border:1px solid #29425b;border-top-left-radius:5px}' +
'.ntc-user{align-self:flex-end;background:#daa94f;color:#161208;border-top-right-radius:5px;font-weight:600}' +
'.ntc-tools{display:flex;gap:6px;flex-wrap:wrap;margin-top:8px}' +
'.ntc-tool{display:inline-flex;align-items:center;gap:6px;font-size:12.5px;font-weight:700;border-radius:20px;padding:6px 11px;border:1px solid #3e5a75;background:#0f2133;color:#dbe7f3;cursor:pointer;text-decoration:none!important}' +
'.ntc-tool:hover{border-color:#daa94f}.ntc-tool.ntc-vid{background:#2a2412;border-color:#7a6334;color:#f0c874}' +
'.ntc-chips{display:flex;gap:7px;flex-wrap:wrap;padding:0 12px 10px}' +
'.ntc-chip{border:1px solid #3c5670;background:transparent;color:#d6e3f0;border-radius:20px;padding:7px 12px;font-size:13px;cursor:pointer}' +
'.ntc-chip:hover{background:#daa94f;border-color:#daa94f;color:#161208}' +
'.ntc-typing{align-self:flex-start;color:#8ea6be;font-size:13px;padding:2px 6px}' +
'.ntc-foot{display:flex;gap:8px;align-items:center;padding:10px 12px;border-top:1px solid #2a4056;background:#0a1624}' +
'.ntc-foot input{flex:1;min-width:0;padding:11px 13px;border-radius:12px;border:1px solid #33506b;background:#0d1d2f;color:#eaf2fb;font-size:15px;outline:none}' +
'.ntc-foot input:focus{border-color:#daa94f}' +
'.ntc-send{background:#daa94f;color:#161208;border-color:#daa94f}' +
'.ntc-mic.ntc-rec{background:#d9483b;border-color:#d9483b;color:#fff;animation:ntcpulse 1.2s infinite}' +
'@keyframes ntcpulse{0%{box-shadow:0 0 0 0 #d9483b88}100%{box-shadow:0 0 0 12px #d9483b00}}' +
'.ntc-note{font-size:11px;color:#7f97ae;text-align:center;padding:0 12px 8px;background:#0a1624}' +
'.ntc-call{position:absolute;inset:0;background:radial-gradient(circle at 50% 35%,#1f4462,#07111f 70%);display:none;flex-direction:column;align-items:center;justify-content:center;gap:16px;padding:24px;text-align:center;z-index:2}' +
'.ntc-call.ntc-open{display:flex}' +
'.ntc-orb{width:130px;height:130px;border-radius:50%;background:#fff;border:4px solid #daa94f;display:grid;place-items:center;transition:box-shadow .3s}' +
'.ntc-orb img{width:110px;height:110px;border-radius:50%;object-fit:contain}' +
'.ntc-call[data-s="listen"] .ntc-orb{animation:ntcring 1.4s infinite}' +
'.ntc-call[data-s="speak"] .ntc-orb{box-shadow:0 0 0 10px #daa94f44,0 0 50px #daa94f88}' +
'@keyframes ntcring{0%{box-shadow:0 0 0 0 #2fd17a99}100%{box-shadow:0 0 0 26px #2fd17a00}}' +
'.ntc-call h4{margin:0;font-size:19px}.ntc-call p{margin:0;color:#b9cadb;font-size:14px;min-height:40px;max-width:290px}' +
'.ntc-hang{background:#d9483b;color:#fff;border:0;border-radius:40px;padding:13px 26px;font-weight:800;font-size:15px;cursor:pointer;display:flex;gap:8px;align-items:center}' +
'.ntc-hang svg{width:18px;height:18px}' +
'.ntc-talk{background:#2fa866;color:#fff;border:0;border-radius:40px;padding:14px 28px;font-weight:800;font-size:16px;cursor:pointer;display:flex;gap:8px;align-items:center}.ntc-talk svg{width:20px;height:20px}' +
'.ntc-call[data-s="listen"] .ntc-talk{background:#d9483b}.ntc-call[data-s="speak"] .ntc-talk,.ntc-call[data-s="think"] .ntc-talk{opacity:.5}' +
'@media(max-width:560px){.ntc-panel{right:0;left:0;bottom:0;width:100%;max-width:none;height:88vh;max-height:none;border-radius:20px 20px 0 0}.ntc-fab{right:14px;bottom:14px}.ntc-fab .ntc-lbl{display:none}.ntc-fab{padding:6px}.ntc-fab .ntc-dot{left:36px;top:5px}}';

  var IC = {
    mic: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg>',
    send: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12l16-8-6 16-3-7-7-1z"/></svg>',
    spk: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 9v6h4l5 4V5L8 9H4z"/><path d="M17 8.5a5 5 0 0 1 0 7M19.5 6a8.5 8.5 0 0 1 0 12"/></svg>',
    mute: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 9v6h4l5 4V5L8 9H4z"/><path d="M17 9l5 6M22 9l-5 6"/></svg>',
    phone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/></svg>',
    x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>'
  };

  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }

  var style = el('style'); style.textContent = CSS; document.head.appendChild(style);

  var fab = el('button', 'ntc-fab');
  fab.type = 'button'; fab.setAttribute('aria-label', 'Mở trợ lý Nghề Trader');
  fab.innerHTML = '<img src="' + LOGO + '" alt=""><span class="ntc-dot"></span><span class="ntc-lbl">Hỏi Nghề Trader<small>Chat · Nói chuyện</small></span>';

  var panel = el('section', 'ntc-panel');
  panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-label', 'Trợ lý Nghề Trader');
  panel.innerHTML =
    '<div class="ntc-head"><img src="' + LOGO + '" alt=""><div><b>Trợ lý Nghề Trader</b><span>● Sẵn sàng tư vấn</span></div><div class="ntc-sp"></div>' +
    '<button class="ntc-ib ntc-callbtn" type="button" title="Trò chuyện bằng giọng nói" aria-label="Trò chuyện bằng giọng nói">' + IC.phone + '</button>' +
    '<button class="ntc-ib ntc-spkbtn" type="button" title="Tự đọc to câu trả lời" aria-label="Bật/tắt đọc to câu trả lời" aria-pressed="false">' + IC.mute + '</button>' +
    '<button class="ntc-ib ntc-close" type="button" title="Đóng" aria-label="Đóng">' + IC.x + '</button></div>' +
    '<div class="ntc-quick"><a class="ntc-qcall" href="tel:' + CFG.phone + '">' + IC.phone + ' Gọi ngay ' + CFG.phoneLabel + '</a><a class="ntc-qzalo" href="' + CFG.zalo + '" target="_blank" rel="noopener noreferrer">💬 Zalo</a></div>' +
    '<div class="ntc-body" aria-live="polite"></div>' +
    '<div class="ntc-chips"></div>' +
    '<form class="ntc-foot"><button class="ntc-ib ntc-mic" type="button" title="Nói để hỏi" aria-label="Nói để hỏi">' + IC.mic + '</button>' +
    '<input type="text" placeholder="Nhập câu hỏi..." aria-label="Nhập câu hỏi" maxlength="300" autocomplete="off">' +
    '<button class="ntc-ib ntc-send" type="submit" title="Gửi" aria-label="Gửi">' + IC.send + '</button></form>' +
    '<div class="ntc-note">Trợ lý ảo Nghề Trader · ' + NOTE + '</div>' +
    '<div class="ntc-call" data-s="idle"><div class="ntc-orb"><img src="' + LOGO + '" alt=""></div><h4>Đang trò chuyện</h4><p class="ntc-cs">Bấm bắt đầu và nói câu hỏi của anh/chị.</p>' +
    '<button class="ntc-talk" type="button">' + IC.mic + ' Bấm để nói</button>' +
    '<button class="ntc-hang" type="button">' + IC.x + ' Kết thúc</button></div>';

  document.body.appendChild(fab); document.body.appendChild(panel);

  var body = panel.querySelector('.ntc-body'), chips = panel.querySelector('.ntc-chips'),
      form = panel.querySelector('form'), input = panel.querySelector('input'),
      micBtn = panel.querySelector('.ntc-mic'), spkBtn = panel.querySelector('.ntc-spkbtn'),
      callBtn = panel.querySelector('.ntc-callbtn'), callBox = panel.querySelector('.ntc-call'),
      callStatus = panel.querySelector('.ntc-cs');

  /* ---------- hiển thị tin nhắn (an toàn, không dùng innerHTML cho nội dung) ---------- */
  function safeHref(u) {
    if (/^(https?:|tel:|mailto:)/i.test(u)) return u;
    if (/^(\.\/|#|watch\.html|index\.html)/.test(u)) return u;
    return null;
  }
  function inline(parent, text) {
    var re = /\*\*(.+?)\*\*|\[([^\]]+)\]\(([^)\s]+)\)/g, last = 0, m;
    while ((m = re.exec(text))) {
      if (m.index > last) parent.appendChild(document.createTextNode(text.slice(last, m.index)));
      if (m[1]) { var b = document.createElement('strong'); b.textContent = m[1]; parent.appendChild(b); }
      else {
        var h = safeHref(m[3]);
        if (h) { var a = document.createElement('a'); a.textContent = m[2]; a.href = h; if (/^https?:/.test(h)) { a.target = '_blank'; a.rel = 'noopener noreferrer'; } parent.appendChild(a); }
        else parent.appendChild(document.createTextNode(m[2]));
      }
      last = re.lastIndex;
    }
    if (last < text.length) parent.appendChild(document.createTextNode(text.slice(last)));
  }
  function render(box, text) {
    var ul = null;
    text.split('\n').forEach(function (line) {
      if (/^- /.test(line)) { if (!ul) { ul = document.createElement('ul'); box.appendChild(ul); } var li = document.createElement('li'); inline(li, line.slice(2)); ul.appendChild(li); }
      else { ul = null; if (!line.trim()) return; var p = document.createElement('p'); inline(p, line); box.appendChild(p); }
    });
  }
  function plain(text) {
    return text.replace(/\*\*(.+?)\*\*/g, '$1').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/^- /gm, '').replace(/[📞🎤▶↗]/g, '').replace(/\bvs\b/gi, 'với').replace(/–/g, ' đến ');
  }
  function videoInfo(file) {
    var docs = window.DOCUMENTS || [], d = null;
    for (var i = 0; i < docs.length; i++) if (String(docs[i].file || '').split('/').pop() === file) { d = docs[i]; break; }
    return { href: 'watch.html?v=' + encodeURIComponent(file), title: d ? d.title : 'Xem video bài học' };
  }
  function scrollDown() { body.scrollTop = body.scrollHeight; }

  function addUser(text) { var m = el('div', 'ntc-msg ntc-user'); m.textContent = text; body.appendChild(m); scrollDown(); }
  function addBot(text, opts) {
    opts = opts || {};
    var m = el('div', 'ntc-msg ntc-bot'); render(m, text);
    var tools = el('div', 'ntc-tools');
    if (opts.video) {
      var v = videoInfo(opts.video), a = el('a', 'ntc-tool ntc-vid'); a.href = v.href; a.textContent = '▶ ' + v.title; tools.appendChild(a);
    }
    if (TTS.ok || VOICE.map) {
      var s = el('button', 'ntc-tool'); s.type = 'button'; s.innerHTML = IC.spk.replace('<svg', '<svg width="14" height="14"') + ' Nghe';
      s.addEventListener('click', function () { VOICE.unlock(); say(opts.id, text); });
      tools.appendChild(s);
    }
    if (tools.childNodes.length) m.appendChild(tools);
    body.appendChild(m); scrollDown();
  }
  function setChips(list) {
    chips.innerHTML = '';
    (list || []).slice(0, 4).forEach(function (t) {
      var c = el('button', 'ntc-chip'); c.type = 'button'; c.textContent = t;
      c.addEventListener('click', function () { stopVoice(); VOICE.unlock(); ask(t, false); });
      chips.appendChild(c);
    });
  }

  /* ---------- đọc to (Text-to-Speech) ---------- */
  var TTS = {
    ok: 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window,
    voice: null, warned: false,
    pick: function () {
      if (!TTS.ok) return;
      var vs = window.speechSynthesis.getVoices() || [];
      var vi = vs.filter(function (v) { return /^vi/i.test(v.lang); });
      TTS.voice = vi.filter(function (v) { return /google|online|natural/i.test(v.name); })[0] || vi[0] || null;
    },
    stop: function () { if (TTS.ok) window.speechSynthesis.cancel(); },
    unlock: function () { if (!TTS.ok || TTS.unlocked) return; TTS.unlocked = true; try { var u = new SpeechSynthesisUtterance(' '); u.volume = 0; window.speechSynthesis.speak(u); } catch (e) {} },
    speak: function (text, done0) {
      var fired = false, safety = null;
      function done() { if (fired) return; fired = true; clearTimeout(safety); if (done0) done0(); }
      if (!TTS.ok) { done(); return; }
      TTS.stop(); TTS.pick();
      safety = setTimeout(done, Math.min(60000, 2500 + text.length * 95));
      if (!TTS.voice && !TTS.warned) { TTS.warned = true; addBot('Thiết bị của anh/chị có thể **chưa có giọng đọc tiếng Việt**, nên giọng đọc có thể không chuẩn. Trên điện thoại Android hoặc trình duyệt Chrome/Edge thường có sẵn giọng tiếng Việt.'); }
      var parts = text.replace(/\n+/g, '. ').match(/[^.!?:;]+[.!?:;]*/g) || [text];
      var chunks = [], cur = '';
      parts.forEach(function (p) { if ((cur + p).length > 180 && cur) { chunks.push(cur); cur = p; } else cur += p; });
      if (cur.trim()) chunks.push(cur);
      var i = 0;
      (function next() {
        if (i >= chunks.length) { done(); return; }
        var u = new SpeechSynthesisUtterance(chunks[i++].trim());
        u.lang = 'vi-VN'; if (TTS.voice) u.voice = TTS.voice; u.rate = 1; u.pitch = 1;
        u.onend = next; u.onerror = function () { done(); };
        window.speechSynthesis.speak(u);
      })();
    }
  };
  if (TTS.ok) { TTS.pick(); window.speechSynthesis.onvoiceschanged = TTS.pick; }

  /* ---------- giọng Hải Đăng tạo sẵn (VieNeu-TTS) ---------- */
  var VOICE = {
    dir: 'assets/voice/', map: null, el: null, done: null, unlocked: false,
    load: function () {
      try {
        fetch(VOICE.dir + 'manifest.json', { cache: 'no-cache' }).then(function (r) { return r.ok ? r.json() : null; })
          .then(function (j) { VOICE.map = j || null; }).catch(function () {});
      } catch (e) {}
    },
    has: function (id) { return !!(id && VOICE.map && VOICE.map[id]); },
    audio: function () {
      if (!VOICE.el) { VOICE.el = new Audio(); VOICE.el.preload = 'auto'; }
      return VOICE.el;
    },
    unlock: function () { // iPhone: phải "mở khóa" âm thanh ngay lúc khách bấm
      if (VOICE.unlocked) return; VOICE.unlocked = true;
      try {
        var a = VOICE.audio(), n = 800, b = new ArrayBuffer(44 + n * 2), v = new DataView(b);
        function w(o, t) { for (var i = 0; i < t.length; i++) v.setUint8(o + i, t.charCodeAt(i)); }
        w(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); w(8, 'WAVEfmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true);
        v.setUint16(22, 1, true); v.setUint32(24, 16000, true); v.setUint32(28, 32000, true); v.setUint16(32, 2, true);
        v.setUint16(34, 16, true); w(36, 'data'); v.setUint32(40, n * 2, true);
        a.src = URL.createObjectURL(new Blob([b], { type: 'audio/wav' })); a.play().catch(function () {});
      } catch (e) {}
    },
    stop: function () {
      if (VOICE.el) { try { VOICE.el.pause(); } catch (e) {} }
      var d = VOICE.done; VOICE.done = null; if (d) d();
    },
    play: function (id, text, done) {
      stopVoice();
      if (!VOICE.has(id)) { TTS.speak(text, done); return; }
      var a = VOICE.audio(), finished = false;
      function fin() { if (finished) return; finished = true; a.onended = a.onerror = null; VOICE.done = null; if (done) done(); }
      VOICE.done = fin;
      a.onended = fin;
      a.onerror = function () { finished = true; VOICE.done = null; TTS.speak(text, done); };
      a.src = VOICE.dir + VOICE.map[id].file; a.currentTime = 0;
      var p = a.play(); if (p && p.catch) p.catch(function () { if (!finished) { finished = true; VOICE.done = null; TTS.speak(text, done); } });
    }
  };
  function stopVoice() { var d = VOICE.done; VOICE.done = null; if (VOICE.el) { try { VOICE.el.pause(); } catch (e) {} } TTS.stop(); if (d) {} }
  function say(id, text, done) { VOICE.play(id, plain(text), done); }
  VOICE.load();

  /* ---------- nghe (Speech-to-Text) ---------- */
  var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  var rec = null, recActive = false;
  function listen(onFinal, onEnd) {
    if (!SR) return false;
    try { if (rec) { if (rec._cancel) rec._cancel(); rec.abort(); } } catch (e) {}
    var me = new SR(); rec = me; me.lang = 'vi-VN'; me.interimResults = true; me.maxAlternatives = 1; me.continuous = true;
    var finalText = '', heard = false, silenceT = null, startT = null, cancelled = false;
    me._cancel = function () { cancelled = true; };
    function endSoon(ms) { clearTimeout(silenceT); silenceT = setTimeout(function () { try { me.stop(); } catch (e) {} }, ms); }
    // chưa nói gì thì chờ tối đa 12 giây; đã nói thì im 1,1 giây là chốt câu
    startT = setTimeout(function () { if (!heard) { try { me.stop(); } catch (e) {} } }, 12000);
    me.onresult = function (ev) {
      var interim = ''; finalText = '';
      for (var i = 0; i < ev.results.length; i++) {
        if (ev.results[i].isFinal) finalText += ev.results[i][0].transcript + ' '; else interim += ev.results[i][0].transcript;
      }
      var t = (finalText + interim).replace(/\s+/g, ' ').trim();
      if (!t) return;
      heard = true; clearTimeout(startT);
      input.value = t;
      if (callOn) { callState('listen', '“' + t + '”'); }
      endSoon(interim ? 1400 : 1100);
    };
    me.onerror = function (ev) {
      var e = ev.error;
      if (e === 'not-allowed' || e === 'service-not-allowed') {
        addBot(INAPP ? INAPP_MSG : 'Em chưa được phép dùng **micro**.\n- Máy tính: bấm biểu tượng ổ khóa cạnh thanh địa chỉ, cho phép micro.\n- Điện thoại: vào Cài đặt của trình duyệt (Chrome/Safari), cho phép micro cho trang này.\nRồi anh/chị thử lại nhé.');
        endCall();
      } else if (e === 'audio-capture') {
        addBot('Em không tìm thấy **micro** trên thiết bị. Anh/chị kiểm tra micro hoặc tai nghe rồi thử lại nhé.'); endCall();
      } else if (e === 'network') {
        addBot('Nhận giọng nói cần **kết nối mạng** và trình duyệt Chrome/Edge/Safari. Anh/chị kiểm tra mạng hoặc đổi trình duyệt rồi thử lại nhé.'); endCall();
      }
    };
    me.onend = function () {
      clearTimeout(silenceT); clearTimeout(startT);
      if (rec === me) { recActive = false; micBtn.classList.remove('ntc-rec'); }
      if (cancelled) return;                       // bị dừng chủ động: không gửi câu dở
      var t = heard ? input.value.trim() : '';
      if (t) onFinal(t); else if (onEnd) onEnd();
    };
    try { me.start(); recActive = true; micBtn.classList.add('ntc-rec'); } catch (e) { return false; }
    return true;
  }
  function stopListen() { try { if (rec) { if (rec._cancel) rec._cancel(); rec.abort(); } } catch (e) {} recActive = false; micBtn.classList.remove('ntc-rec'); }
  if (!SR) { micBtn.title = 'Trình duyệt này chưa hỗ trợ nói. Hãy dùng Chrome hoặc Edge.'; micBtn.style.opacity = .45; }

  /* ---------- trả lời ---------- */
  var autoSpeak = false, history = [];
  function setAutoSpeak(on) {
    autoSpeak = on; spkBtn.classList.toggle('ntc-on', on); spkBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
    spkBtn.innerHTML = on ? IC.spk : IC.mute; if (!on) stopVoice();
  }
  function localAnswer(text) {
    var it = findIntent(text);
    if (!it) return salesFallback(text);
    return it;
  }
  function ask(text, byVoice, cb) {
    text = String(text || '').trim(); if (!text) return;
    input.value = ''; addUser(text); history.push({ role: 'user', text: text });
    var typing = el('div', 'ntc-typing', 'Trợ lý đang trả lời…'); body.appendChild(typing); scrollDown();
    function finish(ans) {
      typing.remove();
      addBot(ans.a, { video: ans.video, id: ans.id }); setChips(ans.follow || STARTERS);
      history.push({ role: 'bot', text: ans.a });
      if (byVoice && callOn) {
        say(ans.id, ans.a, function () { stopBarge(); if (cb) cb(); });
        startBarge(ans.a);                       // nghe trong lúc đang nói để khách nói chen
      } else if (autoSpeak || byVoice) say(ans.id, ans.a, cb); else if (cb) cb();
    }
    if (CFG.aiEndpoint) {
      fetch(CFG.aiEndpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: text, history: history.slice(-10) }) })
        .then(function (r) { return r.json(); })
        .then(function (j) { finish(j && j.reply ? { a: String(j.reply), follow: STARTERS } : localAnswer(text)); })
        .catch(function () { finish(localAnswer(text)); });
    } else setTimeout(function () { finish(localAnswer(text)); }, 350);
  }

  /* ---------- chế độ gọi (nói chuyện liên tục) ---------- */
  var callOn = false, misses = 0;

  /* ---------- nói chen (barge-in): khách nói là bot dừng ---------- */
  var barge = null;
  var BARGE_ACK = 'Dạ, em nghe đây, anh/chị cứ nói ạ.';
  var BARGE_CMDS = ['dừng lại', 'dừng', 'thôi', 'khoan', 'không phải', 'sai rồi', 'khoan đã', 'cho hỏi', 'nhưng mà', 'thế còn', 'vậy còn', 'ý tôi là', 'ý em là', 'em ơi'];
  function lowVi(t) { return ' ' + String(t || '').toLowerCase().normalize('NFC').replace(/[^\p{L}\p{N}]+/gu, ' ').trim() + ' '; }
  function wordsOf(t) { return norm(t).trim().split(' ').filter(Boolean); }
  function stopBarge() { if (barge) { var r = barge.rec; clearTimeout(barge.timer); barge = null; try { r.abort(); } catch (e) {} } }
  function startBarge(answerText) {
    if (!SR || !callOn) return;
    stopBarge();
    var own = {};   // các từ bot đang đọc (kể cả phiên âm) để nhận ra tiếng vọng từ loa
    wordsOf(plain(answerText) + ' pat viu tret pro tret do da lo bot ay ai pho rech vi de o oep sai i meo sup pot').forEach(function (w) { own[w] = 1; });
    var ansLow = lowVi(plain(answerText));
    var cmds = BARGE_CMDS.filter(function (c) { return ansLow.indexOf(' ' + c + ' ') < 0; }); // bỏ lệnh trùng chữ trong câu bot đang đọc
    var r = new SR(); r.lang = 'vi-VN'; r.continuous = true; r.interimResults = true;
    var st = { rec: r, hit: false, from: 0, text: '' }; barge = st;
    r.onresult = function (ev) {
      if (barge !== st) return;
      var i, t = '';
      if (!st.hit) {
        for (i = ev.resultIndex; i < ev.results.length; i++) {
          var seg = ev.results[i][0].transcript, ws = wordsOf(seg), q = lowVi(seg);
          if (!ws.length) continue;
          var fresh = ws.filter(function (w) { return !own[w]; }).length;   // từ không có trong câu bot đang đọc
          var cmd = cmds.some(function (c) { return q.indexOf(' ' + c + ' ') > -1; });
          if (cmd || (fresh >= 2 && fresh / ws.length >= 0.25) || (fresh >= 1 && ws.length <= 3)) { st.hit = true; st.from = i; break; }
        }
        if (!st.hit) return;
        stopVoice();                               // bot im ngay
        callState('listen', 'Dạ em nghe…');
      }
      for (i = st.from; i < ev.results.length; i++) t += ev.results[i][0].transcript + ' ';
      st.text = t.trim(); input.value = st.text; callStatus.textContent = '“' + st.text + '”';
      clearTimeout(st.timer);                       // khách im 1,1 giây là chốt câu
      st.timer = setTimeout(function () { finishBarge(st); }, ev.results[ev.results.length - 1].isFinal ? 700 : 1100);
    };
    r.onerror = function () {};
    r.onend = function () { if (barge === st) { if (st.hit) finishBarge(st); else barge = null; } };
    try { r.start(); } catch (e) { barge = null; }
  }
  function finishBarge(st) {
    if (barge !== st) return;
    barge = null; clearTimeout(st.timer); try { st.rec.abort(); } catch (e) {}
    var t = st.text.trim();
    var onlyCmd = lowVi(t).trim().split(' ').length <= 3 && BARGE_CMDS.some(function (c) { return lowVi(t).trim() === c || lowVi(t).trim().indexOf(c) === 0 && lowVi(t).trim().length <= c.length + 4; });
    if (t && onlyCmd) {                           // khách chỉ nói "khoan", "thôi"... -> dạ rồi nghe tiếp
      addUser(t); input.value = '';
      addBot(BARGE_ACK, { id: 'barge_ack' }); callState('speak', 'Dạ, em nghe…');
      say('barge_ack', BARGE_ACK, function () { if (callOn) setTimeout(callLoop, 200); });
      return;
    }
    if (t) { callState('think', '“' + t + '”'); ask(t, true, function () { if (callOn) setTimeout(callLoop, 300); }); callState('speak', 'Em đang trả lời… anh/chị cứ nói chen nếu cần.'); }
    else callLoop();
  }
  var talkBtn = panel.querySelector('.ntc-talk');
  function callState(s, msg) {
    callBox.setAttribute('data-s', s); if (msg != null) callStatus.textContent = msg;
    talkBtn.innerHTML = (s === 'listen' ? IC.x + ' Dừng nghe' : IC.mic + ' Bấm để nói');
  }
  function callLoop() {
    if (!callOn || recActive || barge) return;
    callState('listen', 'Em đang nghe… anh/chị cứ nói.');
    var ok = listen(function (t) {
      misses = 0; callState('think', '“' + t + '”');
      ask(t, true, function () { if (callOn) setTimeout(callLoop, 300); });
      callState('speak', 'Em đang trả lời… anh/chị cứ nói chen nếu cần.');
    }, function () {
      if (!callOn) return;
      misses++;
      if (misses >= 2 || IOS) { misses = 0; callState('idle', 'Em chưa nghe thấy gì. Anh/chị bấm “Bấm để nói” rồi nói nhé.'); }
      else callLoop();
    });
    if (!ok) callState('idle', 'Anh/chị bấm nút “Bấm để nói” rồi nói câu hỏi nhé.');
  }
  function startCall() {
    if (!SR) { addBot('Trình duyệt này chưa hỗ trợ trò chuyện bằng giọng nói. Anh/chị dùng **Chrome** hoặc **Edge** (máy tính, Android) nhé. Anh/chị vẫn có thể gõ câu hỏi, em sẽ đọc to câu trả lời.'); setAutoSpeak(true); return; }
    if (INAPP) addBot(INAPP_MSG);
    TTS.unlock(); VOICE.unlock();
    callOn = true; misses = 0; callBox.classList.add('ntc-open');
    callLoop(); // bật micro ngay trong lúc khách bấm (iPhone yêu cầu)
  }
  function endCall() { callOn = false; stopBarge(); stopListen(); stopVoice(); callBox.classList.remove('ntc-open'); callState('idle'); }

  /* ---------- sự kiện ---------- */
  var started = false;
  function open() {
    panel.classList.add('ntc-open'); fab.classList.add('ntc-hide');
    if (!started) { started = true; addBot(WELCOME, { id: 'welcome' }); setChips(STARTERS); }
    setTimeout(function () { if (window.matchMedia('(min-width:561px)').matches) input.focus(); }, 50);
  }
  function close() { panel.classList.remove('ntc-open'); fab.classList.remove('ntc-hide'); endCall(); stopListen(); stopVoice(); }
  fab.addEventListener('click', open);
  panel.querySelector('.ntc-close').addEventListener('click', close);
  form.addEventListener('submit', function (e) { e.preventDefault(); stopListen(); stopVoice(); VOICE.unlock(); ask(input.value, false); });
  spkBtn.addEventListener('click', function () { VOICE.unlock(); setAutoSpeak(!autoSpeak); });
  callBtn.addEventListener('click', startCall);
  panel.querySelector('.ntc-hang').addEventListener('click', endCall);
  talkBtn.addEventListener('click', function () {
    if (recActive) { stopListen(); callState('idle', 'Đã dừng. Bấm “Bấm để nói” để hỏi tiếp.'); return; }
    stopBarge(); stopVoice(); TTS.unlock(); VOICE.unlock(); callLoop();
  });
  micBtn.addEventListener('click', function () {
    if (!SR) { addBot('Trình duyệt này chưa hỗ trợ nói. Anh/chị dùng **Chrome** hoặc **Edge** nhé, hoặc gõ câu hỏi.'); return; }
    if (recActive) { stopListen(); return; }
    if (INAPP) addBot(INAPP_MSG);
    stopVoice(); TTS.unlock(); VOICE.unlock(); input.value = ''; input.placeholder = 'Em đang nghe…';
    listen(function (t) { input.placeholder = 'Nhập câu hỏi...'; ask(t, true); }, function () { input.placeholder = 'Nhập câu hỏi...'; });
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && panel.classList.contains('ntc-open')) close(); });
  window.NT_CHATBOT_OPEN = open;
})();
