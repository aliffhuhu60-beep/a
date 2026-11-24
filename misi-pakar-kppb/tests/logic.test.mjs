// Ujian logik teras: node tests/logic.test.mjs
import assert from 'node:assert/strict';
import { QUESTIONS, TOTAL_QUESTIONS, emptyAnswers, emptyQuiz, computeResult, submitAnswer, retryAnswer, canRetry, answersToString, ANSWER_KEY } from '../src/quiz.js';
import { RANKS, rankIndexFor, rankFor } from '../src/ranking.js';
import { validateForm, certFileName, formatTarikh } from '../src/certificate.js';

let passed = 0;
const test = (name, fn) => { fn(); passed++; console.log('  ✔', name); };

console.log('Kuiz');
test('10 soalan, setiap satu 4 pilihan dan kunci jawapan sah', () => {
  assert.equal(TOTAL_QUESTIONS, 10);
  QUESTIONS.forEach((q) => { assert.equal(q.options.length, 4); assert.ok([0, 1, 2, 3].includes(q.answer)); assert.ok(q.explain.length > 10); });
});
test('kunci jawapan: B C D A B C B D C A', () => {
  assert.equal(ANSWER_KEY, 'BCDABCBDCA');
});
test('soalan meliputi semua subtopik Topik 2', () => {
  const tags = new Set(QUESTIONS.map((q) => q.tag));
  ['KONSEP & PERANAN', 'TPACK', 'MODEL SAMR', 'TIM', 'MODEL 3E', 'MODEL 3R', 'BLOOM DIGITAL'].forEach((t) => assert.ok(tags.has(t), t));
});

// Bina jawapan dengan tepat N betul
function answersWithCorrect(n) {
  return QUESTIONS.map((q, i) => (i < n ? q.answer : (q.answer + 1) % 4));
}

const expected = {
  0: ['PEMULA KPPB', null], 1: ['PEMULA KPPB', null],
  2: ['PERANTIS KPPB', 'Gangsa'], 3: ['PERANTIS KPPB', 'Gangsa'],
  4: ['PENJELAJAH KPPB', 'Perak'], 5: ['PENJELAJAH KPPB', 'Perak'],
  6: ['PENGAMAL KPPB', 'Emas'], 7: ['PENGAMAL KPPB', 'Emas'],
  8: ['STRATEGIS KPPB', 'Platinum'], 9: ['STRATEGIS KPPB', 'Platinum'],
  10: ['PAKAR KPPB', 'Berlian'],
};

console.log('Pemarkahan & pangkat (0–10 jawapan betul)');
for (let n = 0; n <= 10; n++) {
  test(`${n}/10 → ${n * 10} markah, ${expected[n][0]}, lencana ${expected[n][1] ?? 'tiada'}`, () => {
    const ans = emptyAnswers();
    answersWithCorrect(n).forEach((c, i) => assert.equal(submitAnswer(ans, i, c).ok, true));
    const r = computeResult(ans);
    assert.equal(r.correct, n);
    assert.equal(r.wrong, 10 - n);
    assert.equal(r.score, n * 10);
    assert.equal(r.percent, n * 10);
    assert.equal(r.finished, true);
    const rank = rankFor(n);
    assert.equal(rank.name, expected[n][0]);
    assert.equal(rank.badge, expected[n][1]);
  });
}

console.log('Peraturan jawapan');
test('jawapan tidak boleh diubah selepas dihantar', () => {
  const ans = emptyAnswers();
  assert.deepEqual(submitAnswer(ans, 0, 1), { ok: true, correct: true });
  const again = submitAnswer(ans, 0, 2);
  assert.equal(again.ok, false);
  assert.equal(ans[0], 1);
});
test('pilihan tidak sah ditolak', () => {
  const ans = emptyAnswers();
  assert.equal(submitAnswer(ans, 0, 5).ok, false);
  assert.equal(submitAnswer(ans, 11, 0).ok, false);
  assert.equal(ans[0], null);
});
test('keputusan belum tamat jika ada soalan belum dijawab', () => {
  const ans = emptyAnswers();
  submitAnswer(ans, 3, QUESTIONS[3].answer);
  const r = computeResult(ans);
  assert.equal(r.finished, false);
  assert.equal(r.answered, 1);
  assert.equal(r.score, 10);
  assert.equal(answersToString(ans), '---A------');
});
test('CUBA LAGI: soalan salah boleh dijawab semula tanpa mengubah markah rasmi', () => {
  const q = emptyQuiz();
  const wrong = (QUESTIONS[0].answer + 1) % 4;
  submitAnswer(q.answers, 0, wrong);
  assert.equal(canRetry(q, 0), true);
  assert.deepEqual(retryAnswer(q, 0, (QUESTIONS[0].answer + 2) % 4), { ok: true, correct: false });
  assert.equal(canRetry(q, 0), true);
  assert.deepEqual(retryAnswer(q, 0, QUESTIONS[0].answer), { ok: true, correct: true });
  assert.equal(q.solved[0], true);
  assert.equal(q.attempts[0], 2);
  assert.equal(canRetry(q, 0), false);
  assert.equal(retryAnswer(q, 0, QUESTIONS[0].answer).ok, false);
  assert.equal(q.answers[0], wrong, 'jawapan cubaan pertama kekal');
  assert.equal(computeResult(q.answers).score, 0, 'markah rasmi kekal 0');
});
test('CUBA LAGI tidak dibenarkan untuk soalan yang betul atau belum dijawab', () => {
  const q = emptyQuiz();
  assert.equal(canRetry(q, 1), false);
  submitAnswer(q.answers, 1, QUESTIONS[1].answer);
  assert.equal(canRetry(q, 1), false);
  assert.equal(retryAnswer(q, 1, 0).ok, false);
});
test('rankIndexFor mengehadkan input luar julat', () => {
  assert.equal(rankIndexFor(-3), 0);
  assert.equal(rankIndexFor(99), RANKS.length - 1);
});

console.log('Sijil');
test('nama atau kelas kosong ditolak', () => {
  assert.ok(validateForm('', 'A').name);
  assert.ok(validateForm('   ', 'A').name);
  assert.ok(validateForm('Ali bin Abu', '').kelas);
  assert.ok(validateForm('Ali bin Abu', '   ').kelas);
  assert.deepEqual(validateForm('Ali bin Abu', '4 Bestari'), {});
});
test('nama fail sijil', () => {
  assert.equal(certFileName('Nur Aisyah binti Ahmad'), 'Sijil_Pencapaian_Nur_Aisyah_binti_Ahmad.pdf');
  assert.equal(certFileName('  Siti / Nur: <x>  '), 'Sijil_Pencapaian_Siti_Nur_x.pdf');
});
test('format tarikh Bahasa Melayu', () => {
  assert.equal(formatTarikh(new Date(2026, 7, 31)), '31 Ogos 2026');
  assert.equal(formatTarikh(new Date(2026, 2, 1)), '1 Mac 2026');
});

console.log(`\n${passed} ujian lulus.`);
