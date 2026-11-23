/**
 * Original sound design, synthesised at load time with OfflineAudioContext.
 * No audio files are downloaded and nothing is copied from other games.
 */
export type SfxName =
  | 'coin'
  | 'jump'
  | 'slide'
  | 'land'
  | 'lane'
  | 'powerup'
  | 'shieldBreak'
  | 'crash'
  | 'gameover'
  | 'click'
  | 'beep'
  | 'go'
  | 'horn'
  | 'step'
  | 'stumble'
  | 'achievement'
  | 'jetpack'
  | 'buy';

export type MusicName = 'menu' | 'modern' | 'railway' | 'neon';

type Ctx = OfflineAudioContext;

const noiseBuffer = (ctx: BaseAudioContext, seconds: number): AudioBuffer => {
  const b = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * seconds), ctx.sampleRate);
  const d = b.getChannelData(0);
  let seed = 12345;
  for (let i = 0; i < d.length; i++) {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    d[i] = (seed / 0x7fffffff) * 2 - 1;
  }
  return b;
};

const env = (g: GainNode, t: number, a: number, peak: number, dec: number, end = 0.0001): void => {
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + a);
  g.gain.exponentialRampToValueAtTime(end, t + a + dec);
};

const tone = (ctx: Ctx, out: AudioNode, type: OscillatorType, f0: number, f1: number, t: number, dur: number, peak: number, attack = 0.005): void => {
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f0, t);
  if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
  env(g, t, attack, peak, dur);
  o.connect(g).connect(out);
  o.start(t);
  o.stop(t + attack + dur + 0.02);
};

const noise = (ctx: Ctx, out: AudioNode, t: number, dur: number, peak: number, filter: BiquadFilterType, f0: number, f1 = f0, q = 1, attack = 0.005): void => {
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer(ctx, dur + attack + 0.05);
  const f = ctx.createBiquadFilter();
  f.type = filter;
  f.Q.value = q;
  f.frequency.setValueAtTime(f0, t);
  if (f1 !== f0) f.frequency.exponentialRampToValueAtTime(f1, t + dur);
  const g = ctx.createGain();
  env(g, t, attack, peak, dur);
  src.connect(f).connect(g).connect(out);
  src.start(t);
};

const SFX: Record<SfxName, { dur: number; draw: (ctx: Ctx, out: AudioNode) => void }> = {
  coin: { dur: 0.3, draw: (c, o) => { tone(c, o, 'square', 1318, 1318, 0, 0.06, 0.18); tone(c, o, 'square', 1975, 1975, 0.055, 0.2, 0.16); tone(c, o, 'sine', 3950, 3950, 0.055, 0.15, 0.05); } },
  jump: { dur: 0.35, draw: (c, o) => { tone(c, o, 'triangle', 260, 720, 0, 0.18, 0.35); noise(c, o, 0, 0.25, 0.15, 'bandpass', 800, 3000, 1.5); } },
  slide: { dur: 0.5, draw: (c, o) => { noise(c, o, 0, 0.45, 0.35, 'lowpass', 2500, 400, 0.7, 0.02); tone(c, o, 'sine', 180, 90, 0, 0.3, 0.2); } },
  land: { dur: 0.25, draw: (c, o) => { tone(c, o, 'sine', 140, 50, 0, 0.18, 0.6); noise(c, o, 0, 0.12, 0.25, 'lowpass', 900, 200); } },
  lane: { dur: 0.18, draw: (c, o) => { noise(c, o, 0, 0.14, 0.22, 'bandpass', 1200, 3500, 2); } },
  powerup: { dur: 0.7, draw: (c, o) => { [523, 659, 784, 1046, 1318].forEach((f, i) => tone(c, o, 'square', f, f, i * 0.07, 0.2, 0.12)); tone(c, o, 'sine', 400, 1600, 0, 0.6, 0.15); } },
  shieldBreak: { dur: 0.7, draw: (c, o) => { noise(c, o, 0, 0.5, 0.5, 'highpass', 3000, 6000, 0.8); [2093, 2637, 3136].forEach((f, i) => tone(c, o, 'sine', f, f * 0.9, i * 0.03, 0.45, 0.12)); } },
  crash: { dur: 0.9, draw: (c, o) => { noise(c, o, 0, 0.6, 0.9, 'lowpass', 3000, 150, 0.7); tone(c, o, 'sine', 120, 35, 0, 0.7, 0.9); tone(c, o, 'sawtooth', 220, 60, 0, 0.3, 0.2); } },
  gameover: { dur: 1.4, draw: (c, o) => { [392, 349, 311, 262].forEach((f, i) => tone(c, o, 'triangle', f, f * 0.98, i * 0.22, 0.4, 0.28, 0.01)); } },
  click: { dur: 0.08, draw: (c, o) => { tone(c, o, 'square', 1800, 1200, 0, 0.04, 0.12); } },
  beep: { dur: 0.25, draw: (c, o) => { tone(c, o, 'square', 660, 660, 0, 0.18, 0.2); } },
  go: { dur: 0.5, draw: (c, o) => { tone(c, o, 'square', 1320, 1320, 0, 0.4, 0.22); tone(c, o, 'square', 990, 990, 0, 0.4, 0.12); } },
  horn: { dur: 1.1, draw: (c, o) => { tone(c, o, 'sawtooth', 311, 305, 0, 0.9, 0.18, 0.05); tone(c, o, 'sawtooth', 392, 386, 0, 0.9, 0.15, 0.05); } },
  step: { dur: 0.08, draw: (c, o) => { noise(c, o, 0, 0.05, 0.35, 'lowpass', 1400, 300); tone(c, o, 'sine', 110, 60, 0, 0.05, 0.25); } },
  stumble: { dur: 0.45, draw: (c, o) => { tone(c, o, 'sine', 160, 60, 0, 0.25, 0.6); noise(c, o, 0, 0.2, 0.4, 'lowpass', 1500, 200); tone(c, o, 'square', 300, 200, 0.05, 0.2, 0.1); } },
  achievement: { dur: 1.1, draw: (c, o) => { [523, 659, 784].forEach((f, i) => tone(c, o, 'square', f, f, i * 0.1, 0.15, 0.14)); [1046, 1318].forEach((f) => tone(c, o, 'square', f, f, 0.32, 0.6, 0.12)); } },
  jetpack: { dur: 1.0, draw: (c, o) => { noise(c, o, 0, 1.0, 0.35, 'bandpass', 700, 700, 0.6, 0.002); } },
  buy: { dur: 0.5, draw: (c, o) => { tone(c, o, 'square', 988, 988, 0, 0.08, 0.15); tone(c, o, 'square', 1318, 1318, 0.09, 0.3, 0.15); } },
};

