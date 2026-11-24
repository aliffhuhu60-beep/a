# MISI PAKAR KPPB: PENGEMBARAAN 3E & 3R

Permainan pembelajaran **3D voxel isometrik** berasaskan web untuk **Topik 2: Model Pengintegrasian Teknologi dalam Pengajaran dan Pembelajaran (PdP)**: Model 3E (Engagement, Enhancement, Extension) dan Kerangka 3R (Rigor, Relevance, Relationship).

Pemain membaca 8 slaid interaktif, memasuki **Arena Misi KPPB** yang mempunyai 10 portal soalan, naik pangkat daripada Pemula hingga **Pakar KPPB (Lencana Berlian)** dan menjana **sijil PDF**. Setiap sijil boleh direkodkan secara automatik dalam **Google Sheet** penganjur, lengkap dengan No. Sijil rasmi dan salinan PDF dalam Google Drive.

---

## Ciri-ciri

| Bahagian | Butiran |
| --- | --- |
| A. Halaman utama | Dunia voxel 3D (Three.js): bilik akademik isometrik, portal bercahaya, watak voxel berlabel, jubin huruf "KPPB" terapung, blok terapung, langit plum dengan awan piksel. Butang MULA MISI, PANDUAN PERMAINAN dan TENTANG TOPIK. |
| B. Pusat pembelajaran | 8 slaid wajib dengan kad 3D boleh dibalik, cip komponen, tangga Rigor, laluan Relevance dan rumusan 3E/3R. Penunjuk 1/8 hingga 8/8. Papan putih dan rak buku 3D berubah mengikut slaid. Butang SELESAI BELAJAR hanya aktif selepas semua slaid dibaca. |
| C. Arena 3D | Pulau blok dengan laluan, 10 portal bernombor 01 hingga 10, papan markah terapung, lencana pangkat 3D berputar. Klik portal: watak berjalan ke portal, kamera menyelam masuk, soalan dibuka. Seret untuk melihat, roda/cubit untuk zum. |
| D. Kuiz | 10 soalan (4 pilihan). Butang SAHKAN JAWAPAN, maklum balas BETUL / CUBA LAGI dengan penerangan, jawapan dikunci selepas dihantar. |
| Pemarkahan & pangkat | Betul = 10 mata, salah = 0. Pangkat: 0–1 Pemula, 2–3 Perantis (Gangsa), 4–5 Penjelajah (Perak), 6–7 Pengamal (Emas), 8–9 Strategis (Platinum), 10 Pakar (Berlian). Animasi naik pangkat dengan lencana 3D, partikel dan bunyi. |
| E. Keputusan | Jumlah soalan, betul, salah, markah, peratus, pangkat tertinggi, lencana. Butang LIHAT PRESTASI, DAPATKAN SIJIL dan ULANGI PERMAINAN. |
| F. Sijil PDF | A4 landskap, bingkai navy dan emas, hiasan blok di penjuru, simbol lencana, nama dalam tulisan skrip (Great Vibes), ruang tandatangan. Fail: `Sijil_Pencapaian_[Nama_Peserta].pdf`. Borang kosong ditolak. |
| Google Sheet | Rekod setiap sijil, No. Sijil berurutan (`KPPB-2026-0001`), markah dikira semula di pelayan, papan pemuka, salinan PDF dalam Drive, semakan kesahihan sijil. |
| Audio | Muzik chiptune dan kesan bunyi disintesis dengan Web Audio. Butang muzik dan bunyi boleh dimatikan berasingan. |
| Simpanan | LocalStorage: kemajuan slaid, jawapan, markah, rekod terbaik, tetapan audio. Tiada akaun diperlukan. |

---

## Struktur projek

