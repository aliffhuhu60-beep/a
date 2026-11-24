/**
 * MISI PAKAR KPPB — Sambungan Google Sheet untuk sijil digital.
 *
 * Cara pasang (ringkas — lihat README.md untuk langkah penuh):
 *   1. Buka Google Sheet rekod > Sambungan (Extensions) > Apps Script.
 *   2. Padam kod contoh, tampal SEMUA kod ini, tekan Simpan.
 *   3. Pilih fungsi `sediakan` dan tekan Jalankan (Run) sekali — benarkan akses.
 *   4. Terapkan (Deploy) > Penerapan baharu > Jenis: Aplikasi web
 *        - Laksanakan sebagai: Saya
 *        - Siapa yang mempunyai akses: Sesiapa sahaja (Anyone)
 *   5. Salin URL aplikasi web (berakhir dengan /exec) dan masukkan ke dalam permainan
 *      (src/config.js atau pemboleh ubah VITE_GOOGLE_SCRIPT_URL).
 *
 * Fungsi:
 *   POST {nama, kelas, jawapan, noSijil?, ...} -> simpan rekod, pulangkan No. Sijil
 *   POST {tindakan:'pdf', noSijil, token, pdf} -> simpan salinan PDF sijil ke Google Drive
 *   GET  ?tindakan=semak&id=KPPB-2026-0001    -> semak kesahihan sijil
 */

// ---------------- TETAPAN ----------------
var NAMA_SHEET = 'Rekod_Sijil';
var NAMA_PAPAN = 'Papan_Pemuka';
var SIMPAN_PDF_KE_DRIVE = true;               // false = tidak simpan salinan PDF
var NAMA_FOLDER_DRIVE = 'Sijil Misi Pakar KPPB';
var KUNCI_JAWAPAN = 'BABCBCBCAD';             // jawapan betul soalan 1-10
var ZON_MASA = 'Asia/Kuala_Lumpur';

var LAJUR = [
  'Cap Masa', 'No. Sijil', 'Nama Penuh', 'Kelas', 'Markah (/100)', 'Jawapan Betul (/10)',
  'Jawapan Salah', 'Peratus', 'Pangkat', 'Lencana', 'Tarikh Sijil', 'Rentetan Jawapan',
  'Pautan PDF Sijil', 'Sumber', 'Token (sistem)'
];

var PANGKAT = [
  { min: 0, max: 1, nama: 'PEMULA KPPB', lencana: 'Tiada' },
  { min: 2, max: 3, nama: 'PERANTIS KPPB', lencana: 'Gangsa' },
  { min: 4, max: 5, nama: 'PENJELAJAH KPPB', lencana: 'Perak' },
  { min: 6, max: 7, nama: 'PENGAMAL KPPB', lencana: 'Emas' },
  { min: 8, max: 9, nama: 'STRATEGIS KPPB', lencana: 'Platinum' },
  { min: 10, max: 10, nama: 'PAKAR KPPB', lencana: 'Berlian' }
];

