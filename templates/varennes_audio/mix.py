# Mix of the VARENNES short (adapted from the Bastille mix.py; NO MUSIC - voice + synthesized SFX only).
# The user's French voice (../voice/voice.wav) is FINAL: it is never processed (no EQ, no compression, no gain of its own);
# stem_voice.wav is that file, sample for sample, as dual mono, padded with silence to 59.000 s.
# SFX = sfx.py event cues at naive - 6 dB (standard mix) + ambience beds ducked under the speech spans of words.json.
# mix.wav = (voice + SFX) x ONE common master gain to reach about -14 LUFS, then a true-peak safety limiter
# (ceiling -1 dBTP) on the summed master. Gain reduction statistics are reported in cues.md.
# Outputs (48 kHz, stereo, 24-bit, exactly 59.000 s = 2,832,000 samples = 1770 frames at 30 fps):
#   mix.wav         voice + SFX, mastered
#   stem_sfx.wav    SFX only, at its level in the unity-gain premaster (voice at unity)
#   stem_voice.wav  the voice, unity gain (premaster = stem_voice + stem_sfx; mix.wav = limiter(premaster x master gain))
#   cues.md         cue sheet + loudness report
import os
import sys
import time
import shutil
import subprocess
import numpy as np
from sp import ndimage, signal
from dsp import SR, ns, st, dbg, read_wav, write_wav, integrated, momentary, short_term, lra, true_peak
import timeline as T

HERE = os.path.dirname(os.path.abspath(__file__))
FFDIR = os.environ.get("FFMPEG_DIR", "")  # set FFMPEG_DIR if ffmpeg is not on PATH
FFMPEG = shutil.which("ffmpeg") or os.path.join(FFDIR, "ffmpeg.exe")
N = ns(T.DUR)                    # 2,832,000 samples = 59.000 s
CEIL_DBTP = -1.0
TARGET_LUFS = -14.0
REPORT = [("1 Paris, night", *T.take_span(1)), ("2 disguise + road, night->dawn", *T.take_span(2)),
          ("3 Sainte-Menehould relay, evening", *T.take_span(3)), ("4 ride + Varennes, night", *T.take_span(4))]


def log(*a):
    print(f"[{time.strftime('%H:%M:%S')}]", *a, flush=True)


def lufs(x):
    v = integrated(x)
    return v if np.isfinite(v) else -99.0


def load_voice():
    x, sr = read_wav(T.VOICE)
    assert sr == SR, sr
    assert x.shape[0] == 1, "voice.wav is expected mono"
    v = x[0]
    assert len(v) <= N, len(v)
    out = np.zeros(N)
    out[: len(v)] = v
    return st(out), len(v)


def limiter(x, ceil_db=CEIL_DBTP, look=0.003, rel=0.08):
    """4x-oversampled peak detection, look-ahead min filter, one-pole release, centred smoothing"""
    c = dbg(ceil_db - 0.05)
    n = x.shape[1]
    up = np.abs(signal.resample_poly(x, 4, 1, axis=-1)).max(0)
    pk = np.pad(up, (0, max(0, 4 * n - len(up))))[: 4 * n].reshape(n, 4).max(1)
    gr = np.minimum(1.0, c / np.maximum(pk, 1e-12))
    La = max(1, ns(look))
    g1 = ndimage.minimum_filter1d(gr, 2 * La + 1, mode="nearest")
    g2 = g1.copy()
    idx = np.flatnonzero(g1 < 1.0)
    if len(idx):
        kr = 1 - np.exp(-1 / (rel * SR))
        gap = ns(rel * 8)
        brk = np.flatnonzero(np.diff(idx) > gap)
        starts = np.concatenate([[idx[0]], idx[brk + 1]])
        ends = np.concatenate([idx[brk], [idx[-1]]])
        for a, b_ in zip(starts, ends):
            e = min(n, b_ + gap)
            seg = g1[a:e]
            out = np.empty(len(seg))
            g = 1.0
            for k in range(len(seg)):
                g = min(seg[k], g + (1 - g) * kr)
                out[k] = g
            g2[a:e] = out
    g3 = np.minimum(ndimage.uniform_filter1d(g2, 2 * La + 1, mode="nearest"), 1.0)
    return x * g3[None, :], g3


