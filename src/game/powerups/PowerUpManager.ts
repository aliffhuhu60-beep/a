import * as THREE from 'three';
import { laneX, toWorldZ } from '../engine/constants';
import type { PowerUpStatus, PowerUpType } from '../engine/types';
import { createShieldMaterial, sharedGeometry, sharedMaterial } from '../world/materials';
import { glowTexture } from '../world/textures';
import type { PowerUpSpec } from '../obstacles/PatternGenerator';
import { POWER_UPS, powerUpDuration } from './powerupDefs';

interface Pickup {
  type: PowerUpType;
  x: number;
  y: number;
  s: number;
  obj: THREE.Object3D;
  taken: boolean;
}

const std = (key: string, color: number, emissive = 0x000000, ei = 0): THREE.MeshStandardMaterial =>
  sharedMaterial(`pu-${key}`, () => new THREE.MeshStandardMaterial({ color, emissive, emissiveIntensity: ei, metalness: 0.5, roughness: 0.35 }));

/** 3D pickup models (original designs built from primitives). */
export const createPowerUpModel = (type: PowerUpType): THREE.Group => {
  const g = new THREE.Group();
  const inner = new THREE.Group();
  g.add(inner);
  const def = POWER_UPS[type];
  switch (type) {
    case 'magnet': {
      const red = std('mag-red', 0xff3b5c, 0x801020, 0.6);
      const steel = std('mag-steel', 0xdfe6ee);
      const arc = new THREE.Mesh(sharedGeometry('mag-arc', () => new THREE.TorusGeometry(0.38, 0.13, 10, 20, Math.PI)), red);
      arc.rotation.z = Math.PI;
      inner.add(arc);
      for (const x of [-0.38, 0.38]) {
        const tip = new THREE.Mesh(sharedGeometry('mag-tip', () => new THREE.CylinderGeometry(0.13, 0.13, 0.22, 10)), steel);
        tip.position.set(x, 0.1, 0);
        inner.add(tip);
      }
      break;
    }
    case 'jetpack': {
      const body = std('jet-body', 0xd8dde3);
      const tank = std('jet-tank', 0xffa21a, 0x803d00, 0.5);
      inner.add(new THREE.Mesh(sharedGeometry('jet-plate', () => new THREE.BoxGeometry(0.5, 0.6, 0.15)), body));
      for (const x of [-0.2, 0.2]) {
        const t = new THREE.Mesh(sharedGeometry('jet-tank', () => new THREE.CapsuleGeometry(0.13, 0.42, 4, 10)), tank);
        t.position.set(x, 0, 0.15);
        inner.add(t);
        const n = new THREE.Mesh(sharedGeometry('jet-nozzle', () => new THREE.ConeGeometry(0.1, 0.16, 10)), body);
        n.position.set(x, -0.38, 0.15);
        inner.add(n);
      }
      break;
    }
    case 'multiplier': {
      const green = std('mul', 0x9dff3b, 0x3d8000, 0.7);
      for (const r of [Math.PI / 4, -Math.PI / 4]) {
        const bar = new THREE.Mesh(sharedGeometry('mul-bar', () => new THREE.BoxGeometry(0.16, 0.8, 0.16)), green);
        bar.rotation.z = r;
        bar.position.x = -0.22;
        inner.add(bar);
      }
      const two = new THREE.Mesh(sharedGeometry('mul-two', () => new THREE.TorusGeometry(0.2, 0.08, 8, 16, Math.PI * 1.2)), green);
      two.position.set(0.3, 0.12, 0);
      two.rotation.z = -0.4;
      inner.add(two);
      const base = new THREE.Mesh(sharedGeometry('mul-base', () => new THREE.BoxGeometry(0.42, 0.13, 0.16)), green);
      base.position.set(0.32, -0.3, 0);
      inner.add(base);
      break;
    }
    case 'shield': {
      const blue = std('shield', 0x4fd8ff, 0x0a5a80, 0.7);
      const shape = new THREE.Shape();
      shape.moveTo(0, 0.45);
      shape.quadraticCurveTo(0.35, 0.45, 0.4, 0.3);
      shape.quadraticCurveTo(0.4, -0.2, 0, -0.5);
      shape.quadraticCurveTo(-0.4, -0.2, -0.4, 0.3);
      shape.quadraticCurveTo(-0.35, 0.45, 0, 0.45);
      inner.add(new THREE.Mesh(sharedGeometry('shield', () => {
        const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.12, bevelEnabled: true, bevelSize: 0.03, bevelThickness: 0.03, bevelSegments: 2 });
        geo.center();
        return geo;
      }), blue));
      break;
    }
  }
  const glow = new THREE.Sprite(sharedMaterial(`pu-glow-${type}`, () => new THREE.SpriteMaterial({ map: glowTexture(), color: def.color, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false })));
  glow.scale.set(2.2, 2.2, 1);
  g.add(glow);
  const ring = new THREE.Mesh(
    sharedGeometry('pu-ring', () => new THREE.TorusGeometry(0.75, 0.03, 6, 32)),
    sharedMaterial(`pu-ring-${type}`, () => new THREE.MeshBasicMaterial({ color: def.color, transparent: true, opacity: 0.8 })),
  );
  ring.rotation.x = Math.PI / 2;
  ring.position.y = -0.7;
  g.add(ring);
  g.userData.inner = inner;
  g.userData.ring = ring;
  return g;
};

