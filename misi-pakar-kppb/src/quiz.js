// Kandungan dan logik kuiz 10 soalan — Topik 2: Model Pengintegrasian Teknologi dalam PdP.

export const POINTS_PER_CORRECT = 10;
export const LETTERS = ['A', 'B', 'C', 'D'];

export const QUESTIONS = [
  {
    tag: 'KONSEP & PERANAN',
    q: 'Apakah peranan utama model pengintegrasian teknologi dalam pengajaran dan pembelajaran?',
    options: [
      'Menggantikan peranan guru sepenuhnya dengan teknologi.',
      'Menjadi panduan kepada guru untuk merancang, melaksana dan menilai penggunaan teknologi secara bermakna bagi mencapai objektif pembelajaran.',
      'Memastikan setiap aktiviti menggunakan peranti yang paling terkini.',
      'Mengurangkan masa guru membuat perancangan pengajaran.',
    ],
    answer: 1,
    explain: 'Model pengintegrasian teknologi ialah kerangka panduan. Ia membantu guru memilih dan menilai penggunaan teknologi supaya benar-benar menyokong objektif pembelajaran, bukan sekadar menggunakan teknologi.',
  },
  {
    tag: 'TPACK',
    q: 'Apakah tiga domain pengetahuan teras dalam kerangka TPACK?',
    options: [
      'Teknologi, Psikologi dan Kurikulum.',
      'Pedagogi, Penilaian dan Komunikasi.',
      'Teknologi, Pedagogi dan Kandungan.',
      'Kandungan, Kreativiti dan Kolaborasi.',
    ],
    answer: 2,
    explain: 'TPACK (Mishra & Koehler) menggabungkan Technological Knowledge (TK), Pedagogical Knowledge (PK) dan Content Knowledge (CK). Gabungan ketiga-tiganya di bahagian tengah ialah TPACK.',
  },
  {
    tag: 'TPACK',
    q: 'Pengetahuan guru tentang bagaimana teknologi boleh mengubah cara mengajar, contohnya menggunakan forum dalam talian untuk perbincangan kumpulan, dikenali sebagai:',
    options: [
      'Technological Content Knowledge (TCK).',
      'Pedagogical Content Knowledge (PCK).',
      'Content Knowledge (CK).',
      'Technological Pedagogical Knowledge (TPK).',
    ],
    answer: 3,
    explain: 'TPK ialah persilangan teknologi dan pedagogi: memahami bagaimana alat teknologi menyokong atau mengubah strategi pengajaran.',
  },
  {
    tag: 'MODEL SAMR',
    q: 'Murid menaip karangan menggunakan perisian pemproses kata dan bukannya menulis di atas kertas, tanpa sebarang perubahan pada fungsi tugasan. Tahap SAMR yang paling sesuai ialah:',
    options: ['Substitution (Penggantian).', 'Augmentation (Penambahan).', 'Modification (Pengubahsuaian).', 'Redefinition (Pendefinisian Semula).'],
    answer: 0,
    explain: 'Substitution: teknologi hanya menggantikan alat tradisional tanpa perubahan fungsi tugasan.',
  },
  {
    tag: 'MODEL SAMR',
    q: 'Murid menghasilkan video dokumentari secara kolaboratif dan berbincang dengan murid di negara lain melalui platform dalam talian. Tugasan ini tidak mungkin dilaksanakan tanpa teknologi. Tahap SAMR yang paling sesuai ialah:',
    options: ['Augmentation (Penambahan).', 'Redefinition (Pendefinisian Semula).', 'Substitution (Penggantian).', 'Modification (Pengubahsuaian).'],
    answer: 1,
    explain: 'Redefinition: teknologi membolehkan tugasan baharu yang sebelum ini tidak dapat dibayangkan. Ia berada pada tahap transformasi.',
  },
  {
    tag: 'TIM',
    q: 'Technology Integration Matrix (TIM) mempunyai lima tahap integrasi teknologi. Antara berikut, yang manakah urutan tahap yang betul?',
    options: [
      'Penggantian, Penambahan, Pengubahsuaian, Pendefinisian Semula, Penilaian.',
      'Mengingat, Memahami, Mengaplikasi, Menganalisis, Mencipta.',
      'Kemasukan (Entry), Penerimaan (Adoption), Adaptasi (Adaptation), Infusi (Infusion), Transformasi (Transformation).',
      'Penglibatan, Peningkatan, Pelanjutan, Ketelitian, Kesepadanan.',
    ],
    answer: 2,
    explain: 'TIM menggabungkan lima tahap integrasi (Kemasukan, Penerimaan, Adaptasi, Infusi, Transformasi) dengan lima ciri persekitaran pembelajaran (aktif, kolaboratif, konstruktif, autentik dan berorientasikan matlamat).',
  },
  {
    tag: 'MODEL 3E',
    q: 'Seorang guru menggunakan simulasi digital untuk membantu murid memahami konsep yang sukar. Apakah elemen 3E yang paling sesuai?',
    options: ['Engagement.', 'Enhancement.', 'Extension.', 'Relationship.'],
    answer: 1,
    explain: 'Enhancement menambah nilai pembelajaran melalui teknologi, bimbingan, sokongan dan pembelajaran terbeza.',
  },
  {
    tag: 'MODEL 3R',
    q: 'Seorang guru meminta murid menganalisis masalah pencemaran sungai, mencadangkan penyelesaian berdasarkan ilmu yang dipelajari dan membentangkan cadangan bersama komuniti. Gabungan elemen 3R yang paling sesuai ialah:',
    options: ['Rigor sahaja.', 'Relevance sahaja.', 'Relationship sahaja.', 'Rigor, Relevance dan Relationship.'],
    answer: 3,
    explain: 'Aktiviti melibatkan pemikiran mendalam (Rigor), aplikasi pengetahuan dalam isu sebenar (Relevance) dan hubungan dengan komuniti (Relationship).',
  },
  {
    tag: 'BLOOM DIGITAL',
    q: 'Murid menghasilkan podcast dan video animasi untuk menerangkan kitaran air. Aktiviti ini berada pada aras Taksonomi Digital Bloom yang mana?',
    options: ['Mengingat (Remembering).', 'Memahami (Understanding).', 'Mencipta (Creating).', 'Menganalisis (Analysing).'],
    answer: 2,
    explain: 'Mencipta ialah aras tertinggi. Murid menghasilkan produk digital baharu seperti podcast, video, animasi, blog atau wiki.',
  },
  {
    tag: 'BLOOM DIGITAL',
    q: 'Antara aktiviti berikut, yang manakah contoh aras Mengingat (Remembering) dalam Taksonomi Digital Bloom?',
    options: [
      'Menyimpan penanda buku (bookmarking) dan membuat carian asas di Internet.',
      'Menerbitkan blog dan menghasilkan video.',
      'Memberi ulasan kritis dan memoderasi forum.',
      'Membina peta minda dan menghubung kait maklumat (mashup).',
    ],
    answer: 0,
    explain: 'Aras Mengingat melibatkan aktiviti digital asas seperti bookmarking, carian Google, menyenaraikan dan menyerlahkan maklumat.',
  },
];

