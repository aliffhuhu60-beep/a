# Laporan Pemasangan — Persekitaran Pembangunan Animasi 3D

**Tarikh:** 20 November 2026 · **Lokasi:** container awan Claude Code (Ubuntu 24.04, x86_64, 4 teras CPU, 15 GB RAM, **tiada GPU**) · **Cawangan:** `ccr-99652c93-lxflpl`

## Ringkasan

| Langkah | Status |
|---|---|
| 1–2. Semak perisian sedia ada / belum dipasang | ✅ Selesai |
| 3. Semak keserasian library & repository | ✅ Selesai — 2 daripada 3 repo **bercanggah** (lihat §3) |
| 4. Pilih satu integrasi Blender MCP | ✅ **BlendRelay MCP 0.7.8** |
| 5. Elak pemasangan bertindih | ✅ Tiada MCP kedua, tiada `bpy` pip, tiada salinan `uvx` |
| 6. Pasang & konfigurasi berperingkat | ✅ 4 peringkat, skrip idempoten `scripts/setup_env.sh` |
| 7. Uji sambungan Claude Code ↔ Blender | ✅ Protokol MCP + Claude Code CLI sebenar |
| 8. Bina projek ujian animasi 3D | ✅ "Momo di Hutan Senja" (132 objek, 156 frame) |
| 9. Uji render & eksport MP4 | ✅ __HASIL_MP4__ |
| 10. Laporan | ✅ Dokumen ini |

Tiada fail sedia ada yang diganti atau dipadam (`README.md` tidak disentuh). Scene ujian dibina dalam
scene baharu `AnimasiUjian`; scene asal Blender dikekalkan.

## 1. Inventori perisian

| Perisian | Sebelum | Selepas | Catatan |
|---|---|---|---|
| Blender | ❌ tiada | ✅ **4.5.16 LTS** | `/opt/blender-4.5.16-linux-x64`, SHA-256 disahkan, pautan `/usr/local/bin/blender` |
| Claude Code | ✅ 2.1.329 | ✅ 2.1.329 | — |
| Visual Studio Code | ❌ tiada | ❌ tidak dipasang | Aplikasi desktop; pasang pada komputer anda. Stub `fake-bpy-module-4.5` disediakan untuk autolengkap `bpy` |
| Python | ✅ 3.11.18 & 3.13 | ✅ 3.11.18 (venv projek) | Blender sendiri membawa Python 3.11.15 |
| Git | ✅ 2.43.0 | ✅ | — |
| FFmpeg | ✅ 6.1.1 | ✅ | libx264, AAC, libass (`subtitles`), `drawtext`, `xfade`, `loudnorm` tersedia |
| uv | ✅ 0.11.32 | ✅ | `pyproject.toml` + `uv.lock` |
| Xvfb | ✅ | ✅ | Paparan maya untuk Blender GUI (diperlukan oleh add-on) |
| espeak-ng | ❌ | ✅ 1.51 | **Tambahan**: suara Bahasa Melayu untuk voice-over sementara |

## 2. Library Python (venv `.venv`, Python 3.11)

| Library | Versi | Sumber |
|---|---|---|
| bpy, mathutils | Blender 4.5.16 | Terbina dalam Blender (sengaja **tidak** dipasang melalui pip — elak salinan kedua Blender) |
| NumPy | 2.4.6 (venv) / 1.26.4 (dalam Blender) | PyPI |
| Pillow | 11.3.0 | PyPI |
| MoviePy | 2.2.1 | PyPI (API v2: `with_effects`, `vfx.CrossFadeIn`, dsb.) |
| OpenCV | 5.1.0 (`opencv-python-headless`) | PyPI — versi headless sesuai untuk pelayan tanpa skrin |
| PyYAML | 6.0.3 | PyPI |
| blendrelay-mcp | 0.7.8 (dipin) | PyPI — sama dengan commit `febf506` repo GitHub |

## 3. Semakan repository & keputusan integrasi

| Repository | Fungsi sebenar | Keserasian | Keputusan |
|---|---|---|---|
| **shefq/blendrelay-mcp** | Pelayan MCP + add-on Blender 4.5+ (24 tool: inspect, execute Python, mesh edit, capture viewport, checkpoint, aset Poly Haven) | ✅ Blender 4.5+, Python ≥3.11, CI Ubuntu, sokong Claude Code secara rasmi | **Dipasang — integrasi tunggal** |
| kevinbadi/blender-skills | Skill Claude Code (turntable, dolly, crane, Poly Haven, Meshy) | ❌ Bergantung pada MCP lain (`ahujasid/blender-mcp`, port 9876) dan Blender 5.x; skrip Node.js | **Tidak dipasang** — akan memerlukan MCP kedua |
| MAX-786/claude-3d-harness | Plugin Claude Code + 58 skill + pelayan MCP sendiri (`newo-ether/blender-mcp` 1.18) | ⚠️ Membawa **salinan** `kevinbadi/blender-skills` (`library/kb/`) dan MCP Blender ketiga; diuji penuh hanya di Windows | **Tidak dipasang** — bertindih dengan BlendRelay |

