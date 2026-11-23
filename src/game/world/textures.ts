import * as THREE from 'three';
import { Rng } from '../engine/rng';

/**
 * All textures are generated procedurally on <canvas> at startup: zero network
 * requests, tiny download size, and every asset is original.
 * Most are greyscale so materials can tint them per theme (texture reuse).
 */
const cache = new Map<string, THREE.Texture>();
let anisotropy = 4;

export const setTextureAnisotropy = (a: number): void => {
  anisotropy = a;
};

const canvas = (w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] => {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  if (!ctx) throw new Error('2D canvas not supported');
  return [c, ctx];
};

const finish = (key: string, c: HTMLCanvasElement, opts: { repeat?: boolean; srgb?: boolean } = {}): THREE.Texture => {
  const tex = new THREE.CanvasTexture(c);
  if (opts.repeat) {
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
  }
  if (opts.srgb !== false) tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = anisotropy;
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  cache.set(key, tex);
  return tex;
};

const cached = (key: string, make: () => THREE.Texture): THREE.Texture => cache.get(key) ?? make();

const noise = (ctx: CanvasRenderingContext2D, w: number, h: number, amount: number, seed: number, alpha = 0.18): void => {
  const rng = new Rng(seed);
  for (let i = 0; i < amount; i++) {
    const v = Math.floor(rng.range(0, 255));
    ctx.fillStyle = `rgba(${v},${v},${v},${alpha})`;
    const s = rng.range(1, 3);
    ctx.fillRect(rng.range(0, w), rng.range(0, h), s, s);
  }
};

/** Railway bed covering the 3 lanes: gravel + sleepers. U = across track, V = along track (4 m). */
export const trackTexture = (): THREE.Texture =>
  cached('track', () => {
    const [c, ctx] = canvas(512, 256);
    ctx.fillStyle = '#8a8580';
    ctx.fillRect(0, 0, 512, 256);
    noise(ctx, 512, 256, 9000, 11, 0.35);
    const laneW = 512 / 3.5;
    for (let lane = 0; lane < 3; lane++) {
      const cx = 512 / 2 + (lane - 1) * (512 / 3.55);
      for (let i = 0; i < 5; i++) {
        const y = i * (256 / 5) + 8;
        ctx.fillStyle = '#4a3b30';
        ctx.fillRect(cx - laneW * 0.42, y, laneW * 0.84, 18);
        ctx.fillStyle = 'rgba(0,0,0,0.25)';
        ctx.fillRect(cx - laneW * 0.42, y + 15, laneW * 0.84, 4);
      }
    }
    return finish('track', c, { repeat: true });
  });

/** Pavement tiles for the ground either side of the track. */
export const pavementTexture = (): THREE.Texture =>
  cached('pavement', () => {
    const [c, ctx] = canvas(256, 256);
    ctx.fillStyle = '#bdbdbd';
    ctx.fillRect(0, 0, 256, 256);
    noise(ctx, 256, 256, 3000, 7, 0.12);
    ctx.strokeStyle = 'rgba(0,0,0,0.25)';
    ctx.lineWidth = 3;
    for (let i = 0; i <= 4; i++) {
      ctx.beginPath();
      ctx.moveTo(i * 64, 0);
      ctx.lineTo(i * 64, 256);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i * 64);
      ctx.lineTo(256, i * 64);
      ctx.stroke();
    }
    return finish('pavement', c, { repeat: true });
  });

export const concreteTexture = (): THREE.Texture =>
  cached('concrete', () => {
    const [c, ctx] = canvas(256, 256);
    ctx.fillStyle = '#a7a7a7';
    ctx.fillRect(0, 0, 256, 256);
    noise(ctx, 256, 256, 6000, 3, 0.16);
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    for (let i = 0; i < 4; i++) ctx.fillRect(i * 64, 0, 2, 256);
    return finish('concrete', c, { repeat: true });
  });

export const stripeTexture = (a = '#f2c014', b = '#1a1a1a'): THREE.Texture =>
  cached(`stripe-${a}-${b}`, () => {
    const [c, ctx] = canvas(128, 128);
    ctx.fillStyle = b;
    ctx.fillRect(0, 0, 128, 128);
    ctx.fillStyle = a;
    for (let i = -128; i < 256; i += 48) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i + 24, 0);
      ctx.lineTo(i + 24 + 128, 128);
      ctx.lineTo(i + 128, 128);
      ctx.closePath();
      ctx.fill();
    }
    return finish(`stripe-${a}-${b}`, c, { repeat: true });
  });

