const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

function midiToFrequency(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

export function midiToNoteName(midi: number): string {
  const octave = Math.floor(midi / 12) - 1;
  const name = NOTE_NAMES[midi % 12];
  return `${name}${octave}`;
}

export interface Note {
  id: string;
  pitch: number;
  startTime: number;
  duration: number;
  isPlaying?: boolean;
  isDeleting?: boolean;
  deleteStartTime?: number;
  scale?: number;
  opacity?: number;
}

export type NoteDuration = 4 | 2 | 1 | 0.5;

export interface PlaybackState {
  isPlaying: boolean;
  currentTime: number;
  speed: number;
}

export class PlaybackEngine {
  private audioCtx: AudioContext | null = null;
  private scheduledNodes: OscillatorNode[] = [];
  private animationFrameId: number = 0;
  private playStartTime: number = 0;
  private playOffset: number = 0;
  private speed: number = 1;
  private isPlaying: boolean = false;
  private onProgress: ((time: number) => void) | null = null;
  private onNoteStart: ((id: string) => void) | null = null;
  private onNoteEnd: ((id: string) => void) | null = null;
  private onFinished: (() => void) | null = null;
  private currentNotes: Note[] = [];
  private playedNoteIds: Set<string> = new Set();
  private activeNoteIds: Set<string> = new Set();

  private ensureContext() {
    if (!this.audioCtx) {
      this.audioCtx = new AudioContext();
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  play(
    notes: Note[],
    startOffset: number,
    speed: number,
    onProgress: (time: number) => void,
    onNoteStart: (id: string) => void,
    onNoteEnd: (id: string) => void,
    onFinished: () => void
  ) {
    this.ensureContext();
    this.stop();

    this.currentNotes = [...notes].sort((a, b) => a.startTime - b.startTime);
    this.speed = speed;
    this.onProgress = onProgress;
    this.onNoteStart = onNoteStart;
    this.onNoteEnd = onNoteEnd;
    this.onFinished = onFinished;
    this.isPlaying = true;
    this.playedNoteIds = new Set();
    this.activeNoteIds = new Set();

    const ctx = this.audioCtx!;
    this.playOffset = startOffset;
    this.playStartTime = ctx.currentTime - startOffset / speed;

    this.scheduleAllNotes();
    this.startProgressLoop();
  }

  private scheduleAllNotes() {
    const ctx = this.audioCtx!;
    const beatDuration = 60 / 120;

    for (const note of this.currentNotes) {
      const noteStartSec = note.startTime * beatDuration / this.speed;
      const noteDurationSec = note.duration * beatDuration / this.speed;

      if (noteStartSec + noteDurationSec <= this.playOffset / this.speed) continue;

      const delay = Math.max(0, noteStartSec - this.playOffset / this.speed);
      const actualStart = ctx.currentTime + delay;
      const actualDuration = noteDurationSec - Math.max(0, this.playOffset / this.speed - noteStartSec);

      if (actualDuration <= 0) continue;

      try {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.value = midiToFrequency(note.pitch);

        const attackTime = 0.02;
        const decayTime = 0.05;
        const sustainLevel = 0.3;
        const releaseTime = 0.08;

        gain.gain.setValueAtTime(0, actualStart);
        gain.gain.linearRampToValueAtTime(0.5, actualStart + attackTime);
        gain.gain.linearRampToValueAtTime(sustainLevel, actualStart + attackTime + decayTime);
        gain.gain.setValueAtTime(sustainLevel, actualStart + actualDuration - releaseTime);
        gain.gain.linearRampToValueAtTime(0, actualStart + actualDuration);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(actualStart);
        osc.stop(actualStart + actualDuration + 0.01);

        this.scheduledNodes.push(osc);

        osc.onended = () => {
          const idx = this.scheduledNodes.indexOf(osc);
          if (idx > -1) this.scheduledNodes.splice(idx, 1);
        };
      } catch {
        // ignore scheduling errors
      }
    }
  }

  private startProgressLoop() {
    const ctx = this.audioCtx!;
    const beatDuration = 60 / 120;
    const totalDuration = 16;

    const tick = () => {
      if (!this.isPlaying) return;

      const elapsed = (ctx.currentTime - this.playStartTime) * this.speed;
      const currentBeat = elapsed / beatDuration;

      if (this.onProgress) {
        this.onProgress(currentBeat);
      }

      for (const note of this.currentNotes) {
        const noteStart = note.startTime;
        const noteEnd = note.startTime + note.duration;

        if (currentBeat >= noteStart && !this.playedNoteIds.has(note.id)) {
          this.playedNoteIds.add(note.id);
          if (this.onNoteStart) this.onNoteStart(note.id);
        }

        if (currentBeat >= noteEnd && this.activeNoteIds.has(note.id)) {
          this.activeNoteIds.delete(note.id);
          if (this.onNoteEnd) this.onNoteEnd(note.id);
        }

        if (currentBeat >= noteStart && currentBeat < noteEnd) {
          this.activeNoteIds.add(note.id);
        }
      }

      if (currentBeat >= totalDuration * beatDuration) {
        this.isPlaying = false;
        if (this.onFinished) this.onFinished();
        return;
      }

      this.animationFrameId = requestAnimationFrame(tick);
    };

    this.animationFrameId = requestAnimationFrame(tick);
  }

  pause() {
    if (!this.isPlaying) return;
    this.isPlaying = false;

    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = 0;
    }

    for (const node of this.scheduledNodes) {
      try { node.stop(); } catch { /* ignore */ }
    }
    this.scheduledNodes = [];
  }

  stop() {
    this.isPlaying = false;

    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = 0;
    }

    for (const node of this.scheduledNodes) {
      try { node.stop(); } catch { /* ignore */ }
    }
    this.scheduledNodes = [];
    this.playedNoteIds.clear();
    this.activeNoteIds.clear();
  }

  getCurrentOffset(): number {
    if (!this.isPlaying || !this.audioCtx) return this.playOffset;
    const ctx = this.audioCtx;
    const beatDuration = 60 / 120;
    const elapsed = (ctx.currentTime - this.playStartTime) * this.speed;
    return elapsed / beatDuration;
  }

  setSpeed(speed: number) {
    if (this.isPlaying && this.audioCtx) {
      const currentOffset = this.getCurrentOffset();
      this.stop();
      if (this.onProgress) this.onProgress(currentOffset);
      this.play(
        this.currentNotes,
        currentOffset,
        speed,
        this.onProgress!,
        this.onNoteStart!,
        this.onNoteEnd!,
        this.onFinished!
      );
    } else {
      this.speed = speed;
    }
  }

  getIsPlaying(): boolean {
    return this.isPlaying;
  }
}
