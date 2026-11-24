// MISI PAKAR KPPB: PENGEMBARAAN 3E & 3R — pengawal utama permainan.
import '@fontsource/press-start-2p/400.css';
import '@fontsource/vt323/400.css';
import '@fontsource/montserrat/500.css';
import '@fontsource/montserrat/600.css';
import '@fontsource/montserrat/700.css';
import '@fontsource/montserrat/800.css';
import '@fontsource/great-vibes/400.css';
import './style.css';
import gsap from 'gsap';
import { Vector3 } from 'three';
import {
  createIcons, Play, Gamepad2, BookOpen, Music, Volume2, VolumeX, House, ChevronLeft, ChevronRight, Check,
  MousePointerClick, Trophy, ChartColumn, Award, RotateCcw, Shield, FileText, Download, Monitor, Smartphone,
  Layers, Box, Users, Lightbulb, Rotate3d, Clock, Handshake, Target, Plus, LifeBuoy, Split, UserRound, Globe,
  Wifi, HeartHandshake, X, Sparkles,
} from 'lucide';

import { World } from './game.js';
import { AudioManager } from './audio.js';
import { SLIDES, TOTAL_SLIDES, bindSlideInteractions } from './learning.js';
import { QUESTIONS, TOTAL_QUESTIONS, LETTERS, emptyAnswers, computeResult, submitAnswer, isCorrect, answersToString } from './quiz.js';
import { RANKS, rankIndexFor, BadgeViewer } from './ranking.js';
import { buildCertificate, drawCertificate, loadCertFonts, validateForm, certFileName, formatTarikh, sendToSheet, sheetConfigured, localCertId, uploadPdfToSheet } from './certificate.js';
import { STORAGE_KEY } from './config.js';

const ICONS = {
  Play, Gamepad2, BookOpen, Music, Volume2, VolumeX, House, ChevronLeft, ChevronRight, Check, MousePointerClick, Trophy,
  ChartColumn, Award, RotateCcw, Shield, FileText, Download, Monitor, Smartphone, Layers, Box, Users, Lightbulb, Rotate3d,
  Clock, Handshake, Target, Plus, LifeBuoy, Split, UserRound, Globe, Wifi, HeartHandshake, X, Sparkles,
};
const icons = () => createIcons({ icons: ICONS, attrs: { 'aria-hidden': 'true' } });
const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];

// ---------------------------------------------------------------------------
// Keadaan & simpanan (LocalStorage)
// ---------------------------------------------------------------------------
function defaultState() {
  return {
    learn: { visited: Array(TOTAL_SLIDES).fill(false), completed: false, current: 0 },
    quiz: { answers: emptyAnswers() },
    best: { correct: -1, score: 0, rankIdx: 0 },
    settings: { music: true, sfx: true },
    plays: 0,
  };
}

function loadState() {
  const d = defaultState();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return d;
    const s = JSON.parse(raw);
    const visited = Array.isArray(s?.learn?.visited) ? d.learn.visited.map((_, i) => !!s.learn.visited[i]) : d.learn.visited;
    const answers = Array.isArray(s?.quiz?.answers)
      ? d.quiz.answers.map((_, i) => ([0, 1, 2, 3].includes(s.quiz.answers[i]) ? s.quiz.answers[i] : null))
      : d.quiz.answers;
    return {
      learn: {
        visited,
        completed: !!s?.learn?.completed && visited.every(Boolean),
        current: Math.max(0, Math.min(TOTAL_SLIDES - 1, Number(s?.learn?.current) || 0)),
      },
      quiz: { answers },
      best: { ...d.best, ...(s.best || {}) },
      settings: { ...d.settings, ...(s.settings || {}) },
      plays: Number(s.plays) || 0,
    };
  } catch {
    return d;
  }
}

const state = loadState();
function save() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { /* storan penuh/disekat */ }
}

// ---------------------------------------------------------------------------
// Audio
// ---------------------------------------------------------------------------
const audio = new AudioManager(state.settings);
const sfx = (n) => audio.play(n);
window.addEventListener('pointerdown', () => audio.unlock(), { once: false, capture: true });
window.addEventListener('keydown', () => audio.unlock(), { capture: true });