export const crateTexture = (variant: number): THREE.Texture =>
  cached(`crate-${variant}`, () => {
    const [c, ctx] = canvas(256, 256);
    const base = ['#b07a3c', '#3c7bb0', '#b03c48'][variant % 3];
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, 256, 256);
    noise(ctx, 256, 256, 2000, 20 + variant, 0.12);
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    for (let i = 0; i < 256; i += 32) ctx.fillRect(i, 0, 4, 256);
    ctx.strokeStyle = 'rgba(0,0,0,0.5)';
    ctx.lineWidth = 14;
    ctx.strokeRect(7, 7, 242, 242);
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.font = 'bold 34px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(['CARGO', 'FRAGILE', 'CD-EXP'][variant % 3], 128, 140);
    return finish(`crate-${variant}`, c);
  });

/** Train body side: windows band, livery stripe and an original logo. */
export const trainSideTexture = (variant: number): THREE.Texture =>
  cached(`train-side-${variant}`, () => {
    const [c, ctx] = canvas(512, 128);
    const liveries = [
      { body: '#d9dde3', stripe: '#1f6fd1', accent: '#f6b21b' },
      { body: '#c43b2e', stripe: '#262626', accent: '#f1f1f1' },
      { body: '#2b2f3a', stripe: '#00e5ff', accent: '#ff2fb4' },
    ];
    const l = liveries[variant % liveries.length];
    ctx.fillStyle = l.body;
    ctx.fillRect(0, 0, 512, 128);
    ctx.fillStyle = l.stripe;
    ctx.fillRect(0, 84, 512, 16);
    ctx.fillStyle = l.accent;
    ctx.fillRect(0, 100, 512, 5);
    for (let i = 0; i < 8; i++) {
      const x = 16 + i * 62;
      ctx.fillStyle = '#1b2a3a';
      ctx.fillRect(x, 26, 44, 40);
      ctx.fillStyle = 'rgba(170,220,255,0.35)';
      ctx.fillRect(x + 4, 28, 14, 36);
    }
    // doors
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(238, 20, 36, 92);
    ctx.fillStyle = l.accent;
    ctx.font = 'bold 18px sans-serif';
    ctx.fillText('CD METRO', 380, 120);
    noise(ctx, 512, 128, 1200, 40 + variant, 0.08);
    return finish(`train-side-${variant}`, c);
  });

export const trainFrontTexture = (variant: number): THREE.Texture =>
  cached(`train-front-${variant}`, () => {
    const [c, ctx] = canvas(128, 192);
    const body = ['#d9dde3', '#c43b2e', '#2b2f3a'][variant % 3];
    const stripe = ['#1f6fd1', '#262626', '#00e5ff'][variant % 3];
    ctx.fillStyle = body;
    ctx.fillRect(0, 0, 128, 192);
    ctx.fillStyle = '#122030';
    ctx.beginPath();
    ctx.roundRect(14, 26, 100, 62, 10);
    ctx.fill();
    ctx.fillStyle = 'rgba(160,210,255,0.3)';
    ctx.fillRect(22, 32, 30, 50);
    ctx.fillStyle = stripe;
    ctx.fillRect(0, 128, 128, 16);
    ctx.fillStyle = '#fff8d0';
    ctx.beginPath();
    ctx.arc(28, 160, 9, 0, Math.PI * 2);
    ctx.arc(100, 160, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#111';
    ctx.font = 'bold 16px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(String(100 + variant * 37), 64, 112);
    return finish(`train-front-${variant}`, c);
  });

/** Emissive sign texture for overhead boards. */
export const signTexture = (text: string, bg: string, fg: string): THREE.Texture =>
  cached(`sign-${text}-${bg}`, () => {
    const [c, ctx] = canvas(256, 192);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, 256, 192);
    ctx.strokeStyle = fg;
    ctx.lineWidth = 8;
    ctx.strokeRect(10, 10, 236, 172);
    ctx.fillStyle = fg;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const lines = text.split('\n');
    ctx.font = `bold ${lines.length > 1 ? 44 : 56}px sans-serif`;
    lines.forEach((ln, i) => ctx.fillText(ln, 128, 96 + (i - (lines.length - 1) / 2) * 52));
    return finish(`sign-${text}-${bg}`, c);
  });

