export interface AchievementContext {
  totals: Record<string, number>;
  bestScore: number;
  bestDistance: number;
  unlockedCharacters: number;
  totalCharacters: number;
  maxThemes: number;
  maxSpeedReached: boolean;
}

export interface AchievementDef {
  id: string;
  name: string;
  description: string;
  icon: string;
  reward: number;
  progress: (c: AchievementContext) => [number, number];
}

const t = (key: string, target: number) => (c: AchievementContext): [number, number] => [c.totals[key] ?? 0, target];

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: 'first_run', name: 'First Steps', description: 'Finish your first run.', icon: '👟', reward: 50, progress: t('runs', 1) },
  { id: 'runs_50', name: 'Regular', description: 'Play 50 runs.', icon: '🎮', reward: 500, progress: t('runs', 50) },
  { id: 'dist_1k', name: 'Warmed Up', description: 'Run 1,000 m in one run.', icon: '🏃', reward: 150, progress: (c) => [c.bestDistance, 1000] },
  { id: 'dist_5k', name: 'Unstoppable', description: 'Run 5,000 m in one run.', icon: '⚡', reward: 1000, progress: (c) => [c.bestDistance, 5000] },
  { id: 'marathon', name: 'Marathon', description: 'Run 42,195 m in total.', icon: '🏅', reward: 1500, progress: t('distance', 42195) },
  { id: 'score_25k', name: 'High Scorer', description: 'Score 25,000 in one run.', icon: '⭐', reward: 300, progress: (c) => [c.bestScore, 25000] },
  { id: 'score_100k', name: 'Legend', description: 'Score 100,000 in one run.', icon: '👑', reward: 2000, progress: (c) => [c.bestScore, 100000] },
  { id: 'coins_1k', name: 'Pocket Money', description: 'Collect 1,000 coins in total.', icon: '🪙', reward: 200, progress: t('coins', 1000) },
  { id: 'coins_10k', name: 'Coin Hoarder', description: 'Collect 10,000 coins in total.', icon: '💰', reward: 1500, progress: t('coins', 10000) },
  { id: 'jumper', name: 'Spring Legs', description: 'Jump 500 times.', icon: '🦘', reward: 300, progress: t('jumps', 500) },
  { id: 'slider', name: 'Low Rider', description: 'Slide 300 times.', icon: '🛹', reward: 300, progress: t('slides', 300) },
  { id: 'flyer', name: 'High Flyer', description: 'Use the jetpack 10 times.', icon: '🚀', reward: 400, progress: t('jetpacks', 10) },
  { id: 'guardian', name: 'Close Call', description: 'Survive 10 crashes with a shield.', icon: '🛡️', reward: 400, progress: t('shieldsBroken', 10) },
  { id: 'roof', name: 'Roof Runner', description: 'Run 2,000 m on train roofs.', icon: '🚆', reward: 500, progress: t('roofDistance', 2000) },
  { id: 'neon', name: 'Night Owl', description: 'Reach Neon Cyber City in one run.', icon: '🌃', reward: 600, progress: (c) => [c.maxThemes, 3] },
  { id: 'speed', name: 'Top Speed', description: 'Reach maximum running speed.', icon: '💨', reward: 600, progress: (c) => [c.maxSpeedReached ? 1 : 0, 1] },
  { id: 'crew', name: 'Full Crew', description: 'Unlock every character.', icon: '🧑‍🤝‍🧑', reward: 2000, progress: (c) => [c.unlockedCharacters, c.totalCharacters] },
];