function setIcon(btn, name) {
  btn.innerHTML = `<i data-lucide="${name}"></i>`;
  icons();
}
function refreshAudioButtons() {
  const m = $('#btnMusic');
  const s = $('#btnSfx');
  m.setAttribute('aria-pressed', String(state.settings.music));
  m.title = state.settings.music ? 'Matikan muzik latar' : 'Hidupkan muzik latar';
  m.style.textDecoration = state.settings.music ? '' : 'line-through';
  setIcon(m, state.settings.music ? 'music' : 'x');
  s.setAttribute('aria-pressed', String(state.settings.sfx));
  s.title = state.settings.sfx ? 'Matikan kesan bunyi' : 'Hidupkan kesan bunyi';
  setIcon(s, state.settings.sfx ? 'volume-2' : 'volume-x');
}
$('#btnMusic').addEventListener('click', () => {
  state.settings.music = !state.settings.music;
  audio.unlock();
  audio.setMusic(state.settings.music);
  refreshAudioButtons();
  toast(state.settings.music ? 'MUZIK: HIDUP' : 'MUZIK: MATI');
  save();
});
$('#btnSfx').addEventListener('click', () => {
  state.settings.sfx = !state.settings.sfx;
  audio.setSfx(state.settings.sfx);
  refreshAudioButtons();
  sfx('click');
  toast(state.settings.sfx ? 'KESAN BUNYI: HIDUP' : 'KESAN BUNYI: MATI');
  save();
});

// bunyi klik/hover untuk semua butang
document.addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (b && !b.closest('#btnSfx') && !b.matches('.opt,[data-toggle],[data-flip],.stair,.path-step')) sfx('click');
});
document.addEventListener('pointerover', (e) => {
  if (e.pointerType === 'mouse' && e.target.closest?.('.btn,.opt')) {
    const b = e.target.closest('.btn,.opt');
    if (b !== lastHover && !b.disabled) sfx('hover');
    lastHover = b;
  }
});
let lastHover = null;

// ---------------------------------------------------------------------------
// Pembantu UI
// ---------------------------------------------------------------------------
let toastTimer;
function toast(msg, warn = false) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.toggle('warn', warn);
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2600);
}

function buildBackground() {
  const stars = $('#stars');
  let html = '';
  for (let i = 0; i < 70; i++) {
    html += `<i style="left:${Math.random() * 100}%;top:${Math.random() * 70}%;animation-delay:${(Math.random() * 3).toFixed(2)}s;${Math.random() < 0.2 ? 'width:4px;height:4px;' : ''}"></i>`;
  }
  stars.innerHTML = html;
  const ground = $('#ground');
  const cols = ['#8a2c4c', '#5e1c36', '#a33a5c', '#6e2240'];
  ground.innerHTML = Array.from({ length: 60 }, (_, i) => `<span style="background:${cols[(i * 7 + (i >> 1)) % cols.length]}"></span>`).join('');
}

// Peralihan blok piksel (gaya video)
function wipe(mid) {
  return new Promise((resolve) => {
    const el = $('#wipe');
    const size = window.innerWidth < 600 ? 56 : 86;
    const cols = Math.ceil(window.innerWidth / size);
    const rows = Math.ceil(window.innerHeight / size);
    el.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
    el.style.gridTemplateRows = `repeat(${rows}, 1fr)`;
    const shades = ['#5e1c36', '#7a2442', '#8a2c4c', '#4a1530', '#9c3456', '#3d1828'];
    el.innerHTML = Array.from({ length: cols * rows }, () => `<i style="background:${shades[(Math.random() * shades.length) | 0]}"></i>`).join('');
    el.style.pointerEvents = 'auto';
    const cells = el.children;
    gsap.timeline({
      onComplete: () => { el.innerHTML = ''; el.style.pointerEvents = 'none'; resolve(); },
    })
      .to(cells, { scale: 1.02, duration: 0.22, ease: 'steps(3)', stagger: { amount: 0.42, from: 'random' } })
      .add(() => mid?.())
      .to(cells, { scale: 0, duration: 0.22, ease: 'steps(3)', stagger: { amount: 0.42, from: 'random' } }, '+=0.12');
  });
}

function revealIn(root) {
  const items = root.querySelectorAll('.reveal');
  gsap.fromTo(items, { y: 18, opacity: 0 }, { y: 0, opacity: 1, duration: 0.45, stagger: 0.07, ease: 'back.out(1.6)', overwrite: true });
}

function openModal(id) {
  const m = $(id);
  m.classList.add('open');
  const p = m.querySelector('.modal-panel');
  gsap.fromTo(p, { scale: 0.85, y: 20, opacity: 0 }, { scale: 1, y: 0, opacity: 1, duration: 0.35, ease: 'back.out(1.8)' });
}
function closeModal(id) {
  $(id).classList.remove('open');
}
$$('[data-close]').forEach((b) => b.addEventListener('click', () => closeModal('#' + b.closest('.modal').id)));
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  ['#modal-guide', '#modal-about', '#modal-perf', '#modal-cert'].forEach((id) => {
    if ($(id).classList.contains('open')) closeModal(id);
  });
});

// ---------------------------------------------------------------------------
// Dunia 3D
// ---------------------------------------------------------------------------
const world = new World($('#world'));
let screen = 'home';
const bubble = $('#bubble');
const bubbleAnchors = {
  home: { pos: () => world.anchors.homeBubble, text: 'SELAMAT DATANG KE MISI PAKAR KPPB!' },
};

