// Sistem pangkat, lencana dan paparan lencana 3D.
import * as THREE from 'three';

export const RANKS = [
  { min: 0, max: 1, key: 'pemula', name: 'PEMULA KPPB', badge: null, badgeName: 'Tiada lencana', color: '#9c8a94', hex: 0x9c8a94 },
  { min: 2, max: 3, key: 'gangsa', name: 'PERANTIS KPPB', badge: 'Gangsa', badgeName: 'Lencana Gangsa', color: '#d58a4e', hex: 0xc8763c },
  { min: 4, max: 5, key: 'perak', name: 'PENJELAJAH KPPB', badge: 'Perak', badgeName: 'Lencana Perak', color: '#d7dde6', hex: 0xc4ccd8 },
  { min: 6, max: 7, key: 'emas', name: 'PENGAMAL KPPB', badge: 'Emas', badgeName: 'Lencana Emas', color: '#f3c64f', hex: 0xf0bb2c },
  { min: 8, max: 9, key: 'platinum', name: 'STRATEGIS KPPB', badge: 'Platinum', badgeName: 'Lencana Platinum', color: '#a9e4ef', hex: 0x9fd9e6 },
  { min: 10, max: 10, key: 'berlian', name: 'PAKAR KPPB', badge: 'Berlian', badgeName: 'Lencana Berlian', color: '#8af3ff', hex: 0x6ff0ff },
];

/** Pulangkan indeks pangkat (0-5) berdasarkan bilangan jawapan betul (0-10). */
export function rankIndexFor(correct) {
  const c = Math.max(0, Math.min(10, Math.floor(Number(correct) || 0)));
  return RANKS.findIndex((r) => c >= r.min && c <= r.max);
}

export function rankFor(correct) {
  return RANKS[rankIndexFor(correct)];
}

// ---------------------------------------------------------------------------
// Model lencana voxel 3D
// ---------------------------------------------------------------------------
const STAR = [
  '....#....',
  '...###...',
  '#########',
  '.#######.',
  '..#####..',
  '.###.###.',
  '.##...##.',
];

export function createBadgeModel(rankIdx) {
  const r = RANKS[rankIdx] ?? RANKS[0];
  const group = new THREE.Group();
  const box = new THREE.BoxGeometry(1, 1, 1);
  const base = new THREE.Color(r.hex);
  const metal = new THREE.MeshStandardMaterial({ color: base, metalness: 0.75, roughness: 0.28, flatShading: true });
  const dark = new THREE.MeshStandardMaterial({ color: base.clone().multiplyScalar(0.55), metalness: 0.6, roughness: 0.4, flatShading: true });
  const plum = new THREE.MeshStandardMaterial({ color: 0x5a1834, roughness: 0.8 });
  const ribbonA = new THREE.MeshStandardMaterial({ color: 0xb8325f, roughness: 0.7 });
  const ribbonB = new THREE.MeshStandardMaterial({ color: 0x4a1d6e, roughness: 0.7 });

  if (r.key === 'pemula') {
    // blok batu kosong — belum ada lencana
    const stone = new THREE.MeshStandardMaterial({ color: 0x7d6a74, roughness: 0.95, flatShading: true });
    for (let x = -1; x <= 1; x++) for (let y = -1; y <= 1; y++) {
      const m = new THREE.Mesh(box, stone);
      m.position.set(x * 0.9, y * 0.9, 0);
      m.scale.setScalar(0.86);
      group.add(m);
    }
    const q = new THREE.Mesh(box, plum);
    q.scale.set(0.5, 0.5, 0.2);
    q.position.z = 0.5;
    group.add(q);
    return group;
  }

  // cakera bersegi lapan daripada blok
  const R = 4.2;
  for (let x = -4; x <= 4; x++) for (let y = -4; y <= 4; y++) {
    const d = Math.abs(x) + Math.abs(y) * 1.0;
    if (Math.hypot(x, y) > R || d > 6.2) continue;
    const ring = Math.hypot(x, y) > R - 1.2 || d > 5.2;
    const m = new THREE.Mesh(box, ring ? metal : dark);
    m.position.set(x * 0.32, y * 0.32, ring ? 0.08 : 0);
    m.scale.set(0.32, 0.32, ring ? 0.5 : 0.36);
    group.add(m);
  }
  // bintang timbul
  STAR.forEach((row, j) => {
    [...row].forEach((ch, i) => {
      if (ch !== '#') return;
      const m = new THREE.Mesh(box, metal);
      m.position.set((i - 4) * 0.22, (3 - j) * 0.22 - 0.05, 0.26);
      m.scale.set(0.22, 0.22, 0.3);
      group.add(m);
    });
  });
  // reben
  for (let i = 0; i < 5; i++) {
    const a = new THREE.Mesh(box, i % 2 ? ribbonB : ribbonA);
    a.position.set(-0.55 - i * 0.06, 1.75 + i * 0.32, -0.12);
    a.scale.set(0.42, 0.34, 0.12);
    group.add(a);
    const b = new THREE.Mesh(box, i % 2 ? ribbonA : ribbonB);
    b.position.set(0.55 + i * 0.06, 1.75 + i * 0.32, -0.12);
    b.scale.set(0.42, 0.34, 0.12);
    group.add(b);
  }
  // permata berlian / platinum
  if (r.key === 'berlian' || r.key === 'platinum') {
    const gem = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.55, 0),
      new THREE.MeshStandardMaterial({ color: r.key === 'berlian' ? 0x9ffcff : 0xe9f6ff, metalness: 0.2, roughness: 0.05, emissive: 0x2299aa, emissiveIntensity: r.key === 'berlian' ? 0.6 : 0.2, flatShading: true }),
    );
    gem.position.set(0, -1.75, 0.3);
    gem.userData.spin = true;
    group.add(gem);
  }
  return group;
}

