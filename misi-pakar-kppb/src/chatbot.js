// KPPBot: pembantu sembang dalam permainan (berjalan sepenuhnya dalam pelayar).
// Menjawab soalan tentang cara bermain dan kandungan Topik 2, memberi petunjuk tanpa
// mendedahkan jawapan kuiz.
import { NOTES } from './learning.js';
import { QUESTIONS } from './quiz.js';
import { RANKS, rankIndexFor } from './ranking.js';

const note = (id) => NOTES.find((n) => n.id === id);
const point = (id, startsWith) => note(id).points.find(([k]) => k.toLowerCase().startsWith(startsWith.toLowerCase()));
const fmtPoint = (p) => (p ? `<b>${p[0]}</b>: ${p[1]}` : '');
const list = (id) => `<ul>${note(id).points.map(([k, v]) => `<li><b>${k}</b>: ${v}</li>`).join('')}</ul>`;

const TAG_TO_NOTE = { 'KONSEP & PERANAN': 'konsep', TPACK: 'tpack', 'MODEL SAMR': 'samr', TIM: 'tim', 'MODEL 3E': '3e', 'MODEL 3R': '3r', 'BLOOM DIGITAL': 'bloom' };

// ---------------------------------------------------------------------------
// Pangkalan pengetahuan: setiap entri mempunyai kata kunci (frasa) dan jawapan.
// ---------------------------------------------------------------------------
function buildKB(ctx) {
  const n3e = note('3e');
  const n3r = note('3r');
  return [
    // ---- sapaan & sosial
    { keys: ['hai', 'hello', 'helo', 'hi', 'assalamualaikum', 'salam', 'selamat pagi', 'selamat petang', 'hey'], weight: 0.6,
      answer: () => 'Hai! Saya <b>KPPBot</b> 🤖. Tanya saya tentang <b>cara bermain</b> atau <b>Topik 2</b> (TPACK, SAMR, TIM, 3E, 3R, Bloom Digital). Saya juga boleh beri <b>petunjuk</b> semasa anda menjawab soalan.',
      chips: ['Cara bermain', 'Apa itu TPACK?', 'Markah saya', 'Petunjuk'] },
    { keys: ['terima kasih', 'thanks', 'tq', 'thank you', 'terima ksh'], weight: 0.6, answer: () => 'Sama-sama! Semoga berjaya menjadi <b>PAKAR KPPB</b>! 🏆' },
    { keys: ['siapa kamu', 'siapa awak', 'kppbot', 'apa kamu', 'nama kamu'], answer: () => 'Saya <b>KPPBot</b>, pembantu Misi Pakar KPPB. Saya tahu kandungan Topik 2 dan cara bermain permainan ini.' },

    // ---- jawapan (dilarang)
    { keys: ['jawapan', 'bagi jawapan', 'kunci jawapan', 'jawapan soalan', 'apa jawapan', 'answer', 'jawapan betul'], weight: 1.4,
      answer: () => {
        const h = ctx().currentQ >= 0 ? `<br><br>${hintFor(ctx().currentQ)}` : '';
        return `Maaf, KPPBot <b>tidak boleh memberi jawapan</b> kuiz supaya misi adil untuk semua. 🙅 Tetapi saya boleh beri <b>petunjuk</b> dan menerangkan konsepnya.${h}`;
      }, chips: ['Petunjuk', 'Buka nota'] },
    { keys: ['petunjuk', 'hint', 'bantu soalan', 'tolong soalan', 'clue', 'tak tahu', 'tidak tahu', 'susah'], weight: 1.2,
      answer: () => (ctx().currentQ >= 0
        ? hintFor(ctx().currentQ)
        : 'Buka mana-mana portal soalan di Arena dahulu, kemudian tanya saya <b>"petunjuk"</b>. Saya akan terangkan konsep yang berkaitan tanpa memberi jawapan.'),
      chips: ['Buka nota'] },

    // ---- bantuan permainan
    { keys: ['cara bermain', 'cara main', 'macam mana main', 'bagaimana bermain', 'panduan', 'tutorial', 'mula main', 'apa perlu buat', 'langkah'],
      answer: () => '<b>Cara bermain:</b><ol><li>Tekan <b>BELAJAR / ULANG KAJI</b> dan baca kesemua 10 slaid, kemudian tekan <b>SELESAI BELAJAR</b>.</li><li>Tekan <b>BUAT MISI</b> untuk masuk Arena.</li><li>Teroka arena dan masuk 10 portal untuk menjawab soalan.</li><li>Kumpul mata, naik pangkat dan dapatkan <b>sijil PDF</b>.</li></ol>',
      chips: ['Kawalan', 'Markah & pangkat', 'Sijil'] },
    { keys: ['kawalan', 'gerak', 'bergerak', 'keyboard', 'papan kekunci', 'wasd', 'anak panah', 'butang arah', 'd-pad', 'dpad', 'lari', 'shift', 'jalan'],
      answer: () => '<b>Kawalan Arena:</b><ul><li><b>Komputer:</b> <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> atau anak panah untuk bergerak, <kbd>SHIFT</kbd> untuk berlari, <kbd>E</kbd> untuk masuk portal.</li><li><b>Telefon:</b> butang arah di kiri bawah dan butang <b>MASUK</b> di kanan bawah.</li><li>Anda juga boleh klik/sentuh portal; watak akan berjalan sendiri ke sana.</li><li>Roda tetikus / cubit untuk zum. Peta mini menunjukkan kedudukan anda.</li></ul>' },
    { keys: ['portal', 'masuk portal', 'buka soalan', 'cari portal', 'mana portal', 'peta mini', 'minimap'],
      answer: () => 'Terdapat <b>10 portal</b> bernombor 01–10 di sekeliling peta, setiap satu berlabel zon subtopik. Dekati portal sehingga petunjuk muncul, kemudian tekan <kbd>E</kbd> / <b>MASUK</b>. Warna portal: <b>merah jambu</b> = belum dijawab, <b>hijau</b> = betul, <b>merah</b> = salah, <b>oren</b> = diperbetulkan.' },
    { keys: ['cuba lagi', 'salah', 'jawab semula', 'ulang soalan', 'retry', 'reset soalan'],
      answer: () => 'Jika jawapan salah, tekan <b>CUBA LAGI</b> untuk menetapkan semula soalan dan jawab sekali lagi sehingga betul. <b>Markah rasmi</b> dikira daripada <b>cubaan pertama</b>, tetapi soalan yang diperbetulkan ditanda <b>oren</b> dan dikira dalam statistik.' },
    { keys: ['markah', 'mata', 'pemarkahan', 'skor', 'markah saya', 'berapa markah', 'score'],
      answer: () => {
        const c = ctx();
        const r = RANKS[rankIndexFor(c.result.correct)];
        return `Setiap jawapan betul (cubaan pertama) = <b>10 mata</b>, salah = 0. Maksimum <b>100</b>.<br><br>📊 Markah anda sekarang: <b>${c.result.score}/100</b> · Soalan dijawab: <b>${c.result.answered}/10</b> · Pangkat: <b>${r.name}</b>.`;
      } },
    { keys: ['pangkat', 'lencana', 'badge', 'rank', 'gangsa', 'perak', 'emas', 'platinum', 'berlian', 'naik pangkat'],
      answer: () => `<b>Pangkat mengikut jawapan betul:</b><ul>${RANKS.map((r) => `<li>${r.min === r.max ? r.min : `${r.min}–${r.max}`} betul: <b>${r.name}</b> (${r.badge || 'tiada lencana'})</li>`).join('')}</ul>` },
    { keys: ['sijil', 'certificate', 'pdf sijil', 'muat turun sijil', 'download sijil', 'jana sijil', 'nama kelas'],
      answer: () => 'Selepas menjawab kesemua 10 soalan, tekan <b>DAPATKAN SIJIL</b> di skrin keputusan. Taip <b>nama penuh</b> dan <b>kelas</b> anda sendiri, pilih tema, kemudian tekan <b>MUAT TURUN SIJIL (PDF)</b>. Sijil terus dimuat turun ke peranti anda.' },
    { keys: ['nota', 'buka nota', 'notes', 'muat turun nota', 'rujukan'],
      answer: () => 'Tekan butang <b>NOTA</b> di bar atas untuk membaca nota lengkap Topik 2. Anda juga boleh memuat turunnya sebagai PDF.', action: 'nota' },
    { keys: ['reset', 'mula semula', 'mula dari awal', 'padam', 'restart'],
      answer: () => 'Di <b>Halaman Utama</b>, tekan <b>RESET SEMUA (MULA DARI AWAL)</b> dan sahkan. Semua kemajuan, jawapan, markah dan maklumat sijil akan dipadam. Untuk ulang kuiz sahaja, gunakan <b>ULANGI PERMAINAN</b> di skrin keputusan.' },
    { keys: ['muzik', 'bunyi', 'senyap', 'sound', 'music', 'mute'],
      answer: () => 'Gunakan butang 🎵 (muzik) dan 🔊 (kesan bunyi) di kanan atas untuk menghidupkan atau mematikannya.' },
    { keys: ['slaid', 'belajar', 'selesai belajar', 'buat misi', 'terkunci', 'kunci misi', 'tak boleh masuk misi', 'misi dikunci'],
      answer: () => {
        const c = ctx();
        return `Misi dibuka selepas anda membaca <b>kesemua 10 slaid</b> dan menekan <b>SELESAI BELAJAR</b> pada slaid terakhir. Kemajuan anda: <b>${c.visited}/10 slaid</b>${c.learnDone ? ' ✅ (misi sudah dibuka)' : ''}.`;
      } },
    { keys: ['pautan', 'link', 'url', 'kongsi'], answer: () => 'Pautan permainan: <b>misi-pakar-kppb.netlify.app</b>. Kongsikan dengan rakan sekelas!' },

    // ---- Topik 2: konsep
    { keys: ['model pengintegrasian', 'konsep', 'definisi', 'pengintegrasian teknologi', 'topik 2'], weight: 0.7,
      answer: () => `${note('konsep').intro}<br><br>${note('konsep').models}`, chips: ['Peranan model', 'Apa itu TPACK?', 'Apa itu SAMR?'] },
    { keys: ['peranan', 'kepentingan model', 'fungsi model', 'kenapa perlu model', 'tujuan model'],
      answer: () => `<b>Peranan model pengintegrasian teknologi:</b>${list('konsep')}` },

    // ---- TPACK
    { keys: ['tpack', 'kerangka tpack', 'mishra', 'koehler'], answer: () => `${note('tpack').intro}${list('tpack')}`, chips: ['Apa itu TPK?', 'Apa itu TCK?', 'Apa itu PCK?'] },
    { keys: ['tk', 'technological knowledge', 'pengetahuan teknologi'], weight: 1.1, answer: () => fmtPoint(point('tpack', 'TK')) },
    { keys: ['pk', 'pedagogical knowledge', 'pengetahuan pedagogi'], weight: 1.1, answer: () => fmtPoint(point('tpack', 'PK')) },
    { keys: ['ck', 'content knowledge', 'pengetahuan kandungan'], weight: 1.1, answer: () => fmtPoint(point('tpack', 'CK')) },
    { keys: ['pck', 'pedagogical content'], weight: 1.3, answer: () => fmtPoint(point('tpack', 'PCK')) },
    { keys: ['tck', 'technological content'], weight: 1.3, answer: () => fmtPoint(point('tpack', 'TCK')) },
    { keys: ['tpk', 'technological pedagogical knowledge'], weight: 1.3, answer: () => fmtPoint(point('tpack', 'TPK')) },

    // ---- SAMR
    { keys: ['samr', 'model samr', 'puentedura'], answer: () => `${note('samr').intro}${list('samr')}`, chips: ['Substitution', 'Redefinition', 'Beza SAMR dan TIM'] },
    { keys: ['substitution', 'penggantian'], weight: 1.2, answer: () => fmtPoint(point('samr', 'S:')) },
    { keys: ['augmentation', 'penambahan'], weight: 1.2, answer: () => fmtPoint(point('samr', 'A:')) },
    { keys: ['modification', 'pengubahsuaian'], weight: 1.2, answer: () => fmtPoint(point('samr', 'M:')) },
    { keys: ['redefinition', 'pendefinisian semula'], weight: 1.2, answer: () => fmtPoint(point('samr', 'R:')) },
    { keys: ['peningkatan samr', 'transformasi samr', 'enhancement samr', 'enhancement dan transformation'],
      answer: () => 'Dalam SAMR, <b>Substitution</b> dan <b>Augmentation</b> berada pada tahap <b>peningkatan (enhancement)</b>, manakala <b>Modification</b> dan <b>Redefinition</b> berada pada tahap <b>transformasi (transformation)</b>.' },

    // ---- TIM
    { keys: ['tim', 'technology integration matrix', 'matriks', 'florida'], answer: () => `${note('tim').intro}${list('tim')}` },
    { keys: ['kemasukan', 'entry'], weight: 1.2, answer: () => fmtPoint(point('tim', 'Tahap 1')) },
    { keys: ['penerimaan', 'adoption'], weight: 1.2, answer: () => fmtPoint(point('tim', 'Tahap 2')) },
    { keys: ['adaptasi', 'adaptation'], weight: 1.2, answer: () => fmtPoint(point('tim', 'Tahap 3')) },
    { keys: ['infusi', 'infusion'], weight: 1.2, answer: () => fmtPoint(point('tim', 'Tahap 4')) },
    { keys: ['transformasi tim', 'tahap transformasi', 'transformation tim'], weight: 1.2, answer: () => fmtPoint(point('tim', 'Tahap 5')) },
    { keys: ['ciri tim', 'lima ciri', 'aktif kolaboratif', 'konstruktif', 'autentik', 'berorientasikan matlamat'], answer: () => fmtPoint(point('tim', 'Lima ciri')) },
    { keys: ['beza samr dan tim', 'perbezaan samr tim', 'samr vs tim', 'beza samr tim'],
      answer: () => '<b>SAMR</b> melihat sejauh mana teknologi <b>mengubah tugasan</b> (4 tahap: S, A, M, R). <b>TIM</b> menilai <b>tahap integrasi</b> teknologi (Kemasukan hingga Transformasi) merentas <b>5 ciri persekitaran pembelajaran</b>, membentuk matriks 25 sel.' },

    // ---- 3E
    { keys: ['3e', 'model 3e', 'triple e', 'liz kolb'], answer: () => `${n3e.intro}${list('3e')}` },
    { keys: ['engagement', 'penglibatan', 'time on task', 'co use', 'learning goals'], weight: 1.1, answer: () => fmtPoint(n3e.points[0]) },
    { keys: ['enhancement', 'pengayaan', 'add value', 'scaffold', 'differentiation', 'personalization', 'pemperibadian', 'pembelajaran terbeza'], weight: 1.0, answer: () => fmtPoint(n3e.points[1]) },
    { keys: ['extension', 'pelanjutan', 'authentic', 'pengalaman autentik', '24/7', 'soft skills', 'kemahiran insaniah'], weight: 1.1, answer: () => fmtPoint(n3e.points[2]) },

    // ---- 3R
    { keys: ['3r', 'kerangka 3r', 'model 3r'], answer: () => `${n3r.intro}${list('3r')}` },
    { keys: ['rigor', 'ketelitian', 'pemikiran mencabar'], weight: 1.2, answer: () => fmtPoint(n3r.points[0]) },
    { keys: ['relevance', 'kesepadanan', 'dunia sebenar'], weight: 1.2, answer: () => fmtPoint(n3r.points[1]) },
    { keys: ['relationship', 'hubungan'], weight: 1.2, answer: () => fmtPoint(n3r.points[2]) },
    { keys: ['beza rigor dan relevance', 'rigor vs relevance', 'beza rigor relevance'],
      answer: () => '<b>Rigor</b> berkaitan <b>tahap pemikiran</b> (pengetahuan → penilaian). <b>Relevance</b> berkaitan <b>aplikasi ilmu dalam situasi dunia sebenar</b>.' },

    // ---- Bloom digital
    { keys: ['bloom', 'taksonomi', 'digital bloom', 'andrew churches', 'lots', 'hots'], answer: () => `${note('bloom').intro}${list('bloom')}` },
    { keys: ['mengingat', 'remembering', 'bookmarking', 'googling'], weight: 1.2, answer: () => fmtPoint(point('bloom', '1.')) },
    { keys: ['memahami', 'understanding', 'tagging'], weight: 1.2, answer: () => fmtPoint(point('bloom', '2.')) },
    { keys: ['mengaplikasi', 'applying', 'aplikasi bloom'], weight: 1.2, answer: () => fmtPoint(point('bloom', '3.')) },
    { keys: ['menganalisis', 'analysing', 'analyzing', 'mashup', 'peta minda'], weight: 1.2, answer: () => fmtPoint(point('bloom', '4.')) },
    { keys: ['menilai', 'evaluating', 'moderasi', 'ulasan kritis'], weight: 1.2, answer: () => fmtPoint(point('bloom', '5.')) },
    { keys: ['mencipta', 'creating', 'podcast', 'video', 'wiki', 'animasi'], weight: 1.2, answer: () => fmtPoint(point('bloom', '6.')) },

    { keys: ['rumusan', 'ringkasan', 'summary', 'semua model'], answer: () => `<b>Rumusan Topik 2:</b>${list('rumusan')}` },
  ];
}

