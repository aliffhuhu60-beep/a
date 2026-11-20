"""Pasca-produksi: frame Blender -> video promosi MP4 lengkap.

  1. Kad tajuk + 4 shot + kad penutup, dengan transisi (crossfade / fade)  [MoviePy]
  2. Teks promosi (lower-third) di atas shot                                  [MoviePy + Pillow]
  3. Muzik latar + kesan bunyi disintesis (tanpa aset berhak cipta)          [NumPy]
  4. Voice-over Bahasa Melayu (espeak-ng, suara sementara) + ducking muzik
  5. Sari kata (.srt) dijana daripada masa voice-over, dibakar ke video      [FFmpeg/libass]
  6. Eksport akhir: H.264 1920x1080 24 fps, AAC 48 kHz, loudnorm, faststart  [FFmpeg]

Guna:  uv run python projek_ujian/post_production.py
"""
import json
import os
import shutil
import subprocess
import wave
from pathlib import Path

import numpy as np
from moviepy import (ColorClip, CompositeVideoClip, ImageClip, ImageSequenceClip, TextClip, vfx)
from PIL import Image, ImageDraw, ImageFilter

HERE = Path(__file__).resolve().parent
FRAMES = Path(os.environ.get("MOMO_FRAMES", HERE / "render"))
OUT = Path(os.environ.get("MOMO_OUT", HERE / "output"))
TMP = OUT / "tmp"
FPS, W, H, SR = 24, 1920, 1080, 48000
FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
FONT_REG = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"

# Shot (frame Blender) — mesti sepadan dengan marker dalam build_scene.py
SHOTS = [("Dolly", 1, 36), ("Orbit", 37, 84), ("Jejak", 85, 120), ("Dekat", 121, 156)]
HOPS = [(45, 58), (66, 79), (88, 98), (98, 108), (108, 118)]  # (lepas landas, mendarat)
TITLE_DUR, END_DUR = 3.5, 4.5
X_TITLE, X_SHOT, X_END = 0.5, 8 / FPS, 0.5  # tempoh transisi

VO_LINES = [
    "Kenali Momo, si comel dari hutan senja.",
    "Dia suka melompat bersama kunang-kunang.",
    "Dibina dengan Blender dan Claude Code.",
]


# ----------------------------------------------------------------------------------------------
# Garis masa
# ----------------------------------------------------------------------------------------------
def timeline():
    starts, t = [], TITLE_DUR - X_TITLE
    for i, (_, a, b) in enumerate(SHOTS):
        starts.append(t)
        t += (b - a + 1) / FPS - (X_SHOT if i < len(SHOTS) - 1 else 0)
    end_start = t - X_END
    return starts, end_start, end_start + END_DUR


SHOT_START, END_START, TOTAL = timeline()


def frame_time(f):
    """Masa video untuk frame Blender f."""
    for (_, a, b), s in zip(SHOTS, SHOT_START):
        if a <= f <= b:
            return s + (f - a) / FPS
    raise ValueError(f)


# ----------------------------------------------------------------------------------------------
# Grafik kad
# ----------------------------------------------------------------------------------------------
def gradient_card(path, top, bottom, glow=True):
    y = np.linspace(0, 1, H)[:, None, None]
    img = (np.array(top)[None, None] * (1 - y) + np.array(bottom)[None, None] * y)
    img = np.repeat(img, W, axis=1).astype(np.uint8)
    im = Image.fromarray(img)
    if glow:
        rng = np.random.default_rng(3)
        layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        d = ImageDraw.Draw(layer)
        for _ in range(70):
            x, yy, r = rng.integers(0, W), rng.integers(0, H), rng.integers(3, 12)
            d.ellipse([x - r, yy - r, x + r, yy + r], fill=(255, 205, 110, int(rng.integers(60, 170))))
        layer = layer.filter(ImageFilter.GaussianBlur(4))
        im = Image.alpha_composite(im.convert("RGBA"), layer).convert("RGB")
    im.save(path)
    return str(path)


def text(txt, size, color="white", font=FONT, stroke=4):
    return TextClip(font=font, text=txt, font_size=size, color=color, stroke_color="#2a1630",
                    stroke_width=stroke, method="label", margin=(20, 20))