```
misi-pakar-kppb/
├── public/
│   ├── fonts/GreatVibes-Regular.ttf   # fon skrip untuk nama pada sijil
│   ├── favicon.svg
│   └── models/ textures/ sounds/ badges/   # (kosong: semua model, tekstur & bunyi dijana dengan kod)
├── src/
│   ├── main.js          # pengawal utama: skrin, navigasi, simpanan, kuiz, keputusan
│   ├── style.css        # gaya piksel (panel plum, cip, jubin huruf)
│   ├── game.js          # dunia 3D Three.js: halaman utama, pusat pembelajaran, arena
│   ├── learning.js      # kandungan 8 slaid + interaksi
│   ├── quiz.js          # 10 soalan, pemarkahan, penguncian jawapan
│   ├── ranking.js       # pangkat, lencana, model lencana 3D
│   ├── certificate.js   # sijil PDF (jsPDF) + sambungan Google Sheet
│   ├── audio.js         # muzik & kesan bunyi (Web Audio)
│   └── config.js        # URL Google Apps Script, label penganjur
├── google-apps-script/
│   └── Code.gs          # kod untuk Google Sheet (Apps Script Web App)
├── tests/
│   ├── logic.test.mjs        # ujian pemarkahan & pangkat (0–10 betul)
│   ├── apps-script.test.cjs  # ujian Code.gs dengan simulasi Google
│   ├── apps-script-mock.cjs
│   └── e2e.cjs               # ujian pelayar penuh (Playwright)
├── index.html
├── vercel.json
├── package.json
└── README.md
```

---

## 1. Pemasangan & menjalankan di komputer

Keperluan: **Node.js 20+** dan npm.

```bash
cd misi-pakar-kppb
```

```bash
npm install
```

```bash
npm run dev
```

Buka alamat yang dipaparkan (biasanya `http://localhost:5173`). Untuk menguji di telefon dalam rangkaian Wi-Fi yang sama, buka alamat `Network:` yang dipaparkan.

Bina versi produksi (fail statik dalam `dist/`):

```bash
npm run build
```

```bash
npm run preview
```

---

## 2. Menyambung ke Google Sheet (sijil direkodkan secara automatik)

Google Sheet **Rekod Sijil Misi Pakar KPPB** telah disediakan dengan tiga tab:

- **Rekod_Sijil**: satu baris bagi setiap sijil (cap masa, No. Sijil, nama, kelas, markah, jawapan betul/salah, peratus, pangkat, lencana, tarikh, rentetan jawapan, pautan PDF, sumber, token sistem).
- **Papan_Pemuka**: jumlah sijil, purata markah, markah tertinggi, bilangan Pakar KPPB, bilangan mengikut pangkat dan ringkasan mengikut kelas (formula, dikemas kini sendiri).
- **Panduan**: langkah sambungan ringkas.

Langkah sambungan (sekali sahaja, kira-kira 5 minit):

1. Buka Google Sheet itu, kemudian **Sambungan (Extensions) > Apps Script**.
2. Padam kod contoh. Salin **semua** kandungan `google-apps-script/Code.gs` dan tampal. Tekan **Simpan**.
3. Pada senarai fungsi di atas, pilih **`sediakan`** dan tekan **Jalankan (Run)**. Benarkan akses (Google akan memaparkan amaran "app isn't verified" kerana skrip ini milik anda sendiri: pilih *Advanced > Go to project*).
4. Tekan **Terapkan (Deploy) > Penerapan baharu (New deployment)**. Pada ikon gear pilih **Aplikasi web (Web app)**:
   - Laksanakan sebagai (Execute as): **Saya (Me)**
   - Siapa yang mempunyai akses (Who has access): **Sesiapa sahaja (Anyone)**
5. Tekan **Terapkan**, kemudian salin **URL aplikasi web** (berakhir dengan `/exec`).
6. Masukkan URL itu ke dalam permainan menggunakan **salah satu** cara:
   - **Vercel** (disyorkan): Project > Settings > Environment Variables, tambah `VITE_GOOGLE_SCRIPT_URL` = URL tadi, kemudian **Redeploy**.
   - **Fail**: tampal URL dalam `src/config.js` (`GOOGLE_SCRIPT_URL`), kemudian bina dan terbit semula.
   - **Komputer sendiri**: cipta fail `.env.local` dengan `VITE_GOOGLE_SCRIPT_URL=https://script.google.com/macros/s/XXXX/exec`.

Uji: buka URL `/exec` dalam pelayar. Ia patut memaparkan `{"ok":true,"servis":"Misi Pakar KPPB — Google Sheet",...}`.

### Apa yang berlaku apabila pemain menekan JANA SIJIL

1. Permainan menghantar nama, kelas dan rentetan jawapan (cth. `BABCBCBCAD`) ke Apps Script.
2. Apps Script **mengira semula markah** daripada kunci jawapan (bukan bergantung pada nilai daripada pelayar), menetapkan pangkat dan lencana, memberi **No. Sijil berurutan** (`KPPB-2026-0001`) dan menambah baris dalam `Rekod_Sijil`.
3. Permainan menjana PDF dengan No. Sijil rasmi dan memuat turunnya untuk pemain.
4. Salinan PDF dihantar ke Apps Script dan disimpan dalam folder Drive **"Sijil Misi Pakar KPPB"**. Pautannya ditulis dalam lajur *Pautan PDF Sijil*. (Matikan dengan `SIMPAN_PDF_KE_DRIVE = false` dalam `Code.gs`.)

