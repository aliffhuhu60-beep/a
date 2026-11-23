import { Howl, Howler } from 'howler';
import { SFX_NAMES, encodeWav, renderMusic, renderSfx, type MusicName, type SfxName } from './synth';

/**
 * Audio: SFX are AudioBuffers played on Howler's shared Web Audio context
 * (lowest latency, per-play pitch variation); music loops are Howl instances.
 * Music and SFX volumes are controlled independently.
 */
class AudioManagerImpl {
  private buffers = new Map<SfxName, AudioBuffer>();
  private music = new Map<MusicName, Howl>();
  private musicLoading = new Map<MusicName, Promise<Howl | null>>();
  private sfxGain: GainNode | null = null;
  private current: MusicName | null = null;
  private currentId: number | null = null;
  private loops = new Map<string, { src: AudioBufferSourceNode; gain: GainNode }>();
  private musicVolume = 0.6;
  private sfxVolume = 0.8;
  private ready = false;
  private wanted: MusicName | null = null;
  supported = typeof window !== 'undefined' && typeof OfflineAudioContext !== 'undefined';

  private get ctx(): AudioContext | null {
    return (Howler.ctx as AudioContext | undefined) ?? null;
  }

  async init(onProgress?: (p: number) => void): Promise<void> {
    if (!this.supported || this.ready) return;
    try {
      Howler.volume(1); // creates Howler.ctx + masterGain
      Howler.autoUnlock = true;
      const ctx = this.ctx;
      if (ctx && Howler.masterGain) {
        this.sfxGain = ctx.createGain();
        this.sfxGain.gain.value = this.sfxVolume;
        this.sfxGain.connect(Howler.masterGain);
      }
      let done = 0;
      await Promise.all(
        SFX_NAMES.map(async (n) => {
          this.buffers.set(n, await renderSfx(n, ctx?.sampleRate ?? 44100));
          onProgress?.(++done / SFX_NAMES.length);
        }),
      );
      this.ready = true;
    } catch (err) {
      console.warn('[audio] disabled:', err);
      this.supported = false;
    }
  }

  setVolumes(music: number, sfx: number): void {
    this.musicVolume = music;
    this.sfxVolume = sfx;
    if (this.sfxGain && this.ctx) this.sfxGain.gain.setTargetAtTime(sfx, this.ctx.currentTime, 0.02);
    if (this.current) this.music.get(this.current)?.volume(music);
  }

  play(name: SfxName, opts: { rate?: number; volume?: number; detune?: number } = {}): void {
    const ctx = this.ctx;
    const buf = this.buffers.get(name);
    if (!ctx || !buf || !this.sfxGain || this.sfxVolume <= 0) return;
    if (ctx.state !== 'running') void ctx.resume().catch(() => undefined);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.playbackRate.value = opts.rate ?? 1;
    if (opts.detune) src.detune.value = opts.detune;
    const g = ctx.createGain();
    g.gain.value = opts.volume ?? 1;
    src.connect(g).connect(this.sfxGain);
    src.start();
  }

  /** Looping SFX (jetpack burner). */
  startLoop(key: string, name: SfxName, volume = 0.6): void {
    const ctx = this.ctx;
    const buf = this.buffers.get(name);
    if (!ctx || !buf || !this.sfxGain || this.loops.has(key)) return;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    const gain = ctx.createGain();
    gain.gain.value = volume;
    src.connect(gain).connect(this.sfxGain);
    src.start();
    this.loops.set(key, { src, gain });
  }

  stopLoop(key: string): void {
    const l = this.loops.get(key);
    if (!l) return;
    const ctx = this.ctx;
    if (ctx) {
      l.gain.gain.setTargetAtTime(0, ctx.currentTime, 0.08);
      l.src.stop(ctx.currentTime + 0.4);
    }
    this.loops.delete(key);
  }

  stopAllLoops(): void {
    for (const k of [...this.loops.keys()]) this.stopLoop(k);
  }

  private loadMusic(name: MusicName): Promise<Howl | null> {
    const existing = this.musicLoading.get(name);
    if (existing) return existing;
    const p = (async () => {
      try {
        const buffer = await renderMusic(name);
        const url = URL.createObjectURL(encodeWav(buffer));
        const howl = new Howl({ src: [url], format: ['wav'], loop: true, volume: 0 });
        this.music.set(name, howl);
        return howl;
      } catch (err) {
        console.warn('[audio] music failed', err);
        return null;
      }
    })();
    this.musicLoading.set(name, p);
    return p;
  }

  /** Cross-fades to a music loop (rendered lazily on first use). */
  async playMusic(name: MusicName): Promise<void> {
    if (!this.supported) return;
    this.wanted = name;
    if (this.current === name) return;
    const howl = await this.loadMusic(name);
    if (!howl || this.wanted !== name) return;
    const prev = this.current ? this.music.get(this.current) : null;
    const prevId = this.currentId;
    if (prev) {
      prev.fade(prev.volume(), 0, 600, prevId ?? undefined);
      setTimeout(() => prev.stop(prevId ?? undefined), 650);
    }
    this.current = name;
    this.currentId = howl.play();
    howl.fade(0, this.musicVolume, 800, this.currentId);
  }

  /** Pre-renders theme tracks in the background after the menu is up. */
  preloadMusic(names: MusicName[]): void {
    let chain = Promise.resolve();
    for (const n of names) chain = chain.then(() => this.loadMusic(n).then(() => undefined));
  }

  setMusicRate(rate: number): void {
    if (!this.current) return;
    this.music.get(this.current)?.rate(rate, this.currentId ?? undefined);
  }

  pauseMusic(paused: boolean): void {
    if (!this.current) return;
    const h = this.music.get(this.current);
    if (!h) return;
    if (paused) h.pause(this.currentId ?? undefined);
    else if (!h.playing(this.currentId ?? undefined)) h.play(this.currentId ?? undefined);
  }
}

export const AudioManager = new AudioManagerImpl();
export type { SfxName, MusicName };
