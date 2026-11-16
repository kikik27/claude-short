# Picture timeline for "AI Sekarang Bisa Belanja Sendiri" (7 shots, 54.12 s),
# mirrored from remotion/src/videos/ai-belanja/story.ts + timing.ts so every
# sound lands on the frame. All times come from voice/timing.json (generated
# by gen_timings.py from voice/words.json); if that file is missing (new VO
# not transcribed yet) the PROVISIONAL constants below are used instead.
# Re-run gen_timings.py when the new VO arrives and this file re-syncs.
import json
import math
import os

import numpy as np

FPS = 30
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)

# --- provisional timing (word-count estimates, 174 words / 73.51 s = 0.422 s/word
# for the ElevenLabs VO) ---
PROVISIONAL = {
    "TOTAL": 2205, "S1_END": 5.49, "S2_END": 8.03, "S3_END": 16.90,
    "S4_END": 27.03, "S5_END": 32.52, "S6_END": 48.58,
    "DOTS_POP": 0.84, "WALLET_T": 11.40, "COMPARE_T": 24.50, "PICK_T": 25.34,
    "TAP_T": 29.15, "TOKEN_T": 43.50, "WAIT_T": 54.90, "CTA_T": 69.30,
    "DUR": 73.51,
}


def _load():
    p = os.path.join(ROOT, "voice", "timing.json")
    if os.path.exists(p):
        with open(p, encoding="utf-8") as f:
            d = json.load(f)
        out = dict(PROVISIONAL)
        if "events" in d:  # nested format written by gen_timings.py
            out.update(d["events"])
            out["TOTAL"] = int(d["total_frames"])
            out["DUR"] = float(d["duration"])
        else:  # flat format
            out.update(d)
        return out
    return dict(PROVISIONAL)


_T = _load()
TOTAL = int(_T["TOTAL"])
DUR = float(_T.get("DUR", TOTAL / FPS))
fr = lambda f: f / FPS

S1_END, S2_END, S3_END, S4_END, S5_END, S6_END = (
    _T["S1_END"], _T["S2_END"], _T["S3_END"], _T["S4_END"], _T["S5_END"], _T["S6_END"])
DOTS_POP, WALLET_T, COMPARE_T, PICK_T, TAP_T, TOKEN_T, WAIT_T, CTA_T = (
    _T["DOTS_POP"], _T["WALLET_T"], _T["COMPARE_T"], _T["PICK_T"],
    _T["TAP_T"], _T["TOKEN_T"], _T["WAIT_T"], _T["CTA_T"])
FLASH = S1_END  # white flash after the hook

# id: (first frame, end frame, light, place)
SHOTS = {
    1: (0, int(S1_END * FPS), "day", "room"),
    2: (int(S1_END * FPS), int(S2_END * FPS), "day", "room"),
    3: (int(S2_END * FPS), int(S3_END * FPS), "day", "room"),
    4: (int(S3_END * FPS), int(S4_END * FPS), "day", "sky"),
    5: (int(S4_END * FPS), int(S5_END * FPS), "day", "room"),
    6: (int(S5_END * FPS), int(S6_END * FPS), "day", "room"),
    7: (int(S6_END * FPS), TOTAL, "golden", "street"),
}
XFADE = {4: 8, 5: 8, 7: 10}


def shot_t(i):
    a, b = SHOTS[i][:2]
    return fr(a), fr(b)


def shot_at(t):
    f = t * FPS
    for i, (a, b, *_r) in SHOTS.items():
        if a <= f < b:
            return i
    return 7


def easeout(u):
    u = min(1.0, max(0.0, u))
    return 1 - (1 - u) ** 4


# camera -> subject distance (m) per shot, from the camera keys in story.ts
# (frame, move frames, metres); log-interpolated like the template.
CAM_DIST = {
    1: [(0, 0, 4.3), (30, 30, 3.4)],
    2: [(121, 0, 7.3)],
    3: [(177, 0, 3.4)],
    4: [(373, 0, 16.7), (551, 28, 6.0), (569, 20, 6.2)],
    5: [(597, 0, 2.1), (653, 26, 1.55)],
    6: [(719, 0, 2.93), (970, 28, 2.42)],
    7: [(1073, 0, 22.4), (1223, 30, 6.1), (1534, 90, 20.0)],
}


def cam_distance(t):
    s = shot_at(t)
    keys = CAM_DIST.get(s)
    if not keys:
        return 5.0
    f = t * FPS
    ld = math.log(keys[0][2])
    for kf, dur, d in keys[1:]:
        if f < kf:
            break
        ld = ld + (math.log(d) - ld) * easeout((f - kf) / max(dur, 1))
    return math.exp(ld)


def dist_fx(d):
    """distance -> (gain dB, low-pass Hz, reverb send) used for all picture sounds"""
    d = max(d, 1.2)
    g = -14.0 * math.log10(d / 1.2)
    lpf = float(np.clip(17000 * (1.2 / d) ** 0.55, 1800, 17000))
    send = 0.06 + 0.45 * float(np.clip(math.log(d / 1.2) / math.log(25), 0, 1))
    return g, lpf, send


def words(path):
    return json.load(open(path, encoding="utf-8"))
