// Dunia 3D voxel isometrik (Three.js): Halaman Utama, Pusat Pembelajaran dan Arena Misi KPPB.
import * as THREE from 'three';
import gsap from 'gsap';
import { createBadgeModel, RANKS } from './ranking.js';

const PIX = '"Press Start 2P", monospace';

export const PAL = {
  tileA: 0xf1e7da, tileB: 0xe3d4c2,
  wallA: 0xf6f2ee, wallB: 0xe9e3dd,
  plum: 0x3d1828, plumDark: 0x2a0f1c,
  maroon: 0x7a2442, maroonDark: 0x561831, rose: 0x9c3456, roseLight: 0xb8456a,
  red: 0xd93a3f, redDark: 0xa52a30,
  purple: 0x4a1d6e, purpleDark: 0x2c1043, pink: 0xff5c9a,
  gold: 0xe9b949, goldDark: 0xb98a2a,
  blue: 0x8fb8d8, wood: 0x8a5a3c, woodDark: 0x5e3a26,
  green: 0x3aa364, white: 0xffffff,
};

// ---------------------------------------------------------------------------
// Tekstur & pembantu
// ---------------------------------------------------------------------------
function rng(seed) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

function makeBlockTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 16;
  const g = c.getContext('2d');
  const r = rng(7);
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    let v = 236 + r() * 19;
    if (x === 0 || y === 0) v = 255;
    if (x === 15 || y === 15) v = 196;
    g.fillStyle = `rgb(${v | 0},${v | 0},${v | 0})`;
    g.fillRect(x, y, 1, 1);
  }
  const t = new THREE.CanvasTexture(c);
  t.magFilter = THREE.NearestFilter;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function pixelTex(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d');
  draw(g, w, h);
  const t = new THREE.CanvasTexture(c);
  t.magFilter = THREE.NearestFilter;
  t.minFilter = THREE.NearestFilter;
  t.generateMipmaps = false;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function hex(n) {
  return '#' + n.toString(16).padStart(6, '0');
}

/** Tekstur kanvas resolusi tinggi untuk teks (label, papan). */
function textCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d');
  g.imageSmoothingEnabled = false;
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return { c, g, tex };
}

function fitText(g, text, maxW, size, font = PIX) {
  let s = size;
  g.font = `${s}px ${font}`;
  while (g.measureText(text).width > maxW && s > 8) {
    s -= 1;
    g.font = `${s}px ${font}`;
  }
  return s;
}

/** Label nama gaya video: kotak plum, teks putih, sari kecil kuning. */
function makeNameTag(name, sub = '') {
  const { c, g, tex } = textCanvas(256, 96);
  g.fillStyle = '#1a0710';
  g.fillRect(6, 10, 244, sub ? 76 : 56);
  g.fillStyle = '#3d1828';
  g.fillRect(0, 4, 244, sub ? 76 : 56);
  g.fillStyle = '#6b2a45';
  g.fillRect(0, 4, 244, 6);
  g.fillStyle = '#ffffff';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  fitText(g, name, 220, 26);
  g.fillText(name, 122, 34);
  if (sub) {
    g.fillStyle = '#f2c14e';
    fitText(g, sub, 220, 13);
    g.fillText(sub, 122, 64);
  }
  const mat = new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true });
  const s = new THREE.Sprite(mat);
  s.scale.set(2.9, 2.9 * (c.height / c.width), 1);
  s.renderOrder = 10;
  return s;
}

/** Jubin nombor emas gaya "01". */
function makeNumberTile(text, state = 'open') {
  const { c, g, tex } = textCanvas(160, 110);
  const cols = {
    open: ['#e9b949', '#3a1626', '#b98a2a'],
    correct: ['#3aa364', '#ffffff', '#21703f'],
    wrong: ['#c8323f', '#ffffff', '#7d1a24'],
    solved: ['#e08a1e', '#ffffff', '#8a4a12'],
  }[state];
  g.fillStyle = '#1a0710';
  g.fillRect(10, 14, 146, 92);
  g.fillStyle = cols[0];
  g.fillRect(0, 4, 146, 92);
  g.fillStyle = cols[2];
  g.fillRect(0, 86, 146, 10);
  g.fillStyle = cols[1];
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.font = `44px ${PIX}`;
  g.fillText(text, 74, 48);
  const mat = new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true });
  const s = new THREE.Sprite(mat);
  s.scale.set(2.2, 2.2 * (c.height / c.width), 1);
  s.renderOrder = 9;
  return s;
}

// ---------------------------------------------------------------------------
// VoxelBatch — gabungkan banyak blok menjadi satu InstancedMesh
// ---------------------------------------------------------------------------
const BOX = new THREE.BoxGeometry(1, 1, 1);

class VoxelBatch {
  constructor(seed = 1) {
    this.map = new Map();
    this.r = rng(seed);
  }
  add(x, y, z, color, jitter = 0.05) {
    const k = `${x},${y},${z}`;
    const f = 1 - jitter + this.r() * jitter * 2;
    this.map.set(k, { x, y, z, color, f });
  }
  remove(x, y, z) {
    this.map.delete(`${x},${y},${z}`);
  }
  fill(x0, y0, z0, x1, y1, z1, colorFn, jitter) {
    for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) {
      const c = typeof colorFn === 'function' ? colorFn(x, y, z) : colorFn;
      if (c !== null && c !== undefined) this.add(x, y, z, c, jitter);
    }
  }
  build(material) {
    const items = [...this.map.values()];
    const mesh = new THREE.InstancedMesh(BOX, material, Math.max(1, items.length));
    const m = new THREE.Matrix4();
    const col = new THREE.Color();
    items.forEach((it, i) => {
      m.makeTranslation(it.x, it.y, it.z);
      mesh.setMatrixAt(i, m);
      col.setHex(it.color).multiplyScalar(it.f);
      mesh.setColorAt(i, col);
    });
    mesh.count = items.length;
    mesh.position.y = 0.5; // permukaan lantai (blok y=-1) berada pada y=0
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
    return mesh;
  }
}

// ---------------------------------------------------------------------------
// Watak voxel
// ---------------------------------------------------------------------------
function faceTextures(skin, hair, { glasses = false, mouth = '#7a3a2c' } = {}) {
  const S = hex(skin);
  const H = hex(hair);
  const front = pixelTex(8, 8, (g) => {
    g.fillStyle = S; g.fillRect(0, 0, 8, 8);
    g.fillStyle = H; g.fillRect(0, 0, 8, 2); g.fillRect(0, 2, 1, 1); g.fillRect(7, 2, 1, 1);
    g.fillStyle = '#ffffff'; g.fillRect(1, 4, 1, 1); g.fillRect(6, 4, 1, 1);
    g.fillStyle = '#2a1a14'; g.fillRect(2, 4, 1, 1); g.fillRect(5, 4, 1, 1);
    if (glasses) {
      g.fillStyle = '#1b1b1f';
      g.fillRect(1, 3, 2, 1); g.fillRect(5, 3, 2, 1); g.fillRect(3, 4, 2, 1);
    }
    g.fillStyle = mouth; g.fillRect(3, 6, 2, 1);
  });
  const side = pixelTex(8, 8, (g) => {
    g.fillStyle = S; g.fillRect(0, 0, 8, 8);
    g.fillStyle = H; g.fillRect(0, 0, 8, 3); g.fillRect(5, 3, 3, 2);
  });
  const back = pixelTex(8, 8, (g) => { g.fillStyle = S; g.fillRect(0, 0, 8, 8); g.fillStyle = H; g.fillRect(0, 0, 8, 6); });
  const top = pixelTex(8, 8, (g) => { g.fillStyle = H; g.fillRect(0, 0, 8, 8); g.fillStyle = 'rgba(0,0,0,0.12)'; g.fillRect(2, 2, 2, 1); g.fillRect(5, 5, 2, 1); });
  const bottom = pixelTex(2, 2, (g) => { g.fillStyle = S; g.fillRect(0, 0, 2, 2); });
  // urutan BoxGeometry: +x, -x, +y, -y, +z, -z
  return [side, side, top, bottom, front, back].map((t) => new THREE.MeshLambertMaterial({ map: t }));
}

