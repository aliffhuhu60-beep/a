import * as THREE from 'three';
import { PHYSICS, laneX, toWorldZ, type Lane } from '../engine/constants';
import { Pool } from '../engine/Pool';
import type { ObstacleKind } from '../engine/types';
import type { Box } from '../collision/CollisionSystem';
import { CAR_COLOR_COUNT, carPaint, createObstacleVisual, type ObstacleVisual } from './ObstacleFactory';
import { OBSTACLE_DIMS, TRAIN_CAR_LENGTH } from './obstacleDefs';
import type { ObstacleSpec } from './PatternGenerator';

export interface ActiveObstacle {
  spec: ObstacleSpec;
  root: THREE.Object3D;
  parts: ObstacleVisual[];
  box: Box;
  prevBox: Box;
  moving: boolean;
  activated: boolean;
  smashed: boolean;
  passed: boolean;
  hitCooldown: number;
}

const poolKey = (kind: ObstacleKind | 'trainCar', variant: number): string => `${kind}:${variant}`;

/**
 * Spawns obstacles from generator specs using per-kind object pools, moves
 * trains, answers ground-height queries and recycles everything behind the runner.
 */
export class ObstacleManager {
  readonly active: ActiveObstacle[] = [];
  private readonly pools = new Map<string, Pool<ObstacleVisual>>();
  private readonly group = new THREE.Group();
  private time = 0;
  onTrainActivated?: (o: ActiveObstacle) => void;

  constructor(scene: THREE.Scene) {
    this.group.name = 'obstacles';
    scene.add(this.group);
  }

  private pool(kind: ObstacleKind | 'trainCar', variant: number): Pool<ObstacleVisual> {
    const key = poolKey(kind, variant);
    let p = this.pools.get(key);
    if (!p) {
      p = new Pool<ObstacleVisual>(
        () => createObstacleVisual(kind, variant),
        (v) => {
          v.root.visible = true;
          this.group.add(v.root);
        },
        (v) => {
          v.root.removeFromParent();
          if (v.headlights) v.headlights.visible = false;
        },
      );
      this.pools.set(key, p);
    }
    return p;
  }

  /** Pre-creates pooled visuals so no allocation/shader compile happens mid-run. */
  prewarm(): () => void {
    const created: ObstacleVisual[] = [];
    const want: [ObstacleKind | 'trainCar', number, number][] = [
      ['trainCar', 0, 6],
      ['trainCar', 1, 6],
      ['trainCar', 2, 6],
      ['ramp', 0, 3],
      ['vehicle', 0, 4],
      ['vehicle', 1, 3],
      ['roadblock', 0, 4],
      ['roadblock', 1, 3],
      ['crateLow', 0, 2],
      ['crateLow', 1, 2],
      ['crateLow', 2, 2],
      ['crateStack', 0, 2],
      ['crateStack', 1, 2],
      ['crateStack', 2, 2],
      ['overhead', 0, 3],
      ['overhead', 1, 3],
      ['overhead', 2, 3],
    ];
    for (const [k, v, n] of want) for (let i = 0; i < n; i++) created.push(this.pool(k, v).acquire());
    // Spread them out in front of the camera so they are all compiled/uploaded,
    // with every LOD level, headlight and gantry frame visible.
    created.forEach((c, i) => c.root.position.set(((i % 3) - 1) * 2.6, 0, -12 - Math.floor(i / 3) * 2.5));
    const lods: THREE.LOD[] = [];
    for (const c of created) {
      if (c.headlights) c.headlights.visible = true;
      if (c.frame) c.frame.visible = true;
      c.root.traverse((o) => {
        if (o instanceof THREE.LOD) {
          lods.push(o);
          o.autoUpdate = false;
          o.levels.forEach((l) => (l.object.visible = true));
        }
      });
    }
    // Caller renders, then returns them to the pool.
    return () => {
      for (const l of lods) {
        l.autoUpdate = true;
        l.levels.forEach((lv, i) => (lv.object.visible = i === 0));
      }
      for (const c of created) {
        c.root.position.set(0, 0, 0);
        this.pool(c.kind, c.variant).release(c);
      }
    };
  }