function updateFocus() {
  const portrait = window.innerWidth < 900 || window.innerWidth / window.innerHeight < 1;
  if (screen === 'home') world.setFocusOffset(portrait ? 0 : 0.2, portrait ? 0.2 : 0);
  else if (screen === 'learn') world.setFocusOffset(portrait ? 0 : -0.24, portrait ? 0.29 : 0);
  else world.setFocusOffset(0, portrait ? 0.04 : 0);
}
window.addEventListener('resize', () => { updateFocus(); if (screen === 'learn') world.focusLearn(true); if (screen === 'arena') world.focusArena(true); });

// ---------------------------------------------------------------------------
// Navigasi skrin
// ---------------------------------------------------------------------------
function setScreen(name) {
  screen = name;
  $$('.screen').forEach((s) => s.classList.toggle('active', s.id === `screen-${name}`));
  const area = name === 'home' ? 'home' : name === 'learn' ? 'learn' : 'arena';
  world.show(area);
  updateFocus();
  updateTopProgress();
  const a = bubbleAnchors[name];
  if (a) {
    $('#bubbleText').textContent = a.text;
    bubble.classList.remove('hidden');
    gsap.fromTo(bubble, { opacity: 0 }, { opacity: 1, delay: 0.8, duration: 0.3 });
  } else bubble.classList.add('hidden');
}

async function goTo(name) {
  if (name === screen) return;
  sfx('portal');
  await wipe(() => {
    setScreen(name);
    if (name === 'home') renderHome();
    if (name === 'learn') renderSlide(state.learn.current, false);
    if (name === 'arena') updateArena();
  });
  if (name === 'home') animateHome();
  if (name === 'arena' && !arenaHintShown) {
    arenaHintShown = true;
    toast('PILIH PORTAL 01 HINGGA 10 UNTUK MENJAWAB SOALAN');
  }
}
let arenaHintShown = false;

world.onFrame = () => {
  const a = bubbleAnchors[screen];
  if (!a || bubble.classList.contains('hidden')) return;
  const p = a.pos();
  const v = world.screenPos(new Vector3(p.x, p.y, p.z));
  const bw = bubble.offsetWidth || 200;
  bubble.style.left = `${Math.max(bw / 2 + 12, Math.min(window.innerWidth - bw / 2 - 12, v.x + 90))}px`;
  bubble.style.top = `${Math.max(140, v.y)}px`;
};

function updateTopProgress() {
  const tp = $('#topProgress');
  const visited = state.learn.visited.filter(Boolean).length;
  const r = computeResult(state.quiz.answers);
  if (screen === 'learn') {
    tp.innerHTML = `<div class="pill">SLAID <b>${state.learn.current + 1}/${TOTAL_SLIDES}</b> · DIBACA <b>${visited}/${TOTAL_SLIDES}</b></div>`;
  } else if (screen === 'arena') {
    tp.innerHTML = `<div class="pill">MATA <b>${r.score}</b> · SOALAN <b>${r.answered}/${TOTAL_QUESTIONS}</b></div>`;
  } else {
    tp.innerHTML = `<div class="pill">BELAJAR <b>${visited}/${TOTAL_SLIDES}</b> · MISI <b>${r.answered}/${TOTAL_QUESTIONS}</b></div>`;
  }
}

$('#btnHome').addEventListener('click', () => goTo('home'));
$('#btnBrand').addEventListener('click', () => goTo('home'));

// ---------------------------------------------------------------------------
// A: Halaman utama
// ---------------------------------------------------------------------------
function buildTitleTiles() {
  const rows = [['M', 'I', 'S', 'I', ' ', 'P', 'A', 'K', 'A', 'R'], ['K', 'P', 'P', 'B']];
  $('#titleTiles').innerHTML = rows
    .map((r, ri) => `<div class="tile-row">${r.map((ch, i) => (ch === ' ' ? '<span class="ttile gap"></span>' : `<span class="ttile ${ri === 1 ? 'pink' : i % 3 === 1 ? 'alt' : ''}">${ch}</span>`)).join('')}</div>`)
    .join('');
}

function renderHome() {
  const visited = state.learn.visited.filter(Boolean).length;
  const r = computeResult(state.quiz.answers);
  const startBtn = $('#btnStart');
  startBtn.innerHTML = `<i data-lucide="play"></i> ${state.learn.completed ? 'TERUSKAN MISI' : visited > 0 ? 'SAMBUNG BELAJAR' : 'MULA MISI'}`;
  const st = [];
  st.push(`<span class="chip ${state.learn.completed ? 'c-green' : 'c-pink'}">BELAJAR ${visited}/${TOTAL_SLIDES}</span>`);
  if (r.answered > 0) st.push(`<span class="chip c-blue">MISI ${r.answered}/10 · ${r.score} MATA</span>`);
  if (state.best.correct >= 0) {
    const br = RANKS[rankIndexFor(state.best.correct)];
    st.push(`<span class="chip c-gold">TERBAIK: ${br.name} (${state.best.score}/100)</span>`);
  }
  $('#homeStatus').innerHTML = st.join('');
  icons();
}