def build_video(silent_path):
    clips = []
    # Kad tajuk
    bg = gradient_card(TMP / "kad_tajuk.png", (28, 22, 58), (235, 130, 80))
    title_bg = (ImageClip(bg).with_duration(TITLE_DUR)
                .with_effects([vfx.Resize(lambda t: 1 + 0.03 * t), vfx.FadeIn(0.4)]))
    clips.append(title_bg.with_position("center"))
    clips.append(text("MOMO", 190).with_start(0.25).with_duration(TITLE_DUR - 0.25)
                 .with_position(("center", 330)).with_effects([vfx.CrossFadeIn(0.5)]))
    clips.append(text("di Hutan Senja", 82, "#ffe2b8").with_start(0.6).with_duration(TITLE_DUR - 0.6)
                 .with_position(("center", 560)).with_effects([vfx.CrossFadeIn(0.5)]))
    clips.append(text("Projek Ujian Animasi 3D", 40, "#ffffff", FONT_REG, 2).with_start(0.9)
                 .with_duration(TITLE_DUR - 0.9).with_position(("center", 700))
                 .with_effects([vfx.CrossFadeIn(0.5)]))

    # Shot
    for i, ((name, a, b), start) in enumerate(zip(SHOTS, SHOT_START)):
        files = [str(FRAMES / f"frame_{f:04d}.png") for f in range(a, b + 1)]
        c = ImageSequenceClip(files, fps=FPS).with_start(start)
        c = c.with_effects([vfx.CrossFadeIn(X_TITLE if i == 0 else X_SHOT)])
        clips.append(c)

    # Teks promosi (lower-third)
    promos = [("Comel.", SHOT_START[0] + 0.4, 1.1), ("Ekspresif.", SHOT_START[1] + 0.3, 1.6),
              ("Sinematik.", SHOT_START[2] + 0.2, 1.3)]
    for txt, t0, d in promos:
        clips.append(text(txt, 76, "#fff3d6").with_start(t0).with_duration(d)
                     .with_position((110, 120)).with_effects([vfx.CrossFadeIn(0.25), vfx.CrossFadeOut(0.25)]))

    # Kad penutup
    end_bg = gradient_card(TMP / "kad_akhir.png", (240, 140, 90), (40, 24, 66))
    clips.append(ImageClip(end_bg).with_start(END_START).with_duration(END_DUR)
                 .with_effects([vfx.CrossFadeIn(X_END), vfx.FadeOut(0.6)]))
    for txt, size, y, col, dt, font in (("MOMO", 150, 250, "white", 0.2, FONT),
                                        ("Tonton kisah penuhnya tidak lama lagi!", 58, 470, "#fff1c9", 0.5, FONT),
                                        ("Dibina dengan Blender 4.5  •  Claude Code  •  BlendRelay MCP", 36, 650,
                                         "#ffffff", 0.9, FONT_REG)):
        clips.append(text(txt, size, col, font, 3 if size > 40 else 2)
                     .with_start(END_START + dt).with_duration(END_DUR - dt)
                     .with_position(("center", y)).with_effects([vfx.CrossFadeIn(0.4), vfx.FadeOut(0.6)]))

    base = ColorClip((W, H), color=(0, 0, 0)).with_duration(TOTAL)
    video = CompositeVideoClip([base] + clips, size=(W, H)).with_duration(TOTAL)
    video.write_videofile(str(silent_path), fps=FPS, codec="libx264", audio=False,
                          preset="medium", ffmpeg_params=["-crf", "14", "-pix_fmt", "yuv420p"],
                          logger=None)


# ----------------------------------------------------------------------------------------------
# Audio: muzik, SFX, voice-over
# ----------------------------------------------------------------------------------------------
def t_axis(d):
    return np.arange(int(d * SR)) / SR


def env(n, a=0.005, r=0.2):
    e = np.ones(n)
    na, nr = int(a * SR), min(n, int(r * SR))
    e[:na] = np.linspace(0, 1, na)
    e[-nr:] *= np.linspace(1, 0, nr)
    return e


def pluck(freq, dur):
    """Karplus-Strong: bunyi tali dipetik (seakan ukulele)."""
    n, p = int(dur * SR), max(2, int(SR / freq))
    buf = np.random.default_rng(int(freq)).uniform(-1, 1, p)
    out = np.empty(n)
    for i in range(n):
        j = i % p
        out[i] = buf[j]
        buf[j] = 0.996 * 0.5 * (buf[j] + buf[(j + 1) % p])
    return out * env(n, 0.002, 0.05)


def note(name):
    names = {"C": -9, "D": -7, "E": -5, "F": -4, "G": -2, "A": 0, "B": 2}
    return 440 * 2 ** ((names[name[0]] + 12 * (int(name[-1]) - 4)) / 12)


