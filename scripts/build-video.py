#!/usr/bin/env python3
"""Assemble the walkthrough: screencast frames -> 30 fps H.264, per-scene voiceover at recorded scene starts,
sentence-level subtitles (SRT + burned in), metadata stripped. Usage: build-video.py REC_DIR VO_DIR OUT_DIR"""
import json, re, subprocess, sys, os
rec, vo, out = sys.argv[1:4]
os.makedirs(out, exist_ok=True)
T = json.load(open(f"{rec}/timings.json"))
scenes = {s["id"]: s for s in json.load(open(f"{vo}/scenes-timed.json"))}
start0 = T["videoStart"] - 0.2
end = T["end"]
frames = [f for f in T["frames"] if f["t"] >= start0 - 2]

# frames concat list (VFR -> CFR later)
with open(f"{out}/frames.txt", "w") as fh:
    for i, f in enumerate(frames):
        nxt = frames[i + 1]["t"] if i + 1 < len(frames) else end
        t, d = max(f["t"], start0), max(0.001, nxt - max(f["t"], start0))
        if nxt <= start0: continue
        fh.write(f"file '{os.path.abspath(f['file'])}'\nduration {d:.4f}\n")
    fh.write(f"file '{os.path.abspath(frames[-1]['file'])}'\n")
dur = end - start0

def ts(x):
    h, r = divmod(x, 3600); m, s = divmod(r, 60)
    return f"{int(h):02}:{int(m):02}:{int(s):02},{int(round((s % 1) * 1000)):03}".replace(",1000", ",999")

cues, inputs, filt = [], [], []
for k, m in enumerate(T["marks"]):
    s = scenes[m["id"]]; at = m["start"] - start0 + 0.25
    inputs += ["-i", f"{vo}/{m['id']}.wav"]
    filt.append(f"[{k+1}:a]adelay={int(at*1000)}|{int(at*1000)}[a{k}]")
    parts = [p.strip() for p in re.split(r"(?<=[.!?])\s+", s["vo"]) if p.strip()]
    total = sum(len(p) for p in parts); t = at
    for p in parts:
        d = s["vo_seconds"] * len(p) / total
        cues.append((t, t + d - 0.05, p)); t += d
with open(f"{out}/walkthrough.srt", "w") as fh:
    for i, (a, b, txt) in enumerate(cues, 1):
        fh.write(f"{i}\n{ts(a)} --> {ts(b)}\n{txt}\n\n")
amix = ";".join(filt) + ";" + "".join(f"[a{k}]" for k in range(len(T["marks"]))) + f"amix=inputs={len(T['marks'])}:normalize=0,volume=0.85,alimiter=limit=0.89,apad,atrim=0:{dur:.3f}[aout]"
style = "FontName=Work Sans,FontSize=11,PrimaryColour=&H00FFFFFF,OutlineColour=&H20171737,BackColour=&H20171737,BorderStyle=3,Outline=5,Shadow=0,MarginV=30,MarginL=40,MarginR=40,Alignment=2"
vf = f"fps=30,scale=1080:1920:flags=lanczos,format=yuv420p,subtitles={out}/walkthrough.srt:fontsdir=public/fonts:force_style='{style}'"
cmd = ["ffmpeg", "-y", "-v", "error", "-f", "concat", "-safe", "0", "-i", f"{out}/frames.txt", *inputs,
       "-filter_complex", amix, "-map", "0:v", "-map", "[aout]", "-vf", vf,
       "-c:v", "libx264", "-preset", "slow", "-crf", "18", "-profile:v", "high", "-bsf:v", "filter_units=remove_types=6",
       "-c:a", "aac", "-b:a", "160k", "-ar", "48000", "-t", f"{dur:.3f}",
       "-map_metadata", "-1", "-map_chapters", "-1", "-fflags", "+bitexact", "-flags:v", "+bitexact", "-flags:a", "+bitexact",
       "-metadata", "title=Ops Reliability Desk walkthrough (independent concept by Ayo Ahmed, not affiliated with Clipboard)",
       "-metadata", "artist=Ayo Ahmed", "-movflags", "+faststart", f"{out}/ops-reliability-desk-walkthrough.mp4"]
# -vf and -filter_complex can't both apply to mapped outputs; fold video chain into filter_complex
cmd[cmd.index("-filter_complex") + 1] = f"[0:v]{vf}[vout];" + amix
i = cmd.index("-vf"); del cmd[i:i+2]
cmd[cmd.index("0:v")] = "[vout]"
subprocess.run(cmd, check=True)
print("built", f"{out}/ops-reliability-desk-walkthrough.mp4", f"{dur:.2f}s", len(cues), "cues")