  spawn(spec: ObstacleSpec): ActiveObstacle {
    const root = new THREE.Group();
    const parts: ObstacleVisual[] = [];
    if (spec.kind === 'train' || spec.kind === 'trainMoving') {
      const cars = spec.cars ?? Math.max(1, Math.round(spec.length / TRAIN_CAR_LENGTH));
      for (let i = 0; i < cars; i++) {
        const car = this.pool('trainCar', spec.variant).acquire();
        car.root.position.set(0, 0, -i * TRAIN_CAR_LENGTH);
        root.add(car.root);
        parts.push(car);
        if (i === 0 && car.headlights) car.headlights.visible = spec.kind === 'trainMoving';
      }
    } else {
      const v = this.pool(spec.kind, spec.variant).acquire();
      root.add(v.root);
      parts.push(v);
      if (v.frame) {
        v.frame.visible = !!spec.withFrame;
        v.frame.position.x = -laneX(spec.lane);
      }
      if (v.body && spec.kind === 'vehicle' && spec.variant === 0) {
        v.body.material = carPaint(spec.id % CAR_COLOR_COUNT);
      }
    }
    root.position.set(laneX(spec.lane), 0, toWorldZ(spec.s));
    this.group.add(root);
    const box: Box = {
      minX: laneX(spec.lane) - spec.halfWidth,
      maxX: laneX(spec.lane) + spec.halfWidth,
      minY: spec.bottomY,
      maxY: spec.topY,
      minS: spec.s,
      maxS: spec.s + spec.length,
    };
    const o: ActiveObstacle = {
      spec,
      root,
      parts,
      box,
      prevBox: { ...box },
      moving: spec.kind === 'trainMoving',
      activated: false,
      smashed: false,
      passed: false,
      hitCooldown: 0,
    };
    this.active.push(o);
    return o;
  }

  /** Spawns a single obstacle at an absolute position (used by tests and the tutorial). */
  spawnAt(kind: ObstacleKind, lane: Lane, s: number, variant = 0, cars = 1): ActiveObstacle {
    const d = OBSTACLE_DIMS[kind];
    const spec: ObstacleSpec = {
      id: 900000 + Math.floor(Math.random() * 99999),
      kind,
      cls: d.cls,
      lane,
      s,
      length: kind === 'train' || kind === 'trainMoving' ? cars * TRAIN_CAR_LENGTH : d.length,
      bottomY: d.bottomY,
      topY: d.topY,
      halfWidth: d.halfWidth,
      walkable: d.walkable,
      variant,
      cars,
      withFrame: kind === 'overhead',
      moveSpeed: kind === 'trainMoving' ? 12 : undefined,
      activateDistance: kind === 'trainMoving' ? 150 : undefined,
    };
    return this.spawn(spec);
  }

  private release(o: ActiveObstacle): void {
    for (const p of o.parts) this.pool(p.kind, p.variant).release(p);
    o.root.removeFromParent();
  }

  /** Fixed-step update: moving trains. */
  step(dt: number, playerS: number): void {
    for (const o of this.active) {
      o.prevBox.minS = o.box.minS;
      o.prevBox.maxS = o.box.maxS;
      if (o.hitCooldown > 0) o.hitCooldown -= dt;
      if (!o.moving || o.smashed) continue;
      const act = o.spec.activateDistance ?? 150;
      if (!o.activated && o.box.minS - playerS <= act) {
        o.activated = true;
        this.onTrainActivated?.(o);
      }
      if (o.activated) {
        const v = (o.spec.moveSpeed ?? 12) * dt;
        o.box.minS -= v;
        o.box.maxS -= v;
      }
    }
  }

  /** Per-frame visual sync and recycling. */
  update(dt: number, playerS: number, behind: number): void {
    this.time += dt;
    const blinkOn = Math.sin(this.time * 9) > 0;
    for (let i = this.active.length - 1; i >= 0; i--) {
      const o = this.active[i];
      if (o.box.maxS < playerS - behind) {
        this.release(o);
        this.active.splice(i, 1);
        continue;
      }
      o.root.position.z = toWorldZ(o.box.minS);
      for (const p of o.parts) if (p.blink) p.blink.visible = blinkOn;
    }
  }

  /** Height of the ramp/roof surface at s (0 if outside). */
  topAt(o: ActiveObstacle, s: number): number {
    if (o.spec.kind === 'ramp') {
      const t = (s - o.box.minS) / (o.box.maxS - o.box.minS);
      return o.spec.topY * Math.min(1, Math.max(0, t));
    }
    return o.box.maxY;
  }

  /** Highest walkable surface the runner can stand on at (x, s). */
  groundAt = (x: number, halfWidth: number, s: number, feetY: number): number => {
    let ground = 0;
    for (const o of this.active) {
      if (!o.spec.walkable || o.smashed) continue;
      if (s < o.box.minS || s > o.box.maxS) continue;
      // Require most of the body over the surface so you can't stand on an edge.
      if (x + halfWidth * 0.3 < o.box.minX || x - halfWidth * 0.3 > o.box.maxX) continue;
      const top = this.topAt(o, s);
      if (top <= feetY + PHYSICS.stepUp && top > ground) ground = top;
    }
    return ground;
  };

  smash(o: ActiveObstacle): void {
    o.smashed = true;
    o.root.visible = false;
  }

  /** Removes obstacles in a stretch (fair landing zone after the jetpack). */
  clearRange(fromS: number, toS: number): void {
    for (let i = this.active.length - 1; i >= 0; i--) {
      const o = this.active[i];
      if (o.box.maxS > fromS && o.box.minS < toS) {
        this.release(o);
        this.active.splice(i, 1);
      }
    }
  }

  clear(): void {
    for (const o of this.active) this.release(o);
    this.active.length = 0;
  }
}
