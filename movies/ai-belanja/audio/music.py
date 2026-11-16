# Original light bouncy score for "AI Sekarang Bisa Belanja Sendiri" (C major,
# 100 bpm: quarter note = 0.6 s). Plucky melody + warm pad + light brush,
# composed and synthesized here with instruments.py. Sections follow the
# picture: hook | room | sky (floating platform) | phone (approval) | token |
# golden street. All times come from timeline.py, so re-running gen_timings.py
# re-syncs the music with a new VO.
import numpy as np
from dsp import SR, ns, rng, pan, place, fades, dbg, make_ir, convolve_st, integrated, lp, hp
import instruments as I
import timeline as T

N = ns(T.DUR)
Q = 0.6  # quarter note (s) at 100 bpm
F = I.m2f

# where each section of the music sits (used for the cue sheet and the level automation)
SECTIONS = [
    ("hook", 0.0, T.FLASH),
    ("room", T.FLASH, T.S3_END),
    ("sky", T.S3_END, T.S4_END),
    ("phone", T.S4_END, T.S5_END),
    ("token", T.S5_END, T.S6_END),
    ("street", T.S6_END, T.DUR),
]

# bouncy 8-bar theme (bar, beat, length in quarters, midi) — pluck / glock register
THEME = [
    (1, 0, 1, 76), (1, 1, 1, 79), (1, 2, 1, 81), (1, 3, 1, 79),
    (2, 0, 1, 76), (2, 1, 1, 74), (2, 2, 1, 72), (2, 3, 1, 74),
    (3, 0, 1, 76), (3, 1, 1, 79), (3, 2, 1, 81), (3, 3, 1, 84),
    (4, 0, 1, 83), (4, 1, 1, 79), (4, 2, 1, 76), (4, 3, 1, 72),
    (5, 0, 1, 74), (5, 1, 1, 77), (5, 2, 1, 81), (5, 3, 1, 79),
    (6, 0, 1, 77), (6, 1, 1, 76), (6, 2, 1, 74), (6, 3, 1, 72),
    (7, 0, 1, 76), (7, 1, 1, 79), (7, 2, 1, 84), (7, 3, 1, 83),
    (8, 0, 1, 81), (8, 1, 1, 79), (8, 2, 1, 76), (8, 3, 2, 72),
]
# chord per bar: (root midi, third, fifth) as pad tones
CHORDS = [
    (48, 52, 55),  # C
    (43, 47, 50),  # G
    (45, 48, 52),  # Am
    (41, 45, 48),  # F
    (48, 52, 55),  # C
    (43, 47, 50),  # G
    (41, 45, 48),  # F
    (48, 52, 55),  # C
]


def theme_events(t_bar1, bars=range(1, 9), transpose=0):
    ev = []
    for (b, beat, d, m) in THEME:
        if b not in bars:
            continue
        ev.append((t_bar1 + (b - 1) * 4 * Q + beat * Q, d * Q, m + transpose))
    return ev


class Band:
    def __init__(self):
        self.tr = {}
        self.send = {}
        self.cues = []

    def track(self, name, send):
        if name not in self.tr:
            self.tr[name] = np.zeros((2, N))
            self.send[name] = send
        return self.tr[name]

    def add(self, name, x, t, p=0.0, g=1.0, send=0.15):
        buf = self.track(name, send)
        place(buf, pan(x, p) if np.ndim(x) == 1 else x, t, g)


R = rng(1607)


def _r():
    return rng(int(R.integers(1 << 30)))


def _pad_bar(b, t_bar, bar=1, vel=0.5):
    """one bar of warm pad under the melody"""
    notes = CHORDS[(bar - 1) % 8]
    freqs = [F(m) for m in notes]
    b.add("pad", I.pad(freqs, 4 * Q, vel, _r(), att=0.5, rel=0.7, warm=900.0), t_bar, 0.0)


def _bass_bar(b, t_bar, bar=1, vel=0.55):
    """walking-ish plucked bass: root on 1, fifth on 3"""
    root, _, fifth = CHORDS[(bar - 1) % 8]
    b.add("pluck", I.pluck(F(root - 12), vel, _r(), dur=0.5), t_bar, -0.1)
    b.add("pluck", I.pluck(F(fifth - 12), vel * 0.8, _r(), dur=0.5), t_bar + 2 * Q, -0.1)


def _brush_bar(b, t_bar, vel=0.4):
    for beat in range(4):
        b.add("brush", I.brush(vel, _r(), dur=0.3), t_bar + beat * Q, 0.15)


def _melody(b, t_bar1, bars=range(1, 9), inst="pluck", vel=0.65, transpose=0, p=0.0):
    for (t, d, m) in theme_events(t_bar1, bars, transpose):
        if inst == "pluck":
            x = I.pluck(F(m), vel, _r(), dur=min(d * 1.4, 0.9), bright=0.6)
        elif inst == "glock":
            x = I.glock(F(m), vel, _r(), dur=1.2)
        else:
            x = I.musicbox(F(m), vel, _r(), dur=1.2)
        b.add(inst, x, t, p)