def music(total):
    bpm = 112
    beat = 60 / bpm
    track = np.zeros(int((total + 2) * SR))
    chords = [("C4", "E4", "G4"), ("G3", "B3", "D4"), ("A3", "C4", "E4"), ("F3", "A3", "C4")]
    melody = ["E5", "G5", "A5", "G5", "E5", "D5", "C5", "D5", "E5", "G5", "C6", "B5", "A5", "G5", "E5", "G5"]
    t, k = 0.0, 0
    while t < total:
        ch = chords[(k // 4) % 4]
        for j, nm in enumerate(ch):  # strum
            s = int((t + j * 0.018) * SR)
            pl = pluck(note(nm), beat * 1.6) * 0.16
            track[s:s + len(pl)] += pl[: len(track) - s]
        if k % 2 == 0:  # bass
            bt = t_axis(beat * 1.8)
            bass = np.sin(2 * np.pi * note(ch[0]) / 2 * bt) * env(len(bt), 0.01, 0.4) * 0.22
            s = int(t * SR)
            track[s:s + len(bass)] += bass[: len(track) - s]
        if k >= 4:  # melodi glockenspiel selepas 1 bar
            mt = t_axis(beat * 0.9)
            f = note(melody[(k - 4) % len(melody)])
            mel = (np.sin(2 * np.pi * f * mt) + 0.3 * np.sin(2 * np.pi * 2.76 * f * mt)) * np.exp(-mt * 5) * 0.11
            s = int(t * SR)
            track[s:s + len(mel)] += mel[: len(track) - s]
        sh = np.random.default_rng(k).normal(0, 1, int(0.05 * SR)) * np.exp(-np.arange(int(0.05 * SR)) / 300) * 0.03
        for off in (0, beat / 2):  # shaker
            s = int((t + off) * SR)
            track[s:s + len(sh)] += sh[: len(track) - s]
        t += beat
        k += 1
    track = track[: int(total * SR)]
    fade = int(1.5 * SR)
    track[-fade:] *= np.linspace(1, 0, fade)
    track[: int(0.3 * SR)] *= np.linspace(0, 1, int(0.3 * SR))
    return track


def sfx_boing(d=0.35):
    t = t_axis(d)
    f = 180 + 520 * (t / d) ** 0.6 + 25 * np.sin(2 * np.pi * 28 * t)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 7) * 0.35


def sfx_thud(d=0.18):
    t = t_axis(d)
    return np.sin(2 * np.pi * (110 - 260 * t) * t) * np.exp(-t * 25) * 0.5


def sfx_whoosh(d=0.6):
    n = int(d * SR)
    x = np.random.default_rng(1).normal(0, 1, n)
    k = np.hanning(n)
    y = np.convolve(x, np.ones(18) / 18, mode="same")
    return y * k * 0.25


def sfx_sparkle(d=1.2):
    out = np.zeros(int(d * SR))
    for i, f in enumerate((1568, 2093, 2637, 3136, 4186)):
        s = int(i * 0.07 * SR)
        t = np.arange(len(out) - s) / SR
        out[s:] += np.sin(2 * np.pi * f * t) * np.exp(-t * 4) * 0.09
    return out


def tts(textline, path):
    subprocess.run(["espeak-ng", "-v", "ms", "-s", "150", "-p", "58", "-a", "160", "-w", str(path), textline],
                   check=True)
    with wave.open(str(path)) as w:
        sr, data = w.getframerate(), np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16) / 32768
    src = np.arange(len(data)) / sr
    dst = np.arange(int(len(data) / sr * SR)) / SR
    y = np.interp(dst, src, data)
    nz = np.nonzero(np.abs(y) > 0.01)[0]  # buang senyap di hujung
    return y[nz[0]: nz[-1] + int(0.05 * SR)] if len(nz) else y


def add(track, clip, t, gain=1.0):
    s = int(t * SR)
    if s >= len(track):
        return
    e = min(len(track), s + len(clip))
    track[s:e] += clip[: e - s] * gain


