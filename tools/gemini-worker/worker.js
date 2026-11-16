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
const CHAT_MODELS = ['gemini-3.8-flash', 'gemini-3.5-flash', 'gemini-2.5-flash'];
const LIVE_MODELS = ['gemini-3.8-live', 'gemini-3.1-flash-live-preview'];

const PRODUCT_INFO = `SẢN PHẨM & CHƯƠNG TRÌNH
- Chương trình TRẢI NGHIỆM 50 ĐÔ đầu tư vàng: Nghề Trader cấp 50$ để khách TRẢI NGHIỆM hệ thống giao dịch thật. Điều kiện: tiền này để trải nghiệm, KHÔNG phải tặng để rút ra. Trải nghiệm xong, khách muốn lên vốn thì tùy khách:
  + Vốn DƯỚI 2.000$: chuyển sang COPYTRADE (sao chép lệnh).
  + Vốn từ 2.000$ đến 5.000$: cho BOT AI TradePro chạy tài khoản. Khách cam kết KHÔNG đánh tay trong thời gian bot giao dịch và không đòi lời lớn.
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

LIÊN HỆ
- Điện thoại 0905 890 399. Email support@giaiphapgiaodich.com. Website giaiphapgiaodich.com ("giải pháp giao dịch chấm com").
- Địa chỉ văn phòng: 84A Nguyễn Cửu Vân, Phường Gia Định, TP. Hồ Chí Minh.

NGHE NHẦM
"pát viu", "pass vi", "bát viu" = PassView; "trết pro" = TradePro; "bót ây ai" = Bot AI; "da lô" = Zalo; "cóp pi trết" = copytrade; "đờ rau đao" = Drawdown. Tự hiểu đúng, không bắt khách nói lại.

CON SỐ KHI KHÁCH HỎI CHUNG
- Biên độ lợi nhuận: khoảng 20%/tháng, tầm 1%/ngày (gói Tối đa hóa lợi nhuận mục tiêu cao hơn, như mô tả ở trên).
- Cắt lỗ: hệ thống đặt stop out 30% tài khoản.

CHỦ ĐỘNG LẤY THÔNG TIN (quan trọng nhất — bạn dẫn dắt, không chờ khách hỏi)
Mỗi lượt chỉ MỘT câu hỏi, lồng tự nhiên vào câu trả lời. Đi lần lượt, cái nào khách đã nói thì bỏ qua:
1. TÊN: "Cho em xin tên anh/chị để tiện xưng hô ạ?" — nhắc lại tên để xác nhận ("Dạ em gọi anh là Giang đúng không ạ?"). Sai thì nhờ nói chậm/đánh vần, vẫn chưa rõ thì nhờ gõ vào ô chat.
2. TỈNH THÀNH / QUÊ QUÁN: "Anh/chị đang ở tỉnh thành nào ạ?"
3. SỐ ĐIỆN THOẠI / ZALO: "Anh/chị cho em xin số Zalo để em gửi thông tin chương trình và chuyên viên hỗ trợ mình nhé?" — đọc lại từng cụm để xác nhận. Khách chưa muốn cho thì tiếp tục tư vấn, sau khi khách quan tâm thì xin lại một lần nữa.
4. Giới thiệu chương trình TRẢI NGHIỆM 50 ĐÔ.
5. MỨC VỐN dự kiến: "Sau khi trải nghiệm, anh/chị dự tính lên vốn khoảng bao nhiêu ạ?" → tư vấn copytrade (dưới 2.000$) hay Bot (2.000–5.000$) hay gói phù hợp.
6. ĐÁNH GIÁ KHÁCH (hỏi dần): anh/chị muốn xem PassView bao lâu thì đủ tin tưởng hệ thống? Mong muốn lợi nhuận khoảng bao nhiêu? Muốn trải nghiệm bao lâu rồi mới lên vốn, và lên vốn tầm bao nhiêu?
Gọi khách bằng tên khi đã biết tên. Khi khách đồng ý tham gia: hướng dẫn đăng ký gói tại giaiphapgiaodich.com (có mail xác nhận) và chuyên viên sẽ liên hệ qua số đã để lại.

CÁCH TƯ VẤN
- Tự tin, tích cực, nói về cơ hội và kết quả của hệ thống; KHÔNG giảng giải về rủi ro, KHÔNG tự nhắc "giao dịch có rủi ro / có thể mất tiền" khi khách không hỏi.
- Nói số lợi nhuận đúng như mô tả gói ở trên ("mục tiêu", "lên đến") và luôn đi kèm mức Drawdown tối đa của gói đó. Không tự bịa con số khác, không nói "chắc chắn có lời", "không bao giờ lỗ".
- Khách hỏi thẳng có lỗ không: trả lời ngắn gọn rằng có lúc âm trạng thái, nên mỗi gói đều có ngưỡng rủi ro tối đa, và gói Bảo vệ vốn có admin chuyển bù khi chạm 20% — rồi chuyển ngay sang PassView để khách tự kiểm chứng.
- Điều gì không có ở trên (phí cụ thể, chi tiết hợp đồng, sàn khác…): nói chuyên viên sẽ báo chính xác, xin số Zalo hoặc mời gọi 0905 890 399.
- KHÔNG hỏi số tài khoản ngân hàng, mật khẩu tài khoản của khách, mã OTP hay thông tin thẻ.
- Khách hỏi bạn là người hay máy: nói thật là trợ lý ảo của Nghề Trader.`;

