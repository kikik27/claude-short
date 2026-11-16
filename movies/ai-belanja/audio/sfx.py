# Every sound effect + ambience bed of "AI Sekarang Bisa Belanja Sendiri" as a
# cue list timed to the picture (timeline.py), rendered into one stereo SFX
# stem. Levels follow the user's standard mix: each EVENT has a "naive" level
# (LU relative to the voice stem, measured as the event's max momentary
# loudness) and is placed SFX_DB = -6 dB under it; ambience BEDS (integrated
# loudness) are not reduced. Distance to the camera adds gain, a low-pass and
# more reverb. All event times come from voice/timing.json via timeline.py,
# so re-running gen_timings.py re-syncs the sound.
import math

import numpy as np
from dsp import (SR, ns, tt, rng, dbg, lp, hp, bp, peq, shelf, pan, st, place, fades, widen, make_ir, convolve_st,
                 momentary_max, integrated, colored, smooth_noise, modal)
import sfx_gen as G
import timeline as T

N = ns(T.DUR)
SFX_DB = -6.0


class Cue:
    def __init__(self, t, name, desc, gen, naive, kind="event", p=0.0, extra=0.0, lpf=None, send=0.12, group=None, cut=None):
        self.t, self.name, self.desc, self.gen, self.naive = t, name, desc, gen, naive
        self.kind, self.p, self.extra, self.lpf, self.send, self.cut = kind, p, extra, lpf, send, cut
        self.group = group or name
        self.applied = naive + (SFX_DB if kind == "event" else 0.0) + extra
        self.measured = None


def _dist(t):
    """(gain dB, low-pass, reverb send) for a picture event at time t."""
    return T.dist_fx(T.cam_distance(t))