def ffmpeg_ebur(path):
    try:
        r = subprocess.run([FFMPEG, "-hide_banner", "-nostats", "-i", path, "-af", "ebur128=peak=true", "-f", "null", "-"],
                           capture_output=True, text=True, timeout=300)
        txt = r.stderr
        i = txt.rfind("Summary:")
        if i < 0:
            return txt[-1500:]
        out = []
        for line in txt[i:].splitlines():
            if line.strip():
                out.append(line.rstrip())
            if line.strip().startswith("Peak:"):
                break
        return "\n".join(out)
    except Exception as e:  # noqa
        return f"ffmpeg check failed: {e}"


def section_table(v, s, words):
    Mv, Mb = momentary(v), momentary(s)
    tc = np.arange(len(Mv)) * 0.01 + 0.2
    speak = np.zeros(len(tc), bool)
    for w in words:
        speak |= (tc >= w["s"] + 0.03) & (tc <= w["e"] - 0.03)
    speak &= Mv > lufs(v) - 10
    rows = []
    for name, a, b in REPORT:
        seg = slice(ns(a), ns(b))
        Lv, Ls = lufs(v[:, seg]), lufs(s[:, seg])
        k = speak & (tc >= a) & (tc < b) & np.isfinite(Mb) & (Mb > -70)
        med = float(np.median(Mv[k] - Mb[k])) if k.sum() > 5 else float("nan")
        p10 = float(np.percentile(Mv[k] - Mb[k], 10)) if k.sum() > 5 else float("nan")
        rows.append((name, a, b, Lv, Ls, Lv - Ls, p10, med))
    return rows


def main():
    t0 = time.time()
    words = T.words()
    v, nv = load_voice()
    v_ref = lufs(v)
    log(f"voice: {v_ref:.2f} LUFS (dual mono), TP {true_peak(v):.2f} dBTP, {nv} samples")

    import sfx
    s, C = sfx.render(v_ref, words)
    log("sfx rendered", f"{lufs(s):.2f} LUFS")
    pre = v + s

    # ---- one common master gain on the premaster (voice balance untouched), true-peak limiter on the sum
    G = TARGET_LUFS - lufs(pre)
    for it in range(6):
        y, g = limiter(pre * dbg(G))
        L = lufs(y)
        if abs(L - TARGET_LUFS) < 0.02:
            break
        G += TARGET_LUFS - L
    log(f"master gain {G:+.2f} dB")
    assert y.shape == (2, N) and s.shape == (2, N) and v.shape == (2, N)
    write_wav(os.path.join(HERE, "mix.wav"), y)
    write_wav(os.path.join(HERE, "stem_sfx.wav"), s)
    write_wav(os.path.join(HERE, "stem_voice.wav"), v)
    log("wrote mix + stems")

    # voice untouched check: stem_voice re-read == original samples
    vr, _ = read_wav(os.path.join(HERE, "stem_voice.wav"))
    vo, _ = read_wav(T.VOICE)
    voice_exact = bool(np.array_equal(vr[0, :nv], vo[0]) and np.array_equal(vr[1, :nv], vo[0]) and not np.any(vr[:, nv:]))

    grdb = -20 * np.log10(g)
    sp_mask = np.zeros(N, bool)
    for w in words:
        sp_mask[ns(w["s"]): ns(w["e"])] = True
    st_ = dict(I=lufs(y), TP=true_peak(y), LRA=lra(y), Mmax=float(np.max(momentary(y))), Smax=float(np.max(short_term(y))),
               grmax=float(grdb.max()), gr01=float((grdb > 0.1).mean() * 100), gr05=float((grdb > 0.5).mean() * 100),
               gr_speech_p99=float(np.percentile(grdb[sp_mask], 99)), G=G, pre=lufs(pre), pre_tp=true_peak(pre),
               voice=v_ref, voice_tp=true_peak(v), sfx=lufs(s), sfx_tp=true_peak(s), voice_exact=voice_exact)
    log({k: (round(v_, 2) if isinstance(v_, float) else v_) for k, v_ in st_.items()})
    rows = section_table(v, s, words)
    for r in rows:
        log(f"{r[0]:<36} voice {r[3]:6.1f}  sfx {r[4]:6.1f}  margin {r[5]:5.1f}  speech med {r[7]:5.1f} p10 {r[6]:5.1f}")
    eb = {f: ffmpeg_ebur(os.path.join(HERE, f)) for f in ("mix.wav", "stem_sfx.wav", "stem_voice.wav")}
    for k, e in eb.items():
        print(k)
        print(e)
    write_cues(C, st_, rows, eb)
    log(f"done in {time.time() - t0:.0f} s")


