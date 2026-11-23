import { describe, expect, it } from 'vitest';
import { classifyHit, overlaps, type Box } from '../../src/game/collision/CollisionSystem';
import { ScoreSystem } from '../../src/game/score/ScoreSystem';
import { difficultyAt, speedAt, tierAt } from '../../src/game/difficulty/Difficulty';
import { SPEED } from '../../src/game/engine/constants';
import { Rng } from '../../src/game/engine/rng';
import { Pool } from '../../src/game/engine/Pool';
import { powerUpDuration } from '../../src/game/powerups/powerupDefs';

const box = (minX: number, maxX: number, minY: number, maxY: number, minS: number, maxS: number): Box => ({ minX, maxX, minY, maxY, minS, maxS });

describe('CollisionSystem', () => {
  const obs = box(-1, 1, 0, 1, 10, 11);
  it('detects overlaps on all three axes', () => {
    expect(overlaps(box(-0.4, 0.4, 0, 1.75, 9.8, 10.4), obs)).toBe(true);
    expect(overlaps(box(-0.4, 0.4, 1.1, 2.85, 9.8, 10.4), obs)).toBe(false); // jumped over
    expect(overlaps(box(2, 2.8, 0, 1.75, 9.8, 10.4), obs)).toBe(false); // other lane
  });
  it('classifies front hits', () => {
    expect(classifyHit(box(-0.4, 0.4, 0, 1.75, 9.3, 9.9), box(-0.4, 0.4, 0, 1.75, 9.5, 10.1), obs, obs)).toBe('front');
  });
  it('classifies side hits (steering into an obstacle)', () => {
    expect(classifyHit(box(1.1, 1.9, 0, 1.75, 10.2, 10.8), box(0.9, 1.7, 0, 1.75, 10.3, 10.9), obs, obs)).toBe('side');
  });
  it('classifies landing on top', () => {
    expect(classifyHit(box(-0.4, 0.4, 1.02, 2.77, 10.2, 10.8), box(-0.4, 0.4, 0.95, 2.7, 10.3, 10.9), obs, obs)).toBe('top');
  });
  it('reports none without overlap', () => {
    expect(classifyHit(obs, box(5, 6, 0, 1, 0, 1), obs, obs)).toBe('none');
  });
});

describe('ScoreSystem', () => {
  it('scores distance, coins and bonuses with multipliers', () => {
    const s = new ScoreSystem();
    s.reset(1);
    s.addDistance(100);
    expect(s.score).toBe(100);
    s.addCoins(2);
    expect(s.score).toBe(110);
    s.powerUpActive = true;
    expect(s.multiplier).toBe(2);
    s.addDistance(10);
    expect(s.score).toBe(130);
    s.addBonus(500);
    expect(s.score).toBe(1130);
    expect(s.coins).toBe(2);
    expect(s.distance).toBe(110);
  });
  it('applies the mission multiplier and clamps it', () => {
    const s = new ScoreSystem();
    s.reset(3);
    s.addDistance(10);
    expect(s.score).toBe(30);
    s.reset(999);
    expect(s.baseMultiplier).toBe(30);
  });
  it('accumulates fractional distance without losing points', () => {
    const s = new ScoreSystem();
    s.reset(1);
    for (let i = 0; i < 1200; i++) s.addDistance(14 / 120);
    expect(s.score).toBe(140);
  });
});

describe('Difficulty', () => {
  it('speed starts low, increases monotonically and is capped', () => {
    expect(speedAt(0)).toBe(SPEED.start);
    let prev = 0;
    for (let d = 0; d < 20000; d += 250) {
      const v = speedAt(d);
      expect(v).toBeGreaterThanOrEqual(prev);
      expect(v).toBeLessThanOrEqual(SPEED.max);
      prev = v;
    }
    expect(speedAt(1e6)).toBeCloseTo(SPEED.max, 3);
  });
  it('progresses through tiers', () => {
    expect(tierAt(0)).toBe('start');
    expect(tierAt(1800)).toBe('medium');
    expect(tierAt(3000)).toBe('hard');
    expect(tierAt(6000)).toBe('extreme');
    expect(difficultyAt(100000)).toBe(1);
  });
});

describe('utilities', () => {
  it('Rng is deterministic and in range', () => {
    const a = new Rng(5);
    const b = new Rng(5);
    for (let i = 0; i < 100; i++) {
      const x = a.next();
      expect(x).toBe(b.next());
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThan(1);
    }
  });
  it('Pool reuses released objects', () => {
    let created = 0;
    const pool = new Pool(() => ({ id: ++created }));
    const x = pool.acquire();
    pool.release(x);
    expect(pool.acquire()).toBe(x);
    expect(created).toBe(1);
  });
  it('power-up upgrades extend durations', () => {
    expect(powerUpDuration('magnet', 5)).toBeGreaterThan(powerUpDuration('magnet', 0));
  });
});
