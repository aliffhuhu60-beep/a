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

export function localCertId(d = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `KPPB-${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${rand}`;
}

// ---------------------------------------------------------------------------
// PDF
// ---------------------------------------------------------------------------
let scriptFontB64 = null;

async function loadScriptFont() {
  if (scriptFontB64) return scriptFontB64;
  const res = await fetch(`${import.meta.env.BASE_URL}fonts/GreatVibes-Regular.ttf`);
  if (!res.ok) throw new Error('font');
  const buf = new Uint8Array(await res.arrayBuffer());
  let bin = '';
  for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode.apply(null, buf.subarray(i, i + 0x8000));
  scriptFontB64 = btoa(bin);
  return scriptFontB64;
}

const NAVY = [27, 42, 74];
const GOLD = [196, 154, 44];
const GOLD_L = [233, 200, 110];
const INK = [40, 40, 52];

function hexToRgb(h) {
  const n = parseInt(h.replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function polygon(doc, pts, style) {
  const [x0, y0] = pts[0];
  const segs = [];
  for (let i = 1; i < pts.length; i++) segs.push([pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]]);
  doc.lines(segs, x0, y0, [1, 1], style, true);
}

function cornerBlocks(doc, x, y, sx, sy) {
  // corak blok voxel bertangga di penjuru
  const s = 4.2;
  const pattern = [
    [0, 0, NAVY], [1, 0, NAVY], [2, 0, GOLD], [3, 0, NAVY], [5, 0, GOLD_L],
    [0, 1, NAVY], [1, 1, GOLD], [3, 1, GOLD_L],
    [0, 2, GOLD], [2, 2, NAVY],
    [0, 3, NAVY], [1, 3, GOLD_L],
    [0, 5, GOLD_L],
  ];
  pattern.forEach(([i, j, c]) => {
    doc.setFillColor(...c);
    doc.rect(x + sx * i * s - (sx < 0 ? s : 0), y + sy * j * s - (sy < 0 ? s : 0), s - 0.5, s - 0.5, 'F');
  });
}

function drawBadge(doc, cx, cy, rank) {
  const col = rank.key === 'pemula' ? [150, 130, 140] : hexToRgb(rank.color);
  const dark = col.map((v) => Math.round(v * 0.62));
  // reben
  doc.setFillColor(184, 50, 95);
  polygon(doc, [[cx - 7, cy + 2], [cx - 2, cy + 2], [cx - 5, cy + 15], [cx - 7.5, cy + 12], [cx - 10, cy + 14]], 'F');
  doc.setFillColor(74, 29, 110);
  polygon(doc, [[cx + 2, cy + 2], [cx + 7, cy + 2], [cx + 10, cy + 14], [cx + 7.5, cy + 12], [cx + 5, cy + 15]], 'F');
  // oktagon
  const oct = (r) => Array.from({ length: 8 }, (_, i) => {
    const a = Math.PI / 8 + (i * Math.PI) / 4;
    return [cx + Math.cos(a) * r, cy + Math.sin(a) * r];
  });
  doc.setFillColor(...NAVY);
  polygon(doc, oct(10.5), 'F');
  doc.setFillColor(...dark);
  polygon(doc, oct(9.2), 'F');
  doc.setFillColor(...col);
  polygon(doc, oct(7.6), 'F');
  // bintang
  const star = [];
  for (let i = 0; i < 10; i++) {
    const r = i % 2 ? 2.5 : 5.6;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    star.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
  }
  doc.setFillColor(255, 255, 255);
  polygon(doc, star, 'F');
}

/**
 * Bina dokumen sijil.
 * data: { name, kelas, correct, score, rankIdx, date, certId, recorded }
 */
export async function buildCertificate(data) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4', compress: true });
  const W = 297;
  const H = 210;
  const cx = W / 2;
  const rank = RANKS[data.rankIdx];

  let scriptOk = false;
  try {
    const b64 = await loadScriptFont();
    doc.addFileToVFS('GreatVibes-Regular.ttf', b64);
    doc.addFont('GreatVibes-Regular.ttf', 'GreatVibes', 'normal');
    scriptOk = true;
  } catch {
    scriptOk = false;
  }

  doc.setProperties({ title: `Sijil Pencapaian - ${data.name}`, subject: 'MISI PAKAR KPPB: PENGEMBARAAN 3E & 3R', creator: 'Misi Pakar KPPB' });

  // latar putih + bingkai navy & emas
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, W, H, 'F');
  doc.setDrawColor(...NAVY);
  doc.setLineWidth(3.2);
  doc.rect(7, 7, W - 14, H - 14);
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(1.1);
  doc.rect(11.5, 11.5, W - 23, H - 23);
  doc.setDrawColor(...NAVY);
  doc.setLineWidth(0.3);
  doc.rect(13.5, 13.5, W - 27, H - 27);

  cornerBlocks(doc, 15.5, 15.5, 1, 1);
  cornerBlocks(doc, W - 15.5, 15.5, -1, 1);
  cornerBlocks(doc, 15.5, H - 15.5, 1, -1);
  cornerBlocks(doc, W - 15.5, H - 15.5, -1, -1);

  drawBadge(doc, cx, 29, rank);

  // tajuk
  doc.setTextColor(...NAVY);
  doc.setFont('times', 'bold');
  doc.setFontSize(27);
  doc.text('SIJIL PENGIKTIRAFAN PENCAPAIAN', cx, 53, { align: 'center' });
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.8);
  doc.line(cx - 62, 57, cx + 62, 57);

  doc.setTextColor(...INK);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11.5);
  doc.text('Dengan sukacitanya sijil ini dianugerahkan kepada:', cx, 65, { align: 'center' });

  // nama (tulisan skrip)
  doc.setTextColor(...NAVY);
  const nameLatin = /^[\u0000-ÿ]*$/.test(data.name);
  if (scriptOk && nameLatin) {
    doc.setFont('GreatVibes', 'normal');
    let size = 40;
    doc.setFontSize(size);
    while (doc.getTextWidth(data.name) > 215 && size > 22) { size -= 2; doc.setFontSize(size); }
    doc.text(data.name, cx, 81, { align: 'center' });
  } else {
    doc.setFont('times', 'bolditalic');
    doc.setFontSize(26);
    doc.text(data.name, cx, 80, { align: 'center' });
  }
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.4);
  doc.line(cx - 80, 85, cx + 80, 85);

  doc.setTextColor(...INK);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.text('Daripada kelas:', cx, 92, { align: 'center' });
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(...NAVY);
  doc.text(data.kelas, cx, 98.5, { align: 'center' });

  doc.setTextColor(...INK);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.text('Sebagai pengiktirafan atas pencapaian dalam permainan pembelajaran interaktif:', cx, 106, { align: 'center' });
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13.5);
  doc.setTextColor(...NAVY);
  doc.text('MISI PAKAR KPPB: PENGEMBARAAN 3E & 3R', cx, 113, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.6);
  doc.setTextColor(...INK);
  const stmt = 'Telah menyelesaikan 10 soalan penilaian berkaitan Topik 2, Model Pengintegrasian Teknologi dalam Pengajaran dan Pembelajaran, dengan menunjukkan penguasaan terhadap Model 3E (Engagement, Enhancement dan Extension) serta Kerangka 3R (Rigor, Relevance dan Relationship).';
  doc.text(doc.splitTextToSize(stmt, 222), cx, 120, { align: 'center', lineHeightFactor: 1.35 });

  // maklumat pencapaian
  const cells = [
    ['MARKAH', `${data.score}/100`],
    ['JAWAPAN BETUL', `${data.correct}/10`],
    ['PANGKAT', rank.name],
    ['LENCANA', rank.badge ? rank.badge : 'Tiada'],
    ['TARIKH', data.date],
  ];
  const bw = 49;
  const gap = 2.5;
  const bx0 = cx - (cells.length * bw + (cells.length - 1) * gap) / 2;
  const by = 136;
  cells.forEach(([k, v], i) => {
    const x = bx0 + i * (bw + gap);
    doc.setFillColor(245, 241, 230);
    doc.setDrawColor(...GOLD);
    doc.setLineWidth(0.5);
    doc.rect(x, by, bw, 15, 'FD');
    doc.setFillColor(...NAVY);
    doc.rect(x, by, bw, 5, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.2);
    doc.text(k, x + bw / 2, by + 3.6, { align: 'center' });
    doc.setTextColor(...NAVY);
    doc.setFontSize(v.length > 14 ? 8.6 : 10.5);
    doc.text(v, x + bw / 2, by + 11.4, { align: 'center' });
  });

  doc.setFont('times', 'italic');
  doc.setFontSize(10.5);
  doc.setTextColor(...INK);
  const apr = 'Semoga pengetahuan dan kemahiran yang diperoleh dapat diaplikasikan dalam merancang pengalaman pengajaran dan pembelajaran yang bermakna, relevan dan berpusatkan murid.';
  doc.text(doc.splitTextToSize(apr, 210), cx, 159, { align: 'center', lineHeightFactor: 1.3 });

  // tandatangan
  doc.setDrawColor(...NAVY);
  doc.setLineWidth(0.4);
  doc.line(48, 182, 112, 182);
  doc.line(W - 112, 182, W - 48, 182);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...NAVY);
  doc.text('Tandatangan Penganjur', 80, 187, { align: 'center' });
  doc.text('Tarikh', W - 80, 187, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.2);
  doc.setTextColor(...INK);
  doc.text(CERT_ORGANIZER, 80, 191.5, { align: 'center' });
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text(data.date, W - 80, 179, { align: 'center' });

  // nombor sijil
  doc.setFont('courier', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(110, 110, 120);
  const foot = `No. Sijil: ${data.certId}${data.recorded ? '  |  Direkodkan dalam Google Sheet' : ''}`;
  doc.text(foot, cx, 194, { align: 'center' });

  return doc;
}
