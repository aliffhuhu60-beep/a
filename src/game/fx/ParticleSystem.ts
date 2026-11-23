import * as THREE from 'three';

export interface EmitOptions {
  count: number;
  color: number;
  color2?: number;
  speed: number;
  spread?: number;
  /** Bias velocity direction (normalised internally). */
  dir?: [number, number, number];
  life: number;
  size: number;
  gravity?: number;
  drag?: number;
}

const tmpColor = new THREE.Color();
const tmpColor2 = new THREE.Color();

/**
 * GPU point-sprite particle system with a fixed-capacity ring buffer:
 * no allocations after construction, one draw call for every effect.
 */
export class ParticleSystem {
  readonly points: THREE.Points;
  private readonly cap: number;
  private readonly pos: Float32Array;
  private readonly vel: Float32Array;
  private readonly col: Float32Array;
  private readonly size: Float32Array;
  private readonly baseSize: Float32Array;
  private readonly alpha: Float32Array;
  private readonly life: Float32Array;
  private readonly maxLife: Float32Array;
  private readonly grav: Float32Array;
  private readonly drag: Float32Array;
  private cursor = 0;
  private alive = 0;
  private readonly geo: THREE.BufferGeometry;
  scale = 1;

  constructor(scene: THREE.Scene, capacity = 1600) {
    this.cap = capacity;
    this.pos = new Float32Array(capacity * 3);
    this.vel = new Float32Array(capacity * 3);
    this.col = new Float32Array(capacity * 3);
    this.size = new Float32Array(capacity);
    this.baseSize = new Float32Array(capacity);
    this.alpha = new Float32Array(capacity);
    this.life = new Float32Array(capacity);
    this.maxLife = new Float32Array(capacity);
    this.grav = new Float32Array(capacity);
    this.drag = new Float32Array(capacity);
    this.geo = new THREE.BufferGeometry();
    this.geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    this.geo.setAttribute('aColor', new THREE.BufferAttribute(this.col, 3).setUsage(THREE.DynamicDrawUsage));
    this.geo.setAttribute('aSize', new THREE.BufferAttribute(this.size, 1).setUsage(THREE.DynamicDrawUsage));
    this.geo.setAttribute('aAlpha', new THREE.BufferAttribute(this.alpha, 1).setUsage(THREE.DynamicDrawUsage));
    const mat = new THREE.ShaderMaterial({
      uniforms: { uScale: { value: window.innerHeight / 2 } },
      vertexShader: `attribute vec3 aColor; attribute float aSize; attribute float aAlpha; uniform float uScale;
varying vec3 vColor; varying float vAlpha;
void main(){ vColor = aColor; vAlpha = aAlpha; vec4 mv = modelViewMatrix * vec4(position, 1.0);
gl_PointSize = aSize * uScale / max(0.1, -mv.z); gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `varying vec3 vColor; varying float vAlpha;
void main(){ vec2 d = gl_PointCoord - 0.5; float r = dot(d, d); if (r > 0.25) discard;
float a = smoothstep(0.25, 0.0, r) * vAlpha; gl_FragColor = vec4(vColor * (1.0 + a), a); }`,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.points = new THREE.Points(this.geo, mat);
    this.points.frustumCulled = false;
    this.points.renderOrder = 10;
    scene.add(this.points);
  }

  setViewportHeight(h: number): void {
    (this.points.material as THREE.ShaderMaterial).uniforms.uScale.value = h / 2;
  }

  emit(x: number, y: number, z: number, o: EmitOptions): void {
    const count = Math.max(1, Math.round(o.count * this.scale));
    tmpColor.set(o.color);
    tmpColor2.set(o.color2 ?? o.color);
    const spread = o.spread ?? 1;
    let dx = 0;
    let dy = 0;
    let dz = 0;
    if (o.dir) {
      const l = Math.hypot(o.dir[0], o.dir[1], o.dir[2]) || 1;
      dx = o.dir[0] / l;
      dy = o.dir[1] / l;
      dz = o.dir[2] / l;
    }
    for (let n = 0; n < count; n++) {
      const i = this.cursor;
      this.cursor = (this.cursor + 1) % this.cap;
      if (this.life[i] <= 0) this.alive++;
      const i3 = i * 3;
      this.pos[i3] = x;
      this.pos[i3 + 1] = y;
      this.pos[i3 + 2] = z;
      // random direction in a sphere, blended with the bias direction
      const u = Math.random() * 2 - 1;
      const th = Math.random() * Math.PI * 2;
      const r = Math.sqrt(1 - u * u);
      const sp = o.speed * (0.4 + Math.random() * 0.6);
      this.vel[i3] = (Math.cos(th) * r * spread + dx) * sp;
      this.vel[i3 + 1] = (u * spread + dy) * sp;
      this.vel[i3 + 2] = (Math.sin(th) * r * spread + dz) * sp;
      const t = Math.random();
      this.col[i3] = tmpColor.r + (tmpColor2.r - tmpColor.r) * t;
      this.col[i3 + 1] = tmpColor.g + (tmpColor2.g - tmpColor.g) * t;
      this.col[i3 + 2] = tmpColor.b + (tmpColor2.b - tmpColor.b) * t;
      this.baseSize[i] = o.size * (0.6 + Math.random() * 0.8);
      this.life[i] = this.maxLife[i] = o.life * (0.6 + Math.random() * 0.6);
      this.grav[i] = o.gravity ?? 0;
      this.drag[i] = o.drag ?? 1.5;
    }
  }

  update(dt: number): void {
    if (this.alive <= 0) {
      this.alive = 0;
      return;
    }
    let alive = 0;
    for (let i = 0; i < this.cap; i++) {
      if (this.life[i] <= 0) continue;
      this.life[i] -= dt;
      const i3 = i * 3;
      if (this.life[i] <= 0) {
        this.alpha[i] = 0;
        this.size[i] = 0;
        continue;
      }
      alive++;
      const k = Math.max(0, 1 - this.drag[i] * dt);
      this.vel[i3] *= k;
      this.vel[i3 + 1] = this.vel[i3 + 1] * k - this.grav[i] * dt;
      this.vel[i3 + 2] *= k;
      this.pos[i3] += this.vel[i3] * dt;
      this.pos[i3 + 1] += this.vel[i3 + 1] * dt;
      this.pos[i3 + 2] += this.vel[i3 + 2] * dt;
      const f = this.life[i] / this.maxLife[i];
      this.alpha[i] = Math.min(1, f * 1.6);
      this.size[i] = this.baseSize[i] * (0.4 + 0.6 * f);
    }
    this.alive = alive;
    const a = this.geo.attributes;
    a.position.needsUpdate = true;
    a.aColor.needsUpdate = true;
    a.aSize.needsUpdate = true;
    a.aAlpha.needsUpdate = true;
  }

  clear(): void {
    this.life.fill(0);
    this.alpha.fill(0);
    this.size.fill(0);
    this.alive = 0;
    const a = this.geo.attributes;
    a.aAlpha.needsUpdate = true;
    a.aSize.needsUpdate = true;
  }
}
