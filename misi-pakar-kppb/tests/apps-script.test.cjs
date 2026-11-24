// Ujian logik Google Apps Script (Code.gs) dengan simulasi: node tests/apps-script.test.cjs
const assert = require('assert/strict');
const { createEnv } = require('./apps-script-mock.cjs');

let n = 0;
const test = (name, fn) => { fn(); n++; console.log('  ✔', name); };
const env = createEnv();
const yr = new Date().getFullYear();

console.log('Google Apps Script (Code.gs)');
test('sediakan() mencipta tab rekod, tajuk lajur dan papan pemuka', () => {
  env.ctx.sediakan();
  const sh = env.sheets.Rekod_Sijil;
  assert.equal(sh.cell(1, 2), 'No. Sijil');
  assert.equal(sh.cell(1, 15), 'Token (sistem)');
  assert.ok(env.sheets.Papan_Pemuka.cell(3, 2).startsWith('=COUNTA('));
});
test('doGet status', () => assert.equal(env.get({}).ok, true));

let rec;
test('rekod sah disimpan; markah dikira semula di pelayan', () => {
  rec = env.post({ nama: '  Nur  Aisyah binti Ahmad ', kelas: '4 Bestari', jawapan: 'BABCBCBCAA', markah: 100, betul: 10, tarikh: '24 November 2026' });
  assert.equal(rec.ok, true);
  assert.equal(rec.certificateId, `KPPB-${yr}-0001`);
  assert.equal(rec.betul, 9);
  assert.equal(rec.markah, 90);
  assert.equal(rec.pangkat, 'STRATEGIS KPPB');
  assert.equal(rec.lencana, 'Platinum');
  const row = env.sheets.Rekod_Sijil.rows[1];
  assert.equal(row[2], 'Nur Aisyah binti Ahmad');
  assert.equal(row[4], 90);
  assert.equal(row[11], 'BABCBCBCAA');
  assert.equal(row[7], 0.9);
});
test('No. Sijil bertambah secara berurutan', () => {
  const r2 = env.post({ nama: 'Ali bin Abu', kelas: '4 Bestari', jawapan: 'BABCBCBCAD' });
  assert.equal(r2.certificateId, `KPPB-${yr}-0002`);
  assert.equal(r2.pangkat, 'PAKAR KPPB');
});
test('nama/kelas kosong atau jawapan tidak lengkap ditolak', () => {
  assert.equal(env.post({ nama: '', kelas: 'X', jawapan: 'BABCBCBCAD' }).ok, false);
  assert.equal(env.post({ nama: 'Ali bin Abu', kelas: '  ', jawapan: 'BABCBCBCAD' }).ok, false);
  assert.equal(env.post({ nama: 'Ali bin Abu', kelas: 'X', jawapan: 'BAB-BCBCAD' }).ok, false);
  assert.equal(env.sheets.Rekod_Sijil.getLastRow(), 3);
});
test('suntikan formula dineutralkan', () => {
  const r = env.post({ nama: '=HYPERLINK("x")', kelas: '+1', jawapan: 'AAAAAAAAAA' });
  const row = env.sheets.Rekod_Sijil.rows[r.certificateId.endsWith('3') ? 3 : 0];
  assert.ok(row[2].startsWith("'="));
  assert.ok(row[3].startsWith("'+"));
});
test('salinan PDF: token salah ditolak, token betul disimpan ke Drive', () => {
  const pdf = Buffer.from('%PDF-1.3 mock').toString('base64');
  assert.equal(env.post({ tindakan: 'pdf', noSijil: rec.certificateId, token: 'salah', pdf }).ok, false);
  const ok = env.post({ tindakan: 'pdf', noSijil: rec.certificateId, token: rec.token, pdf });
  assert.equal(ok.ok, true);
  assert.ok(ok.url.includes('drive.google.com'));
  assert.equal(env.files[0].name, `Sijil_Pencapaian_Nur_Aisyah_binti_Ahmad_${rec.certificateId}.pdf`);
  assert.equal(env.sheets.Rekod_Sijil.rows[1][12], ok.url);
});
test('semak kesahihan sijil', () => {
  const s = env.get({ tindakan: 'semak', id: rec.certificateId });
  assert.equal(s.sah, true);
  assert.equal(s.nama, 'Nur Aisyah binti Ahmad');
  assert.equal(env.get({ tindakan: 'semak', id: 'KPPB-0000-9999' }).sah, false);
});
console.log(`\n${n} ujian lulus.`);
