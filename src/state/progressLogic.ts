import { ACHIEVEMENTS, type AchievementDef } from '../data/achievements';
import { CHARACTERS } from '../data/characters';
import { DAILY_REWARDS, dayDiff } from '../data/rewards';
import { MISSION_SET_BONUS, generateDailyMissions, todayKey, type DailyMissions, type MissionMetric, type MissionState } from '../data/missions';
import type { PowerUpType, RunResult, StatKey } from '../game/engine/types';
import { MAX_UPGRADE_LEVEL, UPGRADE_COSTS } from '../game/powerups/powerupDefs';

export interface LocalRun {
  score: number;
  distance: number;
  coins: number;
  character: string;
  date: string;
}

export type Totals = Record<'runs' | 'distance' | 'coins' | 'jumps' | 'slides' | 'laneChanges' | 'powerUps' | 'jetpacks' | 'shieldsBroken' | 'dodged' | 'roofDistance', number>;

export interface ProgressData {
  version: 1;
  coins: number;
  bestScore: number;
  bestDistance: number;
  totals: Totals;
  unlockedCharacters: string[];
  selectedCharacter: string;
  unlockedSkins: string[];
  selectedSkins: Record<string, string>;
  upgrades: Record<PowerUpType, number>;
  achievements: Record<string, string>;
  missionMultiplier: number;
  daily: DailyMissions | null;
  dailyReward: { lastClaim: string | null; streak: number };
  localRuns: LocalRun[];
  maxThemes: number;
  maxSpeedReached: boolean;
  updatedAt: number;
}

export const defaultProgress = (): ProgressData => ({
  version: 1,
  coins: 0,
  bestScore: 0,
  bestDistance: 0,
  totals: { runs: 0, distance: 0, coins: 0, jumps: 0, slides: 0, laneChanges: 0, powerUps: 0, jetpacks: 0, shieldsBroken: 0, dodged: 0, roofDistance: 0 },
  unlockedCharacters: ['rio'],
  selectedCharacter: 'rio',
  unlockedSkins: CHARACTERS.map((c) => c.skins[0].id),
  selectedSkins: Object.fromEntries(CHARACTERS.map((c) => [c.id, c.skins[0].id])),
  upgrades: { magnet: 0, jetpack: 0, multiplier: 0, shield: 0 },
  achievements: {},
  missionMultiplier: 1,
  daily: null,
  dailyReward: { lastClaim: null, streak: 0 },
  localRuns: [],
  maxThemes: 1,
  maxSpeedReached: false,
  updatedAt: Date.now(),
});

/** Fills missing fields from older saves / cloud rows. */
export const normalizeProgress = (raw: Partial<ProgressData> | null | undefined): ProgressData => {
  const d = defaultProgress();
  if (!raw) return d;
  return {
    ...d,
    ...raw,
    totals: { ...d.totals, ...(raw.totals ?? {}) },
    upgrades: { ...d.upgrades, ...(raw.upgrades ?? {}) },
    selectedSkins: { ...d.selectedSkins, ...(raw.selectedSkins ?? {}) },
    unlockedCharacters: Array.from(new Set([...(raw.unlockedCharacters ?? []), 'rio'])),
    unlockedSkins: Array.from(new Set([...d.unlockedSkins, ...(raw.unlockedSkins ?? [])])),
    achievements: { ...(raw.achievements ?? {}) },
    dailyReward: { ...d.dailyReward, ...(raw.dailyReward ?? {}) },
    localRuns: raw.localRuns ?? [],
    version: 1,
  };
};

/** Merges guest progress into an account (never loses unlocks or coins). */
export const mergeProgress = (a: ProgressData, b: ProgressData): ProgressData => {
  const totals = { ...a.totals };
  for (const k of Object.keys(totals) as (keyof Totals)[]) totals[k] = Math.max(a.totals[k], b.totals[k]);
  return normalizeProgress({
    ...a,
    coins: Math.max(a.coins, b.coins),
    bestScore: Math.max(a.bestScore, b.bestScore),
    bestDistance: Math.max(a.bestDistance, b.bestDistance),
    totals,
    unlockedCharacters: Array.from(new Set([...a.unlockedCharacters, ...b.unlockedCharacters])),
    unlockedSkins: Array.from(new Set([...a.unlockedSkins, ...b.unlockedSkins])),
    upgrades: Object.fromEntries((Object.keys(a.upgrades) as PowerUpType[]).map((k) => [k, Math.max(a.upgrades[k], b.upgrades[k])])) as Record<PowerUpType, number>,
    achievements: { ...b.achievements, ...a.achievements },
    missionMultiplier: Math.max(a.missionMultiplier, b.missionMultiplier),
    maxThemes: Math.max(a.maxThemes, b.maxThemes),
    maxSpeedReached: a.maxSpeedReached || b.maxSpeedReached,
    localRuns: [...a.localRuns, ...b.localRuns].sort((x, y) => y.score - x.score).slice(0, 10),
    updatedAt: Date.now(),
  });
};