function hintFor(qi) {
  const q = QUESTIONS[qi];
  const n = note(TAG_TO_NOTE[q.tag]);
  return `💡 <b>Petunjuk Portal ${String(qi + 1).padStart(2, '0')} (${q.tag}):</b> ${n.intro}<br><br>Baca setiap pilihan dengan teliti dan bandingkan dengan konsep ini. Anda juga boleh tekan <b>NOTA</b> untuk bahagian <b>${n.title.replace(/^\d+\. /, '')}</b>.`;
}

// ---------------------------------------------------------------------------
// Padanan
// ---------------------------------------------------------------------------
export function normalize(s) {
  return ` ${String(s).toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9/ ]+/g, ' ').replace(/\s+/g, ' ').trim()} `;
}

export function matchIntent(kb, text) {
  const t = normalize(text);
  let best = null;
  let bestScore = 0;
  kb.forEach((e) => {
    let score = 0;
    e.keys.forEach((k) => {
      const nk = normalize(k);
      if (t.includes(nk)) score += (nk.trim().split(' ').length * 1.5 + nk.length / 10);
    });
    score *= e.weight || 1;
    if (score > bestScore) { bestScore = score; best = e; }
  });
  return bestScore > 0 ? best : null;
}

// ---------------------------------------------------------------------------
// Antara muka
// ---------------------------------------------------------------------------
const BOT_SVG = `<svg viewBox="0 0 16 16" shape-rendering="crispEdges" aria-hidden="true"><rect x="7" y="0" width="2" height="2" fill="#e9b949"/><rect x="2" y="2" width="12" height="9" fill="#f1e7da"/><rect x="2" y="10" width="12" height="1" fill="#dcc9b2"/><rect x="4" y="4" width="3" height="3" fill="#3d1828"/><rect x="9" y="4" width="3" height="3" fill="#3d1828"/><rect x="5" y="5" width="1" height="1" fill="#8af3ff"/><rect x="10" y="5" width="1" height="1" fill="#8af3ff"/><rect x="6" y="8" width="4" height="1" fill="#b8325f"/><rect x="0" y="5" width="2" height="4" fill="#b8325f"/><rect x="14" y="5" width="2" height="4" fill="#b8325f"/><rect x="4" y="12" width="8" height="4" fill="#b8325f"/><rect x="6" y="13" width="4" height="2" fill="#e9b949"/></svg>`;

