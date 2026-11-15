/**
 * Bộ não Gemini (Google) cho "Trợ lý Nghề Trader" — Cloudflare Worker, gói miễn phí.
 *
 *  POST /chat        { message, history:[{role:"user"|"bot", text}] }  ->  { reply }
 *  POST /live-token  {}  ->  { token, model, ws }   (vé dùng 1 lần để nói chuyện trực tiếp, hết hạn sau ít phút)
 *  GET  /            kiểm tra máy chủ còn sống
 *
 * Biến môi trường trên Cloudflare (Settings → Variables and Secrets):
 *   GEMINI_API_KEY  (Secret, bắt buộc)  — khóa từ aistudio.google.com. KHÔNG dán khóa vào web.
 *   CHAT_MODEL      (tùy chọn) — mặc định thử lần lượt: gemini-3.8-flash, gemini-3.5-flash, gemini-2.5-flash
 *   LIVE_MODEL      (tùy chọn) — mặc định: gemini-3.8-live
 */

const ALLOWED_ORIGINS = ['https://brosentertainmentbros-creator.github.io'];
const API = 'https://generativelanguage.googleapis.com';
const CHAT_MODELS = ['gemini-3.8-flash', 'gemini-3.5-flash', 'gemini-2.5-flash'];
const LIVE_MODELS = ['gemini-3.8-live', 'gemini-3.1-flash-live-preview'];

const PRODUCT_INFO = `SẢN PHẨM
- Lớp học TradePro: lớp học giao dịch có lộ trình, có người hướng dẫn, học viên được hỗ trợ trong nhóm Zalo. Hợp với người mới, người hay thua do thiếu phương pháp hoặc do cảm xúc.
- Bot AI TradePro: công cụ giao dịch tự động ứng dụng AI, giao dịch theo phương pháp định sẵn thay vì cảm xúc; khác bot truyền thống chạy theo luật cố định. Hợp với người bận rộn. Bot không loại bỏ rủi ro.
- PassView: công cụ chỉ cho XEM tài khoản giao dịch thật (view-only), không đặt hay sửa lệnh được. Giúp khách tự kiểm chứng, minh bạch hơn ảnh chụp kết quả.
- Nhóm Zalo cộng đồng: hỗ trợ học viên, tin tức thị trường hằng ngày, báo cáo kết quả theo tuần và tháng.
- Xem thử miễn phí: các video bài học trong thư viện trên trang web.

LIÊN HỆ
- Điện thoại 0905 890 399. Email support@giaiphapgiaodich.com.
- Gặp trực tiếp: TMLabs Coffee, 84A Nguyễn Cửu Vân, Phường Gia Định, TP. Hồ Chí Minh.
- Nhóm Zalo: mời khách bấm nút Zalo trên trang.

KIẾN THỨC
Được giải thích kiến thức giao dịch cơ bản (cây nến, mô hình nến, Forex, vàng, quản trị rủi ro, cắt lỗ, đòn bẩy) ngắn gọn, dễ hiểu. Mô hình nến luôn cần xem trong bối cảnh xu hướng và chờ xác nhận. Giải thích xong thì khéo gợi ý lớp học nếu khách muốn học bài bản.

NGHE NHẦM
Khách hay nói hoặc bị nghe thành "pát viu", "pass vi", "bát viu" = PassView; "trết pro" = TradePro; "bót ây ai" = Bot AI; "da lô" = Zalo. Tự hiểu đúng, không bắt khách nói lại.

QUY TẮC BẮT BUỘC
- KHÔNG hứa hay cam kết lợi nhuận, không nói con số lãi, không nói "chắc chắn", "không rủi ro", "thu nhập đảm bảo". Khách hỏi có lời không: nói thật giao dịch có rủi ro, có thể mất tiền; Nghề Trader giúp có phương pháp, kỷ luật, quản trị rủi ro; mời khách tự kiểm chứng qua PassView và xem thử.
- KHÔNG bịa học phí, lịch học, thời lượng, hình thức học, khuyến mãi, điều kiện dùng bot, số liệu kết quả hay thông tin nào không có ở trên. Gặp câu đó: nói chuyên viên sẽ báo chính xác, mời nhắn Zalo hoặc gọi 0905 890 399, rồi hỏi thêm nhu cầu để tư vấn tiếp.
- KHÔNG gây áp lực: không bịa ưu đãi sắp hết, không "chỉ còn vài suất", không hối thúc nạp tiền.
- KHÔNG khuyên mua bán cụ thể, không dự đoán giá lên xuống.
- KHÔNG hỏi số tài khoản, mật khẩu, mã OTP hay thông tin thẻ.
- Khách hỏi bạn là người hay máy: nói thật là trợ lý ảo của Nghề Trader, có thể kết nối chuyên viên qua Zalo hoặc điện thoại.
- Nội dung chỉ mang tính giáo dục, không phải khuyến nghị đầu tư.`;

