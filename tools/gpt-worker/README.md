# Bộ não GPT cho chatbot Nghề Trader (Cloudflare Worker)

Máy chủ nhỏ giấu khóa OpenAI. Web gửi câu hỏi tới đây, máy chủ hỏi GPT rồi trả lời lại.
Chỉ trang `brosentertainmentbros-creator.github.io` được dùng (danh sách `ALLOWED_ORIGINS` trong worker.js).

## 1. Lấy khóa OpenAI
1. Vào https://platform.openai.com, đăng nhập.
2. **Settings → Billing**: nạp tiền (ví dụ 5 USD) và đặt **giới hạn chi tiêu hằng tháng**.
3. **API keys → Create new secret key**, chép khóa (bắt đầu bằng `sk-`). Không gửi khóa này cho ai, không dán vào web.

## 2. Tạo Worker trên Cloudflare (miễn phí)
1. Vào https://dash.cloudflare.com, đăng ký/đăng nhập.
2. **Workers & Pages → Create → Create Worker** (mẫu Hello World), đặt tên ví dụ `nghetrader-gpt`, bấm **Deploy**.
3. Bấm **Edit code**, xóa hết, dán toàn bộ nội dung `worker.js`, bấm **Deploy**.
4. Vào **Settings → Variables and Secrets → Add**: loại **Secret**, tên `OPENAI_API_KEY`, giá trị là khóa `sk-...`. Lưu.
5. Chép địa chỉ Worker, dạng `https://nghetrader-gpt.<tên>.workers.dev`.

## 3. Gắn vào web
Trong `thu-vien-tai-lieu-github/chatbot.js`, đặt `aiEndpoint: 'https://nghetrader-gpt.<tên>.workers.dev'`.
GPT lỗi hoặc chậm quá 10 giây thì chatbot tự dùng kịch bản có sẵn.

## Ghi chú
- Đổi model: thêm biến `MODEL` (loại Text) trong Cloudflare, ví dụ `gpt-6-luna` (mặc định, rẻ nhất) hoặc model mạnh hơn.
- Sửa cách tư vấn, sản phẩm, quy tắc: sửa `SYSTEM_PROMPT` trong worker.js rồi Deploy lại.
