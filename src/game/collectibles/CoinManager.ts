import * as THREE from 'three';
import { LANES, laneX, toWorldZ } from '../engine/constants';
import { coinFaceTexture } from '../world/textures';
import { sharedMaterial } from '../world/materials';

const CAP = 800;
const IDLE = 1;
const ATTRACT = 2;
const COLLECTING = 3;

export interface CoinPlayerState {
  x: number;
  y: number;
  s: number;
  height: number;
}

/**
 * All coins are rendered by one InstancedMesh. Active coins are compacted into
 * the first N instances each frame, so the GPU only draws what exists.
 */
export class CoinManager {
  readonly mesh: THREE.InstancedMesh;
  private readonly x = new Float32Array(CAP);
  private readonly y = new Float32Array(CAP);
  private readonly s = new Float32Array(CAP);
  private readonly t = new Float32Array(CAP);
  private readonly state = new Uint8Array(CAP);
  private readonly free: number[] = [];
  private readonly live: number[] = [];
  private readonly m = new THREE.Matrix4();
  private readonly q = new THREE.Quaternion();
  private readonly e = new THREE.Euler();
  private readonly p = new THREE.Vector3();
  private readonly sc = new THREE.Vector3();
  private time = 0;
  onCollect?: (x: number, y: number, s: number) => void;

  constructor(scene: THREE.Scene) {
    const geo = new THREE.CylinderGeometry(0.42, 0.42, 0.09, 22);
    geo.rotateX(Math.PI / 2);
    const edge = sharedMaterial('coin-edge', () => new THREE.MeshStandardMaterial({ color: 0xffb000, metalness: 0.9, roughness: 0.3, emissive: 0x6a3d00, emissiveIntensity: 0.6 }));
    const face = sharedMaterial('coin-face', () => new THREE.MeshStandardMaterial({ map: coinFaceTexture(), metalness: 0.75, roughness: 0.3, emissive: 0x7a4a00, emissiveIntensity: 0.55 }));
    this.mesh = new THREE.InstancedMesh(geo, [edge, face, face], CAP);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.frustumCulled = false;
    this.mesh.count = 0;
    this.mesh.castShadow = false;
    scene.add(this.mesh);
    for (let i = CAP - 1; i >= 0; i--) this.free.push(i);
  }

  get count(): number {
    return this.live.length;
  }

  spawn(x: number, y: number, s: number): void {
    const i = this.free.pop();
    if (i === undefined) return;
    this.x[i] = x;
    this.y[i] = y;
    this.s[i] = s;
    this.t[i] = 0;
    this.state[i] = IDLE;
    this.live.push(i);
  }

  /** Coins in the air for the jetpack: a zig-zag trail across the lanes. */
  spawnTrail(fromS: number, toS: number, y: number): void {
    let lane = 0;
    let n = 0;
    for (let s = fromS; s < toS; s += 2.2) {
      if (n++ % 9 === 0) lane = LANES[Math.floor(Math.random() * 3)];
      this.spawn(laneX(lane), y + 0.9, s);
    }
  }

  /** Fixed-step pickup logic. Returns the number of coins collected this step. */
  step(dt: number, p: CoinPlayerState, magnetRadius: number): number {
    let collected = 0;
    const cy = p.y + p.height * 0.55;
    const r2 = magnetRadius * magnetRadius;
    for (let k = this.live.length - 1; k >= 0; k--) {
      const i = this.live[k];
      const st = this.state[i];
      if (st === COLLECTING) {
        this.t[i] += dt;
        this.s[i] = p.s + 0.2;
        this.x[i] += (p.x - this.x[i]) * Math.min(1, dt * 20);
        this.y[i] += (p.y + p.height + 0.4 - this.y[i]) * Math.min(1, dt * 20);
        if (this.t[i] > 0.15) this.remove(k);
        continue;
      }
      const ds = this.s[i] - p.s;
      if (ds < -6) {
        this.remove(k);
        continue;
      }
      if (st === IDLE && magnetRadius > 0 && ds < magnetRadius && ds > -1) {
        const dx = this.x[i] - p.x;
        const dy = this.y[i] - cy;
        if (dx * dx + dy * dy + ds * ds < r2) {
          this.state[i] = ATTRACT;
          this.t[i] = 0;
        }
      }
      if (this.state[i] === ATTRACT) {
        this.t[i] += dt;
        const k2 = Math.min(1, dt * (8 + this.t[i] * 40));
        this.x[i] += (p.x - this.x[i]) * k2;
        this.y[i] += (cy - this.y[i]) * k2;
        this.s[i] += (p.s + 0.3 - this.s[i]) * k2;
      }
      const dx = Math.abs(this.x[i] - p.x);
      const dss = Math.abs(this.s[i] - p.s);
      const yy = this.y[i];
      if (dx < 0.8 && dss < 0.9 && yy > p.y - 0.45 && yy < p.y + p.height + 0.35) {
        this.state[i] = COLLECTING;
        this.t[i] = 0;
        collected++;
        this.onCollect?.(this.x[i], this.y[i], this.s[i]);
      }
    }
    return collected;
  }

  private remove(k: number): void {
    const i = this.live[k];
    this.state[i] = 0;
    this.live[k] = this.live[this.live.length - 1];
    this.live.pop();
    this.free.push(i);
  }

  /** Per-frame: spin, bob and compact the instance buffer. */
  update(dt: number): void {
    this.time += dt;
    let n = 0;
    for (let k = 0; k < this.live.length; k++) {
      const i = this.live[k];
      const st = this.state[i];
      const scale = st === COLLECTING ? Math.max(0.05, 1 - this.t[i] / 0.15) : 1;
      const bob = st === IDLE ? Math.sin(this.time * 3 + this.s[i] * 0.5) * 0.06 : 0;
      this.e.set(0, this.time * 3.2 + this.s[i] * 0.35, 0);
      this.q.setFromEuler(this.e);
      this.p.set(this.x[i], this.y[i] + bob, toWorldZ(this.s[i]));
      this.sc.setScalar(scale);
      this.m.compose(this.p, this.q, this.sc);
      this.mesh.setMatrixAt(n++, this.m);
    }
    this.mesh.count = n;
    this.mesh.instanceMatrix.needsUpdate = true;
  }

  clearRange(fromS: number, toS: number): void {
    for (let k = this.live.length - 1; k >= 0; k--) {
      const i = this.live[k];
      if (this.s[i] > fromS && this.s[i] < toS && this.state[i] === IDLE) this.remove(k);
    }
  }

  clear(): void {
    while (this.live.length) this.remove(this.live.length - 1);
    this.mesh.count = 0;
  }
}
