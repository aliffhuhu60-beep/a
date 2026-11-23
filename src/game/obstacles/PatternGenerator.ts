import { LANES, SPAWN, THEME_LENGTH, TUNNEL_LENGTH, PHYSICS, type Lane } from '../engine/constants';
import { Rng } from '../engine/rng';
import type { ObstacleClass, ObstacleKind, PowerUpType } from '../engine/types';
import { difficultyAt, speedAt } from '../difficulty/Difficulty';
import { BUS_DIMS, OBSTACLE_DIMS, RAMP_LENGTH, TRAIN_CAR_LENGTH } from './obstacleDefs';

export interface ObstacleSpec {
  id: number;
  kind: ObstacleKind;
  cls: ObstacleClass;
  lane: Lane;
  /** Near edge along the track. */
  s: number;
  length: number;
  bottomY: number;
  topY: number;
  halfWidth: number;
  walkable: boolean;
  variant: number;
  /** Overhead obstacles: draw the gantry frame with this one. */
  withFrame?: boolean;
  /** Moving trains: speed towards the runner and activation distance. */
  moveSpeed?: number;
  activateDistance?: number;
  cars?: number;
}

export interface CoinSpec {
  lane: Lane;
  s: number;
  y: number;
}

export interface PowerUpSpec {
  type: PowerUpType;
  lane: Lane;
  s: number;
  y: number;
}

export interface TunnelSpec {
  s: number;
  length: number;
  /** Theme index that starts in the middle of this tunnel. */
  nextTheme: number;
}

export interface Chunk {
  obstacles: ObstacleSpec[];
  coins: CoinSpec[];
  powerUps: PowerUpSpec[];
  tunnels: TunnelSpec[];
}

export type Cell = 'free' | 'low' | 'high' | 'full';

export interface RowRecord {
  s: number;
  cells: [Cell, Cell, Cell];
  reach: number; // bitmask of lanes the runner can be in after this row
}

interface LongBlock {
  lane: Lane;
  minS: number;
  maxS: number;
}

type Pattern = 'free' | 'single' | 'pair' | 'wall' | 'train' | 'rampTrain' | 'doubleTrain' | 'movingTrain';

const laneIndex = (lane: Lane): number => lane + 1;
const bit = (lane: Lane): number => 1 << laneIndex(lane);

export interface GeneratorOptions {
  seed: number;
  /** Disable obstacles entirely (used by tests / tutorials). */
  noObstacles?: boolean;
  powerUpWeights?: Partial<Record<PowerUpType, number>>;
}

/**
 * Row-based procedural generator.
 *
 * Every obstacle row is validated against the set of lanes the runner can
 * possibly occupy (`reach`). A row is only accepted if at least one lane stays
 * reachable given lateral movement time and long objects (trains) that block
 * lane changes. If a random candidate fails, it falls back to simpler rows,
 * and a "free" row is always valid, so the generator can never create an
 * unavoidable wall.
 */
export class PatternGenerator {
  readonly rng: Rng;
  private nextRowS: number = SPAWN.safeStart;
  private reach = 0b111;
  private prevRowS = 0;
  private longs: LongBlock[] = [];
  private noSpawnUntil: [number, number, number] = [0, 0, 0];
  private recent: ObstacleSpec[] = [];
  private coinLane: Lane = 0;
  private nextPowerUpS = 260;
  private nextTunnelS = THEME_LENGTH - TUNNEL_LENGTH / 2;
  private theme = 0;
  private id = 1;
  private coinCursor = 30;
  readonly rows: RowRecord[] = [];
  /** Keep row history for validation in tests. */
  keepHistory = false;

  constructor(private readonly opts: GeneratorOptions) {
    this.rng = new Rng(opts.seed);
  }

