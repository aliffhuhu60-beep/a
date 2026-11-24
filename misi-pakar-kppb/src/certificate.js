// Penjanaan sijil PDF (jsPDF) dan sambungan rekod ke Google Sheet (Google Apps Script).
import { jsPDF } from 'jspdf';
import { GOOGLE_SCRIPT_URL, CERT_ORGANIZER } from './config.js';
import { RANKS } from './ranking.js';

const BULAN = ['Januari', 'Februari', 'Mac', 'April', 'Mei', 'Jun', 'Julai', 'Ogos', 'September', 'Oktober', 'November', 'Disember'];

export function formatTarikh(d = new Date()) {
  return `${d.getDate()} ${BULAN[d.getMonth()]} ${d.getFullYear()}`;
}

export function certFileName(name) {
  const safe = String(name)
    .trim()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z0-9@'.\- ]+/g, '')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .slice(0, 60) || 'Peserta';
  return `Sijil_Pencapaian_${safe}.pdf`;
}

/** Sahkan input borang. Pulangkan objek ralat (kosong jika sah). */
export function validateForm(name, kelas) {
  const errors = {};
  const n = String(name || '').trim();
  const k = String(kelas || '').trim();
  if (!n) errors.name = 'Sila isi nama penuh anda.';
  else if (n.length < 3) errors.name = 'Nama terlalu pendek.';
  else if (n.length > 80) errors.name = 'Nama terlalu panjang (maksimum 80 aksara).';
  if (!k) errors.kelas = 'Sila isi nama kelas anda.';
  else if (k.length > 40) errors.kelas = 'Nama kelas terlalu panjang (maksimum 40 aksara).';
  return errors;
}

// ---------------------------------------------------------------------------
// Google Sheet
// ---------------------------------------------------------------------------
export function sheetConfigured() {
  return /^https:\/\/script\.google\.com\/macros\/s\/.+\/exec$/.test(GOOGLE_SCRIPT_URL || '');
}

/**
 * Hantar rekod sijil ke Google Sheet melalui Web App Apps Script.
 * Pelayan mengira semula markah daripada rentetan jawapan dan memulangkan No. Sijil rasmi.
 */
export async function sendToSheet(payload, timeoutMs = 15000) {
  if (!sheetConfigured()) return { ok: false, reason: 'not-configured' };
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(GOOGLE_SCRIPT_URL, {
      method: 'POST',
      // text/plain mengelakkan permintaan CORS preflight yang tidak disokong Apps Script
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
      signal: ctrl.signal,
      redirect: 'follow',
    });
    const data = await res.json();
    return data && data.ok ? data : { ok: false, reason: data?.error || 'server' };
  } catch (err) {
    return { ok: false, reason: err.name === 'AbortError' ? 'timeout' : 'network' };
  } finally {
    clearTimeout(timer);
  }
}

/** Hantar salinan PDF sijil ke Google Drive penganjur (melalui Apps Script). */
export async function uploadPdfToSheet(doc, certId, token) {
  const dataUri = doc.output('datauristring');
  const pdf = dataUri.slice(dataUri.indexOf(',') + 1);
  return sendToSheet({ tindakan: 'pdf', noSijil: certId, token, pdf }, 30000);
}

const ID_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export function localCertId(d = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  let rand = '';
  for (let i = 0; i < 4; i++) rand += ID_CHARS[Math.floor(Math.random() * ID_CHARS.length)];
  return `KPPB-${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${rand}`;
}

// ---------------------------------------------------------------------------
// Reka bentuk sijil (dilukis pada kanvas: pratonton langsung = PDF)
// ---------------------------------------------------------------------------
export const CERT_STATEMENT = 'Telah menyelesaikan 10 soalan penilaian berkaitan Topik 2, Model Pengintegrasian Teknologi dalam Pengajaran dan Pembelajaran, dengan menunjukkan penguasaan terhadap konsep dan peranan model pengintegrasian teknologi, Kerangka TPACK, Model SAMR, Technology Integration Matrix (TIM), Model 3E, Kerangka 3R serta Taksonomi Digital Bloom.';
const BW = 1754; // A4 landskap, unit asas (150 dpi)
const BH = 1240;