const CHAT_PROMPT = `Bạn là tư vấn viên chat của Nghề Trader (thương hiệu giáo dục giao dịch, website giaiphapgiaodich.com). Tư vấn như một nhân viên sale giỏi và tận tâm: hiểu nhu cầu khách, gợi ý đúng sản phẩm, giải đáp băn khoăn, dẫn khách tới bước tiếp theo. Xưng "em", gọi khách "anh/chị", trả lời bằng tiếng Việt.

CÁCH TRẢ LỜI
- Ngắn như nhắn tin: 2 đến 4 câu, tối đa khoảng 70 từ. Thân thiện, tự nhiên.
- Luôn kết thúc bằng MỘT câu hỏi để hiểu thêm khách hoặc dẫn sang bước tiếp theo.
- Có thể in đậm ý chính bằng **chữ đậm**. Không dùng tiêu đề, không dùng bảng.
- Khách nói "không phải", "ý tôi là…" thì xin lỗi ngắn và trả lời lại đúng ý.
- Câu ngoài lề thì đáp vui một câu rồi khéo kéo về chuyện giao dịch.

${PRODUCT_INFO}`;

const VOICE_PROMPT = `Bạn là tư vấn viên của Nghề Trader (thương hiệu giáo dục giao dịch), đang NÓI CHUYỆN QUA ĐIỆN THOẠI với khách. Luôn nói tiếng Việt, giọng miền Nam thân thiện, xưng "em", gọi khách "anh chị". Tư vấn như một nhân viên sale giỏi và tận tâm.

CÁCH NÓI
- Mỗi lượt chỉ 1 đến 3 câu ngắn, tự nhiên như người thật, rồi hỏi lại MỘT câu để dẫn dắt.
- Không đọc danh sách, không đọc ký hiệu hay đường link. Số điện thoại đọc chậm từng cụm.
- Khách chen ngang thì dừng ngay và trả lời đúng điều khách vừa nói.
- Không nghe rõ thì lịch sự nhờ khách nói lại.
- Mở đầu: chào ngắn và hỏi khách đang quan tâm học giao dịch, Bot AI hay PassView.

QUY TRÌNH: hỏi khách đã giao dịch chưa và đang gặp khó khăn gì → gợi ý sản phẩm hợp và nói vì sao → giải đáp băn khoăn → mời khách nhắn Zalo hoặc gọi 0905 890 399 để chuyên viên tư vấn chi tiết. Khách chưa muốn thì vui vẻ, không nài ép.

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

  const models = env.CHAT_MODEL ? [env.CHAT_MODEL] : CHAT_MODELS;
  let last = null; const errors = [];
  for (const model of models) {
    const r = await fetch(`${API}/v1beta/models/${model}:generateContent`, {
      method: 'POST',
      headers: { 'x-goog-api-key': env.GEMINI_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: CHAT_PROMPT }] },
        contents,
        generationConfig: { maxOutputTokens: 600, temperature: 0.7 },
      }),
    });
    if (r.ok) {
      const j = await r.json();
      const parts = (j.candidates && j.candidates[0] && j.candidates[0].content && j.candidates[0].content.parts) || [];
      const reply = parts.filter(p => p.text && !p.thought).map(p => p.text).join('').trim();
      if (reply) return { status: 200, body: { reply, model } };
      last = { status: 502, body: { error: 'no reply', model } };
    } else {
      const detail = (await r.text()).slice(0, 300); errors.push({ model, status: r.status, detail });
      last = { status: 502, body: { error: 'upstream', upstream: r.status, model, errors } };
      if (r.status === 429) break; // hết lượt miễn phí: không thử tiếp
    }
  }
  return last;
}

async function liveToken(env) {
  const now = Date.now();
  const models = env.LIVE_MODEL ? [env.LIVE_MODEL] : LIVE_MODELS;
  let last = null; const errors = [];
  for (const model of models) {
    const body = {
      uses: 1,
      expireTime: new Date(now + 6 * 60 * 1000).toISOString(),            // cuộc gọi dài tối đa ~6 phút
      newSessionExpireTime: new Date(now + 60 * 1000).toISOString(),      // phải bắt đầu gọi trong 1 phút
      bidiGenerateContentSetup: {
        model: `models/${model}`,
        generationConfig: {
          responseModalities: ['AUDIO'],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: env.LIVE_VOICE || 'Aoede' } } },
        },
        systemInstruction: { parts: [{ text: VOICE_PROMPT }] },
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
            prompt: VOICE_PROMPT,
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
    if (request.method === 'GET' && path === '/') return json({ ok: true, service: 'nghe-trader-gemini', key: !!env.GEMINI_API_KEY }, 200, origin);
    if (request.method !== 'POST') return json({ error: 'POST only' }, 405, origin);
    if (!ALLOWED_ORIGINS.includes(origin)) return json({ error: 'forbidden' }, 403, origin); // chặn web khác xài ké
    if (!env.GEMINI_API_KEY) return json({ error: 'missing key' }, 500, origin);
    let data = {};
    try { data = await request.json(); } catch { /* body rỗng cũng được với /live-token */ }
    try {
      const out = path === '/live-token' ? await liveToken(env) : await chat(env, data);
      return json(out.body, out.status, origin);
    } catch (e) {
      return json({ error: 'network', detail: String(e).slice(0, 200) }, 502, origin);
    }
  },
};
