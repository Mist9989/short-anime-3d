# Every sound effect and ambience bed of the VARENNES short as a cue list timed to the picture (timeline.py reads the
# CUE table and the per-frame story state of MAIN story.ts), rendered into one stereo SFX stem. NO MUSIC: voice + SFX.
# Level convention (skill standard mix): an EVENT has a "naive" level (LU vs the voice stem, as the event's max momentary
# loudness) and is placed SFX_DB = -6 dB under it; ambience BEDS (integrated loudness) keep their level and are ducked
# DUCK_DB under the speech spans of words.json. Moving sources (coach, teams, Drouet, cart) are spatialized from the
# take camera (distance gain + air absorption + pan). Each take has its own room; every cue and every reverb tail is cut
# on the take's hard cut (473 / 724 / 1456), so the ambience changes cleanly on the cut.
import numpy as np
from sp import ndimage
from dsp import (SR, ns, tt, rng, dbg, lp, hp, bp, pan, st, place, fades, widen, make_ir, convolve_st, momentary_max,
                 integrated, colored, smooth_noise, modal, phase, reson)
import sfx_gen as G
import foley as Fy
import timeline as T

N = ns(T.DUR)
SFX_DB = -6.0
DUCK_DB = -4.0
# design levels below were written relative to each other; these trims set the whole stem ~12-13 LU under the voice
# (the Bastille template's SFX-to-voice relation) and are already included in every "naive" value of the cue sheet
BED_TRIM, EVENT_TRIM = 7.0, 4.0
CUE, W = T.CUE, T.W
fr = T.fr


class Cue:
    def __init__(self, f, name, desc, gen, naive, kind="event", pos=None, p=0.0, lpf=None, send=0.12, duck=None,
                 group=None, freeze=True, endfade=True):
        naive = naive + (BED_TRIM if kind == "bed" else EVENT_TRIM)
        self.f, self.t, self.name, self.desc, self.gen, self.naive = f, fr(f), name, desc, gen, naive
        self.kind, self.pos, self.p, self.lpf, self.send = kind, pos, p, lpf, send
        self.duck = (kind == "bed") if duck is None else duck
        self.take = T.take_of(f)
        self.group = group or name
        self.freeze, self.endfade = freeze, endfade
        self.applied = naive + (SFX_DB if kind == "event" else 0.0)
        self.measured = None


# ================================================================ spatial helpers
def _frames_of(t0, n):
    return t0 * T.FPS + np.arange(n) / SR * T.FPS


def moving(x, t0, posf, dref=5.0, roll=1.0, air=True, pan_w=0.8):
    """spatialize a mono track starting at t0 (s) on a moving world point posf(frame) -> (2, n)"""
    x = np.asarray(x, float)
    n = len(x)
    fa = int(np.floor(t0 * T.FPS))
    fb = int(np.ceil(t0 * T.FPS + n / SR * T.FPS)) + 1
    fi = np.arange(fa, fb + 1)
    dp = np.array([T.rel(posf(int(np.clip(f, 0, T.TOTAL - 1))), int(np.clip(f, 0, T.TOTAL - 1)), pan_w) for f in fi])
    fs = _frames_of(t0, n)
    d = np.interp(fs, fi, dp[:, 0])
    p = np.interp(fs, fi, dp[:, 1])
    g = (dref / np.maximum(d, dref)) ** roll
    y = x * g
    if air:
        a = np.clip(1 - (d - 12) / 55, 0.15, 1)
        y = a * y + (1 - a) * lp(y, 1400, 2)
    th = (np.clip(p, -1, 1) + 1) * np.pi / 4
    return np.stack([y * np.cos(th), y * np.sin(th)]) * np.sqrt(2)


def hit(buf, t0buf, x, t, pos=None, f=None, dref=5.0, roll=1.0, air=True, p=None, gain=1.0):
    """place one short mono hit at absolute time t into buf (2, n) that starts at t0buf, spatialized from the camera"""
    if pos is not None:
        ff = int(np.clip(round(f if f is not None else t * T.FPS), 0, T.TOTAL - 1))
        d, pp = T.rel(pos, ff)
        g = (dref / max(d, dref)) ** roll
        if air and d > 12:
            a = float(np.clip(1 - (d - 12) / 55, 0.15, 1))
            x = a * x + (1 - a) * lp(x, 1400, 2)
        x = x * g
        p = pp if p is None else p
    place(buf, pan(x * gain, p or 0.0), t - t0buf)


def track(f0, f1):
    return np.zeros((2, ns(fr(f1 - f0)))), fr(f0)


def team_hits(f0, f1, take, r, surface_fn, w=1.0, pairs=(0, 1, 2), jitter=0.006):
    """footfalls of the harnessed team from the dumped teamAt phases: [(t, horse, pos, gait, frame)]"""
    out = []
    frames = np.arange(f0, f1)
    gaits = [T.FR[f]["team"][0]["gait"] for f in frames]
    for i in range(6):
        if i // 2 not in pairs:
            continue
        ph = [T.FR[f]["team"][i]["ph"] for f in frames]
        for tm, leg in T.footfalls(ph, frames, lambda k: T.GAIT_OFF[gaits[k]]):
            ff = int(tm * T.FPS)
            out.append((tm + r.normal(0, jitter), i, T.F(ff)["team"][i]["pos"], gaits[min(ff - f0, len(gaits) - 1)], ff))
    return out


GAIT_W = {"walk": 0.5, "trot": 0.8, "gallop": 1.0, "stand": 0.3}


def hooves_track(f0, f1, hits, r, surface_fn, dref=5.0, wscale=1.0):
    buf, t0 = track(f0, f1)
    for tm, i, pos, gait, ff in hits:
        if tm < t0 or tm >= fr(f1):
            continue
        h = Fy.hoof(r, surface_fn(ff, pos), 1.0) * GAIT_W.get(gait, 0.8) * r.uniform(0.7, 1.0) * wscale
        hit(buf, t0, h, tm, pos, ff, dref)
    return buf


def coach_pos(f):
    return T.F(f)["coach"]["pos"]


def coach_s_series(f0, f1):
    return np.array([T.F(f)["coach"]["s"] for f in range(f0, f1 + 1)])


def wheels_track(f0, f1, r, surface_fn, vref=6.6, dref=6.0, clatter=1.0, grit=1.0):
    """iron-tyred coach wheels from the coach's arc length s(f): rumble, dirt crunch or cobble clatter (one bump per
    ~0.2 m travelled per axle), one hub squeak per rear-wheel turn; spatialized on the coach"""
    t0 = fr(f0)
    n = ns(fr(f1 - f0))
    fs = _frames_of(t0, n)
    s_f = coach_s_series(f0, f1)
    s = np.interp(fs, np.arange(f0, f1 + 1), s_f)
    v = np.abs(np.gradient(s)) * SR
    vn = np.clip(v / vref, 0, 1.6)
    vs = ndimage.uniform_filter1d(vn, ns(0.05))
    cob = np.array([1.0 if surface_fn(int(f), coach_pos(int(f))) == "cobble" else 0.0 for f in fs[:: ns(0.01)]])
    cob = np.interp(np.arange(n), np.arange(len(cob)) * ns(0.01), cob)
    rum = lp(colored(n, r, 1.6), 240, 2) * vs ** 0.9 * 0.9
    rum += bp(colored(n, r, 1.0), 300, 1200, 1) * vs * 0.12
    y = rum
    y += Fy.gravel(n / SR, r, 60 + 700 * vs, vs * (1 - cob) * 0.55) * grit
    # cobble clatter (both axles) at distance crossings
    for ax, sp in ((0, 0.21), (1, 0.23)):
        marks = np.arange(s[0] + r.uniform(0, sp), s[-1], sp) if s[-1] > s[0] + sp else []
        for m in marks:
            k = int(np.searchsorted(s, m + r.normal(0, 0.02)))
            if 0 <= k < n and cob[k] > 0.5 and vs[k] > 0.02:
                b = modal(0.12, [(r.uniform(80, 130), 1.0, 0.03), (r.uniform(240, 380), 0.6, 0.015), (r.uniform(900, 1400), 0.25, 0.006)], r)
                G._place_mono(y, b * r.uniform(0.25, 0.7) * min(1.0, vs[k] ** 0.6) * clatter, k / SR)
    # rear hub squeak once per turn (wheel R .82 m)
    circ = 2 * np.pi * 0.82
    if s[-1] > s[0] + circ * 0.5:
        for m in np.arange(np.ceil(s[0] / circ) * circ, s[-1], circ):
            k = int(np.searchsorted(s, m))
            if 0 <= k < n and vs[k] > 0.05:
                c = G.creak(0.14, r, 170, 230, G.WOOD, rough=0.15, noise=0.03) * 0.2 * min(1, vs[k])
                G._place_mono(y, c, k / SR)
    return moving(y, t0, coach_pos, dref)


def coach_creaks(f0, f1, r, rate=2.2, dref=6.0, vref=6.6):
    """coach body and leather thoroughbraces creaking with the motion (Poisson, rate ~ speed)"""
    t0 = fr(f0)
    n = ns(fr(f1 - f0))
    y = np.zeros(n)
    tm = r.uniform(0, 0.3)
    while tm < n / SR - 0.3:
        f = int(f0 + tm * T.FPS)
        vn = min(1.5, T.F(f)["coach"]["v"] * T.FPS / vref)
        if vn > 0.05 and r.uniform() < min(1, vn):
            c = Fy.leather(r, r.uniform(0.22, 0.45), r.uniform(45, 70), r.uniform(80, 130)) if r.uniform() < 0.6 else \
                G.creak(r.uniform(0.2, 0.35), r, r.uniform(90, 130), r.uniform(150, 220), G.TIMBER, rough=0.2, noise=0.04)
            G._place_mono(y, c * r.uniform(0.4, 1.0), tm)
        tm += r.exponential(1 / rate) + 0.12
    return moving(y, t0, coach_pos, dref)