Semak kesahihan sijil: `URL_EXEC?tindakan=semak&id=KPPB-2026-0001`.

Jika Google Sheet belum disambungkan atau talian gagal, sijil **tetap dijana** di peranti pemain (dengan No. Sijil tempatan) dan pemain dimaklumkan.

> Jika anda mengubah `Code.gs` selepas penerapan, gunakan **Terapkan > Urus penerapan > Edit > Versi baharu** supaya URL kekal sama.

---

## 3. Menerbitkan permainan dalam talian (pautan web)

### Vercel (sudah disediakan)

Projek Vercel `misi-pakar-kppb` disambungkan kepada repo GitHub ini dengan **Root Directory = `misi-pakar-kppb`**. Tetapan build dibaca daripada `vercel.json` (`npm run build`, output `dist`).

Untuk menerbit semula selepas perubahan: tolak (push) perubahan ke GitHub, atau tekan **Redeploy** dalam papan pemuka Vercel.

### Alternatif

Folder `dist/` hasil `npm run build` ialah laman statik biasa. Ia boleh dimuat naik ke **Netlify** (seret & lepas folder `dist`), **GitHub Pages** atau mana-mana pelayan web. Tetapan `base: './'` dalam `vite.config.js` membolehkan permainan berjalan dalam subfolder.

---

## 4. Pengujian

```bash
npm test
```

Ujian logik: kunci jawapan, markah dan pangkat untuk **0 hingga 10** jawapan betul, penguncian jawapan, borang sijil, nama fail dan tarikh.

```bash
node tests/apps-script.test.cjs
```

Ujian `Code.gs` dengan simulasi Google Sheet, Drive dan Lock: rekod, No. Sijil berurutan, pengiraan semula markah, input tidak sah ditolak, perlindungan suntikan formula, simpanan PDF dengan token, semakan sijil.

Ujian pelayar penuh (Playwright). Dalam satu terminal:

```bash
npm run build && npx vite preview --port 4173
```

Dalam terminal lain:

```bash
npm run test:e2e
```

Ujian ini membaca 8 slaid, mengklik 10 portal 3D sebenar, menjawab soalan untuk keputusan **0, 2, 4, 6, 8 dan 10** betul, menyemak maklum balas, mata, animasi naik pangkat, skrin keputusan, prestasi, borang sijil (kosong ditolak) dan kandungan PDF (nama, kelas, markah, pangkat), serta satu larian pada saiz telefon (iPhone 13). Tambah `SHEET_MOCK=1` untuk menguji sambungan Google Sheet dengan simulasi `Code.gs`.

---

## 5. Kawalan

| Peranti | Tindakan |
| --- | --- |
| Komputer | Klik butang dan portal. Seret untuk melihat arena. Roda tetikus untuk zum. Kekunci ← → untuk slaid. Kekunci 1–4 / A–D dan Enter dalam soalan. |
| Telefon / tablet | Sentuh butang dan portal. Leret slaid ke kiri/kanan. Seret untuk melihat arena, cubit untuk zum. |

## 6. Privasi

- Tiada akaun pengguna. Kemajuan disimpan dalam LocalStorage pelayar pemain sahaja.
- Nama dan kelas hanya digunakan untuk sijil dan rekod dalam Google Sheet penganjur. Nama tidak disimpan dalam LocalStorage.
- Web App Apps Script terbuka kepada sesiapa yang mempunyai URL. Markah sentiasa dikira semula di pelayan, input dibersihkan dan suntikan formula dihalang, tetapi seseorang yang mengetahui URL masih boleh menghantar rekod palsu. Gunakan lajur *Rentetan Jawapan* dan *Cap Masa* untuk semakan.

## 7. Teknologi

HTML5, CSS3, JavaScript (ES modules), **Three.js** (dunia 3D, InstancedMesh, shader portal), **Vite**, **GSAP** (animasi UI & kamera), **Lucide** (ikon), **jsPDF** (sijil), **LocalStorage**, **Google Apps Script** (Google Sheet & Drive). Fon: Press Start 2P, VT323, Montserrat, Great Vibes (dihoskan sendiri melalui Fontsource).
