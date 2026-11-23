# CITY DASH 3D

Permainan **3D endless runner** asli untuk pelayar web (Windows, Android, iOS, macOS, Linux). Pemain berlari secara automatik di landasan bandar futuristik, mengelak kereta api dan halangan, mengutip syiling dan menggunakan power-up untuk mencapai skor tertinggi. Skor boleh dihantar ke leaderboard global dan leaderboard rakan.

> Mekanik permainan diilhamkan oleh genre endless runner tiga lorong. Semua watak, model, tekstur, muzik, bunyi, logo dan peta dalam projek ini dicipta sendiri: model 3D dibina daripada primitif, tekstur dilukis pada `<canvas>`, dan audio disintesis dengan Web Audio. Tiada aset daripada permainan lain digunakan.

---

## Kandungan

1. [Ciri-ciri](#ciri-ciri)
2. [Keperluan](#keperluan)
3. [Pemasangan dan menjalankan permainan](#pemasangan-dan-menjalankan-permainan)
4. [Pemboleh ubah persekitaran](#pemboleh-ubah-persekitaran)
5. [Menyediakan Supabase (sistem dalam talian)](#menyediakan-supabase-sistem-dalam-talian)
6. [Kawalan](#kawalan)
7. [Struktur projek](#struktur-projek)
8. [Seni bina dan keputusan teknikal](#seni-bina-dan-keputusan-teknikal)
9. [Pengujian](#pengujian)
10. [Deployment](#deployment)
11. [Keselamatan](#keselamatan)
12. [Had yang diketahui](#had-yang-diketahui)

---

## Ciri-ciri

| Bahagian | Butiran |
| --- | --- |
| **Dunia 3D** | 3 tema yang bertukar setiap 1.3 km melalui terowong: *Modern City* (siang), *Railway District* (senja, kontena, tiang katenari, stesen kereta api), *Neon Cyber City* (malam, papan tanda neon, dron). Bangunan instanced dengan tingkap shader, lampu jalan, pokok, papan iklan digital beranimasi, skyline, awan, kabus dan bayang-bayang. |
| **Watak** | 4 watak asli (Rio, Mika, Zane, Nova). Setiap watak ada 3 skin. Animasi melalui `THREE.AnimationMixer`: lari, lompat, gelongsor, mati, kemenangan, idle, serta overlay additive untuk tukar lorong, kutip syiling dan tersadung. |
| **Mekanik** | 3 lorong, lari automatik, kelajuan meningkat (14 → 34 m/s), lompatan berlengkung, gelongsor, slam ke bawah di udara, jump buffer, coyote time, naik ramp dan berlari di atas bumbung kereta api. Langgar tepi menyebabkan tersadung; dua kali dalam 4.5 s tamatkan larian. |
| **Halangan** | Penghadang jalan (lompat), kotak kargo rendah (lompat, boleh dipijak), papan tanda atas kepala (gelongsor), timbunan kotak (tukar lorong), kenderaan (kereta/bas), kereta api statik, ramp ke bumbung, dan kereta api bergerak ke arah pemain. |
| **Penjanaan prosedural** | Penjana berasaskan baris dengan pengesahan *reachability*: setiap baris mesti meninggalkan sekurang-kurangnya satu lorong yang boleh dicapai. Kesukaran meningkat secara berperingkat. |
| **Syiling dan power-up** | Syiling berputar (instanced). Empat power-up dengan model 3D, kesan visual, bunyi, tempoh dan bar status: Magnet, Jetpack, 2x Score dan Shield. Tempoh boleh dinaik taraf di Shop. |
| **Skor** | Jarak × pengganda + syiling × 5 × pengganda + bonus misi. Pengganda kekal naik apabila set misi harian siap (maks x30). |
| **Progres** | Daily Reward (streak 7 hari), 3 Daily Missions, 17 Achievements, watak dan skin boleh dibeli, naik taraf power-up. |
| **Dalam talian** | Supabase Auth (register/login/logout/guest), profil (username, avatar), leaderboard global top 100 (dengan kemas kini Realtime), kedudukan pemain, leaderboard rakan (tambah melalui username), simpanan progres di cloud. |
| **UI/UX** | Loading screen, main menu, Characters, Missions, Shop, Leaderboard, Settings, Profile, HUD, pause, game over, countdown, tutorial larian pertama dan cadangan pusing peranti untuk telefon. |
| **Audio** | Muzik latar berbeza untuk setiap tema dan menu, serta 18 kesan bunyi. Volume muzik dan kesan bunyi dikawal berasingan. |
| **Prestasi** | Fixed-timestep 120 Hz, object pooling, instanced rendering, LOD kereta api, geometri/material dikongsi, shader precompile, lazy loading skrin dan Supabase, serta tetapan grafik Low/Medium/High. |
| **PWA** | Manifest dan service worker supaya permainan boleh dipasang ke skrin utama (Android, iOS, Windows). |

---

## Keperluan

- **Node.js 20 atau lebih baru** (diuji dengan Node 22) dan npm 10+
- Pelayar moden yang menyokong **WebGL 2**: Chrome, Edge, Firefox, Safari 15+, Chrome Android atau Safari iOS
- (Pilihan) Projek [Supabase](https://supabase.com) untuk ciri dalam talian

---

## Pemasangan dan menjalankan permainan

```bash
npm install
npm run dev
```

Buka URL yang dipaparkan (lalai: <http://localhost:5173>). Untuk menguji pada telefon dalam rangkaian yang sama, gunakan alamat `Network:` yang dipaparkan oleh Vite.

Versi production:

```bash
npm run build      # semak TypeScript + bina ke folder dist/
npm run preview    # hidangkan dist/ secara tempatan di http://localhost:4173
```

Tanpa fail `.env`, permainan berjalan sepenuhnya **offline**. Progres disimpan di peranti, dan skrin Leaderboard memaparkan notis serta rekod tempatan, bukan leaderboard palsu.

### Skrip npm

| Skrip | Fungsi |
| --- | --- |
| `npm run dev` | Pelayan pembangunan Vite (hot reload) |
| `npm run build` | Semak jenis TypeScript dan bina versi production |
| `npm run preview` | Hidangkan build production secara tempatan |
| `npm run typecheck` | Semak jenis sahaja |
| `npm test` | Ujian unit Vitest (termasuk ujian pangkalan data/RLS) |
| `npm run test:e2e` | Ujian end-to-end Playwright (membina dan menghidangkan aplikasi secara automatik) |
| `npm run test:all` | Unit, build dan E2E |

---

## Pemboleh ubah persekitaran

Salin `.env.example` kepada `.env`, kemudian isi nilainya:

| Pemboleh ubah | Wajib? | Keterangan |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | Tidak (perlu untuk ciri dalam talian) | URL projek Supabase, contoh `https://abcd1234.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Tidak (perlu untuk ciri dalam talian) | Kunci **anon/publishable** Supabase. Kunci ini selamat untuk pelayar kerana dilindungi RLS. |

⚠️ **Jangan sekali-kali** letakkan kunci `service_role` dalam `.env` frontend. Semua yang bermula dengan `VITE_` akan dimasukkan ke dalam bundle JavaScript.

Fail `.env.e2e` hanya digunakan oleh ujian Playwright. URL di dalamnya ialah alamat palsu yang dipintas oleh mock ujian.

### Parameter URL (untuk pembangunan/ujian)

| Parameter | Kesan |
| --- | --- |
| `?quality=low\|medium\|high` | Kualiti grafik lalai (jika belum disimpan dalam Settings) |
| `?seed=123` | Benih penjana prosedural (larian boleh diulang) |
| `?noObstacles` | Tiada halangan (untuk ujian) |
| `?e2e` | Dedahkan `window.__cityDash` untuk ujian automatik (sentiasa aktif dalam `npm run dev`) |

---

## Menyediakan Supabase (sistem dalam talian)

1. Cipta projek di <https://supabase.com/dashboard>.
2. **Jalankan migrasi pangkalan data.** Pilih salah satu:
   - **SQL Editor:** salin seluruh kandungan `supabase/migrations/20261123000000_city_dash_init.sql`, tampal, kemudian klik **Run**.
   - **Supabase CLI:**
     ```bash
     npx supabase login
     npx supabase link --project-ref <project-ref>
     npx supabase db push
     ```
3. **Authentication → Providers → Email:** pastikan *Email* diaktifkan. Jika *Confirm email* dihidupkan, pemain perlu mengesahkan e-mel sebelum log masuk. Permainan akan memaparkan mesej "check your email".
4. **Authentication → URL Configuration:** tetapkan *Site URL* kepada domain permainan anda (contoh `https://citydash.example.com`). Untuk pembangunan, tambah `http://localhost:5173`.
5. **Realtime:** migrasi menambah `player_stats` ke publication `supabase_realtime` supaya leaderboard dikemas kini secara langsung. Semak di *Database → Publications*.
6. **Project Settings → API:** salin *Project URL* dan *anon public key* ke `.env`.
7. Mulakan semula `npm run dev`. Butang Profile kini memaparkan borang Register/Login.

### Skema pangkalan data

| Jadual | Kandungan | RLS |
| --- | --- | --- |
| `profiles` | username (unik, tidak sensitif huruf), avatar | Baca: semua. Tulis: pemilik sahaja (lajur `username`, `avatar`) |
| `player_stats` | skor terbaik, jarak terbaik, jumlah larian | Baca: semua. Tulis: hanya melalui `submit_run()` |
| `runs` | sejarah setiap larian | Baca: pemilik. Tulis: hanya melalui `submit_run()` |
| `player_progress` | syiling, watak/skin dibuka, pencapaian, misi (JSON) | Baca/tulis: pemilik sahaja |
| `friendships` | senarai rakan | Baca: baris yang melibatkan anda. Tambah/padam: baris anda sendiri |

Fungsi RPC: `submit_run`, `get_leaderboard`, `get_my_rank`, `get_friends_leaderboard`, `add_friend` dan `username_available`. Profil dicipta secara automatik melalui trigger `on_auth_user_created`.

---

## Kawalan

| Tindakan | Papan kekunci | Skrin sentuh / tetikus |
| --- | --- | --- |
| Lorong kiri | `A` / `←` | Swipe kiri |
| Lorong kanan | `D` / `→` | Swipe kanan |
| Lompat | `W` / `↑` / `Space` | Swipe atas |
| Gelongsor | `S` / `↓` | Swipe bawah |
| Pause | `Esc` / `P` | Butang ❚❚ |

Swipe dikesan semasa jari bergerak, bukan selepas jari diangkat, jadi tindak balasnya serta-merta. Satu swipe panjang hanya menukar satu lorong. Arah berbeza (contohnya kiri kemudian atas) boleh dirangkai dalam satu sentuhan. Kepekaan swipe boleh dilaras dalam Settings.

---

## Struktur projek

```
├── index.html                 # Entri HTML (meta mobile, PWA, font)
├── public/                    # icon.svg, manifest.webmanifest, sw.js
├── supabase/migrations/       # Skema SQL + RLS + fungsi RPC
├── src/
│   ├── main.tsx / App.tsx     # Bootstrap React, susun atur skrin
│   ├── index.css              # Tailwind v4 + tema UI
│   ├── game/                  # ENJIN PERMAINAN (TypeScript tulen + Three.js)
│   │   ├── engine/            # GameEngine (gelung, keadaan), Input, constants, types, Pool, RNG
│   │   ├── player/            # PlayerController (fizik), CharacterFactory (model), CharacterAnimator (AnimationMixer)
│   │   ├── camera/            # CameraController (orang ketiga, menu, showcase, gegaran)
│   │   ├── world/             # EnvironmentGenerator, PropLayer (instanced), themes, textures, materials
│   │   ├── obstacles/         # PatternGenerator (prosedural), ObstacleManager, ObstacleFactory
│   │   ├── collectibles/      # CoinManager
│   │   ├── powerups/          # PowerUpManager, definisi power-up
│   │   ├── collision/         # CollisionSystem (AABB, klasifikasi hadapan/tepi/atas)
│   │   ├── score/             # ScoreSystem
│   │   ├── difficulty/        # Lengkung kelajuan dan kesukaran
│   │   └── fx/                # ParticleSystem, SpeedLines, PostFX (bloom + blur)
│   ├── audio/                 # AudioManager (Howler + Web Audio), synth (SFX + muzik prosedural)
│   ├── data/                  # Watak, misi, pencapaian, ganjaran harian, avatar
│   ├── state/                 # Stor Zustand, progressLogic (logik tulen), engineBridge
│   ├── services/              # supabaseClient, authService, leaderboardService, friendsService, progressService
│   └── ui/                    # components/, screens/, hud/
├── tests/
│   ├── unit/                  # Vitest
│   └── e2e/                   # Playwright + mock HTTP Supabase
├── vite.config.ts  playwright.config.ts  tsconfig*.json
└── .env.example
```

---

## Seni bina dan keputusan teknikal

- **Gelung permainan:** simulasi berjalan pada **fixed timestep 120 Hz** dengan accumulator. Rendering mengikut kadar paparan. Pergerakan, lompatan dan perlanggaran adalah sama pada 30, 60 atau 144 FPS, dan perkara ini diuji dalam `tests/unit/player.test.ts`.
- **Ruang landasan:** logik menggunakan koordinat `(x, y, s)` dengan `s` sebagai jarak ke hadapan. Ia ditukar kepada `z = -s` hanya ketika meletakkan mesh.
- **Keadilan halangan:** `PatternGenerator` menjejak set lorong yang boleh dicapai (`reach`) dan menolak baris yang tidak meninggalkan laluan. Ia mengambil kira masa tukar lorong, kereta api panjang yang menyekat pergerakan sisi, serta titik pertemuan kereta api bergerak. Penyelesai BFS bebas dalam ujian mengesahkan 8 benih × 7 km semuanya boleh diselesaikan.
- **Kelajuan sebagai fungsi jarak:** penjana tahu kelajuan tepat pemain di setiap titik, jadi jarak antara baris sentiasa memberi masa reaksi ≥ 0.8 s.
- **Prestasi:**
  - Object pool untuk halangan, power-up dan partikel (ring buffer).
  - `InstancedMesh` untuk syiling, bangunan, lampu, pokok, kontena, tiang dan papan neon.
  - `THREE.LOD` untuk gerabak kereta api.
  - Geometri dan material dikongsi melalui cache.
  - Tingkap bangunan dikira dalam shader berdasarkan kedudukan dunia (tiada tekstur besar).
  - Shader dikompil semasa loading (`compileAsync`).
  - Skrin sekunder, PostFX dan supabase-js dimuat secara malas (lazy).
- **Tetapan grafik:**
  - **Low:** pixel ratio 0.85, tanpa bayang-bayang, jarak pandang pendek, partikel separuh.
  - **Medium:** bayang-bayang 1024 px, MSAA.
  - **High:** bayang-bayang 2048 px, bloom dan motion blur jejarian terkawal.

### Perubahan daripada senarai teknologi asal (dan sebabnya)

| Cadangan | Keputusan | Sebab |
| --- | --- | --- |
| React Three Fiber / drei | **Tidak digunakan.** Three.js digunakan secara imperatif, React untuk UI sahaja. | Gelung fixed-timestep, pooling dan kemas kini ribuan instance setiap frame lebih mudah dikawal tanpa reconciler React. Ia juga mengelakkan kerja React setiap frame dan mengecilkan bundle. Pratonton watak menggunakan pentas 3D yang sama. |
| Rapier Physics | **Tidak digunakan** ("jika diperlukan") | Runner 3 lorong memerlukan kinematik dan AABB yang deterministik, bukan fizik rigid-body. Ia lebih ringan untuk telefon dan lebih mudah diuji. |
| Model GLB / Mixamo | **Model prosedural** dengan rig bernama gaya Mixamo (`Hips`, `LeftUpLeg`…) | Tiada aset berlesen tersedia. Watak dan klip dijana dalam kod. Klip yang sama boleh memacu model GLB yang menggunakan nama tulang Mixamo. |
| Fail audio | **Disintesis** semasa loading (OfflineAudioContext) dan dimainkan melalui Howler.js / Web Audio | Semua audio asli, tanpa isu lesen, dan tiada muat turun tambahan. |
| TypeScript 7 | **TypeScript 5.9** | Versi 7 (pengkompil natif) masih baharu. 5.9 ialah garisan stabil yang serasi dengan semua alat. |

---

## Pengujian

```bash
npm test            # 54 ujian unit (≈ 3 s)
npm run test:e2e    # 20 ujian E2E Playwright (≈ 6 minit pada CPU kerana WebGL perisian)
```

**Ujian unit (Vitest):**
- Keadilan penjana prosedural, termasuk penyelesai bebas.
- Fizik pemain: lompat, gelongsor, lorong, platform, jetpack dan kebebasan FPS.
- Perlanggaran, skor, kesukaran, misi, pencapaian, pembelian, streak ganjaran harian dan gabungan progres.
- **Pangkalan data:** migrasi Supabase sebenar dijalankan pada PostgreSQL (PGlite) bersama peranan `anon`/`authenticated`. Ia mengesahkan trigger pendaftaran, pengesahan `submit_run` (anti-penipuan dan had kadar), RLS (tidak boleh ubah skor, progres orang lain atau rakan orang lain), leaderboard dan rakan.

**Ujian E2E (Playwright, Chromium):**
- Loading dan semua butang menu (tiada butang mati).
- Settings yang kekal disimpan, misi, ganjaran harian dan pencapaian.
- Shop: beli dan pilih watak, skin, naik taraf. Watak terpilih digunakan dalam larian.
- Kawalan papan kekunci, swipe sentuhan dan seret tetikus.
- Lompat atas penghadang, gelongsor bawah papan tanda, tukar lorong, perlanggaran hadapan (game over) dan dua kali tersadung.
- Syiling, magnet, shield, 2x dan jetpack.
- Pause, resume, restart, main menu dan retry.
- Penjanaan dan kitar semula halangan.
- Susun atur telefon landscape, cadangan pusing dalam portrait.
- **Aliran dalam talian:** daftar, muat naik progres tetamu, larian, `submit_run`, leaderboard global dan kedudukan, tambah/padam rakan, log keluar, serta log masuk dengan kata laluan salah. Ujian ini menggunakan mock HTTP Supabase dalam `tests/e2e/supabaseMock.ts` supaya kod klien sebenar diuji tanpa projek langsung.

Ujian E2E memulakan dua pelayan secara automatik: build offline (`:4173`) dan build "online" dengan URL Supabase palsu (`:4174`).

---

## Deployment

Permainan ini ialah **laman statik**. Selepas `npm run build`, muat naik folder `dist/` ke mana-mana hos statik.

### Vercel
1. Import repositori di <https://vercel.com/new>.
2. Framework: **Vite**. Build command: `npm run build`. Output: `dist`.
3. Tambah `VITE_SUPABASE_URL` dan `VITE_SUPABASE_ANON_KEY` di *Settings → Environment Variables*, kemudian deploy.

### Netlify / Cloudflare Pages
- Build command `npm run build`, publish directory `dist`, dan tetapkan dua pemboleh ubah yang sama.

### Mana-mana pelayan (Nginx/Apache)
- Salin `dist/` ke direktori web. Pastikan `index.html` tidak di-cache lama, dan fail dalam `/assets/` boleh di-cache lama kerana nama failnya mengandungi hash.

Selepas deploy, tambah domain ke **Supabase → Authentication → URL Configuration**.

### Telefon dan PC (Android, iOS, Windows)
- **Android (Chrome):** buka laman, kemudian menu ⋮ → *Install app / Add to Home screen*. Ia dibuka skrin penuh, landscape.
- **iOS (Safari):** butang Share → *Add to Home Screen*. iOS tidak menyokong Fullscreen API, jadi gunakan ikon skrin utama.
- **Windows (Edge/Chrome):** ikon *Install* di bar alamat.
- Untuk pakej kedai aplikasi, `dist/` boleh dibungkus dengan [Capacitor](https://capacitorjs.com) (Android/iOS) atau [Tauri](https://tauri.app)/Electron (Windows). Ini belum disediakan dalam repositori ini.

---

## Keselamatan

- Frontend hanya menggunakan kunci **anon**. Tiada service-role key dalam kod.
- **RLS diaktifkan pada semua jadual**. Geran lajur menghalang pengguna mengubah `id` atau cap masa.
- Skor hanya boleh ditulis melalui `submit_run()` (SECURITY DEFINER). Fungsi ini menolak:
  - Jarak yang mustahil untuk tempoh larian (> 37.4 m/s).
  - Syiling atau skor yang melebihi had peraturan permainan.
  - Penghantaran berulang dalam 3 saat.
- Mesej ralat Supabase ditukar kepada mesej mesra pemain.

---

## Had yang diketahui

- **Belum diuji dengan projek Supabase langsung** dalam persekitaran pembangunan ini (tiada kunci projek). SQL telah dijalankan pada PostgreSQL sebenar (PGlite), dan kod klien diuji terhadap mock HTTP yang mengikut format API Supabase. Selepas menyambung projek sebenar, cuba aliran daftar → main → leaderboard sekali secara manual.
- Permainan dijalankan sepenuhnya di klien. Pemeriksaan kemunasabahan pelayan menghadkan penipuan skor tetapi tidak menghapuskannya sepenuhnya. Baki syiling dalam `player_progress` juga dikawal klien.
- Multiplayer masa nyata tidak dilaksanakan (bukan keperluan utama). Supabase Realtime digunakan untuk kemas kini leaderboard secara langsung.
- Watak ialah model low-poly prosedural, bukan model beresolusi tinggi. Rig yang digunakan serasi dengan nama tulang Mixamo jika mahu menggantikannya dengan GLB.
- Prestasi 60 FPS bergantung pada peranti. Pada telefon lama, pilih **Low** dalam Settings.
