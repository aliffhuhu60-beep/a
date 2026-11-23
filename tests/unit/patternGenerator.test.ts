import { describe, expect, it } from 'vitest';
import { PatternGenerator, type ObstacleSpec } from '../../src/game/obstacles/PatternGenerator';
import { speedAt } from '../../src/game/difficulty/Difficulty';
import { PHYSICS, PLAYER_DIMS } from '../../src/game/engine/constants';

const STEP = 0.5;

/** Player-space interval in which an obstacle blocks a lane (moving trains included). */
const footprint = (o: ObstacleSpec): [number, number] => {
  const margin = PLAYER_DIMS.halfDepth + 0.1;
  if (o.kind === 'trainMoving') {
    const vt = o.moveSpeed ?? 12;
    const a = o.activateDistance ?? 150;
    // The generator plans the meeting point; recompute it independently.
    let sm = o.s - (a * vt) / (speedAt(o.s) + vt);
    for (let i = 0; i < 5; i++) sm = o.s - (a * vt) / (speedAt(sm) + vt);
    const v = speedAt(sm);
    return [sm - margin, sm + (o.length * v) / (v + vt) + margin];
  }
  return [o.s - margin, o.s + o.length + margin];
};

/**
 * Independent solvability check: breadth-first search over (distance, lane).
 * Only "full" obstacles block (jump/slide obstacles are passable with an action).
 * A lane change needs both lanes clear for the time it takes plus reaction margin.
 */
const solvable = (obstacles: ObstacleSpec[], until: number): { ok: boolean; failAt: number } => {
  const n = Math.ceil(until / STEP);
  const blocked = [new Uint8Array(n), new Uint8Array(n), new Uint8Array(n)];
  for (const o of obstacles) {
    if (o.cls !== 'full') continue;
    const [a, b] = footprint(o);
    for (let i = Math.max(0, Math.floor(a / STEP)); i <= Math.min(n - 1, Math.ceil(b / STEP)); i++) blocked[o.lane + 1][i] = 1;
  }
  let reach = [true, true, true];
  for (let i = 1; i < n; i++) {
    const s = i * STEP;
    const k = Math.ceil((speedAt(s) * (PHYSICS.laneChangeTime + 0.05)) / STEP);
    const next = [false, false, false];
    for (let l = 0; l < 3; l++) if (reach[l] && !blocked[l][i]) next[l] = true;
    // Lateral moves started at step i-k that complete by step i.
    for (let l = 0; l < 3; l++) {
      if (next[l] || blocked[l][i]) continue;
      for (const from of [l - 1, l + 1]) {
        if (from < 0 || from > 2) continue;
        const start = i - k;
        if (start < 0) continue;
        let ok = true;
        for (let j = start; j <= i; j++) if (blocked[l][j] || blocked[from][j]) ok = false;
        if (ok && laneHistory[from][start]) next[l] = true;
      }
    }
    for (let l = 0; l < 3; l++) laneHistory[l][i] = next[l];
    if (!next.some(Boolean)) return { ok: false, failAt: s };
    reach = next;
  }
  return { ok: true, failAt: -1 };
};
let laneHistory: Uint8Array[] | boolean[][] = [];

const run = (seed: number, until: number) => {
  const gen = new PatternGenerator({ seed });
  gen.keepHistory = true;
  const obstacles: ObstacleSpec[] = [];
  const coins: { lane: number; s: number; y: number }[] = [];
  const powerUps: unknown[] = [];
  for (let s = 0; s < until; s += 50) {
    const c = gen.generateUntil(s);
    obstacles.push(...c.obstacles);
    coins.push(...c.coins);
    powerUps.push(...c.powerUps);
  }
  return { gen, obstacles, coins, powerUps };
};

describe('PatternGenerator', () => {
  it('is deterministic for a given seed', () => {
    const a = run(123, 2000).obstacles.map((o) => `${o.kind}:${o.lane}:${o.s.toFixed(2)}`);
    const b = run(123, 2000).obstacles.map((o) => `${o.kind}:${o.lane}:${o.s.toFixed(2)}`);
    expect(a).toEqual(b);
    const c = run(124, 2000).obstacles.map((o) => `${o.kind}:${o.lane}:${o.s.toFixed(2)}`);
    expect(c).not.toEqual(a);
  });

  it('keeps the start of the run obstacle-free', () => {
    const { obstacles } = run(5, 500);
    expect(Math.min(...obstacles.map((o) => o.s))).toBeGreaterThanOrEqual(69);
  });

  it('always leaves a reachable lane in every row', () => {
    for (const seed of [1, 2, 3, 42, 777]) {
      const { gen } = run(seed, 8000);
      expect(gen.rows.length).toBeGreaterThan(100);
      for (const r of gen.rows) expect(r.reach).not.toBe(0);
    }
  });

  it('produces layouts an independent solver can always survive', () => {
    for (const seed of [11, 22, 33, 44, 55, 66, 77, 88]) {
      const until = 7000;
      const { obstacles } = run(seed, until + 300);
      laneHistory = [new Uint8Array(Math.ceil(until / STEP)), new Uint8Array(Math.ceil(until / STEP)), new Uint8Array(Math.ceil(until / STEP))];
      for (let l = 0; l < 3; l++) laneHistory[l][0] = 1;
      const res = solvable(obstacles, until);
      expect(res, `seed ${seed} unsolvable at ${res.failAt} m`).toEqual({ ok: true, failAt: -1 });
    }
  });

  it('gets harder: more obstacles and trains later in the run', () => {
    const { obstacles } = run(9, 6000);
    const early = obstacles.filter((o) => o.s < 1500).length;
    const late = obstacles.filter((o) => o.s > 4500).length;
    expect(late).toBeGreaterThanOrEqual(early * 0.8);
    expect(obstacles.some((o) => o.kind === 'trainMoving' && o.s > 600)).toBe(true);
    expect(obstacles.filter((o) => o.kind === 'trainMoving' && o.s < 600)).toHaveLength(0);
    const kinds = new Set(obstacles.map((o) => o.kind));
    for (const k of ['roadblock', 'crateLow', 'overhead', 'crateStack', 'vehicle', 'train', 'ramp', 'trainMoving']) expect(kinds.has(k as never)).toBe(true);
  });

  it('never places coins inside solid obstacles', () => {
    const { obstacles, coins } = run(31, 5000);
    for (const c of coins) {
      for (const o of obstacles) {
        if (o.lane !== c.lane || o.kind === 'trainMoving') continue;
        // Ramps are sloped: their surface rises linearly to topY.
        const top = o.kind === 'ramp' ? (o.topY * (c.s - o.s)) / o.length : o.topY;
        const inside = c.s > o.s + 0.2 && c.s < o.s + o.length - 0.2 && c.y > o.bottomY && c.y < top;
        expect(inside, `coin at ${c.s} lane ${c.lane} inside ${o.kind} at ${o.s}`).toBe(false);
      }
    }
  });

  it('spawns power-ups at a balanced rate', () => {
    const { powerUps } = run(17, 6000);
    expect(powerUps.length).toBeGreaterThan(6);
    expect(powerUps.length).toBeLessThan(25);
  });

  it('keeps reaction time fair at top speed (rows are far enough apart)', () => {
    const { gen } = run(3, 9000);
    for (let i = 1; i < gen.rows.length; i++) {
      const gap = gen.rows[i].s - gen.rows[i - 1].s;
      const t = gap / speedAt(gen.rows[i - 1].s);
      expect(t).toBeGreaterThan(0.8);
    }
  });
});
