# Persekitaran Animasi 3D — Claude Code + Blender

Projek ini membolehkan Claude Code membina karakter, persekitaran, animasi, kamera, pencahayaan,
kesan visual dan video promosi MP4 dalam Blender melalui **BlendRelay MCP** (satu-satunya integrasi
Blender MCP yang dipasang — jangan tambah `blender-mcp` / `claude-3d-harness`, ia bertindih).

## Mula
```bash
scripts/setup_env.sh          # idempoten: Blender 4.5 LTS, ffmpeg, xvfb, espeak-ng, venv, add-on
scripts/start_blender_mcp.sh  # runtime BlendRelay + Blender GUI (Xvfb jika tiada skrin) + auto-Connect
uv run python scripts/test_mcp_connection.py inspect_scene '{}'   # ujian sambungan
```
Pelayan MCP `blendrelay` didaftarkan dalam `.mcp.json` (skop projek). Kali pertama `claude` dibuka,
luluskan pelayan itu.

## Cara kerja dengan Blender
- Bina/ubah scene dengan tool `mcp__blendrelay__execute_blender_python` (BlendRelay simpan checkpoint
  sebelum & selepas; pulihkan dengan `restore_scene_version`). Semak dengan `inspect_scene`,
  `get_object_info`, `capture_viewport`.
- Utamakan skrip `.py` boleh ulang dalam repo (lihat `projek_ujian/build_scene.py`) dan jalankan melalui
  MCP: `exec(compile(open(p).read(), p, 'exec'))`. Skrip harus guna bpy/bmesh, bukan bpy.ops geometri.
- **Jangan padam scene/fail pengguna.** Cipta scene baharu dan beri awalan pada nama datablock
  (contoh `MU_`) supaya pembinaan semula hanya membuang milik sendiri.
- Render tanpa skrin: `blender -b fail.blend -S <Scene> -o //render/frame_#### -F PNG -s A -e B -a`.
- Blender 4.5: enjin EEVEE = `BLENDER_EEVEE_NEXT`; Action guna slotted actions (lihat `fcurves_of`).

## Spesifikasi output
1920×1080, 16:9, 24 FPS, MP4 (H.264 + AAC 48 kHz, `+faststart`), gaya kartun 3D sinematik.
Pasca-produksi: `uv run python projek_ujian/post_production.py` (tajuk, teks promosi, transisi,
muzik/SFX disintesis, voice-over, sari kata `.srt` dibakar, loudnorm -16 LUFS).

## Had persekitaran awan ini
CPU 4 teras, tiada GPU: Cycles CPU 8 sampel + OIDN ≈ 60–75 s/frame 1080p. Untuk produksi gunakan
mesin ber-GPU (OptiX/HIP) dan naikkan sampel (`SAMPLES = 64` sebelum `exec` skrip pembina).
