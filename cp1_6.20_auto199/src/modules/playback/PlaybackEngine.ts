import type { Note, NoteDuration, Accidental } from '../../types';

type ProgressCallback = (progress: number, currentMeasure: number) => void;

interface ScheduleItem {
  note: Note;
  startTime: number;
  duration: number;
  oscillator: OscillatorNode | null;
  gainNode: GainNode | null;
}

const MEASURE_WIDTH = 200;
const CANVAS_PADDING_LEFT = 40;
const TOTAL_MEASURES = 4;

const DURATION_BEATS: Record<NoteDuration, number> = {
  whole: 4,
  half: 2,
  quarter: 1,
  eighth: 0.5,
};

const BASE_BPM = 120;

function getPitchFrequency(pitch: number, accidental: Accidental): number {
  const A4 = 440;
  const semitoneRatio = Math.pow(2, 1 / 12);
  const A4Position = 9;
  let semitoneOffset = (pitch - A4Position) * 2;
  if (pitch % 7 === 3 || pitch % 7 === 0) {
    semitoneOffset = semitoneOffset - (pitch >= A4Position ? 1 : -1);
  }
  if (accidental === 'sharp') semitoneOffset += 1;
  if (accidental === 'flat') semitoneOffset -= 1;
  return A4 * Math.pow(semitoneRatio, semitoneOffset);
}

export default class PlaybackEngine {
  private audioContext: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private scheduledItems: ScheduleItem[] = [];
  private notes: Note[] = [];
  private startMeasure: number = 0;
  private endMeasure: number = TOTAL_MEASURES;
  private speed: number = 1;
  private isPlaying: boolean = false;
  private isPaused: boolean = false;
  private startTime: number = 0;
  private pauseOffset: number = 0;
  private progressCallback: ProgressCallback | null = null;
  private animationFrameId: number | null = null;
  private totalDuration: number = 0;

  constructor() {
    this.initAudio();
  }

  private initAudio() {
    if (typeof window === 'undefined') return;
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.masterGain = this.audioContext.createGain();
      this.masterGain.gain.value = 0.3;
      this.masterGain.connect(this.audioContext.destination);
    } catch (e) {
      console.error('AudioContext not supported:', e);
    }
  }

  setProgressCallback(callback: ProgressCallback) {
    this.progressCallback = callback;
  }

  loadScore(notes: Note[], startMeasure: number, endMeasure: number, speed: number) {
    this.notes = notes.filter(n => n.measure >= startMeasure && n.measure < endMeasure);
    this.startMeasure = startMeasure;
    this.endMeasure = endMeasure;
    this.speed = speed;
    this.scheduledItems = [];
    this.totalDuration = this.calculateTotalDuration();
  }

  private calculateTotalDuration(): number {
    const bpm = BASE_BPM * this.speed;
    const beatDuration = 60 / bpm;
    const measuresCount = this.endMeasure - this.startMeasure;
    return measuresCount * 4 * beatDuration;
  }

  private scheduleNotes() {
    if (!this.audioContext || !this.masterGain) return;

    const bpm = BASE_BPM * this.speed;
    const beatDuration = 60 / bpm;
    const ctxTime = this.audioContext.currentTime;

    this.scheduledItems = this.notes.map((note) => {
      const measureOffset = (note.measure - this.startMeasure) * 4;
      const posInMeasure = (note.x - CANVAS_PADDING_LEFT - note.measure * MEASURE_WIDTH) / MEASURE_WIDTH * 4;
      const noteBeats = Math.max(0, measureOffset + posInMeasure);
      const noteDuration = DURATION_BEATS[note.duration] * beatDuration;
      const startTime = ctxTime + noteBeats * beatDuration;
      const frequency = getPitchFrequency(note.pitch, note.accidental);

      const osc = this.audioContext!.createOscillator();
      const gain = this.audioContext!.createGain();

      osc.type = 'sine';
      osc.frequency.value = frequency;

      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.5, startTime + 0.01);
      gain.gain.linearRampToValueAtTime(0.3, startTime + noteDuration * 0.5);
      gain.gain.linearRampToValueAtTime(0, startTime + noteDuration - 0.01);

      osc.connect(gain);
      gain.connect(this.masterGain!);

      osc.start(startTime);
      osc.stop(startTime + noteDuration);

      return {
        note,
        startTime,
        duration: noteDuration,
        oscillator: osc,
        gainNode: gain,
      };
    });
  }

  start() {
    if (!this.audioContext) {
      this.initAudio();
    }
    if (!this.audioContext) return;

    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }

    if (this.isPaused) {
      this.resume();
      return;
    }

    this.stopAllOscillators();
    this.scheduleNotes();
    this.isPlaying = true;
    this.isPaused = false;
    this.startTime = performance.now() - this.pauseOffset;
    this.updateProgress();
  }

  pause() {
    if (!this.isPlaying) return;
    this.isPlaying = false;
    this.isPaused = true;
    this.pauseOffset = performance.now() - this.startTime;

    const ctxTime = this.audioContext?.currentTime || 0;
    this.scheduledItems.forEach(item => {
      if (item.oscillator && item.startTime > ctxTime) {
        try {
          item.oscillator.stop();
        } catch {}
      }
    });

    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
  }

  resume() {
    if (!this.isPaused) return;
    this.scheduledItems = [];
    this.scheduleNotes();
    this.isPlaying = true;
    this.isPaused = false;
    this.startTime = performance.now() - this.pauseOffset;
    this.updateProgress();
  }

  stop() {
    this.isPlaying = false;
    this.isPaused = false;
    this.pauseOffset = 0;
    this.stopAllOscillators();
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
    if (this.progressCallback) {
      this.progressCallback(0, this.startMeasure);
    }
  }

  private stopAllOscillators() {
    this.scheduledItems.forEach(item => {
      if (item.oscillator) {
        try {
          item.oscillator.stop();
        } catch {}
      }
    });
    this.scheduledItems = [];
  }

  private updateProgress = () => {
    if (!this.isPlaying) return;

    const elapsed = (performance.now() - this.startTime) / 1000;
    const progress = this.totalDuration > 0 ? Math.min(1, elapsed / this.totalDuration) : 0;
    const measuresCount = this.endMeasure - this.startMeasure;
    const currentMeasure = this.startMeasure + Math.floor(progress * measuresCount);

    if (this.progressCallback) {
      this.progressCallback(progress, currentMeasure);
    }

    if (progress >= 1) {
      this.isPlaying = false;
      this.isPaused = false;
      this.pauseOffset = 0;
      return;
    }

    this.animationFrameId = requestAnimationFrame(this.updateProgress);
  };

  destroy() {
    this.stop();
    if (this.audioContext) {
      this.audioContext.close();
    }
  }
}