def jingle_track(f0, f1, hits, r, dref=5.0, prob=0.5, horses=(0, 1)):
    buf, t0 = track(f0, f1)
    for tm, i, pos, gait, ff in hits:
        if i in horses and r.uniform() < prob and t0 <= tm < fr(f1):
            j = G.rattle(0.14, r, 70, np.exp(-np.linspace(0, 5, ns(0.14))), heavy=False) * r.uniform(0.3, 0.7)
            hit(buf, t0, j, tm + 0.01, pos, ff, dref)
    return buf


# ================================================================ beds / crowd (crowd voices from the Bastille kit)
def _murmur(dur, r, voices):
    n = ns(dur)
    out = np.zeros((2, n))
    for v in range(voices):
        kind = r.uniform()
        base, scale = ((r.uniform(95, 140), r.uniform(0.95, 1.05)) if kind < 0.5 else
                       (r.uniform(175, 235), r.uniform(1.12, 1.2)) if kind < 0.9 else (r.uniform(260, 330), r.uniform(1.25, 1.35)))
        y = G.babble(dur, r, base, scale, r.uniform(3.6, 4.8), r.uniform(0.55, 0.8), fmax=3400)
        y = lp(y, r.uniform(2000, 3200), 1) * r.uniform(0.3, 1.0)
        out += pan(y, r.uniform(-0.85, 0.85))
    return out


def _roar(dur, r):
    n = ns(dur)
    x = colored(n, r, 0.4)
    y = reson(x, 650, 1.2) + 0.7 * reson(x, 1150, 1.5) + 0.4 * reson(x, 2500, 2.0) + 0.3 * reson(x, 320, 1.0)
    y = bp(y, 180, 4200, 1)
    y = y / (np.abs(y).max() + 1e-9)
    l = y * (0.8 + 0.25 * smooth_noise(n, r, 1.3))
    rr = np.roll(y, ns(0.011)) * (0.8 + 0.25 * smooth_noise(n, r, 1.1))
    return np.vstack([l, rr])


def _shouts(dur, r, voices, env_pts):
    """angry crowd swell: many short 'HEY!' / 'hah!' / hurrah-like shouts over a roar body (non-verbal)"""
    n = ns(dur)
    t = np.arange(n) / SR
    out = np.zeros((2, n))
    for v in range(voices):
        base = r.uniform(110, 165) if v % 3 else r.uniform(180, 240)
        tm = r.uniform(0.0, 0.25)
        while tm < dur - 0.5:
            h = G.hurrah(r, base * r.uniform(0.95, 1.05), r.uniform(0.98, 1.15))
            place(out, pan(lp(h, 3200, 1) * r.uniform(0.35, 1.0), r.uniform(-0.9, 0.9)), tm)
            tm += r.uniform(0.6, 1.2)
    out += _roar(dur, r) * 0.55
    env = np.interp(t, [p[0] for p in env_pts], [p[1] for p in env_pts])
    return fades(out * env[None, :], 0.03, 0.3)


def env_curve(dur, pts):
    t = tt(dur)
    return np.interp(t, [p[0] for p in pts], [p[1] for p in pts])


def _crickets_st(dur, r, voices=4, level=1.0):
    a = G.crickets(dur, r, voices)
    b = G.crickets(dur, r, voices)
    return np.stack([a + 0.3 * b, b + 0.3 * a]) * level


# ================================================================ picture timings read from the dumped story state
def door2_open():
    """take 2 door swing (frames): last shut frame -> first fully open frame (v1-v3: 563-571; v4 cam story.ts: 540-548)"""
    fs = range(473, 724)
    a = next(f for f in fs if T.F(f)["coach"]["door"] > 1e-4) - 1
    b = next(f for f in fs if f > a and T.F(f)["coach"]["door"] >= 0.999)
    return a, b


def drouet3_walk():
    """take 3: (first moving frame - 1, last moving frame + 1, first visible frame) from drouetAt(3)"""
    mv = [f for f in range(724, 1456) if T.F(f)["drouet"]["v"] > 1e-6]
    vis = next(f for f in range(724, 1456) if T.F(f)["drouet"]["mode"] != "hidden")
    return mv[0] - 1, mv[-1] + 1, vis


def bill_land():
    """first frame the assignat lies on the ground (assignatAt(4) mode 'ground')"""
    return next(f for f in range(1456, 1770) if T.F(f)["bill"]["mode"] == "ground")


# ================================================================ per-take event pieces
def gate_creak(r):
    y = Fy.hinge(r, 0.9, 30, 48, 0.42) + G.creak(0.9, r, 35, 55, G.CHAIN[1:], [(0, 0), (0.2, 1), (0.8, 0.8), (1, 0)], rough=0.12, noise=0.03) * 0.5
    return y


def bill_out(r):
    """take 3: Drouet slides the assignat out of his waistcoat (1117-1137): cloth slide + paper rustle, crisp snap when held"""
    d = 0.9
    y = np.zeros(ns(d))
    G._place_mono(y, Fy.cloth(r, 0.35, 400, 3500, 0.5) * 0.6, 0.0)
    G._place_mono(y, Fy.paper(r, 0.62, 55, [(0, 0), (0.08, 1), (0.45, 0.9), (0.62, 0.15)], 1.2), 0.05)
    G._place_mono(y, Fy.paper_snap(r) * 0.9, fr(CUE["BILL_OUT"][1] - CUE["BILL_OUT"][0]))
    return y


def sting(r):
    """the comic 'he understood' beat, foley only (1334): a short air swish into the punch-in, ONE dry knuckle knock on the
    coach panel, then the king's eyes slide = a tiny leather creak bending up (1336-1346). No tuned notes."""
    d = 1.2
    y = np.zeros(ns(d))
    pre = 0.18
    sw = G.whoosh(0.32, r, 0.17, 600, 3000, 0.7, 0.05, 0.25)
    G._place_mono(y, sw * 0.55, pre - 0.17)
    G._place_mono(y, Fy.knock(r, 560, 1.0), pre)
    c = G.creak(0.34, r, 70, 190, Fy.LEATHER, [(0, 0), (0.2, 0.8), (0.8, 1), (1, 0)], rough=0.06, noise=0.02, scale=1.25)
    G._place_mono(y, c * 0.55, pre + fr(2))
    return y, pre


def sting_side(r):
    return Fy.snort(r, 0.45, 1.05)


def flutter(r):
    """take 4: the assignat flutters down from BILL_FALL[0] and comes to rest on the landing frame (bill_land()): a soft air
    sheet that follows the bill's speed in the dumped assignatAt path, a paper flap at each flip of its tilt (dying as
    (1-u)^2 like the picture's flutter), and a soft settle as it eases onto the cobbles (it lands at ~zero speed)"""
    a = CUE["BILL_FALL"][0]
    b = bill_land()
    d = fr(b - a) + 0.6
    n = ns(d)
    t = np.arange(n) / SR
    u = np.clip(t / fr(b - a), 0, 1)
    P = np.array([T.F(f)["bill"]["pos"] for f in range(a, b + 1)])
    sp = np.concatenate([[0], np.linalg.norm(np.diff(P, axis=0), axis=1)])
    spd = np.interp(t * T.FPS, np.arange(len(sp)), sp / (sp.max() + 1e-9)) * (u < 1)
    sheet = bp(colored(n, r, 0.5), 700, 5000, 1) * (0.3 + 0.7 * np.abs(np.cos(u * np.pi * 5 + 0.6))) * spd * 0.3
    y = sheet
    for k in range(1, 8):
        uk = (k * np.pi - 0.6) / (5 * np.pi)
        if 0 < uk < 1:
            fl = Fy.paper(r, 0.12, 120, [(0, 0), (0.02, 1), (0.12, 0)], 0.8) + G.whoosh(0.12, r, 0.04, 900, 4000, 0.6, 0.04, 0.3) * 0.5
            G._place_mono(y, fl * (0.25 + 0.75 * (1 - uk) ** 2), uk * fr(b - a) - 0.03)
    land = Fy.paper(r, 0.3, 45, [(0, 0), (0.06, 0.8), (0.3, 0)], 0.5) * 0.35
    G._place_mono(y, land, fr(b - a) - 0.04)
    return y


def owl_far(r):
    return lp(Fy.owl(r), 2500, 1)