  /** Generates all content with rows up to `untilS`. */
  generateUntil(untilS: number): Chunk {
    const chunk: Chunk = { obstacles: [], coins: [], powerUps: [], tunnels: [] };
    if (this.coinCursor === 30) {
      // Opening coin line to welcome the player.
      for (let s = 30; s < SPAWN.safeStart - 6; s += 2.4) chunk.coins.push({ lane: 0, s, y: 1.0 });
      this.coinCursor = 31;
    }
    while (this.nextTunnelS <= untilS) {
      this.theme++;
      chunk.tunnels.push({ s: this.nextTunnelS, length: TUNNEL_LENGTH, nextTheme: this.theme });
      this.nextTunnelS += THEME_LENGTH;
    }
    while (this.nextRowS <= untilS) this.generateRow(chunk);
    this.prune();
    return chunk;
  }

  private prune(): void {
    const keepFrom = this.prevRowS - 120;
    if (this.recent.length > 64) this.recent = this.recent.filter((o) => o.s + o.length > keepFrom);
    if (this.longs.length > 16) this.longs = this.longs.filter((l) => l.maxS > keepFrom);
  }

  private isBusy(lane: Lane, s: number): boolean {
    for (const l of this.longs) if (l.lane === lane && s >= l.minS - 2 && s <= l.maxS + 2) return true;
    return false;
  }

  private blockedBetween(lane: Lane, a: number, b: number): boolean {
    for (const l of this.longs) if (l.lane === lane && l.minS < b && l.maxS > a) return true;
    return false;
  }

  /** Lanes reachable at this row from the previous reach set. */
  private computeReach(cells: Cell[], s: number, newLongs: LongBlock[], gapTime: number): number {
    // Lane change time plus a human reaction margin.
    const lateral = Math.floor((gapTime - 0.3) / (PHYSICS.laneChangeTime + 0.07));
    const k = Math.max(0, Math.min(2, lateral));
    let out = 0;
    for (const j of LANES) {
      if (cells[laneIndex(j)] === 'full') continue;
      for (const i of LANES) {
        if (!(this.reach & bit(i))) continue;
        if (Math.abs(i - j) > k) continue;
        // Every lane passed through (excluding the start lane) must be open between rows.
        let ok = true;
        const dir = Math.sign(j - i);
        for (let m = i + dir; dir !== 0 && m !== j + dir; m += dir) {
          const lane = m as Lane;
          if (this.blockedBetween(lane, this.prevRowS + 1, s - 1)) ok = false;
          for (const nl of newLongs) if (nl.lane === lane && nl.minS < s - 1) ok = false;
        }
        if (ok) {
          out |= bit(j);
          break;
        }
      }
    }
    return out;
  }

  private pickPattern(s: number, d: number, freeLanes: number): Pattern {
    if (this.opts.noObstacles) return 'free';
    const w: Partial<Record<Pattern, number>> = {
      free: Math.max(0.15, 1.3 - d * 1.3),
      single: 2.0 - d,
      pair: 0.6 + 1.6 * d,
      wall: d > 0.15 ? 0.1 + 1.3 * d : 0,
    };
    if (s > 180 && freeLanes >= 2) {
      w.train = 0.6 + 0.9 * d;
      w.rampTrain = 0.45 + 0.5 * d;
    }
    if (s > 400 && freeLanes === 3) w.doubleTrain = Math.max(0, d - 0.15) * 1.8;
    if (s > 600 && freeLanes >= 2) w.movingTrain = Math.max(0, d - 0.25) * 2.2;
    return this.rng.weighted(w);
  }

  private cellFor(cls: ObstacleClass): Cell {
    return cls;
  }

  private makeObstacle(kind: ObstacleKind, lane: Lane, s: number, variant = 0): ObstacleSpec {
    const d = OBSTACLE_DIMS[kind];
    let length = d.length;
    let topY = d.topY;
    if (kind === 'vehicle' && variant === 1) {
      length = BUS_DIMS.length;
      topY = BUS_DIMS.topY;
    }
    return {
      id: this.id++,
      kind,
      cls: d.cls,
      lane,
      s,
      length,
      bottomY: d.bottomY,
      topY,
      halfWidth: d.halfWidth,
      walkable: d.walkable,
      variant,
    };
  }

