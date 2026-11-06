# VARENNES v4: v3 (picture from story frame 172 = 5.7333 s, SFX -7 dB vs v1, voice bit-identical, ~-14 LUFS, TP <= -1)
# re-timed to the cam owner's story.ts after the frame-by-frame QA (remotion-shorts/src/videos/varennes_cam/story.ts,
# read-only; dumped by `node dump_story.mjs <that story.ts> story_frames_v4.json`):
#   - coach door (take 2) opens 540-548 -> latch + hinge there (sfx.door2_open() reads coachAt(2).door)
#   - Drouet walks out slowly (<= 0.058 m/f) from 826, visible from 832 -> boots follow the new drouetAt(3) phase
#   - the bridge cart moves only 4.3 m (peak 0.25 m/f) -> shorter, lighter push; scrape only while it turns AND moves
#   - the bill eases to rest exactly at its landing (1756) -> flutter follows its speed, flaps die as (1-u)^2, soft settle
# Writes mix_v4.wav + stem_sfx_v4.wav (2,556,800 samples each); the voice stem stays stem_voice_v2.wav.
import os
os.environ["STORY_FRAMES"] = "story_frames_v4.json"
import numpy as np                                   # noqa: E402
from dsp import SR, ns, dbg, read_wav, write_wav, true_peak, lra   # noqa: E402
import mix as M                                      # noqa: E402
import sfx                                           # noqa: E402
import timeline as T                                 # noqa: E402
from mix_v3 import sfx_table, ramp_in, K0, N2         # noqa: E402

HERE = os.path.dirname(os.path.abspath(__file__))
SFX_TRIM = -7.0


def main():
    assert T._J is not None and os.environ["STORY_FRAMES"] == "story_frames_v4.json"
    words = T.words()
    vfull, nv = M.load_voice()
    v_ref = M.lufs(vfull)
    s1, C = sfx.render(v_ref, words)
    vo, _ = read_wav(T.VOICE)
    v, _ = read_wav(os.path.join(HERE, "stem_voice_v2.wav"))
    fi = ns(0.010)
    seg = vo[0, K0:K0 + N2]
    exact = bool(np.array_equal(v[0, fi:len(seg)], seg[fi:]) and np.array_equal(v[0], v[1]) and not np.any(v[:, len(seg):]))
    s = s1[:, K0:K0 + N2] * dbg(SFX_TRIM)
    fs = ns(0.150)
    s[:, :fs] *= ramp_in(fs)[None, :]
    assert v.shape == (2, N2) and s.shape == (2, N2)
    pre = v + s
    G = M.TARGET_LUFS - M.lufs(pre)
    for _ in range(6):
        y, g = M.limiter(pre * dbg(G))
        L = M.lufs(y)
        if abs(L - M.TARGET_LUFS) < 0.02:
            break
        G += M.TARGET_LUFS - L
    write_wav(os.path.join(HERE, "mix_v4.wav"), y)
    write_wav(os.path.join(HERE, "stem_sfx_v4.wav"), s)
    grdb = -20 * np.log10(g)
    stt = dict(I=M.lufs(y), TP=true_peak(y), LRA=lra(y), G=G, grmax=float(grdb.max()), gr05=float((grdb > 0.5).mean() * 100),
               voice=M.lufs(v), sfx=M.lufs(s), pre=M.lufs(pre), exact=exact)
    print({k: (round(float(x), 2) if not isinstance(x, bool) else x) for k, x in stt.items()})
    eb = {f: M.ffmpeg_ebur(os.path.join(HERE, f)) for f in ("mix_v4.wav", "stem_sfx_v4.wav", "stem_voice_v2.wav")}
    for k, e in eb.items():
        print(k)
        print(e)
    update_cues(C, stt, eb)


