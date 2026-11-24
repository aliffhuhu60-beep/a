// Pusat Pembelajaran Interaktif: 8 slaid wajib sebelum kuiz.

export const SLIDES = [
  {
    short: 'PENGENALAN',
    board: ['TOPIK 2', 'MODEL PENGINTEGRASIAN', 'TEKNOLOGI DALAM PdP'],
    html: () => `
      ${head('01', 'PENGENALAN TOPIK 2')}
      <h2 class="slide-title reveal">MODEL PENGINTEGRASIAN TEKNOLOGI DALAM PdP</h2>
      <p class="lead reveal">Model pengintegrasian teknologi membantu pendidik merancang penggunaan teknologi secara bermakna dalam proses pengajaran dan pembelajaran.</p>
      <div class="mini-label reveal">FOKUS PEMBELAJARAN</div>
      <div class="tile-grid">
        ${tile('layers', 'Model 3E', 'Engagement · Enhancement · Extension', 'c-pink')}
        ${tile('box', 'Kerangka 3R', 'Rigor · Relevance · Relationship', 'c-blue')}
        ${tile('users', 'Penglibatan murid', 'Murid aktif dalam pembelajaran', 'c-green')}
        ${tile('lightbulb', 'Teknologi bermakna', 'Teknologi digunakan dengan tujuan', 'c-gold')}
      </div>
      <p class="hint reveal"><i data-lucide="mouse-pointer-click"></i> Sentuh setiap kad untuk menyalakannya.</p>`,
  },
  {
    short: 'MODEL 3E',
    board: ['APA ITU', 'MODEL 3E?', 'E · E · E'],
    html: () => `
      ${head('02', 'APA ITU MODEL 3E?')}
      <p class="lead reveal">Model 3E terdiri daripada tiga elemen utama yang menerangkan peranan teknologi dalam meningkatkan pengalaman pembelajaran.</p>
      <div class="flip-row">
        ${flip('1', 'ENGAGEMENT', 'Penglibatan', 'Teknologi digunakan untuk meningkatkan penglibatan murid dalam aktiviti pembelajaran.', 'c-pink')}
        ${flip('2', 'ENHANCEMENT', 'Peningkatan / Pengayaan', 'Teknologi menambah nilai kepada proses pembelajaran dan membantu murid memahami kandungan dengan lebih mendalam.', 'c-blue')}
        ${flip('3', 'EXTENSION', 'Pelanjutan', 'Teknologi menghubungkan pembelajaran dengan pengalaman autentik dan situasi kehidupan sebenar.', 'c-green')}
      </div>
      <p class="hint reveal"><i data-lucide="rotate-3d"></i> Sentuh kad 3D untuk membalikkannya.</p>`,
  },
  {
    short: 'ENGAGEMENT',
    board: ['E1', 'ENGAGEMENT', 'PENGLIBATAN'],
    html: () => `
      ${head('03', 'ENGAGEMENT (PENGLIBATAN)')}
      <p class="lead reveal">Teknologi digunakan untuk meningkatkan penglibatan murid dalam aktiviti pembelajaran.</p>
      <div class="mini-label reveal">KOMPONEN</div>
      <div class="chip-col">
        ${comp('clock', 'Masa melaksanakan tugasan', 'Time-on-Task', 'c-pink')}
        ${comp('handshake', 'Bekerjasama', 'Co-Use', 'c-pink')}
        ${comp('target', 'Matlamat pembelajaran', 'Learning Goals', 'c-pink')}
      </div>
      ${examples(['Kuiz interaktif', 'Tayangan video', 'Aktiviti pembelajaran kolaboratif'])}`,
  },
  {
    short: 'ENHANCEMENT',
    board: ['E2', 'ENHANCEMENT', 'PENINGKATAN'],
    html: () => `
      ${head('04', 'ENHANCEMENT (PENINGKATAN/PENGAYAAN)')}
      <p class="lead reveal">Teknologi menambah nilai kepada proses pembelajaran dan membantu murid memahami kandungan dengan lebih mendalam.</p>
      <div class="mini-label reveal">KOMPONEN</div>
      <div class="chip-col">
        ${comp('plus', 'Menambah nilai', 'Add Value', 'c-blue')}
        ${comp('life-buoy', 'Bimbingan dan sokongan', 'Scaffolds / Supports', 'c-blue')}
        ${comp('split', 'Pembelajaran terbeza', 'Differentiation', 'c-blue')}
        ${comp('user-round', 'Pemperibadian', 'Personalization', 'c-blue')}
      </div>
      ${examples(['Simulasi interaktif', 'Nota digital', 'Lembaran kerja mengikut tahap penguasaan murid'])}`,
  },
  {
    short: 'EXTENSION',
    board: ['E3', 'EXTENSION', 'PELANJUTAN'],
    html: () => `
      ${head('05', 'EXTENSION (PELANJUTAN)')}
      <p class="lead reveal">Teknologi menghubungkan pembelajaran dengan pengalaman autentik dan situasi kehidupan sebenar.</p>
      <div class="mini-label reveal">KOMPONEN</div>
      <div class="chip-col">
        ${comp('globe', 'Pengalaman autentik', 'Authentic Experiences', 'c-green')}
        ${comp('wifi', 'Berhubung dengan pembelajaran 24/7', 'Connect to Learning 24/7', 'c-green')}
        ${comp('heart-handshake', 'Kemahiran insaniah', 'Soft Skills', 'c-green')}
      </div>
      ${examples(['Projek mini', 'Penyelidikan komuniti', 'Pembentangan isu sebenar'])}`,
  },
  {
    short: 'KERANGKA 3R',
    board: ['KERANGKA 3R', 'RIGOR · RELEVANCE', '& RELATIONSHIP'],
    html: () => `
      ${head('06', 'PENGENALAN KERANGKA 3R')}
      <h2 class="slide-title reveal">RIGOR, RELEVANCE &amp; RELATIONSHIP</h2>
      <p class="lead reveal">Kerangka 3R memberikan penekanan kepada tahap pemikiran, aplikasi pengetahuan dalam dunia sebenar dan hubungan yang menyokong pembelajaran bermakna.</p>
      <div class="r-row">
        ${rblock('1', 'RIGOR', 'Tahap pemikiran', 'c-pink')}
        ${rblock('2', 'RELEVANCE', 'Aplikasi dunia sebenar', 'c-blue')}
        ${rblock('3', 'RELATIONSHIP', 'Hubungan bermakna', 'c-green')}
      </div>
      <p class="hint reveal"><i data-lucide="mouse-pointer-click"></i> Sentuh blok R untuk menyusunnya.</p>`,
  },
  {
    short: 'RIGOR & RELEVANCE',
    board: ['R1 + R2', 'RIGOR &', 'RELEVANCE'],
    html: () => `
      ${head('07', 'RIGOR DAN RELEVANCE')}
      <div class="two-col">
        <section class="sub-panel reveal">
          <h3 class="sub-title c-pink-t">RIGOR <span>(KETELITIAN / PEMIKIRAN MENCABAR)</span></h3>
          <p>Rigor berkaitan dengan peningkatan tahap pemikiran murid daripada pengetahuan kepada penilaian.</p>
          <div class="mini-label">TAHAP (SENTUH UNTUK MENDAKI)</div>
          <div class="stairs" data-stairs>
            ${['Pengetahuan', 'Kefahaman', 'Aplikasi', 'Analisis', 'Sintesis', 'Penilaian'].map((t, i) => `<button class="stair" style="--i:${i}" data-step="${i}"><span class="stair-n">${i + 1}</span><span class="stair-t">${t}</span></button>`).join('')}
          </div>
          <p class="focus"><b>Fokus:</b> Mendorong murid berfikir secara mendalam, kritis dan kreatif.</p>
        </section>
        <section class="sub-panel reveal">
          <h3 class="sub-title c-blue-t">RELEVANCE <span>(KESEPADANAN DENGAN DUNIA SEBENAR)</span></h3>
          <p>Relevance berkaitan dengan aplikasi pengetahuan daripada disiplin ilmu kepada situasi dunia sebenar.</p>
          <div class="mini-label">FOKUS (SENTUH UNTUK BERGERAK)</div>
          <ol class="path" data-path>
            ${['Pengetahuan dalam disiplin.', 'Aplikasi dalam disiplin.', 'Aplikasi antara disiplin.', 'Aplikasi dalam situasi rutin dunia sebenar.', 'Aplikasi dalam situasi bukan rutin dunia sebenar.'].map((t, i) => `<li><button class="path-step" data-step="${i}"><span class="stair-n">${i + 1}</span>${t}</button></li>`).join('')}
          </ol>
        </section>
      </div>`,
  },
  {
    short: 'RELATIONSHIP',
    board: ['R3', 'RELATIONSHIP', 'HUBUNGAN'],
    html: () => `
      ${head('08', 'RELATIONSHIP (HUBUNGAN)')}
      <p class="lead reveal">Relationship merujuk kepada hubungan antara murid dengan ilmu, guru, rakan dan komuniti.</p>
      <div class="mini-label reveal">DUA ASPEK</div>
      <div class="tile-grid two">
        ${tile('book-open', 'Murid & Ilmu', 'Hubungan antara murid dengan ilmu atau disiplin.', 'c-green')}
        ${tile('users', 'Murid & Guru, Rakan, Komuniti', 'Hubungan sosial antara murid, guru, rakan dan komuniti.', 'c-green')}
      </div>
      <p class="focus reveal"><b>Kepentingan:</b> Membantu murid menghubungkan pembelajaran dengan diri sendiri dan dunia sekeliling.</p>
      <div class="summary reveal">
        <div class="mini-label">RUMUSAN</div>
        <div class="sum-row"><span class="sum-key c-gold">3E</span>
          <span class="chip c-pink">Penglibatan</span><i class="arrow" data-lucide="chevron-right"></i><span class="chip c-blue">Peningkatan</span><i class="arrow" data-lucide="chevron-right"></i><span class="chip c-green">Pelanjutan</span></div>
        <div class="sum-row"><span class="sum-key c-gold">3R</span>
          <span class="chip c-pink">Pemikiran mendalam</span><i class="arrow" data-lucide="chevron-right"></i><span class="chip c-blue">Aplikasi dunia sebenar</span><i class="arrow" data-lucide="chevron-right"></i><span class="chip c-green">Hubungan bermakna</span></div>
      </div>`,
  },
];