  private obstacleForClass(cls: ObstacleClass, lane: Lane, s: number): ObstacleSpec {
    const r = this.rng;
    if (cls === 'low') return r.chance(0.65) ? this.makeObstacle('roadblock', lane, s, r.int(0, 1)) : this.makeObstacle('crateLow', lane, s - 0.5, r.int(0, 2));
    if (cls === 'high') return this.makeObstacle('overhead', lane, s, r.int(0, 2));
    if (r.chance(0.4)) return this.makeObstacle('crateStack', lane, s - 0.6, r.int(0, 2));
    return this.makeObstacle('vehicle', lane, s - 1, r.chance(0.45) ? 1 : 0);
  }

  private randomClass(d: number): ObstacleClass {
    return this.rng.weighted<ObstacleClass>({ low: 1.2, high: 0.6 + d * 0.8, full: 1.0 + d * 0.4 });
  }

  private generateRow(chunk: Chunk): void {
    const s = this.nextRowS;
    const d = difficultyAt(s);
    const v = speedAt(s);
    const gapTime = this.lastGapTime;
    const r = this.rng;

    const busy: boolean[] = LANES.map((l) => this.isBusy(l, s));
    const noSpawn: boolean[] = LANES.map((l) => this.noSpawnUntil[laneIndex(l)] > s - 2);
    const open = LANES.filter((l) => !busy[laneIndex(l)] && !noSpawn[laneIndex(l)]);

    let accepted: { cells: Cell[]; obstacles: ObstacleSpec[]; longs: LongBlock[]; reach: number; noSpawn?: [Lane, number] } | null = null;

    for (let attempt = 0; attempt < 6 && !accepted; attempt++) {
      const pattern: Pattern = attempt >= 4 ? (attempt === 4 ? 'single' : 'free') : this.pickPattern(s, d, open.length);
      const cand = this.buildPattern(pattern, s, d, v, open);
      const cells: Cell[] = LANES.map((l) => (busy[laneIndex(l)] ? 'full' : 'free'));
      for (const o of cand.obstacles) {
        const idx = laneIndex(o.lane);
        const c = o.kind === 'ramp' || o.kind === 'train' || o.kind === 'trainMoving' ? 'full' : this.cellFor(o.cls);
        // When two specs share a lane (e.g. ramp + train) the strictest wins.
        cells[idx] = rank(c) > rank(cells[idx]) ? c : cells[idx];
      }
      const reach = this.computeReach(cells, s, cand.longs, gapTime);
      if (reach !== 0) accepted = { cells, obstacles: cand.obstacles, longs: cand.longs, reach, noSpawn: cand.noSpawn };
    }
    if (!accepted) {
      // Absolute fallback: free row; staying in a currently reachable lane is always possible.
      const cells: Cell[] = LANES.map((l) => (busy[laneIndex(l)] ? 'full' : 'free'));
      accepted = { cells, obstacles: [], longs: [], reach: this.computeReach(cells, s, [], gapTime) || this.reach };
    }

    for (const o of accepted.obstacles) {
      chunk.obstacles.push(o);
      this.recent.push(o);
    }
    for (const l of accepted.longs) this.longs.push(l);
    if (accepted.noSpawn) {
      const [lane, until] = accepted.noSpawn;
      this.noSpawnUntil[laneIndex(lane)] = Math.max(this.noSpawnUntil[laneIndex(lane)], until);
    }

    const prevS = this.prevRowS;
    this.placeCoinsAndPowerUps(chunk, prevS, s, accepted.reach, accepted.cells);

    if (this.keepHistory) {
      this.rows.push({ s, cells: accepted.cells as [Cell, Cell, Cell], reach: accepted.reach });
    }
    this.reach = accepted.reach;
    this.prevRowS = s;

    // Next row distance scales with speed so reaction time stays fair.
    const nextGapTime = 1.35 - 0.5 * d + r.range(0, 0.32) * (1 - d * 0.5);
    this.lastGapTime = nextGapTime;
    this.nextRowS = s + speedAt(s) * nextGapTime;
  }