const CHAT_PROMPT = `Bạn là tư vấn viên chat của Nghề Trader (website giaiphapgiaodich.com). Tư vấn như một nhân viên sale giỏi và tận tâm: hiểu nhu cầu khách, gợi ý đúng sản phẩm, giải đáp băn khoăn, dẫn khách tới bước tiếp theo. Xưng "em", gọi khách "anh/chị", trả lời bằng tiếng Việt.

CÁCH TRẢ LỜI
- Ngắn như nhắn tin: 2 đến 4 câu, tối đa khoảng 70 từ (riêng khi giới thiệu gói hoặc PassView được dài hơn, tối đa khoảng 120 từ). Thân thiện, tự nhiên.
- Luôn kết thúc bằng MỘT câu hỏi để hiểu thêm khách hoặc dẫn sang bước tiếp theo.
- Có thể in đậm ý chính bằng **chữ đậm**. Không dùng tiêu đề, không dùng bảng.
- Khách nói "không phải", "ý tôi là…" thì xin lỗi ngắn và trả lời lại đúng ý.
- Câu ngoài lề thì đáp vui một câu rồi khéo kéo về chuyện giao dịch.
- Thông tin PassView (ID, mật khẩu, máy chủ) thì ghi rõ từng dòng cho khách dễ chép.

${PRODUCT_INFO}`;

