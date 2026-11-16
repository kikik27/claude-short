# shorts

Short video animasi untuk akun personal Zaky — kartun 3D (three.js +
Remotion), narasi Bahasa Indonesia. Satu folder per video di `movies/`, jadi
video baru tinggal tambah folder dengan layout yang sama.

## Struktur

```text
movies/<slug>/
  remotion/        project Remotion (src/, public/, package.json)
  voice/           voice.wav + words.json + timing.json
  audio/           mix.wav + stem + cues.md + pipeline Python
  script.md        naskah narasi
  README-RENDER.md panduan render + syarat laptop
```

## Video yang sudah ada

- `movies/ai-belanja/` — "AI Sekarang Bisa Belanja Sendiri" (ChatGPT Wallet,
  13 Nov 2026). Durasi ~74 detik. VO sementara ElevenLabs "Roger". Render
  di laptop, lihat `movies/ai-belanja/README-RENDER.md`.

## Audio

File audio (WAV) tidak ikut ter-commit dari build awal karena batas upload
connector — tambahkan sendiri dari paket render:

```bash
git clone https://github.com/kikik27/claude-short.git
cd shorts
# ekstrak ai-belanja-render-package.tar.gz, lalu salin:
cp <paket>/voice/voice.wav movies/ai-belanja/voice/
cp <paket>/audio/mix.wav movies/ai-belanja/audio/
cp <paket>/audio/stem_*.wav movies/ai-belanja/audio/
git add movies/ai-belanja/voice/voice.wav movies/ai-belanja/audio/
git commit -m "Add ai-belanja audio"
git push
```

## Video baru

1. Buat folder `movies/<slug>/` dengan layout di atas.
2. Naskah di `script.md`, VO di `voice/`, mix di `audio/`, project di
   `remotion/` (komposisi baru di `src/videos/<slug>/`).
3. Tulis `README-RENDER.md` dengan perintah rendernya.
4. Commit dan push seperti biasa.