/** Paparan lencana 3D kecil (renderer sendiri) yang boleh dipindahkan antara bekas. */
export class BadgeViewer {
  constructor() {
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'badge-canvas';
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, alpha: true, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
    this.camera.position.set(0, 0.2, 9.5);
    this.scene.add(new THREE.HemisphereLight(0xfff2f6, 0x3a0d1f, 1.6));
    const d = new THREE.DirectionalLight(0xffffff, 2.4);
    d.position.set(3, 4, 6);
    this.scene.add(d);
    const d2 = new THREE.DirectionalLight(0xff7fb0, 1.4);
    d2.position.set(-5, -2, 3);
    this.scene.add(d2);
    this.holder = new THREE.Group();
    this.scene.add(this.holder);
    // partikel kilauan
    const n = 60;
    const g = new THREE.BufferGeometry();
    const p = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      p[i * 3] = (Math.random() - 0.5) * 7;
      p[i * 3 + 1] = (Math.random() - 0.5) * 6;
      p[i * 3 + 2] = (Math.random() - 0.5) * 2 - 1;
    }
    g.setAttribute('position', new THREE.BufferAttribute(p, 3));
    this.sparkMat = new THREE.PointsMaterial({ size: 0.12, color: 0xffe9a8, transparent: true, opacity: 0.9 });
    this.sparks = new THREE.Points(g, this.sparkMat);
    this.scene.add(this.sparks);
    this.running = false;
    this.t = 0;
  }

  mount(container, rankIdx) {
    container.innerHTML = '';
    container.appendChild(this.canvas);
    this.setRank(rankIdx);
    const size = container.clientWidth || 220;
    this.renderer.setSize(size, size, false);
    this.canvas.style.width = '100%';
    this.canvas.style.height = '100%';
    this.camera.aspect = 1;
    this.camera.updateProjectionMatrix();
    this.t = 0;
    if (!this.running) {
      this.running = true;
      let last = performance.now();
      const loop = () => {
        if (!this.running) return;
        const now = performance.now();
        this.t += Math.min(0.1, (now - last) / 1000);
        last = now;
        this.render();
        requestAnimationFrame(loop);
      };
      loop();
    }
  }

  setRank(idx) {
    this.holder.clear();
    this.model = createBadgeModel(idx);
    this.holder.add(this.model);
    this.sparkMat.color.set(RANKS[idx]?.hex ?? 0xffffff).lerp(new THREE.Color(0xffffff), 0.4);
    this.sparks.visible = idx > 0;
  }

  render() {
    const t = this.t;
    const intro = Math.min(1, t / 0.9);
    const e = 1 - Math.pow(1 - intro, 3);
    this.holder.scale.setScalar(0.2 + 0.8 * e);
    this.holder.rotation.y = (1 - e) * Math.PI * 3 + Math.sin(t * 1.4) * 0.5;
    this.holder.position.y = Math.sin(t * 2) * 0.12;
    this.model?.traverse((o) => { if (o.userData.spin) o.rotation.y = t * 2; });
    const pos = this.sparks.geometry.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      let y = pos.getY(i) + 0.02;
      if (y > 3) y = -3;
      pos.setY(i, y);
    }
    pos.needsUpdate = true;
    this.sparkMat.opacity = 0.5 + 0.5 * Math.sin(t * 6);
    this.renderer.render(this.scene, this.camera);
  }

  stop() {
    this.running = false;
  }
}