const VOICE_PROMPT = `Bạn là tư vấn viên của Nghề Trader, đang NÓI CHUYỆN QUA ĐIỆN THOẠI với khách. Luôn nói tiếng Việt, giọng miền Nam thân thiện, xưng "em", gọi khách "anh chị". Tư vấn như một nhân viên sale giỏi và tận tâm.

CÁCH NÓI
- Mỗi lượt chỉ 1 đến 3 câu ngắn, tự nhiên như người thật, rồi hỏi lại MỘT câu để dẫn dắt.
- Không đọc danh sách, không đọc ký hiệu hay đường link. Số điện thoại đọc chậm từng cụm.
- Khách chen ngang thì dừng ngay và trả lời đúng điều khách vừa nói.
- Không nghe rõ thì lịch sự nhờ khách nói lại.
- Mở đầu: chào ngắn, giới thiệu là tư vấn viên Nghề Trader, rồi xin tên khách ngay.

QUY TRÌNH: làm theo mục "CHỦ ĐỘNG LẤY THÔNG TIN" bên dưới; xen giữa là trả lời đúng điều khách hỏi. Khách chưa muốn thì vui vẻ, không nài ép.

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
    // tư vấn chat không cần "suy nghĩ" lâu: hạ mức suy nghĩ để trả lời nhanh
    const variants = [{ thinkingConfig: { thinkingLevel: 'low' } }, {}];
    let r = null, t0 = Date.now();
    for (const extra of variants) {
      const ctl = new AbortController(); const timer = setTimeout(() => ctl.abort(), 15000);
      try {
        r = await fetch(`${API}/v1beta/models/${model}:generateContent`, {
          method: 'POST', signal: ctl.signal,
          headers: { 'x-goog-api-key': env.GEMINI_API_KEY, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: CHAT_PROMPT }] },
            contents,
            generationConfig: { maxOutputTokens: 800, temperature: 0.7, ...extra },
          }),
        });
      } catch (e) { r = null; errors.push({ model, status: 'timeout', ms: Date.now() - t0, detail: String(e).slice(0, 80) }); }
      clearTimeout(timer);
      if (!r) break;                                   // quá 15 giây: chuyển model khác
      if (r.status === 400 && extra.thinkingConfig) {   // model không hỗ trợ mức suy nghĩ: thử lại không có
        const d = (await r.clone().text());
        if (/thinking/i.test(d)) { errors.push({ model, status: 400, detail: 'no thinkingLevel' }); continue; }
      }
      break;
    }
    if (!r) { last = { status: 504, body: { error: 'timeout', errors } }; continue; }
    if (r.ok) {
      const j = await r.json();
      const parts = (j.candidates && j.candidates[0] && j.candidates[0].content && j.candidates[0].content.parts) || [];
      const reply = parts.filter(p => p.text && !p.thought).map(p => p.text).join('').trim();
      if (reply) return { status: 200, body: { reply, model, ms: Date.now() - t0 } };
      last = { status: 502, body: { error: 'no reply', model } };
    } else {
      const detail = (await r.text()).slice(0, 300); errors.push({ model, status: r.status, detail });
      last = { status: 502, body: { error: 'upstream', upstream: r.status, model, errors } };
      if (r.status === 429) break; // hết lượt miễn phí: không thử tiếp
    }
  }
  return last;
}

const LEAD_PROMPT = `Đọc đoạn hội thoại tư vấn giữa khách và tư vấn viên Nghề Trader, rút ra thông tin KHÁCH TỰ NÓI. Không đoán, không suy diễn; chỉ ghi điều khách nói rõ. Thiếu thì để chuỗi rỗng.
Trả về JSON với các khóa:
name (tên khách), contact (số điện thoại hoặc Zalo, chỉ chữ số và dấu +), location (tỉnh thành / quê quán), experience (đã giao dịch chưa, bao lâu), markets (thị trường quan tâm), interest (sản phẩm quan tâm: Trải nghiệm 50$ / Copytrade / Bot AI TradePro / Gói Tăng trưởng bền vững / Gói Tối đa hóa lợi nhuận / Gói Bảo vệ vốn / Lớp học TradePro / PassView / khác), need (nhu cầu hoặc khó khăn chính), summary (tóm tắt 1-2 câu nội dung cuộc trò chuyện), consent ("Có" nếu khách tự đưa số điện thoại/Zalo để được liên hệ, ngược lại để rỗng), capital (mức vốn khách dự tính đầu tư/lên vốn, ví dụ "2.000$"), expectation (đánh giá khách: muốn xem PassView bao lâu để tin, lợi nhuận mong muốn, thời gian muốn trải nghiệm, gói/chương trình khách chọn — gộp gọn trong 1 câu).
Không ghi số tài khoản, mật khẩu, mã OTP, số thẻ dù khách có nói.
NẾU LÀ CUỘC GỌI: lời "Khách" là bản nhận dạng giọng nói tự động, tên riêng và số hay bị nghe sai. Với tên và số điện thoại, ưu tiên bản mà tư vấn viên nhắc lại và khách đã xác nhận (khách nói "đúng", "dạ phải"…); nếu khách sửa lại thì lấy bản sau cùng. Nếu khách chưa xác nhận, hoặc các lần nghe khác nhau, vẫn ghi bản hợp lý nhất nhưng thêm " (?)" ở cuối.`;

async function lead(env, data) {
  if (!env.SHEET_URL) return { status: 200, body: { ok: false, skipped: 'no sheet' } };
  const sessionId = String(data.sessionId || '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 40);
  const isCall = data.channel === 'call';
  const tr = (isCall ? '[CUỘC GỌI]\n' : '[CHAT]\n') + (Array.isArray(data.transcript) ? data.transcript : []).slice(-40)
    .map(t => ((t && t.role) === 'user' ? 'Khách: ' : 'Tư vấn viên: ') + String((t && t.text) || '').slice(0, 600)).join('\n');
  if (!sessionId || !/Khách: \S/.test(tr)) return { status: 400, body: { ok: false, error: 'empty' } };
  const models = env.CHAT_MODEL ? [env.CHAT_MODEL] : ['gemini-3.5-flash', 'gemini-3.8-flash'];
  let fields = null, lastErr = null;
  const t0 = Date.now(); const steps = [];
  for (const model of models) {
    let r = null;
    for (const extra of [{ thinkingConfig: { thinkingLevel: 'low' } }, {}]) {
      const ctl = new AbortController(); const timer = setTimeout(() => ctl.abort(), 15000);
      try {
        r = await fetch(`${API}/v1beta/models/${model}:generateContent`, {
          method: 'POST', signal: ctl.signal,
          headers: { 'x-goog-api-key': env.GEMINI_API_KEY, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: LEAD_PROMPT }] },
            contents: [{ role: 'user', parts: [{ text: tr }] }],
            generationConfig: { responseMimeType: 'application/json', temperature: 0, maxOutputTokens: 800, ...extra },
          }),
        });
      } catch (e) { r = null; steps.push(model + ' timeout'); }
      clearTimeout(timer);
      if (r && r.status === 400 && extra.thinkingConfig && /thinking/i.test(await r.clone().text())) { steps.push(model + ' no-thinking-level'); continue; }
      break;
    }
    if (!r) { lastErr = 'timeout'; continue; }
    steps.push(model + ' ' + r.status + ' ' + (Date.now() - t0) + 'ms');
    if (!r.ok) { lastErr = r.status; if (r.status === 429) break; continue; }
    const j = await r.json();
    const txt = ((j.candidates && j.candidates[0] && j.candidates[0].content && j.candidates[0].content.parts) || []).filter(p => p.text && !p.thought).map(p => p.text).join('');
    try { fields = JSON.parse(txt.replace(/^```json|```$/g, '').trim()); } catch { fields = null; }
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
    if (request.method === 'GET' && path === '/') return json({ ok: true, service: 'nghe-trader-gemini', key: !!env.GEMINI_API_KEY, sheet: !!env.SHEET_URL }, 200, origin);
    if (request.method !== 'POST') return json({ error: 'POST only' }, 405, origin);
    if (!ALLOWED_ORIGINS.includes(origin)) return json({ error: 'forbidden' }, 403, origin); // chặn web khác xài ké
    if (!env.GEMINI_API_KEY) return json({ error: 'missing key' }, 500, origin);
    let data = {};
    try { data = await request.json(); } catch { /* body rỗng cũng được với /live-token */ }
    try {
      const out = path === '/live-token' ? await liveToken(env) : path === '/lead' ? await lead(env, data) : await chat(env, data);
      return json(out.body, out.status, origin);
    } catch (e) {
      return json({ error: 'network', detail: String(e).slice(0, 200) }, 502, origin);
    }
  },
};
