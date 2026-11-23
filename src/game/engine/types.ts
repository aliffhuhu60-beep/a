export type GameState = 'loading' | 'menu' | 'countdown' | 'running' | 'paused' | 'dying' | 'gameover';

export type PowerUpType = 'magnet' | 'jetpack' | 'multiplier' | 'shield';

export type Quality = 'low' | 'medium' | 'high';

export type ObstacleKind =
  | 'roadblock' // low: jump
  | 'crateLow' // low, walkable top: jump
  | 'overhead' // hanging board / clearance bar: slide
  | 'crateStack' // full: change lane
  | 'vehicle' // full (walkable roof): change lane / jump on
  | 'train' // long full block, walkable roof
  | 'trainMoving' // long full block moving towards runner
  | 'ramp'; // walkable slope onto a train roof

export type ObstacleClass = 'low' | 'high' | 'full';

export interface PowerUpStatus {
  type: PowerUpType;
  remaining: number;
  duration: number;
}

export interface HudSnapshot {
  score: number;
  coins: number;
  distance: number;
  speed: number;
  multiplier: number;
  powerUps: PowerUpStatus[];
  stumbleWarning: boolean;
}

export interface RunResult {
  score: number;
  coins: number;
  distance: number;
  durationMs: number;
  character: string;
  maxSpeed: number;
  stats: RunStats;
}

export interface RunStats {
  jumps: number;
  slides: number;
  laneChanges: number;
  coins: number;
  powerUps: number;
  jetpacks: number;
  shieldsBroken: number;
  dodged: number;
  roofDistance: number;
  themesVisited: number;
  maxSpeedReached: boolean;
}

export type StatKey = keyof Omit<RunStats, 'maxSpeedReached'>;

export const emptyRunStats = (): RunStats => ({
  jumps: 0,
  slides: 0,
  laneChanges: 0,
  coins: 0,
  powerUps: 0,
  jetpacks: 0,
  shieldsBroken: 0,
  dodged: 0,
  roofDistance: 0,
  themesVisited: 1,
  maxSpeedReached: false,
});

export interface CharacterLook {
  id: string;
  skin: string;
  colors: {
    skin: number;
    hair: number;
    top: number;
    topAccent: number;
    pants: number;
    shoes: number;
    accessory: number;
    glow?: number;
  };
  hair: 'cap' | 'ponytail' | 'spiky' | 'helmet';
  accessory: 'backpack' | 'headphones' | 'visor' | 'antenna';
  build: { height: number; bulk: number };
}

export interface EngineCallbacks {
  onState?: (state: GameState) => void;
  onHud?: (hud: HudSnapshot) => void;
  onRunEnd?: (result: RunResult) => void;
  onStat?: (key: StatKey, amount: number, total: number) => void;
  onCountdown?: (value: number) => void;
  onEvent?: (event: EngineEvent) => void;
}

export type EngineEvent =
  | { type: 'stumble' }
  | { type: 'shieldBreak' }
  | { type: 'powerUp'; powerUp: PowerUpType }
  | { type: 'theme'; theme: string }
  | { type: 'crash' }
  | { type: 'fps'; fps: number };