function torsoTexture(jacket, shirt, accent) {
  return pixelTex(8, 10, (g) => {
    g.fillStyle = hex(jacket); g.fillRect(0, 0, 8, 10);
    g.fillStyle = hex(shirt); g.fillRect(3, 0, 2, 6);
    g.fillStyle = hex(accent); g.fillRect(3, 1, 2, 1); g.fillRect(4, 2, 1, 3);
    g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(0, 9, 8, 1);
  });
}

export function makeCharacter({ skin = 0xc68a5c, hair = 0x2e1c12, jacket = 0x7a1f3d, shirt = 0xffffff, accent = 0xd93a3f, pants = 0x24202a, glasses = false } = {}) {
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  const lam = (c) => new THREE.MeshLambertMaterial({ color: c });

  const legGeo = new THREE.BoxGeometry(0.46, 1.2, 0.5);
  legGeo.translate(0, -0.6, 0);
  const legL = new THREE.Mesh(legGeo, lam(pants));
  const legR = new THREE.Mesh(legGeo, lam(pants));
  legL.position.set(-0.25, 1.2, 0);
  legR.position.set(0.25, 1.2, 0);
  const shoe = new THREE.BoxGeometry(0.48, 0.18, 0.56);
  [legL, legR].forEach((l) => {
    const s = new THREE.Mesh(shoe, lam(0x141018));
    s.position.set(0, -1.12, 0.03);
    l.add(s);
  });

  const tTex = torsoTexture(jacket, shirt, accent);
  const jm = lam(jacket);
  const torso = new THREE.Mesh(new THREE.BoxGeometry(1.0, 1.3, 0.56), [jm, jm, jm, jm, new THREE.MeshLambertMaterial({ map: tTex }), jm]);
  torso.position.y = 1.85;

  const armGeo = new THREE.BoxGeometry(0.36, 1.2, 0.4);
  armGeo.translate(0, -0.55, 0);
  const armL = new THREE.Mesh(armGeo, jm);
  const armR = new THREE.Mesh(armGeo, jm);
  armL.position.set(-0.69, 2.45, 0);
  armR.position.set(0.69, 2.45, 0);
  const hand = new THREE.BoxGeometry(0.34, 0.26, 0.38);
  [armL, armR].forEach((a) => {
    const h = new THREE.Mesh(hand, lam(skin));
    h.position.y = -1.18;
    a.add(h);
  });

  const head = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.1, 1.1), faceTextures(skin, hair, { glasses }));
  head.position.y = 3.06;
  const hairTop = new THREE.Mesh(new THREE.BoxGeometry(1.18, 0.3, 1.18), lam(hair));
  hairTop.position.y = 0.52;
  head.add(hairTop);

  body.add(legL, legR, torso, armL, armR, head);
  const parts = { body, legL, legR, armL, armR, head };
  root.userData.parts = parts;
  root.userData.walk = 0;
  root.userData.phase = Math.random() * 6;
  return root;
}

function animateCharacter(ch, t, dt) {
  const p = ch.userData.parts;
  const w = ch.userData.walk;
  const ph = ch.userData.phase;
  if (w > 0.01) {
    const s = Math.sin(t * 11) * 0.7 * w;
    p.legL.rotation.x = s;
    p.legR.rotation.x = -s;
    if (!ch.userData.pointing) {
      p.armL.rotation.x = -s;
      p.armR.rotation.x = s;
    }
    p.body.position.y = Math.abs(Math.sin(t * 11)) * 0.12 * w;
  } else {
    p.legL.rotation.x *= 0.8;
    p.legR.rotation.x *= 0.8;
    if (!ch.userData.pointing) {
      p.armL.rotation.x = Math.sin(t * 1.6 + ph) * 0.06;
      p.armR.rotation.x = -Math.sin(t * 1.6 + ph) * 0.06;
    }
    p.body.position.y = Math.sin(t * 2 + ph) * 0.03;
    p.head.rotation.y = Math.sin(t * 0.7 + ph) * 0.18;
  }
  if (ch.userData.pointing) {
    p.armR.rotation.x = -2.3 + Math.sin(t * 3) * 0.12;
    p.armR.rotation.z = 0.15;
  }
  if (ch.userData.cheer) {
    p.armL.rotation.x = -2.8 + Math.sin(t * 12) * 0.3;
    p.armR.rotation.x = -2.8 - Math.sin(t * 12) * 0.3;
    p.body.position.y = Math.abs(Math.sin(t * 8)) * 0.35;
  }
}

// ---------------------------------------------------------------------------
// Shader portal
// ---------------------------------------------------------------------------
function makePortalMaterial(a = 0xff4f9a, b = 0x6a2cc0) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uA: { value: new THREE.Color(a) },
      uB: { value: new THREE.Color(b) },
      uI: { value: 1 },
    },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: `
      uniform float uTime; uniform vec3 uA; uniform vec3 uB; uniform float uI; varying vec2 vUv;
      float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233))) * 43758.5453); }
      void main(){
        vec2 cell = floor(vUv * vec2(12.0, 16.0));
        vec2 q = (cell + 0.5) / vec2(12.0, 16.0) - 0.5;
        q.y *= 1.25;
        float r = length(q);
        float a = atan(q.y, q.x);
        float sw = sin(a * 3.0 + r * 20.0 - uTime * 3.2);
        float n = h(cell + floor(uTime * 5.0));
        vec3 col = mix(uB, uA, 0.5 + 0.5 * sw);
        col += step(0.93, n) * 0.6;
        col *= (1.35 - r * 1.1) * uI;
        gl_FragColor = vec4(col, 1.0);
      }`,
    side: THREE.DoubleSide,
  });
}

// ---------------------------------------------------------------------------
// Dunia
// ---------------------------------------------------------------------------
const AREA_OFFSET = { home: new THREE.Vector3(0, 0, 0), learn: new THREE.Vector3(120, 0, 0), arena: new THREE.Vector3(240, 0, 0) };
const ISO_DIR = new THREE.Vector3(1, 0.86, 1).normalize();

