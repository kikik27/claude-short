# AI Sekarang Bisa Belanja Sendiri - soundtrack cue sheet

All sound is original: synthesized in numpy/scipy by `sfx_gen.py` / `instruments.py`, placed by `sfx.py` / `music.py`, mixed by `mix.py`.
Voice = `voice/voice.wav`, gain only (no EQ, no compression, no pitch).

## Files
| file | content |
|---|---|
| `mix.wav` | final mix, 48 kHz, stereo, 24-bit, 3,528,691 samples = 73.514 s |
| `stem_voice.wav` / `stem_music.wav` / `stem_sfx.wav` | stems at mix gain (they sum to the mix before the master limiter) |

## Master loudness (own BS.1770-4 meter)
- Integrated **-15.0 LUFS**, true peak **-1.2 dBTP**, LRA 2.1 LU, max momentary -11.2 LUFS, max short-term -13.8 LUFS
- Stems: voice -15.0 LUFS, music -25.3 LUFS, sfx -40.1 LUFS (voice gain +6.20 dB, same gain on every stem)
- Master limiter (4x oversampled look-ahead, ceiling -1.2 dBTP): max gain reduction 3.68 dB, active (>0.1 dB) on 8.50 % of samples, >0.5 dB on 3.40 %

ffmpeg ebur128 cross-check:
```
Summary:
  Integrated loudness:
    I:         -15.0 LUFS
    Threshold: -25.2 LUFS
  Loudness range:
    LRA:         2.1 LU
    Threshold: -35.2 LUFS
    LRA low:   -16.3 LUFS
    LRA high:  -14.2 LUFS
  True peak:
    Peak:       -1.2 dBFS
```

## Voice on top: per-section loudness (LUFS, integrated per stem, at mix gain)
bed = music + sfx. margin = voice - bed (integrated over the section). speech median / p10 = median and 10th percentile of the 400 ms momentary margin (voice - bed) over windows centred on spoken words.

| section (shots) | time s | voice | music | sfx | bed | margin LU | speech median LU | speech p10 LU |
|---|---|---|---|---|---|---|---|---|
| hook (1) | 0.00-5.53 | -14.3 | -23.7 | -42.9 | -23.7 | 9.5 | 9.4 | 6.7 |
| wide (2) | 5.53-8.87 | -13.9 | -26.4 | -38.9 | -26.2 | 12.3 | 12.6 | 10.3 |
| wallet (3) | 8.87-17.70 | -14.6 | -24.5 | -43.0 | -24.4 | 9.8 | 9.5 | 6.5 |
| sky (4) | 17.70-29.13 | -15.3 | -25.3 | -39.4 | -25.2 | 9.9 | 10.4 | 7.1 |
| phone (5) | 29.13-35.10 | -15.1 | -26.1 | -40.8 | -26.1 | 11.0 | 14.0 | 10.6 |
| token (6) | 35.10-49.23 | -15.3 | -25.3 | -42.0 | -25.2 | 9.9 | 10.4 | 5.9 |
| street (7) | 49.23-73.51 | -15.0 | -25.6 | -42.2 | -25.5 | 10.5 | 10.7 | 7.0 |

## Music map (original bouncy score, C major, 100 bpm: quarter note = 0.6 s)
Music target per section, LU under the voice (after a -3 dB speech duck keyed from words.json): hook -9.5, room -10.5, sky -10.0, phone -11.0, token -10.0, street -10.5. Applied section gains (dB): hook -4.2, room -7.8, sky -10.1, phone -5.7, token -4.9, street -9.9.

Rides (music only, dB): 4.91-5.56 s -3.0, 48.64-49.24 s -2.0, 68.44-69.24 s -3.0 - so quiet sentence-final words stay on top and the music blooms in the gaps after them.

| time s | frame | music |
|---|---|---|
| 0.00 | 0 | hook: theme bars 1-2, pluck + pad, light |
| 5.56 | 167 | room: theme continues, glock doubling, bass + brush join |
| 17.72 | 532 | sky: theme up an octave on musicbox, sparkle |
| 29.16 | 875 | phone: sparse pad + soft pluck under the approval |
| 35.12 | 1054 | token: glock chime motif |
| 49.24 | 1477 | street: warm return, full theme |
| 68.94 | 2068 | final C chord on the closing question, rings out |