function animateHome() {
  const tiles = $$('#titleTiles .ttile:not(.gap)');
  gsap.fromTo(tiles, { y: -window.innerHeight * 0.6, rotation: () => gsap.utils.random(-25, 25), opacity: 0 }, {
    y: 0, rotation: 0, opacity: 1, duration: 0.7, ease: 'bounce.out', stagger: 0.06,
  });
  gsap.to(tiles, { y: -6, duration: 0.4, ease: 'sine.inOut', yoyo: true, repeat: 1, stagger: 0.05, delay: 1.6 });
  revealIn($('#homePanel'));
}

$('#btnStart').addEventListener('click', () => {
  audio.unlock();
  goTo(state.learn.completed ? 'arena' : 'learn');
});
$('#btnGuide').addEventListener('click', () => openModal('#modal-guide'));
$('#btnAbout').addEventListener('click', () => openModal('#modal-about'));
world.onHomePortal = () => { if (screen === 'home') $('#btnStart').click(); };

// ---------------------------------------------------------------------------
// B: Pusat pembelajaran
// ---------------------------------------------------------------------------
function renderSlide(i, animate = true) {
  i = Math.max(0, Math.min(TOTAL_SLIDES - 1, i));
  state.learn.current = i;
  state.learn.visited[i] = true;
  save();
  const body = $('#slideBody');
  body.innerHTML = SLIDES[i].html();
  body.scrollTop = 0;
  icons();
  bindSlideInteractions(body, sfx);
  revealIn(body);
  if (animate) sfx('page');

  const visited = state.learn.visited.filter(Boolean).length;
  $('#learnCount').textContent = `SLAID ${i + 1}/${TOTAL_SLIDES}`;
  $('#learnBar').style.width = `${(visited / TOTAL_SLIDES) * 100}%`;
  $('#learnDots').innerHTML = SLIDES.map((s, k) => {
    const reachable = state.learn.visited[k] || state.learn.visited[k - 1] || k === 0;
    return `<button class="dot ${state.learn.visited[k] ? 'visited' : ''} ${k === i ? 'current' : ''}" data-slide="${k}" title="${s.short}" ${reachable ? '' : 'disabled'}>${k + 1}</button>`;
  }).join('');
  $$('#learnDots .dot').forEach((d) => d.addEventListener('click', () => renderSlide(Number(d.dataset.slide))));
  $('#btnPrev').disabled = i === 0;
  const last = i === TOTAL_SLIDES - 1;
  $('#btnNext').classList.toggle('hidden', last);
  const fin = $('#btnFinishLearn');
  fin.classList.toggle('hidden', !last);
  const allRead = state.learn.visited.every(Boolean);
  fin.disabled = !allRead;
  fin.title = allRead ? 'Masuk ke Arena Misi KPPB' : 'Baca semua slaid dahulu';
  world.setLearnSlide(i, state.learn.visited, SLIDES[i].board, TOTAL_SLIDES);
  updateTopProgress();
}

$('#btnPrev').addEventListener('click', () => renderSlide(state.learn.current - 1));
$('#btnNext').addEventListener('click', () => renderSlide(state.learn.current + 1));
$('#btnFinishLearn').addEventListener('click', () => {
  if (!state.learn.visited.every(Boolean)) {
    const missing = state.learn.visited.map((v, k) => (v ? null : k + 1)).filter(Boolean);
    toast(`BACA SLAID ${missing.join(', ')} DAHULU`, true);
    sfx('error');
    return;
  }
  state.learn.completed = true;
  save();
  sfx('rankup');
  world.celebrate(1);
  toast('PEMBELAJARAN SELESAI! SELAMAT DATANG KE ARENA.');
  setTimeout(() => goTo('arena'), 500);
});
document.addEventListener('keydown', (e) => {
  if (screen !== 'learn' || $('.modal.open')) return;
  if (e.key === 'ArrowRight' && state.learn.current < TOTAL_SLIDES - 1) renderSlide(state.learn.current + 1);
  if (e.key === 'ArrowLeft' && state.learn.current > 0) renderSlide(state.learn.current - 1);
});
// leret pada telefon
(() => {
  let sx = 0;
  let sy = 0;
  const body = $('#slideBody');
  body.addEventListener('touchstart', (e) => { sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, { passive: true });
  body.addEventListener('touchend', (e) => {
    const dx = e.changedTouches[0].clientX - sx;
    const dy = e.changedTouches[0].clientY - sy;
    if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      if (dx < 0 && state.learn.current < TOTAL_SLIDES - 1) renderSlide(state.learn.current + 1);
      if (dx > 0 && state.learn.current > 0) renderSlide(state.learn.current - 1);
    }
  });
})();