# ================================================================ cue list
def cues():
    C = []
    add = C.append
    R = rng(1791)
    rr = lambda: rng(int(R.integers(1 << 30)))
    Q = lambda f: fr(f)

    # ---------------------------------------------------------------- TAKE 1 PARIS, NIGHT 0-473
    a1, b1 = 0, 473
    D1 = fr(b1 - a1)
    KING_WIN = [-6, 13.2, -100]
    COACH1 = [30, 6, -93.5]
    TEAM1 = [33.6, 6, -93.5]
    GATE = [24, 6, -100]
    CROWD = [-2, 6, -76]
    add(Cue(a1, "paris_air", "Paris night air: low breeze along the palace, far city hush", lambda: (G.breeze(D1, rng(10), 0.8, 0.12, 700), 0.0),
            -30, "bed", send=0.0))

    def crowd_bed():
        r = rng(11)
        near = _murmur(D1, r, 20)
        e = env_curve(D1, [(0, 0.75), (Q(176), 0.75), (Q(215), 0.9), (Q(234), 1.0), (Q(262), 0.95), (Q(300), 0.5), (D1, 0.42)])
        far = lp(near, 1100, 2)
        k = env_curve(D1, [(0, 1.0), (Q(176), 1.0), (Q(268), 0.55), (Q(320), 0.1), (D1, 0.0)])
        return (near * k[None, :] + far * (1 - k)[None, :]) * e[None, :], 0.0
    add(Cue(a1, "crowd_murmur", "torch crowd murmuring in front of the Tuileries; swells toward 'gronde' (234-262), recedes as the camera drifts to the gate (268+)",
            crowd_bed, -21, "bed", send=0.3))

    def torches():
        r = rng(12)
        y = np.stack([Fy.fire(D1, r, 12, 1.0), Fy.fire(D1, r, 10, 1.0)])
        e = env_curve(D1, [(0, 1.0), (Q(176), 1.0), (Q(268), 0.5), (Q(320), 0.3), (D1, 0.25)])
        return y * e[None, :], 0.0
    add(Cue(a1, "torch_crackle", "torches crackling around the hook ECU (close), thinning with the crane and the drift to the gate",
            torches, -25, "bed", send=0.15))
    add(Cue(CUE["HAND_DOWN"][0], "bill_rustle1", "the hook man lowers the assignat (140-162): soft paper rustle",
            lambda: (Fy.paper(rng(13), 0.7, 35, [(0, 0), (0.1, 0.8), (0.5, 0.6), (0.7, 0)], 0.8), 0.0), -18, pos=[-5.45, 7.9, -87.05], send=0.05))
    add(Cue(CUE["TORCHES_UP"], "gronde_roar", "TORCHES UP, fists shake on 'gronde' (234/237): angry crowd roar swell (non-verbal shouts)",
            lambda: (_shouts(2.6, rng(14), 18, [(0, 0), (0.12, 1.0), (1.0, 0.85), (2.6, 0.0)]), 0.0), -9, lpf=4200, send=0.3))

    def torch_whoomph():
        r = rng(15)
        out = np.zeros((2, ns(0.9)))
        for k in range(7):
            w = G.whoosh(0.55, r, 0.12, 150, 900, 0.9, 0.2, 0.05) + Fy.fire(0.55, r, 30, 0.6) * 0.3
            place(out, pan(w * r.uniform(0.4, 1.0), r.uniform(-0.8, 0.8)), r.uniform(0, 0.08))
        return out, 0.12
    add(Cue(CUE["TORCHES_UP"], "torch_whoomph", "torches swung up: flame whoomphs", torch_whoomph, -13, send=0.2))
    for k, (f, p) in enumerate([(40, -0.6), (98, 0.5), (190, -0.3), (226, 0.6), (246, -0.7), (255, 0.3), (281, -0.5), (338, 0.2), (392, -0.4), (452, 0.1)]):
        far = f > 268
        add(Cue(f, "far_shout", "a shout from the crowd (non-verbal 'hey!' / 'hah!')" + (" - far, behind the drift" if far else ""),
                (lambda r=rr(), far=far: (lp(G.hurrah(r, r.uniform(110, 200), r.uniform(1.0, 1.15)), 1500 if far else 2800, 1), 0.04)),
                -20 if far else -17, p=p, send=0.45, group="far_shouts"))
    # horses of the waiting coach (team ahead of the coach, east)
    for f, kind, nv in [(285, "snort", -15), (372, "snort", -16), (430, "snort", -15)]:
        add(Cue(f, "horse_snort", "a coach horse snorts in the dark", (lambda r=rr(): (Fy.snort(r), 0.02)), nv, pos=TEAM1, send=0.2, group="t1_horses"))
    for f in (330, 398):
        add(Cue(f, "hoof_stamp", "a coach horse shifts its weight: two hoof stamps on the cobbles",
                (lambda r=rr(): (np.concatenate([Fy.hoof(r, "cobble", 0.7), Fy.hoof(r, "cobble", 0.5)]), 0.0)), -17, pos=TEAM1, send=0.2, group="t1_horses"))
    add(Cue(372, "harness_jingle", "head toss: harness jingle", lambda: (G.rattle(0.35, rng(16), 60, np.exp(-np.linspace(0, 3, ns(0.35)))), 0.0),
            -19, pos=TEAM1, send=0.15))
    add(Cue(CUE["GATE_OPEN"] - 3, "gate_latch", "the side gate's iron latch lifts", lambda: (Fy.latch(rng(17), 1.0), 0.0), -15, pos=GATE, send=0.3))
    add(Cue(CUE["GATE_OPEN"], "gate_creak", "the side gate creaks open (294)", lambda: (gate_creak(rng(18)), 0.0), -12, pos=GATE, send=0.35))

    def family_steps():
        """5 people out of the gate in single file: tiptoe 297-345 (0.035 m/f), hurry 345-404 (0.11 m/f), steps from the
        cast.ts familyS() phases (step every half stride: 0.7 m tiptoe, 1.2 m hurry)"""
        r = rng(19)
        FP = [[24, -100.4]] + [[24, -99.6], [26.5, -98.6], [29, -96.6], [30.2, -95]]
        seg = [np.hypot(FP[i + 1][0] - FP[i][0], FP[i + 1][1] - FP[i][1]) for i in range(len(FP) - 1)]
        FLEN = sum(seg)
        fam = [(0, 0.0, 1.0), (1.15, 0.7, 0.9), (2.2, 1.4, 0.6), (3.0, 1.1, 0.45), (4.1, 2.1, 0.85)]  # gap, back, weight
        a, bh = CUE["FAMILY_OUT"][0], CUE["HURRY"][0]

        def S(f):
            return -1 if f < a else 1.3 + (0.035 * (f - a) if f < bh else 0.035 * (bh - a) + 0.11 * (f - bh))

        def along(s):
            for i, L in enumerate(seg):
                if s <= L:
                    k = s / L
                    return [FP[i][0] + (FP[i + 1][0] - FP[i][0]) * k, 6.0, FP[i][1] + (FP[i + 1][1] - FP[i][1]) * k]
                s -= L
            return [FP[-1][0], 6.0, FP[-1][1]]
        buf, t0 = track(a, b1)
        for gap, back, wt in fam:
            sEnd = FLEN - back
            prev = None
            for f10 in range(a * 10, 470 * 10):
                f = f10 / 10
                s = min(sEnd, S(f) - gap)
                if s < 0:
                    prev = None
                    continue
                stride = 1.2 if f >= bh else 0.7
                ph = s / stride * 2
                if prev is not None and np.floor(ph) > np.floor(prev[0]) and s < sEnd - 1e-3:
                    tip = f < bh
                    x = Fy.step_stone(r, wt * (0.45 if tip else 0.9), 0.5, tiptoe=tip)
                    if not tip and r.uniform() < 0.5:
                        x = x + np.pad(Fy.cloth(r, 0.12, 900, 4500, 0.3) * 0.15, (0, max(0, len(x) - ns(0.12))))[: len(x)]
                    hit(buf, t0, x, fr(f), along(s), int(f), 4.0)
                prev = (ph, s)
        return buf, 0.0
    add(Cue(CUE["FAMILY_OUT"][0], "family_steps", "the royal family tiptoes out of the gate in single file (297-345), then hurries to the coach (345-404)",
            family_steps, -15, send=0.25))
    for k, f in enumerate([CUE["LOOK_LR"][0], CUE["LOOK_LR"][0] + 7, CUE["LOOK_LR"][0] + 14]):
        add(Cue(f, "look_swish", "heads turn left / right: small cloth swish", (lambda r=rr(): (Fy.cloth(r, 0.18, 800, 4500, 0.4), 0.07)), -25,
                pos=[25.5, 6, -99], send=0.1, group="look_swish"))
    add(Cue(CUE["POINT_EAST"] - 2, "point_swish", "the coachman points east: sleeve swish + seat leather", lambda: (Fy.cloth(rng(20), 0.25, 600, 3500, 0.4) + np.pad(Fy.leather(rng(21), 0.2) * 0.4, (0, ns(0.05)))[: ns(0.25)], 0.1),
            -20, pos=[31.9, 8.5, -93.5], send=0.1))
    add(Cue(CUE["DOOR1"][0], "door1_latch", "coach door unlatched (444)", lambda: (Fy.latch(rng(22), 0.9), 0.0), -14, pos=[30, 7.6, -94.5], send=0.2))
    add(Cue(CUE["DOOR1"][0] + 1, "door1_hinge", "coach door swings half open, hinges squeal (444-461)", lambda: (Fy.hinge(rng(23), fr(17), 50, 75, 0.6), 0.0),
            -15, pos=[30, 7.6, -94.5], send=0.2))

    # ---------------------------------------------------------------- TAKE 2 ROAD, NIGHT -> DAWN 473-724
    a2, b2 = 473, 724
    D2 = fr(b2 - a2)

    def country():
        r = rng(30)
        cr = _crickets_st(D2, r, 5)
        e = env_curve(D2, [(0, 1.0), (Q(CUE["DAWN"][0] - a2), 1.0), (Q(CUE["DAWN"][1] - a2), 0.18), (D2, 0.12)])
        return cr * e[None, :] * 0.6 + G.breeze(D2, r, 0.7, 0.15, 800), 0.0
    add(Cue(a2, "night_country", "open country at night: crickets (fading into dawn 626-676) + light breeze", country, -27, "bed", send=0.0))

    def dawn_birds():
        r = rng(31)
        y = pan(G.bird_chirps(D2, r, 1.2, "sparrow") * 0.6, 0.5) + pan(G.bird_chirps(D2, r, 0.6, "blackbird") * 0.5, -0.5) + \
            pan(G.bird_chirps(D2, r, 0.9, "sparrow") * 0.4, -0.2)
        e = env_curve(D2, [(0, 0.0), (Q(CUE["DAWN"][0] - a2 + 10), 0.0), (Q(CUE["DAWN"][1] - a2), 0.8), (D2, 1.0)])
        return y * e[None, :], 0.0
    add(Cue(a2, "dawn_birds", "first birds of the dawn rise as the sky turns (636-724)", dawn_birds, -27, "bed", send=0.05))
    TEAM2 = lambda: T.F(500)["team"][2]["pos"]
    for f, nv in [(490, -15), (548, -16)]:
        add(Cue(f, "horse_snort", "a coach horse snorts / blows while waiting", (lambda r=rr(): (Fy.snort(r), 0.02)), nv, pos=TEAM2(), send=0.1, group="t2_horses"))
    add(Cue(526, "harness_jingle", "a horse shakes its head: harness jingle", lambda: (G.rattle(0.4, rng(32), 55, np.exp(-np.linspace(0, 3, ns(0.4)))), 0.0),
            -20, pos=TEAM2(), send=0.05))
    DOOR2 = [219.9, 7.6, -79.0]
    add(Cue(CUE["HAT_TUG"], "hat_tug", "the governess tugs the cheap hat down over the royal curl (512): felt fwump + cloth",
            lambda: (Fy.cloth(rng(33), 0.22, 300, 2500, 0.35) + np.pad(lp(rng(34).standard_normal(ns(0.08)), 600, 2) * np.exp(-tt(0.08) / 0.012), (0, ns(0.14))), 0.077),
            -13, pos=DOOR2, send=0.05))
    d2a, d2b = door2_open()
    add(Cue(d2a, "door2_latch", f"coach door unlatched ({d2a}, coachAt(2).door)", lambda: (Fy.latch(rng(35)), 0.0), -14, pos=DOOR2, send=0.05))
    add(Cue(d2a + 1, "door2_hinge", f"door swings open ({d2a}-{d2b})", lambda: (Fy.hinge(rng(36), fr(d2b - d2a), 60, 90, 0.6), 0.0), -15, pos=DOOR2, send=0.05))
    add(Cue(576, "step_creak", "he climbs onto the step: wooden step creak", lambda: (G.creak(0.3, rng(37), 90, 140, G.WOOD, rough=0.2), 0.0), -16, pos=DOOR2, send=0.05))
    add(Cue(580, "coach_rock", "the coach rocks on its leather braces under his weight (580-598)", lambda: (Fy.leather(rng(38), 0.6, 40, 70) + 0.0, 0.0), -15, pos=DOOR2, send=0.05))
    add(Cue(594, "seat_thump", "he drops onto the seat: cushion thump + leather", lambda: (lp(rng(39).standard_normal(ns(0.3)), 300, 2) * np.exp(-tt(0.3) / 0.03) + Fy.leather(rng(40), 0.3) * 0.4, 0.0),
            -17, pos=DOOR2, send=0.05))
    add(Cue(CUE["DOOR2_SHUT"][1] - 1, "door2_shut", "the coach door shuts (605)", lambda: (Fy.door_shut(rng(41)), 0.0), -8, pos=DOOR2, send=0.08))
    add(Cue(CUE["ROLL"] - 3, "reins_snap", "the coachman flicks the reins", lambda: (Fy.reins_snap(rng(42)), 0.0), -13, pos=[221.9, 8.55, -80], send=0.05))
    add(Cue(CUE["ROLL"], "coach_lurch", "the berline lurches off: body creak + harness jingle", lambda: (G.creak(0.5, rng(43), 50, 90, G.TIMBER, rough=0.25) + np.pad(G.rattle(0.4, rng(44), 70), (0, ns(0.1))), 0.0),
            -13, pos=[220, 7, -80], send=0.05))
    hits2 = team_hits(CUE["ROLL"], b2, 2, rng(45), None)
    add(Cue(CUE["ROLL"], "hooves_road", "six horses walk (613) then trot (626) on the packed-dirt road, every footfall from teamAt",
            lambda: (hooves_track(CUE["ROLL"], b2, hits2, rng(46), lambda f, p: "dirt", 5.0), 0.0), -10, send=0.05))
    add(Cue(CUE["ROLL"], "wheels_dirt", "iron-tyred wheels on dirt: rumble, crunch, hub squeak each turn", lambda: (wheels_track(CUE["ROLL"], b2, rng(47), lambda f, p: "dirt"), 0.0),
            -13, send=0.05))
    add(Cue(CUE["ROLL"], "coach_creaks", "coach body + leather braces creaking with the motion", lambda: (coach_creaks(CUE["ROLL"], b2, rng(48)), 0.0), -18, send=0.05))
    add(Cue(CUE["ROLL"], "harness_trot", "harness jingle with the wheelers' strides", lambda: (jingle_track(CUE["ROLL"], b2, hits2, rng(49)), 0.0), -20, send=0.05))
    add(Cue(CUE["RELAX"], "seat_creak", "the king leans back, eyes shut (666): seat leather creak", lambda: (Fy.leather(rng(50), 0.45, 40, 70), 0.0), -19,
            pos=None, p=0.0, send=0.03))

    # ---------------------------------------------------------------- TAKE 3 RELAY, GOLDEN EVENING 724-1456
    a3, b3 = 724, 1456
    D3 = fr(b3 - a3)
    WELL = [1183, 6.8, -75]
    INN = [1199.4, 7.0, -88]
    STABLE1, STABLE2 = [1192, 7, -66], [1204, 7, -66]
    COACH3 = [1200, 7.0, -80]

    def yard():
        r = rng(60)
        y = G.breeze(D3, r, 0.6, 0.1, 800)
        y = y + pan(G.bird_chirps(D3, r, 0.5, "sparrow") * 0.25, 0.6) + pan(G.bird_chirps(D3, r, 0.35, "sparrow") * 0.2, -0.5)
        y = y + pan(G.bird_chirps(D3, r, 0.15, "blackbird") * 0.15, -0.7)
        return y, 0.0
    add(Cue(a3, "yard_evening", "post-relay courtyard, golden evening: soft breeze, sparrows on the roofs, a far blackbird", yard, -28, "bed", send=0.05))
    add(Cue(1003, "far_dog", "a farm dog barks far off behind the houses", lambda: (lp(Fy.dog_bark(rng(61), 2), 1800, 2), 0.0), -24, p=-0.7, send=0.4))
    hits3 = team_hits(a3, CUE["W"]["CALECHE"] + 15, 3, rng(62), None)
    COB = lambda f, p: "cobble"
    add(Cue(a3, "hooves_in", "the team trots into the yard (724-789), walks (789-804), stops on 'calèche' 795 / 804",
            lambda: (hooves_track(a3, 810, hits3, rng(63), COB, 5.0), 0.0), -10, send=0.15))
    add(Cue(a3, "wheels_in", "wheels on the yard cobbles, slowing to a stop at 804", lambda: (wheels_track(a3, 812, rng(64), COB), 0.0), -12, send=0.15))
    add(Cue(a3, "coach_creaks_in", "coach body creaks rolling in", lambda: (coach_creaks(a3, 806, rng(65)), 0.0), -18, send=0.15))
    add(Cue(788, "brake_creak", "brake block on the iron tyre: groaning creak as it slows (788-804)",
            lambda: (G.creak(fr(16), rng(66), 70, 35, Fy.IRON, [(0, 0), (0.2, 1), (0.85, 0.9), (1, 0)], rough=0.15, noise=0.06, scale=0.5), 0.0), -15, pos=COACH3, send=0.15))
    add(Cue(804, "coach_settle", "the berline settles on its braces: lurch creak + harness jingle", lambda: (Fy.leather(rng(67), 0.5, 35, 60) + np.pad(G.rattle(0.4, rng(68), 60), (0, ns(0.1))), 0.0),
            -13, pos=COACH3, send=0.15))
    add(Cue(808, "tired_blow", "a tired horse blows out hard", lambda: (Fy.snort(rng(69), 0.7, 0.85), 0.02), -13, pos=[1206.2, 7.5, -80], send=0.15))

    # horse change: tired team -> stable door 1, fresh team from door 2 (cast.ts swapPath, SWAP_V .11 m/f, gap 14 f)
    hitched = [T.F(812)["team"][i]["pos"] for i in range(6)]

    def swap_hits(leaving):
        out, arrive = [], []
        for i in range(6):
            pair, side = i // 2, (1 if i % 2 == 0 else -1)
            hp_ = [hitched[i][0], hitched[i][2]]
            if leaving:
                ds, dz = STABLE1[0], STABLE1[2]
                pts = [hp_, [1196 + pair * 0.6, -73.5], [ds, dz], [ds, dz + 2.5]]
                t0f = CUE["UNHITCH"][0] + pair * 14
            else:
                ds, dz = STABLE2[0], STABLE2[2]
                pts = [[ds, dz + 2.5], [ds, dz], [1210 - pair * 0.6, -72.5], hp_]
                t0f = CUE["NEW_TEAM"][0] + pair * 14
            seg = [np.hypot(pts[k + 1][0] - pts[k][0], pts[k + 1][1] - pts[k][1]) for k in range(3)]
            L = sum(seg)

            def at(s):
                for k, l in enumerate(seg):
                    if s <= l:
                        q = s / l
                        return [pts[k][0] + (pts[k + 1][0] - pts[k][0]) * q, 6.0, pts[k][1] + (pts[k + 1][1] - pts[k][1]) * q]
                    s -= l
                return [pts[-1][0], 6.0, pts[-1][1]]
            frames = np.arange(t0f, t0f + int(L / 0.11) + 2)
            ss = (frames - t0f) * 0.11
            ph = ((ss / 2.6) + (0 if side > 0 else 0.5)) % 1
            for tm, leg in T.footfalls(ph, frames, lambda k: [0.0, 0.5, 0.5, 0.0]):
                s = (tm * T.FPS - t0f) * 0.11
                vis = (s < L - 0.3) if leaving else (0.3 < s < L)
                if vis:
                    out.append((tm + rng(i * 7 + leg).normal(0, 0.006), i, at(s), "trot", int(tm * T.FPS)))
            arrive.append((t0f + L / 0.11, i, at(L)))
        return out, arrive
    out_hits, _ = swap_hits(True)
    in_hits, arrive = swap_hits(False)
    add(Cue(CUE["UNHITCH"][0], "tired_team_out", "grooms lead the tired team, pair by pair (812 / 826 / 840), trotting across the cobbles into stable door 1",
            lambda: (hooves_track(CUE["UNHITCH"][0], 1060, out_hits, rng(70), COB, 5.0, 0.8), 0.0), -14, send=0.2))
    add(Cue(CUE["NEW_TEAM"][0], "fresh_team_in", "the fresh team trots out of stable door 2 (831 / 845 / 859) to the pole",
            lambda: (hooves_track(CUE["NEW_TEAM"][0], 1080, in_hits, rng(71), COB, 5.0, 0.9), 0.0), -14, send=0.2))
    for k in range(3):
        f = CUE["UNHITCH"][0] + 14 * k - 3
        add(Cue(f, "unhitch_clink", f"traces and buckles unhooked, pair {k + 1}/3", (lambda r=rr(): (G.rattle(0.45, r, 50, np.exp(-np.linspace(0, 2.5, ns(0.45))), heavy=True) + np.pad(Fy.leather(r, 0.2) * 0.4, (0, ns(0.25))), 0.0)),
                -16, pos=hitched[2 * k], send=0.15, group="unhitch"))
    for k in range(3):
        fa_, i, pos = arrive[2 * k]
        add(Cue(fa_, "hitch_clink", f"fresh pair {k + 1}/3 hitched to the pole: chain + buckle clinks", (lambda r=rr(): (G.rattle(0.4, r, 55, np.exp(-np.linspace(0, 2.5, ns(0.4))), heavy=True), 0.0)),
                -17, pos=pos, send=0.15, group="hitch"))
    add(Cue(CUE["NEW_TEAM"][0] - 4, "stable_door", "stable door 2 creaks open on its strap hinges", lambda: (G.creak(0.8, rng(72), 40, 65, G.TIMBER, rough=0.2, noise=0.04), 0.0),
            -20, pos=STABLE2, send=0.3))
    add(Cue(866, "whinny", "a fresh horse whinnies as it is led out", lambda: (Fy.whinny(rng(73)), 0.02), -14, pos=[1206, 7.5, -70], send=0.3))
    def inn_door():
        """the inn door swings open 826-840 (char owner), Drouet steps out at 842: soft latch, then a slow low wooden creak
        across the swing, easing off as it stops open"""
        r = rng(75)
        d = fr(840 - 826) + 0.12
        y = np.zeros(ns(d))
        G._place_mono(y, Fy.latch(rng(74), 0.5) * 0.6, 0.0)
        G._place_mono(y, G.creak(fr(14), r, 38, 58, G.WOOD, [(0, 0), (0.25, 0.8), (0.75, 1.0), (1, 0)], rough=0.18, noise=0.03) * 0.8, 0.02)
        return y, 0.0
    add(Cue(826, "inn_door", "the inn door swings open (826-840, before Drouet steps out at 842): soft latch + slow wooden creak",
            inn_door, -20, pos=INN, send=0.3))

    def drouet_boots3():
        r = rng(76)
        f0, f1, vis = drouet3_walk()
        f1 += 2
        frames = np.arange(f0, f1)
        ph = [T.FR[f]["drouet"]["ph"] for f in frames]
        buf, t0 = track(f0, f1 + 10)
        for tm, leg in T.footfalls(ph, frames, lambda k: [0.0, 0.5]):
            ff = int(tm * T.FPS)
            inside = 0.55 if ff < vis else 1.0              # still in the dark doorway (hidden until `vis`)
            hit(buf, t0, Fy.step_stone(r, r.uniform(0.75, 1.0) * inside, 0.5), tm, T.F(ff)["drouet"]["pos"], ff, 4.0)
        hit(buf, t0, Fy.step_stone(r, 0.5, 1.5) * 0.8, fr(CUE["AT_DOOR"] + 1), T.F(CUE["AT_DOOR"])["drouet"]["pos"], CUE["AT_DOOR"], 4.0)
        return buf, 0.0
    dw0, dw1, dvis = drouet3_walk()
    add(Cue(dw0, "drouet_boots", f"Drouet's boots, every step from drouetAt(3): inn doorway -> coach window ({dw0 + 1}-{dw1 - 1}, visible from {dvis}; softer inside the door), heel scuff as he stops",
            drouet_boots3, -12, send=0.15))

    def well_pulley():
        r = rng(77)
        d = 2.4
        y = np.zeros(ns(d + 0.5))
        tm = 0.0
        while tm < d:
            G._place_mono(y, Fy.hinge(r, 0.16, 120, 160, 0.9) * r.uniform(0.5, 1.0), tm)
            G._place_mono(y, G.rattle(0.15, r, 40, None, heavy=True) * 0.25, tm + 0.05)
            tm += r.uniform(0.38, 0.5)
        return y, 0.0
    add(Cue(740, "well_pulley", "the woman at the well hauls the bucket up: pulley squeaks, rope / chain", well_pulley, -22, pos=WELL, send=0.3))
    add(Cue(996, "well_pour", "she pours the bucket into her pail (water)",
            lambda: (G.water_bed(1.6, rng(78), 0.6, 2.0).mean(0) * env_curve(1.6, [(0, 0), (0.1, 1), (1.2, 0.8), (1.6, 0)]), 0.0), -21, pos=WELL, send=0.3))
    add(Cue(1182, "well_bucket", "the empty bucket drops back down the well: rattle + far splash",
            lambda: (np.concatenate([G.rattle(0.6, rng(79), 60, np.linspace(1, 0.3, ns(0.6)), heavy=True) * 0.6,
                                     lp(G.splash_big(rng(80))[: ns(0.8)], 1800, 2) * 0.35]), 0.0), -22, pos=WELL, send=0.4))
    TEAM3 = [1206, 7.5, -80]
    for f, nv in [(958, -17), (1152, -19), (1242, -18), (1388, -18)]:
        add(Cue(f, "horse_snort", "a hitched horse snorts while waiting", (lambda r=rr(): (Fy.snort(r), 0.02)), nv, pos=TEAM3, send=0.15, group="t3_horses"))
    for f in (1004, 1212):
        add(Cue(f, "hoof_stamp", "a hitched horse paws the cobbles", (lambda r=rr(): (np.concatenate([Fy.hoof(r, "cobble", 0.6), np.zeros(ns(0.12)), Fy.hoof(r, "cobble", 0.4)]), 0.0)),
                -18, pos=TEAM3, send=0.15, group="t3_horses"))
    for f in (1098, 1290):
        add(Cue(f, "harness_jingle", "harness jingle (a horse shakes its head)", (lambda r=rr(): (G.rattle(0.35, r, 55, np.exp(-np.linspace(0, 3, ns(0.35)))), 0.0)),
                -21, pos=TEAM3, send=0.15, group="t3_horses"))
    add(Cue(CUE["KING_PROFILE"] - 2, "seat_creak", "the king turns his head into a perfect profile (1066): seat leather creak",
            lambda: (Fy.leather(rng(81), 0.35, 50, 80), 0.0), -19, pos=COACH3, send=0.05))
    add(Cue(CUE["BILL_OUT"][0], "bill_out", "Drouet pulls the assignat out of his waistcoat (1117-1137): cloth slide, paper rustle, crisp snap as he holds it up",
            lambda: (bill_out(rng(82)), 0.0), -10, pos=[1199.55, 7.3, -82.6], send=0.05))
    add(Cue(CUE["EYES_SLIDE"] - 2, "sting", "REALISATION STING (foley only): swish into the 'démasquer' punch-in, ONE dry knock on the coach panel (1334), the king's eyes slide = leather creak bending up (1336-1346); the yard freezes (beds dip -9 dB 1334-1372)",
            lambda: sting(rng(83)), -8, p=0.05, send=0.08, freeze=False))
    add(Cue(1358, "sting_snort", "a horse snorts into the frozen silence (comic release)", lambda: (sting_side(rng(84)), 0.02), -15, pos=TEAM3, send=0.15, freeze=False))
    add(Cue(CUE["COACH_OFF"] - 4, "reins_snap", "the coachman flicks the reins: the relay lets them go", lambda: (Fy.reins_snap(rng(85)), 0.0), -13, pos=[1201.9, 8.55, -80], send=0.15))
    add(Cue(CUE["COACH_OFF"] + 1, "coach_lurch", "the berline lurches off: creak + jingle", lambda: (G.creak(0.5, rng(86), 50, 90, G.TIMBER, rough=0.25) + np.pad(G.rattle(0.4, rng(87), 70), (0, ns(0.1))), 0.0),
            -14, pos=COACH3, send=0.15))
    hits3b = team_hits(CUE["COACH_OFF"], b3, 3, rng(88), None)
    add(Cue(CUE["COACH_OFF"], "hooves_off", "the fresh team walks (1420) then trots (1445) out of the yard", lambda: (hooves_track(CUE["COACH_OFF"], b3, hits3b, rng(89), COB, 5.0), 0.0),
            -12, send=0.15))
    add(Cue(CUE["COACH_OFF"], "wheels_off", "wheels on the cobbles, pulling away", lambda: (wheels_track(CUE["COACH_OFF"], b3, rng(90), COB), 0.0), -14, send=0.15))

    # ---------------------------------------------------------------- TAKE 4 RIDE + VARENNES, NIGHT 1456-1770
    a4, b4 = 1456, 1770
    D4 = fr(b4 - a4)

    def night4():
        r = rng(100)
        cr = _crickets_st(D4, r, 4, 0.5)
        wind = G.breeze(D4, r, 0.7, 0.2, 900)
        lv = np.stack([Fy.leaves(D4, r, 0.3, 1.0), Fy.leaves(D4, r, 0.3, 1.0)]) * 0.12
        e_lv = env_curve(D4, [(0, 0.7), (Q(1519 - a4), 1.0), (Q(1575 - a4), 1.0), (Q(1600 - a4), 0.4), (D4, 0.3)])
        return cr + wind + lv * e_lv[None, :], 0.0
    add(Cue(a4, "night_wood", "night: crickets, wind in the trees (leafier inside the wood 1519-1575)", night4, -27, "bed", send=0.0))

    def river():
        r = rng(101)
        d = fr(b4 - 1556)
        y = G.water_bed(d, r, 0.25, 0.5) * 0.6
        return y * env_curve(d, [(0, 0), (0.6, 1), (d, 1)])[None, :], 0.0
    add(Cue(1556, "river", "the little river under the Varennes bridge (revealed by the crane 1552+)", river, -31, "bed", send=0.0))
    # the coach on the main road: far behind the trees, then arriving at the bridge
    surf4c = lambda f, p: "cobble" if p[0] < 2047 else "dirt"
    hits4 = team_hits(a4, b4, 4, rng(102), None)
    add(Cue(a4, "coach_team4", "the berline's six horses: far gallop on the main road (lanterns between the trunks 1530-1560), arriving and stopping at the cart (1640), U-turn and away at the gallop (1688+)",
            lambda: (hooves_track(a4, b4, hits4, rng(103), surf4c, 6.0), 0.0), -10, send=0.25))
    add(Cue(a4, "wheels4", "the berline's wheels: dirt road, then the square's cobbles, stop, U-turn", lambda: (wheels_track(a4, b4, rng(104), surf4c, vref=8.0), 0.0),
            -12, send=0.25))
    add(Cue(a4, "coach_creaks4", "coach body creaking on the road", lambda: (coach_creaks(a4, b4, rng(105), 2.0, vref=8.0), 0.0), -19, send=0.25))
    add(Cue(a4, "harness4", "harness jingle with the team's stride", lambda: (jingle_track(a4, b4, hits4, rng(106), 6.0, 0.35), 0.0), -21, send=0.25))
    DH = lambda f: T.F(f)["drouet"]["pos"]
    add(Cue(1458, "drouet_horse_snort", "Drouet's saddled horse snorts at the hitching post", lambda: (Fy.snort(rng(107)), 0.02), -14, pos=DH(1458), send=0.15))
    add(Cue(CUE["MOUNT"][0] + 1, "stirrup", "foot in the stirrup: iron jingle", lambda: (G.rattle(0.25, rng(108), 50, np.exp(-np.linspace(0, 3, ns(0.25)))), 0.0), -18, pos=DH(1463), send=0.1))
    add(Cue(CUE["MOUNT"][0] + 5, "saddle_creak", "Drouet swings up: saddle leather creak (1467-1475)", lambda: (Fy.leather(rng(109), 0.35, 40, 80), 0.0), -14, pos=DH(1467), send=0.1))
    add(Cue(CUE["MOUNT"][1] - 2, "saddle_thump", "he lands in the saddle", lambda: (lp(rng(110).standard_normal(ns(0.25)), 300, 2) * np.exp(-tt(0.25) / 0.03) + Fy.leather(rng(111), 0.25) * 0.4, 0.0),
            -16, pos=DH(1474), send=0.1))

    def drouet_gallop():
        """Drouet's horse from drouetAt(4).horse: walk/trot from its phase, gallop = 4-beat 'da-da-dum' every other
        visual stride (the card's leg cycle runs ~7 Hz at 0.8 m/f), dirt road -> forest floor (1519) -> cobbles (1575)"""
        r = rng(112)
        f0, f1 = CUE["GALLOP"], 1612
        frames = np.arange(f0, f1)
        ph = [T.FR[f]["drouet"]["hph"] for f in frames]
        gaits = [T.FR[f]["drouet"]["hgait"] for f in frames]
        surf = lambda f: "dirt" if f < CUE["TURN_OFF"] else ("forest" if f < CUE["EXIT"] else "cobble")
        buf, t0 = track(f0, f1 + 12)
        u = np.unwrap(np.array(ph) * 2 * np.pi) / (2 * np.pi)
        cyc = 0
        for i in range(len(u) - 1):
            g = gaits[i]
            if g != "gallop":
                continue
            if np.floor(u[i + 1]) > np.floor(u[i]):
                cyc += 1
                if cyc % 2:
                    continue
                tm = (frames[i] + (np.floor(u[i + 1]) - u[i]) / (u[i + 1] - u[i])) / T.FPS
                P = 2 * (1 / ((u[i + 1] - u[i]) * T.FPS))      # sound stride = two visual strides (s)
                ff = frames[i]
                for o in (0.0, 0.12, 0.3, 0.42):
                    h = Fy.hoof(r, surf(ff), 1.0) * r.uniform(0.75, 1.0) * (1.0 if o in (0.0, 0.3) else 0.85)
                    hit(buf, t0, h, tm + o * P + r.normal(0, 0.003), DH(ff), ff, 5.0)
                if r.uniform() < 0.7:
                    j = G.rattle(0.12, r, 70, np.exp(-np.linspace(0, 5, ns(0.12)))) * 0.25 + np.pad(Fy.leather(r, 0.1, 80, 110) * 0.25, (0, ns(0.02)))
                    hit(buf, t0, j, tm + 0.3 * P, DH(ff), ff, 5.0)
                if cyc % 4 == 0:
                    br = bp(r.standard_normal(ns(0.12)), 300, 2000, 1) * np.exp(-tt(0.12) / 0.03) * 0.35
                    hit(buf, t0, br, tm + 0.45 * P, DH(ff), ff, 5.0)
        # slowing down on the square: trot / walk from the real phase
        sl = [k for k in range(len(frames)) if gaits[k] in ("trot", "walk") and frames[k] > CUE["EXIT"]]
        if sl:
            k0 = sl[0]
            for tm, leg in T.footfalls(ph[k0:], frames[k0:], lambda k: T.GAIT_OFF[gaits[k0 + k]]):
                ff = int(tm * T.FPS)
                hit(buf, t0, Fy.hoof(r, "cobble", 0.8) * GAIT_W[gaits[min(ff - f0, len(gaits) - 1)]], tm + r.normal(0, 0.004), DH(ff), ff, 5.0)
        # first strides (walk / trot 1477-1484)
        st_ = [k for k in range(len(frames)) if gaits[k] in ("walk", "trot") and frames[k] < 1500]
        if st_:
            for tm, leg in T.footfalls([ph[k] for k in st_], [frames[k] for k in st_], lambda k: T.GAIT_OFF[gaits[st_[k]]]):
                ff = int(tm * T.FPS)
                hit(buf, t0, Fy.hoof(r, "dirt", 0.8), tm, DH(ff), ff, 5.0)
        return buf, 0.0
    add(Cue(CUE["GALLOP"], "drouet_gallop", "Drouet gallops off (1476): dirt road, the forest shortcut (1519-1575), the square's cobbles, reins in at the bridge head (1605)",
            drouet_gallop, -8, send=0.2))

    # branches whipping through the forest: the 5 foreground trunks (build.ts) crossing screen centre + leafy brushes
    whips = whip_frames()
    for k, (f, x, z) in enumerate(whips):
        add(Cue(f, "branch_whip", f"foreground trunk / branches whip past the lens ({x}, {z})", (lambda r=rr(): (
            G.whoosh(0.4, r, 0.1, 500, 3200, 0.7, 0.1, 0.35) + np.pad(Fy.leaves(0.3, r, 2.0, 1.2, np.exp(-tt(0.3) / 0.08)) * 0.8, (0, ns(0.1))), 0.1)),
            -12, pos=[x, 8.0, z], send=0.15, group="branch_whips"))

    def brushes():
        r = rng(113)
        f0, f1 = CUE["TURN_OFF"], CUE["EXIT"]
        buf, t0 = track(f0, f1 + 10)
        tm = t0 + 0.1
        while tm < fr(f1):
            ff = int(tm * T.FPS)
            x = Fy.leaves(0.25, r, 1.5, 1.0, np.sin(np.pi * np.linspace(0, 1, ns(0.25))) ** 2)
            if r.uniform() < 0.35:
                x = x + np.pad(Fy.twig_snap(r) * 0.5, (0, ns(0.1)))
            hit(buf, t0, x * r.uniform(0.4, 1.0), tm, DH(ff), ff, 5.0)
            tm += r.uniform(0.18, 0.4)
        return buf, 0.0
    add(Cue(CUE["TURN_OFF"], "forest_brush", "horse and rider brushing through undergrowth and low twigs (1519-1575)", brushes, -18, send=0.2))
    add(Cue(1552, "canopy", "the crane rises through the canopy onto the bridge: leaves rustle past the lens (1552-1570)",
            lambda: (np.stack([Fy.leaves(0.8, rng(114), 2.0, 1.1), Fy.leaves(0.8, rng(115), 2.0, 1.1)]) * env_curve(0.8, [(0, 0), (0.25, 1), (0.8, 0)])[None, :], 0.0),
            -16, send=0.1))
    add(Cue(1528, "owl", "an owl hoots deep in the wood", lambda: (owl_far(rng(116)), 0.0), -17, p=-0.55, send=0.5))
    add(Cue(1584, "far_dog4", "a dog barks somewhere in the sleeping town", lambda: (lp(Fy.dog_bark(rng(117), 3), 1600, 2), 0.0), -24, p=-0.6, send=0.5))

    # the bridge cart (bridgeCartAt): pushed 1558-1590, turned across the bridge, 3 barrels on it
    CARTP = lambda f: T.F(f)["cart"]["pos"]

    def cart_push():
        r = rng(118)
        f0, f1 = CUE["CART_PUSH"]
        n = ns(fr(f1 - f0 + 6))
        fs = _frames_of(fr(f0), n)
        u = np.interp(fs, np.arange(f0, f1 + 7), [T.F(f)["cart"]["u"] for f in range(f0, f1 + 7)])
        pos = np.array([T.F(f)["cart"]["pos"] for f in range(f0, f1 + 7)])
        dist = np.concatenate([[0], np.cumsum(np.hypot(np.diff(pos[:, 0]), np.diff(pos[:, 2])))])
        s = np.interp(fs, np.arange(f0, f1 + 7), dist)
        v = np.abs(np.gradient(s)) * SR
        vn = np.clip(v / max(v.max(), 1e-6), 0, 1)
        y = lp(colored(n, r, 1.6), 260, 2) * vn * 0.7
        for m in np.arange(0.1, s[-1], 0.18):
            k = int(np.searchsorted(s, m + r.normal(0, 0.02)))
            if k < n:
                b = modal(0.12, [(r.uniform(90, 140), 1.0, 0.03), (r.uniform(260, 400), 0.6, 0.015), (r.uniform(900, 1400), 0.25, 0.006)], r)
                G._place_mono(y, b * r.uniform(0.3, 0.8), k / SR)
        for m in np.arange(0.5, s[-1], 2 * np.pi * 0.45):
            k = int(np.searchsorted(s, m))
            if k < n:
                G._place_mono(y, G.creak(0.35, r, 70, 120, G.WOOD, rough=0.25) * 0.6, k / SR)
        # the turn across the bridge (u .45 -> 1): wheels skid / scrape on the stones
        turn = np.clip((u - 0.45) / 0.55, 0, 1) * (u < 0.999)
        sc = G.creak(n / SR, r, 35, 55, [(180, 3, 1.0), (430, 4, 0.7), (950, 5, 0.4)], [(0, 0.2), (1, 0.2)], rough=0.4, noise=0.3)
        tw = np.sin(np.pi * turn) * np.sqrt(vn)              # scrape lasts while it turns AND moves; dies as it stops
        y += sc * tw * 0.7 + bp(colored(n, r, 0.8), 400, 3000, 1) * tw ** 2 * 0.2
        return moving(y, fr(f0), CARTP, 5.0), 0.0
    _cp = [T.F(f)["cart"]["pos"] for f in range(CUE["CART_PUSH"][0], CUE["CART_PUSH"][1] + 1)]
    _cl = float(sum(np.hypot(_cp[i + 1][0] - _cp[i][0], _cp[i + 1][2] - _cp[i][2]) for i in range(len(_cp) - 1)))
    _ct = next(f for f in range(CUE["CART_PUSH"][0], CUE["CART_PUSH"][1] + 1) if T.F(f)["cart"]["u"] >= 0.45)
    _ca, _cb = CUE["CART_PUSH"]
    add(Cue(_ca, "cart_push", f"townspeople in nightcaps push the cart {_cl:.1f} m along the bridge ({_ca}-{_cb}): wheels on stone, wooden creaks, the scrape while it is turned across ({_ct}-{_cb})",
            cart_push, -12 if _cl > 8 else -15, send=0.3))

    def cart_steps():
        r = rng(119)
        buf, t0 = track(CUE["CART_PUSH"][0], 1625)
        for k in range(3):
            for f in np.arange(CUE["CART_PUSH"][0] + k * 1.5, CUE["CART_PUSH"][1], 5.3):
                hit(buf, t0, Fy.step_stone(r, 0.6, 0.9), fr(f), CARTP(int(f)), int(f), 5.0)
        for k in range(2):
            tDrop = CUE["BARRELS"][0] + (k + 1) * ((CUE["BARRELS"][1] - CUE["BARRELS"][0]) / 3)
            for f in np.arange(tDrop - 26, tDrop, 26 / 12):
                hit(buf, t0, Fy.step_stone(r, 0.5, 0.6), fr(f), [1986, 6, -106], int(f), 5.0)
        return buf, 0.0
    add(Cue(CUE["CART_PUSH"][0], "cart_steps", "the pushers' and barrel carriers' footsteps on the bridge stones", cart_steps, -18, send=0.3))
    for k in range(3):
        # world.ts: barrel i shows once 3*ramp(f, BARRELS) > i + .3
        fb = next(f for f in range(CUE["BARRELS"][0], CUE["BARRELS"][1] + 1) if T.F(f)["cart"]["barrels"] > k + 0.3)
        add(Cue(fb, "barrel_thud", f"barrel {k + 1}/3 thuds onto the cart (appears f{fb})", (lambda r=rr(): (Fy.barrel_thump(r, 1.0), 0.0)), -10,
                pos=CARTP(fb), send=0.3, group="barrels"))
    add(Cue(CUE["DROUET_STOP"] + 1, "drouet_rein_in", "Drouet reins in at the bridge head: snort + short whinny", lambda: (np.concatenate([Fy.snort(rng(120), 0.4), Fy.whinny(rng(121), 0.7, 880) * 0.7]), 0.02),
            -13, pos=DH(1605), send=0.3))
    STOP = [2024, 7, -100]
    add(Cue(1626, "brake4", "the berline brakes hard toward the cart: brake groan + skid on the cobbles (1626-1640)",
            lambda: (G.creak(fr(14), rng(122), 75, 35, Fy.IRON, [(0, 0), (0.2, 1), (0.9, 1), (1, 0)], rough=0.2, noise=0.1, scale=0.5) +
                     bp(colored(ns(fr(14)), rng(123), 0.8), 500, 3500, 1) * env_curve(fr(14), [(0, 0), (0.15, 0.5), (0.4, 0.3), (0.47, 0)]) * 0.4, 0.0),
            -12, pos=STOP, send=0.3))
    add(Cue(CUE["COACH_STOP"], "coach_halt", "THE COACH HALTS at the cart (1640, the camera kick): body lurch thud, braces creak, harness jolt",
            lambda: (Fy.door_shut(rng(124), 0.6) * 0.5 + np.pad(Fy.leather(rng(125), 0.5, 35, 55), (0, ns(0.2))) + np.pad(G.rattle(0.5, rng(126), 80, heavy=True) * 0.6, (0, ns(0.2))), 0.0),
            -9, pos=STOP, send=0.3))
    add(Cue(1644, "team_whinny", "a leader horse whinnies, startled by the barricade", lambda: (Fy.whinny(rng(127), 1.0, 820), 0.02), -15, pos=[2015, 7.5, -100], send=0.35))

    def hushed():
        r = rng(128)
        d = 2.2
        m = _murmur(d, r, 10) * env_curve(d, [(0, 0), (0.3, 1), (1.6, 0.8), (2.2, 0)])[None, :]
        return lp(m, 2200, 1), 0.0
    add(Cue(CUE["COACH_STOP"] + 2, "town_murmur", "townspeople in nightcaps murmur as the coach stops", hushed, -22, send=0.4))

    def guards():
        r = rng(129)
        buf, t0 = track(1626, 1665)
        cs = [2024, 6, -100]
        GU = [(740, [2014.5, -97.2], [0.9, 2.6], False), (741, [2016, -96.2], [1.7, 3.2], True), (742, [2015.2, -98.6], [2.6, 1.5], True), (743, [2017.5, -97.6], [-1.7, 1.3], True)]
        for i, wt, at, lant in GU:
            dst = [cs[0] - at[0], cs[2] + at[1]]
            prev = None
            for f10 in range(16260, 16650):
                f = f10 / 10
                x = np.clip((f - (CUE["COACH_STOP"] - 10) - (i - 740) * 3) / 20, 0, 1)
                u = x * x * (3 - 2 * x)
                ph = u * 5 * 2
                if prev is not None and np.floor(ph) > np.floor(prev) and 0.02 < u < 0.98:
                    P = [wt[0] + (dst[0] - wt[0]) * u, 6, wt[1] + (dst[1] - wt[1]) * u]
                    hit(buf, t0, Fy.step_stone(r, 0.9, 0.5), fr(f), P, int(f), 4.0)
                    if lant and r.uniform() < 0.6:
                        hit(buf, t0, Fy.hinge(r, 0.12, 220, 300, 1.2) * 0.3, fr(f) + 0.04, P, int(f), 4.0)
                    if r.uniform() < 0.4:
                        hit(buf, t0, G.rattle(0.12, r, 60, np.exp(-np.linspace(0, 5, ns(0.12)))) * 0.25, fr(f) + 0.02, P, int(f), 4.0)
                prev = ph
        return buf, 0.0
    add(Cue(1626, "guards", "National Guards hurry to the coach door with their lanterns (1630-1659): boots on cobbles, lantern-handle squeaks, kit jingle",
            guards, -13, send=0.3))
    DOOR4 = [2024, 7.6, -99.0]
    add(Cue(CUE["DOOR4_OPEN"][0], "door4_latch", "a guard yanks the coach door open: latch (1641)", lambda: (Fy.latch(rng(130), 1.1), 0.0), -13, pos=DOOR4, send=0.25))
    add(Cue(CUE["DOOR4_OPEN"][0] + 1, "door4_hinge", "door swings open (1641-1648)", lambda: (Fy.hinge(rng(131), fr(7), 55, 85, 0.6), 0.0), -15, pos=DOOR4, send=0.25))
    add(Cue(1649, "king_step", "the king steps down onto the coach step: wood creak + coach springs", lambda: (G.creak(0.3, rng(132), 90, 140, G.WOOD, rough=0.2) + np.pad(Fy.leather(rng(133), 0.25, 40, 70) * 0.6, (0, ns(0.05))), 0.0),
            -16, pos=DOOR4, send=0.25))
    add(Cue(CUE["W"]["ARRETE"] - 2, "grab", "a guard's hand on his shoulder: cloth grab (on 'arrêté' 1651)", lambda: (Fy.cloth(rng(134), 0.22, 300, 3000, 0.2), 0.044),
            -15, pos=DOOR4, send=0.2))
    add(Cue(CUE["KING_OUT"][1] - 2, "king_feet", "his shoes touch the cobbles", lambda: (Fy.step_stone(rng(135), 0.7, 0.6), 0.0), -18, pos=[2023.8, 6, -98.4], send=0.25))
    add(Cue(CUE["KING_IN"][0] + 3, "king_back_in", "pushed back up the step: creak + springs", lambda: (G.creak(0.3, rng(136), 100, 150, G.WOOD, rough=0.2) + np.pad(Fy.leather(rng(137), 0.28, 40, 70) * 0.6, (0, ns(0.02))), 0.0),
            -16, pos=DOOR4, send=0.25))
    add(Cue(CUE["DOOR4_SHUT"][1] - 1, "door4_shut", "the door is slammed shut on him (1689)", lambda: (Fy.door_shut(rng(138), 1.0), 0.0), -9, pos=DOOR4, send=0.3))
    add(Cue(CUE["UTURN"] + 1, "reins_snap4", "reins: the coach turns back", lambda: (Fy.reins_snap(rng(139)), 0.0), -14, pos=[2022, 8.5, -100], send=0.3))

    def uturn_scrape():
        r = rng(140)
        d = 1.4
        y = G.creak(d, r, 40, 60, [(200, 3, 1.0), (480, 4, 0.7), (1000, 5, 0.4)], [(0, 0), (0.2, 0.6), (0.8, 0.5), (1, 0)], rough=0.35, noise=0.25)
        return moving(y * 0.8, fr(1692), coach_pos, 6.0), 0.0
    add(Cue(1692, "uturn_scrape", "iron tyres scraping round the tight U-turn on the cobbles", uturn_scrape, -16, send=0.3))

    def escort():
        """the mounted escort falling in behind the coach: ~8 horses trotting then cantering, receding (gain + air)"""
        r = rng(141)
        f0, f1 = 1700, 1762
        buf, t0 = track(f0, f1 + 8)
        for h in range(8):
            tm = fr(f0) + r.uniform(0, 0.4)
            while tm < fr(f1):
                k = (tm - fr(f0)) / fr(f1 - f0)
                x = Fy.hoof(r, "cobble" if k < 0.5 else "dirt", 1.0) * r.uniform(0.5, 1.0) * (1 - k) ** 1.6
                x = (1 - k) * x + k * lp(x, 900, 2)
                place(buf, pan(x, r.uniform(-0.6, 0.6) * (1 - 0.5 * k)), tm - t0)
                tm += r.uniform(0.13, 0.2) if (int(tm * 20) % 2) else r.uniform(0.08, 0.12)
        return buf, 0.0
    add(Cue(1700, "escort_hooves", "the escort's hooves falling in behind and receding toward Paris (1700-1762)", escort, -13, send=0.4))
    _bl = bill_land()
    add(Cue(CUE["BILL_FALL"][0], "bill_flutter", f"the assignat flutters down through frame ({CUE['BILL_FALL'][0]}-{_bl}) and eases to rest face up on the cobbles (landing frame {_bl}: soft settle)",
            lambda: (flutter(rng(142)), 0.0), -12, p=0.0, send=0.15, endfade=False))
    return C


