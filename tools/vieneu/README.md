# Giọng đọc chatbot (VieNeu-TTS, giọng Hải Đăng)

Chatbot phát file giọng tạo sẵn trong `thu-vien-tai-lieu-github/assets/voice/`.
Thiếu file nào thì chatbot tự dùng giọng của trình duyệt. Không gọi dịch vụ trả phí nào.

## Tạo lại giọng sau khi sửa câu trả lời trong chatbot.js

```bash
pip install vieneu
pip install onnxruntime==1.22.1     # nếu báo lỗi đường dẫn/symlink của onnxruntime
node tools/vieneu/export_answers.js > tools/vieneu/answers.json
python3 tools/vieneu/make_voice.py tools/vieneu/answers.json thu-vien-tai-lieu-github/assets/voice --voice "Hải Đăng"
```

- Chỉ câu nào đổi nội dung mới được tạo lại (so mã hash trong `manifest.json`).
- Đổi giọng: thay `--voice` bằng `"Mai Anh"`, `"Trúc Ly"`, `"Quang Sơn"`, `"Thiện Minh"`...
  (xem đủ bằng `Vieneu().list_preset_voices()`). Đổi giọng thì tất cả câu được tạo lại.
- Chuẩn hóa chữ (số thành chữ, phiên âm PassView, TradePro, Zalo...) nằm trong `vi_normalize.py`.
  Thêm từ cần phiên âm vào danh sách `PHONETIC`.
- Lần chạy đầu tự tải mô hình từ HuggingFace (vài trăm MB). Trên CPU mất khoảng 1 giây cho 1 giây âm thanh.