// ---------------------------------------------------------------------------
// C & D: Arena + kuiz
// ---------------------------------------------------------------------------
function gateStates() {
  return state.quiz.answers.map((a, i) => (a === null ? 'open' : isCorrect(i, a) ? 'correct' : 'wrong'));
}

function updateArena() {
  const r = computeResult(state.quiz.answers);
  const ri = rankIndexFor(r.correct);
  const rank = RANKS[ri];
  world.setArenaState({ states: gateStates(), score: r.score, answered: r.answered, rankIdx: ri });
  $('#hudScore').textContent = r.score;
  const hr = $('#hudRank');
  hr.textContent = `${rank.name}${rank.badge ? ' · ' + rank.badge.toUpperCase() : ''}`;
  hr.style.color = rank.color;
  $('#hudCells').innerHTML = gateStates().map((s, k) => `<span class="cell ${s}">${k + 1}</span>`).join('');
  $('#hudAnswered').textContent = `${r.answered}/10 SOALAN DIJAWAB`;
  $('#btnShowResults').classList.toggle('hidden', !r.finished);
  $('#arenaHint').classList.toggle('hidden', r.finished);
  updateTopProgress();
}

let currentQ = -1;
let selected = null;
let pendingRankUp = null;

world.onPortalSelect = async (i) => {
  if (screen !== 'arena' || $('.modal.open')) return;
  if (!state.learn.completed) { toast('SELESAIKAN PEMBELAJARAN DAHULU', true); return; }
  const ok = await world.enterGate(i, sfx);
  if (ok) openQuestion(i);
};

function openQuestion(i) {
  currentQ = i;
  selected = null;
  const q = QUESTIONS[i];
  const locked = state.quiz.answers[i] !== null;
  const r = computeResult(state.quiz.answers);
  $('#qNum').textContent = String(i + 1).padStart(2, '0');
  $('#qTag').textContent = `PORTAL SOALAN · ${q.tag}`;
  $('#qProgress').textContent = `${r.answered}/10`;
  $('#qScore').textContent = r.score;
  $('#qText').textContent = q.q;
  $('#qOptions').innerHTML = q.options.map((o, k) => `<button class="opt" data-k="${k}"><span class="letter">${LETTERS[k]}</span><span>${o}</span></button>`).join('');
  $$('#qOptions .opt').forEach((b) => b.addEventListener('click', () => selectOption(Number(b.dataset.k))));
  $('#qFeedback').classList.add('hidden');
  $('#qSubmit').classList.remove('hidden');
  $('#qSubmit').disabled = true;
  $('#qContinue').classList.add('hidden');
  $('#qBack').classList.remove('hidden');
  openModal('#modal-question');
  gsap.fromTo('#qOptions .opt', { x: -20, opacity: 0 }, { x: 0, opacity: 1, stagger: 0.06, duration: 0.3, delay: 0.15 });
  if (locked) showFeedback(i, state.quiz.answers[i], false);
}

function selectOption(k) {
  if (state.quiz.answers[currentQ] !== null) return;
  selected = k;
  sfx('select');
  $$('#qOptions .opt').forEach((b) => b.classList.toggle('selected', Number(b.dataset.k) === k));
  $('#qSubmit').disabled = false;
}

function showFeedback(i, choice, fresh) {
  const q = QUESTIONS[i];
  const ok = isCorrect(i, choice);
  $$('#qOptions .opt').forEach((b) => {
    const k = Number(b.dataset.k);
    b.disabled = true;
    b.classList.remove('selected');
    if (k === q.answer) b.classList.add('correct');
    else if (k === choice) b.classList.add('wrong');
    else b.classList.add('dim');
  });
  const fb = $('#qFeedback');
  fb.classList.remove('hidden', 'ok', 'bad');
  fb.classList.add(ok ? 'ok' : 'bad');
  const r = computeResult(state.quiz.answers);
  $('#fbTitle').textContent = ok
    ? `BETUL! ${fresh ? '+10 MATA' : ''}`.trim()
    : `CUBA LAGI! Jawapan betul: ${LETTERS[q.answer]}`;
  $('#fbExplain').innerHTML = `${q.explain}<br><small style="opacity:.8">Jumlah mata terkini: <b>${r.score}</b> · Kemajuan: <b>${r.answered}/10</b>${fresh ? '' : ' · (Jawapan telah dihantar dan tidak boleh diubah)'}</small>`;
  $('#qSubmit').classList.add('hidden');
  $('#qContinue').classList.remove('hidden');
  $('#qContinue').innerHTML = r.finished ? 'LIHAT KEPUTUSAN <i data-lucide="trophy"></i>' : 'KEMBALI KE ARENA <i data-lucide="chevron-right"></i>';
  $('#qBack').classList.add('hidden');
  $('#qScore').textContent = r.score;
  $('#qProgress').textContent = `${r.answered}/10`;
  icons();
  if (fresh) gsap.fromTo(fb, { scale: 0.9, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.35, ease: 'back.out(2)' });
}