/**
 * Pickups in the world plus the active power-up timers and their effects on
 * the runner (magnet aura, shield bubble, jetpack, multiplier sparkle).
 */
export class PowerUpManager {
  private readonly pickups: Pickup[] = [];
  private readonly pool: Record<PowerUpType, THREE.Group[]> = { magnet: [], jetpack: [], multiplier: [], shield: [] };
  readonly timers = new Map<PowerUpType, PowerUpStatus>();
  private readonly group = new THREE.Group();
  private time = 0;
  levels: Record<PowerUpType, number> = { magnet: 0, jetpack: 0, multiplier: 0, shield: 0 };
  readonly shieldBubble: THREE.Mesh;
  readonly magnetAura: THREE.Group;
  readonly jetpackModel: THREE.Group;
  private readonly shieldMat: THREE.ShaderMaterial;
  onPickup?: (type: PowerUpType, x: number, y: number, s: number) => void;
  onExpire?: (type: PowerUpType) => void;

  constructor(scene: THREE.Scene) {
    scene.add(this.group);
    this.shieldMat = createShieldMaterial();
    this.shieldBubble = new THREE.Mesh(new THREE.SphereGeometry(1.15, 24, 16), this.shieldMat);
    this.shieldBubble.visible = false;
    this.magnetAura = new THREE.Group();
    for (let i = 0; i < 3; i++) {
      const r = new THREE.Mesh(new THREE.TorusGeometry(0.9 + i * 0.25, 0.02, 6, 40), new THREE.MeshBasicMaterial({ color: 0xff3b5c, transparent: true, opacity: 0.55 - i * 0.12, blending: THREE.AdditiveBlending, depthWrite: false }));
      r.rotation.x = Math.PI / 2;
      this.magnetAura.add(r);
    }
    this.magnetAura.visible = false;
    this.jetpackModel = createPowerUpModel('jetpack');
    this.jetpackModel.children.slice(1).forEach((c) => (c.visible = false));
    this.jetpackModel.visible = false;
    for (const t of Object.keys(this.pool) as PowerUpType[]) for (let i = 0; i < 2; i++) this.pool[t].push(createPowerUpModel(t));
  }

  spawn(spec: PowerUpSpec): void {
    this.spawnAt(spec.type, laneX(spec.lane), spec.y, spec.s);
  }

