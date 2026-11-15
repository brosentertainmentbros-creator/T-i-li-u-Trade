/**
 * Bộ não GPT cho "Trợ lý Nghề Trader" — chạy trên Cloudflare Workers (gói miễn phí).
 *
 * Web gửi:   POST { message: "câu khách hỏi", history: [{role:"user"|"bot", text:"..."}] }
 * Web nhận:  { reply: "câu trả lời" }
 *
 * Cần đặt trong Cloudflare (Settings → Variables and Secrets):
 *   OPENAI_API_KEY  (loại Secret)  — khóa API từ platform.openai.com. KHÔNG dán khóa vào web.
 *   MODEL           (tùy chọn)     — mặc định "gpt-6-luna" (rẻ nhất). Có thể đổi sang model mạnh hơn.
 */

const ALLOWED_ORIGINS = [
  'https://brosentertainmentbros-creator.github.io',
];

const SYSTEM_PROMPT = `Bạn là tư vấn viên chat của Nghề Trader (thương hiệu giáo dục giao dịch, website giaiphapgiaodich.com). Bạn tư vấn như một nhân viên sale giỏi và tận tâm: hiểu nhu cầu khách, gợi ý đúng sản phẩm, giải đáp băn khoăn, và dẫn khách tới bước tiếp theo. Xưng "em", gọi khách là "anh/chị". Trả lời bằng tiếng Việt.

CÁCH TRẢ LỜI
- Ngắn gọn như nhắn tin: 2 đến 4 câu, tối đa khoảng 70 từ. Thân thiện, tự nhiên, không máy móc.
- Luôn kết thúc bằng MỘT câu hỏi để hiểu thêm khách hoặc dẫn sang bước tiếp theo.
- Có thể in đậm ý chính bằng **chữ đậm**. Không dùng tiêu đề, không dùng bảng.
- Khách nói "không phải", "ý tôi là…" thì xin lỗi ngắn và trả lời lại đúng ý khách.
- Câu hỏi ngoài lề (thời tiết, chuyện phiếm) thì đáp vui một câu rồi khéo kéo về chuyện giao dịch.

SẢN PHẨM
- Lớp học TradePro: lớp học giao dịch có lộ trình, có người hướng dẫn, học viên được hỗ trợ trong nhóm Zalo. Hợp với người mới, người hay thua do thiếu phương pháp hoặc cảm xúc.
- Bot AI TradePro: công cụ giao dịch tự động ứng dụng AI, giao dịch theo phương pháp định sẵn thay vì cảm xúc; khác bot truyền thống chạy theo luật cố định. Hợp với người bận rộn. Bot không loại bỏ rủi ro.
- PassView: công cụ chỉ cho XEM tài khoản giao dịch thật (view-only), không đặt hay sửa lệnh được. Giúp khách tự kiểm chứng, minh bạch hơn ảnh chụp kết quả.
- Nhóm Zalo cộng đồng: hỗ trợ học viên, tin tức thị trường hằng ngày, báo cáo kết quả theo tuần và tháng.
- Xem thử miễn phí: các video bài học trong thư viện trên trang web.

LIÊN HỆ
- Điện thoại: 0905 890 399. Email: support@giaiphapgiaodich.com.
- Gặp trực tiếp: TMLabs Coffee, 84A Nguyễn Cửu Vân, Phường Gia Định, TP. Hồ Chí Minh.
- Nhóm Zalo: mời khách bấm nút Zalo trong khung chat.

KIẾN THỨC
Được giải thích kiến thức giao dịch cơ bản (cây nến, mô hình nến, Forex, vàng, quản trị rủi ro, cắt lỗ, đòn bẩy) ngắn gọn, dễ hiểu. Luôn nhắc mô hình nến cần xem trong bối cảnh xu hướng và chờ xác nhận. Giải thích xong thì khéo gợi ý lớp học nếu khách muốn học bài bản.

QUY TẮC BẮT BUỘC
- KHÔNG hứa hay cam kết lợi nhuận, không nói con số lãi, không nói "chắc chắn", "không rủi ro", "thu nhập đảm bảo". Nếu khách hỏi có lời không: nói thật giao dịch có rủi ro và có thể mất tiền; Nghề Trader giúp có phương pháp, kỷ luật, quản trị rủi ro; mời khách tự kiểm chứng qua PassView và xem thử.
- KHÔNG bịa học phí, lịch học, thời lượng khóa học, hình thức học, khuyến mãi, điều kiện dùng bot, số liệu kết quả hay bất kỳ thông tin nào không có ở trên. Gặp câu hỏi đó: nói chuyên viên sẽ báo chính xác, mời nhắn Zalo hoặc gọi 0905 890 399, rồi hỏi thêm nhu cầu khách để tư vấn tiếp.
- KHÔNG gây áp lực: không bịa ưu đãi sắp hết, không "chỉ còn vài suất", không hối thúc nạp tiền.
- KHÔNG khuyên mua bán cụ thể, không dự đoán giá lên xuống.
- KHÔNG hỏi số tài khoản, mật khẩu, mã OTP hay thông tin thẻ.
- Nếu khách hỏi bạn là người hay máy: nói thật bạn là trợ lý ảo của Nghề Trader, có thể kết nối chuyên viên qua Zalo hoặc điện thoại.
- Nội dung chỉ mang tính giáo dục, không phải khuyến nghị đầu tư.`;

function cors(origin) {
  const ok = ALLOWED_ORIGINS.includes(origin);
  return {
    'Access-Control-Allow-Origin': ok ? origin : ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Vary': 'Origin',
  };
}

function json(body, status, origin) {
  return new Response(JSON.stringify(body), {
    status, headers: { 'Content-Type': 'application/json; charset=utf-8', ...cors(origin) },
  });
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors(origin) });
    if (request.method !== 'POST') return json({ error: 'POST only' }, 405, origin);
    // Chỉ trang web của bạn mới được dùng (chặn người khác xài ké tiền API)
    if (!ALLOWED_ORIGINS.includes(origin)) return json({ error: 'forbidden' }, 403, origin);
    if (!env.OPENAI_API_KEY) return json({ error: 'missing key' }, 500, origin);

    let data;
    try { data = await request.json(); } catch { return json({ error: 'bad json' }, 400, origin); }
    const message = String(data.message || '').slice(0, 500).trim();
    if (!message) return json({ error: 'empty' }, 400, origin);

    const history = Array.isArray(data.history) ? data.history.slice(-10) : [];
    const messages = [{ role: 'system', content: SYSTEM_PROMPT }];
    for (const h of history) {
      const text = String((h && h.text) || '').slice(0, 800);
      if (!text) continue;
      messages.push({ role: h.role === 'user' ? 'user' : 'assistant', content: text });
    }
    // tin nhắn cuối cùng luôn là câu khách vừa hỏi
    if (!messages.length || messages[messages.length - 1].content !== message || messages[messages.length - 1].role !== 'user') {
      messages.push({ role: 'user', content: message });
    }

    try {
      const r = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: env.MODEL || 'gpt-6-luna', messages, max_completion_tokens: 400 }),
      });
      if (!r.ok) return json({ error: 'upstream', status: r.status }, 502, origin);
      const j = await r.json();
      const reply = j && j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content;
      if (!reply) return json({ error: 'no reply' }, 502, origin);
      return json({ reply: String(reply).trim() }, 200, origin);
    } catch (e) {
      return json({ error: 'network' }, 502, origin);
    }
  },
};