// ---------------- PERSEDIAAN ----------------
/** Jalankan sekali untuk menyediakan tab, tajuk lajur dan papan pemuka. */
function sediakan() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(NAMA_SHEET) || ss.insertSheet(NAMA_SHEET, 0);
  sh.getRange(1, 1, 1, LAJUR.length).setValues([LAJUR])
    .setFontWeight('bold').setBackground('#3d1828').setFontColor('#ffffff');
  sh.setFrozenRows(1);
  sh.getRange('A2:A').setNumberFormat('d/m/yyyy h:mm');
  sh.getRange('H2:H').setNumberFormat('0%');
  sh.setColumnWidth(3, 240);
  sh.setColumnWidth(13, 260);

  var pp = ss.getSheetByName(NAMA_PAPAN) || ss.insertSheet(NAMA_PAPAN);
  if (!pp.getRange('A1').getValue()) {
    var R = NAMA_SHEET + '!';
    pp.getRange('A1').setValue('PAPAN PEMUKA: MISI PAKAR KPPB').setFontWeight('bold').setFontSize(14);
    pp.getRange('A3:B7').setValues([
      ['Jumlah sijil dijana', '=COUNTA(' + R + 'B2:B)'],
      ['Purata markah', '=IFERROR(ROUND(AVERAGE(' + R + 'E2:E),1),0)'],
      ['Markah tertinggi', '=IFERROR(MAX(' + R + 'E2:E),0)'],
      ['Bilangan Pakar KPPB (100/100)', '=COUNTIF(' + R + 'E2:E,100)'],
      ['Sijil terkini', '=IF(COUNTA(' + R + 'B2:B)=0,"-",INDEX(' + R + 'B2:B,COUNTA(' + R + 'B2:B)))']
    ]);
    pp.getRange('D3:E3').setValues([['Pangkat', 'Bilangan']]).setFontWeight('bold');
    for (var i = 0; i < PANGKAT.length; i++) {
      pp.getRange(4 + i, 4, 1, 2).setValues([[PANGKAT[i].nama, '=COUNTIF(' + R + 'I2:I,D' + (4 + i) + ')']]);
    }
    pp.getRange('A10').setValue('Mengikut kelas').setFontWeight('bold');
    pp.getRange('A11').setFormula('=IFERROR(QUERY(' + R + 'A1:O,"select D, count(B), avg(E), max(E) where B is not null group by D label D \'Kelas\', count(B) \'Peserta\', avg(E) \'Purata Markah\', max(E) \'Markah Tertinggi\'",1),"Belum ada rekod")');
  }
  return 'Sedia: ' + ss.getUrl();
}

// ---------------- WEB APP ----------------
function doPost(e) {
  try {
    var data = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    if (data.tindakan === 'pdf') return json_(simpanPdf_(data));
    return json_(simpanRekod_(data));
  } catch (err) {
    return json_({ ok: false, error: 'Permintaan tidak sah: ' + err.message });
  }
}

function doGet(e) {
  var p = (e && e.parameter) || {};
  if (p.tindakan === 'semak' && p.id) return json_(semak_(String(p.id)));
  return json_({ ok: true, servis: 'Misi Pakar KPPB — Google Sheet', masa: new Date().toISOString() });
}

// ---------------- LOGIK ----------------
function simpanRekod_(d) {
  var nama = bersih_(d.nama, 80);
  var kelas = bersih_(d.kelas, 40);
  if (nama.length < 3) return { ok: false, error: 'Nama penuh diperlukan.' };
  if (!kelas) return { ok: false, error: 'Kelas diperlukan.' };
  var jawapan = String(d.jawapan || '').toUpperCase();
  if (!/^[ABCD]{10}$/.test(jawapan)) return { ok: false, error: 'Rentetan jawapan mesti 10 huruf A-D (semua soalan dijawab).' };

  // Kira semula markah di pelayan — tidak bergantung pada nilai daripada pelayar.
  var betul = 0;
  for (var i = 0; i < 10; i++) if (jawapan.charAt(i) === KUNCI_JAWAPAN.charAt(i)) betul++;
  var markah = betul * 10;
  var pk = pangkat_(betul);

  var lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    var sh = sheet_();
    // Guna No. Sijil yang tertera pada PDF pemain jika sah dan unik; jika tidak, jana nombor berurutan.
    var cadangan = String(d.noSijil || '').toUpperCase();
    var noSijil;
    if (/^KPPB-\d{8}-[A-Z0-9]{4}$/.test(cadangan) && !cariBaris_(sh, cadangan)) {
      noSijil = cadangan;
    } else {
      var bil = Math.max(0, sh.getLastRow() - 1) + 1;
      var tahun = Utilities.formatDate(new Date(), ZON_MASA, 'yyyy');
      noSijil = 'KPPB-' + tahun + '-' + ('0000' + bil).slice(-4);
    }
    var token = Utilities.getUuid();
    var tarikh = bersih_(d.tarikh, 40) || Utilities.formatDate(new Date(), ZON_MASA, 'd/M/yyyy');
    sh.appendRow([
      new Date(), noSijil, nama, kelas, markah, betul, 10 - betul, markah / 100,
      pk.nama, pk.lencana, tarikh, jawapan, '', bersih_(d.sumber, 80), token
    ]);
    return { ok: true, certificateId: noSijil, token: token, betul: betul, markah: markah, pangkat: pk.nama, lencana: pk.lencana, simpanPdf: SIMPAN_PDF_KE_DRIVE };
  } finally {
    lock.releaseLock();
  }
}