export const renderSfx = async (name: SfxName, sampleRate = 44100): Promise<AudioBuffer> => {
  const def = SFX[name];
  const ctx = new OfflineAudioContext(1, Math.ceil(sampleRate * def.dur), sampleRate);
  const master = ctx.createGain();
  master.gain.value = 0.9;
  master.connect(ctx.destination);
  def.draw(ctx, master);
  return ctx.startRendering();
};

export const SFX_NAMES = Object.keys(SFX) as SfxName[];

// ------------------------------- Music --------------------------------------

interface Song {
  bpm: number;
  /** Chord roots (MIDI) per bar, 8 bars. */
  roots: number[];
  minor: boolean;
  lead: OscillatorType;
  arp: number[];
  drums: 'four' | 'break' | 'chill';
  brightness: number;
}

const SONGS: Record<MusicName, Song> = {
  menu: { bpm: 96, roots: [57, 53, 48, 55, 57, 53, 48, 55], minor: true, lead: 'triangle', arp: [0, 7, 12, 7], drums: 'chill', brightness: 1400 },
  modern: { bpm: 124, roots: [48, 55, 57, 53, 48, 55, 53, 55], minor: false, lead: 'square', arp: [0, 4, 7, 12, 7, 4], drums: 'four', brightness: 2600 },
  railway: { bpm: 116, roots: [45, 41, 48, 43, 45, 41, 43, 40], minor: true, lead: 'sawtooth', arp: [0, 3, 7, 10], drums: 'break', brightness: 1900 },
  neon: { bpm: 128, roots: [52, 48, 55, 50, 52, 48, 55, 50], minor: true, lead: 'sawtooth', arp: [0, 7, 12, 15, 12, 7], drums: 'four', brightness: 3200 },
};

const mtof = (m: number): number => 440 * Math.pow(2, (m - 69) / 12);