  spawnAt(type: PowerUpType, x: number, y: number, s: number): void {
    const obj = this.pool[type].pop() ?? createPowerUpModel(type);
    obj.position.set(x, y, toWorldZ(s));
    obj.visible = true;
    this.group.add(obj);
    this.pickups.push({ type, x, y, s, obj, taken: false });
  }

  isActive(type: PowerUpType): boolean {
    return this.timers.has(type);
  }

  activate(type: PowerUpType): void {
    const duration = powerUpDuration(type, this.levels[type]);
    this.timers.set(type, { type, duration, remaining: duration });
  }

  /** Ends a power-up early (shield absorbing a crash). */
  consume(type: PowerUpType): void {
    if (this.timers.delete(type)) this.onExpire?.(type);
  }

  /** Fixed-step: pickup collision + timers. */
  step(dt: number, px: number, py: number, ps: number, height: number): void {
    for (let i = this.pickups.length - 1; i >= 0; i--) {
      const p = this.pickups[i];
      if (p.s < ps - 10) {
        this.recycle(i);
        continue;
      }
      if (!p.taken && Math.abs(p.x - px) < 0.95 && Math.abs(p.s - ps) < 1.0 && p.y > py - 0.6 && p.y < py + height + 0.6) {
        p.taken = true;
        this.activate(p.type);
        this.onPickup?.(p.type, p.x, p.y, p.s);
        this.recycle(i);
      }
    }
    for (const [type, st] of this.timers) {
      st.remaining -= dt;
      if (st.remaining <= 0) {
        this.timers.delete(type);
        this.onExpire?.(type);
      }
    }
  }

  private recycle(i: number): void {
    const p = this.pickups[i];
    p.obj.removeFromParent();
    this.pool[p.type].push(p.obj as THREE.Group);
    this.pickups.splice(i, 1);
  }

  /** Per-frame animation of pickups and active effects attached to the runner. */
  update(dt: number, runner: THREE.Object3D): void {
    this.time += dt;
    for (const p of this.pickups) {
      const inner = p.obj.userData.inner as THREE.Object3D;
      inner.rotation.y = this.time * 2.4;
      inner.position.y = Math.sin(this.time * 3 + p.s) * 0.12;
      const ring = p.obj.userData.ring as THREE.Object3D;
      ring.scale.setScalar(1 + Math.sin(this.time * 4) * 0.08);
    }
    const shield = this.timers.get('shield');
    this.shieldBubble.visible = !!shield;
    if (shield) {
      this.shieldMat.uniforms.uTime.value = this.time;
      // Flicker during the last 2 seconds.
      this.shieldMat.uniforms.uOpacity.value = shield.remaining < 2 ? (Math.sin(this.time * 20) > 0 ? 1 : 0.3) : 1;
      this.shieldBubble.position.set(runner.position.x, runner.position.y + 0.95, runner.position.z);
    }
    this.magnetAura.visible = this.timers.has('magnet');
    if (this.magnetAura.visible) {
      this.magnetAura.position.set(runner.position.x, runner.position.y + 0.15, runner.position.z);
      this.magnetAura.children.forEach((c, i) => {
        const k = (this.time * 1.2 + i / 3) % 1;
        c.position.y = k * 1.8;
        c.scale.setScalar(1.2 - k * 0.4);
        ((c as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity = 0.6 * (1 - k);
      });
    }
  }

  statuses(out: PowerUpStatus[]): PowerUpStatus[] {
    out.length = 0;
    for (const st of this.timers.values()) out.push({ type: st.type, remaining: Math.max(0, st.remaining), duration: st.duration });
    return out;
  }

  clear(): void {
    for (let i = this.pickups.length - 1; i >= 0; i--) this.recycle(i);
    this.timers.clear();
    this.shieldBubble.visible = false;
    this.magnetAura.visible = false;
  }

  attachEffects(scene: THREE.Scene): void {
    scene.add(this.shieldBubble, this.magnetAura);
  }
}
