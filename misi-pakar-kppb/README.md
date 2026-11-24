# MISI PAKAR KPPB: PENGEMBARAAN 3E & 3R

Permainan pembelajaran **3D voxel isometrik** berasaskan web untuk **Topik 2: Model Pengintegrasian Teknologi dalam Pengajaran dan Pembelajaran (PdP)**: konsep dan peranan model pengintegrasian teknologi, Kerangka TPACK, Model SAMR, Technology Integration Matrix (TIM), Model 3E, Kerangka 3R dan Taksonomi Digital Bloom.

Pemain membaca 10 slaid interaktif (dengan nota Topik 2 yang boleh dimuat turun), memasuki **Arena Misi KPPB** yang mempunyai 10 portal soalan, naik pangkat daripada Pemula hingga **Pakar KPPB (Lencana Berlian)** dan **terus memuat turun sijil PDF**. Sijil boleh juga direkodkan dalam **Google Sheet** penganjur (pilihan).

**Pautan permainan:** https://misi-pakar-kppb.netlify.app

---

## Ciri-ciri

| Bahagian | Butiran |
| --- | --- |
| A. Halaman utama | Dunia voxel 3D (Three.js): bilik akademik isometrik, portal bercahaya, watak voxel berlabel, jubin huruf "KPPB" terapung, blok terapung, langit plum dengan awan piksel. Butang MULA MISI, PANDUAN PERMAINAN dan TENTANG TOPIK. |
| A. Halaman utama (tambahan) | Butang **BELAJAR / ULANG KAJI** (boleh kembali belajar bila-bila masa), **BUAT MISI** (dikunci sehingga pembelajaran selesai), **NOTA**, PANDUAN dan TENTANG TOPIK. Skrin memuatkan beranimasi: blok voxel jatuh dan bertindan, portal berputar, watak piksel berlari di atas bar kemajuan, tip Topik 2. |
| B. Pusat pembelajaran | 10 slaid wajib: konsep & peranan, TPACK (rajah Venn interaktif), SAMR (tangga), TIM (matriks 5×5), Model 3E (kad 3D + tab komponen), Rigor & Relevance, Relationship, Taksonomi Digital Bloom (piramid), rumusan. Penunjuk 1/10 hingga 10/10. Papan putih dan rak buku 3D berubah mengikut slaid. Butang SELESAI BELAJAR hanya aktif selepas semua slaid dibaca. |
| C. Arena 3D | Pulau blok dengan laluan, 10 portal bernombor 01 hingga 10, papan markah terapung, lencana pangkat 3D berputar. Klik portal: watak berjalan ke portal, kamera menyelam masuk, soalan dibuka. Seret untuk melihat, roda/cubit untuk zum. |
| D. Kuiz | 10 soalan (4 pilihan) meliputi semua subtopik Topik 2. Butang SAHKAN JAWAPAN. Jika salah: maklum balas SALAH dengan petunjuk nota (jawapan tidak didedahkan) dan butang **CUBA LAGI** yang menetapkan semula soalan untuk dijawab semula sehingga betul. **Markah rasmi dikira daripada cubaan pertama** (betul = 10, salah = 0); soalan yang diperbetulkan ditandakan oren. |
| Nota Topik 2 | Butang NOTA di bar atas (juga dari Halaman Utama dan dalam soalan): nota lengkap 8 bahagian dengan pautan pantas, dan **MUAT TURUN NOTA (PDF)**. |
| Pemarkahan & pangkat | Betul = 10 mata, salah = 0. Pangkat: 0–1 Pemula, 2–3 Perantis (Gangsa), 4–5 Penjelajah (Perak), 6–7 Pengamal (Emas), 8–9 Strategis (Platinum), 10 Pakar (Berlian). Animasi naik pangkat dengan lencana 3D, partikel dan bunyi. |
| E. Keputusan | Jumlah soalan, betul, salah, markah, peratus, pangkat tertinggi, lencana. Butang LIHAT PRESTASI, DAPATKAN SIJIL dan ULANGI PERMAINAN. |
| F. Sijil PDF | Borang mudah (nama + kelas) dengan **pratonton langsung** yang berubah semasa menaip, **3 tema** (Klasik Navy & Emas, Voxel Marun, Warna Lencana), kesan condong 3D dan kilauan, kemudian satu butang **MUAT TURUN SIJIL (PDF)**. Sijil A4 landskap: bingkai navy/emas, tangga blok di penjuru, lencana piksel ikut pangkat, tajuk dalam fon Cinzel, nama dalam tulisan skrip Great Vibes, teks Montserrat dan Playfair Display italik, jubin pencapaian, bar penguasaan 10 blok, cop "DISAHKAN", ruang tandatangan dan No. Sijil. PDF mempunyai lapisan teks tersembunyi supaya boleh dicari. Fail: `Sijil_Pencapaian_[Nama_Peserta].pdf`. Borang kosong ditolak. |
| Google Sheet (pilihan) | Rekod setiap sijil di latar belakang (tidak melambatkan muat turun): No. Sijil yang sama seperti pada PDF, markah dikira semula di pelayan, papan pemuka, salinan PDF dalam Drive, semakan kesahihan sijil. |
| Audio | Muzik chiptune ceria 128 BPM (dram, bass, arpeggio dan melodi 8 bar) serta kesan bunyi, disintesis dengan Web Audio. Butang muzik dan bunyi boleh dimatikan berasingan. |
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
│   ├── learning.js      # 10 slaid + nota Topik 2 + interaksi
│   ├── quiz.js          # 10 soalan, pemarkahan, penguncian jawapan
│   ├── ranking.js       # pangkat, lencana, model lencana 3D
│   ├── certificate.js   # lukisan sijil (kanvas) → PDF (jsPDF) + sambungan Google Sheet
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
├── netlify.toml
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
   - **Fail** (paling mudah): tampal URL dalam `src/config.js` (`GOOGLE_SCRIPT_URL`), kemudian terbit semula ke Netlify (lihat bahagian 3).
   - **Netlify**: Project configuration > Environment variables, tambah `VITE_GOOGLE_SCRIPT_URL` = URL tadi, kemudian terbit semula.
   - **Komputer sendiri**: cipta fail `.env.local` dengan `VITE_GOOGLE_SCRIPT_URL=https://script.google.com/macros/s/XXXX/exec`.

