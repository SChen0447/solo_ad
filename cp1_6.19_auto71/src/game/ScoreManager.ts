import { Beat, NoteColor } from '../audio/BeatMap'

export interface ScoreState {
  score: number
  combo: number
  maxCombo: number
  lives: number
  maxLives: number
  totalHits: number
  perfectHits: number
  totalMisses: number
  totalBeats: number
}

export interface HitResult {
  type: 'perfect' | 'hit' | 'miss'
  scoreGained: number
  note: NoteColor
  beatId?: string
}

export class ScoreManager {
  private state: ScoreState
  private onStateChange: ((state: ScoreState) => void) | null = null

  constructor(totalBeats: number, maxLives: number = 3) {
    this.state = {
      score: 0,
      combo: 0,
      maxCombo: 0,
      lives: maxLives,
      maxLives,
      totalHits: 0,
      perfectHits: 0,
      totalMisses: 0,
      totalBeats,
    }
  }

  subscribe(callback: (state: ScoreState) => void) {
    this.onStateChange = callback
  }

  private notify() {
    this.onStateChange?.({ ...this.state })
  }

  getState(): ScoreState {
    return { ...this.state }
  }

  processHit(beat: Beat, timingDiff: number): HitResult {
    const perfectWindow = 0.08
    const baseScore = 100

    if (Math.abs(timingDiff) <= perfectWindow) {
      const comboMultiplier = 1 + Math.floor(this.state.combo / 10) * 0.5
      const scoreGained = Math.round(baseScore * 2 * comboMultiplier)

      this.state.score += scoreGained
      this.state.combo++
      this.state.perfectHits++
      this.state.totalHits++
      if (this.state.combo > this.state.maxCombo) {
        this.state.maxCombo = this.state.combo
      }

      this.notify()
      return { type: 'perfect', scoreGained, note: beat.note, beatId: beat.id }
    } else {
      const comboMultiplier = 1 + Math.floor(this.state.combo / 10) * 0.5
      const scoreGained = Math.round(baseScore * comboMultiplier)

      this.state.score += scoreGained
      this.state.combo++
      this.state.totalHits++
      if (this.state.combo > this.state.maxCombo) {
        this.state.maxCombo = this.state.combo
      }

      this.notify()
      return { type: 'hit', scoreGained, note: beat.note, beatId: beat.id }
    }
  }

  processMiss(note?: NoteColor): HitResult {
    this.state.combo = 0
    this.state.totalMisses++
    this.state.lives = Math.max(0, this.state.lives - 1)

    this.notify()
    return { type: 'miss', scoreGained: 0, note: note || 'C' }
  }

  isGameOver(): boolean {
    return this.state.lives <= 0
  }

  getAccuracy(): number {
    const total = this.state.totalHits + this.state.totalMisses
    if (total === 0) return 0
    return (this.state.totalHits / total) * 100
  }

  getPerfectRate(): number {
    const total = this.state.totalHits + this.state.totalMisses
    if (total === 0) return 0
    return (this.state.perfectHits / total) * 100
  }

  getHitRate(): number {
    const total = this.state.totalHits + this.state.totalMisses
    if (total === 0) return 0
    return (this.state.totalHits / total) * 100
  }

  getMissRate(): number {
    const total = this.state.totalHits + this.state.totalMisses
    if (total === 0) return 0
    return (this.state.totalMisses / total) * 100
  }

  reset(totalBeats?: number) {
    if (totalBeats !== undefined) {
      this.state.totalBeats = totalBeats
    }
    this.state.score = 0
    this.state.combo = 0
    this.state.maxCombo = 0
    this.state.lives = this.state.maxLives
    this.state.totalHits = 0
    this.state.perfectHits = 0
    this.state.totalMisses = 0
    this.notify()
  }
}