export function initChatbot({ getContext, openNota, sfx = () => {} }) {
  const kb = buildKB(getContext);
  const root = document.createElement('div');
  root.id = 'kppbot';
  root.innerHTML = `
    <button class="bot-fab" id="botFab" aria-label="Buka KPPBot" title="KPPBot: perlukan bantuan?">${BOT_SVG}<span class="bot-fab-label">KPPBot</span><span class="bot-ping" id="botPing"></span></button>
    <section class="bot-panel hidden" id="botPanel" role="dialog" aria-label="KPPBot">
      <header class="bot-head"><span class="bot-ava">${BOT_SVG}</span><div><b>KPPBot</b><small>Pembantu Misi Pakar KPPB</small></div><button class="bot-x" id="botClose" aria-label="Tutup">✕</button></header>
      <div class="bot-msgs" id="botMsgs" aria-live="polite"></div>
      <div class="bot-chips" id="botChips"></div>
      <form class="bot-form" id="botForm" autocomplete="off"><input id="botInput" type="text" maxlength="160" placeholder="Taip soalan anda..." aria-label="Mesej kepada KPPBot" /><button type="submit" aria-label="Hantar">➤</button></form>
    </section>`;
  document.body.appendChild(root);
  const $ = (s) => root.querySelector(s);
  const msgs = $('#botMsgs');
  let greeted = false;

  const add = (who, html) => {
    const el = document.createElement('div');
    el.className = `bot-msg ${who}`;
    el.innerHTML = who === 'bot' ? `<span class="bot-ava sm">${BOT_SVG}</span><div class="bubble-t">${html}</div>` : `<div class="bubble-t">${html}</div>`;
    msgs.appendChild(el);
    msgs.scrollTop = msgs.scrollHeight;
    return el;
  };
  const setChips = (chips) => {
    const def = defaultChips();
    $('#botChips').innerHTML = (chips && chips.length ? chips : def).map((c) => `<button type="button">${c}</button>`).join('');
    root.querySelectorAll('#botChips button').forEach((b) => b.addEventListener('click', () => ask(b.textContent)));
  };
  const defaultChips = () => {
    const c = getContext();
    if (c.currentQ >= 0) return ['Petunjuk', 'Buka nota', 'Cuba lagi?'];
    if (c.screen === 'arena') return ['Kawalan', 'Portal', 'Markah saya'];
    if (c.screen === 'learn') return ['Apa itu TPACK?', 'Apa itu SAMR?', 'Bloom digital'];
    return ['Cara bermain', 'Apa itu TPACK?', 'Pangkat', 'Sijil'];
  };

  const reply = (text) => {
    const hit = matchIntent(kb, text);
    if (!hit) {
      return { html: 'Hmm, KPPBot belum faham soalan itu. 🤔 Cuba tanya dengan kata kunci seperti <b>TPACK</b>, <b>SAMR</b>, <b>TIM</b>, <b>3E</b>, <b>3R</b>, <b>Bloom</b>, <b>kawalan</b>, <b>markah</b> atau <b>sijil</b>.', chips: null };
    }
    if (hit.action === 'nota') setTimeout(() => openNota?.(), 600);
    return { html: hit.answer(), chips: hit.chips };
  };

  function ask(text) {
    const t = String(text || '').trim();
    if (!t) return;
    add('me', t.replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c])));
    sfx('select');
    const typing = add('bot', '<span class="dots"><i></i><i></i><i></i></span>');
    setTimeout(() => {
      const r = reply(t);
      typing.querySelector('.bubble-t').innerHTML = r.html;
      msgs.scrollTop = msgs.scrollHeight;
      setChips(r.chips);
      sfx('page');
    }, 450 + Math.min(600, t.length * 8));
  }

  const open = () => {
    $('#botPanel').classList.remove('hidden');
    $('#botFab').classList.add('active');
    $('#botPing').classList.add('hidden');
    if (!greeted) {
      greeted = true;
      const c = getContext();
      add('bot', c.currentQ >= 0
        ? `Hai! Saya <b>KPPBot</b> 🤖. Anda sedang di <b>Portal ${String(c.currentQ + 1).padStart(2, '0')}</b>. Mahu <b>petunjuk</b>?`
        : 'Hai! Saya <b>KPPBot</b> 🤖. Perlukan bantuan? Tanya tentang <b>cara bermain</b> atau <b>Topik 2</b>.');
    }
    setChips();
    if (window.matchMedia('(pointer: fine)').matches) setTimeout(() => $('#botInput').focus(), 60);
    sfx('click');
  };
  const close = () => {
    $('#botPanel').classList.add('hidden');
    $('#botFab').classList.remove('active');
    $('#botInput').blur();
  };
  $('#botFab').addEventListener('click', () => ($('#botPanel').classList.contains('hidden') ? open() : close()));
  $('#botClose').addEventListener('click', close);
  $('#botForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const v = $('#botInput').value;
    $('#botInput').value = '';
    ask(v);
  });
  // jangan biar kekunci dalam kotak sembang menggerakkan watak atau memilih jawapan
  ['keydown', 'keyup'].forEach((ev) => $('#botInput').addEventListener(ev, (e) => {
    e.stopPropagation();
    if (e.key === 'Escape') close();
  }));

  return { open, close, ask };
}

/** Untuk ujian: jawapan KPPBot (HTML) bagi sesuatu teks, atau null jika tidak difahami. */
export function respond(text, getContext) {
  const hit = matchIntent(buildKB(getContext), text);
  return hit ? hit.answer() : null;
}
