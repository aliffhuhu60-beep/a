import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { RunResult, StatKey, PowerUpType } from '../game/engine/types';
import {
  buyCharacter,
  buySkin,
  buyUpgrade,
  claimDailyReward,
  defaultProgress,
  ensureDaily,
  missionRunValues,
  missionStat,
  normalizeProgress,
  recordRun,
  type MissionUpdate,
  type ProgressData,
  type PurchaseResult,
  type RunOutcome,
} from './progressLogic';

interface ProgressStore extends ProgressData {
  hydrateFrom: (data: Partial<ProgressData>) => void;
  snapshot: () => ProgressData;
  ensureDaily: () => void;
  stat: (key: StatKey, amount: number) => MissionUpdate;
  runValues: (v: { runDistance: number; runScore: number; runCoins: number }) => MissionUpdate;
  record: (r: RunResult) => RunOutcome;
  buyCharacter: (id: string) => PurchaseResult;
  buySkin: (characterId: string, skinId: string) => PurchaseResult;
  buyUpgrade: (t: PowerUpType) => PurchaseResult;
  selectCharacter: (id: string) => void;
  selectSkin: (characterId: string, skinId: string) => void;
  claimDaily: () => PurchaseResult;
  reset: () => void;
}

const pick = (s: ProgressStore): ProgressData => ({
  version: 1,
  coins: s.coins,
  bestScore: s.bestScore,
  bestDistance: s.bestDistance,
  totals: s.totals,
  unlockedCharacters: s.unlockedCharacters,
  selectedCharacter: s.selectedCharacter,
  unlockedSkins: s.unlockedSkins,
  selectedSkins: s.selectedSkins,
  upgrades: s.upgrades,
  achievements: s.achievements,
  missionMultiplier: s.missionMultiplier,
  daily: s.daily,
  dailyReward: s.dailyReward,
  localRuns: s.localRuns,
  maxThemes: s.maxThemes,
  maxSpeedReached: s.maxSpeedReached,
  updatedAt: s.updatedAt,
});

/** Player progress. Persisted to localStorage (guest) and synced to Supabase when signed in. */
export const useProgress = create<ProgressStore>()(
  persist(
    (set, get) => {
      const apply = <T extends { progress: ProgressData }>(r: T): T => {
        set(r.progress);
        return r;
      };
      const purchase = (r: PurchaseResult): PurchaseResult => {
        if (r.ok) set(r.progress);
        return r;
      };
      return {
        ...defaultProgress(),
        hydrateFrom: (data) => set(normalizeProgress(data)),
        snapshot: () => pick(get()),
        ensureDaily: () => {
          const cur = pick(get());
          const next = ensureDaily(cur);
          if (next !== cur) set(next);
        },
        stat: (key, amount) => apply(missionStat(pick(get()), key, amount)),
        runValues: (v) => apply(missionRunValues(pick(get()), v)),
        record: (r) => apply(recordRun(pick(get()), r)),
        buyCharacter: (id) => purchase(buyCharacter(pick(get()), id)),
        buySkin: (c, s) => purchase(buySkin(pick(get()), c, s)),
        buyUpgrade: (t) => purchase(buyUpgrade(pick(get()), t)),
        selectCharacter: (id) => {
          if (get().unlockedCharacters.includes(id)) set({ selectedCharacter: id, updatedAt: Date.now() });
        },
        selectSkin: (c, s) => {
          if (get().unlockedSkins.includes(s)) set({ selectedSkins: { ...get().selectedSkins, [c]: s }, updatedAt: Date.now() });
        },
        claimDaily: () => purchase(claimDailyReward(pick(get()))),
        reset: () => set(defaultProgress()),
      };
    },
    {
      name: 'citydash-progress-v1',
      version: 1,
      partialize: (s) => pick(s),
      merge: (persisted, current) => ({ ...current, ...normalizeProgress(persisted as Partial<ProgressData>) }),
    },
  ),
);