export const TOTAL_QUESTIONS = QUESTIONS.length;
export const ANSWER_KEY = QUESTIONS.map((q) => LETTERS[q.answer]).join('');

export function emptyAnswers() {
  return Array(TOTAL_QUESTIONS).fill(null);
}

export function emptyQuiz() {
  return { answers: emptyAnswers(), solved: Array(TOTAL_QUESTIONS).fill(false), attempts: Array(TOTAL_QUESTIONS).fill(0) };
}

export function isCorrect(qIndex, choice) {
  return choice !== null && choice !== undefined && QUESTIONS[qIndex].answer === choice;
}

/**
 * Kira keputusan rasmi daripada jawapan CUBAAN PERTAMA (null = belum dijawab).
 * Cubaan semula (butang CUBA LAGI) membantu pembelajaran tetapi tidak mengubah markah rasmi.
 */
export function computeResult(answers) {
  let correct = 0;
  let answered = 0;
  answers.forEach((a, i) => {
    if (a === null || a === undefined) return;
    answered++;
    if (isCorrect(i, a)) correct++;
  });
  const wrong = answered - correct;
  const score = correct * POINTS_PER_CORRECT;
  const max = TOTAL_QUESTIONS * POINTS_PER_CORRECT;
  return {
    total: TOTAL_QUESTIONS,
    answered,
    correct,
    wrong,
    score,
    max,
    percent: Math.round((score / max) * 100),
    finished: answered === TOTAL_QUESTIONS,
  };
}

/**
 * Hantar jawapan cubaan pertama. Jawapan cubaan pertama tidak boleh diubah.
 * Pulangkan { ok, correct } — ok=false jika soalan sudah dijawab atau pilihan tidak sah.
 */
export function submitAnswer(answers, qIndex, choice) {
  if (qIndex < 0 || qIndex >= TOTAL_QUESTIONS) return { ok: false };
  if (answers[qIndex] !== null && answers[qIndex] !== undefined) return { ok: false, locked: true };
  if (![0, 1, 2, 3].includes(choice)) return { ok: false };
  answers[qIndex] = choice;
  return { ok: true, correct: isCorrect(qIndex, choice) };
}

/** Boleh cuba lagi jika cubaan pertama salah dan soalan belum diselesaikan. */
export function canRetry(quiz, qIndex) {
  const a = quiz.answers[qIndex];
  return a !== null && a !== undefined && !isCorrect(qIndex, a) && !quiz.solved[qIndex];
}

/** Cubaan semula selepas CUBA LAGI. Tidak mengubah markah rasmi. */
export function retryAnswer(quiz, qIndex, choice) {
  if (!canRetry(quiz, qIndex) || ![0, 1, 2, 3].includes(choice)) return { ok: false };
  quiz.attempts[qIndex] = (quiz.attempts[qIndex] || 0) + 1;
  const correct = isCorrect(qIndex, choice);
  if (correct) quiz.solved[qIndex] = true;
  return { ok: true, correct };
}

/** Rentetan jawapan ringkas, cth. "BCDAB-CBDCA" ('-' = belum dijawab). */
export function answersToString(answers) {
  return answers.map((a) => (a === null || a === undefined ? '-' : LETTERS[a])).join('');
}