def cues():
    C = []
    R = rng(1607)
    rr = lambda: rng(int(R.integers(1 << 30)))
    add = C.append

    # ------------------------------------------------ ambience beds (not reduced by the -6 dB event rule)
    def amb_room(dur, seed=1):
        def g():
            r = rng(seed)
            n = ns(dur)
            x = G.breeze(dur, r, 0.55, 0.12, 700)
            x += st(bp(colored(n, r, 0.8), 120, 900, 1) * 0.35)   # soft indoor hum
            return fades(x, 0.4, 0.6), 0.0
        return g
    a1, b1 = T.shot_t(1)[0], T.shot_t(4)[0]
    add(Cue(a1, "amb_room", "living room air: soft breeze + indoor hum (shots 1-3)",
            _cut(amb_room(b1 - a1), b1 - a1, 0.4, 0.5), -30, "bed", send=0.0))
    a2, b2 = T.shot_t(5)[0], T.shot_t(7)[0]
    add(Cue(a2, "amb_room", "living room air (shots 5-6)",
            _cut(amb_room(b2 - a2, seed=2), b2 - a2, 0.4, 0.5), -30, "bed", send=0.0))

    def amb_sky(dur, seed=3):
        def g():
            r = rng(seed)
            x = G.breeze(dur, r, 1.0, 0.2, 1100)
            x += pan(G.bird_chirps(dur, r, 0.3, "sparrow") * 0.05, 0.5)
            return fades(x, 0.4, 0.6), 0.0
        return g
    a3, b3 = T.shot_t(4)
    add(Cue(a3, "amb_sky", "high wind + a distant sparrow (shot 4, floating platform)",
            _cut(amb_sky(b3 - a3), b3 - a3, 0.4, 0.5), -27, "bed", send=0.0))

    def amb_street(dur, seed=4):
        def g():
            r = rng(seed)
            n = ns(dur)
            x = G.breeze(dur, r, 0.7, 0.1, 650)
            x += st(lp(bp(colored(n, r, 0.8), 150, 1400, 1), 1200) * 0.35)
            x += pan(G.bird_chirps(dur, r, 0.35, "blackbird") * 0.06, -0.5)
            x += pan(G.bird_chirps(dur, r, 0.25, "blackbird") * 0.04, 0.6)
            x += widen(G.crickets(dur, r, 3) * 0.008, r, 9, 1.0)
            return fades(x, 0.5, 0.4), 0.0
        return g
    a4 = T.shot_t(7)[0]
    add(Cue(a4, "amb_street", "golden-hour street: soft breeze, blackbird phrases, faint crickets (shot 7)",
            _cut(amb_street(T.DUR - a4), T.DUR - a4, 0.5, 0.4), -29, "bed", send=0.0))

    # ------------------------------------------------ story events (camera distance applied)
    def ev(t, name, desc, gen, naive, p=0.0, group=None):
        g, lpf, send = _dist(t)
        add(Cue(t, name, desc, gen, naive, extra=max(g, -13.0), lpf=lpf, send=send, p=p, group=group or name))

    # Dots pops out of the phone: rising bloop + bright pop
    ev(T.DOTS_POP, "dots_pop", "Dots pops out of the phone (burst + rise)",
       lambda: (_pop(rng(100)), 0.0), -8, p=0.1, group="dots")
    # wallet materialises: 3 ascending shimmer clinks
    ev(T.WALLET_T, "wallet_shimmer", "wallet appears in Dots' hands: 3 ascending clinks",
       lambda: (_arp(rng(870), [660, 880, 1174], 0.09, 0.5), 0.0), -10, p=0.1, group="wallet")
    # compare: 3 soft ticks as Dots looks between the cookers
    for k, dt in enumerate([0.0, 0.18, 0.36]):
        ev(T.COMPARE_T + dt, "compare_tick", f"compare tick {k + 1}/3",
           (lambda r=rr(): (G.clink(r, 2100, 0.09), 0.0)), -12, p=0.15 if k % 2 else -0.15, group="compare")
    # pick: cooker drops into the cart — soft thud + happy chime
    ev(T.PICK_T, "pick_thud", "chosen rice cooker drops into the cart",
       lambda: (_mix(G.push_thump(rng(1897)), st(G.clink(rng(1898), 1568, 0.14) * 0.7)), 0.0), -8, p=0.2, group="pick")
    # tap: finger presses the fingerprint — click + shimmer
    ev(T.TAP_T, "tap_click", "finger taps the fingerprint: click + shimmer",
       lambda: (_mix(G.clink(rng(2177), 1400, 0.1), st(G.clink(rng(2178), 2093, 0.12) * 0.6)), 0.0), -10, p=0.0, group="tap")
    # token: card flips into a gold token — chime arpeggio + airy whoosh
    ev(T.TOKEN_T, "token_chime", "card becomes a gold token: 4-note chime + whoosh",
       lambda: (_mix(_arp(rng(3234), [880, 1108, 1318, 1760], 0.08, 0.7), G.whoosh(0.5, rng(3235), 0.12, 500, 3600, 0.8, 0.15, 0.2)), 0.0),
       -8, p=0.0, group="token")
    # clock: Indonesia still waiting — two soft ticks
    for k, dt in enumerate([0.0, 0.5]):
        ev(T.WAIT_T + dt, "clock_tick", f"waiting clock tick {k + 1}/2",
           (lambda r=rr(): (G.clink(r, 1700, 0.08), 0.0)), -12, p=-0.2, group="clock")
    # closing question: gentle chime
    ev(T.CTA_T, "cta_chime", "closing question chime",
       lambda: (_arp(rng(5130), [1046, 1318], 0.12, 0.5), 0.0), -12, p=0.0, group="cta")

    # ------------------------------------------------ flash + camera moves
    add(Cue(T.FLASH, "flash_whoosh", "reverse swell into the white flash after the hook + soft low whoomp",
            lambda: _flash(rng(404)), -5, send=0.2))
    for f, desc in [(int(T.S1_END * T.FPS), "cut to the wide living room"),
                    (int(T.S2_END * T.FPS), "cut to the wallet close-up"),
                    (int(T.S3_END * T.FPS), "cut to the floating platform"),
                    (int(T.S4_END * T.FPS), "cut to the big phone"),
                    (int(T.S5_END * T.FPS), "cut to the card"),
                    (int(T.S6_END * T.FPS), "cut to the golden street")]:
        add(Cue(T.fr(f), "whoosh_cam", f"camera {desc}",
                (lambda r=rr(): (G.whoosh(0.6, r, 0.09, 330, 2000, 0.8, 0.18, 0.15), 0.09)), -11, send=0.12))
    for tm, desc in [(T.COMPARE_T, "push to the cards"), (T.PICK_T, "push to the cart"),
                     (T.TOKEN_T, "push to the token"), (T.WAIT_T, "push to the clock"),
                     (T.CTA_T + 1.9, "crane out, ending")]:
        add(Cue(tm, "whoosh_cam", f"camera {desc}",
                (lambda r=rr(): (G.whoosh(0.5, r, 0.08, 350, 2200, 0.8, 0.15, 0.15), 0.08)), -12, send=0.12))
    return C


