import { Rng, hashString } from '../game/engine/rng';

export type MissionMetric =
  | 'coins'
  | 'jumps'
  | 'slides'
  | 'laneChanges'
  | 'powerUps'
  | 'jetpacks'
  | 'dodged'
  | 'roofDistance'
  | 'shieldsBroken'
  | 'runs'
  | 'runDistance'
  | 'runScore'
  | 'runCoins';

export interface MissionTemplate {
  id: string;
  metric: MissionMetric;
  /** total = accumulates across runs; single = must happen within one run. */
  scope: 'total' | 'single';
  targets: number[];
  rewards: number[];
  label: (n: number) => string;
}

export const MISSION_TEMPLATES: MissionTemplate[] = [
  { id: 'collect', metric: 'coins', scope: 'total', targets: [150, 400, 900], rewards: [100, 200, 350], label: (n) => `Collect ${n} coins` },
  { id: 'jump', metric: 'jumps', scope: 'total', targets: [25, 60, 120], rewards: [80, 160, 300], label: (n) => `Jump ${n} times` },
  { id: 'slide', metric: 'slides', scope: 'total', targets: [20, 50, 100], rewards: [80, 160, 300], label: (n) => `Slide ${n} times` },
  { id: 'dodge', metric: 'laneChanges', scope: 'total', targets: [60, 150, 300], rewards: [80, 150, 280], label: (n) => `Change lanes ${n} times` },
  { id: 'power', metric: 'powerUps', scope: 'total', targets: [3, 6, 12], rewards: [120, 220, 400], label: (n) => `Pick up ${n} power-ups` },
  { id: 'jet', metric: 'jetpacks', scope: 'total', targets: [1, 3, 6], rewards: [120, 250, 450], label: (n) => `Fly with the jetpack ${n} time${n > 1 ? 's' : ''}` },
  { id: 'pass', metric: 'dodged', scope: 'total', targets: [60, 150, 350], rewards: [100, 200, 350], label: (n) => `Pass ${n} obstacles` },
  { id: 'roof', metric: 'roofDistance', scope: 'total', targets: [100, 300, 700], rewards: [120, 240, 420], label: (n) => `Run ${n} m on train roofs` },
  { id: 'shield', metric: 'shieldsBroken', scope: 'total', targets: [1, 2, 4], rewards: [150, 260, 450], label: (n) => `Survive ${n} crash${n > 1 ? 'es' : ''} with a shield` },
  { id: 'runs', metric: 'runs', scope: 'total', targets: [3, 6, 10], rewards: [80, 150, 250], label: (n) => `Play ${n} runs` },
  { id: 'far', metric: 'runDistance', scope: 'single', targets: [600, 1500, 3000], rewards: [150, 300, 600], label: (n) => `Run ${n} m in one run` },
  { id: 'score', metric: 'runScore', scope: 'single', targets: [5000, 20000, 60000], rewards: [150, 300, 600], label: (n) => `Score ${n.toLocaleString()} in one run` },
  { id: 'greedy', metric: 'runCoins', scope: 'single', targets: [100, 250, 500], rewards: [150, 280, 500], label: (n) => `Collect ${n} coins in one run` },
];

export interface MissionState {
  templateId: string;
  metric: MissionMetric;
  scope: 'total' | 'single';
  target: number;
  reward: number;
  progress: number;
  done: boolean;
}

export interface DailyMissions {
  date: string;
  missions: MissionState[];
  setClaimed: boolean;
}

export const todayKey = (d = new Date()): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

/** Deterministic per-day mission set; harder tiers as the mission multiplier grows. */
export const generateDailyMissions = (date: string, multiplier: number): DailyMissions => {
  const rng = new Rng(hashString(`missions-${date}`));
  const tier = Math.min(2, Math.floor((multiplier - 1) / 3));
  const pool = rng.shuffle([...MISSION_TEMPLATES]);
  const picked: MissionTemplate[] = [];
  for (const t of pool) {
    if (picked.length === 3) break;
    if (picked.some((p) => p.metric === t.metric)) continue;
    picked.push(t);
  }
  return {
    date,
    setClaimed: false,
    missions: picked.map((t) => ({
      templateId: t.id,
      metric: t.metric,
      scope: t.scope,
      target: t.targets[tier],
      reward: t.rewards[tier],
      progress: 0,
      done: false,
    })),
  };
};

export const missionLabel = (m: MissionState): string => MISSION_TEMPLATES.find((t) => t.id === m.templateId)?.label(m.target) ?? m.templateId;

export const MISSION_SET_BONUS = 500;
