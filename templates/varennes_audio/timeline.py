# Picture timeline of the VARENNES short, read from MAIN story.ts (never edited): `node dump_story.mjs` writes
# story_frames.json (CUE table + per-frame coach / team / Drouet / cart / assignat / camera state), this module wraps it.
# 1770 frames at 30 fps = 59.000 s. 4 long takes, hard cuts at 473, 724, 1456. Voice timings: ../voice/words.json.
import os
import json
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
FPS = 30
TOTAL = 1770
DUR = TOTAL / FPS                # 59.000 s exactly
CUTS = [0, 473, 724, 1456, 1770]
TAKES = {1: "paris", 2: "road", 3: "relay", 4: "ride"}
VOICE = os.path.join(HERE, "..", "voice", "voice.wav")
WORDS = os.path.join(HERE, "..", "voice", "words.json")

_J = json.load(open(os.path.join(HERE, os.environ.get("STORY_FRAMES", "story_frames.json")), encoding="utf-8"))
assert _J["TOTAL"] == TOTAL, _J["TOTAL"]
CUE = _J["CUE"]
W = CUE["W"]
FR = _J["frames"]


def fr(f):
    return f / FPS


def take_of(f):
    f = int(np.floor(f))
    for i in range(4):
        if CUTS[i] <= f < CUTS[i + 1]:
            return i + 1
    return 4


def take_span(i):
    """(start s, end s) of take i"""
    return fr(CUTS[i - 1]), fr(CUTS[i])


def F(f):
    return FR[int(np.clip(int(f), 0, TOTAL - 1))]


def series(f0, f1, key):
    """np.array of key(frame dict) for frames f0..f1-1"""
    return np.array([key(FR[f]) for f in range(f0, f1)], dtype=float)


def rel(pos, f, pan_w=0.8):
    """distance (m) and stereo pan (-1..1) of a world point seen from the take camera at frame f"""
    c = F(f)
    p, lk = np.array(c["cam"]), np.array(c["look"])
    fwd = lk - p
    fx, fz = fwd[0], fwd[2]
    L = np.hypot(fx, fz) or 1.0
    fx, fz = fx / L, fz / L
    rx, rz = -fz, fx                        # camera right (three.js: x east, z south, y up)
    d = np.array(pos, float) - p
    dist = float(np.linalg.norm(d))
    h = np.hypot(d[0], d[2]) or 1.0
    pn = (d[0] * rx + d[2] * rz) / h
    return dist, float(np.clip(pn * pan_w, -1, 1))


def footfalls(ph, frames, offsets_of):
    """sub-frame times (s) where a cyclic phase (0..1 per frame) crosses each leg offset.
    ph: phases per frame; frames: matching frame numbers; offsets_of(i) -> offsets valid between frames[i] and [i+1]."""
    u = np.unwrap(np.asarray(ph) * 2 * np.pi) / (2 * np.pi)
    out = []
    for i in range(len(u) - 1):
        a, b = u[i], u[i + 1]
        if b <= a + 1e-9:
            continue
        for leg, o in enumerate(offsets_of(i)):
            k0, k1 = np.floor(a - o), np.floor(b - o)
            if k1 > k0:
                for k in range(int(k0) + 1, int(k1) + 1):
                    x = k + o
                    out.append(((frames[i] + (x - a) / (b - a)) / FPS, leg))
    return sorted(out)


GAIT_OFF = {"stand": [], "walk": [0.25, 0.75, 0.0, 0.5], "trot": [0.0, 0.5, 0.5, 0.0], "gallop": [0.42, 0.3, 0.12, 0.0]}


def words(path=WORDS):
    w = json.load(open(path, encoding="utf-8"))
    return [dict(w=x["word"], s=float(x["start"]), e=float(x["end"])) for x in w]
