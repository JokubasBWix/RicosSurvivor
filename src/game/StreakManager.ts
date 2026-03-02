export const TIER_2_THRESHOLD = 100;
export const TIER_3_THRESHOLD = 250;
export const MAX_STREAK = 300;

export class StreakManager {
  private _streak: number = 0;

  get streak(): number {
    return this._streak;
  }

  get multiplier(): number {
    if (this._streak >= TIER_3_THRESHOLD) return 3;
    if (this._streak >= TIER_2_THRESHOLD) return 2;
    return 1;
  }

  get progress(): number {
    return Math.min(1, this._streak / MAX_STREAK);
  }

  onCorrect(): boolean {
    const prevMultiplier = this.multiplier;
    this._streak++;
    return this.multiplier > prevMultiplier;
  }

  onWrong(): void {
    this._streak = 0;
  }

  reset(): void {
    this._streak = 0;
  }
}
