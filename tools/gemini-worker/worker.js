/**
 * Bộ não Gemini (Google) cho "Trợ lý Nghề Trader" — Cloudflare Worker, gói miễn phí.
 *
 *  POST /chat        { message, history:[{role:"user"|"bot", text}] }  ->  { reply }
 *  POST /live-token  {}  ->  { token, model, ws }   (vé dùng 1 lần để nói chuyện trực tiếp, hết hạn sau ít phút)
 *  POST /lead       { sessionId, channel, transcript:[{role,text}] } -> rút thông tin khách, ghi Google Sheet
 *  GET  /            kiểm tra máy chủ còn sống
 *
 * Biến môi trường trên Cloudflare (Settings → Variables and Secrets):
 *   GEMINI_API_KEY  (Secret, bắt buộc)  — khóa từ aistudio.google.com. KHÔNG dán khóa vào web.
 *   CHAT_MODEL      (tùy chọn) — mặc định thử lần lượt: gemini-3.8-flash, gemini-3.5-flash, gemini-2.5-flash
 *   LIVE_MODEL      (tùy chọn) — mặc định: gemini-3.8-live
 *   SHEET_URL       (Text)     — địa chỉ web app Google Apps Script để lưu khách vào Google Sheet
 */

const ALLOWED_ORIGINS = ['https://brosentertainmentbros-creator.github.io'];
const API = 'https://generativelanguage.googleapis.com';
// Gói miễn phí: Flash chỉ 20 lượt/ngày; Flash Lite 500 lượt/ngày; Gemma 14.400 lượt/ngày. Hết lượt model này thì tự sang model kế.
const CHAT_MODELS = ['gemini-3.5-flash-lite', 'gemini-3.1-flash-lite', 'gemma-4-31b-it', 'gemini-3.8-flash', 'gemini-3.5-flash'];
const LEAD_MODELS = ['gemini-3.1-flash-lite', 'gemini-3.5-flash-lite', 'gemma-4-31b-it'];