def build():
    b = Band()
    # --- hook (0 - FLASH): theme bars 1-2, pluck + pad, very light
    t0 = 0.0
    for bar in (1, 2):
        _pad_bar(b, t0 + (bar - 1) * 4 * Q, bar=bar, vel=0.4)
    _melody(b, t0, bars=(1, 2), inst="pluck", vel=0.6)
    b.cues.append((0.0, "hook: theme bars 1-2, pluck + pad, light"))
    # --- room (FLASH - S3_END): theme bars 3-8, pluck + glock doubling + bass + brush
    t1 = T.FLASH
    nbars = max(1, int((T.S3_END - t1) / (4 * Q)))
    for k in range(nbars):
        bar = 3 + (k % 6)
        _pad_bar(b, t1 + k * 4 * Q, bar=bar, vel=0.5)
        _bass_bar(b, t1 + k * 4 * Q, bar=bar)
        _brush_bar(b, t1 + k * 4 * Q)
    _melody(b, t1, bars=tuple(3 + (k % 6) for k in range(nbars)), inst="pluck", vel=0.65)
    _melody(b, t1, bars=tuple(3 + (k % 6) for k in range(nbars)), inst="glock", vel=0.35, p=0.2)
    b.cues.append((T.FLASH, "room: theme continues, glock doubling, bass + brush join"))
    # --- sky (S3_END - S4_END): theme up an octave on musicbox, sparkle
    t2 = T.S3_END
    nbars2 = max(1, int((T.S4_END - t2) / (4 * Q)))
    for k in range(nbars2):
        _pad_bar(b, t2 + k * 4 * Q, bar=1 + (k % 8), vel=0.5)
        _bass_bar(b, t2 + k * 4 * Q, bar=1 + (k % 8), vel=0.45)
    _melody(b, t2, bars=tuple(1 + (k % 8) for k in range(nbars2)), inst="musicbox", vel=0.55, transpose=12)
    _melody(b, t2, bars=tuple(1 + (k % 8) for k in range(nbars2)), inst="glock", vel=0.3, transpose=12, p=-0.15)
    b.cues.append((T.S3_END, "sky: theme up an octave on musicbox, sparkle"))
    # --- phone (S4_END - S5_END): sparse — pad + soft pluck, room for the tap
    t3 = T.S4_END
    for bar in (1, 5):
        _pad_bar(b, t3 + (bar - 1) * 2 * Q, bar=bar, vel=0.45)
    _melody(b, t3, bars=(1,), inst="pluck", vel=0.5)
    b.cues.append((T.S4_END, "phone: sparse pad + soft pluck under the approval"))
    # --- token (S5_END - S6_END): glock chime motif, bars 7-8
    t4 = T.S5_END
    nbars4 = max(1, int((T.S6_END - t4) / (4 * Q)))
    for k in range(nbars4):
        _pad_bar(b, t4 + k * 4 * Q, bar=7 + (k % 2), vel=0.5)
    _melody(b, t4, bars=tuple(7 + (k % 2) for k in range(nbars4)), inst="glock", vel=0.55, transpose=12)
    b.cues.append((T.S5_END, "token: glock chime motif"))
    # --- street (S6_END - DUR): warm return, full theme, final chord on the CTA
    t5 = T.S6_END
    nbars5 = max(1, int((T.DUR - t5) / (4 * Q)))
    for k in range(nbars5):
        bar = 1 + (k % 8)
        _pad_bar(b, t5 + k * 4 * Q, bar=bar, vel=0.55)
        _bass_bar(b, t5 + k * 4 * Q, bar=bar, vel=0.5)
        _brush_bar(b, t5 + k * 4 * Q, vel=0.35)
    _melody(b, t5, bars=tuple(1 + (k % 8) for k in range(nbars5)), inst="pluck", vel=0.65)
    _melody(b, t5, bars=tuple(1 + (k % 8) for k in range(nbars5)), inst="glock", vel=0.3, p=0.2)
    # final C chord rings out from the CTA question to the end
    b.add("pad", I.pad([F(48), F(52), F(55), F(60)], T.DUR - T.CTA_T, 0.6, _r(), att=0.3, rel=1.2), T.CTA_T, 0.0)
    b.add("glock", I.glock(F(72), 0.5, _r(), dur=2.0), T.CTA_T, 0.0)
    b.add("glock", I.glock(F(76), 0.4, _r(), dur=2.0), T.CTA_T + 0.15, 0.1)
    b.cues.append((T.S6_END, "street: warm return, full theme"))
    b.cues.append((T.CTA_T, "final C chord on the closing question, rings out"))
    end = np.ones(N)
    a = ns(T.DUR - 0.4)
    end[a:] = np.linspace(1, 0, N - a) ** 1.5
    for k in b.tr:
        b.tr[k] *= end[None, :]
    return b


TARGET = {  # relative balance inside the band (LU, measured on each track's own active span)
    "pluck": -4.0, "glock": -6.0, "musicbox": -3.0, "pad": -3.5, "brush": -13.0,
}


def render(b, ref=-20.0):
    hall = make_ir(1.5, 7, pre=0.018, hf=1.4)
    dry = np.zeros((2, N))
    wet_hall = np.zeros((2, N))
    levels = {}
    for k, x in b.tr.items():
        if not np.any(x):
            continue
        L = integrated(x)
        g = dbg(ref + TARGET.get(k, -6) - L)
        levels[k] = (round(L, 1), round(ref + TARGET.get(k, -6), 1))
        x = x * g
        b.tr[k] = x
        dry += x
        wet_hall += b.send[k] * x
    out = dry + 0.7 * convolve_st(wet_hall.mean(0), hall)
    out = hp(out, 30, 2)
    return out, levels