  private lastGapTime = 1.4;

  private buildPattern(
    pattern: Pattern,
    s: number,
    d: number,
    v: number,
    open: Lane[],
  ): { obstacles: ObstacleSpec[]; longs: LongBlock[]; noSpawn?: [Lane, number] } {
    const r = this.rng;
    const obstacles: ObstacleSpec[] = [];
    const longs: LongBlock[] = [];
    if (open.length === 0 || pattern === 'free') return { obstacles, longs };
    const lanes = r.shuffle([...open]);

    switch (pattern) {
      case 'single': {
        obstacles.push(this.obstacleForClass(this.randomClass(d), lanes[0], s));
        break;
      }
      case 'pair': {
        const n = Math.min(2, lanes.length);
        for (let i = 0; i < n; i++) obstacles.push(this.obstacleForClass(this.randomClass(d), lanes[i], s));
        break;
      }
      case 'wall': {
        // Every open lane gets an obstacle; at least one must be passable by jump/slide.
        const passIdx = r.int(0, lanes.length - 1);
        for (let i = 0; i < lanes.length; i++) {
          const cls: ObstacleClass = i === passIdx ? (r.chance(0.5) ? 'low' : 'high') : this.randomClass(d);
          obstacles.push(this.obstacleForClass(cls, lanes[i], s));
        }
        // Overhead boards across all lanes share one gantry frame.
        break;
      }
      case 'train':
      case 'rampTrain': {
        const cars = r.int(1, d > 0.4 ? 3 : 2);
        const lane = lanes[0];
        const withRamp = pattern === 'rampTrain';
        const start = withRamp ? s + RAMP_LENGTH : s;
        if (withRamp) obstacles.push(this.makeObstacle('ramp', lane, s, 0));
        obstacles.push(this.makeTrain(lane, start, cars));
        longs.push({ lane, minS: s, maxS: start + cars * TRAIN_CAR_LENGTH });
        if (lanes.length > 2 && r.chance(0.25 + d * 0.4)) {
          obstacles.push(this.obstacleForClass(this.randomClass(d), lanes[1], s));
        }
        if (withRamp) this.placeRoofCoins(lane, s, start + cars * TRAIN_CAR_LENGTH);
        break;
      }
      case 'doubleTrain': {
        const free = lanes[2];
        const a = lanes[0];
        const b = lanes[1];
        const carsA = r.int(1, 3);
        const carsB = r.int(1, 3);
        const rampA = r.chance(0.5);
        const startA = rampA ? s + RAMP_LENGTH : s;
        if (rampA) obstacles.push(this.makeObstacle('ramp', a, s, 0));
        obstacles.push(this.makeTrain(a, startA, carsA));
        obstacles.push(this.makeTrain(b, s + r.range(0, 6), carsB));
        longs.push({ lane: a, minS: s, maxS: startA + carsA * TRAIN_CAR_LENGTH });
        longs.push({ lane: b, minS: s, maxS: s + 6 + carsB * TRAIN_CAR_LENGTH });
        if (rampA) this.placeRoofCoins(a, s, startA + carsA * TRAIN_CAR_LENGTH);
        void free;
        break;
      }
      case 'movingTrain': {
        const lane = lanes[0];
        const cars = r.int(1, 2);
        const moveSpeed = 9 + 9 * d;
        const activate = 150;
        const length = cars * TRAIN_CAR_LENGTH;
        const s0 = s + (activate * moveSpeed) / (v + moveSpeed);
        const train = this.makeTrain(lane, s0, cars);
        train.kind = 'trainMoving';
        train.moveSpeed = moveSpeed;
        train.activateDistance = activate;
        obstacles.push(train);
        const passEnd = s + (length * v) / (v + moveSpeed) + 6;
        longs.push({ lane, minS: s, maxS: passEnd });
        return { obstacles, longs, noSpawn: [lane, s0 + length + 4] };
      }
      default:
        break;
    }
    // Overhead obstacles in this row share one gantry frame.
    const firstOverhead = obstacles.find((o) => o.kind === 'overhead');
    if (firstOverhead) firstOverhead.withFrame = true;
    return { obstacles, longs };
  }