export class World {
  constructor(canvas) {
    this.canvas = canvas;
    const mobile = matchMedia('(pointer: coarse)').matches;
    this.lowEnd = mobile && (navigator.hardwareConcurrency || 4) <= 4;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: !this.lowEnd, alpha: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobile ? 1.5 : 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.setClearColor(0x000000, 0);

    this.scene = new THREE.Scene();
    this.camera = new THREE.OrthographicCamera(-10, 10, 10, -10, -200, 400);
    this.cam = { x: 0, y: 2, z: 0, h: 26, sway: 1 };
    this.focusOffset = { x: 0, y: 0 };

    this.scene.add(new THREE.HemisphereLight(0xfff4f0, 0x6a3048, 1.55));
    const sun = new THREE.DirectionalLight(0xffffff, 1.65);
    sun.position.set(-6, 14, 9);
    this.scene.add(sun);
    const fill = new THREE.DirectionalLight(0xffb3cf, 0.55);
    fill.position.set(10, 4, -6);
    this.scene.add(fill);

    this.blockTex = makeBlockTexture();
    this.blockMat = new THREE.MeshLambertMaterial({ map: this.blockTex });
    this.glowMat = new THREE.MeshBasicMaterial({ map: this.blockTex });

    this.areas = {};
    this.portalMats = [];
    this.characters = [];
    this.anchors = {};
    this.lastT = performance.now();
    this.time = 0;
    this.active = 'home';
    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    this.onPortalSelect = null;
    this.onHomePortal = null;
    this.hoverGate = -1;
    this.busy = false;
  }

  init() {
    this.buildHome();
    this.buildLearn();
    this.buildArena();
    this.buildAmbient();
    this.buildFireworks();
    Object.values(this.areas).forEach((g) => { g.visible = false; this.scene.add(g); });
    this.resize();
    window.addEventListener('resize', () => this.resize());
    this.bindPointer();
    this.show('home', true);
    this.loop();
  }