export const CERT_THEMES = {
  klasik: { name: 'Klasik Navy & Emas', frame: '#1b2a4a', accent: '#c49a2c', accent2: '#ecd08a', chip: '#1b2a4a', seal: '#a3203a', tint: '#f6f1e6' },
  voxel: { name: 'Voxel Marun', frame: '#5a1834', accent: '#e0aa3a', accent2: '#ff7fae', chip: '#7a2340', seal: '#5a1834', tint: '#fbf0f3' },
  lencana: { name: 'Warna Lencana', frame: '#1b2a4a', accent: null, accent2: null, chip: null, seal: '#1b2a4a', tint: '#eef6f8' },
};

function themeFor(key, rank) {
  const t = { ...(CERT_THEMES[key] || CERT_THEMES.klasik) };
  if (key === 'lencana') {
    const c = rank.key === 'pemula' ? '#8a7884' : rank.color;
    t.accent = shade(c, -0.25);
    t.accent2 = c;
    t.chip = shade(c, -0.55);
  }
  return t;
}

function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const f = (v) => Math.max(0, Math.min(255, Math.round(amt < 0 ? v * (1 + amt) : v + (255 - v) * amt)));
  return `#${[f((n >> 16) & 255), f((n >> 8) & 255), f(n & 255)].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

function seeded(seed) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

function spacing(ctx, v) {
  if ('letterSpacing' in ctx) ctx.letterSpacing = v;
}

function fitFont(ctx, text, maxW, size, tpl) {
  let s = size;
  ctx.font = tpl(s);
  while (ctx.measureText(text).width > maxW && s > 10) { s -= 2; ctx.font = tpl(s); }
  return s;
}

function wrapLines(ctx, text, maxW) {
  const words = text.split(' ');
  const lines = [];
  let line = '';
  words.forEach((w) => {
    const t = line ? `${line} ${w}` : w;
    if (ctx.measureText(t).width > maxW && line) { lines.push(line); line = w; } else line = t;
  });
  if (line) lines.push(line);
  return lines;
}

const STAR = ['....#....', '...###...', '#########', '.#######.', '..#####..', '.###.###.', '.##...##.'];

function pixelBadge(ctx, cx, cy, cell, rank, t) {
  const main = rank.key === 'pemula' ? '#9c8a94' : rank.color;
  const dark = shade(main, -0.45);
  // reben
  const rib = [[t.seal, -1], [t.frame, 1]];
  rib.forEach(([c, dir]) => {
    ctx.fillStyle = c;
    for (let k = 0; k < 6; k++) ctx.fillRect(cx + dir * (cell * 2.2 + k * cell * 0.35) - cell * 0.9, cy + cell * 4 + k * cell, cell * 1.8, cell);
  });
  // cakera bersegi lapan piksel
  for (let j = -7; j <= 7; j++) for (let i = -7; i <= 7; i++) {
    const d = Math.abs(i) + Math.abs(j);
    const r = Math.hypot(i, j);
    if (r > 7.4 || d > 10) continue;
    ctx.fillStyle = r > 6.3 || d > 9 ? t.frame : r > 5.2 || d > 7.6 ? dark : main;
    ctx.fillRect(cx + i * cell - cell / 2, cy + j * cell - cell / 2, cell + 0.5, cell + 0.5);
  }
  // kilauan
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.fillRect(cx - 4 * cell, cy - 4 * cell, cell, cell * 2);
  ctx.fillRect(cx - 3 * cell, cy - 5 * cell, cell * 2, cell);
  // bintang
  ctx.fillStyle = '#ffffff';
  STAR.forEach((row, j) => [...row].forEach((ch, i) => {
    if (ch === '#') ctx.fillRect(cx + (i - 4) * cell * 0.62 - cell * 0.31, cy + (j - 3.4) * cell * 0.62, cell * 0.64, cell * 0.64);
  }));
  // percikan bintang piksel
  ctx.fillStyle = t.accent;
  [[-11, -5], [11, -4], [-9, 5], [10, 6], [0, -10]].forEach(([i, j]) => {
    ctx.fillRect(cx + i * cell, cy + j * cell, cell, cell);
    ctx.fillRect(cx + (i - 1) * cell, cy + j * cell + cell * 0.33, cell * 3, cell * 0.33);
    ctx.fillRect(cx + i * cell + cell * 0.33, cy + (j - 1) * cell, cell * 0.33, cell * 3);
  });
}

function cornerStairs(ctx, x, y, sx, sy, t) {
  const s = 20;
  const pat = [
    [0, 0, t.frame], [1, 0, t.frame], [2, 0, t.accent], [3, 0, t.frame], [4, 0, t.accent2],
    [0, 1, t.frame], [1, 1, t.accent], [3, 1, t.accent2],
    [0, 2, t.accent], [2, 2, t.frame],
    [0, 3, t.frame], [1, 3, t.accent2],
    [0, 4, t.accent2],
  ];
  pat.forEach(([i, j, c]) => {
    ctx.fillStyle = c;
    ctx.fillRect(x + sx * i * s - (sx < 0 ? s : 0) + 2, y + sy * j * s - (sy < 0 ? s : 0) + 2, s - 4, s - 4);
  });
}

function seal(ctx, cx, cy, r, color, rank) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(-0.2);
  ctx.globalAlpha = 0.86;
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 5;
  ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke();
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 5]);
  ctx.beginPath(); ctx.arc(0, 0, r - 30, 0, Math.PI * 2); ctx.stroke();
  ctx.setLineDash([]);
  const text = '• MISI PAKAR KPPB • PENGEMBARAAN 3E & 3R ';
  ctx.font = '700 14px Montserrat, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const step = (Math.PI * 2) / text.length;
  [...text].forEach((ch, i) => {
    ctx.save();
    ctx.rotate(i * step);
    ctx.translate(0, -(r - 15));
    ctx.fillText(ch, 0, 0);
    ctx.restore();
  });
  ctx.font = '800 14px Montserrat, sans-serif';
  spacing(ctx, '2px');
  ctx.fillText('DISAHKAN', 0, -9);
  spacing(ctx, '0px');
  const short = rank.name.replace(' KPPB', '');
  let fs = 14;
  ctx.font = `800 ${fs}px Montserrat, sans-serif`;
  while (ctx.measureText(short).width > r * 0.95 && fs > 9) { fs--; ctx.font = `800 ${fs}px Montserrat, sans-serif`; }
  ctx.fillText(short, 0, 14);
  ctx.restore();
}

/**
 * Lukis sijil pada kanvas.
 * data: { name, kelas, correct, score, rankIdx, date, certId }
 */
export function drawCertificate(canvas, data, themeKey = 'klasik') {
  const ctx = canvas.getContext('2d');
  const k = canvas.width / BW;
  const rank = RANKS[data.rankIdx] || RANKS[0];
  const t = themeFor(themeKey, rank);
  const name = (data.name || '').trim() || 'Nama Anda Di Sini';
  const kelas = (data.kelas || '').trim() || 'Kelas Anda';
  const cx = BW / 2;
  ctx.save();
  ctx.setTransform(k, 0, 0, k, 0, 0);
  ctx.textBaseline = 'alphabetic';

  // latar putih + corak petak halus
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, BW, BH);
  ctx.fillStyle = t.tint;
  for (let x = 64; x < BW - 64; x += 32) for (let y = 64; y < BH - 64; y += 32) if (((x + y) / 32) % 2 === 0) ctx.fillRect(x, y, 32, 32);
  ctx.fillStyle = 'rgba(255,255,255,0.72)';
  ctx.fillRect(64, 64, BW - 128, BH - 128);
  // konfeti piksel di tepi
  const rnd = seeded(7);
  const conf = [t.accent, t.accent2, t.frame, t.seal];
  for (let i = 0; i < 70; i++) {
    const edge = rnd() < 0.5;
    const x = edge ? 80 + rnd() * (BW - 160) : (rnd() < 0.5 ? 80 + rnd() * 120 : BW - 200 + rnd() * 120);
    const y = edge ? (rnd() < 0.5 ? 80 + rnd() * 50 : BH - 130 + rnd() * 50) : 200 + rnd() * (BH - 400);
    ctx.globalAlpha = 0.18 + rnd() * 0.25;
    ctx.fillStyle = conf[i % conf.length];
    const s = 6 + Math.floor(rnd() * 3) * 4;
    ctx.fillRect(x, y, s, s);
  }
  ctx.globalAlpha = 1;

  // bingkai
  ctx.strokeStyle = t.frame;
  ctx.lineWidth = 20;
  ctx.strokeRect(34, 34, BW - 68, BH - 68);
  ctx.strokeStyle = t.accent;
  ctx.lineWidth = 5;
  ctx.strokeRect(54, 54, BW - 108, BH - 108);
  ctx.strokeStyle = t.frame;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(63, 63, BW - 126, BH - 126);
  cornerStairs(ctx, 68, 68, 1, 1, t);
  cornerStairs(ctx, BW - 68, 68, -1, 1, t);
  cornerStairs(ctx, 68, BH - 68, 1, -1, t);
  cornerStairs(ctx, BW - 68, BH - 68, -1, -1, t);

  // cip atas
  const chip = (x, y, text, bg, fg, align = 'left') => {
    ctx.font = '700 15px Montserrat, sans-serif';
    spacing(ctx, '1.5px');
    const w = ctx.measureText(text).width + 28;
    const x0 = align === 'right' ? x - w : x;
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.fillRect(x0 + 5, y + 5, w, 36);
    ctx.fillStyle = bg;
    ctx.fillRect(x0, y, w, 36);
    ctx.fillStyle = fg;
    ctx.textAlign = 'left';
    ctx.fillText(text, x0 + 14, y + 24);
    spacing(ctx, '0px');
  };
  chip(190, 86, 'TOPIK 2 · MODEL PENGINTEGRASIAN TEKNOLOGI', t.chip, '#ffffff');
  chip(BW - 190, 86, `NO. ${data.certId || 'KPPB-XXXX'}`, t.accent, '#2a1220', 'right');

  pixelBadge(ctx, cx, 150, 8.5, rank, t);

  // tajuk
  ctx.textAlign = 'center';
  ctx.fillStyle = t.frame;
  spacing(ctx, '3px');
  fitFont(ctx, 'SIJIL PENGIKTIRAFAN PENCAPAIAN', 1320, 62, (s) => `700 ${s}px Cinzel, "Times New Roman", serif`);
  ctx.fillText('SIJIL PENGIKTIRAFAN PENCAPAIAN', cx, 284);
  spacing(ctx, '0px');
  // pembahagi piksel
  ctx.fillStyle = t.accent;
  ctx.fillRect(cx - 330, 300, 660, 5);
  [[-342, 1], [330, 1]].forEach(([dx]) => { ctx.fillRect(cx + dx, 294, 12, 12); });
  ctx.fillStyle = t.accent2;
  ctx.fillRect(cx - 8, 294, 16, 16);

  ctx.fillStyle = '#3a3a48';
  ctx.font = 'italic 27px "Playfair Display", Georgia, serif';
  ctx.fillText('Dengan sukacitanya sijil ini dianugerahkan kepada:', cx, 346);

  // nama (skrip)
  ctx.fillStyle = t.frame;
  fitFont(ctx, name, 1150, 92, (s) => `${s}px "Great Vibes", cursive`);
  ctx.fillText(name, cx, 438);
  ctx.fillStyle = t.accent;
  ctx.fillRect(cx - 420, 458, 840, 3);
  ctx.fillRect(cx - 432, 453, 12, 12);
  ctx.fillRect(cx + 420, 453, 12, 12);

  ctx.fillStyle = '#3a3a48';
  ctx.font = 'italic 23px "Playfair Display", Georgia, serif';
  ctx.fillText('Daripada kelas:', cx, 497);
  ctx.fillStyle = t.frame;
  fitFont(ctx, kelas, 1000, 30, (s) => `700 ${s}px Montserrat, sans-serif`);
  ctx.fillText(kelas, cx, 534);

  ctx.fillStyle = '#3a3a48';
  ctx.font = 'italic 23px "Playfair Display", Georgia, serif';
  ctx.fillText('Sebagai pengiktirafan atas pencapaian dalam permainan pembelajaran interaktif:', cx, 574);

  // cip tajuk permainan
  ctx.font = '700 25px Cinzel, "Times New Roman", serif';
  spacing(ctx, '2px');
  const gt = 'MISI PAKAR KPPB: PENGEMBARAAN 3E & 3R';
  const gw = ctx.measureText(gt).width + 56;
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.fillRect(cx - gw / 2 + 6, 596, gw, 48);
  ctx.fillStyle = t.chip;
  ctx.fillRect(cx - gw / 2, 590, gw, 48);
  ctx.fillStyle = t.accent2;
  ctx.fillRect(cx - gw / 2, 632, gw, 6);
  ctx.fillStyle = '#ffffff';
  ctx.fillText(gt, cx, 623);
  spacing(ctx, '0px');

  // kenyataan
  ctx.fillStyle = '#33333f';
  ctx.font = '500 19px Montserrat, sans-serif';
  const sl = wrapLines(ctx, CERT_STATEMENT, 1300);
  const lh = sl.length > 3 ? 23 : 26;
  sl.forEach((l, i) => ctx.fillText(l, cx, 672 + i * lh));

  // jubin pencapaian
  const tiles = [
    ['MARKAH', `${data.score}/100`],
    ['JAWAPAN BETUL', `${data.correct}/10`],
    ['PANGKAT', rank.name],
    ['LENCANA', rank.badge || 'Tiada'],
    ['TARIKH', data.date],
  ];
  const tw = 238;
  const gap = 14;
  const tx0 = cx - (tiles.length * tw + (tiles.length - 1) * gap) / 2;
  tiles.forEach(([lab, val], i) => {
    const x = tx0 + i * (tw + gap);
    const y = 758;
    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    ctx.fillRect(x + 6, y + 6, tw, 80);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x, y, tw, 80);
    ctx.fillStyle = i === 2 || i === 3 ? (rank.key === 'pemula' ? '#efe9ec' : shade(rank.color, 0.72)) : t.tint;
    ctx.fillRect(x, y + 28, tw, 52);
    ctx.strokeStyle = t.accent;
    ctx.lineWidth = 3;
    ctx.strokeRect(x, y, tw, 80);
    ctx.fillStyle = t.frame;
    ctx.fillRect(x, y, tw, 28);
    ctx.fillStyle = '#ffffff';
    ctx.font = '800 13px Montserrat, sans-serif';
    spacing(ctx, '2px');
    ctx.fillText(lab, x + tw / 2, y + 19);
    spacing(ctx, '0px');
    ctx.fillStyle = t.frame;
    fitFont(ctx, val, tw - 20, 26, (s) => `800 ${s}px Montserrat, sans-serif`);
    ctx.fillText(val, x + tw / 2, y + 65);
  });

  // bar XP penguasaan
  const bx = cx - 400;
  const by = 866;
  ctx.textAlign = 'left';
  ctx.fillStyle = t.frame;
  ctx.font = '800 15px Montserrat, sans-serif';
  spacing(ctx, '2px');
  ctx.fillText('PENGUASAAN', bx - 172, by + 20);
  spacing(ctx, '0px');
  for (let i = 0; i < 10; i++) {
    const on = i < data.correct;
    ctx.fillStyle = on ? (i % 2 ? t.accent : t.accent2) : '#e6e1dc';
    ctx.fillRect(bx + i * 80, by, 74, 28);
    ctx.fillStyle = on ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.05)';
    ctx.fillRect(bx + i * 80, by, 74, 6);
  }
  ctx.fillStyle = t.frame;
  ctx.font = '800 18px Montserrat, sans-serif';
  ctx.fillText(`${data.score}%`, bx + 812, by + 21);
  ctx.textAlign = 'center';

  // penghargaan
  ctx.fillStyle = '#3a3a48';
  ctx.font = 'italic 21px "Playfair Display", Georgia, serif';
  const apr = 'Semoga pengetahuan dan kemahiran yang diperoleh dapat diaplikasikan dalam merancang pengalaman pengajaran dan pembelajaran yang bermakna, relevan dan berpusatkan murid.';
  wrapLines(ctx, apr, 1180).forEach((l, i) => ctx.fillText(l, cx, 940 + i * 26));

  // tandatangan & tarikh
  ctx.strokeStyle = t.frame;
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(250, 1066); ctx.lineTo(590, 1066); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(BW - 590, 1066); ctx.lineTo(BW - 250, 1066); ctx.stroke();
  ctx.fillStyle = t.frame;
  ctx.font = '700 19px Montserrat, sans-serif';
  ctx.fillText('Tandatangan Penganjur', 420, 1094);
  ctx.fillText('Tarikh', BW - 420, 1094);
  ctx.fillStyle = '#4a4a58';
  ctx.font = '500 16px Montserrat, sans-serif';
  ctx.fillText(CERT_ORGANIZER, 420, 1118);
  ctx.fillStyle = t.frame;
  ctx.font = '700 22px Montserrat, sans-serif';
  ctx.fillText(data.date, BW - 420, 1054);

  seal(ctx, cx, 1058, 84, t.seal, rank);
  ctx.restore();
}

/** Pastikan fon web dimuatkan sebelum melukis. */
export async function loadCertFonts() {
  const fonts = ['92px "Great Vibes"', '700 40px Cinzel', 'italic 24px "Playfair Display"', '800 40px Montserrat', '700 20px Montserrat', '500 20px Montserrat'];
  try {
    await Promise.race([Promise.all(fonts.map((f) => document.fonts.load(f, 'AaBb'))), new Promise((r) => setTimeout(r, 3000))]);
  } catch { /* guna fon sandaran */ }
}

/**
 * Bina dokumen PDF A4 landskap daripada lukisan kanvas resolusi tinggi,
 * berserta lapisan teks tersembunyi supaya kandungan boleh dicari/disalin.
 */
export async function buildCertificate(data, themeKey = 'klasik') {
  await loadCertFonts();
  const canvas = document.createElement('canvas');
  canvas.width = 2480;
  canvas.height = Math.round((2480 * BH) / BW);
  drawCertificate(canvas, data, themeKey);
  const img = canvas.toDataURL('image/jpeg', 0.92);
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4', compress: true });
  doc.setProperties({ title: `Sijil Pencapaian - ${data.name}`, subject: 'MISI PAKAR KPPB: PENGEMBARAAN 3E & 3R', creator: 'Misi Pakar KPPB' });
  doc.addImage(img, 'JPEG', 0, 0, 297, 210, undefined, 'FAST');
  // lapisan teks tidak kelihatan (boleh dicari & disalin)
  const rank = RANKS[data.rankIdx] || RANKS[0];
  const mm = (u) => (u * 297) / BW;
  doc.setFont('helvetica', 'normal');
  const inv = (text, x, y, size) => { doc.setFontSize(size); doc.text(text, mm(x), mm(y), { align: 'center', renderingMode: 'invisible' }); };
  inv('SIJIL PENGIKTIRAFAN PENCAPAIAN', BW / 2, 282, 24);
  inv(data.name, BW / 2, 438, 30);
  inv(data.kelas, BW / 2, 534, 12);
  inv('MISI PAKAR KPPB: PENGEMBARAAN 3E & 3R', BW / 2, 624, 9);
  inv(`Markah: ${data.score}/100  Jawapan betul: ${data.correct}/10  Pangkat: ${rank.name}  Lencana: ${rank.badge || 'Tiada'}  Tarikh: ${data.date}`, BW / 2, 800, 8);
  inv(`No. Sijil: ${data.certId}`, BW / 2, 1150, 6);
  return doc;
}

/** Nota Topik 2 dalam format PDF A4 (teks, boleh dicetak). */
export function buildNotesPdf(notes) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
  const W = 210;
  const M = 18;
  const maxW = W - M * 2;
  let y = 0;
  const header = (first) => {
    doc.setFillColor(61, 24, 40);
    doc.rect(0, 0, W, first ? 34 : 14, 'F');
    doc.setFillColor(233, 185, 73);
    doc.rect(0, first ? 34 : 14, W, 2, 'F');
    doc.setTextColor(255, 255, 255);
    if (first) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(233, 185, 73);
      doc.text('MISI PAKAR KPPB · NOTA', M, 12);
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(17);
      doc.text('Topik 2: Model Pengintegrasian Teknologi dalam PdP', M, 23);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9.5);
      doc.text('Konsep & peranan · TPACK · SAMR · TIM · Model 3E · Kerangka 3R · Taksonomi Digital Bloom', M, 30);
      y = 46;
    } else {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text('Nota Topik 2: Model Pengintegrasian Teknologi dalam PdP', M, 9);
      y = 26;
    }
  };
  const ensure = (h) => { if (y + h > 282) { doc.addPage(); header(false); } };
  header(true);
  notes.forEach((n) => {
    ensure(20);
    doc.setFillColor(245, 236, 240);
    doc.rect(M - 3, y - 6, maxW + 6, 9.5, 'F');
    doc.setFillColor(184, 50, 95);
    doc.rect(M - 3, y - 6, 2, 9.5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12.5);
    doc.setTextColor(61, 24, 40);
    doc.text(n.title, M + 1, y);
    y += 9;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10.5);
    doc.setTextColor(40, 40, 52);
    doc.splitTextToSize(n.intro, maxW).forEach((l) => { ensure(6); doc.text(l, M, y); y += 5.2; });
    y += 1.5;
    n.points.forEach(([k, v]) => {
      const lines = doc.splitTextToSize(`${k}: ${v}`, maxW - 6);
      ensure(lines.length * 5.2 + 1);
      doc.setFillColor(184, 50, 95);
      doc.rect(M + 0.5, y - 2.6, 2, 2, 'F');
      lines.forEach((l, j) => {
        if (j === 0) {
          const kw = `${k}:`;
          doc.setFont('helvetica', 'bold');
          doc.text(kw, M + 5, y);
          const w = doc.getTextWidth(kw) + 1.6;
          doc.setFont('helvetica', 'normal');
          doc.text(l.slice(kw.length + 1), M + 5 + w, y);
        } else {
          doc.text(l, M + 5, y);
        }
        y += 5.2;
      });
      y += 0.8;
    });
    if (n.models) {
      doc.setFont('helvetica', 'italic');
      doc.splitTextToSize(n.models, maxW).forEach((l) => { ensure(6); doc.text(l, M, y); y += 5.2; });
    }
    y += 6;
  });
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(140, 140, 150);
    doc.text(`Halaman ${i}/${pages}`, W - M, 292, { align: 'right' });
  }
  return doc;
}
