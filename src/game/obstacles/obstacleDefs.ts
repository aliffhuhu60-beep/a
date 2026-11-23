import type { ObstacleClass, ObstacleKind } from '../engine/types';

export interface ObstacleDims {
  length: number;
  bottomY: number;
  topY: number;
  halfWidth: number;
  walkable: boolean;
  cls: ObstacleClass;
}

export const TRAIN_CAR_LENGTH = 12.5;
export const TRAIN_HEIGHT = 3.4;
export const RAMP_LENGTH = 9;

/** Collision dimensions for each obstacle kind. Visual meshes are built to match. */
export const OBSTACLE_DIMS: Record<ObstacleKind, ObstacleDims> = {
  roadblock: { length: 0.35, bottomY: 0, topY: 1.0, halfWidth: 1.05, walkable: false, cls: 'low' },
  crateLow: { length: 1.3, bottomY: 0, topY: 1.0, halfWidth: 0.95, walkable: true, cls: 'low' },
  overhead: { length: 0.35, bottomY: 1.15, topY: 2.75, halfWidth: 1.15, walkable: false, cls: 'high' },
  crateStack: { length: 1.6, bottomY: 0, topY: 2.5, halfWidth: 1.0, walkable: true, cls: 'full' },
  vehicle: { length: 4.6, bottomY: 0, topY: 1.55, halfWidth: 1.0, walkable: true, cls: 'full' },
  train: { length: TRAIN_CAR_LENGTH, bottomY: 0, topY: TRAIN_HEIGHT, halfWidth: 1.15, walkable: true, cls: 'full' },
  trainMoving: { length: TRAIN_CAR_LENGTH, bottomY: 0, topY: TRAIN_HEIGHT, halfWidth: 1.15, walkable: true, cls: 'full' },
  ramp: { length: RAMP_LENGTH, bottomY: 0, topY: TRAIN_HEIGHT, halfWidth: 1.15, walkable: true, cls: 'full' },
};

/** Bus variant of `vehicle` (variant 1) is taller and longer. */
export const BUS_DIMS = { length: 7.6, topY: 2.9 } as const;