def write_cues(C, st_, rows, eb):
    import sfx
    L = []
    w = L.append
    w("# VARENNES - sound cue sheet")
    w("")
    w("**No music.** Voice + SFX only. Every SFX is original, synthesized in numpy (`sfx.py` cue list, `sfx_gen.py` + `foley.py` "
      "generators, `dsp.py` / `sp.py` DSP), placed from the picture's own timing: `node dump_story.mjs` evaluates MAIN "
      "`remotion-shorts/src/videos/varennes/story.ts` (CUE, coachAt, teamAt, drouetAt, bridgeCartAt, assignatAt, fadeAt, camAt) "
      "frame by frame into `story_frames.json`, so hooves follow each horse's leg phase, wheels follow the coach's arc length, "
      "footsteps follow the walkers' phases, and moving sources are panned / attenuated from the take camera.")
    w(f"Timeline: 1770 frames @ 30 fps = 59.000 s; 4 takes, hard cuts at 473 / 724 / 1456: every bed, event tail and reverb tail is cut on the cut.")
    w("")
    w("## Files")
    w("| file | content |")
    w("|---|---|")
    w(f"| `mix.wav` | voice + SFX: premaster x master gain {st_['G']:+.2f} dB, then true-peak limiter (ceiling {CEIL_DBTP} dBTP) |")
    w("| `stem_sfx.wav` | SFX only, at its level in the unity-gain premaster |")
    w("| `stem_voice.wav` | `voice/voice.wav` unchanged (unity gain, no EQ / compression), dual mono, padded with silence to 59.000 s |")
    w("")
    w(f"All files: 48 kHz, stereo, 24-bit PCM, 2,832,000 samples = 59.000 s. stem_voice.wav bit-identical to voice.wav: **{st_['voice_exact']}**. "
      "`stem_voice + stem_sfx` = the unity premaster; `mix.wav` = limiter(premaster x master gain).")
    w("")
    w("## Loudness")
    w(f"- **mix.wav**: integrated {st_['I']:.1f} LUFS, true peak {st_['TP']:.1f} dBTP, LRA {st_['LRA']:.1f} LU, max momentary {st_['Mmax']:.1f}, "
      f"max short-term {st_['Smax']:.1f}.")
    w(f"- Master: one common gain {st_['G']:+.2f} dB on voice + SFX together (their balance is the unity premaster's). "
      f"True-peak limiter: max GR {st_['grmax']:.2f} dB, > 0.1 dB on {st_['gr01']:.2f} % and > 0.5 dB on {st_['gr05']:.2f} % of samples "
      f"(99th percentile during speech {st_['gr_speech_p99']:.2f} dB).")
    w(f"- Unity premaster (voice + SFX): {st_['pre']:.1f} LUFS, TP {st_['pre_tp']:.1f} dBTP. Voice alone {st_['voice']:.1f} LUFS (dual mono), TP {st_['voice_tp']:.1f} dBTP. "
      f"SFX stem {st_['sfx']:.1f} LUFS, TP {st_['sfx_tp']:.1f} dBTP.")
    w("")
    for k, e in eb.items():
        w(f"ffmpeg ebur128, `{k}`:")
        w("```")
        w(e)
        w("```")
    w("")
    w("## Voice over SFX, per take (unity premaster, LUFS)")
    w("margin = voice - SFX (integrated); speech median / p10 = 400 ms momentary margin on windows inside spoken words.")
    w("")
    w("| take | time s | voice | sfx | margin LU | speech median | speech p10 |")
    w("|---|---|---|---|---|---|---|")
    f = lambda x: "-" if (not np.isfinite(x) or x <= -98) else f"{x:.1f}"
    for r in rows:
        w(f"| {r[0]} | {r[1]:.2f}-{r[2]:.2f} | {f(r[3])} | {f(r[4])} | {f(r[5])} | {f(r[7])} | {f(r[6])} |")
    w("")
    w("## SFX events")
    w(f"Level convention: EVENT naive = LU vs the voice (event max momentary); applied = naive {sfx.SFX_DB:+.0f} dB (standard mix). "
      f"BED = integrated LU vs the voice, then ducked {sfx.DUCK_DB:+.0f} dB under the speech spans (the voice runs almost "
      "continuously, so beds sit ~4 dB under their nominal level most of the time). measured = level actually placed (before duck / freeze / end fade). "
      "Take 3 'freeze': everything but the sting dips -9 dB at 1334 and recovers by 1400. Take 4: everything but the falling bill fades 1738 -> 1760; "
      "the stem is digital silence from 1762 (start of the picture fade) to 1770.")
    w("Rooms: take 1 street + palace facade (RT 1.3 s), take 2 open country (0.45 s), take 3 walled yard (0.85 s), take 4 wood / sleeping town (1.1 s).")
    w("")
    w("| # | frame | time s | take | cue | what | naive | applied | measured | pan |")
    w("|---|---|---|---|---|---|---|---|---|---|")
    for i, c in enumerate(sorted(C, key=lambda c: (c.f, c.name))):
        kind = " (bed)" if c.kind == "bed" else ""
        ms = "-" if c.measured is None else f"{c.measured:+.1f}"
        pn = "moving" if c.pos is None and c.p == 0.0 else f"{c.p:+.2f}"
        w(f"| {i + 1} | {c.f:.0f} | {c.t:.2f} | {c.take} | {c.name}{kind} | {c.desc} | {c.naive:+.0f} | {c.applied:+.0f} | {ms} | {pn} |")
    w("")
    w("## Picture-sync notes")
    whips = sfx.whip_frames()
    w("- Branch whips (take 4) are timed to the frames where the 5 foreground whip trunks of build.ts cross the screen centre: "
      + ", ".join(f"f{f}" for f, _, _ in whips) + " (a trunk skipped by build.ts's lens-clearance test still gets its whoosh).")
    w("- Drouet's gallop: his card's leg cycle runs ~7 Hz at 0.8 m/f, so the 4-beat gallop is sounded once every OTHER visual stride "
      "(anchored on the stride start); walk / trot steps use the phase directly.")
    w("- The escort stands still in picture (cast.ts); its hooves are heard falling in behind the coach from 1700 and receding (gain + air), "
      "as the coach completes its U-turn.")
    w("- Barrel thuds use world.ts's visibility rule (barrel i shows when 3*ramp(BARRELS) > i + 0.3).")
    w("- Re-run after any picture timing change: `node dump_story.mjs && python mix.py`.")
    open(os.path.join(HERE, "cues.md"), "w", encoding="utf-8").write("\n".join(L))


if __name__ == "__main__":
    main()