$('#qSubmit').addEventListener('click', () => {
  if (selected === null || currentQ < 0) return;
  const before = computeResult(state.quiz.answers);
  const res = submitAnswer(state.quiz.answers, currentQ, selected);
  if (!res.ok) return;
  save();
  const after = computeResult(state.quiz.answers);
  sfx(res.correct ? 'correct' : 'wrong');
  if (res.correct) {
    const g = world.gates[currentQ].group;
    const p = g.getWorldPosition(new Vector3());
    p.y += 4;
    world.burst(p, [0x7cf0a0, 0xf2c14e, 0xffffff], 70, 8);
  }
  const rb = rankIndexFor(before.correct);
  const ra = rankIndexFor(after.correct);
  if (ra > rb) pendingRankUp = ra;
  showFeedback(currentQ, selected, true);
  updateArena();
});

function leaveQuestion() {
  closeModal('#modal-question');
  if (currentQ >= 0) world.exitGate(currentQ);
  currentQ = -1;
}

$('#qBack').addEventListener('click', leaveQuestion);
$('#qContinue').addEventListener('click', () => {
  leaveQuestion();
  const finished = computeResult(state.quiz.answers).finished;
  if (pendingRankUp !== null) {
    const r = pendingRankUp;
    pendingRankUp = null;
    showRankUp(r, finished);
  } else if (finished) {
    setTimeout(showResults, 500);
  }
});

document.addEventListener('keydown', (e) => {
  if (!$('#modal-question').classList.contains('open')) return;
  const map = { 1: 0, 2: 1, 3: 2, 4: 3, a: 0, b: 1, c: 2, d: 3 };
  const k = map[e.key.toLowerCase()];
  if (k !== undefined) selectOption(k);
  if (e.key === 'Enter') {
    if (!$('#qSubmit').classList.contains('hidden') && !$('#qSubmit').disabled) $('#qSubmit').click();
    else if (!$('#qContinue').classList.contains('hidden')) $('#qContinue').click();
  }
});

// ---------------------------------------------------------------------------
// Naik pangkat
// ---------------------------------------------------------------------------
const badgeViewer = new BadgeViewer();
let afterRankUp = null;

function pixelConfetti(container, colors, n = 60) {
  container.innerHTML = '';
  for (let i = 0; i < n; i++) {
    const el = document.createElement('i');
    el.style.background = colors[i % colors.length];
    el.style.left = '50%';
    el.style.top = '45%';
    container.appendChild(el);
    const ang = Math.random() * Math.PI * 2;
    const d = 160 + Math.random() * Math.max(window.innerWidth, window.innerHeight) * 0.45;
    gsap.to(el, {
      x: Math.cos(ang) * d, y: Math.sin(ang) * d + 120, rotation: Math.random() * 360, opacity: 0,
      duration: 1.4 + Math.random() * 0.8, ease: 'power2.out',
    });
  }
}

function showRankUp(idx, finishedAfter) {
  const r = RANKS[idx];
  const correct = computeResult(state.quiz.answers).correct;
  $('#rankupName').textContent = r.name;
  $('#rankupName').style.color = r.color;
  $('#rankupBadgeName').textContent = r.badgeName;
  $('#rankupCount').textContent = `JAWAPAN BETUL: ${correct}/10`;
  openModal('#modal-rankup');
  badgeViewer.mount($('#rankupBadge'), idx);
  pixelConfetti($('#rankupBurst'), [r.color, '#ff5c9a', '#f2c14e', '#ffffff']);
  sfx('rankup');
  world.celebrate(idx);
  afterRankUp = finishedAfter ? showResults : null;
}
$('#rankupOk').addEventListener('click', () => {
  closeModal('#modal-rankup');
  badgeViewer.stop();
  const next = afterRankUp;
  afterRankUp = null;
  if (next) setTimeout(next, 300);
});