export const TOTAL_SLIDES = SLIDES.length;

// ---------- Pembantu templat ----------
function head(num, label) {
  return `<div class="sec-head reveal"><span class="sec-num">${num}</span><span class="sec-label">${label}</span></div>`;
}
function tile(icon, title, sub, cls) {
  return `<button class="tile ${cls} reveal" data-toggle><i data-lucide="${icon}"></i><b>${title}</b><small>${sub}</small></button>`;
}
function flip(n, en, ms, desc, cls) {
  return `<button class="flip ${cls} reveal" data-flip aria-label="${en}">
    <span class="flip-inner">
      <span class="flip-front"><span class="flip-e">E<sub>${n}</sub></span><b>${en}</b><small>${ms}</small></span>
      <span class="flip-back"><b>${en}</b><small>${desc}</small></span>
    </span></button>`;
}
function comp(icon, ms, en, cls) {
  return `<button class="comp ${cls} reveal" data-toggle><i data-lucide="${icon}"></i><span><b>${ms}</b><small>${en}</small></span></button>`;
}
function examples(list) {
  return `<div class="examples reveal"><span class="ex-label">CONTOH</span>${list.map((e) => `<span class="chip c-cream">${e}</span>`).join('')}</div>`;
}
function rblock(n, name, sub, cls) {
  return `<button class="rblock ${cls} reveal" data-toggle><span class="r-big">R<sub>${n}</sub></span><b>${name}</b><small>${sub}</small></button>`;
}

/** Pasang interaksi untuk slaid yang sedang dipaparkan. */
export function bindSlideInteractions(root, sfx) {
  root.querySelectorAll('[data-toggle]').forEach((el) => {
    el.addEventListener('click', () => { el.classList.toggle('on'); sfx('select'); });
  });
  root.querySelectorAll('[data-flip]').forEach((el) => {
    el.addEventListener('click', () => { el.classList.toggle('flipped'); sfx('page'); });
  });
  const stairs = root.querySelector('[data-stairs]');
  if (stairs) {
    stairs.querySelectorAll('.stair').forEach((b) => b.addEventListener('click', () => {
      const s = Number(b.dataset.step);
      stairs.querySelectorAll('.stair').forEach((o) => o.classList.toggle('on', Number(o.dataset.step) <= s));
      sfx('select');
    }));
  }
  const path = root.querySelector('[data-path]');
  if (path) {
    path.querySelectorAll('.path-step').forEach((b) => b.addEventListener('click', () => {
      const s = Number(b.dataset.step);
      path.querySelectorAll('.path-step').forEach((o) => o.classList.toggle('on', Number(o.dataset.step) <= s));
      sfx('select');
    }));
  }
}
