"""Chuẩn hóa chữ tiếng Việt trước khi đưa vào VieNeu-TTS.

- Bỏ markdown (**đậm**, [link](url), gạch đầu dòng)
- Phiên âm từ tiếng Anh / tên riêng
- Viết số thành chữ (số nguyên, phần trăm, số thập phân kiểu 0,02)
- Tách thành từng câu ngắn để đọc tự nhiên
"""
import re

DIGITS = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín']


def _two(n, full):
    """0..99; full=True khi đứng sau hàng trăm (cần 'lẻ')."""
    t, u = divmod(n, 10)
    if t == 0:
        if not full:
            return DIGITS[u]
        return '' if u == 0 else 'lẻ ' + DIGITS[u]
    head = 'mười' if t == 1 else DIGITS[t] + ' mươi'
    if u == 0:
        return head
    if u == 5:
        tail = 'lăm'
    elif u == 1 and t > 1:
        tail = 'mốt'
    elif u == 4 and t > 1:
        tail = 'tư'
    else:
        tail = DIGITS[u]
    return head + ' ' + tail


def _three(n, full):
    h, r = divmod(n, 100)
    if h == 0 and not full:
        return _two(r, False)
    s = DIGITS[h] + ' trăm'
    rest = _two(r, True)
    return s + (' ' + rest if rest else '')


def num2words(n):
    n = int(n)
    if n == 0:
        return 'không'
    units = ['', ' nghìn', ' triệu', ' tỷ']
    parts, i = [], 0
    while n > 0:
        n, chunk = divmod(n, 1000)
        parts.append((chunk, i))
        i += 1
    out = []
    for idx, (chunk, lvl) in enumerate(reversed(parts)):
        if chunk == 0:
            continue
        full = idx > 0
        out.append(_three(chunk, full) + units[lvl])
    return ' '.join(out)


def read_digits(s):
    return ' '.join(DIGITS[int(c)] for c in s if c.isdigit())


# Thứ tự quan trọng: cụm dài trước, cụm ngắn sau
PHONETIC = [
    (r'support@giaiphapgiaodich\.com', 'súp pót, a còng, giải pháp giao dịch chấm com'),
    (r'giaiphapgiaodich\.com', 'giải pháp giao dịch chấm com'),
    (r'0905 ?890 ?399', 'không chín không năm, tám chín không, ba chín chín'),
    (r'TMLabs Coffee', 'tê em láp cà phê'),
    (r'TP\. ?Hồ Chí Minh', 'thành phố Hồ Chí Minh'),
    (r'\b84A\b', 'tám mươi tư a'),
    (r'Lớp học TradePro', 'Lớp học trết pro'),
    (r'Bot AI TradePro', 'bót ây ai trết pro'),
    (r'TradePro', 'trết pro'),
    (r'Pass ?View|Path ?View', 'pát viu'),
    (r'Nghề Trader', 'Nghề trết đơ'),
    (r'\bTrader\b|\btrader\b', 'trết đơ'),
    (r'\btrade\b', 'trết'),
    (r'Bot AI', 'bót ây ai'),
    (r'\bAI\b', 'ây ai'),
    (r'\b[Bb]ot\b', 'bót'),
    (r'\brobot\b', 'rô bốt'),
    (r'Zalo', 'da lô'),
    (r'Forex', 'pho rếch'),
    (r'\bDoji\b', 'đô di'),
    (r'EUR/USD', 'ơ rô đô la Mỹ'),
    (r'XAU/USD', 'vàng so với đô la Mỹ'),
    (r'stop loss', 'sờ tóp lốt'),
    (r'\bdemo\b', 'đê mô'),
    (r'view-only', 'chỉ xem'),
    (r'\bemail\b|\bEmail\b', 'i meo'),
    (r'\bwebsite\b|\bWebsite\b', 'oép sai'),
    (r'Google Maps', 'gu gồ máp'),
    (r'\bChrome\b', 'crôm'),
    (r'\bEdge\b', 'ét'),
    (r'\bvideo\b', 'vi đê ô'),
    (r'\bVideo\b', 'Vi đê ô'),
    (r'\bonline\b', 'on lai'),
    (r'\bfollow\b', 'phô lô'),
    (r'anh/chị', 'anh chị'),
    (r'mua/bán', 'mua bán'),
    (r'(\d+)\s*[–-]\s*(\d+)\s*%', lambda m: num2words(m.group(1)) + ' đến ' + num2words(m.group(2)) + ' phần trăm'),
    (r'(\d+)\s*%', lambda m: num2words(m.group(1)) + ' phần trăm'),
    (r'(\d+),(\d+)', lambda m: num2words(m.group(1)) + ' phẩy ' + read_digits(m.group(2))),
    (r'(\d{1,3}(?:\.\d{3})+)', lambda m: num2words(m.group(1).replace('.', ''))),
    (r'\d+', lambda m: num2words(m.group(0))),
]


def normalize(text):
    t = text
    t = re.sub(r'\[([^\]]+)\]\([^)]+\)', r'\1', t)          # link -> nhãn
    t = re.sub(r'\*\*(.+?)\*\*', r'\1', t)                   # **đậm**
    t = re.sub(r'\(([A-Za-z][A-Za-z \-]*)\)', '', t)          # (Hammer), (Bullish Engulfing)
    t = re.sub(r'^- ', '', t, flags=re.M)                    # gạch đầu dòng
    t = re.sub(r'[📞🎤▶↗💬★⭐…]', '', t)
    t = t.replace('“', '').replace('”', '').replace('"', '')
    for pat, rep in PHONETIC:
        t = re.sub(pat, rep, t)
    t = t.replace('/', ' ')
    t = re.sub(r'[ \t]+', ' ', t)
    return t.strip()


def sentences(text, max_len=180):
    """Tách thành câu ngắn; câu quá dài thì cắt ở dấu phẩy."""
    out = []
    for para in normalize(text).split('\n'):
        para = para.strip()
        if not para:
            continue
        para = re.sub(r'\s*:\s*', ', ', para)            # "Điện thoại: ..." -> nói liền, ngắt nhẹ
        para = re.sub(r'\s*\(\s*', ', ', para).replace(')', ',')
        para = re.sub(r',\s*([,.!?])', r'\1', para).replace(',,', ',')
        for s in re.split(r'(?<=[.!?;])\s+', para):
            s = s.strip().rstrip(',;').strip()
            if not s:
                continue
            if s[-1] not in '.!?':
                s += '.'
            while len(s) > max_len:
                cut = s.rfind(',', 0, max_len)
                if cut < 40:
                    break
                out.append(s[:cut].strip() + ',')
                s = s[cut + 1:].strip()
            out.append(s)
        out.append(None)  # đánh dấu hết đoạn -> nghỉ dài hơn
    while out and out[-1] is None:
        out.pop()
    return out


if __name__ == '__main__':
    for x in ['3.852', '0,02', '1–2%', '21', '15', '105', '1000', '2024', '84A Nguyễn Cửu Vân',
              'Gọi 0905 890 399 hoặc email support@giaiphapgiaodich.com',
              '**PassView** là công cụ (view-only) của Nghề Trader, xem [thư viện](./#thu-vien).']:
        print(repr(x), '->', normalize(x))
