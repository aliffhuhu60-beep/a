import { describe, expect, it } from 'vitest';
import { buyCharacter, buySkin, buyUpgrade, claimDailyReward, dailyRewardStatus, defaultProgress, ensureDaily, mergeProgress, missionRunValues, missionStat, recordRun } from '../../src/state/progressLogic';
import { generateDailyMissions } from '../../src/data/missions';
import { emptyRunStats, type RunResult } from '../../src/game/engine/types';

const result = (over: Partial<RunResult> = {}): RunResult => ({ score: 1200, coins: 40, distance: 800, durationMs: 50000, character: 'rio', maxSpeed: 20, stats: { ...emptyRunStats(), jumps: 10 }, ...over });

describe('progress logic', () => {
  it('records a run: coins, best score, totals and local records', () => {
    const o = recordRun(defaultProgress(), result());
    expect(o.progress.coins).toBeGreaterThanOrEqual(40);
    expect(o.progress.bestScore).toBe(1200);
    expect(o.newBest).toBe(true);
    expect(o.progress.totals.runs).toBe(1);
    expect(o.progress.totals.jumps).toBe(10);
    expect(o.progress.localRuns).toHaveLength(1);
    expect(o.achievements.map((a) => a.id)).toContain('first_run');
    const o2 = recordRun(o.progress, result({ score: 500 }));
    expect(o2.newBest).toBe(false);
    expect(o2.progress.bestScore).toBe(1200);
    expect(o2.progress.localRuns[0].score).toBe(1200);
  });

  it('generates 3 distinct deterministic daily missions', () => {
    const a = generateDailyMissions('2026-11-23', 1);
    const b = generateDailyMissions('2026-11-23', 1);
    expect(a).toEqual(b);
    expect(new Set(a.missions.map((m) => m.metric)).size).toBe(3);
  });

  it('completes missions, pays rewards and raises the multiplier when the set is done', () => {
    let p = ensureDaily(defaultProgress(), '2026-11-23');
    const coins0 = p.coins;
    const completed: string[] = [];
    for (const m of p.daily!.missions) {
      const r = m.scope === 'single'
        ? missionRunValues(p, { runDistance: m.target, runScore: m.target, runCoins: m.target })
        : m.metric === 'runs'
          ? { progress: recordRun(p, result()).progress, completed: [], setCompleted: false }
          : missionStat(p, m.metric as never, m.target);
      p = r.progress;
      completed.push(...r.completed.map((x) => x.templateId));
    }
    expect(p.daily!.missions.every((m) => m.done)).toBe(true);
    expect(p.missionMultiplier).toBe(2);
    expect(p.coins).toBeGreaterThan(coins0);
  });

  it('handles purchases and refuses when coins are short', () => {
    let p = defaultProgress();
    expect(buyCharacter(p, 'mika').ok).toBe(false);
    p = { ...p, coins: 5000 };
    const r = buyCharacter(p, 'mika');
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.progress.coins).toBe(4000);
    expect(r.progress.unlockedCharacters).toContain('mika');
    expect(r.progress.selectedCharacter).toBe('mika');
    expect(buyCharacter(r.progress, 'mika').ok).toBe(false);
    const s = buySkin(r.progress, 'mika', 'mika-sunset');
    expect(s.ok).toBe(true);
    expect(buySkin(r.progress, 'zane', 'zane-crimson').ok).toBe(false); // character locked
    const u = buyUpgrade(r.progress, 'magnet');
    expect(u.ok && u.progress.upgrades.magnet).toBe(1);
  });

  it('daily reward streak continues on consecutive days and resets after a gap', () => {
    let p = defaultProgress();
    const r1 = claimDailyReward(p, '2026-11-20');
    expect(r1.ok).toBe(true);
    if (!r1.ok) return;
    p = r1.progress;
    expect(claimDailyReward(p, '2026-11-20').ok).toBe(false);
    expect(dailyRewardStatus(p, '2026-11-21').day).toBe(2);
    const r2 = claimDailyReward(p, '2026-11-21');
    if (!r2.ok) throw new Error();
    expect(r2.progress.dailyReward.streak).toBe(2);
    expect(dailyRewardStatus(r2.progress, '2026-11-25').day).toBe(1);
  });

  it('merges guest progress into an account without losing anything', () => {
    const a = { ...defaultProgress(), coins: 100, bestScore: 5000, unlockedCharacters: ['rio', 'zane'] };
    const b = { ...defaultProgress(), coins: 300, bestScore: 2000, unlockedCharacters: ['rio', 'mika'] };
    const m = mergeProgress(a, b);
    expect(m.coins).toBe(300);
    expect(m.bestScore).toBe(5000);
    expect(new Set(m.unlockedCharacters)).toEqual(new Set(['rio', 'zane', 'mika']));
  });
});