def whip_frames():
    """frames where the build.ts foreground whip trunks cross the take-4 lens's screen centre (within 6 m)"""
    out = []
    for x, z in [[2027.6, -58], [2026.4, -61.5], [2023.9, -69], [2022.6, -72.5], [2020.6, -79.5]]:
        best = None
        prev = None
        for f in range(1505, 1580):
            d, p = T.rel([x, 8.0, z], f, 1.0)
            c = T.F(f)
            fx, fz = c["look"][0] - c["cam"][0], c["look"][2] - c["cam"][2]
            ahead = (x - c["cam"][0]) * fx + (z - c["cam"][2]) * fz > 0
            if prev is not None and ahead and np.sign(p) != np.sign(prev) and d < 7:
                best = f
                break
            prev = p
        if best is None:  # fall back: closest approach
            best = min(range(1505, 1580), key=lambda f: T.rel([x, 8.0, z], f)[0])
        out.append((best, x, z))
    return out


# ================================================================ render
def duck_curve(spans, depth=DUCK_DB, pre=0.08, post=0.12, att=0.07, rel=0.45):
    ctrl = 1000
    nc = int(T.DUR * ctrl) + 2
    va = np.zeros(nc)
    for s, e in spans:
        va[max(0, int((s - pre) * ctrl)): int((e + post) * ctrl)] = 1.0
    ka, kr = 1 - np.exp(-1 / (att * ctrl)), 1 - np.exp(-1 / (rel * ctrl))
    env = np.zeros(nc)
    e = 0.0
    for i in range(nc):
        tgt = va[i]
        e += (tgt - e) * (ka if tgt > e else kr)
        env[i] = e
    return np.interp(np.arange(N) / SR, np.arange(nc) / ctrl, depth * env)


