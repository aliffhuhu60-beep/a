import { SPEED } from '../engine/constants';
import { clamp } from '../engine/math';

/**
 * Speed is a pure function of distance so that the procedural generator can
 * know exactly how fast the runner will be when reaching any point of the track.
 */
export const speedAt = (distance: number): number =>
  SPEED.start + (SPEED.max - SPEED.start) * (1 - Math.exp(-Math.max(0, distance) / SPEED.rampDistance));

/** 0 = warm-up, 1 = hardest. Drives obstacle variety and pattern complexity. */
export const difficultyAt = (distance: number): number => clamp((distance - 80) / 4200, 0, 1);

export type DifficultyTier = 'start' | 'medium' | 'hard' | 'extreme';

export const tierAt = (distance: number): DifficultyTier => {
  const d = difficultyAt(distance);
  if (d < 0.2) return 'start';
  if (d < 0.5) return 'medium';
  if (d < 0.85) return 'hard';
  return 'extreme';
};