function simpanPdf_(d) {
  if (!SIMPAN_PDF_KE_DRIVE) return { ok: false, error: 'Simpanan PDF dimatikan.' };
  var id = String(d.noSijil || '');
  var token = String(d.token || '');
  var b64 = String(d.pdf || '');
  if (!id || !token || !b64) return { ok: false, error: 'Data PDF tidak lengkap.' };
  if (b64.length > 8 * 1024 * 1024) return { ok: false, error: 'Fail terlalu besar.' };
  var sh = sheet_();
  var row = cariBaris_(sh, id);
  if (!row) return { ok: false, error: 'No. sijil tidak dijumpai.' };
  var vals = sh.getRange(row, 1, 1, LAJUR.length).getValues()[0];
  if (vals[14] !== token) return { ok: false, error: 'Token tidak sah.' };
  if (vals[12]) return { ok: true, url: vals[12] }; // sudah disimpan
  var bytes = Utilities.base64Decode(b64);
  var nama = 'Sijil_Pencapaian_' + String(vals[2]).replace(/[^A-Za-z0-9@'.\- ]+/g, '').replace(/\s+/g, '_') + '_' + id + '.pdf';
  var file = folder_().createFile(Utilities.newBlob(bytes, 'application/pdf', nama));
  sh.getRange(row, 13).setValue(file.getUrl());
  return { ok: true, url: file.getUrl() };
}

function semak_(id) {
  var sh = sheet_();
  var row = cariBaris_(sh, id);
  if (!row) return { ok: false, sah: false, error: 'Sijil tidak dijumpai.' };
  var v = sh.getRange(row, 1, 1, 11).getValues()[0];
  return { ok: true, sah: true, noSijil: v[1], nama: v[2], kelas: v[3], markah: v[4], betul: v[5], pangkat: v[8], lencana: v[9], tarikh: v[10] };
}

// ---------------- PEMBANTU ----------------
function sheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(NAMA_SHEET);
  if (!sh) { sediakan(); sh = ss.getSheetByName(NAMA_SHEET); }
  return sh;
}

function folder_() {
  var it = DriveApp.getFoldersByName(NAMA_FOLDER_DRIVE);
  return it.hasNext() ? it.next() : DriveApp.createFolder(NAMA_FOLDER_DRIVE);
}

function cariBaris_(sh, id) {
  var last = sh.getLastRow();
  if (last < 2) return 0;
  var found = sh.getRange(2, 2, last - 1, 1).createTextFinder(id).matchEntireCell(true).findNext();
  return found ? found.getRow() : 0;
}

function pangkat_(betul) {
  for (var i = 0; i < PANGKAT.length; i++) if (betul >= PANGKAT[i].min && betul <= PANGKAT[i].max) return PANGKAT[i];
  return PANGKAT[0];
}

/** Buang ruang berlebihan, hadkan panjang dan halang suntikan formula. */
function bersih_(s, max) {
  var t = String(s == null ? '' : s).replace(/[\u0000-\u001f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
  if (/^[=+\-@]/.test(t)) t = "'" + t;
  return t;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
