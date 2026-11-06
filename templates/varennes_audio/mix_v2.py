# VARENNES v2 (user revision): the picture now starts at story frame 172 (5.7333 s, on "En juin 1791"); SFX -3 dB vs v1.
# Reads the v1 renders (stem_sfx.wav from `python mix.py`, voice/voice.wav) and writes, each exactly (1770-172)/30 s =
# 53.2667 s = 2,556,800 samples, 48 kHz stereo 24-bit:
#   stem_voice_v2.wav  voice/voice.wav from story sample 275,200 (5.7333 s) on, 10 ms fade-in, otherwise bit-identical
#   stem_sfx_v2.wav    stem_sfx.wav from the same sample, -3 dB, 150 ms fade-in
#   mix_v2.wav         (voice + sfx) x one common master gain -> ~-14 LUFS, true-peak limiter at -1 dBTP
# Sync: v2 sample k = story sample 275,200 + k for voice AND sfx (picture-aligned). The voice dip spans 5.72-5.74 s
# (~-20 dBFS RMS flat), so starting at 5.7333 s cuts inside the same dip as 5.720 s; cutting at 5.720 and prepending
# 13.3 ms would have delayed the voice by 26.7 ms against the picture.
import os
import numpy as np
from dsp import SR, ns, st, dbg, read_wav, write_wav, integrated, true_peak, momentary, lra
import mix as M

HERE = os.path.dirname(os.path.abspath(__file__))
F0 = 172
K0 = F0 * SR // 30                    # 275,200
N2 = (1770 - F0) * SR // 30           # 2,556,800
SFX_TRIM = -3.0


def ramp_in(n):
    return 0.5 - 0.5 * np.cos(np.pi * np.arange(n) / n)


def main():
    vo, sr = read_wav(M.T.VOICE)
    assert sr == SR and vo.shape[0] == 1
    v = np.zeros(N2)
    seg = vo[0, K0:K0 + N2]
    v[: len(seg)] = seg
    fi = ns(0.010)
    v[:fi] *= ramp_in(fi)
    v = st(v)
    s1, _ = read_wav(os.path.join(HERE, "stem_sfx.wav"))
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
    write_wav(os.path.join(HERE, "mix_v2.wav"), y)
    write_wav(os.path.join(HERE, "stem_sfx_v2.wav"), s)
    write_wav(os.path.join(HERE, "stem_voice_v2.wav"), v)
    # bit-identity of the voice after the fade-in
    vr, _ = read_wav(os.path.join(HERE, "stem_voice_v2.wav"))
    exact = bool(np.array_equal(vr[0, fi:len(seg)], vo[0, K0 + fi:K0 + len(seg)]) and np.array_equal(vr[0], vr[1]))
    grdb = -20 * np.log10(g)
    stt = dict(I=M.lufs(y), TP=true_peak(y), LRA=lra(y), G=G, grmax=float(grdb.max()), gr05=float((grdb > 0.5).mean() * 100),
               voice=M.lufs(v), sfx=M.lufs(s), pre=M.lufs(pre), exact=exact)
    print({k: (round(float(x), 2) if not isinstance(x, bool) else x) for k, x in stt.items()})
    eb = {f: M.ffmpeg_ebur(os.path.join(HERE, f)) for f in ("mix_v2.wav", "stem_sfx_v2.wav", "stem_voice_v2.wav")}
    for k, e in eb.items():
        print(k)
        print(e)
    write_section(stt, eb)


def write_section(stt, eb):
    p = os.path.join(HERE, "cues.md")
    txt = open(p, encoding="utf-8").read()
    mark = "\n## v2 (current delivery)"
    if mark in txt:
        txt = txt[: txt.index(mark)]
    L = [mark, "",
         "User revision: the video starts at story frame 172 (5.7333 s, on \"En juin 1791\"); the hook is cut. SFX -3 dB vs v1. "
         "Built by `python mix_v2.py` from the v1 stems (same cues, same timing; frame numbers in the tables above are STORY "
         "frames: v2 time = story time - 5.7333 s).", "",
         "| file | content |", "|---|---|",
         "| `mix_v2.wav` | voice + SFX, one master gain %+.2f dB, true-peak limiter -1 dBTP (max GR %.2f dB, > 0.5 dB on %.2f %% of samples) |" % (stt["G"], stt["grmax"], stt["gr05"]),
         "| `stem_sfx_v2.wav` | v1 SFX stem from story sample 275,200, -3 dB, 150 ms fade-in |",
         "| `stem_voice_v2.wav` | voice.wav from story sample 275,200, 10 ms fade-in, otherwise bit-identical (%s) |" % stt["exact"], "",
         "All: 48 kHz stereo 24-bit, 2,556,800 samples = 53.2667 s = 1598 frames. Voice and SFX stay picture-aligned (v2 sample k = story sample 275,200 + k). "
         "The voice is cut at 5.7333 s, inside the 5.72-5.74 s dip (~-20 dBFS RMS, flat): cutting at 5.720 s and prepending 13.3 ms would have put the voice 26.7 ms late.", "",
         "- **mix_v2.wav**: integrated %.1f LUFS, true peak %.1f dBTP, LRA %.1f LU." % (stt["I"], stt["TP"], stt["LRA"]),
         "- Unity premaster %.1f LUFS; voice %.1f LUFS; SFX %.1f LUFS (%.1f LU under the voice; v1 was 13.4)." % (stt["pre"], stt["voice"], stt["sfx"], stt["voice"] - stt["sfx"]),
         "- Escort hooves still recede from story frame 1700 (the escort now rides off with the coach in picture).", ""]
    for k, e in eb.items():
        L += [f"ffmpeg ebur128, `{k}`:", "```", e, "```"]
    open(p, "w", encoding="utf-8").write(txt + "\n".join(L) + "\n")


if __name__ == "__main__":
    main()
