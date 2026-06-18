import type { NoteData, JudgmentType } from './types';

export interface JudgmentResult {
  judgment: JudgmentType;
  deviation: number;
  color: string;
  rippleRadius: number;
  rippleCount: number;
}

const PERFECT_WINDOW = 150;
const GOOD_WINDOW = 300;

export class NoteEngine {
  private noteSpeed: number = 0;
  private trackStartX: number = 0;
  private trackEndX: number = 0;
  private judgeX: number = 0;
  private viewportW: number = 0;
  private viewportH: number = 0;
  private levelDuration: number = 30000;

  setViewport(w: number, h: number): void {
    this.viewportW = w;
    this.viewportH = h;
    this.trackEndX = w * 0.92;
    this.trackStartX = w * 0.08;
    this.judgeX = w * 0.5;
  }

  setLevelDuration(d: number): void {
    this.levelDuration = d;
    const span = this.trackEndX - this.trackStartX;
    this.noteSpeed = span / (this.levelDuration * 0.001);
  }

  getJudgeX(): number {
    return this.judgeX;
  }

  getTrackY(): number {
    return this.viewportH * 0.5;
  }

  getTrackHeight(): number {
    return this.viewportH * 0.4;
  }

  getJudgeZoneWidth(): number {
    return this.viewportW * 0.1;
  }

  getNoteX(note: NoteData, currentTime: number): number {
    const dt = (note.time - currentTime) / 1000;
    return this.judgeX + dt * this.noteSpeed;
  }

  isInJudgeZone(note: NoteData, currentTime: number): boolean {
    const x = this.getNoteX(note, currentTime);
    const half = this.getJudgeZoneWidth() / 2;
    return x >= this.judgeX - half - 20 && x <= this.judgeX + half + 20;
  }

  judgeHit(note: NoteData, clickTime: number): JudgmentResult {
    const deviation = clickTime - note.time;
    const absDev = Math.abs(deviation);

    if (absDev <= PERFECT_WINDOW) {
      return {
        judgment: 'perfect',
        deviation,
        color: '#ffd700',
        rippleRadius: this.viewportH * 0.18,
        rippleCount: 3
      };
    } else if (absDev <= GOOD_WINDOW) {
      return {
        judgment: 'good',
        deviation,
        color: '#4fc3f7',
        rippleRadius: this.viewportH * 0.12,
        rippleCount: 1
      };
    } else {
      return {
        judgment: 'miss',
        deviation,
        color: '#888888',
        rippleRadius: 0,
        rippleCount: 0
      };
    }
  }

  checkAutoMiss(note: NoteData, currentTime: number): boolean {
    return !note.judged && currentTime - note.time > GOOD_WINDOW;
  }

  findClosestNote(
    notes: NoteData[],
    clickX: number,
    clickY: number,
    currentTime: number
  ): NoteData | null {
    const trackY = this.getTrackY();
    const trackH = this.getTrackHeight();
    const halfH = trackH / 2;
    const noteRadius = Math.min(this.viewportW, this.viewportH) * 0.025;

    if (clickY < trackY - halfH || clickY > trackY + halfH) {
      return null;
    }

    let best: NoteData | null = null;
    let bestDist = Infinity;

    for (const n of notes) {
      if (n.judged) continue;
      const nx = this.getNoteX(n, currentTime);
      const dx = clickX - nx;
      const dy = clickY - trackY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < noteRadius * 1.6 && dist < bestDist) {
        const absDev = Math.abs(currentTime - n.time);
        if (absDev <= GOOD_WINDOW + 50) {
          best = n;
          bestDist = dist;
        }
      }
    }

    return best;
  }

  getNoteRadius(): number {
    return Math.min(this.viewportW, this.viewportH) * 0.025;
  }
}