export const ensureDaily = (p: ProgressData, date = todayKey()): ProgressData => {
  if (p.daily && p.daily.date === date) return p;
  return { ...p, daily: generateDailyMissions(date, p.missionMultiplier) };
};

const STAT_TO_METRIC: Partial<Record<StatKey, MissionMetric>> = {
  coins: 'coins',
  jumps: 'jumps',
  slides: 'slides',
  laneChanges: 'laneChanges',
  powerUps: 'powerUps',
  jetpacks: 'jetpacks',
  dodged: 'dodged',
  roofDistance: 'roofDistance',
  shieldsBroken: 'shieldsBroken',
};

export interface MissionUpdate {
  progress: ProgressData;
  completed: MissionState[];
  setCompleted: boolean;
}

const applyMissions = (p: ProgressData, update: (m: MissionState) => number | null): MissionUpdate => {
  if (!p.daily) return { progress: p, completed: [], setCompleted: false };
  const completed: MissionState[] = [];
  let coins = p.coins;
  const missions = p.daily.missions.map((m) => {
    if (m.done) return m;
    const next = update(m);
    if (next === null) return m;
    const progress = Math.min(m.target, next);
    const done = progress >= m.target;
    const nm = { ...m, progress, done };
    if (done) {
      completed.push(nm);
      coins += m.reward;
    }
    return nm;
  });
  let daily: DailyMissions = { ...p.daily, missions };
  let multiplier = p.missionMultiplier;
  let setCompleted = false;
  if (!daily.setClaimed && missions.every((m) => m.done)) {
    daily = { ...daily, setClaimed: true };
    multiplier = Math.min(30, multiplier + 1);
    coins += MISSION_SET_BONUS;
    setCompleted = true;
  }
  if (!completed.length && !setCompleted) return { progress: p, completed, setCompleted };
  return { progress: { ...p, daily, coins, missionMultiplier: multiplier, updatedAt: Date.now() }, completed, setCompleted };
};

/** Live mission progress from an in-run stat increment. */
export const missionStat = (p: ProgressData, key: StatKey, amount: number): MissionUpdate => {
  const metric = STAT_TO_METRIC[key];
  const r = applyMissions(p, (m) => (m.metric === metric && m.scope === 'total' ? m.progress + amount : null));
  if (r.completed.length || r.setCompleted || !metric || !p.daily) return r;
  // Plain progress update (no completion): avoid copying when nothing matches.
  if (!p.daily.missions.some((m) => !m.done && m.metric === metric && m.scope === 'total')) return r;
  const missions = p.daily.missions.map((m) => (!m.done && m.metric === metric && m.scope === 'total' ? { ...m, progress: Math.min(m.target, m.progress + amount) } : m));
  return { progress: { ...p, daily: { ...p.daily, missions } }, completed: [], setCompleted: false };
};

/** Live single-run mission progress (distance / score / coins this run). */
export const missionRunValues = (p: ProgressData, values: { runDistance: number; runScore: number; runCoins: number }): MissionUpdate => {
  const r = applyMissions(p, (m) => (m.scope === 'single' && m.metric in values ? Math.max(m.progress, values[m.metric as keyof typeof values]) : null));
  return r;
};

export interface RunOutcome {
  progress: ProgressData;
  newBest: boolean;
  achievements: AchievementDef[];
  missions: MissionState[];
  setCompleted: boolean;
}

export const achievementContext = (p: ProgressData) => ({
  totals: p.totals as unknown as Record<string, number>,
  bestScore: p.bestScore,
  bestDistance: p.bestDistance,
  unlockedCharacters: p.unlockedCharacters.length,
  totalCharacters: CHARACTERS.length,
  maxThemes: p.maxThemes,
  maxSpeedReached: p.maxSpeedReached,
});

export const checkAchievements = (p: ProgressData): { progress: ProgressData; unlocked: AchievementDef[] } => {
  const ctx = achievementContext(p);
  const unlocked: AchievementDef[] = [];
  const achievements = { ...p.achievements };
  let coins = p.coins;
  for (const a of ACHIEVEMENTS) {
    if (achievements[a.id]) continue;
    const [cur, target] = a.progress(ctx);
    if (cur >= target) {
      achievements[a.id] = new Date().toISOString();
      coins += a.reward;
      unlocked.push(a);
    }
  }
  if (!unlocked.length) return { progress: p, unlocked };
  return { progress: { ...p, achievements, coins }, unlocked };
};

