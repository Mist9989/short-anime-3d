# VARENNES additions to the procedural kit (own numpy synthesis, no samples): hooves on cobbles / dirt / forest floor,
# stone footsteps, horse snorts and whinnies, leather, iron hinges, coach latch and door, a dry wooden knock, reins,
# cloth, paper rustle / snap, torch fire, owl, distant dog, leaves and twigs, gravel crunch.
import numpy as np
from dsp import SR, TAU, ns, tt, lp, hp, bp, reson, colored, smooth_noise, fades, shape, phase, modal
from sfx_gen import _place_mono, creak, rattle, vox, vowel_track

LEATHER = [(170, 4, 1.0), (390, 5, 0.75), (820, 6, 0.45), (1600, 7, 0.22), (2900, 8, 0.1)]
IRON = [(310, 30, 0.7), (720, 38, 1.0), (1240, 42, 0.8), (1980, 48, 0.55), (2950, 52, 0.35), (4300, 58, 0.2)]


def hoof(r, surface="cobble", w=1.0):
    """one iron-shod hoof: cobble = hollow 'clop' + iron click; dirt = dull thud + grit; forest = thud + leaf crunch"""
    d = 0.22
    t = tt(d)
    nz = r.standard_normal(len(t))
    thud = np.exp(-t / r.uniform(0.022, 0.034)) * np.sin(phase(r.uniform(70, 95) * (1 + 0.5 * np.exp(-t / 0.006)))) * 1.1 * w
    if surface == "cobble":
        clop = modal(d, [(r.uniform(430, 620), 1.0, r.uniform(0.010, 0.016)), (r.uniform(1050, 1450), 0.55, 0.008),
                         (r.uniform(2300, 3100), 0.3, 0.004)], r)
        click = hp(nz, 3000) * np.exp(-t / 0.0009) * 0.5
        grit = bp(nz, 1500, 6000, 1) * np.exp(-t / 0.012) * 0.12
        y = thud * 0.7 + clop * 1.1 + click + grit
    elif surface == "dirt":
        puff = lp(nz, 700, 2) * np.exp(-t / 0.018) * 0.9
        grit = bp(nz, 1800, 6500, 1) * np.clip(t / 0.003, 0, 1) * np.exp(-t / 0.02) * 0.16
        knock_ = modal(d, [(r.uniform(260, 360), 0.35, 0.01)], r)
        y = thud * 1.1 + puff + grit + knock_
    else:  # forest floor: leaf litter + twigs
        puff = lp(nz, 600, 2) * np.exp(-t / 0.02) * 0.8
        crunch = np.zeros(len(t))
        for k in range(int(r.integers(4, 9))):
            a = ns(abs(r.normal(0.01, 0.012)))
            L = ns(0.004)
            if a + L < len(t):
                crunch[a:a + L] += hp(r.standard_normal(L), 1800) * np.exp(-np.arange(L) / (SR * 0.0012)) * r.uniform(0.2, 0.7)
        y = thud * 1.0 + puff + crunch * 0.9
    return fades(y, 0.0005, 0.03)


def step_stone(r, w=1.0, scuff=0.4, tiptoe=False):
    """a shoe / boot on cobbles: heel tick on stone + small body thump + grit scuff; tiptoe = toe tap only"""
    d = 0.2
    t = tt(d)
    nz = r.standard_normal(len(t))
    if tiptoe:
        tap = modal(d, [(r.uniform(900, 1400), 0.6, 0.004), (r.uniform(2300, 3300), 0.35, 0.002)], r)
        y = tap + bp(nz, 1500, 6000, 1) * np.exp(-t / 0.006) * 0.25 + lp(nz, 300, 2) * np.exp(-t / 0.01) * 0.3
        return fades(y * w, 0.0005, 0.02)
    heel = np.exp(-t / 0.018) * np.sin(phase(r.uniform(100, 140) * (1 + 0.3 * np.exp(-t / 0.005)))) * 0.8
    tick = modal(d, [(r.uniform(1500, 2400), 0.7, 0.005), (r.uniform(3200, 4600), 0.4, 0.003)], r)
    click = hp(nz, 3500) * np.exp(-t / 0.0008) * 0.35
    sc = bp(nz, 1200, 5000, 1) * np.clip(t / 0.015, 0, 1) * np.exp(-t / 0.05) * 0.18 * scuff
    return fades((heel + tick + click + sc) * w, 0.0005, 0.02)