// ---------------------------------------------------------------------------
// E: Keputusan
// ---------------------------------------------------------------------------
function showResults() {
  const r = computeResult(state.quiz.answers);
  if (!r.finished) { toast('JAWAB KESEMUA 10 SOALAN DAHULU', true); return; }
  const ri = rankIndexFor(r.correct);
  const rank = RANKS[ri];
  if (r.correct > state.best.correct) state.best = { correct: r.correct, score: r.score, rankIdx: ri };
  save();
  const msg = $('#resultsMsg');
  const expert = r.correct === 10;
  msg.textContent = expert ? 'TAHNIAH! ANDA TELAH MENJADI PAKAR KPPB!' : 'TAHNIAH ATAS USAHA ANDA! TERUSKAN MENINGKATKAN PENGUASAAN 3E DAN 3R.';
  msg.classList.toggle('expert', expert);
  const stat = (k, v, wide = false, color = '') => `<div class="stat ${wide ? 'wide' : ''}"><span>${k}</span><b ${color ? `style="color:${color}"` : ''}>${v}</b></div>`;
  $('#resultsStats').innerHTML = [
    stat('JUMLAH SOALAN', r.total),
    stat('JAWAPAN BETUL', r.correct, false, '#8ff0b5'),
    stat('JAWAPAN SALAH', r.wrong, false, '#ffadb5'),
    stat('JUMLAH MARKAH', `${r.score}/${r.max}`),
    stat('PERATUS PENCAPAIAN', `${r.percent}%`, true),
    stat('PANGKAT TERTINGGI', rank.name, true, rank.color),
    stat('LENCANA DIPEROLEH', rank.badgeName.toUpperCase(), true, rank.color),
  ].join('');
  openModal('#modal-results');
  badgeViewer.mount($('#resultsBadge'), ri);
  sfx('victory');
  world.celebrate(ri);
  gsap.fromTo('#resultsStats .stat', { y: 16, opacity: 0 }, { y: 0, opacity: 1, stagger: 0.07, delay: 0.25, duration: 0.35 });
}

$('#btnShowResults').addEventListener('click', showResults);
$('#btnPerf').addEventListener('click', () => {
  $('#perfList').innerHTML = QUESTIONS.map((q, i) => {
    const a = state.quiz.answers[i];
    const ok = isCorrect(i, a);
    return `<div class="perf ${ok ? 'ok' : 'bad'}"><span class="pn">${String(i + 1).padStart(2, '0')}</span>
      <div class="pq">${q.q}<small>JAWAPAN ANDA: ${a === null ? '-' : LETTERS[a]} · JAWAPAN BETUL: ${LETTERS[q.answer]}</small></div>
      <span class="ps">${ok ? 'BETUL +10' : 'SALAH +0'}</span></div>`;
  }).join('');
  openModal('#modal-perf');
});
$('#btnReplay').addEventListener('click', () => {
  closeModal('#modal-results');
  badgeViewer.stop();
  state.quiz.answers = emptyAnswers();
  certId = null;
  state.plays += 1;
  save();
  world.resetArena();
  updateArena();
  world.focusArena(true);
  toast('MISI BAHARU BERMULA! SEMOGA BERJAYA.');
});

// ---------------------------------------------------------------------------
// F: Sijil (pratonton langsung + muat turun PDF terus)
// ---------------------------------------------------------------------------
let certTheme = 'klasik';
let certId = null;
let certDate = '';
let drawQueued = false;

function certData() {
  const r = computeResult(state.quiz.answers);
  return {
    name: $('#inName').value.replace(/\s+/g, ' ').trim(),
    kelas: $('#inKelas').value.replace(/\s+/g, ' ').trim(),
    correct: r.correct,
    score: r.score,
    rankIdx: rankIndexFor(r.correct),
    date: certDate,
    certId,
  };
}

function redrawCert() {
  if (drawQueued) return;
  drawQueued = true;
  requestAnimationFrame(() => {
    drawQueued = false;
    drawCertificate($('#certCanvas'), certData(), certTheme);
  });
}

function replayClass(el, cls) {
  el.classList.toggle(cls, false);
  void el.offsetWidth;
  el.classList.toggle(cls, true);
}

function sparkleCert() {
  replayClass($('#certTilt'), 'shine');
}

$('#btnCert').addEventListener('click', async () => {
  const r = computeResult(state.quiz.answers);
  if (!r.finished) { toast('JAWAB KESEMUA 10 SOALAN DAHULU', true); return; }
  const ri = rankIndexFor(r.correct);
  const rank = RANKS[ri];
  const now = new Date();
  certDate = formatTarikh(now);
  certId = certId || localCertId(now);
  $('#themeBadgeSwatch').style.setProperty('--b', rank.key === 'pemula' ? '#9c8a94' : rank.color);
  $('#certSummary').innerHTML = `<span class="chip c-gold">MARKAH ${r.score}/100</span><span class="chip c-green">BETUL ${r.correct}/10</span><span class="chip c-pink">${rank.name}</span><span class="chip c-blue">${rank.badge ? rank.badge.toUpperCase() : 'TIADA LENCANA'}</span>`;
  $('#errName').textContent = '';
  $('#errKelas').textContent = '';
  $('#certStatus').innerHTML = '';
  openModal('#modal-cert');
  await loadCertFonts();
  redrawCert();
  setTimeout(sparkleCert, 300);
  if (window.matchMedia('(pointer: fine)').matches) setTimeout(() => $('#inName').focus(), 350);
});

