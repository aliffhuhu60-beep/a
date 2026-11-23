export const SCORE_RULES = {
  perMeter: 1,
  perCoin: 5,
  missionBonus: 500,
  powerUpMultiplier: 2,
  maxMissionMultiplier: 30,
} as const;

/**
 * Score = (distance + coins*5 + bonuses) * multiplier, accumulated live so that
 * a temporary multiplier only affects points earned while it is active.
 */
export class ScoreSystem {
  score = 0;
  coins = 0;
  distance = 0;
  baseMultiplier = 1;
  powerUpActive = false;
  private fractional = 0;

  reset(baseMultiplier: number): void {
    this.score = 0;
    this.coins = 0;
    this.distance = 0;
    this.fractional = 0;
    this.powerUpActive = false;
    this.baseMultiplier = Math.max(1, Math.min(SCORE_RULES.maxMissionMultiplier, Math.floor(baseMultiplier)));
  }

  get multiplier(): number {
    return this.baseMultiplier * (this.powerUpActive ? SCORE_RULES.powerUpMultiplier : 1);
  }

  addDistance(meters: number): void {
    if (meters <= 0) return;
    this.distance += meters;
    this.fractional += meters * SCORE_RULES.perMeter * this.multiplier;
    const whole = Math.floor(this.fractional);
    this.score += whole;
    this.fractional -= whole;
  }

  addCoins(count: number): void {
    this.coins += count;
    this.score += count * SCORE_RULES.perCoin * this.multiplier;
  }

  addBonus(points: number): void {
    this.score += Math.round(points * this.multiplier);
  }
}
