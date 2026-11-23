/**
 * Pure, allocation-free axis-aligned collision helpers in track space.
 * x = lateral, y = vertical, s = forward distance.
 */
export interface Box {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minS: number;
  maxS: number;
}

export const makeBox = (): Box => ({ minX: 0, maxX: 0, minY: 0, maxY: 0, minS: 0, maxS: 0 });

export const overlap1D = (aMin: number, aMax: number, bMin: number, bMax: number): boolean =>
  aMin < bMax && aMax > bMin;

export const overlaps = (a: Box, b: Box): boolean =>
  overlap1D(a.minX, a.maxX, b.minX, b.maxX) &&
  overlap1D(a.minY, a.maxY, b.minY, b.maxY) &&
  overlap1D(a.minS, a.maxS, b.minS, b.maxS);

export type HitKind = 'none' | 'front' | 'side' | 'top';

/**
 * Classifies a collision by checking which axis was separated on the previous step.
 * - front: the runner ran into the obstacle's face (fatal unless shielded)
 * - side: the runner steered into it while changing lanes (stumble + bounce back)
 * - top: the runner came down onto it from above (only relevant for walkable tops)
 */
export const classifyHit = (prev: Box, curr: Box, prevObs: Box, obs: Box): HitKind => {
  if (!overlaps(curr, obs)) return 'none';
  const prevX = overlap1D(prev.minX, prev.maxX, prevObs.minX, prevObs.maxX);
  const prevS = overlap1D(prev.minS, prev.maxS, prevObs.minS, prevObs.maxS);
  const prevY = overlap1D(prev.minY, prev.maxY, prevObs.minY, prevObs.maxY);
  if (!prevY && prev.minY >= prevObs.maxY - 1e-3) return 'top';
  if (!prevS) return 'front';
  if (!prevX) return 'side';
  return 'front';
};

/** Squared horizontal+vertical distance between two points (for coin pickup / magnet). */
export const dist2 = (ax: number, ay: number, as: number, bx: number, by: number, bs: number): number => {
  const dx = ax - bx;
  const dy = ay - by;
  const ds = as - bs;
  return dx * dx + dy * dy + ds * ds;
};