def update_cues(C, stt, eb):
    p = os.path.join(HERE, "cues.md")
    lines = open(p, encoding="utf-8").read().split("\n")
    a = next(i for i, l in enumerate(lines) if l.startswith("| # | frame |"))
    b = a
    while b < len(lines) and lines[b].startswith("|"):
        b += 1
    lines = lines[:a] + sfx_table(C) + lines[b:]
    txt = "\n".join(lines)
    txt = txt.replace("## v3 (current delivery)", "## v3 (superseded by v4)")
    mark = "\n## v4 (current delivery)"
    if mark in txt:
        txt = txt[: txt.index(mark)]
    d2a, d2b = sfx.door2_open()
    dw0, dw1, dvis = sfx.drouet3_walk()
    cp = [T.F(f)["cart"]["pos"] for f in range(T.CUE["CART_PUSH"][0], T.CUE["CART_PUSH"][1] + 1)]
    cl = sum(np.hypot(cp[i + 1][0] - cp[i][0], cp[i + 1][2] - cp[i][2]) for i in range(len(cp) - 1))
    ct = next(f for f in range(T.CUE["CART_PUSH"][0], T.CUE["CART_PUSH"][1] + 1) if T.F(f)["cart"]["u"] >= 0.45)
    whips = sfx.whip_frames()
    L = [mark, "",
         "Re-timed to the cam owner's story.ts after the frame-by-frame QA (`remotion-shorts/src/videos/varennes_cam/story.ts`, read-only, "
         "dumped to `story_frames_v4.json`; CUE table unchanged). The SFX events table above is now the v4 render (story frames; levels v1-relative). "
         "Built by `python mix_v4.py`.", "",
         f"- Coach door, take 2: latch at {d2a}, hinge squeal {d2a}-{d2b} (was 563-571).",
         f"- Drouet, take 3: boots follow the new drouetAt(3) step phase, walking {dw0 + 1}-{dw1 - 1} at <= 0.058 m/f; he is visible from {dvis}, "
         f"the steps before that (inside the doorway) are 5 dB softer. Inn door creak 826-840 as in v3.",
         f"- Bridge cart: pushed {cl:.1f} m ({T.CUE['CART_PUSH'][0]}-{T.CUE['CART_PUSH'][1]}, peak 0.25 m/f): fewer cobble bumps and wheel creaks (they follow the "
         f"distance), the scrape only while it turns AND moves ({ct}-{T.CUE['CART_PUSH'][1]}, dying as it stops), cue 3 dB lower.",
         f"- Bill: flutter follows the dumped fall speed (eases in and out), flaps die as (1-u)^2, a soft paper settle (no tap) on the landing frame {sfx.bill_land()}.",
         "- Branch whips re-timed to the new take-4 lens: " + ", ".join(f"f{f}" for f, _, _ in whips) + "; barrel thuds unchanged (1597 / 1605 / 1612).", "",
         "| file | content |", "|---|---|",
         "| `mix_v4.wav` | stem_voice_v2 + stem_sfx_v4, one master gain %+.2f dB, true-peak limiter -1 dBTP (max GR %.2f dB, > 0.5 dB on %.2f %% of samples) |" % (stt["G"], stt["grmax"], stt["gr05"]),
         "| `stem_sfx_v4.wav` | SFX from story sample 275,200, -7 dB vs v1, 150 ms fade-in |",
         "| `stem_voice_v2.wav` | the voice stem (unchanged; bit-identical to voice.wav after its 10 ms fade-in: %s) |" % stt["exact"], "",
         "All: 48 kHz stereo 24-bit, 2,556,800 samples = 53.2667 s = 1598 frames, picture-aligned (sample k = story sample 275,200 + k).", "",
         "- **mix_v4.wav**: integrated %.1f LUFS, true peak %.1f dBTP, LRA %.1f LU." % (stt["I"], stt["TP"], stt["LRA"]),
         "- Unity premaster %.1f LUFS; voice %.1f LUFS; SFX %.1f LUFS (%.1f LU under the voice)." % (stt["pre"], stt["voice"], stt["sfx"], stt["voice"] - stt["sfx"]), ""]
    for k, e in eb.items():
        L += [f"ffmpeg ebur128, `{k}`:", "```", e, "```"]
    open(p, "w", encoding="utf-8").write(txt.rstrip("\n") + "\n" + "\n".join(L) + "\n")


if __name__ == "__main__":
    main()