def build_audio(path):
    n = int(TOTAL * SR)
    mus = music(TOTAL)
    sfx = np.zeros(n)
    vo = np.zeros(n)
    add(sfx, sfx_sparkle(), 0.2)
    for t in SHOT_START[1:] + [END_START]:
        add(sfx, sfx_whoosh(), t - 0.3, 0.8)
    for up, down in HOPS:
        add(sfx, sfx_boing(), frame_time(up) - 0.03)
        add(sfx, sfx_thud(), frame_time(down) - 0.01)
    add(sfx, sfx_sparkle(), END_START + 0.2, 0.8)

    cues = [0.35, SHOT_START[1] + 0.25, END_START + 0.6]
    subs = []
    prev_end = 0.0
    for i, (line, t0) in enumerate(zip(VO_LINES, cues)):
        y = tts(line, TMP / f"vo_{i}.wav")
        t0 = max(t0, prev_end + 0.3)  # elak tindih
        prev_end = t0 + len(y) / SR
        if prev_end > TOTAL - 0.3:
            raise SystemExit(f"Voice-over '{line}' melebihi tempoh video ({prev_end:.2f}s > {TOTAL:.2f}s)")
        add(vo, y, t0, 0.9)
        subs.append((t0, t0 + len(y) / SR, line))

    # Ducking: muzik turun ~8 dB semasa voice-over
    duck = np.ones(n)
    for a, b, _ in subs:
        duck[int(max(0, a - 0.15) * SR): int(min(TOTAL, b + 0.2) * SR)] = 0.4
    duck = np.convolve(duck, np.ones(int(0.12 * SR)) / int(0.12 * SR), mode="same")
    mix = mus[:n] * duck + sfx + vo
    mix /= max(1e-9, np.max(np.abs(mix))) / 0.89
    stereo = np.stack([mix, mix], axis=1)
    with wave.open(str(path), "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes((stereo * 32767).astype(np.int16).tobytes())
    return subs


def srt(subs, path):
    def ts(t):
        ms = int(round(t * 1000))
        return f"{ms // 3600000:02d}:{ms // 60000 % 60:02d}:{ms // 1000 % 60:02d},{ms % 1000:03d}"
    path.write_text("\n".join(f"{i}\n{ts(a)} --> {ts(b + 0.2)}\n{line}\n" for i, (a, b, line) in
                              enumerate(subs, 1)), encoding="utf-8")


# ----------------------------------------------------------------------------------------------
def main():
    missing = [f for _, a, b in SHOTS for f in range(a, b + 1) if not (FRAMES / f"frame_{f:04d}.png").exists()]
    if missing:
        raise SystemExit(f"Frame belum lengkap: {len(missing)} hilang (cth. {missing[:5]})")
    TMP.mkdir(parents=True, exist_ok=True)
    print(f"Tempoh video: {TOTAL:.2f} s | shot bermula: {[round(s, 2) for s in SHOT_START]}")
    silent, audio = TMP / "video_senyap.mp4", TMP / "audio_campuran.wav"
    subs = build_audio(audio)
    sub_path = OUT / "momo_promo.srt"
    srt(subs, sub_path)
    build_video(silent)
    final = OUT / "momo_promo_1080p.mp4"
    style = ("FontName=DejaVu Sans,FontSize=20,PrimaryColour=&H00FFFFFF,OutlineColour=&H00301628,"
             "BorderStyle=1,Outline=2,Shadow=1,MarginV=40,Bold=1")
    sub_arg = str(sub_path).replace(":", r"\:")
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(silent), "-i", str(audio),
                    "-vf", f"subtitles={sub_arg}:force_style='{style}'",
                    "-af", "loudnorm=I=-16:TP=-1.5:LRA=11",
                    "-c:v", "libx264", "-preset", "medium", "-crf", "18", "-pix_fmt", "yuv420p",
                    "-r", str(FPS), "-c:a", "aac", "-b:a", "192k", "-ar", str(SR),
                    "-movflags", "+faststart", "-shortest", str(final)], check=True)
    probe = json.loads(subprocess.run(["ffprobe", "-v", "error", "-show_streams", "-show_format", "-of", "json",
                                       str(final)], capture_output=True, text=True, check=True).stdout)
    v = next(s for s in probe["streams"] if s["codec_type"] == "video")
    a = next(s for s in probe["streams"] if s["codec_type"] == "audio")
    info = {"fail": str(final), "tempoh_s": round(float(probe["format"]["duration"]), 2),
            "video": f'{v["codec_name"]} {v["width"]}x{v["height"]} {v["r_frame_rate"]} {v["pix_fmt"]}',
            "audio": f'{a["codec_name"]} {a["sample_rate"]} Hz {a["channels"]} ch',
            "saiz_MB": round(int(probe["format"]["size"]) / 1e6, 2)}
    (OUT / "eksport_info.json").write_text(json.dumps(info, indent=2, ensure_ascii=False))
    print(json.dumps(info, indent=2, ensure_ascii=False))
    shutil.rmtree(TMP, ignore_errors=True)


if __name__ == "__main__":
    main()