# ================================================================ helpers for composite cues
def _mix(a, b):
    """add two generated signals that may differ in length and channels:
    both are stereo-ised and padded to the longer length"""
    a = st(np.asarray(a, float))
    b = st(np.asarray(b, float))
    n = max(a.shape[1], b.shape[1])
    out = np.zeros((2, n))
    out[:, :a.shape[1]] += a
    out[:, :b.shape[1]] += b
    return out


def _cut(gen, dur, fin, fout):
    def g():
        x, a = gen()
        return fades(x, fin, fout), a
    return g


def _pop(r):
    """short rising bloop: modal ping gliding up + a bright clink on top"""
    y = modal(0.28, [(520, 1.0, 0.05), (780, 0.6, 0.03), (1560, 0.35, 0.015)], r, glide=1.8, glide_tau=0.06)
    y = _mix(y, G.clink(r, 2400, 0.1) * 0.8)
    return y


def _arp(r, freqs, step, scale=0.6):
    """ascending clink arpeggio, one note per `step` seconds"""
    n = ns(step * len(freqs) + 0.25)
    out = np.zeros(n)
    for k, f in enumerate(freqs):
        c = G.clink(r, f, 0.14) * scale
        s = ns(k * step)
        out[s: s + len(c)] += c[: len(out) - s]
    return out


def _flash(r):
    dur = 0.75
    y = G.whoosh(dur, r, 0.33, 500, 4200, 0.9, 0.09, 0.4)
    t = tt(dur)
    boom = np.where(t > 0.33, np.exp(-(t - 0.33) / 0.12) * np.sin(2 * np.pi * 62 * (t - 0.33)), 0) * 0.8
    return widen(y + boom, r, 12, 0.9), 0.33


# ================================================================ render
def render(v_ref, on_event=None):
    """v_ref = integrated loudness of the voice stem (stereo). Returns (stereo stem, cue list with measured levels).
    on_event(cue, x, t0) is called with every placed (dry) event, for analysis."""
    C = cues()
    out = np.zeros((2, N))
    send = np.zeros(N)
    for c in C:
        x, anchor = c.gen()
        x = np.asarray(x, float)
        x = pan(x, c.p) if x.ndim == 1 else x
        if c.cut is not None:
            k = ns(c.cut - (c.t - anchor))
            if 0 < k < x.shape[1]:
                x = fades(x[:, :k], 0.0, 0.02)
        tgt = v_ref + c.applied
        cur = momentary_max(x) if c.kind == "event" else integrated(x)
        if np.isfinite(cur):
            x = x * dbg(tgt - cur)
        if c.lpf:
            x = lp(x, c.lpf, 1)
        c.measured = momentary_max(x) - v_ref if c.kind == "event" else integrated(x) - v_ref
        t0 = c.t - anchor
        place(out, x, t0)
        if on_event:
            on_event(c, x, t0)
        if c.send > 0:
            G._place_mono(send, c.send * x.mean(0), t0)
    room = make_ir(0.7, 77, pre=0.01, hf=1.6, early=[(0.05, 0.35, -0.4), (0.09, 0.25, 0.5), (0.15, 0.15, -0.2)])
    out += 0.55 * convolve_st(send, room)
    out = hp(out, 25, 2)
    end = ns(T.DUR - 0.12)
    out[:, end:] *= np.linspace(1, 0, N - end)[None, :] ** 2
    return out, C