## SFX events
Level convention: every EVENT has a naive level (LU vs the voice stem, as the event's max momentary loudness); applied = naive - 6 dB (standard mix rule) + distance/intensity offsets. BEDS are integrated loudness, not reduced. 'mix LUFS' = the event's max momentary loudness in the final mix (voice stem = -15.0 LUFS integrated). Picture sounds also get the camera-distance low-pass and more reverb.

| # | time s | frame | cue | what | naive LU | applied LU | mix LUFS | pan |
|---|---|---|---|---|---|---|---|---|
| 1 | 0.000 | 0.0 | amb_room (bed, integrated) | living room air: soft breeze + indoor hum (shots 1-3) | -30 | -30.0 | -45.0 | +0.00 |
| 2 | 1.040 | 31.2 | dots_pop | Dots pops out of the phone (burst + rise) | -8 | -21.5 | -36.8 | +0.10 |
| 3 | 5.533 | 166.0 | whoosh_cam | camera cut to the wide living room | -11 | -17.0 | -32.0 | +0.00 |
| 4 | 5.560 | 166.8 | flash_whoosh | reverse swell into the white flash after the hook + soft low whoomp | -5 | -11.0 | -26.0 | +0.00 |
| 5 | 8.867 | 266.0 | whoosh_cam | camera cut to the wallet close-up | -11 | -17.0 | -32.0 | +0.00 |
| 6 | 12.080 | 362.4 | wallet_shimmer | wallet appears in Dots' hands: 3 ascending clinks | -10 | -22.3 | -37.5 | +0.10 |
| 7 | 17.700 | 531.0 | amb_sky (bed, integrated) | high wind + a distant sparrow (shot 4, floating platform) | -27 | -27.0 | -42.0 | +0.00 |
| 8 | 17.700 | 531.0 | whoosh_cam | camera cut to the floating platform | -11 | -17.0 | -32.0 | +0.00 |
| 9 | 26.540 | 796.2 | compare_tick | compare tick 1/3 | -12 | -28.0 | -43.7 | -0.15 |
| 10 | 26.540 | 796.2 | whoosh_cam | camera push to the cards | -12 | -18.0 | -33.0 | +0.00 |
| 11 | 26.720 | 801.6 | compare_tick | compare tick 2/3 | -12 | -28.0 | -43.7 | +0.15 |
| 12 | 26.900 | 807.0 | compare_tick | compare tick 3/3 | -12 | -28.0 | -43.6 | -0.15 |
| 13 | 27.220 | 816.6 | pick_thud | chosen rice cooker drops into the cart | -8 | -24.0 | -39.5 | +0.20 |
| 14 | 27.220 | 816.6 | whoosh_cam | camera push to the cart | -12 | -18.0 | -33.0 | +0.00 |
| 15 | 29.133 | 874.0 | amb_room (bed, integrated) | living room air (shots 5-6) | -30 | -30.0 | -45.0 | +0.00 |
| 16 | 29.133 | 874.0 | whoosh_cam | camera cut to the big phone | -11 | -17.0 | -32.0 | +0.00 |
| 17 | 31.820 | 954.6 | tap_click | finger taps the fingerprint: click + shimmer | -10 | -17.6 | -32.7 | +0.00 |
| 18 | 35.100 | 1053.0 | whoosh_cam | camera cut to the card | -11 | -17.0 | -32.0 | +0.00 |
| 19 | 44.180 | 1325.4 | token_chime | card becomes a gold token: 4-note chime + whoosh | -8 | -18.3 | -33.7 | +0.00 |
| 20 | 44.180 | 1325.4 | whoosh_cam | camera push to the token | -12 | -18.0 | -33.0 | +0.00 |
| 21 | 49.233 | 1477.0 | amb_street (bed, integrated) | golden-hour street: soft breeze, blackbird phrases, faint crickets (shot 7) | -29 | -29.0 | -44.0 | +0.00 |
| 22 | 49.233 | 1477.0 | whoosh_cam | camera cut to the golden street | -11 | -17.0 | -32.0 | +0.00 |
| 23 | 55.400 | 1662.0 | clock_tick | waiting clock tick 1/2 | -12 | -31.0 | -47.2 | -0.20 |
| 24 | 55.400 | 1662.0 | whoosh_cam | camera push to the clock | -12 | -18.0 | -33.0 | +0.00 |
| 25 | 55.900 | 1677.0 | clock_tick | waiting clock tick 2/2 | -12 | -31.0 | -47.5 | -0.20 |
| 26 | 68.940 | 2068.2 | cta_chime | closing question chime | -12 | -31.0 | -47.0 | +0.00 |
| 27 | 70.840 | 2125.2 | whoosh_cam | camera crane out, ending | -12 | -18.0 | -33.0 | +0.00 |
