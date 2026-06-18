export type ComboEventCallback = () => void;

export class ScoreManager {
  combo: number = 0;
  maxCombo: number = 0;
  totalScore: number = 0;
  lastCollectTime: number = 0;
  comboDecayTimer: number = 0;
  comboScale: number = 1;
  comboFlashing: boolean = false;
  comboShakeTimer: number = 0;
  comboBreakCallback: ComboEventCallback | null = null;

  reset() {
    this.combo = 0;
    this.maxCombo = 0;
    this.totalScore = 0;
    this.lastCollectTime = 0;
    this.comboDecayTimer = 0;
    this.comboScale = 1;
    this.comboFlashing = false;
    this.comboShakeTimer = 0;
  }

  addScore(colorMatch: boolean, now: number): boolean {
    if (colorMatch) {
      this.combo++;
      if (this.combo > this.maxCombo) {
        this.maxCombo = this.combo;
      }
      const comboMultiplier = 1 + Math.floor(this.combo / 5) * 0.5;
      const baseScore = 10;
      this.totalScore += Math.floor(baseScore * comboMultiplier);
      this.lastCollectTime = now;
      this.comboDecayTimer = 0;
      this.comboScale = 1.2;
      this.comboFlashing = true;
      return true;
    } else {
      if (this.combo > 0 && this.comboBreakCallback) {
        this.comboBreakCallback();
      }
      this.combo = 0;
      this.comboShakeTimer = 0.5;
      return false;
    }
  }

  update(dt: number, now: number) {
    if (this.comboFlashing) {
      this.comboScale -= dt * 1;
      if (this.comboScale <= 1) {
        this.comboScale = 1;
        this.comboFlashing = false;
      }
    }

    if (this.comboShakeTimer > 0) {
      this.comboShakeTimer -= dt;
    }

    if (this.combo > 0 && this.lastCollectTime > 0) {
      const elapsed = now - this.lastCollectTime;
      if (elapsed > 2) {
        this.comboDecayTimer += dt;
        if (this.comboDecayTimer >= 1) {
          this.comboDecayTimer -= 1;
          this.combo--;
          this.comboShakeTimer = 0.2;
          if (this.combo <= 0) {
            this.combo = 0;
            if (this.comboBreakCallback) {
              this.comboBreakCallback();
            }
          }
        }
      } else {
        this.comboDecayTimer = 0;
      }
    }
  }

  isComboDecaying(now: number): boolean {
    return this.combo > 0 && this.lastCollectTime > 0 && (now - this.lastCollectTime) > 2;
  }
}
