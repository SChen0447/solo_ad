export type JudgeResult = 'perfect' | 'miss';

export interface JudgeRecord {
  result: JudgeResult;
  timestamp: number;
  noteType: number;
}

export interface ScoreResult {
  score: number;
  totalNotes: number;
  perfectCount: number;
  missCount: number;
  accuracy: number;
  maxCombo: number;
}

export class ScoreTracker {
  private records: JudgeRecord[] = [];
  private currentCombo: number = 0;
  private maxCombo: number = 0;
  private score: number = 0;
  private perfectCount: number = 0;
  private missCount: number = 0;
  private totalNotes: number = 0;

  public reset(): void {
    this.records = [];
    this.currentCombo = 0;
    this.maxCombo = 0;
    this.score = 0;
    this.perfectCount = 0;
    this.missCount = 0;
    this.totalNotes = 0;
  }

  public setTotalNotes(count: number): void {
    this.totalNotes = count;
  }

  public addJudge(result: JudgeResult, noteType: number, timestamp: number): void {
    this.records.push({ result, timestamp, noteType });

    if (result === 'perfect') {
      this.perfectCount++;
      this.currentCombo++;
      this.maxCombo = Math.max(this.maxCombo, this.currentCombo);
      this.score += 10;
    } else {
      this.missCount++;
      this.currentCombo = 0;
    }
  }

  public getScore(): number {
    return this.score;
  }

  public getCurrentCombo(): number {
    return this.currentCombo;
  }

  public getMaxCombo(): number {
    return this.maxCombo;
  }

  public getAccuracy(): number {
    const total = this.perfectCount + this.missCount;
    if (total === 0) return 100;
    return (this.perfectCount / total) * 100;
  }

  public getResult(): ScoreResult {
    return {
      score: this.score,
      totalNotes: this.totalNotes,
      perfectCount: this.perfectCount,
      missCount: this.missCount,
      accuracy: this.getAccuracy(),
      maxCombo: this.maxCombo
    };
  }
}