/** Renders an 8-bar seamless loop for a theme. */
export const renderMusic = async (name: MusicName, sampleRate = 32000): Promise<AudioBuffer> => {
  const song = SONGS[name];
  const beat = 60 / song.bpm;
  const bar = beat * 4;
  const length = bar * 8;
  const ctx = new OfflineAudioContext(2, Math.ceil(sampleRate * length), sampleRate);
  const master = ctx.createGain();
  master.gain.value = 0.55;
  const comp = ctx.createDynamicsCompressor();
  master.connect(comp).connect(ctx.destination);

  const bus = (pan: number, gain: number): GainNode => {
    const g = ctx.createGain();
    g.gain.value = gain;
    const p = ctx.createStereoPanner();
    p.pan.value = pan;
    g.connect(p).connect(master);
    return g;
  };
  const drums = bus(0, 0.9);
  const bass = bus(0, 0.55);
  const pads = bus(-0.25, 0.22);
  const lead = bus(0.3, 0.16);
  const nb = noiseBuffer(ctx, 0.5);

  const kick = (t: number): void => {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.frequency.setValueAtTime(140, t);
    o.frequency.exponentialRampToValueAtTime(42, t + 0.12);
    env(g, t, 0.002, 1, 0.22);
    o.connect(g).connect(drums);
    o.start(t);
    o.stop(t + 0.3);
  };
  const hat = (t: number, open = false): void => {
    const s = ctx.createBufferSource();
    s.buffer = nb;
    const f = ctx.createBiquadFilter();
    f.type = 'highpass';
    f.frequency.value = 7000;
    const g = ctx.createGain();
    env(g, t, 0.001, open ? 0.18 : 0.12, open ? 0.16 : 0.04);
    s.connect(f).connect(g).connect(drums);
    s.start(t);
    s.stop(t + 0.25);
  };
  const snare = (t: number): void => {
    const s = ctx.createBufferSource();
    s.buffer = nb;
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = 1800;
    const g = ctx.createGain();
    env(g, t, 0.001, 0.45, 0.14);
    s.connect(f).connect(g).connect(drums);
    s.start(t);
    s.stop(t + 0.25);
    const o = ctx.createOscillator();
    const og = ctx.createGain();
    o.frequency.setValueAtTime(220, t);
    o.frequency.exponentialRampToValueAtTime(150, t + 0.08);
    env(og, t, 0.001, 0.3, 0.08);
    o.connect(og).connect(drums);
    o.start(t);
    o.stop(t + 0.15);
  };
  const synthNote = (out: AudioNode, type: OscillatorType, midi: number, t: number, dur: number, peak: number, cutoff: number, detune = 0): void => {
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.value = mtof(midi);
    o.detune.value = detune;
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.setValueAtTime(cutoff, t);
    f.frequency.exponentialRampToValueAtTime(Math.max(200, cutoff * 0.35), t + dur);
    const g = ctx.createGain();
    env(g, t, 0.01, peak, dur);
    o.connect(f).connect(g).connect(out);
    o.start(t);
    o.stop(t + dur + 0.05);
  };

  const third = song.minor ? 3 : 4;
  for (let b = 0; b < 8; b++) {
    const t0 = b * bar;
    const root = song.roots[b];
    // drums
    for (let s = 0; s < 16; s++) {
      const t = t0 + s * (beat / 4);
      if (song.drums === 'four' && s % 4 === 0) kick(t);
      if (song.drums === 'break' && (s === 0 || s === 6 || s === 10)) kick(t);
      if (song.drums === 'chill' && (s === 0 || s === 10)) kick(t);
      if ((s === 4 || s === 12) && song.drums !== 'chill') snare(t);
      if (song.drums === 'chill' && s === 12) snare(t);
      if (s % 2 === 0) hat(t + (song.drums === 'break' && s % 4 === 2 ? beat * 0.06 : 0), s % 8 === 6);
    }
    // bass: eighth notes with octave bounce
    for (let s = 0; s < 8; s++) {
      const t = t0 + s * (beat / 2);
      const n = root - 12 + (s % 4 === 3 ? 12 : s % 4 === 2 ? 7 : 0);
      synthNote(bass, 'sawtooth', n, t, beat * 0.45, 0.5, song.brightness * 0.5);
    }
    // pad chord (root, third, fifth) held for the bar
    for (const iv of [0, third, 7, 12]) {
      synthNote(pads, 'sawtooth', root + iv, t0, bar * 0.95, 0.16, 1400, -8);
      synthNote(pads, 'triangle', root + iv, t0, bar * 0.95, 0.12, 2000, 8);
    }
    // arpeggio lead (skip in first two bars of the menu for an intro feel)
    if (name === 'menu' && b < 2) continue;
    const steps = name === 'menu' ? 8 : 16;
    for (let s = 0; s < steps; s++) {
      const t = t0 + s * (bar / steps);
      const iv = song.arp[s % song.arp.length];
      const n = root + 12 + (iv === 4 || iv === 3 ? third : iv);
      synthNote(lead, song.lead, n, t, (bar / steps) * 0.8, 0.35, song.brightness);
    }
  }
  return ctx.startRendering();
};

/** Encodes an AudioBuffer as 16-bit PCM WAV so Howler can stream/loop it. */
export const encodeWav = (buffer: AudioBuffer): Blob => {
  const ch = buffer.numberOfChannels;
  const len = buffer.length * ch * 2 + 44;
  const view = new DataView(new ArrayBuffer(len));
  const write = (o: number, s: string): void => {
    for (let i = 0; i < s.length; i++) view.setUint8(o + i, s.charCodeAt(i));
  };
  write(0, 'RIFF');
  view.setUint32(4, len - 8, true);
  write(8, 'WAVE');
  write(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, ch, true);
  view.setUint32(24, buffer.sampleRate, true);
  view.setUint32(28, buffer.sampleRate * ch * 2, true);
  view.setUint16(32, ch * 2, true);
  view.setUint16(34, 16, true);
  write(36, 'data');
  view.setUint32(40, buffer.length * ch * 2, true);
  const chans = Array.from({ length: ch }, (_, i) => buffer.getChannelData(i));
  let o = 44;
  for (let i = 0; i < buffer.length; i++) {
    for (let c = 0; c < ch; c++) {
      const v = Math.max(-1, Math.min(1, chans[c][i]));
      view.setInt16(o, v < 0 ? v * 0x8000 : v * 0x7fff, true);
      o += 2;
    }
  }
  return new Blob([view.buffer], { type: 'audio/wav' });
};