  // ---------------- Halaman utama ----------------
  buildHome() {
    const g = new THREE.Group();
    g.position.copy(AREA_OFFSET.home);
    const b = new VoxelBatch(11);
    const glow = new VoxelBatch(12);
    // pulau terapung
    b.fill(-10, -1, -10, 9, -1, 9, (x, y, z) => ((x + z) & 1 ? PAL.tileA : PAL.tileB), 0.02);
    b.fill(-10, -2, -10, 9, -2, 9, (x, y, z) => (x === 9 || z === 9 || x === -10 || z === -10 ? PAL.maroon : null));
    b.fill(-10, -3, -10, 9, -3, 9, (x, y, z) => (x === 9 || z === 9 || x === -10 || z === -10 ? PAL.maroonDark : null));
    for (let x = -8; x <= 7; x++) for (let z = -8; z <= 7; z++) {
      if (Math.abs(x + 0.5) + Math.abs(z + 0.5) < 10) b.add(x, -4 - ((x * 7 + z * 13) & 1), z, PAL.maroonDark);
    }
    // dinding jubin putih (kiri & belakang)
    for (let y = 0; y <= 7; y++) {
      for (let z = -10; z <= 9; z++) b.add(-11, y, z, (y + z) & 1 ? PAL.wallA : PAL.wallB, 0.02);
      for (let x = -11; x <= 9; x++) b.add(x, y, -11, (y + x) & 1 ? PAL.wallA : PAL.wallB, 0.02);
    }
    // tingkap biru
    for (let y = 3; y <= 5; y++) for (let z = 3; z <= 6; z++) b.add(-11, y, z, PAL.blue, 0.03);
    // lubang portal pada dinding belakang + bingkai
    for (let x = -2; x <= 2; x++) for (let y = 0; y <= 5; y++) b.remove(x, y, -11);
    for (let y = 0; y <= 6; y++) { b.add(-3, y, -10, PAL.purpleDark); b.add(3, y, -10, PAL.purpleDark); }
    for (let x = -3; x <= 3; x++) b.add(x, 6, -10, PAL.purpleDark);
    for (let x = -2; x <= 2; x++) b.add(x, -1, -10, PAL.purple);
    [-3, 3].forEach((x) => glow.add(x, 7, -10, PAL.pink, 0.0));
    // karpet merah dari portal
    for (let z = -9; z <= 4; z++) for (let x = -1; x <= 1; x++) b.add(x, -1, z, x === 0 ? PAL.red : PAL.redDark, 0.03);
    // meja merah + kaki putih (gaya video)
    b.fill(-8, 1, 0, -4, 1, 2, PAL.red, 0.03);
    [[-8, 0], [-4, 0], [-8, 2], [-4, 2]].forEach(([x, z]) => b.add(x, 0, z, PAL.white));
    // sofa merah
    b.fill(-9, 0, -7, -9, 2, -3, PAL.redDark);
    b.fill(-8, 0, -7, -7, 0, -3, PAL.red);
    b.fill(-8, 1, -7, -8, 1, -7, PAL.red);
    b.fill(-8, 1, -3, -8, 1, -3, PAL.red);
    // rak buku pada dinding kiri
    const books = [PAL.red, PAL.gold, PAL.blue, PAL.green, PAL.purple, PAL.rose];
    for (let z = -9; z <= -5; z++) {
      b.add(-10, 0, z, PAL.woodDark); b.add(-10, 3, z, PAL.woodDark); b.add(-10, 6, z, PAL.woodDark);
      for (let y = 1; y <= 2; y++) b.add(-10, y, z, books[(z + y * 3 + 12) % books.length], 0.06);
      for (let y = 4; y <= 5; y++) b.add(-10, y, z, books[(z * 2 + y + 20) % books.length], 0.06);
    }
    // pasu pokok
    [[7, 7], [7, -8]].forEach(([x, z]) => {
      b.add(x, 0, z, PAL.wood);
      b.fill(x, 1, z, x, 2, z, PAL.woodDark);
      b.fill(x - 1, 3, z - 1, x + 1, 4, z + 1, (xx, yy, zz) => (yy === 4 && (xx !== x || zz !== z) && (xx + zz) & 1 ? null : PAL.roseLight));
      b.add(x, 5, z, PAL.pink);
    });
    // lampu cahaya
    [[-10, -10], [8, -10], [-10, 8]].forEach(([x, z]) => glow.add(x, 8, z, PAL.gold, 0));

    g.add(b.build(this.blockMat));
    g.add(glow.build(this.glowMat));

    // portal
    const pm = makePortalMaterial();
    this.portalMats.push(pm);
    const portal = new THREE.Mesh(new THREE.PlaneGeometry(5, 6), pm);
    portal.position.set(0, 3, -10.45);
    portal.userData.homePortal = true;
    g.add(portal);
    this.homePortal = portal;
    const pl = new THREE.PointLight(0xff4f9a, 30, 14, 1.6);
    pl.position.set(0, 3, -8);
    g.add(pl);

    // huruf jubin terapung "KPPB"
    this.homeTiles = [];
    'KPPB'.split('').forEach((ch, i) => {
      const t = pixelTex(64, 64, (c) => {
        c.fillStyle = i % 2 ? '#e8d6bd' : '#f4ece1'; c.fillRect(0, 0, 64, 64);
        c.fillStyle = 'rgba(0,0,0,0.12)'; c.fillRect(0, 58, 64, 6); c.fillRect(58, 0, 6, 64);
        c.fillStyle = '#5a1834'; c.font = `34px ${PIX}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(ch, 32, 34);
      });
      t.magFilter = THREE.LinearFilter;
      const plain = new THREE.MeshLambertMaterial({ color: i % 2 ? 0xe8d6bd : 0xf4ece1 });
      const face = new THREE.MeshLambertMaterial({ map: t });
      const m = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.8, 1.8), [face, plain, plain, plain, face, plain]);
      m.position.set(-8.6 + i * 2.15, 9.6 + (i % 2) * 0.9, -9.6);
      m.userData.baseY = m.position.y;
      g.add(m);
      this.homeTiles.push(m);
    });

    // watak
    const player = makeCharacter({ jacket: 0x7a1f3d, accent: 0xf2c14e, hair: 0x2b1a10 });
    player.position.set(0.2, 0, 1.5);
    player.rotation.y = Math.PI * 0.25;
    const teacher = makeCharacter({ jacket: 0x22202a, shirt: 0xffffff, accent: 0xd93a3f, hair: 0x1d140e, glasses: true, skin: 0xd09a6e });
    teacher.position.set(-6, 0, -1.6);
    teacher.rotation.y = Math.PI * 0.2;
    const friend = makeCharacter({ jacket: 0x4a1d6e, accent: 0xffffff, hair: 0x3a2416, skin: 0xb27a4e });
    friend.position.set(-5.6, 0, 3.6);
    friend.rotation.y = Math.PI * 0.6;
    g.add(player, teacher, friend);
    this.characters.push(player, teacher, friend);
    this.homePlayer = player;
    const tags = [[player, 'ANDA', 'PEMAIN'], [teacher, 'CIKGU', 'PEMANDU MISI'], [friend, 'RAKAN', 'PASUKAN KPPB']];
    tags.forEach(([ch, n, s]) => { const tg = makeNameTag(n, s); tg.position.set(0, 4.75, 0); ch.add(tg); });
    this.anchors.homeBubble = new THREE.Vector3(-6, 6.4, -1.6).add(AREA_OFFSET.home);

    this.areas.home = g;
  }

  // ---------------- Pusat pembelajaran ----------------
  buildLearn() {
    const g = new THREE.Group();
    g.position.copy(AREA_OFFSET.learn);
    const b = new VoxelBatch(21);
    const glow = new VoxelBatch(22);
    b.fill(-10, -1, -10, 9, -1, 9, (x, y, z) => ((x + z) & 1 ? PAL.tileA : PAL.tileB), 0.02);
    for (let y = -3; y <= -2; y++) b.fill(-10, y, -10, 9, y, 9, (x, yy, z) => (x === 9 || z === 9 || x === -10 || z === -10 ? (yy === -2 ? PAL.maroon : PAL.maroonDark) : null));
    for (let y = 0; y <= 8; y++) {
      for (let z = -10; z <= 9; z++) b.add(-11, y, z, (y + z) & 1 ? PAL.wallA : PAL.wallB, 0.02);
      for (let x = -11; x <= 9; x++) b.add(x, y, -11, (y + x) & 1 ? PAL.wallA : PAL.wallB, 0.02);
    }
    // bingkai papan putih
    b.fill(-7, 1, -10, 5, 1, -10, PAL.plum);
    b.fill(-7, 8, -10, 5, 8, -10, PAL.plum);
    b.fill(-7, 1, -10, -7, 8, -10, PAL.plum);
    b.fill(5, 1, -10, 5, 8, -10, PAL.plum);
    // meja murid (dua baris)
    [[-3, 1], [2, 1], [-3, 5], [2, 5]].forEach(([x, z]) => {
      b.fill(x - 1, 1, z, x + 1, 1, z, PAL.red, 0.03);
      b.add(x - 1, 0, z, PAL.white); b.add(x + 1, 0, z, PAL.white);
    });
    // rak buku: 10 slot (satu untuk setiap slaid)
    for (let z = -9; z <= 8; z++) { b.add(-10, 2, z, PAL.woodDark); b.add(-10, 5, z, PAL.woodDark); }
    glow.add(-10, 9, -10, PAL.gold, 0);
    glow.add(8, 9, -10, PAL.gold, 0);
    g.add(b.build(this.blockMat));
    g.add(glow.build(this.glowMat));

    // papan slaid (tekstur kanvas)
    this.board = textCanvas(1024, 560);
    const boardMesh = new THREE.Mesh(new THREE.PlaneGeometry(11, 6), new THREE.MeshBasicMaterial({ map: this.board.tex }));
    boardMesh.position.set(-1, 5, -10.45);
    g.add(boardMesh);

    // buku slaid
    this.books = [];
    const bookColors = [PAL.red, PAL.blue, 0xe06a9a, 0x5aa0d8, 0x3aa364, PAL.purple, PAL.gold, 0x2f8f6f, 0xd1793a, 0x8e44ad];
    for (let i = 0; i < 10; i++) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.9, 1.3), new THREE.MeshLambertMaterial({ color: bookColors[i], emissive: 0x000000 }));
      m.position.set(-10, 3.95, -8.1 + i * 1.8);
      m.userData.baseX = m.position.x;
      g.add(m);
      const tag = makeNumberTile(String(i + 1).padStart(2, '0'));
      tag.scale.multiplyScalar(0.55);
      tag.position.set(0.9, 1.5, 0);
      m.add(tag);
      this.books.push(m);
    }

    const teacher = makeCharacter({ jacket: 0x22202a, shirt: 0xffffff, accent: 0xd93a3f, hair: 0x1d140e, glasses: true, skin: 0xd09a6e });
    teacher.position.set(6.4, 0, -8.2);
    teacher.rotation.y = -Math.PI * 0.25;
    teacher.userData.pointing = true;
    const player = makeCharacter({ jacket: 0x7a1f3d, accent: 0xf2c14e, hair: 0x2b1a10 });
    player.position.set(-3, 0, 2.6);
    player.rotation.y = Math.PI;
    const s2 = makeCharacter({ jacket: 0x4a1d6e, hair: 0x3a2416, skin: 0xb27a4e });
    s2.position.set(2, 0, 2.6);
    s2.rotation.y = Math.PI;
    const s3 = makeCharacter({ jacket: 0x7a1f3d, hair: 0x120c08, skin: 0xe0b08a });
    s3.position.set(-3, 0, 6.6);
    s3.rotation.y = Math.PI;
    g.add(teacher, player, s2, s3);
    this.characters.push(teacher, player, s2, s3);
    const t1 = makeNameTag('CIKGU', 'PEMANDU MISI'); t1.position.y = 4.75; teacher.add(t1);
    const t2 = makeNameTag('ANDA', 'PELAJAR'); t2.position.y = 4.75; player.add(t2);
    this.learnPlayer = player;
    this.areas.learn = g;
    this.setLearnSlide(0, [true], ['PENGENALAN'], 10);
  }

  setLearnSlide(i, visited, boardLines, total = 10) {
    this.learnIndex = i;
    this.learnVisited = visited;
    const { g, tex } = this.board;
    g.fillStyle = '#fbf8f4'; g.fillRect(0, 0, 1024, 560);
    g.fillStyle = '#e9e1d8';
    for (let x = 0; x < 1024; x += 64) g.fillRect(x, 0, 2, 560);
    for (let y = 0; y < 560; y += 64) g.fillRect(0, y, 1024, 2);
    // jubin nombor
    g.fillStyle = '#1a0710'; g.fillRect(58, 58, 150, 96);
    g.fillStyle = '#e9b949'; g.fillRect(48, 48, 150, 96);
    g.fillStyle = '#3a1626'; g.font = `46px ${PIX}`; g.textBaseline = 'middle'; g.textAlign = 'center';
    g.fillText(String(i + 1).padStart(2, '0'), 123, 98);
    g.fillStyle = '#3d1828'; g.fillRect(214, 48, 760, 96);
    g.fillStyle = '#ffffff'; g.textAlign = 'left';
    fitText(g, `SLAID ${i + 1}/${total}`, 720, 34);
    g.fillText(`SLAID ${i + 1}/${total}`, 240, 98);
    g.textAlign = 'center';
    (boardLines || []).forEach((line, k) => {
      g.fillStyle = k === 0 ? '#b8325f' : '#3a1626';
      fitText(g, line, 900, k === 0 ? 40 : 48);
      g.fillText(line, 512, 220 + k * 92);
    });
    // kemajuan
    for (let k = 0; k < total; k++) {
      g.fillStyle = k === i ? '#ff5c9a' : visited[k] ? '#3aa364' : '#d8cdc2';
      g.fillRect(512 - total * 34 + k * 68, 480, 56, 40);
    }
    tex.needsUpdate = true;
    this.books.forEach((bk, k) => {
      bk.material.emissive.setHex(k === i ? 0x552233 : 0x000000);
      bk.userData.active = k === i;
    });
    if (this.active === 'learn') this.focusLearn(true);
  }

  focusLearn(animate) {
    const i = this.learnIndex || 0;
    const base = AREA_OFFSET.learn;
    const target = { x: base.x - 2.2 + (i % 2 ? 0.4 : -0.4), y: 3.4, z: base.z - 0.6, h: this.isPortrait() ? Math.min(60, 21 / this.aspect) : 25 };
    if (animate) gsap.to(this.cam, { ...target, duration: 1.1, ease: 'power2.inOut' });
    else Object.assign(this.cam, target);
  }

  // ---------------- Arena ----------------
  buildArena() {
    const g = new THREE.Group();
    g.position.copy(AREA_OFFSET.arena);
    const b = new VoxelBatch(31);
    const glow = new VoxelBatch(32);
    const X0 = -19, X1 = 18, Z0 = -11, Z1 = 10;
    // laluan: z=-5 (x -16..16), x=16 (z -5..5), z=5 (x 16..-16)
    const onPath = (x, z) => (Math.abs(z + 5) <= 1 && x >= -17 && x <= 17) || (Math.abs(z - 5) <= 1 && x >= -17 && x <= 17) || (Math.abs(x - 16) <= 1 && z >= -6 && z <= 6);
    b.fill(X0, -1, Z0, X1, -1, Z1, (x, y, z) => {
      if (onPath(x, z)) return (x + z) & 1 ? PAL.tileA : PAL.tileB;
      return (x + z) & 1 ? PAL.rose : PAL.maroon;
    }, 0.05);
    for (let y = -3; y <= -2; y++) b.fill(X0, y, Z0, X1, y, Z1, (x, yy, z) => (x === X0 || x === X1 || z === Z0 || z === Z1 ? (yy === -2 ? PAL.maroonDark : PAL.plum) : null));
    for (let x = X0 + 2; x <= X1 - 2; x++) for (let z = Z0 + 2; z <= Z1 - 2; z++) {
      if (((x * 31 + z * 17) & 3) !== 0) b.add(x, -4, z, PAL.plum);
    }
    // dinding rendah + lampu
    for (let y = 0; y <= 2; y++) {
      for (let z = Z0; z <= Z1; z++) b.add(X0 - 1, y, z, (y + z) & 1 ? PAL.wallA : PAL.wallB, 0.02);
      for (let x = X0 - 1; x <= X1; x++) b.add(x, y, Z0 - 1, (y + x) & 1 ? PAL.wallA : PAL.wallB, 0.02);
    }
    for (let z = Z0; z <= Z1; z += 4) glow.add(X0 - 1, 3, z, PAL.pink, 0);
    for (let x = X0 + 1; x <= X1; x += 4) glow.add(x, 3, Z0 - 1, PAL.pink, 0);
    // pad mula & tamat
    b.fill(-18, -1, -6, -17, -1, -4, PAL.gold, 0.04);
    b.fill(-18, -1, 4, -17, -1, 6, PAL.green, 0.04);
    // podium tengah untuk lencana
    b.fill(-1, 0, -1, 1, 0, 1, PAL.purpleDark);
    b.fill(0, 1, 0, 0, 1, 0, PAL.purple);
    glow.add(-1, 1, -1, PAL.gold, 0); glow.add(1, 1, 1, PAL.gold, 0); glow.add(-1, 1, 1, PAL.gold, 0); glow.add(1, 1, -1, PAL.gold, 0);
    // tiang papan markah
    b.fill(-8, 3, Z0 - 1, -8, 10, Z0 - 1, PAL.plum);
    b.fill(8, 3, Z0 - 1, 8, 10, Z0 - 1, PAL.plum);
    // pokok sakura voxel
    [[-15, 0], [12, 0], [-6, 0], [6, 9], [-12, 9]].forEach(([x, z]) => {
      b.fill(x, 0, z, x, 2, z, PAL.woodDark);
      b.fill(x - 1, 3, z - 1, x + 1, 4, z + 1, (xx, yy, zz) => (yy === 4 && Math.abs(xx - x) + Math.abs(zz - z) === 2 ? null : PAL.roseLight));
      b.add(x, 5, z, PAL.pink);
    });
    g.add(b.build(this.blockMat));
    g.add(glow.build(this.glowMat));

    // papan markah terapung
    this.scoreBoard = textCanvas(1024, 400);
    const sb = new THREE.Mesh(new THREE.PlaneGeometry(16.5, 6.45), new THREE.MeshBasicMaterial({ map: this.scoreBoard.tex }));
    sb.position.set(0, 7.6, Z0 - 0.4);
    g.add(sb);
    this.scoreBoardMesh = sb;

    // lencana pangkat semasa (di atas podium)
    this.arenaBadgeHolder = new THREE.Group();
    this.arenaBadgeHolder.position.set(0, 4.3, 0);
    this.arenaBadgeHolder.scale.setScalar(0.62);
    const bl = new THREE.PointLight(0xffe0a0, 18, 10, 1.5);
    bl.position.set(2, 5, 3);
    g.add(this.arenaBadgeHolder, bl);

    // laluan polyline
    this.pathPts = [new THREE.Vector3(-17, 0, -5), new THREE.Vector3(16, 0, -5), new THREE.Vector3(16, 0, 5), new THREE.Vector3(-17, 0, 5)];
    this.pathLens = [0];
    for (let i = 1; i < this.pathPts.length; i++) this.pathLens.push(this.pathLens[i - 1] + this.pathPts[i].distanceTo(this.pathPts[i - 1]));

    // 10 portal
    this.gates = [];
    const gateX = [-12, -6, 0, 6, 12, 12, 6, 0, -6, -12];
    for (let i = 0; i < 10; i++) {
      const gx = gateX[i];
      const gz = i < 5 ? -5 : 5;
      const gate = new THREE.Group();
      gate.position.set(gx, 0, gz);
      const fb = new VoxelBatch(100 + i);
      for (let y = 0; y <= 5; y++) { fb.add(0, y, -2, PAL.purpleDark, 0.08); fb.add(0, y, 2, PAL.purpleDark, 0.08); }
      for (let z = -2; z <= 2; z++) fb.add(0, 5, z, PAL.purpleDark, 0.08);
      const frame = fb.build(new THREE.MeshLambertMaterial({ map: this.blockTex }));
      frame.position.y = 0.5;
      gate.add(frame);
      const mat = makePortalMaterial();
      this.portalMats.push(mat);
      const plane = new THREE.Mesh(new THREE.PlaneGeometry(3, 5), mat);
      plane.rotation.y = Math.PI / 2;
      plane.position.set(0, 2.5, 0);
      gate.add(plane);
      const hit = new THREE.Mesh(new THREE.BoxGeometry(2.4, 6.5, 5.2), new THREE.MeshBasicMaterial({ visible: false }));
      hit.position.y = 3;
      hit.userData.gate = i;
      gate.add(hit);
      const label = makeNumberTile(String(i + 1).padStart(2, '0'));
      label.position.set(0, 7.6, 0);
      gate.add(label);
      g.add(gate);
      const s = i < 5 ? gx + 17 : this.pathLens[2] + (16 - gx);
      this.gates.push({ group: gate, frame, plane, mat, hit, label, state: 'open', s, x: gx, z: gz });
    }

    const player = makeCharacter({ jacket: 0x7a1f3d, accent: 0xf2c14e, hair: 0x2b1a10 });
    const tag = makeNameTag('ANDA', 'PEMAIN');
    tag.position.y = 4.75;
    player.add(tag);
    g.add(player);
    this.characters.push(player);
    this.arenaPlayer = player;
    this.playerS = 1;
    this.placePlayerAt(this.playerS);

    this.areas.arena = g;
    this.setArenaState({ states: Array(10).fill('open'), score: 0, answered: 0, rankIdx: 0 });
  }

  pathPoint(s) {
    const L = this.pathLens;
    s = Math.max(0, Math.min(L[L.length - 1], s));
    for (let i = 1; i < L.length; i++) {
      if (s <= L[i]) {
        const t = (s - L[i - 1]) / (L[i] - L[i - 1]);
        return this.pathPts[i - 1].clone().lerp(this.pathPts[i], t);
      }
    }
    return this.pathPts[this.pathPts.length - 1].clone();
  }

  placePlayerAt(s) {
    const p = this.pathPoint(s);
    const ahead = this.pathPoint(s + 0.5);
    this.arenaPlayer.position.copy(p);
    this.arenaPlayer.rotation.y = Math.atan2(ahead.x - p.x, ahead.z - p.z);
  }

  setArenaState({ states, score, answered, rankIdx }) {
    const colors = {
      open: [0xff4f9a, 0x6a2cc0, 1.0, PAL.purpleDark],
      correct: [0x7cf0a0, 0x1f7a48, 0.95, 0x1f6a3e],
      wrong: [0xff8a8a, 0x8a1a2a, 0.75, 0x6a1622],
      solved: [0xffd37a, 0xc0661a, 0.95, 0x8a4a12],
    };
    const col = new THREE.Color();
    this.gates.forEach((gt, i) => {
      const st = states[i] || 'open';
      const [a, bcol, inten, frameC] = colors[st];
      gt.mat.uniforms.uA.value.setHex(a);
      gt.mat.uniforms.uB.value.setHex(bcol);
      gt.baseI = inten;
      if (gt.state !== st) {
        const old = gt.label;
        const nl = makeNumberTile(String(i + 1).padStart(2, '0'), st);
        nl.position.copy(old.position);
        gt.group.remove(old);
        old.material.map.dispose();
        old.material.dispose();
        gt.group.add(nl);
        gt.label = nl;
      }
      gt.state = st;
      for (let k = 0; k < gt.frame.count; k++) {
        col.setHex(frameC).multiplyScalar(0.9 + ((k * 37) % 10) / 50);
        gt.frame.setColorAt(k, col);
      }
      gt.frame.instanceColor.needsUpdate = true;
    });
    // papan markah
    const { g, tex } = this.scoreBoard;
    const r = RANKS[rankIdx];
    g.clearRect(0, 0, 1024, 400);
    g.fillStyle = '#1a0710'; g.fillRect(14, 14, 1010, 386);
    g.fillStyle = '#3d1828'; g.fillRect(0, 0, 1010, 386);
    g.fillStyle = '#6b2a45'; g.fillRect(0, 0, 1010, 12);
    g.strokeStyle = '#e9b949'; g.lineWidth = 6; g.strokeRect(18, 24, 974, 344);
    g.textBaseline = 'middle';
    g.fillStyle = '#e9b949'; g.fillRect(40, 44, 300, 64);
    g.fillStyle = '#3a1626'; g.font = `24px ${PIX}`; g.textAlign = 'center';
    g.fillText('ARENA MISI', 190, 78);
    g.fillStyle = '#ffffff'; g.textAlign = 'left'; g.font = `24px ${PIX}`;
    g.fillText('KPPB · PAPAN MARKAH', 364, 78);
    g.font = `52px ${PIX}`; g.fillStyle = '#ffffff';
    g.fillText(`MATA ${score}/100`, 44, 168);
    g.font = `26px ${PIX}`; g.fillStyle = '#f2c14e';
    g.fillText(`SOALAN ${answered}/10`, 680, 168);
    g.fillStyle = r.color;
    fitText(g, `PANGKAT: ${r.name}`, 930, 28);
    g.fillText(`PANGKAT: ${r.name}`, 44, 240);
    for (let k = 0; k < 10; k++) {
      const st = states[k];
      g.fillStyle = st === 'correct' ? '#3aa364' : st === 'wrong' ? '#c8323f' : st === 'solved' ? '#e08a1e' : '#6b2a45';
      g.fillRect(44 + k * 92, 290, 80, 50);
      g.fillStyle = '#ffffff'; g.font = `20px ${PIX}`; g.textAlign = 'center';
      g.fillText(String(k + 1).padStart(2, '0'), 84 + k * 92, 316);
      g.textAlign = 'left';
    }
    tex.needsUpdate = true;

    if (this.arenaRank !== rankIdx) {
      this.arenaRank = rankIdx;
      this.arenaBadgeHolder.clear();
      this.arenaBadgeHolder.add(createBadgeModel(rankIdx));
    }
  }

  /** Gerakkan pemain ke portal i, mainkan animasi masuk, kemudian selesaikan Promise. */
  enterGate(i, sfx) {
    if (this.busy) return Promise.resolve(false);
    this.busy = true;
    const gt = this.gates[i];
    const dir = i < 5 ? 1 : -1; // arah laluan di depan pintu
    const standS = gt.s - 1.8;
    const from = this.playerS;
    const dist = Math.abs(standS - from);
    const p = this.arenaPlayer;
    p.userData.walk = 1;
    const st = { s: from };
    const base = AREA_OFFSET.arena;
    return new Promise((resolve) => {
      const tl = gsap.timeline({
        onComplete: () => {
          this.busy = false;
          resolve(true);
        },
      });
      let stepAcc = 0;
      tl.to(st, {
        s: standS,
        duration: Math.min(3.2, 0.25 + dist / 9),
        ease: 'none',
        onUpdate: () => {
          const prev = this.playerS;
          this.playerS = st.s;
          const pt = this.pathPoint(st.s);
          const dS = st.s - prev;
          const look = this.pathPoint(st.s + (dS >= 0 ? 0.6 : -0.6));
          p.position.copy(pt);
          if (look.distanceToSquared(pt) > 0.001) p.rotation.y = Math.atan2(look.x - pt.x, look.z - pt.z);
          stepAcc += Math.abs(dS);
          if (stepAcc > 1.4) { stepAcc = 0; sfx?.('step'); }
          this.cam.x = base.x + pt.x * 0.55;
          this.cam.z = base.z + pt.z * 0.35;
        },
      });
      tl.add(() => {
        p.userData.walk = 0;
        p.rotation.y = Math.atan2(dir, 0);
        sfx?.('portal');
      });
      tl.to(this.cam, { x: base.x + gt.x, y: 3, z: base.z + gt.z, h: 11, duration: 0.8, ease: 'power2.in' }, '<');
      tl.to(p.position, { x: gt.x - dir * 0.2, duration: 0.5, ease: 'power1.in' }, '-=0.5');
      tl.to(p.scale, { x: 0.2, y: 0.2, z: 0.2, duration: 0.35, ease: 'back.in(2)' }, '-=0.3');
      tl.to(gt.mat.uniforms.uI, { value: 2.6, duration: 0.3 }, '<');
    });
  }

  /** Kembali dari portal: pemain muncul semula di hadapan portal. */
  exitGate(i) {
    const gt = this.gates[i];
    const p = this.arenaPlayer;
    this.playerS = gt.s + 1.6;
    this.placePlayerAt(this.playerS);
    p.scale.setScalar(0.2);
    gsap.to(p.scale, { x: 1, y: 1, z: 1, duration: 0.5, ease: 'back.out(2)' });
    gsap.to(gt.mat.uniforms.uI, { value: gt.baseI ?? 1, duration: 0.6 });
    this.focusArena(true);
  }

  resetArena() {
    this.playerS = 1;
    this.arenaPlayer.scale.setScalar(1);
    this.arenaPlayer.userData.cheer = false;
    this.placePlayerAt(1);
  }

  focusArena(animate) {
    const base = AREA_OFFSET.arena;
    const portrait = this.isPortrait();
    const pp = this.arenaPlayer.position;
    const target = portrait
      ? { x: base.x + pp.x * 0.55, y: 2.5, z: base.z + pp.z * 0.35, h: 36 }
      : { x: base.x - 0.5, y: 3.6, z: base.z + 0.5, h: 30 };
    if (animate) gsap.to(this.cam, { ...target, duration: 1.0, ease: 'power2.inOut' });
    else Object.assign(this.cam, target);
  }

  // ---------------- Ambien & partikel ----------------
  buildAmbient() {
    const n = 46;
    this.floaters = new THREE.InstancedMesh(BOX, this.blockMat, n);
    this.floatData = [];
    const r = rng(99);
    const col = new THREE.Color();
    const cols = [PAL.rose, PAL.maroon, PAL.roseLight, PAL.purple, 0xf1e7da, PAL.pink];
    for (let i = 0; i < n; i++) {
      const ang = r() * Math.PI * 2;
      const rad = 23 + r() * 14;
      this.floatData.push({ x: Math.cos(ang) * rad, y: -6 + r() * 20, z: Math.sin(ang) * rad, s: 0.4 + r() * 1.1, sp: 0.3 + r() * 0.8, ph: r() * 6 });
      col.setHex(cols[i % cols.length]);
      this.floaters.setColorAt(i, col);
    }
    this.floaters.frustumCulled = false;
    this.scene.add(this.floaters);
  }

  buildFireworks() {
    const n = 420;
    this.fw = new THREE.InstancedMesh(BOX, new THREE.MeshBasicMaterial({ toneMapped: false }), n);
    this.fw.frustumCulled = false;
    this.fwData = Array.from({ length: n }, () => ({ life: 0, p: new THREE.Vector3(), v: new THREE.Vector3(), s: 0.3 }));
    const col = new THREE.Color(0xffffff);
    const m = new THREE.Matrix4().makeScale(0, 0, 0);
    for (let i = 0; i < n; i++) { this.fw.setMatrixAt(i, m); this.fw.setColorAt(i, col); }
    this.fwCursor = 0;
    this.scene.add(this.fw);
  }

  burst(pos, colors = [0xff5c9a, 0xf2c14e, 0xffffff], count = 60, power = 9) {
    const col = new THREE.Color();
    for (let k = 0; k < count; k++) {
      const i = this.fwCursor = (this.fwCursor + 1) % this.fwData.length;
      const d = this.fwData[i];
      d.life = 1.2 + Math.random() * 0.8;
      d.max = d.life;
      d.p.copy(pos);
      const th = Math.random() * Math.PI * 2;
      const ph = Math.acos(2 * Math.random() - 1);
      const sp = power * (0.5 + Math.random() * 0.6);
      d.v.set(Math.sin(ph) * Math.cos(th) * sp, Math.abs(Math.cos(ph)) * sp * 0.9 + 3, Math.sin(ph) * Math.sin(th) * sp);
      d.s = 0.22 + Math.random() * 0.25;
      col.setHex(colors[k % colors.length]);
      this.fw.setColorAt(i, col);
    }
    this.fw.instanceColor.needsUpdate = true;
  }

  /** Sambutan mengikut tahap (0-5). */
  celebrate(level = 3) {
    const base = AREA_OFFSET[this.active];
    const bursts = 2 + level * 2;
    const palettes = [[0xff5c9a, 0xffffff], [0xd58a4e, 0xffd39a], [0xd7dde6, 0xffffff], [0xf3c64f, 0xfff1b0], [0xa9e4ef, 0xffffff], [0x8af3ff, 0xff5c9a, 0xf3c64f, 0xffffff]];
    for (let k = 0; k < bursts; k++) {
      setTimeout(() => {
        const p = new THREE.Vector3(base.x + (Math.random() - 0.5) * 22, 6 + Math.random() * 6, base.z + (Math.random() - 0.5) * 14);
        this.burst(p, palettes[Math.max(0, Math.min(5, level))], 50 + level * 8, 7 + level);
      }, k * 260);
    }
    if (this.active === 'arena') {
      this.arenaPlayer.userData.cheer = true;
      setTimeout(() => { this.arenaPlayer.userData.cheer = false; }, 2600 + level * 300);
    }
  }

  // ---------------- Kamera & kawalan ----------------
  isPortrait() {
    return window.innerWidth / window.innerHeight < 0.9;
  }

  setFocusOffset(x, y) {
    gsap.to(this.focusOffset, { x, y, duration: 0.8, ease: 'power2.out' });
  }

  show(area, instant = false) {
    this.active = area;
    Object.entries(this.areas).forEach(([k, g]) => { g.visible = k === area; });
    const base = AREA_OFFSET[area];
    this.floaters.position.copy(base);
    if (area === 'home') {
      const target = { x: base.x + 0.5, y: 3.2, z: base.z + 0.5, h: this.isPortrait() ? Math.min(62, 25 / this.aspect) : 27 };
      if (instant) Object.assign(this.cam, target, { h: target.h * 1.4 });
      else Object.assign(this.cam, target, { h: target.h * 1.25 });
      gsap.to(this.cam, { h: target.h, duration: 2.2, ease: 'power3.out' });
    } else if (area === 'learn') {
      this.focusLearn(false);
      this.cam.h *= 1.3;
      this.focusLearn(true);
    } else if (area === 'arena') {
      this.focusArena(false);
      const h = this.cam.h;
      this.cam.h = h * 1.35;
      gsap.to(this.cam, { h, duration: 1.6, ease: 'power3.out' });
    }
  }

  bindPointer() {
    const el = this.canvas;
    const pointers = new Map();
    let down = null;
    let pinchStart = 0;
    let hStart = 0;
    el.addEventListener('pointerdown', (e) => {
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.size === 1) down = { x: e.clientX, y: e.clientY, cx: this.cam.x, cz: this.cam.z, moved: false };
      if (pointers.size === 2) {
        const [a, b] = [...pointers.values()];
        pinchStart = Math.hypot(a.x - b.x, a.y - b.y);
        hStart = this.cam.h;
      }
    });
    el.addEventListener('pointermove', (e) => {
      if (pointers.has(e.pointerId)) pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.size === 2 && this.active === 'arena') {
        const [a, b] = [...pointers.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (pinchStart > 0) this.cam.h = THREE.MathUtils.clamp(hStart * (pinchStart / d), 12, 44);
        if (down) down.moved = true;
        return;
      }
      if (down && pointers.size === 1) {
        const dx = e.clientX - down.x;
        const dy = e.clientY - down.y;
        if (Math.abs(dx) + Math.abs(dy) > 8) down.moved = true;
        if (down.moved && this.active === 'arena' && !this.busy) {
          const k = this.cam.h / window.innerHeight;
          // seret: alihkan sasaran di satah isometrik
          const right = new THREE.Vector3(1, 0, -1).normalize();
          const fwd = new THREE.Vector3(-1, 0, -1).normalize();
          const base = AREA_OFFSET.arena;
          this.cam.x = THREE.MathUtils.clamp(down.cx - right.x * dx * k - fwd.x * dy * k * 1.4, base.x - 18, base.x + 18);
          this.cam.z = THREE.MathUtils.clamp(down.cz - right.z * dx * k - fwd.z * dy * k * 1.4, base.z - 12, base.z + 12);
        }
      }
      if (!down) this.hover(e);
    });
    const up = (e) => {
      pointers.delete(e.pointerId);
      if (down && !down.moved && pointers.size === 0) this.click(e);
      if (pointers.size === 0) down = null;
      if (pointers.size < 2) pinchStart = 0;
    };
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
    el.addEventListener('wheel', (e) => {
      if (this.active !== 'arena') return;
      e.preventDefault();
      this.cam.h = THREE.MathUtils.clamp(this.cam.h * (1 + Math.sign(e.deltaY) * 0.08), 12, 44);
    }, { passive: false });
  }

  pick(e) {
    const rect = this.canvas.getBoundingClientRect();
    this.pointer.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
    this.raycaster.setFromCamera(this.pointer, this.camera);
    if (this.active === 'arena') {
      const hits = this.raycaster.intersectObjects(this.gates.map((g) => g.hit), false);
      return hits.length ? { gate: hits[0].object.userData.gate } : null;
    }
    if (this.active === 'home') {
      const hits = this.raycaster.intersectObject(this.homePortal, false);
      return hits.length ? { homePortal: true } : null;
    }
    return null;
  }

  hover(e) {
    if (e.pointerType === 'touch') return;
    const p = this.pick(e);
    const gi = p && p.gate !== undefined ? p.gate : -1;
    this.hoverGate = gi;
    this.canvas.style.cursor = p ? 'pointer' : this.active === 'arena' ? 'grab' : 'default';
  }

  click(e) {
    if (this.busy) return;
    const p = this.pick(e);
    if (!p) return;
    if (p.gate !== undefined) this.onPortalSelect?.(p.gate);
    if (p.homePortal) this.onHomePortal?.();
  }

  /** Kedudukan skrin bagi titik dunia (untuk gelembung cakap HTML). */
  screenPos(v) {
    const p = v.clone().project(this.camera);
    return { x: (p.x * 0.5 + 0.5) * window.innerWidth, y: (-p.y * 0.5 + 0.5) * window.innerHeight, visible: p.z < 1 };
  }

  resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.aspect = w / h;
  }

  updateCamera() {
    const c = this.cam;
    const sway = this.active === 'home' ? Math.sin(this.time * 0.25) * 0.08 : 0;
    const dir = ISO_DIR.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), sway);
    const target = new THREE.Vector3(c.x, c.y, c.z);
    this.camera.position.copy(target).addScaledVector(dir, 120);
    this.camera.lookAt(target);
    const hh = c.h / 2;
    const hw = hh * this.aspect;
    const ox = this.focusOffset.x * hw * 2;
    const oy = this.focusOffset.y * hh * 2;
    this.camera.left = -hw - ox;
    this.camera.right = hw - ox;
    this.camera.top = hh - oy;
    this.camera.bottom = -hh - oy;
    this.camera.updateProjectionMatrix();
  }

  loop() {
    const tick = () => {
      requestAnimationFrame(tick);
      const now = performance.now();
      const dt = Math.min(0.05, (now - this.lastT) / 1000);
      this.lastT = now;
      this.time += dt;
      const t = this.time;
      this.portalMats.forEach((m) => { m.uniforms.uTime.value = t; });
      this.characters.forEach((c) => { if (c.parent?.visible) animateCharacter(c, t, dt); });

      if (this.active === 'home') {
        this.homeTiles.forEach((m, i) => {
          m.position.y = m.userData.baseY + Math.sin(t * 1.6 + i * 0.9) * 0.25;
          m.rotation.y = Math.sin(t * 0.8 + i) * 0.12;
        });
      } else if (this.active === 'learn') {
        this.books.forEach((bk) => {
          const target = bk.userData.active ? bk.userData.baseX + 1.1 : bk.userData.baseX;
          bk.position.x += (target - bk.position.x) * 0.12;
          bk.rotation.y = bk.userData.active ? Math.sin(t * 2) * 0.15 : 0;
        });
      } else if (this.active === 'arena') {
        this.arenaBadgeHolder.rotation.y = t * 0.9;
        this.arenaBadgeHolder.position.y = 4.3 + Math.sin(t * 1.8) * 0.25;
        this.gates.forEach((gt, i) => {
          const target = (gt.baseI ?? 1) * (this.hoverGate === i ? 1.45 : 1);
          if (!this.busy) gt.mat.uniforms.uI.value += (target - gt.mat.uniforms.uI.value) * 0.15;
          gt.label.position.y = 7.6 + Math.sin(t * 2 + i) * 0.15;
        });
      }

      // blok terapung
      const m = new THREE.Matrix4();
      const q = new THREE.Quaternion();
      const e = new THREE.Euler();
      const s = new THREE.Vector3();
      const p = new THREE.Vector3();
      this.floatData.forEach((d, i) => {
        p.set(d.x, d.y + Math.sin(t * d.sp + d.ph) * 1.2, d.z);
        e.set(t * d.sp * 0.4 + d.ph, t * d.sp * 0.3, 0);
        q.setFromEuler(e);
        s.setScalar(d.s);
        m.compose(p, q, s);
        this.floaters.setMatrixAt(i, m);
      });
      this.floaters.instanceMatrix.needsUpdate = true;

      // bunga api
      let anyFw = false;
      this.fwData.forEach((d, i) => {
        if (d.life <= 0) return;
        anyFw = true;
        d.life -= dt;
        d.v.y -= 12 * dt;
        d.v.multiplyScalar(0.985);
        d.p.addScaledVector(d.v, dt);
        const k = Math.max(0, d.life / d.max);
        s.setScalar(d.life > 0 ? d.s * (0.3 + k) : 0);
        q.identity();
        m.compose(d.p, q, s);
        this.fw.setMatrixAt(i, m);
      });
      if (anyFw || this.fwWasActive) this.fw.instanceMatrix.needsUpdate = true;
      this.fwWasActive = anyFw;

      this.updateCamera();
      this.renderer.render(this.scene, this.camera);
      this.onFrame?.();
    };
    tick();
  }
}
