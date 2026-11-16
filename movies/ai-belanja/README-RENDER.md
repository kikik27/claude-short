# AI Belanja — paket render (Remotion)

Short video vertikal 9:16 "AI Sekarang Bisa Belanja Sendiri" (durasi ~74 detik,
narasi Indonesia). Video kartun 3D (three.js + Remotion) + VO ElevenLabs
sementara + musik/SFX orisinal hasil sintesis. Render final dilakukan di
laptop ini — paket ini berisi semua yang dibutuhkan, tanpa `node_modules`.

## Isi paket

- `remotion/` — project Remotion (`src/`, `public/`, `package.json`,
  `package-lock.json`, `scripts/`)
- `voice/voice.wav` — VO final (48 kHz mono, 73,51 dtk)
- `voice/words.json` — timestamp per kata (dipakai untuk sinkronisasi + ducking musik)
- `voice/timing.json` — batas shot & event yang diturunkan dari `words.json`
- `audio/mix.wav` — mix final (VO + musik + SFX, 48 kHz stereo, 73,51 dtk)
- `audio/stem_voice.wav`, `audio/stem_music.wav`, `audio/stem_sfx.wav` — stem
- `audio/cues.md` — cue sheet + laporan loudness
- `audio/*.py` — pipeline audio (timeline/sfx/music/mix, numpy/scipy)
- `gen_timings.py` — regenerasi `timing.ts` + `voice/timing.json` dari `words.json`
- `script.md` — naskah narasi
- `out/stills/w_*.jpg` — 9 frame bukti hasil render (satu per shot + momen tap),
  sebagai referensi tampilan yang sudah lolos QA visual

## Syarat

- **Node.js v24.22.1** (versi yang dipakai saat build; Node 20+ kemungkinan bisa)
- npm (ikut Node), **ffmpeg** (untuk mux audio)
- Browser untuk Remotion: jalankan `npx remotion browser ensure` di `remotion/`
  (mengunduh Chromium), atau teruskan Chrome yang sudah ada dengan
  `--browser-executable="C:\Program Files\Google\Chrome\Application\chrome.exe"`
  (sesuaikan path; di macOS biasanya
  `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`).

## Render

Di dalam `remotion/`:

```bash
npm ci            # install dependensi (pertama kali saja)
npx remotion render AiBelanjaShort ai-belanja-silent.mp4 --scale=1.3333 --gl=swangle
```

- `--scale=1.3333` menghasilkan **1440x2560** (2K vertikal).
- `--gl=swangle` = software WebGL (SwiftShader). Pakai ini kalau laptop tidak
  punya GPU / render gagal dengan error "could not create a WebGL context".
  Kalau laptop punya GPU, boleh dihapus flag-nya (render lebih cepat).
- Render 2K di software memakan waktu lama (di VM build: puluhan detik per
  frame still; video penuh ~2205 frame — biarkan berjalan di background).
  Kalau terlalu lambat, render 1080x1920 saja dengan `--scale=1`.
- Remotion menulis video **tanpa audio** (silent track). Mux dengan mix:

```bash
ffmpeg -i ai-belanja-silent.mp4 -i ../audio/mix.wav \
  -map 0:v:0 -map 1:a:0 -c:v copy -c:a aac -shortest ai-belanja-final.mp4
```

Hasil akhir: `ai-belanja-final.mp4` (1080x1920 atau 1440x2560, ~74 dtk).

## Cek sebelum render

```bash
npx tsc --noEmit   # harus bersih untuk src/videos/ai-belanja (abaikan error
                   # di src/videos/bridge — itu copy template yang tidak dipakai)
```

Tes satu frame (bukti render jalan):

```bash
node scripts/stills.mjs ../out/stills/x_ 60 0.5
```

## Kalau VO diganti

Semua timing (batas shot, event, musik, SFX) diturunkan dari
`voice/words.json` — tidak ada frame yang di-timing manual. Kalau VO baru
datang:

1. Ganti `voice/voice.wav` (48 kHz mono) dan `voice/words.json`
   (transkripsi word-level, mis. faster-whisper medium, `language="id"`).
2. `python3 gen_timings.py` — menimpa `remotion/src/videos/ai-belanja/timing.ts`
   dan `voice/timing.json`.
3. Render ulang musik/SFX: `cd audio && python3 mix.py` (butuh numpy/scipy).
4. Render ulang video seperti di atas.

## Catatan

- Video tidak mengandung teks/caption di layar (sesuai skill) — cerita
  disampaikan visual + narasi.
- `node_modules/` dan folder tmp/bundle Remotion sengaja tidak disertakan.
- Patch lokal di VM build (`@remotion/renderer` soal deteksi port) tidak
  diperlukan di laptop normal — jangan ikut-sertakan `node_modules` lama.