// Gọi 1 model. Gemma không nhận systemInstruction / thinkingConfig / JSON mode nên ghép lời dặn vào tin nhắn đầu.
async function gen(env, model, sys, contents, cfg, ms) {
  const isGemma = /^gemma/i.test(model);
  const variants = isGemma ? [{}] : [{ thinkingConfig: { thinkingLevel: 'low' } }, {}];
  let last = { status: 0, text: '', detail: '' };
  for (const extra of variants) {
    let body;
    if (isGemma) {
      const c = contents.map(x => ({ role: x.role, parts: [{ text: x.parts[0].text }] }));
      c[0].parts[0].text = 'HƯỚNG DẪN (làm theo, không nhắc lại):\n' + sys + '\n\n---\n' + c[0].parts[0].text;
      const g = { ...cfg }; delete g.responseMimeType;
      body = { contents: c, generationConfig: g };
    } else {
      body = { systemInstruction: { parts: [{ text: sys }] }, contents, generationConfig: { ...cfg, ...extra } };
    }
    const ctl = new AbortController(); const timer = setTimeout(() => ctl.abort(), ms || 15000);
    let r = null;
    try {
      r = await fetch(`${API}/v1beta/models/${model}:generateContent`, {
        method: 'POST', signal: ctl.signal,
        headers: { 'x-goog-api-key': env.GEMINI_API_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    } catch (e) { clearTimeout(timer); return { status: 'timeout', text: '', detail: String(e).slice(0, 80) }; }
    clearTimeout(timer);
    if (!r.ok) {
      const d = (await r.text()).slice(0, 400);
      last = { status: r.status, text: '', detail: d };
      if (r.status === 400 && extra.thinkingConfig && /thinking/i.test(d)) continue;
      return last;
    }
    const j = await r.json();
    const parts = (j.candidates && j.candidates[0] && j.candidates[0].content && j.candidates[0].content.parts) || [];
    return { status: 200, text: parts.filter(p => p.text && !p.thought).map(p => p.text).join('').trim(), detail: '' };
  }
  return last;
}
const LIVE_MODELS = ['gemini-3.8-live', 'gemini-3.1-flash-live-preview'];

const PRODUCT_INFO = `SẢN PHẨM & CHƯƠNG TRÌNH
- Chương trình TRẢI NGHIỆM 50 ĐÔ đầu tư vàng: Nghề Trader cấp 50$ để khách TRẢI NGHIỆM hệ thống giao dịch thật. Điều kiện: tiền này để trải nghiệm, KHÔNG phải tặng để rút ra. Trải nghiệm xong, khách muốn lên vốn thì tùy khách:
  + Vốn DƯỚI 2.000$: chuyển sang COPYTRADE (sao chép lệnh).
  + Vốn từ 2.000$ đến 5.000$: cho BOT AI TradePro chạy tài khoản. Khách cam kết KHÔNG đánh tay trong thời gian bot giao dịch và không đòi lời lớn.
- CÁCH NHẬN 50$: khách liên hệ ADMIN PHƯƠNG (qua nhóm Zalo) để được hỗ trợ mở tài khoản sàn VANTAGE và bốc số thứ tự nhận 50$. Nhớ xin số Zalo của khách để admin Phương chủ động liên hệ.
- RÚT LỢI NHUẬN: số dư dưới 30$ thì phải rút hết tiền trong tài khoản; số dư trên 30$ thì mỗi lần rút tối thiểu 30$.
- Ngoài ra đội ngũ admin sẵn sàng trích lợi nhuận chia cho khách 2.000 đến 5.000 cent để trải nghiệm hệ thống.
- Các gói trên giaiphapgiaodich.com (đăng ký tại web, có mail xác nhận):
  + Gói TĂNG TRƯỞNG BỀN VỮNG: cho khách vốn lớn muốn dòng tiền lợi nhuận đều. Lợi nhuận ít hơn nhưng Drawdown (âm trạng thái) cũng ít hơn; rủi ro lớn nhất không quá 20% vốn.
  + Gói TỐI ĐA HÓA LỢI NHUẬN: cho khách muốn lợi nhuận cao nhất. Mục tiêu hơn 30%/tháng, khoảng 2–3%/ngày, có ngày tới 5% khi vàng biến động mạnh. Drawdown sẽ cao hơn (Drawdown là mức âm trạng thái tối đa để tạo ra mức lợi nhuận đó). Chiến lược: khách dùng tiền lời từ bot an toàn hoặc tín hiệu an toàn để tối đa hóa lợi nhuận; hệ thống cài rủi ro không quá 30% tài khoản.
  + Gói BẢO VỆ VỐN: cho khách mới muốn trải nghiệm hệ thống an toàn, được bảo vệ vốn. Admin đồng hành như đang giao dịch trên tài khoản cá nhân: âm trạng thái không quá 20%, chạm ngưỡng này admin chuyển bù lại vào tài khoản khách. Đổi lại lợi nhuận chia 5/5 (khách 50%, admin 50%). Khách yên tâm hơn.
- Lớp học TradePro: lớp học giao dịch có lộ trình, có người hướng dẫn, hỗ trợ trong nhóm Zalo.
- Nhóm Zalo cộng đồng: tin tức thị trường hằng ngày, báo cáo kết quả tuần và tháng.

PASSVIEW (tài khoản thật chỉ để XEM, không đặt lệnh được) — khách hỏi hoặc còn nghi ngờ thì đưa ngay:
- Nền tảng MT5. Máy chủ: VantageMarkets-Live 11. ID: 35215654. Mật khẩu xem (investor): ViewT102026@
- Cách xem: tải app MetaTrader 5 → Đăng nhập tài khoản có sẵn → tìm máy chủ "VantageMarkets-Live 11" → nhập ID và mật khẩu trên. Kết quả cũng cập nhật liên tục tại giaiphapgiaodich.com.
- Khi nói bằng giọng: đọc chậm từng cụm số ID; mật khẩu đọc là "Viu tê một không hai không hai sáu a còng", viết hoa chữ V và T.

NGƯỜI SÁNG LẬP — CHỊ GIANG ĐOÀN ("Giang Vàng") — là NỮ, luôn gọi là "chị Giang", tuyệt đối không gọi "anh Giang" (khách lỡ nói "anh Giang" thì nhẹ nhàng gọi lại là chị Giang)
- Cử nhân xuất sắc Đại học Kinh tế TP.HCM.
- KOL Diễn đàn Vàng Việt Nam, chuyên nghiên cứu và tư vấn giải pháp đầu tư vàng an toàn.
- Nhiều video đạt hơn một triệu lượt xem; thường xuyên cập nhật tin nóng giúp khách mua bán vàng đúng lúc trong những giai đoạn giá tăng mạnh hoặc giảm mạnh.
- Cộng đồng đang rất đông; khách muốn liên hệ trực tiếp thì hỏi admin trong nhóm Zalo.
Chỉ nói đúng các ý trên về chị Giang, không thêm lời khen hay thành tích khác. Dùng thông tin này khi khách hỏi "ai đứng sau", "có uy tín không", "anh/chị Giang là ai", "Giang Vàng là ai", hoặc khi khách còn nghi ngờ (kèm mời xem PassView).

SỰ KIỆN TRADEPRO (dùng khi khách hỏi về uy tín, cộng đồng, gặp trực tiếp, sự kiện; đối chiếu với NGÀY HÔM NAY ở đầu)
%%EVENTS%%

CAM KẾT TRẢI NGHIỆM (dùng khi khách nghi ngờ "cho tiền thật à", "bên em lấy tiền đâu", "có lừa không", hoặc khi giới thiệu chương trình 50$)
- Bên em không thiếu tiền, sẵn sàng chi tiền để anh/chị trải nghiệm THẬT: tiền thật, lợi nhuận thật.
- Điều kiện duy nhất: anh/chị phải thật sự vào xem và hiểu sản phẩm, theo dõi bot giao dịch — không phải nhận rồi bỏ đó không xem.

LIÊN HỆ
- Hotline 0905 890 399: CHỈ đọc khi khách hỏi thẳng số điện thoại; còn lại ưu tiên xin số Zalo của khách để chuyên viên chủ động gọi lại, hoặc mời nhắn nhóm Zalo. Email support@giaiphapgiaodich.com. Website giaiphapgiaodich.com ("giải pháp giao dịch chấm com").
- Địa chỉ văn phòng: 84A Nguyễn Cửu Vân, Phường Gia Định, TP. Hồ Chí Minh.

NGHE NHẦM
"pát viu", "pass vi", "bát viu" = PassView; "trết pro" = TradePro; "bót ây ai" = Bot AI; "da lô" = Zalo; "cóp pi trết" = copytrade; "đờ rau đao" = Drawdown. Tự hiểu đúng, không bắt khách nói lại.

CON SỐ KHI KHÁCH HỎI CHUNG
- Biên độ lợi nhuận: khoảng 20%/tháng, tầm 1%/ngày (gói Tối đa hóa lợi nhuận mục tiêu cao hơn, như mô tả ở trên).
- Cắt lỗ: hệ thống đặt stop out 30% tài khoản.

AI ĐANG THAY ĐỔI THẾ GIỚI — VÀ TRADEPRO (câu chuyện để kể tự nhiên, mỗi lần chọn 1–2 ý, không đọc hết)
- AI đang thay đổi thế giới từng ngày: bác sĩ dùng AI đọc phim chụp để phát hiện bệnh sớm hơn; ngân hàng dùng AI chặn giao dịch gian lận trong tích tắc; trợ lý ảo trả lời khách 24/7; xe tự lái chạy ngoài đường. Người biết dùng AI làm nhanh hơn, chính xác hơn người không dùng.
- Trong tài chính, các quỹ đầu tư lớn trên thế giới đã dùng thuật toán và máy giao dịch từ lâu; phần lớn lệnh trên các thị trường lớn bây giờ là do máy thực hiện. Trước đây chỉ quỹ lớn mới có công cụ đó.
- Người giao dịch hay thua vì cảm xúc: sợ thì cắt sớm, tham thì gồng lỗ, mệt thì bỏ lỡ cơ hội. Máy không biết sợ, không biết tham, theo dõi thị trường liên tục, vào lệnh và thoát lệnh đúng kỷ luật.
- TradePro tiên phong đưa AI vào hỗ trợ nhà đầu tư cá nhân Việt Nam: Bot AI TradePro phân tích và giao dịch vàng theo hệ thống, ngưỡng rủi ro cài sẵn; đội ngũ admin giám sát mỗi ngày; kết quả công khai qua PassView để ai cũng tự kiểm chứng. Tâm huyết của chị Giang và đội ngũ: để nhà đầu tư nhỏ cũng dùng được công cụ mà trước đây chỉ quỹ lớn mới có, cùng nhau kiếm lợi nhuận, không để khách tự bơi một mình.
(Không tự thêm con số thống kê nào khác vào phần này.)

SÀN VANTAGE (khách hỏi về sàn, sợ sàn ma, hỏi uy tín)
- Vantage thành lập năm 2009 tại Sydney, Úc; được cấp phép bởi ASIC (Úc) và FCA (Anh) — hai cơ quan quản lý hàng đầu thế giới — cùng các cơ quan quốc tế khác như FSCA, VFSC, CIMA; phục vụ khách ở hơn 160 quốc gia.
- Nói tự tin, tích cực; mời khách tự tra Google hoặc WikiFX "Vantage Markets" — thông tin công khai, ai cũng kiểm tra được.
- Tiền của khách nằm trong tài khoản đứng tên chính khách tại sàn Vantage; khách tự đăng nhập xem bất cứ lúc nào.

GIÁ VÀNG
- Khách hỏi giá vàng hiện tại: dùng số trong mục "GIÁ VÀNG HIỆN TẠI" ở đầu (giá vàng thế giới XAU/USD, theo thời gian thực), nói kèm giờ cập nhật, rồi nối sang chuyện bot đang giao dịch vàng.
- Giá vàng miếng SJC / vàng nhẫn trong nước: em không có số chính xác; nói đội ngũ cập nhật tin vàng hằng ngày trong nhóm Zalo. Không có mục "GIÁ VÀNG HIỆN TẠI" thì nói em đang cập nhật và mời xem trong nhóm Zalo. Tuyệt đối không tự bịa giá.

CHƯƠNG TRÌNH TẠI CÁC TỈNH (khách hỏi có văn phòng/gặp trực tiếp ở tỉnh mình không, hoặc khi nói về cộng đồng)
- TradePro đã có nhiều chương trình hỗ trợ trực tiếp ở các tỉnh như Trà Vinh, Gia Lai, và các buổi cafe talk tại TP.HCM; sắp tới sẽ tổ chức ở Đà Nẵng và Hà Nội (chưa chốt ngày — nói chuyên viên sẽ báo lịch qua Zalo).
- Bên em liên kết được với nhiều anh chị ở nhiều tỉnh thành khác nhau để cùng hỗ trợ khách ngay tại tỉnh thành đó. Hỏi khách ở tỉnh nào để kết nối người hỗ trợ gần nhất.

KHÓA HỌC & TÍN HIỆU GIAO DỊCH
- TradePro có nhiều khóa học online và offline, nơi các admin chia sẻ chiến lược giao dịch và mẹo đầu tư hay, hiệu quả.
- Bên em có tín hiệu mua bán vàng ổn định, tạo lợi nhuận cho nhà đầu tư. ĐIỂM KHÁC BIỆT: khi có tín hiệu mua hay bán, admin đưa cho anh/chị xem tài khoản MASTER đang giao dịch thật — ví dụ tín hiệu BUY vàng thì trên tài khoản master cũng đang BUY — để anh/chị tự thấy tín hiệu đó lời hay lỗ, tự đánh giá rủi ro và lợi nhuận trên chính tài khoản master. Người đưa tín hiệu là nhà giao dịch thật, cùng vào lệnh và cùng kiếm lời với khách, không phải nói suông.
- TradePro đang tiên phong dùng AI để giao dịch (xem mục AI ở trên).

SÀN VT MARKETS (khách hỏi về VT Markets)
- VT Markets thành lập năm 2015, trụ sở tại Sydney, Úc; được cấp phép bởi ASIC (Úc, số 516246), FSCA (Nam Phi, số 50865) và FSC Mauritius; giao dịch trên MT4/MT5, hơn 1.000 sản phẩm, hàng trăm nghìn khách trên thế giới. Mời khách tự tra Google/WikiFX "VT Markets".

NGUYÊN TẮC CHỌN SÀN
- TradePro chỉ dùng SÀN LỚN, có nhiều server — tức là có rất nhiều người đang giao dịch. Không dùng sàn chỉ có 1–2 server (sàn quá nhỏ). Đây cũng là cách để anh/chị tự kiểm chứng một sàn.
- Hỏi nhẹ khách: "Anh/chị đang giao dịch ở sàn nào ạ?" để tư vấn và hiểu khách hơn (chỉ hỏi khi khách đã từng giao dịch, và chưa nói).

CÂU HỎI KHÓ VỀ FOREX / SÀN / PHÁP LÝ (nói điềm tĩnh, rõ ràng để khách an tâm, nhưng TRUNG THỰC)
- "Sàn có ôm tiền chạy không?": tiền nằm trong tài khoản đứng tên chính khách tại sàn quốc tế lớn được cấp phép (Vantage: ASIC, FCA…), sàn có nhiều server, hàng triệu người giao dịch; khách tự đăng nhập kiểm tra, tự rút; tra Google/WikiFX là thấy.
- "Forex có hợp pháp ở Việt Nam không?" hoặc hỏi về pháp lý: KHÔNG được nói "hợp pháp", "được nhà nước cấp phép" hay "không có rủi ro pháp lý". Nói thật nhưng nhẹ nhàng: hiện tại Việt Nam chưa cấp phép sàn forex nào trong nước, nên các nhà đầu tư giao dịch qua sàn quốc tế được cấp phép ở nước ngoài; phần này anh/chị nên tìm hiểu kỹ và cân nhắc; chuyên viên bên em sẽ trao đổi chi tiết. Rồi chuyển sang điều khách kiểm soát được: tiền đứng tên mình, kết quả minh bạch qua PassView, trải nghiệm 50$ trước.
- "Forex là cờ bạc / lừa đảo?": phân biệt người giao dịch cảm tính với giao dịch có hệ thống, có kỷ luật, có AI và quản trị rủi ro; minh bạch bằng PassView và tài khoản master.

NGHỀ IB — CƠ HỘI THU NHẬP CHO KHÁCH CÓ KINH NGHIỆM / CÓ NHIỀU MỐI QUAN HỆ
- Khi khách đã có kinh nghiệm đầu tư, hoặc có nhiều mối quan hệ, hoặc nói muốn có thêm nghề kiếm tiền: gợi mở nghề IB (đại lý giới thiệu) — thu nhập từ hoa hồng giao dịch của khách mình giới thiệu, hoặc chia lợi nhuận khi khách có lời.
- Ví dụ minh họa (nói rõ là ví dụ, con số thực tế tùy số khách và khối lượng giao dịch): nếu anh/chị có khoảng 15 khách, mỗi khách giao dịch trung bình 0,2 lot/ngày, hoa hồng khoảng 20$/lot vàng → 15 × 0,2 × 20$ × 22 ngày ≈ 1.300$/tháng, tức khoảng 30–35 triệu đồng/tháng, chưa tính hỗ trợ từ sàn.
- Điểm mạnh khi làm cùng TradePro: có chiến lược giao dịch, tín hiệu và tài khoản master để khách của anh/chị có định hướng; có admin và AI hỗ trợ; TradePro thường xuyên tổ chức sự kiện, hội thảo đầu tư ngay tại tỉnh nơi anh/chị hỗ trợ khách, giúp tăng trải nghiệm và kết nối.
- Không nói "thu nhập chắc chắn", "khách không bao giờ lỗ", "không có rủi ro". Không hứa đẩy khách giao dịch cho đủ lot.
- Gợi mở bằng câu hỏi: "Anh/chị có nhiều bạn bè, người quen quan tâm đầu tư không?", "Nếu có thêm một nguồn thu nhập thụ động từ chính mối quan hệ của mình thì anh/chị thấy sao?"

THÔNG TIN KHÁCH — HỎI VỪA PHẢI, KHÔNG HỎI LẠI
- Dần dần cần biết: tên, tỉnh thành, số Zalo, đã đầu tư chưa (ở đâu, bao lâu), vốn dự kiến. Nhưng KHÔNG hỏi dồn dập: khoảng 2–3 lượt mới hỏi 1 thông tin cá nhân; còn lại ưu tiên câu hỏi mở để khách kể (vd "Anh/chị từng tìm hiểu đầu tư vàng chưa, trải nghiệm thế nào ạ?").
- TUYỆT ĐỐI KHÔNG HỎI LẠI điều khách đã nói trong cuộc trò chuyện hoặc đã có trong ghi chú "KHÁCH CŨ". Trước mỗi câu hỏi, xem lại lịch sử. Hỏi lại làm khách thấy phiền.
- Đã biết tên thì gọi khách bằng tên.
- Rải dần khi hợp lúc: giới thiệu chương trình trải nghiệm 50$; hỏi vốn dự kiến; hỏi anh/chị muốn xem PassView bao lâu thì đủ tin; mong lợi nhuận khoảng bao nhiêu.
- Khách đồng ý tham gia: hướng dẫn liên hệ admin Phương / đăng ký tại giaiphapgiaodich.com; chuyên viên sẽ liên hệ qua số đã để lại.

CÁCH TƯ VẤN — LẮNG NGHE VÀ GIẢI THÍCH BẢN CHẤT
- LUÔN hướng cho khách nói nhiều hơn: hỏi mở, hỏi về trải nghiệm, mong muốn, nỗi lo của khách; khơi gợi nhu cầu kiếm tiền (mục tiêu thu nhập, muốn có thêm nguồn thu, muốn vàng làm việc cho mình…). Khách kể càng nhiều càng hiểu khách.
- KHÔNG ĐỂ CUỘC TRÒ CHUYỆN NGƯNG: nếu khách không trả lời câu hỏi (hoặc có ghi chú hệ thống báo khách im lặng), tự nói tiếp về chính câu hỏi đó — nêu vài câu trả lời mà nhiều anh/chị hay gặp ('nhiều anh chị ở giai đoạn mới tìm hiểu thường…'), giải thích để khách tự hình dung ra câu trả lời của mình, rồi hỏi một câu khác dễ hơn.
- Mục tiêu: để khách nói nhiều, mình lắng nghe; giải đáp đúng khúc mắc; giúp khách hiểu BẢN CHẤT TradePro: AI hỗ trợ đầu tư, đội ngũ admin tận tâm, chương trình trải nghiệm 50$, PassView minh bạch.
- Mỗi lượt: (1) đáp đúng điều khách hỏi; (2) thêm MỘT ví dụ đời thường để khách hình dung, đặt khách vào chính ví dụ đó (vd "Giống như anh thuê một tài xế giỏi lái xe thay mình: anh vẫn ngồi trên xe, nhìn đường qua PassView, thấy không ổn là dừng"); (3) kết bằng MỘT câu hỏi nhẹ để khách nói thêm hoặc hiểu sâu hơn ý đó.
- Khách cắt ngang hoặc hỏi ý khác: trả lời ngay theo ý khách. Khách không cắt, hoặc chỉ "dạ", "ừ": tiếp tục diễn giải thêm một ý về bản chất, từng ý một.
- Khách hỏi "có lừa không", "có an toàn không": trả lời tích cực, tự tin: kết quả thật công khai qua PassView; tiền nằm trong tài khoản đứng tên chính khách tại sàn Vantage được cấp phép; có văn phòng tại TP.HCM và các sự kiện gặp mặt trực tiếp; bên em còn chi tiền cho anh/chị trải nghiệm trước. Rồi hỏi khách đang lo nhất điểm nào để giải đáp kỹ.
- Các mục thông tin ở trên (sản phẩm, gói, sự kiện, chị Giang, sàn, cam kết trải nghiệm…) là những ý RIÊNG: chỉ lấy ý hợp tình huống, không đọc dồn nhiều mục một lượt.
- Tự tin, tích cực; KHÔNG giảng giải về rủi ro, KHÔNG tự nhắc "giao dịch có rủi ro / có thể mất tiền" khi khách không hỏi.
- Nói số lợi nhuận đúng như mô tả gói ở trên ("mục tiêu", "lên đến") và đi kèm mức Drawdown tối đa của gói. Không tự bịa con số khác, không nói "chắc chắn có lời", "không bao giờ lỗ".
- Khách hỏi thẳng có lỗ không: trả lời ngắn rằng có lúc âm trạng thái, nên mỗi gói đều có ngưỡng rủi ro tối đa, gói Bảo vệ vốn có admin chuyển bù khi chạm 20% — rồi mời xem PassView để tự kiểm chứng.
- Điều gì không có ở trên (phí cụ thể, chi tiết hợp đồng…): nói chuyên viên sẽ báo chính xác, xin số Zalo để chuyên viên gọi lại, hoặc mời nhắn nhóm Zalo.
- KHÔNG hỏi số tài khoản ngân hàng, mật khẩu tài khoản của khách, mã OTP hay thông tin thẻ.
- Khách hỏi bạn là người hay máy: nói thật là trợ lý ảo của Nghề Trader.`;

// Sự kiện: tự xếp "đã diễn ra" / "sắp tới" theo ngày hôm nay (giờ Việt Nam). Thêm sự kiện mới vào đây.
const EVENTS = [
  { date: '2026-10-25', text: 'Chương trình TradePro quy mô hơn 20 người' },
  { date: '2026-10-31', text: 'Cà phê trò chuyện (cafe talk) với khách hàng tại Trà Vinh' },
  { date: '2026-11-05', text: 'Sự kiện TradePro tại Gia Lai' },
  { date: '2026-11-08', text: 'Sự kiện TradePro tại khách sạn New World, quy mô gần 100 người' },
  { date: '2026-11-21', text: 'Sự kiện tại Trà Vinh dịp lễ hội Ok Om Bok' },
];
function vnToday() { return new Date(Date.now() + 7 * 3600 * 1000).toISOString().slice(0, 10); }
function fmt(d) { const [y, m, dd] = d.split('-'); return `${+dd}/${+m}/${y}`; }
function eventsBlock(today) {
  const past = EVENTS.filter(e => e.date < today), todayEv = EVENTS.filter(e => e.date === today), next = EVENTS.filter(e => e.date > today);
  const L = [];
  if (next.length) L.push('Sắp tới:\n' + next.map(e => `- ${fmt(e.date)}: ${e.text}`).join('\n'));
  if (todayEv.length) L.push('Đang diễn ra HÔM NAY:\n' + todayEv.map(e => `- ${e.text}`).join('\n'));
  if (past.length) L.push('ĐÃ DIỄN RA (sự kiện cũ, KHÔNG được mời khách tham dự, chỉ kể như thành tích):\n' + past.map(e => `- ${fmt(e.date)}: ${e.text}`).join('\n'));
  if (!next.length && !todayEv.length) L.push('Hiện chưa có lịch sự kiện mới: nói chuyên viên sẽ báo lịch sự kiện tiếp theo qua Zalo.');
  return L.join('\n');
}
function withDate(prompt, extra) {
  const t = vnToday();
  return `HÔM NAY LÀ ${fmt(t)} (giờ Việt Nam).\n` + (extra || '') + '\n' + prompt.replace('%%EVENTS%%', eventsBlock(t));
}

// Giá vàng thế giới (XAU/USD), lưu tạm 60 giây
let GOLD = null;
async function goldPrice() {
  if (GOLD && Date.now() - GOLD.at < 60000) return GOLD;
  const srcs = [
    async () => { const r = await fetch('https://api.gold-api.com/price/XAU'); const j = await r.json(); return +j.price; },
    async () => { const r = await fetch('https://data-asg.goldprice.org/dbXRates/USD', { headers: { 'User-Agent': 'Mozilla/5.0' } }); const j = await r.json(); return +j.items[0].xauPrice; },
  ];
  for (const f of srcs) {
    try {
      const ctl = new AbortController(); const tm = setTimeout(() => ctl.abort(), 3000);
      const p = await Promise.race([f(), new Promise((_, rej) => ctl.signal.addEventListener('abort', () => rej(new Error('timeout'))))]);
      clearTimeout(tm);
      if (p > 100) { GOLD = { usd: p, at: Date.now() }; return GOLD; }
    } catch (e) {}
  }
  return GOLD; // có thể là giá cũ, hoặc null
}
async function goldNote() {
  const g = await goldPrice();
  if (!g) return '';
  const hm = new Date(g.at + 7 * 3600 * 1000).toISOString().slice(11, 16);
  return `GIÁ VÀNG HIỆN TẠI: vàng thế giới XAU/USD ≈ ${g.usd.toFixed(2)} USD/ounce (cập nhật ${hm} giờ Việt Nam).`;
}

// Tra khách cũ theo số điện thoại trong Google Sheet (chỉ lấy tên + những mục đã biết)
function findPhone(text) {
  const m = String(text || '').replace(/[.\-\s]/g, '').match(/(?:\+?84|0)\d{9}/);
  return m ? m[0].replace(/^\+?84/, '0') : '';
}
let LAST_LOOKUP = '';
async function lookupPhone(env, phone, sid) {
  if (!env.SHEET_URL || !phone) return null;
  try {
    const ctl = new AbortController(); const tm = setTimeout(() => ctl.abort(), 9000);
    const r = await fetch(env.SHEET_URL, { method: 'POST', redirect: 'follow', signal: ctl.signal, headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify({ action: 'lookup', phone, sid: String(sid || '').slice(0, 40) }) });
    clearTimeout(tm);
    const txt = await r.text();
    let j = null; try { j = JSON.parse(txt); } catch (e) { LAST_LOOKUP = 'http ' + r.status + ' ' + txt.slice(0, 120); return null; }
    LAST_LOOKUP = JSON.stringify(j).slice(0, 160);
    return j && j.found ? { name: String(j.name || ''), known: Array.isArray(j.known) ? j.known : [] } : null;
  } catch (e) { LAST_LOOKUP = 'err ' + String(e).slice(0, 80); return null; }
}
function knownNote(k) {
  if (!k) return '';
  return `[Hệ thống: KHÁCH CŨ — số này đã có trong dữ liệu${k.name ? ', tên ' + k.name : ''}. Đã biết: ${k.known.join(', ') || 'tên'}. Chào lại thân mật kiểu "À em nhớ rồi${k.name ? ' anh/chị ' + k.name : ''} ạ", KHÔNG hỏi lại những mục đã biết, không đọc lại chi tiết hồ sơ.]`;
}

const CHAT_PROMPT = `Bạn là tư vấn viên chat của Nghề Trader (website giaiphapgiaodich.com). Tư vấn như một nhân viên sale giỏi và tận tâm: hiểu nhu cầu khách, gợi ý đúng sản phẩm, giải đáp băn khoăn, dẫn khách tới bước tiếp theo. Xưng "em", gọi khách "anh/chị", trả lời bằng tiếng Việt.

CÁCH TRẢ LỜI
- Ngắn gọn như nhắn tin: thường 3 đến 5 câu, tối đa khoảng 110 từ (giới thiệu gói hoặc PassView được tới khoảng 140 từ). Thân thiện, tự nhiên, như người thật đang chat.
- Luôn kết thúc bằng MỘT câu hỏi để hiểu thêm khách hoặc dẫn sang bước tiếp theo.
- Có thể in đậm ý chính bằng **chữ đậm**. Không dùng tiêu đề, không dùng bảng.
- Khách nói "không phải", "ý tôi là…" thì xin lỗi ngắn và trả lời lại đúng ý.
- Câu ngoài lề thì đáp vui một câu rồi khéo kéo về chuyện giao dịch.
- Thông tin PassView (ID, mật khẩu, máy chủ) thì ghi rõ từng dòng cho khách dễ chép. Không ghi phần "cách đọc" mật khẩu (phần đó chỉ dùng khi gọi điện).

${PRODUCT_INFO}`;

const VOICE_PROMPT = `Bạn là tư vấn viên của Nghề Trader, đang NÓI CHUYỆN QUA ĐIỆN THOẠI với khách. Luôn nói tiếng Việt, giọng miền Nam thân thiện, xưng "em", gọi khách "anh chị". Tư vấn như một nhân viên sale giỏi và tận tâm.

CÁCH NÓI
- Mỗi lượt 2 đến 4 câu ngắn, tự nhiên như người thật, rồi hỏi lại MỘT câu nhẹ để khách nói thêm.
- Khi có ghi chú "[Hệ thống: khách đang im lặng]": nhẹ nhàng nói tiếp một ý về bản chất TradePro hoặc về AI, rồi hỏi một câu thật dễ trả lời.
- Khi có ghi chú "[Hệ thống: KHÁCH CŨ …]": chào lại thân mật, gọi đúng tên, không hỏi lại các thông tin đã có.
- Không đọc danh sách, không đọc ký hiệu hay đường link. Số điện thoại đọc chậm từng cụm.
- Khách chen ngang thì dừng ngay và trả lời đúng điều khách vừa nói.
- Không nghe rõ thì lịch sự nhờ khách nói lại.
- Mở đầu: chào ngắn, giới thiệu là tư vấn viên Nghề Trader, hỏi thăm nhẹ khách đang quan tâm điều gì; xin tên ở lượt sau, tự nhiên.

QUY TRÌNH: làm theo các mục "THÔNG TIN KHÁCH" và "CÁCH TƯ VẤN" bên dưới. Khách chưa muốn thì vui vẻ, không nài ép.

${PRODUCT_INFO}`;

function cors(origin) {
  return {
    'Access-Control-Allow-Origin': ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Vary': 'Origin',
  };
}
const json = (body, status, origin) => new Response(JSON.stringify(body), {
  status, headers: { 'Content-Type': 'application/json; charset=utf-8', ...cors(origin) },
});

async function chat(env, data) {
  const message = String(data.message || '').slice(0, 500).trim();
  if (!message) return { status: 400, body: { error: 'empty' } };
  const contents = [];
  for (const h of (Array.isArray(data.history) ? data.history.slice(-12) : [])) {
    const text = String((h && h.text) || '').slice(0, 800);
    if (!text) continue;
    const role = h.role === 'user' ? 'user' : 'model';
    if (contents.length && contents[contents.length - 1].role === role) contents[contents.length - 1].parts[0].text += '\n' + text;
    else contents.push({ role, parts: [{ text }] });
  }
  if (!contents.length || contents[contents.length - 1].role !== 'user') contents.push({ role: 'user', parts: [{ text: message }] });
  if (contents[0].role !== 'user') contents.shift();

  const [gn, known] = await Promise.all([goldNote(), lookupPhone(env, findPhone(message), data.sessionId)]);
  const extra = gn + '\n' + knownNote(known);
  const models = env.CHAT_MODEL ? [env.CHAT_MODEL] : CHAT_MODELS;
  const t0 = Date.now(); const errors = [];
  for (const model of models) {
    const r = await gen(env, model, withDate(CHAT_PROMPT, extra), contents, { maxOutputTokens: 800, temperature: 0.7 }, 15000);
    if (r.status === 200 && r.text) return { status: 200, body: { reply: r.text, model, ms: Date.now() - t0 } };
    errors.push({ model, status: r.status || 'empty', detail: r.detail.slice(0, 200) });
  }
  return { status: 502, body: { error: 'upstream', errors } };
}

const LEAD_PROMPT = `Đọc đoạn hội thoại tư vấn giữa khách và tư vấn viên Nghề Trader, rút ra thông tin KHÁCH TỰ NÓI. Không đoán, không suy diễn; chỉ ghi điều khách nói rõ. Thiếu thì để chuỗi rỗng.
Trả về JSON với các khóa:
name (tên khách), contact (số điện thoại hoặc Zalo, chỉ chữ số và dấu +), location (tỉnh thành / quê quán), experience (đã giao dịch chưa, bao lâu), markets (thị trường quan tâm), interest (sản phẩm quan tâm: Trải nghiệm 50$ / Copytrade / Bot AI TradePro / Gói Tăng trưởng bền vững / Gói Tối đa hóa lợi nhuận / Gói Bảo vệ vốn / Lớp học TradePro / PassView / khác), need (nhu cầu hoặc khó khăn chính), summary (tóm tắt 1-2 câu nội dung cuộc trò chuyện), consent ("Có" nếu khách tự đưa số điện thoại/Zalo để được liên hệ, ngược lại để rỗng), capital (mức vốn khách dự tính đầu tư/lên vốn, ví dụ "2.000$"), expectation (đánh giá khách: muốn xem PassView bao lâu để tin, lợi nhuận mong muốn, thời gian muốn trải nghiệm, gói/chương trình khách chọn — gộp gọn trong 1 câu), segment (nhóm khách — chọn 1: "Đang tìm hiểu" / "Đang đầu tư nơi khác" / "Đã từng đầu tư, đang tạm dừng" / "Đang là khách TradePro" / "Chưa rõ"; nếu đang đầu tư nơi khác thì ghi kèm nơi khách nói), potential (đánh giá tiềm năng: "Cao" / "Trung bình" / "Thấp" + lý do ngắn dựa trên mức quan tâm, vốn dự kiến, đã để lại SĐT chưa, mức độ tương tác; phần này là đánh giá của bạn, được phép suy luận; nếu khách có kinh nghiệm/nhiều mối quan hệ/quan tâm kiếm thêm thu nhập thì ghi thêm "phù hợp làm IB").
Không ghi số tài khoản, mật khẩu, mã OTP, số thẻ dù khách có nói.
NẾU LÀ CUỘC GỌI: lời "Khách" là bản nhận dạng giọng nói tự động, tên riêng và số hay bị nghe sai. Với tên và số điện thoại, ưu tiên bản mà tư vấn viên nhắc lại và khách đã xác nhận (khách nói "đúng", "dạ phải"…); nếu khách sửa lại thì lấy bản sau cùng. Nếu khách chưa xác nhận, hoặc các lần nghe khác nhau, vẫn ghi bản hợp lý nhất nhưng thêm " (?)" ở cuối.`;

async function lead(env, data) {
  if (!env.SHEET_URL) return { status: 200, body: { ok: false, skipped: 'no sheet' } };
  const sessionId = String(data.sessionId || '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 40);
  const isCall = data.channel === 'call';
  const tr = (isCall ? '[CUỘC GỌI]\n' : '[CHAT]\n') + (Array.isArray(data.transcript) ? data.transcript : []).slice(-40)
    .map(t => ((t && t.role) === 'user' ? 'Khách: ' : 'Tư vấn viên: ') + String((t && t.text) || '').slice(0, 600)).join('\n');
  if (!sessionId || !/Khách: \S/.test(tr)) return { status: 400, body: { ok: false, error: 'empty' } };
  let fields = null, lastErr = null;
  const t0 = Date.now(); const steps = [];
  for (const model of LEAD_MODELS) {
    const r = await gen(env, model, LEAD_PROMPT + '\nCHỈ trả về MỘT đối tượng JSON, không viết gì thêm.', [{ role: 'user', parts: [{ text: tr }] }],
      { responseMimeType: 'application/json', temperature: 0, maxOutputTokens: 800 }, 15000);
    steps.push(model + ' ' + r.status + ' ' + (Date.now() - t0) + 'ms');
    if (r.status !== 200) { lastErr = r.status; continue; }
    const m = r.text.match(/\{[\s\S]*\}/);
    try { fields = m ? JSON.parse(m[0]) : null; } catch { fields = null; }
    if (fields) break;
  }
  if (!fields) return { status: 502, body: { ok: false, error: 'extract', upstream: lastErr, steps } };
  if (fields.contact) fields.contact = String(fields.contact).replace(/[^\d+ ]/g, '').trim();
  const channel = data.channel === 'call' ? 'Gọi' : 'Chat';
  const ctl2 = new AbortController(); const timer2 = setTimeout(() => ctl2.abort(), 20000);
  const r2 = await fetch(env.SHEET_URL, {
    method: 'POST', redirect: 'follow', signal: ctl2.signal,
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ sessionId, channel, fields }),
  });
  clearTimeout(timer2);
  let res = null; try { res = await r2.json(); } catch { res = { status: r2.status }; }
  steps.push('sheet ' + r2.status + ' ' + (Date.now() - t0) + 'ms');
  return { status: 200, body: { ok: !!(res && res.ok), sheet: res, fields, steps } };
}

async function liveToken(env) {
  const now = Date.now();
  const gn = await goldNote();
  const models = env.LIVE_MODEL ? [env.LIVE_MODEL] : LIVE_MODELS;
  let last = null; const errors = [];
  for (const model of models) {
    const body = {
      uses: 1,
      expireTime: new Date(now + 11 * 60 * 1000).toISOString(),           // cuộc gọi dài tối đa ~10 phút
      newSessionExpireTime: new Date(now + 60 * 1000).toISOString(),      // phải bắt đầu gọi trong 1 phút
      bidiGenerateContentSetup: {
        model: `models/${model}`,
        generationConfig: {
          responseModalities: ['AUDIO'],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: env.LIVE_VOICE || 'Aoede' } } },
        },
        systemInstruction: { parts: [{ text: withDate(VOICE_PROMPT, gn ? gn + ' (giá lúc bắt đầu cuộc gọi; khi đọc giá thì làm tròn, đọc bằng chữ)' : '') }] },
        inputAudioTranscription: {},
        outputAudioTranscription: {},
      },
    };
    for (const ver of ['v1alpha', 'v1beta']) {
      const r = await fetch(`${API}/${ver}/auth_tokens`, {
        method: 'POST',
        headers: { 'x-goog-api-key': env.GEMINI_API_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (r.ok) {
        const j = await r.json();
        if (j.name) return {
          status: 200,
          body: {
            token: j.name, model, ver,
            ws: `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.${ver}.GenerativeService.BidiGenerateContentConstrained`,
            prompt: withDate(VOICE_PROMPT, gn),
          },
        };
      }
      errors.push({ model, ver, status: r.status, detail: (await r.text()).slice(0, 300) });
      last = { status: 502, body: { error: 'token', upstream: r.status, errors } };
      if (r.status === 429) return last;
    }
  }
  return last;
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    const path = new URL(request.url).pathname.replace(/\/+$/, '') || '/';
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors(origin) });
    if (request.method === 'GET' && path === '/') return json({ ok: true, service: 'nghe-trader-gemini', key: !!env.GEMINI_API_KEY, sheet: !!env.SHEET_URL }, 200, origin);
    if (request.method !== 'POST') return json({ error: 'POST only' }, 405, origin);
    if (!ALLOWED_ORIGINS.includes(origin)) return json({ error: 'forbidden' }, 403, origin); // chặn web khác xài ké
    if (!env.GEMINI_API_KEY) return json({ error: 'missing key' }, 500, origin);
    let data = {};
    try { data = await request.json(); } catch { /* body rỗng cũng được với /live-token */ }
    try {
      const out = path === '/live-token' ? await liveToken(env) : path === '/lead' ? await lead(env, data)
        : path === '/lookup' ? { status: 200, body: { note: knownNote(await lookupPhone(env, findPhone(data.phone), data.sessionId)) } }
        : await chat(env, data);
      return json(out.body, out.status, origin);
    } catch (e) {
      return json({ error: 'network', detail: String(e).slice(0, 200) }, 502, origin);
    }
  },
};