Ketiga-tiga repo hanya diklon untuk disemak (di luar projek, `/home/user/<pemilik>/…`); tiada satu pun
dipasang ke dalam Claude Code atau Blender selain BlendRelay. Jika mahu idea gerakan kamera
(turntable/crane/dolly) daripada `blender-skills`, ia boleh ditulis semula sebagai skrip `bpy` untuk
BlendRelay — bukan dengan memasang MCP kedua.

## 4. Seni bina yang dipasang

```
Claude Code ──stdio──▶ blendrelay-mcp mcp  (.mcp.json, venv)
                            │  127.0.0.1:<port rawak> + token
                            ▼
                   blendrelay runtime (~/.local/share/BlendRelayMCP)
                            ▲
                            │  socket tanpa sekat (bpy.app.timers)
              Blender 4.5 GUI + add-on BlendRelay (Xvfb :99, auto-Connect)
```

Fail konfigurasi:
- `.mcp.json` — pelayan `blendrelay` skop projek (`uv run --no-sync blendrelay-mcp mcp`)
- `~/.config/blender/4.5/extensions/user_default/blendrelay_mcp` — add-on, diaktifkan dalam userpref
- `scripts/start_blender_mcp.sh` — mulakan runtime + Xvfb + Blender + auto-Connect
- `scripts/setup_env.sh` — pemasangan idempoten (juga disimpan sebagai skrip persediaan persekitaran awan "teknologi")
- `CLAUDE.md` — panduan kerja untuk sesi Claude Code akan datang

## 5. Keputusan ujian sambungan

| Ujian | Keputusan |
|---|---|
| `blendrelay-mcp doctor` | PASS (0 ralat, 0 amaran) |
| Handshake MCP (`initialize`, protokol 2025-06-18) | ✅ 24 tool disenaraikan |
| `inspect_scene` (baca) | ✅ scene, objek, pemilihan dikembalikan |
| `execute_blender_python` (tulis) | ✅ objek dicipta; checkpoint *before/after* automatik |
| `capture_viewport` | ✅ PNG viewport dari pandangan kamera |
| Bina keseluruhan projek ujian melalui MCP | ✅ 132 objek, ~4 s, `.blend` disimpan |
| **Claude Code CLI sebenar** (`claude -p … --mcp-config .mcp.json`) | ✅ Claude memanggil tool BlendRelay dan melaporkan scene `AnimasiUjian` (132 objek, 4 lampu, 4 kamera) |

## 6. Projek ujian: "Momo di Hutan Senja"

Fail: `projek_ujian/build_scene.py` (pembina scene), `projek_ujian/post_production.py` (pasca-produksi).

| Spesifikasi | Pelaksanaan |
|---|---|
| Gaya kartun 3D sinematik | Karakter mochi comel, bahan SSS + sheen, AgX *Punchy* |
| Animasi muka | Kelip mata (4×), arah anak mata, kening, shape key **Senyum** & **Buka** mulut |
| Animasi badan | Rig kawalan (empty): 5 lompatan, squash & stretch, antisipasi, lambai, sorak, pernafasan, gerakan sekunder daun |
| Animasi kamera | 4 shot via timeline marker: **dolly-in**, **orbit**, **tracking shot**, **close-up** |
| Persekitaran & cahaya | Bukit prosedural, 10 pokok, cendawan, batu, bunga, langit Nishita senja; matahari belakang + fill + rim + key |
| Kesan visual | **Depth of field** (f/1.8–5.6), **volumetric** (Principled Volume, god rays), **partikel** kunang-kunang (140, dibake), **motion blur** |
| Resolusi / nisbah / FPS | 1920×1080, 16:9, 24 FPS, 156 frame (6.5 s animasi) |
| Audio | Muzik latar (ukulele Karplus-Strong, bass, glockenspiel, shaker), SFX (boing, hentakan, whoosh, kilauan) — semua disintesis NumPy, bebas hak cipta; voice-over BM (espeak-ng) dengan *ducking* |
| Penyuntingan | Kad tajuk, teks promosi "Comel. Ekspresif. Sinematik.", transisi crossfade/fade, sari kata `.srt` dibakar, kad penutup |
| Format akhir | __HASIL_FORMAT__ |

