// Ujian KPPBot: node tests/chatbot.test.mjs
import assert from 'node:assert/strict';
import { respond } from '../src/chatbot.js';
import { QUESTIONS, LETTERS } from '../src/quiz.js';

let n = 0;
const test = (name, fn) => { fn(); n++; console.log('  ✔', name); };
const ctx = (over = {}) => () => ({ screen: 'arena', currentQ: -1, result: { score: 30, answered: 5, correct: 3 }, visited: 10, learnDone: true, ...over });
const has = (q, frag, c = ctx()) => { const r = respond(q, c); assert.ok(r && r.includes(frag), `"${q}" → ${r && r.slice(0, 90)}`); };

console.log('KPPBot');
test('sapaan', () => has('Hai KPPBot', 'KPPBot'));
test('cara bermain', () => has('macam mana main game ni?', 'Cara bermain'));
test('kawalan papan kekunci & telefon', () => { has('macam mana nak gerak?', 'W'); has('butang arah telefon', 'butang arah'); });
test('markah semasa ikut konteks', () => has('berapa markah saya', '30/100'));
test('pangkat & lencana', () => has('apa lencana berlian', 'PAKAR KPPB'));
test('sijil', () => has('macam mana nak dapat sijil', 'MUAT TURUN SIJIL'));
test('reset', () => has('nak mula semula', 'RESET SEMUA'));
test('TPACK dan komponen', () => { has('apa itu TPACK?', 'Mishra'); has('apa itu TPK', 'Technological Pedagogical Knowledge'); has('maksud PCK', 'Pedagogical Content Knowledge'); has('TCK', 'Technological Content Knowledge'); });
test('SAMR & tahap', () => { has('terangkan SAMR', 'Puentedura'); has('apa itu substitution', 'Penggantian'); has('redefinition', 'Pendefinisian Semula'); });
test('TIM & tahap', () => { has('apa itu TIM', 'Florida'); has('tahap infusi', 'Infusi'); has('beza samr dan tim', 'matriks 25 sel'); });
test('konsep tidak mengatasi model tertentu', () => { has('konsep SAMR', 'Puentedura'); has('apa itu model pengintegrasian teknologi', 'kerangka atau panduan'); });
test('3E & 3R', () => { has('apa itu model 3E', 'Liz Kolb'); has('engagement', 'Time-on-Task'); has('apa itu rigor', 'Rigor'); has('relationship', 'Hubungan'); });
test('Bloom digital', () => { has('taksonomi digital bloom', 'Andrew Churches'); has('aras mencipta', 'podcast'); has('mengingat', 'bookmarking'); });
test('petunjuk ikut soalan semasa', () => has('petunjuk', 'Portal 03', ctx({ currentQ: 2 })));
test('tidak pernah mendedahkan jawapan kuiz', () => {
  QUESTIONS.forEach((q, i) => {
    ['apa jawapan', 'bagi jawapan soalan ini', 'jawapan betul?'].forEach((t) => {
      const r = respond(t, ctx({ currentQ: i }));
      assert.ok(r.includes('tidak boleh memberi jawapan'), t);
      assert.ok(!new RegExp(`jawapan[^.]*\\b${LETTERS[q.answer]}\\b`, 'i').test(r.replace(/<[^>]+>/g, '')), `bocor huruf jawapan soalan ${i + 1}`);
    });
  });
});
test('soalan tidak difahami → null (mesej bantuan)', () => assert.equal(respond('zzz qqq', ctx()), null));
console.log(`\n${n} ujian lulus.`);