def snort(r, dur=None, low=1.0):
    """horse snort / blow: air through the nostrils with a lip flutter (25-45 Hz AM), darkening as it ends"""
    d = dur or r.uniform(0.35, 0.6)
    n = ns(d)
    t = np.arange(n) / SR
    nz = colored(n, r, 0.3)
    fl = r.uniform(25, 45)
    am = 0.55 + 0.45 * np.sin(phase(np.full(n, fl) * (1 - 0.3 * t / d)) + r.uniform(0, TAU)) ** 2
    env = np.clip(t / 0.03, 0, 1) * np.exp(-t / (d * 0.45))
    y = (reson(nz, 520 * low, 1.6) + 0.8 * reson(nz, 1300 * low, 2.0) + 0.4 * reson(nz, 2600, 2.5)) * am * env
    y = shape(y, lambda T, F: np.exp(-(F[:, None] / 1000.0) * np.clip(T[None, :] / d, 0, 1) * 0.6), 512, 128)
    return fades(y / (np.abs(y).max() + 1e-9), 0.002, 0.04)


def whinny(r, dur=None, f0=None):
    """horse whinny: a high nasal call that trills (12-16 Hz) and slides down, ending in a blow"""
    d = dur or r.uniform(0.9, 1.3)
    f0 = f0 or r.uniform(780, 980)
    n = ns(d)
    t = np.arange(n) / SR
    u = t / d
    contour = np.interp(u, [0, 0.08, 0.3, 0.75, 1.0], [0.75, 1.08, 1.0, 0.62, 0.42])
    tr = r.uniform(12, 16)
    trill = 1 + 0.045 * np.sin(phase(np.full(n, tr))) * np.clip((u - 0.15) / 0.2, 0, 1)
    f = f0 * contour * trill
    ph = phase(f)
    y = np.zeros(n)
    for k in range(1, 9):
        fk = k * f
        H = 1 / (1 + ((fk - 1150) / 500) ** 2) + 0.6 / (1 + ((fk - 2600) / 700) ** 2) + 0.25
        y += H * k ** -0.9 * np.sin(k * ph + r.uniform(0, TAU)) * (fk < 9000)
    am = 0.6 + 0.4 * np.sin(phase(np.full(n, tr)) + 1.0) ** 2
    env = np.clip(u / 0.05, 0, 1) * np.clip((1 - u) / 0.25, 0, 1) * (1 - 0.3 * u)
    y = y / (np.std(y) + 1e-9) * am * env
    br = bp(r.standard_normal(n), 900, 5000, 1) * env * 0.25
    tail = snort(r, 0.35, 1.1)
    out = np.zeros(n + len(tail))
    out[:n] += y + br
    _place_mono(out, tail * 0.6, d - 0.05)
    return fades(out, 0.003, 0.05)


def leather(r, dur=0.3, rate0=60, rate1=110, bright=1.0):
    """saddle / harness / seat leather creak (low-Q stick-slip)"""
    return creak(dur, r, rate0, rate1, LEATHER, [(0, 0), (0.25, 1), (0.7, 0.8), (1, 0)], rough=0.25, noise=0.08,
                 scale=r.uniform(0.9, 1.1) * bright)


def hinge(r, dur=0.3, rate0=55, rate1=85, scale=0.55):
    """iron hinge squeal (coach door, gate)"""
    return creak(dur, r, rate0, rate1, IRON, [(0, 0), (0.2, 1), (0.8, 0.9), (1, 0)], rough=0.08, noise=0.02, scale=scale)


def latch(r, big=1.0):
    """door latch: iron click-clack + small wooden knock"""
    d = 0.25
    t = tt(d)
    y = modal(d, [(r.uniform(2100, 2700), 1.0, 0.012), (r.uniform(4200, 5200), 0.5, 0.006), (r.uniform(900, 1200), 0.4, 0.02)], r)
    y += hp(r.standard_normal(len(t)), 3000) * np.exp(-t / 0.0008) * 0.6
    y2 = modal(0.15, [(r.uniform(1700, 2200), 0.7, 0.01), (r.uniform(3500, 4300), 0.35, 0.005)], r)
    _place_mono(y, y2 * 0.7, r.uniform(0.035, 0.05))
    y += modal(d, [(r.uniform(260, 360), 0.5 * big, 0.02)], r)
    return fades(y * big, 0.0, 0.03)


def door_shut(r, big=1.0):
    """coach door shutting: lacquered wooden panel thump + latch clack + body rattle"""
    d = 0.7
    t = tt(d)
    nz = r.standard_normal(len(t))
    boom = np.exp(-t / 0.07) * np.sin(phase(r.uniform(85, 110) * (1 + 0.4 * np.exp(-t / 0.01)))) * 1.3
    panel = modal(d, [(r.uniform(160, 200), 1.0, 0.06), (r.uniform(330, 400), 0.7, 0.04), (r.uniform(620, 760), 0.45, 0.025),
                      (r.uniform(1100, 1400), 0.25, 0.015)], r)
    hit = bp(nz, 300, 4000, 1) * np.exp(-t / 0.006) * 0.8
    y = (boom + panel + hit) * big
    _place_mono(y, latch(r, 0.6) * 0.8, 0.004)
    _place_mono(y, rattle(0.3, r, 40, np.exp(-np.linspace(0, 4, ns(0.3))), heavy=True) * 0.25, 0.01)
    return fades(y, 0.0, 0.1)


