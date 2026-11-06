# VARENNES v3 (user revision): same as v2 (picture starts at story frame 172 = 5.7333 s; voice bit-identical after a
# 10 ms fade-in; SFX 150 ms fade-in) with the SFX stem -7 dB vs v1 (v2 was -3), and the inn door re-timed to the char
# owner's new swing (826-840, soft latch + creak). Re-renders the SFX with the v1 voice reference (so every cue keeps its
# v1 level), then writes, each 2,556,800 samples (48 kHz stereo 24-bit):
#   stem_sfx_v3.wav  the SFX from story sample 275,200, -7 dB, 150 ms fade-in
#   mix_v3.wav       (stem_voice_v2 + stem_sfx_v3) x one common master gain -> ~-14 LUFS, true-peak limiter -1 dBTP
# The voice stem is unchanged: use stem_voice_v2.wav (re-checked bit-identical here). Updates cues.md (SFX table + v3).
import os
import numpy as np
from dsp import SR, ns, st, dbg, read_wav, write_wav, true_peak, lra
import mix as M
import sfx
import timeline as T

HERE = os.path.dirname(os.path.abspath(__file__))
F0 = 172
K0 = F0 * SR // 30                    # 275,200
N2 = (1770 - F0) * SR // 30           # 2,556,800
SFX_TRIM = -7.0


def ramp_in(n):
    return 0.5 - 0.5 * np.cos(np.pi * np.arange(n) / n)


def main():
    words = T.words()
    vfull, nv = M.load_voice()
    v_ref = M.lufs(vfull)                                   # same reference as v1 (-17.54 LUFS)
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
    write_wav(os.path.join(HERE, "mix_v3.wav"), y)
    write_wav(os.path.join(HERE, "stem_sfx_v3.wav"), s)
    grdb = -20 * np.log10(g)
    stt = dict(I=M.lufs(y), TP=true_peak(y), LRA=lra(y), G=G, grmax=float(grdb.max()), gr05=float((grdb > 0.5).mean() * 100),
               voice=M.lufs(v), sfx=M.lufs(s), pre=M.lufs(pre), exact=exact)
    print({k: (round(float(x), 2) if not isinstance(x, bool) else x) for k, x in stt.items()})
    eb = {f: M.ffmpeg_ebur(os.path.join(HERE, f)) for f in ("mix_v3.wav", "stem_sfx_v3.wav", "stem_voice_v2.wav")}
    for k, e in eb.items():
        print(k)
        print(e)
    update_cues(C, stt, eb)


def sfx_table(C):
    rows = ["| # | frame | time s | take | cue | what | naive | applied | measured | pan |", "|---|---|---|---|---|---|---|---|---|---|"]
    for i, c in enumerate(sorted(C, key=lambda c: (c.f, c.name))):
        kind = " (bed)" if c.kind == "bed" else ""
        ms = "-" if c.measured is None else f"{c.measured:+.1f}"
        pn = "moving" if c.pos is None and c.p == 0.0 else f"{c.p:+.2f}"
        rows.append(f"| {i + 1} | {c.f:.0f} | {c.t:.2f} | {c.take} | {c.name}{kind} | {c.desc} | {c.naive:+.0f} | {c.applied:+.0f} | {ms} | {pn} |")
    return rows


def update_cues(C, stt, eb):
    p = os.path.join(HERE, "cues.md")
    lines = open(p, encoding="utf-8").read().split("\n")
    # replace the SFX events table (levels are v1-relative; the v2 / v3 stem trims apply on top)
    a = next(i for i, l in enumerate(lines) if l.startswith("| # | frame |"))
    b = a
    while b < len(lines) and lines[b].startswith("|"):
        b += 1
    lines = lines[:a] + sfx_table(C) + lines[b:]
    txt = "\n".join(lines)
    txt = txt.replace("## v2 (current delivery)", "## v2 (superseded by v3)")
    mark = "\n## v3 (current delivery)"
    if mark in txt:
        txt = txt[: txt.index(mark)]
    L = [mark, "",
         "User revision: SFX a further -4 dB (-7 dB vs v1 in total); the inn door re-timed to the char owner's new swing "
         "(story 826-840, before Drouet steps out at 842): soft latch + slow wooden creak (cue `inn_door`, table above). "
         "Everything else as v2: picture starts at story frame 172 (5.7333 s); v3 time = story time - 5.7333 s. "
         "Built by `python mix_v3.py` (re-renders the SFX with the v1 voice reference, so the table's levels stay v1-relative).", "",
         "| file | content |", "|---|---|",
         "| `mix_v3.wav` | stem_voice_v2 + stem_sfx_v3, one master gain %+.2f dB, true-peak limiter -1 dBTP (max GR %.2f dB, > 0.5 dB on %.2f %% of samples) |" % (stt["G"], stt["grmax"], stt["gr05"]),
         "| `stem_sfx_v3.wav` | SFX from story sample 275,200, -7 dB vs v1, 150 ms fade-in |",
         "| `stem_voice_v2.wav` | the voice stem for v3 too (unchanged; bit-identical to voice.wav after its 10 ms fade-in: %s) |" % stt["exact"], "",
         "All: 48 kHz stereo 24-bit, 2,556,800 samples = 53.2667 s = 1598 frames, picture-aligned (sample k = story sample 275,200 + k).", "",
         "- **mix_v3.wav**: integrated %.1f LUFS, true peak %.1f dBTP, LRA %.1f LU." % (stt["I"], stt["TP"], stt["LRA"]),
         "- Unity premaster %.1f LUFS; voice %.1f LUFS; SFX %.1f LUFS (%.1f LU under the voice; v2 16.2, v1 13.4)." % (stt["pre"], stt["voice"], stt["sfx"], stt["voice"] - stt["sfx"]),
         "- Escort hooves still recede from story frame 1700.", ""]
    for k, e in eb.items():
        L += [f"ffmpeg ebur128, `{k}`:", "```", e, "```"]
    open(p, "w", encoding="utf-8").write(txt.rstrip("\n") + "\n" + "\n".join(L) + "\n")


if __name__ == "__main__":
    main()
