// Xuất toàn bộ câu trả lời của chatbot ra answers.json để tạo giọng.
// Dùng: node tools/vieneu/export_answers.js > tools/vieneu/answers.json
const fs = require('fs'), path = require('path');
const src = fs.readFileSync(path.join(__dirname, '../../thu-vien-tai-lieu-github/chatbot.js'), 'utf8');
const head = src.slice(src.indexOf('var CFG'), src.indexOf('/* ------------------------------------------------------------------ */\n  /*  KIẾN THỨC'));
const body = src.slice(src.indexOf('var KB = ['), src.indexOf('  var fbTurn'));
const r = new Function('window', 'navigator', head + body + '; return {KB:KB,WELCOME:WELCOME,FALLBACK:FALLBACK,SALES_FALLBACK:SALES_FALLBACK};')({ NT_CHATBOT_CONFIG: {} }, { userAgent: '' });
const out = r.KB.map(k => ({ id: k.id, a: k.a }));
r.SALES_FALLBACK.forEach(f => { if (!out.some(o => o.id === f.id)) out.push({ id: f.id, a: f.a }); });
out.push({ id: 'barge_ack', a: 'Dạ, em nghe đây, anh/chị cứ nói ạ.' });
out.push({ id: 'welcome', a: r.WELCOME }, { id: 'fallback', a: r.FALLBACK }, { id: 'greet', a: 'Dạ, em chào anh/chị! Anh/chị đang quan tâm điều gì ạ?' });
process.stdout.write(JSON.stringify(out, null, 1));