  private makeTrain(lane: Lane, s: number, cars: number): ObstacleSpec {
    const t = this.makeObstacle('train', lane, s, this.rng.int(0, 2));
    t.cars = cars;
    t.length = cars * TRAIN_CAR_LENGTH;
    return t;
  }

  private pendingRoofCoins: CoinSpec[] = [];

  private placeRoofCoins(lane: Lane, rampS: number, endS: number): void {
    for (let s = rampS + 1.5; s < endS - 1; s += 2.4) {
      const onRamp = s < rampS + RAMP_LENGTH;
      const top = onRamp ? ((s - rampS) / RAMP_LENGTH) * OBSTACLE_DIMS.ramp.topY : OBSTACLE_DIMS.train.topY;
      this.pendingRoofCoins.push({ lane, s, y: top + 1.0 });
    }
  }

  /** True if (lane, s) is inside any obstacle footprint (with margin). */
  private insideObstacle(lane: Lane, s: number, margin: number): ObstacleSpec | null {
    for (const o of this.recent) {
      if (o.lane !== lane) continue;
      if (s > o.s - margin && s < o.s + o.length + margin) return o;
    }
    return null;
  }

  private placeCoinsAndPowerUps(chunk: Chunk, prevS: number, s: number, reach: number, cells: Cell[]): void {
    const r = this.rng;
    for (const c of this.pendingRoofCoins) chunk.coins.push(c);
    this.pendingRoofCoins.length = 0;

    // Choose which reachable lane the coin trail follows into this row.
    const lanesInReach = LANES.filter((l) => reach & bit(l));
    if (!(reach & bit(this.coinLane)) || r.chance(0.22)) this.coinLane = r.pick(lanesInReach);
    const lane = this.coinLane;
    const cell = cells[laneIndex(lane)];

    if (r.chance(0.72)) {
      const from = Math.max(prevS + 4, s - (s - prevS) * 0.6);
      const to = s + 5;
      for (let cs = from; cs <= to; cs += 2.4) {
        const hit = this.insideObstacle(lane, cs, 0.8);
        let y = 1.0;
        const dRow = Math.abs(cs - s);
        if (hit && hit.cls === 'full') continue;
        if (cell === 'low' && dRow < 4) y = 1.0 + 1.25 * Math.cos((dRow / 4) * (Math.PI / 2));
        else if (cell === 'high' && dRow < 1.5) y = 0.45;
        else if (hit) continue;
        if (this.isBusy(lane, cs)) continue;
        chunk.coins.push({ lane, s: cs, y });
      }
    }

    if (s >= this.nextPowerUpS) {
      const ps = prevS + (s - prevS) * 0.45;
      if (!this.insideObstacle(lane, ps, 3) && !this.isBusy(lane, ps)) {
        const weights = this.opts.powerUpWeights ?? { magnet: 30, multiplier: 24, shield: 24, jetpack: 22 };
        chunk.powerUps.push({ type: r.weighted(weights), lane, s: ps, y: 1.1 });
        this.nextPowerUpS = s + r.range(320, 560);
      }
    }
  }
}

const rank = (c: Cell): number => (c === 'full' ? 3 : c === 'high' ? 2 : c === 'low' ? 1 : 0);