def freeze_curve():
    """take 3 'both freeze' beat: everything except the sting dips -9 dB from 1334 (40 ms), back by 1400"""
    t = np.arange(N) / SR
    return np.interp(t, [0, fr(1333.5), fr(1334.8), fr(1372), fr(1400), T.DUR], [0, 0, -9, -9, 0, 0])


def end_curve():
    """silence under the fade: take-4 ambience and foley fade out 1738 -> 1760 (the bill landing keeps its own tail)"""
    t = np.arange(N) / SR
    return np.interp(t, [0, fr(1738), fr(1760), T.DUR], [1, 1, 0, 0]) ** 1.5


ROOMS = {1: dict(rt=1.3, seed=77, pre=0.018, hf=1.5, early=[(0.035, 0.5, -0.4), (0.07, 0.35, 0.5)]),          # palace facade + street
         2: dict(rt=0.45, seed=78, pre=0.01, hf=2.0, early=[(0.03, 0.15, 0.2)]),                          # open country
         3: dict(rt=0.85, seed=79, pre=0.012, hf=1.4, early=[(0.02, 0.45, -0.5), (0.045, 0.35, 0.4)]),     # walled yard
         4: dict(rt=1.1, seed=80, pre=0.015, hf=1.7, early=[(0.04, 0.3, 0.3), (0.09, 0.2, -0.4)])}        # wood / sleeping town