Uji: buka URL `/exec` dalam pelayar. Ia patut memaparkan `{"ok":true,"servis":"Misi Pakar KPPB — Google Sheet",...}`.

### Apa yang berlaku apabila pemain menekan JANA SIJIL

1. PDF dijana di peranti pemain dan **terus dimuat turun** (tidak perlu menunggu Google Sheet).
2. Di latar belakang, permainan menghantar nama, kelas, No. Sijil (cth. `KPPB-20261124-AB12`) dan rentetan jawapan (cth. `BABCBCBCAD`) ke Apps Script.
3. Apps Script **mengira semula markah** daripada kunci jawapan (bukan bergantung pada nilai daripada pelayar), menetapkan pangkat dan lencana, dan menambah baris dalam `Rekod_Sijil` dengan No. Sijil yang sama seperti pada PDF.
4. Salinan PDF dihantar ke Apps Script dan disimpan dalam folder Drive **"Sijil Misi Pakar KPPB"**. Pautannya ditulis dalam lajur *Pautan PDF Sijil*. (Matikan dengan `SIMPAN_PDF_KE_DRIVE = false` dalam `Code.gs`.)

Semak kesahihan sijil: `URL_EXEC?tindakan=semak&id=KPPB-2026-0001`.

Jika Google Sheet belum disambungkan atau talian gagal, sijil **tetap dimuat turun** seperti biasa.

> Jika anda mengubah `Code.gs` selepas penerapan, gunakan **Terapkan > Urus penerapan > Edit > Versi baharu** supaya URL kekal sama.

---

## 3. Menerbitkan permainan dalam talian (pautan web)

### Netlify (utama)

Laman: **https://misi-pakar-kppb.netlify.app** (projek Netlify `misi-pakar-kppb`). Tetapan build dibaca daripada `netlify.toml` (`npm run build`, folder `dist`).

Untuk menerbit semula selepas perubahan, pilih satu:

- **Seret & lepas (paling mudah):** jalankan `npm run build`, buka https://app.netlify.com/projects/misi-pakar-kppb/deploys dan seret folder `dist` ke kawasan muat naik.
- **Netlify CLI:** dalam folder `misi-pakar-kppb`:

```bash
npx netlify-cli deploy --prod --build
```

### Vercel (salinan kedua)

Projek Vercel `misi-pakar-kppb` (https://misi-pakar-kppb.vercel.app) disambungkan kepada repo GitHub ini dengan Root Directory `misi-pakar-kppb` dan tetapan daripada `vercel.json`.

### Alternatif lain

Folder `dist/` ialah laman statik biasa dan boleh dimuat naik ke GitHub Pages atau mana-mana pelayan web. Tetapan `base: './'` dalam `vite.config.js` membolehkan permainan berjalan dalam subfolder.

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

Ujian ini membaca 10 slaid, mengklik 10 portal 3D sebenar, menjawab soalan untuk keputusan **0, 2, 4, 6, 8 dan 10** betul, menyemak maklum balas, butang CUBA LAGI (cubaan semula salah dan betul, markah rasmi tidak berubah), mata, animasi naik pangkat, skrin keputusan, prestasi, borang sijil (kosong ditolak) dan kandungan PDF (nama, kelas, markah, pangkat), serta satu larian pada saiz telefon (iPhone 13). Tambah `SHEET_MOCK=1` untuk menguji sambungan Google Sheet dengan simulasi `Code.gs`.

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

HTML5, CSS3, JavaScript (ES modules), **Three.js** (dunia 3D, InstancedMesh, shader portal), **Vite**, **GSAP** (animasi UI & kamera), **Lucide** (ikon), **jsPDF** (sijil), **LocalStorage**, **Google Apps Script** (Google Sheet & Drive). Fon: Press Start 2P, VT323, Montserrat, Great Vibes, Cinzel, Playfair Display (dihoskan sendiri melalui Fontsource).
