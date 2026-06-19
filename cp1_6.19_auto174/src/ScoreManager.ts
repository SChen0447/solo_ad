export type HitQuality = 'perfect' | 'normal' | 'miss';

export type Grade = 'S' | 'A' | 'B' | 'C';

export interface ScoreState {
  score: number;
  combo: number;
  maxCombo: number;
  perfectCount: number;
  normalCount: number;
  missCount: number;
  totalBeatActions: number;
  scoreDelta: number;
}

export interface GameResult {
  score: number;
  maxCombo: number;
  perfectCount: number;
  normalCount: number;
  missCount: number;
  grade: Grade;
  perfectRate: number;
}

type ScoreChangeListener = (state: ScoreState) => void;

const STORAGE_KEY = 'beat_runner_best_score';

export class ScoreManager {
  private score: number = 0;
  private combo: number = 0;
  private maxCombo: number = 0;
  private perfectCount: number = 0;
  private normalCount: number = 0;
  private missCount: number = 0;
  private totalBeatActions: number = 0;
  private listeners: Set<ScoreChangeListener> = new Set();
  private lastScoreDelta: number = 0;

  reset(): void {
    this.score = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.perfectCount = 0;
    this.normalCount = 0;
    this.missCount = 0;
    this.totalBeatActions = 0;
    this.lastScoreDelta = 0;
    this.emit();
  }

  getState(): ScoreState {
    return {
      score: this.score,
      combo: this.combo,
      maxCombo: this.maxCombo,
      perfectCount: this.perfectCount,
      normalCount: this.normalCount,
      missCount: this.missCount,
      totalBeatActions: this.totalBeatActions,
      scoreDelta: this.lastScoreDelta,
    };
  }

  onChange(listener: ScoreChangeListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  registerHit(quality: HitQuality): void {
    this.totalBeatActions++;
    if (quality === 'perfect') {
      const comboBonus = Math.min(this.combo * 5, 100);
      this.lastScoreDelta = 100 + 50 + comboBonus;
      this.score += this.lastScoreDelta;
      this.combo++;
      this.perfectCount++;
    } else if (quality === 'normal') {
      const comboBonus = Math.min(this.combo * 5, 100);
      this.lastScoreDelta = 100 + comboBonus;
      this.score += this.lastScoreDelta;
      this.combo++;
      this.normalCount++;
    } else {
      this.lastScoreDelta = 0;
      this.combo = 0;
      this.missCount++;
    }
    this.maxCombo = Math.max(this.maxCombo, this.combo);
    this.emit();
  }

  breakCombo(): void {
    this.combo = 0;
    this.lastScoreDelta = 0;
    this.emit();
  }

  getResult(): GameResult {
    const total = this.perfectCount + this.normalCount + this.missCount;
    const perfectRate = total === 0 ? 0 : this.perfectCount / this.totalBeatActions;
    let grade: Grade;
    if (perfectRate >= 0.95) grade = 'S';
    else if (perfectRate >= 0.8) grade = 'A';
    else if (perfectRate >= 0.6) grade = 'B';
    else grade = 'C';
    return {
      score: this.score,
      maxCombo: this.maxCombo,
      perfectCount: this.perfectCount,
      normalCount: this.normalCount,
      missCount: this.missCount,
      grade,
      perfectRate,
    };
  }

  saveBest(): number {
    try {
      const current = this.getBest();
      if (this.score > current) {
        localStorage.setItem(STORAGE_KEY, String(this.score));
        return this.score;
      }
    } catch (_) {}
    return this.getBest();
  }

  getBest(): number {
    try {
      const v = localStorage.getItem(STORAGE_KEY);
      return v ? parseInt(v, 10) || 0 : 0;
    } catch (_) {
      return 0;
    }
  }

  private emit(): void {
    const state = this.getState();
    this.listeners.forEach((l) => l(state));
  }

  destroy(): void {
    this.listeners.clear();
  }
}