WET = {1: 0.5, 2: 0.35, 3: 0.5, 4: 0.5}


def render(v_ref, words):
    C = cues()
    spans = []
    for w in words:
        if spans and w["s"] - spans[-1][1] < 0.3:
            spans[-1][1] = max(spans[-1][1], w["e"])
        else:
            spans.append([w["s"], w["e"]])
    dk, fz, ec = dbg(duck_curve(spans)), dbg(freeze_curve()), end_curve()
    out = np.zeros((2, N))
    sends = {k: np.zeros(N) for k in ROOMS}
    for c in C:
        x, anchor = c.gen()
        x = np.asarray(x, float)
        if x.ndim == 1:
            p = c.p
            if c.pos is not None:
                p = T.rel(c.pos, int(c.f))[1]
                c.p = p
            x = pan(x, p)
        t0 = c.t - anchor
        ta, tb = T.take_span(c.take)
        i0, ia, ib = ns(t0), ns(ta), ns(tb)
        # clip to the take (hard cuts): drop what falls before the take start or after its end
        if i0 < ia:
            x = x[:, ia - i0:]
            i0 = ia
            x = fades(x, 0.004, 0.0)
        if i0 + x.shape[1] > ib:
            x = fades(x[:, : max(0, ib - i0)], 0.0, 0.004)
        if x.shape[1] == 0:
            continue
        tgt = v_ref + c.applied
        cur = momentary_max(x) if c.kind == "event" else integrated(x)
        if np.isfinite(cur):
            x = x * dbg(tgt - cur)
        c.measured = (momentary_max(x) if c.kind == "event" else integrated(x)) - v_ref
        seg = slice(i0, i0 + x.shape[1])
        if c.duck:
            x = x * dk[None, seg]
        if c.take == 3 and c.freeze:
            x = x * fz[None, seg]
        if c.take == 4 and c.endfade:
            x = x * ec[None, seg]
        if c.lpf:
            x = lp(x, c.lpf, 1)
        out[:, seg] += x
        if c.send > 0:
            sends[c.take][seg] += c.send * x.mean(0)
    for k, room in ROOMS.items():
        ta, tb = T.take_span(k)
        ia, ib = ns(ta), ns(tb)
        ir = make_ir(room["rt"], room["seed"], pre=room["pre"], hf=room["hf"], early=room["early"])
        wet = convolve_st(sends[k][ia:ib], ir) * WET[k]
        wet = fades(wet, 0.0, 0.004)          # the room dies on the cut
        out[:, ia:ib] += wet
    out = hp(out, 25, 2)
    # absolute silence from the start of the picture fade (1762) to the end
    k = ns(fr(1762))
    out[:, k - ns(0.03):k] *= np.linspace(1, 0, ns(0.03))[None, :]
    out[:, k:] = 0.0
    return out, C