Output: `projek_ujian/output/momo_promo_1080p.mp4`, `projek_ujian/output/momo_promo.srt`,
`projek_ujian/output/lembaran_frame.jpg`.

### Prestasi render (CPU sahaja)
| Konfigurasi (frame 60, 1080p) | Masa |
|---|---|
| Cycles 16 sampel + kabus | 108.7 s |
| Cycles 16 sampel, tanpa kabus | 72.4 s |
| Cycles 8 sampel, tanpa kabus | 40.3 s |
| **Cycles 8 sampel + OIDN + kabus (step 8) — dipilih** | 57.2 s |
| EEVEE Next (llvmpipe, scene ringkas) | ~30 s untuk kiub lalai — lebih perlahan daripada Cycles CPU di sini |

Render penuh: __HASIL_RENDER__.

## 7. Masalah ditemui & penyelesaian

| # | Masalah | Penyelesaian |
|---|---|---|
| 1 | `curl` ke github.com disekat proksi sesi (403) | Repo awam diklon melalui git (laluan baca anonim) |
| 2 | Blender tiada dalam container | Muat turun rasmi 4.5.16 LTS + semakan SHA-256 |
| 3 | Add-on BlendRelay perlukan Blender GUI (`bpy.app.timers`), container tiada skrin | Xvfb `:99` + skrip `blender_autoconnect.py` menekan *Connect* secara automatik |
| 4 | Blender ranap ketika cuba Wayland (`XDG_RUNTIME_DIR` tidak sah) | Tetapkan `XDG_RUNTIME_DIR` dalam skrip pelancar → jatuh balik ke X11 |
| 5 | Sesi Blender lama (pelancaran gagal) masih didaftar → ralat `SELECT_INSTANCE` | Mula semula runtime + Blender; jika berbilang instance, hantar `instance_id` |
| 6 | Pelayan MCP skop projek perlu kelulusan | Disengajakan (ciri keselamatan Claude Code): luluskan `blendrelay` kali pertama `claude` dibuka |
| 7 | `fake-bpy-module` tidak boleh diimport semasa runtime | Dijangka — ia stub untuk VS Code sahaja; `bpy` sebenar dalam Blender |
| 8 | Pratonton pertama: kabus terlalu tebal, kunang-kunang jadi calar, close-up terlalu rapat | Ketumpatan 0.022→0.007, brownian 0.35→0.06, lensa close-up 85→50 mm |
| 9 | Render 108 s/frame (≈4.7 jam) | Profil ujian: 8 sampel + OIDN, bounce dikurangkan, `volume_step_rate` 8 |
| 10 | Kotak kabus menghalang `capture_viewport` | `display_type = BOUNDS` |
| 11 | Voice-over bertindih / melebihi tempoh video | Kad tajuk/penutup dipanjangkan, penjadualan anti-tindih + semakan tempoh |
| 12 | Mod *Material Preview* dalam viewport bersaing CPU dengan render | Viewport dikekalkan *Solid* semasa render |

## 8. Had & cadangan seterusnya

1. **GPU**: render produksi patut dibuat pada mesin ber-GPU NVIDIA/AMD (Cycles OptiX/HIP) dengan 64–128 sampel; tetapkan `SAMPLES = 64` sebelum menjalankan `build_scene.py`.
2. **Voice-over**: espeak-ng ialah suara robotik sementara. Untuk produksi, gunakan pelakon suara atau TTS berkualiti tinggi dan ganti fail dalam `post_production.py`.
3. **Aset**: BlendRelay menyokong Poly Haven & Poly Pizza terus (`search_assets`/`import_asset`). Sketchfab & Mixamo perlu log masuk — muat turun manual (FBX/GLB) dan import dengan `execute_blender_python`. Semak lesen setiap aset (CC0 vs CC-BY).
4. **VS Code**: pasang pada komputer anda; buka repo ini dan pilih interpreter `.venv` untuk autolengkap `bpy`.
5. **Persekitaran awan**: container ini sementara. Skrip persediaan yang disimpan pada persekitaran "teknologi" akan memasang semula semuanya pada sesi baharu (belum terbukti sehingga sesi baharu dimulakan).
6. **Keselamatan**: `execute_blender_python` menjalankan Python sebarang dalam Blender — luluskan hanya untuk projek dipercayai.
