import type { PowerUpType } from '../engine/types';

export interface PowerUpDef {
  type: PowerUpType;
  name: string;
  description: string;
  icon: string;
  color: number;
  css: string;
  baseDuration: number;
  perLevel: number;
}

export const POWER_UPS: Record<PowerUpType, PowerUpDef> = {
  magnet: { type: 'magnet', name: 'Magnet', description: 'Pulls nearby coins towards you.', icon: '🧲', color: 0xff3b5c, css: '#ff3b5c', baseDuration: 10, perLevel: 2.5 },
  jetpack: { type: 'jetpack', name: 'Jetpack', description: 'Fly above the traffic and grab sky coins.', icon: '🚀', color: 0xffa21a, css: '#ffa21a', baseDuration: 6.5, perLevel: 1.2 },
  multiplier: { type: 'multiplier', name: '2x Score', description: 'Doubles every point you earn.', icon: '✖️', color: 0x9dff3b, css: '#9dff3b', baseDuration: 14, perLevel: 3 },
  shield: { type: 'shield', name: 'Shield', description: 'Absorbs one crash.', icon: '🛡️', color: 0x4fd8ff, css: '#4fd8ff', baseDuration: 20, perLevel: 5 },
};

export const MAX_UPGRADE_LEVEL = 5;
export const UPGRADE_COSTS = [500, 1000, 2000, 4000, 8000];

export const powerUpDuration = (type: PowerUpType, level: number): number => {
  const d = POWER_UPS[type];
  return d.baseDuration + d.perLevel * Math.max(0, Math.min(MAX_UPGRADE_LEVEL, level));
};

export const MAGNET_RADIUS = 7.5;
