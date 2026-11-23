/**
 * Global gameplay tuning. All distances are metres, all times seconds.
 *
 * Track space: x = right, y = up, s = forward distance along the track.
 * Three.js world space: forward is -Z, so worldZ = -s (see `toWorldZ`).
 */
export const LANE_WIDTH = 2.6;
export const LANES = [-1, 0, 1] as const;
export type Lane = (typeof LANES)[number];

export const laneX = (lane: number): number => lane * LANE_WIDTH;
export const toWorldZ = (s: number): number => -s;

/** Fixed simulation step: physics is frame-rate independent. */
export const FIXED_DT = 1 / 120;
/** Never simulate more than this per rendered frame (prevents spiral of death). */
export const MAX_FRAME_DT = 0.1;

export const PLAYER_DIMS = {
  halfWidth: 0.38,
  halfDepth: 0.3,
  height: 1.75,
  slideHeight: 0.75,
} as const;

export const PHYSICS = {
  gravity: 28,
  jumpVelocity: 10.2, // peak ~1.86 m, air time ~0.73 s
  fastFallVelocity: -22,
  slideDuration: 0.72,
  laneChangeTime: 0.13,
  /** Max height difference the runner can step onto (ramps, low platforms). */
  stepUp: 0.35,
  jumpBuffer: 0.14,
  coyoteTime: 0.08,
} as const;

export const SPEED = {
  start: 14,
  max: 34,
  /** Distance constant of the exponential speed ramp. */
  rampDistance: 3200,
} as const;

export const SPAWN = {
  /** Generate content this far ahead of the runner. */
  ahead: 230,
  /** Recycle content this far behind the runner. */
  behind: 24,
  /** No obstacles in the first stretch of a run. */
  safeStart: 70,
} as const;

export const JETPACK = {
  altitude: 7.2,
  riseTime: 0.6,
} as const;

export const STUMBLE = {
  /** A second side-hit within this window ends the run. */
  window: 4.5,
} as const;

export const THEME_LENGTH = 1300;
export const TUNNEL_LENGTH = 96;
