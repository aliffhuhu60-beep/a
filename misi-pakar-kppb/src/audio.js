// Audio chiptune disintesis dengan Web Audio API (tiada fail bunyi luaran).

const NOTE = (n) => 440 * Math.pow(2, (n - 69) / 12);

export class AudioManager {
  constructor(settings) {
    this.musicOn = settings.music !== false;
    this.sfxOn = settings.sfx !== false;
    this.ctx = null;
    this.musicTimer = null;
    this.step = 0;
    this.nextTime = 0;
  }

  // Mesti dipanggil selepas interaksi pengguna pertama (dasar autoplay pelayar).
  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.9;
      this.master.connect(this.ctx.destination);
      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = 0.0;
      this.musicGain.connect(this.master);
      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = 0.5;
      this.sfxGain.connect(this.master);
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
    if (this.musicOn) this.startMusic();
  }

  setMusic(on) {
    this.musicOn = on;
    if (!this.ctx) return;
    if (on) this.startMusic();
    else this.stopMusic();
  }

  setSfx(on) {
    this.sfxOn = on;
  }

  // ---------- Muzik latar ----------
  startMusic() {
    if (!this.ctx || this.musicTimer) return;
    const g = this.musicGain.gain;
    g.cancelScheduledValues(this.ctx.currentTime);
    g.setTargetAtTime(0.16, this.ctx.currentTime, 0.6);
    this.nextTime = this.ctx.currentTime + 0.1;
    this.musicTimer = setInterval(() => this.scheduleMusic(), 60);
  }

  stopMusic() {
    if (!this.ctx) return;
    clearInterval(this.musicTimer);
    this.musicTimer = null;
    const g = this.musicGain.gain;
    g.cancelScheduledValues(this.ctx.currentTime);
    g.setTargetAtTime(0, this.ctx.currentTime, 0.15);
  }

  scheduleMusic() {
    const spb = 60 / 104 / 2; // lapan not seminit, 104 BPM
    // Progresi: Dm - Bb - F - C (nada lembut, sesuai untuk belajar)
    const chords = [
      [62, 65, 69], [58, 62, 65], [65, 69, 72], [60, 64, 67],
    ];
    const bass = [38, 34, 41, 36];
    const melody = [
      74, -1, 72, 69, 72, -1, 74, 77, 74, -1, 72, -1, 70, 69, -1, -1,
      69, -1, 72, 74, 77, -1, 76, 74, 72, -1, 69, -1, 67, -1, -1, -1,
    ];
    while (this.nextTime < this.ctx.currentTime + 0.25) {
      const s = this.step;
      const bar = Math.floor(s / 8) % 4;
      const t = this.nextTime;
      const ch = chords[bar];
      // arpeggio
      this.tone(NOTE(ch[s % 3] + 12), t, spb * 0.9, 'square', 0.035, this.musicGain);
      // bass pada setiap ketukan
      if (s % 2 === 0) this.tone(NOTE(bass[bar]), t, spb * 1.6, 'triangle', 0.16, this.musicGain);
      const m = melody[s % melody.length];
      if (m > 0 && Math.floor(s / 32) % 2 === 1) this.tone(NOTE(m), t, spb * 1.4, 'triangle', 0.07, this.musicGain);
      // hi-hat lembut
      if (s % 2 === 1) this.noise(t, 0.03, 0.025, 7000, this.musicGain);
      this.nextTime += spb;
      this.step++;
    }
  }

  // ---------- Primitif ----------
  tone(freq, t, dur, type = 'square', vol = 0.2, dest = this.sfxGain, slideTo = null) {
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(dest);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  noise(t, dur, vol, freq, dest = this.sfxGain) {
    const len = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const f = this.ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = freq;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(dest);
    src.start(t);
  }

  // ---------- Kesan bunyi ----------
  play(name) {
    if (!this.ctx || !this.sfxOn) return;
    const t = this.ctx.currentTime + 0.005;
    switch (name) {
      case 'click':
        this.tone(880, t, 0.06, 'square', 0.12);
        this.tone(1320, t + 0.03, 0.05, 'square', 0.08);
        break;
      case 'hover':
        this.tone(1200, t, 0.03, 'square', 0.04);
        break;
      case 'page':
        this.tone(523, t, 0.07, 'triangle', 0.18);
        this.tone(784, t + 0.06, 0.09, 'triangle', 0.16);
        break;
      case 'select':
        this.tone(660, t, 0.05, 'square', 0.1);
        break;
      case 'portal':
        this.tone(180, t, 0.7, 'sawtooth', 0.08, this.sfxGain, 900);
        this.noise(t, 0.7, 0.12, 1200);
        break;
      case 'step':
        this.noise(t, 0.05, 0.08, 400);
        break;
      case 'correct':
        [72, 76, 79, 84].forEach((n, i) => this.tone(NOTE(n), t + i * 0.08, 0.16, 'square', 0.14));
        break;
      case 'wrong':
        this.tone(220, t, 0.18, 'square', 0.14, this.sfxGain, 160);
        this.tone(160, t + 0.16, 0.3, 'square', 0.12, this.sfxGain, 110);
        break;
      case 'rankup':
        [60, 64, 67, 72, 67, 72, 76, 79].forEach((n, i) =>
          this.tone(NOTE(n), t + i * 0.09, 0.2, i % 2 ? 'triangle' : 'square', 0.13));
        for (let i = 0; i < 8; i++) this.tone(NOTE(96 + (i % 4) * 2), t + 0.8 + i * 0.05, 0.08, 'triangle', 0.05);
        break;
      case 'victory':
        [67, 67, 67, 72, -1, 76, 74, 79].forEach((n, i) => {
          if (n > 0) this.tone(NOTE(n), t + i * 0.14, 0.3, 'square', 0.13);
        });
        [48, 55, 60].forEach((n) => this.tone(NOTE(n), t + 0.98, 0.9, 'triangle', 0.15));
        break;
      case 'firework':
        this.noise(t, 0.4, 0.15, 900);
        break;
      case 'error':
        this.tone(140, t, 0.15, 'square', 0.12);
        break;
      default:
        break;
    }
  }
}