def knock(r, f0=None, big=1.0):
    """one dry hollow wooden 'tock' (a knuckle on a coach panel; noise-excited, short, not a tuned woodblock)"""
    d = 0.3
    t = tt(d)
    f0 = f0 or r.uniform(520, 640)
    y = modal(d, [(f0, 1.0, 0.03), (f0 * 2.31, 0.45, 0.015), (f0 * 3.9, 0.2, 0.008), (f0 * 0.5, 0.4, 0.02)], r)
    y += bp(r.standard_normal(len(t)), 800, 5000, 1) * np.exp(-t / 0.002) * 0.6
    return fades(y * big, 0.0, 0.05)


def reins_snap(r):
    """reins flicked on the horses' backs: two quick leather slaps"""
    d = 0.25
    t = tt(d)
    nz = r.standard_normal(len(t))
    y = bp(nz, 700, 5500, 1) * np.exp(-t / 0.005) * 1.0 + lp(nz, 300, 2) * np.exp(-t / 0.012) * 0.5
    y2 = bp(r.standard_normal(len(t)), 900, 4500, 1) * np.exp(-t / 0.004) * 0.6
    _place_mono(y, y2, 0.06)
    return fades(y, 0.0, 0.03)


def cloth(r, dur=0.3, lo=500, hi=4000, peak=0.4):
    """cloth swish / grab"""
    n = ns(dur)
    t = np.arange(n) / SR
    pk = dur * peak
    env = np.where(t < pk, (t / pk) ** 1.5, np.exp(-(t - pk) / (dur * 0.25)))
    return bp(colored(n, r, 0.5), lo, hi, 1) * env * (0.7 + 0.3 * smooth_noise(n, r, 25))


def paper(r, dur=0.6, density=40.0, env_pts=None, crisp=1.0):
    """paper rustle / crinkle: dense micro-crackles (2-9 kHz) over a soft noise sheet"""
    n = ns(dur)
    t = np.arange(n) / SR
    pts = env_pts or [(0, 0), (0.1 * dur, 1), (0.7 * dur, 0.7), (dur, 0)]
    env = np.interp(t, [p[0] for p in pts], [p[1] for p in pts])
    y = bp(colored(n, r, 0.3), 1200, 7000, 1) * env * 0.18
    tm = r.uniform(0, 0.01)
    while tm < dur:
        k = ns(tm)
        a = env[min(k, n - 1)]
        L = ns(r.uniform(0.0015, 0.005))
        if a > 0.03 and k + L < n:
            c = bp(r.standard_normal(L), r.uniform(1800, 3500), 9000, 1) * np.exp(-np.arange(L) / (L * 0.3))
            y[k:k + L] += c * a * r.uniform(0.2, 1.0) * crisp
        tm += r.exponential(1.0 / max(density * max(a, 0.05), 1.0))
    return y


def paper_snap(r):
    """a bill pulled taut: crisp 'tchk' + low fwap"""
    d = 0.2
    t = tt(d)
    nz = r.standard_normal(len(t))
    y = bp(nz, 1500, 9000, 1) * np.exp(-t / 0.004) * 1.0 + lp(nz, 400, 2) * np.exp(-t / 0.015) * 0.5
    return fades(y, 0.0, 0.03)


def fire(dur, r, crackle=10.0, size=1.0):
    """torch flame: soft roaring breath (flicker) + resin crackles and pops"""
    n = ns(dur)
    roar = lp(colored(n, r, 1.2), 500, 2) * (0.6 + 0.4 * smooth_noise(n, r, 3.0)) * 0.5 * size
    roar += bp(colored(n, r, 0.8), 600, 2400, 1) * (0.5 + 0.5 * smooth_noise(n, r, 6.0)) ** 2 * 0.12
    y = roar
    tm = r.uniform(0, 0.1)
    while tm < dur:
        L = ns(r.uniform(0.002, 0.008))
        k = ns(tm)
        if k + L < n:
            big = r.uniform() < 0.12
            c = bp(r.standard_normal(L), 900 if big else 1800, 8000, 1) * np.exp(-np.arange(L) / (L * 0.25))
            if big:
                c = np.concatenate([c, lp(r.standard_normal(ns(0.02)), 900) * np.exp(-tt(0.02) / 0.005) * 0.4])
            _place_mono(y, c * r.uniform(0.3, 1.0) * (2.0 if big else 1.0), tm)
        tm += r.exponential(1.0 / crackle)
    return y


