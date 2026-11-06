"""Word timings for a voice file: python tools/words.py voice.wav words.json [lang, default en] [script.txt]"""
import json, subprocess, sys, numpy as np
from faster_whisper import WhisperModel

src, dst = sys.argv[1], sys.argv[2]
lang = sys.argv[3] if len(sys.argv) > 3 else "en"
# the known script as a prompt keeps names and numbers spelled right (Drouet, Sainte-Menehould, 1791)
prompt = open(sys.argv[4], encoding="utf-8").read() if len(sys.argv) > 4 else None
pcm = subprocess.run(["ffmpeg", "-v", "error", "-i", src, "-f", "s16le", "-ac", "1", "-ar", "16000", "-"], capture_output=True, check=True).stdout
audio = np.frombuffer(pcm, np.int16).astype(np.float32) / 32768
model = WhisperModel("small.en" if lang == "en" else "small", device="cpu", compute_type="int8")
segs, _ = model.transcribe(audio, word_timestamps=True, language=lang, initial_prompt=prompt)
words = [{"word": w.word.strip(), "start": round(w.start, 3), "end": round(w.end, 3)} for s in segs for w in s.words]
json.dump(words, open(dst, "w"), indent=1)
print(len(words), "words;", " ".join(f"{w['word']}@{w['start']}" for w in words))
