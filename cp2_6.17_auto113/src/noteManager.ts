export interface Note {
  id: number;
  track: number;
  time: number;
  y: number;
  hit: boolean;
  missed: boolean;
}

export interface JudgeResult {
  type: 'perfect' | 'good' | 'miss';
  track: number;
  noteId: number;
  x: number;
  y: number;
}

export interface SongNoteData {
  time: number;
  track: number;
}

export interface Song {
  id: string;
  title: string;
  artist: string;
  duration: number;
  bpm: number;
  difficulty: string;
  useSynthetic: boolean;
  audioUrl?: string;
  notes: SongNoteData[];
}

const PERFECT_WINDOW = 20;
const GOOD_WINDOW = 50;
const BASE_FALL_DURATION = 2000;

export class NoteManager {
  private notes: Note[] = [];
  private currentTime = 0;
  private judgeLineY = 0;
  private trackKeys = ['d', 'f', 'j', 'k'];
  private canvasWidth = 0;
  private canvasHeight = 0;
  private speedMultiplier = 1.0;

  public setSpeed(multiplier: number): void {
    this.speedMultiplier = Math.max(0.5, Math.min(2.0, multiplier));
  }

  public getSpeed(): number {
    return this.speedMultiplier;
  }

  private getFallDuration(): number {
    return BASE_FALL_DURATION / this.speedMultiplier;
  }

  public loadNotes(songData: Song): void {
    this.notes = songData.notes.map((noteData, index) => ({
      id: index,
      track: noteData.track,
      time: noteData.time,
      y: -30,
      hit: false,
      missed: false
    }));
    this.currentTime = 0;
  }

  public setCanvasSize(width: number, height: number): void {
    this.canvasWidth = width;
    this.canvasHeight = height;
    this.judgeLineY = height - 80;
  }

  public update(currentTime: number): JudgeResult | null {
    this.currentTime = currentTime;
    let missResult: JudgeResult | null = null;

    for (const note of this.notes) {
      if (note.hit || note.missed) continue;

      const timeDiff = currentTime - note.time;
      const progress = timeDiff / this.getFallDuration();
      note.y = this.judgeLineY - (1 - progress) * this.judgeLineY;

      if (timeDiff > GOOD_WINDOW && !note.missed) {
        note.missed = true;
        missResult = {
          type: 'miss',
          track: note.track,
          noteId: note.id,
          x: this.getTrackX(note.track),
          y: this.judgeLineY
        };
      }
    }

    return missResult;
  }

  public handleKeyDown(key: string): JudgeResult | null {
    const track = this.trackKeys.indexOf(key.toLowerCase());
    if (track === -1) return null;

    let closestNote: Note | null = null;
    let closestDiff = Infinity;

    for (const note of this.notes) {
      if (note.track !== track || note.hit || note.missed) continue;

      const timeDiff = Math.abs(this.currentTime - note.time);
      if (timeDiff < closestDiff && timeDiff <= GOOD_WINDOW) {
        closestDiff = timeDiff;
        closestNote = note;
      }
    }

    if (!closestNote) return null;

    closestNote.hit = true;

    const timeDiff = Math.abs(this.currentTime - closestNote.time);
    const judgeType = timeDiff <= PERFECT_WINDOW ? 'perfect' : 'good';

    return {
      type: judgeType,
      track: closestNote.track,
      noteId: closestNote.id,
      x: this.getTrackX(closestNote.track),
      y: this.judgeLineY
    };
  }

  public getTrackX(track: number): number {
    const trackWidth = this.canvasWidth / 4;
    return track * trackWidth + trackWidth / 2;
  }

  public getActiveNotes(): Note[] {
    return this.notes.filter(note => !note.hit && !note.missed && note.y >= -30 && note.y <= this.canvasHeight + 30);
  }

  public getNotes(): Note[] {
    return this.notes;
  }

  public getJudgeLineY(): number {
    return this.judgeLineY;
  }

  public isSongComplete(): boolean {
    return this.notes.every(note => note.hit || note.missed);
  }

  public reset(): void {
    this.notes = [];
    this.currentTime = 0;
  }
}