/** Commits a finished run: coins, records, totals, missions and achievements. */
export const recordRun = (p0: ProgressData, r: RunResult): RunOutcome => {
  let p = ensureDaily(p0);
  const newBest = r.score > p.bestScore;
  const t = { ...p.totals };
  t.runs += 1;
  t.distance += r.distance;
  t.coins += r.coins;
  t.jumps += r.stats.jumps;
  t.slides += r.stats.slides;
  t.laneChanges += r.stats.laneChanges;
  t.powerUps += r.stats.powerUps;
  t.jetpacks += r.stats.jetpacks;
  t.shieldsBroken += r.stats.shieldsBroken;
  t.dodged += r.stats.dodged;
  t.roofDistance += r.stats.roofDistance;
  const run: LocalRun = { score: r.score, distance: r.distance, coins: r.coins, character: r.character, date: new Date().toISOString() };
  p = {
    ...p,
    coins: p.coins + r.coins,
    bestScore: Math.max(p.bestScore, r.score),
    bestDistance: Math.max(p.bestDistance, r.distance),
    totals: t,
    maxThemes: Math.max(p.maxThemes, r.stats.themesVisited),
    maxSpeedReached: p.maxSpeedReached || r.stats.maxSpeedReached,
    localRuns: [...p.localRuns, run].sort((a, b) => b.score - a.score).slice(0, 10),
    updatedAt: Date.now(),
  };
  // Single-run missions (in case live updates were missed) and the "runs" mission.
  const m1 = missionRunValues(p, { runDistance: r.distance, runScore: r.score, runCoins: r.coins });
  const m2 = applyMissions(m1.progress, (m) => (m.metric === 'runs' ? m.progress + 1 : null));
  const ach = checkAchievements(m2.progress);
  return { progress: ach.progress, newBest, achievements: ach.unlocked, missions: [...m1.completed, ...m2.completed], setCompleted: m1.setCompleted || m2.setCompleted };
};

export type PurchaseResult = { ok: true; progress: ProgressData } | { ok: false; reason: string };

export const buyCharacter = (p: ProgressData, id: string): PurchaseResult => {
  const c = CHARACTERS.find((x) => x.id === id);
  if (!c) return { ok: false, reason: 'Unknown character' };
  if (p.unlockedCharacters.includes(id)) return { ok: false, reason: 'Already unlocked' };
  if (p.coins < c.price) return { ok: false, reason: 'Not enough coins' };
  const progress = { ...p, coins: p.coins - c.price, unlockedCharacters: [...p.unlockedCharacters, id], selectedCharacter: id, updatedAt: Date.now() };
  return { ok: true, progress: checkAchievements(progress).progress };
};

export const buySkin = (p: ProgressData, characterId: string, skinId: string): PurchaseResult => {
  const c = CHARACTERS.find((x) => x.id === characterId);
  const s = c?.skins.find((x) => x.id === skinId);
  if (!c || !s) return { ok: false, reason: 'Unknown skin' };
  if (!p.unlockedCharacters.includes(characterId)) return { ok: false, reason: 'Unlock the character first' };
  if (p.unlockedSkins.includes(skinId)) return { ok: false, reason: 'Already owned' };
  if (p.coins < s.price) return { ok: false, reason: 'Not enough coins' };
  return { ok: true, progress: { ...p, coins: p.coins - s.price, unlockedSkins: [...p.unlockedSkins, skinId], selectedSkins: { ...p.selectedSkins, [characterId]: skinId }, updatedAt: Date.now() } };
};

export const buyUpgrade = (p: ProgressData, type: PowerUpType): PurchaseResult => {
  const lvl = p.upgrades[type];
  if (lvl >= MAX_UPGRADE_LEVEL) return { ok: false, reason: 'Max level' };
  const cost = UPGRADE_COSTS[lvl];
  if (p.coins < cost) return { ok: false, reason: 'Not enough coins' };
  return { ok: true, progress: { ...p, coins: p.coins - cost, upgrades: { ...p.upgrades, [type]: lvl + 1 }, updatedAt: Date.now() } };
};

export const dailyRewardStatus = (p: Pick<ProgressData, 'dailyReward'>, today = todayKey()): { claimable: boolean; day: number; amount: number } => {
  const last = p.dailyReward.lastClaim;
  if (last === today) return { claimable: false, day: p.dailyReward.streak, amount: DAILY_REWARDS[Math.min(DAILY_REWARDS.length, p.dailyReward.streak) - 1] ?? DAILY_REWARDS[0] };
  const continues = last !== null && dayDiff(last, today) === 1;
  const day = continues ? Math.min(DAILY_REWARDS.length, p.dailyReward.streak + 1) : 1;
  return { claimable: true, day, amount: DAILY_REWARDS[day - 1] };
};

export const claimDailyReward = (p: ProgressData, today = todayKey()): PurchaseResult => {
  const st = dailyRewardStatus(p, today);
  if (!st.claimable) return { ok: false, reason: 'Already claimed today' };
  return { ok: true, progress: { ...p, coins: p.coins + st.amount, dailyReward: { lastClaim: today, streak: st.day }, updatedAt: Date.now() } };
};