def owl(r, f0=None):
    """tawny-owl-like call: a long hoot, pause, a short wavering 'hoo-hoo-hooo' (soft, breathy, falling)"""
    f0 = f0 or r.uniform(380, 430)
    notes = [(0.0, 0.55, 1.0, 0.0), (0.95, 0.16, 0.95, 0.0), (1.17, 0.18, 0.97, 0.0), (1.42, 0.75, 0.93, 1.0)]
    out = np.zeros(ns(2.4))
    for t0, d, k, vib in notes:
        n = ns(d)
        t = np.arange(n) / SR
        f = f0 * k * (1 + 0.04 * np.exp(-t / 0.05)) * (1 - 0.05 * t / d) * (1 + vib * 0.03 * np.sin(phase(np.full(n, 7.0))) * np.clip(t / 0.2, 0, 1))
        ph = phase(f)
        y = np.sin(ph) + 0.12 * np.sin(2 * ph) + 0.04 * np.sin(3 * ph)
        env = np.clip(t / 0.06, 0, 1) ** 1.5 * np.clip((d - t) / 0.12, 0, 1)
        y = y * env + bp(r.standard_normal(n), 300, 1400, 1) * env * 0.08
        _place_mono(out, y, t0)
    return out


def dog_bark(r, n_barks=2):
    """distant farm dog: a few short 'wuf' barks"""
    out = np.zeros(ns(1.4))
    tm = 0.0
    for b in range(n_barks):
        d = r.uniform(0.13, 0.2)
        n = ns(d)
        t = np.arange(n) / SR
        f0 = r.uniform(380, 480) * np.interp(t, [0, d * 0.3, d], [0.9, 1.15, 0.8])
        forms = vowel_track(n, [(0, "U"), (d * 0.3, "a"), (d, "U")])
        amp = np.clip(t / 0.01, 0, 1) * np.exp(-t / (d * 0.5))
        y = vox(f0, forms, amp, r, 0.85, tilt=0.9, breath=0.5)
        _place_mono(out, y, tm)
        tm += r.uniform(0.3, 0.45)
    return out


def leaves(dur, r, density=1.0, bright=1.0, env=None):
    """leafy rustle: fast random AM over band noise + twig ticks"""
    n = ns(dur)
    am = np.clip(0.5 + 0.8 * smooth_noise(n, r, 18.0), 0, None) ** 2
    y = bp(colored(n, r, 0.5), 1200 * bright, 7500, 1) * am * 0.5
    tm = 0.0
    while tm < dur:
        L = ns(0.003)
        k = ns(tm)
        if k + L < n:
            y[k:k + L] += hp(r.standard_normal(L), 2500) * np.exp(-np.arange(L) / (SR * 0.0008)) * r.uniform(0.1, 0.6)
        tm += r.exponential(1.0 / (60 * density))
    if env is not None:
        y = y * env
    return y


def twig_snap(r):
    d = 0.15
    t = tt(d)
    y = modal(d, [(r.uniform(1400, 2200), 1.0, 0.006), (r.uniform(3000, 4500), 0.6, 0.003)], r)
    y += hp(r.standard_normal(len(t)), 2000) * np.exp(-t / 0.002) * 0.8
    return fades(y, 0.0, 0.02)


def gravel(dur, r, rate, env=None):
    """granular crunch (wheel rim on packed dirt / grit): `rate` grains per second (scalar or per-sample)"""
    n = ns(dur)
    y = np.zeros(n)
    tm = 0.0
    while tm < dur:
        k = ns(tm)
        if k >= n:
            break
        a = 1.0 if env is None else env[k]
        rr = rate if np.isscalar(rate) else rate[k]
        L = ns(r.uniform(0.002, 0.006))
        if a > 0.01 and k + L < n:
            y[k:k + L] += bp(r.standard_normal(L), r.uniform(900, 2500), 7000, 1) * np.exp(-np.arange(L) / (L * 0.3)) * a * r.uniform(0.2, 1.0)
        tm += r.exponential(1.0 / max(rr, 1.0))
    return y


def barrel_thump(r, big=1.0):
    """full wooden barrel set down on a cart bed: hollow low thock (from the Bastille kit)"""
    d = 0.5
    t = tt(d)
    body = modal(d, [(r.uniform(95, 125), 1.0, 0.09), (r.uniform(210, 260), 0.7, 0.06), (r.uniform(420, 520), 0.45, 0.035),
                     (r.uniform(800, 1000), 0.2, 0.02)], r)
    kn = bp(r.standard_normal(len(t)), 300, 3000, 1) * np.exp(-t / 0.008) * 0.6
    thud = lp(r.standard_normal(len(t)), 200, 2) * np.exp(-t / 0.03) * 1.2 * big
    return fades((body + kn + thud) * big, 0.0, 0.05)
