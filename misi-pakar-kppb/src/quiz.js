// Kandungan dan logik kuiz 10 soalan (Topik 2: Model 3E & Kerangka 3R).

export const POINTS_PER_CORRECT = 10;
export const LETTERS = ['A', 'B', 'C', 'D'];

export const QUESTIONS = [
  {
    tag: 'MODEL 3E',
    q: 'Apakah maksud Engagement dalam Model 3E?',
    options: [
      'Menghubungkan pembelajaran dengan dunia sebenar.',
      'Meningkatkan penglibatan murid dalam aktiviti pembelajaran.',
      'Menilai tahap pemikiran murid.',
      'Membina hubungan antara komuniti.',
    ],
    answer: 1,
    explain: 'Engagement memberi penekanan kepada penglibatan murid, masa melaksanakan tugasan, kerjasama dan matlamat pembelajaran.',
  },
  {
    tag: 'MODEL 3E',
    q: 'Antara berikut, yang manakah komponen Engagement?',
    options: [
      'Time-on-Task, Co-Use dan Learning Goals.',
      'Authentic Experiences, Soft Skills dan Personalization.',
      'Rigor, Relevance dan Relationship.',
      'Analysis, Synthesis dan Evaluation.',
    ],
    answer: 0,
    explain: 'Engagement mempunyai tiga komponen utama, iaitu masa melaksanakan tugasan, bekerjasama dan matlamat pembelajaran.',
  },
  {
    tag: 'MODEL 3E',
    q: 'Seorang guru menggunakan simulasi digital untuk membantu murid memahami konsep yang sukar. Apakah elemen 3E yang paling sesuai?',
    options: ['Engagement.', 'Enhancement.', 'Extension.', 'Relationship.'],
    answer: 1,
    explain: 'Enhancement menambah nilai pembelajaran melalui teknologi, bimbingan, sokongan dan pembelajaran terbeza.',
  },
  {
    tag: 'MODEL 3E',
    q: 'Apakah maksud Extension dalam Model 3E?',
    options: [
      'Menggunakan teknologi untuk menarik perhatian murid sahaja.',
      'Mengulang semula kandungan pembelajaran.',
      'Menghubungkan pembelajaran dengan pengalaman autentik dan dunia sebenar.',
      'Mengurangkan penggunaan teknologi.',
    ],
    answer: 2,
    explain: 'Extension menghubungkan pembelajaran dengan pengalaman autentik, pembelajaran 24/7 dan kemahiran insaniah.',
  },
  {
    tag: 'MODEL 3E',
    q: 'Seorang murid menghasilkan projek digital berkaitan masalah pencemaran di kawasan tempat tinggalnya. Aktiviti tersebut paling sesuai dikaitkan dengan:',
    options: ['Engagement.', 'Extension.', 'Time-on-Task.', 'Personalization.'],
    answer: 1,
    explain: 'Projek tersebut menghubungkan pengetahuan dengan isu komuniti dan pengalaman dunia sebenar.',
  },
  {
    tag: 'KERANGKA 3R',
    q: 'Apakah yang dimaksudkan dengan Rigor dalam kerangka 3R?',
    options: [
      'Hubungan antara murid dengan guru.',
      'Penggunaan teknologi secara berterusan.',
      'Peningkatan tahap pemikiran daripada pengetahuan kepada penilaian.',
      'Penggunaan ilmu dalam situasi rutin sahaja.',
    ],
    answer: 2,
    explain: 'Rigor menekankan pemikiran mendalam, kritis dan kreatif melalui peningkatan tahap kognitif.',
  },
  {
    tag: 'KERANGKA 3R',
    q: 'Seorang murid menggunakan ilmu yang dipelajari untuk menyelesaikan masalah dalam kehidupan sebenar. Elemen 3R yang paling berkaitan ialah:',
    options: ['Rigor.', 'Relevance.', 'Relationship.', 'Engagement.'],
    answer: 1,
    explain: 'Relevance menghubungkan pengetahuan dengan aplikasi dalam kehidupan, pekerjaan dan cabaran dunia sebenar.',
  },
  {
    tag: 'KERANGKA 3R',
    q: 'Antara berikut, yang manakah contoh Relationship dalam pembelajaran?',
    options: [
      'Murid menghafal semua nota secara individu.',
      'Guru memberikan ujian tanpa perbincangan.',
      'Murid bekerjasama dengan rakan dan komuniti untuk menyelesaikan masalah.',
      'Murid menonton video tanpa melakukan aktiviti susulan.',
    ],
    answer: 2,
    explain: 'Relationship membina hubungan antara murid, guru, rakan, ilmu dan komuniti.',
  },
  {
    tag: 'KERANGKA 3R',
    q: 'Apakah perbezaan utama antara Rigor dengan Relevance?',
    options: [
      'Rigor menekankan tahap pemikiran, manakala Relevance menekankan aplikasi pengetahuan dalam dunia sebenar.',
      'Rigor menekankan teknologi, manakala Relevance menekankan peperiksaan.',
      'Kedua-duanya hanya menekankan hafalan.',
      'Kedua-duanya mempunyai maksud yang sama.',
    ],
    answer: 0,
    explain: 'Rigor berkaitan peningkatan tahap pemikiran. Relevance berkaitan penggunaan ilmu dalam situasi sebenar.',
  },
  {
    tag: 'KERANGKA 3R',
    q: 'Seorang guru meminta murid menganalisis masalah pencemaran sungai, mencadangkan penyelesaian berdasarkan ilmu yang dipelajari dan membentangkan cadangan bersama komuniti. Gabungan elemen 3R yang paling sesuai ialah:',
    options: ['Rigor sahaja.', 'Relevance sahaja.', 'Relationship sahaja.', 'Rigor, Relevance dan Relationship.'],
    answer: 3,
    explain: 'Aktiviti melibatkan pemikiran mendalam, aplikasi pengetahuan dalam isu sebenar dan hubungan dengan komuniti.',
  },
];

export const TOTAL_QUESTIONS = QUESTIONS.length;

export function emptyAnswers() {
  return Array(TOTAL_QUESTIONS).fill(null);
}

export function isCorrect(qIndex, choice) {
  return choice !== null && choice !== undefined && QUESTIONS[qIndex].answer === choice;
}

/** Kira keputusan daripada tatasusunan pilihan (null = belum dijawab). */
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
 * Hantar jawapan untuk satu soalan. Jawapan yang sudah dihantar tidak boleh diubah.
 * Pulangkan { ok, correct } — ok=false jika soalan sudah dijawab atau pilihan tidak sah.
 */
export function submitAnswer(answers, qIndex, choice) {
  if (qIndex < 0 || qIndex >= TOTAL_QUESTIONS) return { ok: false };
  if (answers[qIndex] !== null && answers[qIndex] !== undefined) return { ok: false, locked: true };
  if (![0, 1, 2, 3].includes(choice)) return { ok: false };
  answers[qIndex] = choice;
  return { ok: true, correct: isCorrect(qIndex, choice) };
}

/** Rentetan jawapan ringkas, cth. "BACBB-CBCAD" ('-' = belum dijawab). */
export function answersToString(answers) {
  return answers.map((a) => (a === null || a === undefined ? '-' : LETTERS[a])).join('');
}
