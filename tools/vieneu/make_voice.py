"""Tạo sẵn file giọng (VieNeu-TTS, giọng Hải Đăng) cho mọi câu trả lời của chatbot.

Dùng: python3 make_voice.py answers.json OUT_DIR [--voice "Hải Đăng"] [--only id1,id2]
Kết quả: OUT_DIR/<id>.mp3 và OUT_DIR/manifest.json  ({id: {"file":..., "hash":...}})
Chỉ tạo lại câu nào có nội dung thay đổi (so hash).
"""
import argparse, hashlib, json, os, subprocess, sys, time, wave
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from vi_normalize import sentences

ap = argparse.ArgumentParser()
ap.add_argument('answers'); ap.add_argument('out')
ap.add_argument('--voice', default='Kim Thanh'); ap.add_argument('--only', default='')
args = ap.parse_args()

os.makedirs(args.out, exist_ok=True)
man_path = os.path.join(args.out, 'manifest.json')
manifest = json.load(open(man_path, encoding='utf-8')) if os.path.exists(man_path) else {}
items = json.load(open(args.answers, encoding='utf-8'))
only = set(filter(None, args.only.split(',')))

from vieneu import Vieneu
tts = Vieneu()
SR = None
GAP = 0.25   # nghỉ giữa các câu (giây)
PARA = 0.35  # nghỉ giữa các đoạn


def to_float(a):
    a = np.asarray(a, dtype=np.float32).reshape(-1)
    return a


t0 = time.time()
for it in items:
    sid, text = it['id'], it['a']
    sents = sentences(text)
    h = hashlib.sha1((args.voice + '|' + json.dumps(sents, ensure_ascii=False)).encode()).hexdigest()[:12]
    if only and sid not in only:
        continue
    mp3 = os.path.join(args.out, sid + '.mp3')
    if manifest.get(sid, {}).get('hash') == h and os.path.exists(mp3):
        print('skip', sid); continue
    chunks = []
    for s in sents:
        if s is None:
            chunks.append(('gap', PARA)); continue
        tmp = '/tmp/_vn_part.wav'
        tts.save(tts.infer(s, voice=args.voice), tmp)
        with wave.open(tmp) as w:
            SR = w.getframerate(); ch = w.getnchannels(); sw = w.getsampwidth()
            raw = w.readframes(w.getnframes())
        arr = np.frombuffer(raw, dtype=np.int16).astype(np.float32) / 32768.0
        if ch > 1:
            arr = arr.reshape(-1, ch).mean(axis=1)
        # cắt bớt im lặng đầu/cuối để ghép tự nhiên
        thr = 0.01; idx = np.where(np.abs(arr) > thr)[0]
        if len(idx):
            arr = arr[max(0, idx[0] - int(0.03 * SR)): idx[-1] + int(0.06 * SR)]
        chunks.append(('audio', arr)); chunks.append(('gap', GAP))
    parts = []
    for kind, v in chunks:
        if kind == 'gap':
            if parts and isinstance(parts[-1], tuple):
                parts[-1] = ('gap', max(parts[-1][1], v))
            else:
                parts.append(('gap', v))
        else:
            parts.append(v)
    while parts and isinstance(parts[-1], tuple):
        parts.pop()
    full = np.concatenate([np.zeros(int(p[1] * SR), np.float32) if isinstance(p, tuple) else p for p in parts])
    peak = np.max(np.abs(full)) or 1.0
    full = (full / peak * 0.89 * 32767).astype(np.int16)
    wav = '/tmp/_vn_full.wav'
    with wave.open(wav, 'wb') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes(full.tobytes())
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', wav, '-ac', '1', '-ar', '24000', '-b:a', '48k', mp3], check=True)
    manifest[sid] = {'file': sid + '.mp3', 'hash': h, 'sec': round(len(full) / SR, 1)}
    json.dump(manifest, open(man_path, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print('ok', sid, manifest[sid]['sec'], 's', 'elapsed', round(time.time() - t0), 's', flush=True)
print('DONE', len(manifest), 'files')
