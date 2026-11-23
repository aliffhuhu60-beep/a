/** 7-day login streak calendar. Day 7 repeats once reached. */
export const DAILY_REWARDS = [100, 150, 200, 300, 400, 600, 1000];

export const dayDiff = (a: string, b: string): number => {
  const pa = new Date(`${a}T00:00:00`);
  const pb = new Date(`${b}T00:00:00`);
  return Math.round((pb.getTime() - pa.getTime()) / 86400000);
};