['#inName', '#inKelas'].forEach((id) => $(id).addEventListener('input', () => {
  $(id).classList.toggle('invalid', false);
  $(id === '#inName' ? '#errName' : '#errKelas').textContent = '';
  redrawCert();
}));
['#inName', '#inKelas'].forEach((id) => $(id).addEventListener('change', sparkleCert));

$$('#themeRow .theme-btn').forEach((b) => b.addEventListener('click', () => {
  certTheme = b.dataset.theme;
  $$('#themeRow .theme-btn').forEach((o) => o.classList.toggle('on', o === b));
  sfx('select');
  redrawCert();
  replayClass($('#certTilt'), 'pop');
  sparkleCert();
}));

// kesan condong 3D pada pratonton
(() => {
  const el = $('#certTilt');
  el.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    el.style.transform = `rotateY(${x * 10}deg) rotateX(${-y * 8}deg)`;
  });
  el.addEventListener('pointerleave', () => { el.style.transform = ''; });
})();

$('#certForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const d = certData();
  const errs = validateForm(d.name, d.kelas);
  $('#errName').textContent = errs.name || '';
  $('#errKelas').textContent = errs.kelas || '';
  $('#inName').classList.toggle('invalid', !!errs.name);
  $('#inKelas').classList.toggle('invalid', !!errs.kelas);
  if (errs.name || errs.kelas) { sfx('error'); (errs.name ? $('#inName') : $('#inKelas')).focus(); return; }
  const r = computeResult(state.quiz.answers);
  if (!r.finished) { toast('JAWAB KESEMUA 10 SOALAN DAHULU', true); return; }
  const rank = RANKS[d.rankIdx];
  const btn = $('#btnGenerate');
  btn.disabled = true;
  btn.textContent = 'MENJANA PDF...';
  try {
    const doc = await buildCertificate(d, certTheme);
    const file = certFileName(d.name);
    doc.save(file);
    sfx('victory');
    world.celebrate(Math.max(1, d.rankIdx));
    sparkleCert();
    $('#certStatus').innerHTML = `<span class="ok">✔ Sijil dimuat turun: <b>${file}</b></span>`;
    btn.innerHTML = '<i data-lucide="download"></i> MUAT TURUN SEMULA';
    // Rekod ke Google Sheet (pilihan): berjalan di latar, tidak menghalang muat turun
    if (sheetConfigured()) {
      sendToSheet({
        nama: d.name, kelas: d.kelas, noSijil: d.certId, jawapan: answersToString(state.quiz.answers),
        markah: r.score, betul: r.correct, pangkat: rank.name, lencana: rank.badge || 'Tiada', tarikh: d.date, sumber: location.host,
      }).then((res) => {
        if (res.ok && res.simpanPdf && res.token) uploadPdfToSheet(doc, res.certificateId, res.token);
        $('#certStatus').insertAdjacentHTML('beforeend', res.ok
          ? '<br><span class="ok" id="sheetStatus">✔ Rekod disimpan dalam Google Sheet penganjur.</span>'
          : '<br><span class="warn" id="sheetStatus">⚠ Rekod tidak dapat dihantar ke Google Sheet (sijil anda tetap sah).</span>');
      });
    }
  } catch (err) {
    console.error(err);
    toast('RALAT SEMASA MENJANA SIJIL. SILA CUBA LAGI.', true);
    btn.innerHTML = '<i data-lucide="download"></i> MUAT TURUN SIJIL (PDF)';
  } finally {
    btn.disabled = false;
    icons();
  }
});

// ---------------------------------------------------------------------------
// Mula
// ---------------------------------------------------------------------------
async function boot() {
  buildBackground();
  buildTitleTiles();
  icons();
  refreshAudioButtons();
  const bar = $('#loadBar');
  bar.style.width = '20%';
  try {
    await Promise.race([
      Promise.all([document.fonts.load('20px "Press Start 2P"'), document.fonts.load('600 16px Montserrat')]),
      new Promise((r) => setTimeout(r, 2500)),
    ]);
  } catch { /* teruskan walaupun fon gagal */ }
  bar.style.width = '55%';
  await new Promise((r) => requestAnimationFrame(r));
  try {
    world.init();
  } catch (err) {
    console.error(err);
    $('.load-text').textContent = 'PELAYAR ANDA TIDAK MENYOKONG WEBGL.';
    return;
  }
  bar.style.width = '100%';
  setScreen('home');
  renderHome();
  updateArena();
  setTimeout(() => {
    $('#loading').classList.add('done');
    animateHome();
  }, 350);
}

window.__kppb = { state, world, computeResult: () => computeResult(state.quiz.answers) };
boot();