/** Original fictional advertisements for digital billboards (2 frames stacked vertically). */
export const AD_COUNT = 6;
export const adTexture = (index: number): THREE.Texture =>
  cached(`ad-${index}`, () => {
    const ads = [
      { a: 'ZOOM COLA', b: 'Taste the speed', c1: '#e8262f', c2: '#ffd23f' },
      { a: 'NEONIX', b: 'Glow beyond limits', c1: '#7b2ff7', c2: '#00f0ff' },
      { a: 'CITY DASH', b: 'Run the city!', c1: '#ff7a00', c2: '#ffffff' },
      { a: 'SKYRAIL', b: 'Next stop: tomorrow', c1: '#0077ff', c2: '#bfe6ff' },
      { a: 'BYTE BURGER', b: '8-bit flavour', c1: '#2bb673', c2: '#fff26b' },
      { a: 'PIXELWAVE FM', b: '101.7 all night', c1: '#ff2fb4', c2: '#2b0b3f' },
    ];
    const ad = ads[index % ads.length];
    const [c, ctx] = canvas(512, 512);
    for (let f = 0; f < 2; f++) {
      const y0 = f * 256;
      const g = ctx.createLinearGradient(0, y0, 512, y0 + 256);
      g.addColorStop(0, f === 0 ? ad.c1 : ad.c2);
      g.addColorStop(1, f === 0 ? ad.c2 : ad.c1);
      ctx.fillStyle = g;
      ctx.fillRect(0, y0, 512, 256);
      ctx.fillStyle = 'rgba(255,255,255,0.12)';
      for (let i = 0; i < 6; i++) ctx.fillRect(0, y0 + i * 44, 512, 18);
      ctx.fillStyle = f === 0 ? '#ffffff' : '#111111';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = 'bold 72px sans-serif';
      ctx.fillText(ad.a, 256, y0 + 110);
      ctx.font = '600 34px sans-serif';
      ctx.fillText(ad.b, 256, y0 + 185);
    }
    return finish(`ad-${index}`, c);
  });

/** City skyline silhouette strip (alpha) for the far background. */
export const skylineTexture = (seed: number): THREE.Texture =>
  cached(`skyline-${seed}`, () => {
    const [c, ctx] = canvas(1024, 256);
    const rng = new Rng(seed);
    ctx.clearRect(0, 0, 1024, 256);
    let x = 0;
    while (x < 1024) {
      const w = rng.range(30, 90);
      const h = rng.range(60, 230);
      ctx.fillStyle = `rgba(255,255,255,${rng.range(0.75, 1)})`;
      ctx.fillRect(x, 256 - h, w, h);
      if (rng.chance(0.3)) ctx.fillRect(x + w / 2 - 2, 256 - h - rng.range(10, 40), 4, 40);
      // window dots
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      for (let wy = 256 - h + 8; wy < 250; wy += 12)
        for (let wx = x + 5; wx < x + w - 5; wx += 9) if (rng.chance(0.5)) ctx.fillRect(wx, wy, 4, 5);
      x += w + rng.range(-10, 6);
    }
    const tex = finish(`skyline-${seed}`, c, { repeat: true });
    tex.wrapT = THREE.ClampToEdgeWrapping;
    return tex;
  });

/** Vertical sky gradient used as scene background. */
export const skyTexture = (top: string, bottom: string, key: string): THREE.Texture =>
  cached(`sky-${key}`, () => {
    const [c, ctx] = canvas(4, 256);
    const g = ctx.createLinearGradient(0, 0, 0, 256);
    g.addColorStop(0, top);
    g.addColorStop(0.75, bottom);
    g.addColorStop(1, bottom);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 4, 256);
    return finish(`sky-${key}`, c);
  });

/** Soft radial glow sprite. */
export const glowTexture = (): THREE.Texture =>
  cached('glow', () => {
    const [c, ctx] = canvas(128, 128);
    const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.25, 'rgba(255,255,255,0.6)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);
    return finish('glow', c);
  });

/** Coin face with an embossed original "dash" emblem. */
export const coinFaceTexture = (): THREE.Texture =>
  cached('coin', () => {
    const [c, ctx] = canvas(128, 128);
    const g = ctx.createRadialGradient(54, 50, 6, 64, 64, 64);
    g.addColorStop(0, '#fff6b0');
    g.addColorStop(0.6, '#ffc21a');
    g.addColorStop(1, '#c98200');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(64, 64, 64, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#a86a00';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(64, 64, 52, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#b37300';
    ctx.beginPath();
    // lightning-dash emblem
    ctx.moveTo(72, 22);
    ctx.lineTo(42, 70);
    ctx.lineTo(62, 70);
    ctx.lineTo(54, 106);
    ctx.lineTo(88, 54);
    ctx.lineTo(68, 54);
    ctx.closePath();
    ctx.fill();
    return finish('coin', c);
  });

export const tunnelTexture = (): THREE.Texture =>
  cached('tunnel', () => {
    const [c, ctx] = canvas(256, 256);
    ctx.fillStyle = '#5b5e66';
    ctx.fillRect(0, 0, 256, 256);
    noise(ctx, 256, 256, 5000, 5, 0.18);
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    for (let y = 0; y < 256; y += 32) ctx.fillRect(0, y, 256, 3);
    for (let y = 0; y < 256; y += 32) for (let x = (y / 32) % 2 ? 0 : 32; x < 256; x += 64) ctx.fillRect(x, y, 3, 32);
    return finish('tunnel', c, { repeat: true });
  });

export const disposeTextures = (): void => {
  cache.forEach((t) => t.dispose());
  cache.clear();
};
