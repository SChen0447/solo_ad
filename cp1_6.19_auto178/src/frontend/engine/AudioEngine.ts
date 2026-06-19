export interface Note {
  beat: number;
  pitch: number;
}

const NOTE_FREQUENCIES = [
  261.63, 293.66, 329.63, 349.23, 392.0, 440.0, 493.88, 523.25,
];

export class AudioEngine {
  private audioContext: AudioContext | null = null;
  private isPlaying = false;
  private bpm = 120;
  private notes: Note[] = [];
  private currentBeat = -1;
  private startTime = 0;
  private onBeatCallback: ((beat: number) => void) | null = null;
  private onEndCallback: (() => void) | null = null;
  private animationFrameId: number | null = null;
  private masterGain: GainNode | null = null;
  private tracks: { notes: Note[]; color: string }[] = [];

  constructor() {
    this.initAudioContext();
  }

  private initAudioContext() {
    if (typeof window !== 'undefined' && !this.audioContext) {
      const AC = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (AC) {
        const ctx = new AC();
        const gain = ctx.createGain();
        gain.gain.value = 0.4;
        gain.connect(ctx.destination);
        this.audioContext = ctx;
        this.masterGain = gain;
      }
    }
  }

  public setOnBeatCallback(callback: (beat: number) => void) {
    this.onBeatCallback = callback;
  }

  public setOnEndCallback(callback: () => void) {
    this.onEndCallback = callback;
  }

  public setBpm(bpm: number) {
    this.bpm = bpm;
  }

  public setNotes(notes: Note[]) {
    this.notes = notes;
  }

  public setTracks(tracks: { notes: Note[]; color: string }[]) {
    this.tracks = tracks;
  }

  public play() {
    if (!this.audioContext) this.initAudioContext();
    if (!this.audioContext) return;
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
    this.isPlaying = true;
    this.startTime = this.audioContext.currentTime;
    this.currentBeat = -1;
    this.scheduleNotes();
    this.animate();
  }

  public playTracks() {
    if (!this.audioContext) this.initAudioContext();
    if (!this.audioContext) return;
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
    this.isPlaying = true;
    this.startTime = this.audioContext.currentTime;
    this.currentBeat = -1;
    this.tracks.forEach((track) => {
      this.scheduleNoteList(track.notes);
    });
    this.animate();
  }

  private scheduleNotes() {
    if (!this.audioContext || !this.masterGain) return;
    this.scheduleNoteList(this.notes);
  }

  private scheduleNoteList(notes: Note[]) {
    if (!this.audioContext || !this.masterGain) return;
    const beatDuration = 60 / this.bpm;
    notes.forEach((note) => {
      const freq = NOTE_FREQUENCIES[note.pitch] || 440;
      const startTime = this.startTime + note.beat * beatDuration;
      const duration = beatDuration * 0.8;

      const osc = this.audioContext!.createOscillator();
      const gain = this.audioContext!.createGain();

      osc.type = 'sine';
      osc.frequency.value = freq;

      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.3, startTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

      osc.connect(gain);
      gain.connect(this.masterGain!);

      osc.start(startTime);
      osc.stop(startTime + duration);
    });
  }

  private animate = () => {
    if (!this.isPlaying || !this.audioContext) return;
    const beatDuration = 60 / this.bpm;
    const elapsed = this.audioContext.currentTime - this.startTime;
    const beat = Math.floor(elapsed / beatDuration);

    if (beat !== this.currentBeat && beat < 8) {
      this.currentBeat = beat;
      if (this.onBeatCallback) {
        this.onBeatCallback(beat);
      }
    }

    if (elapsed >= 8 * beatDuration) {
      this.stop();
      if (this.onEndCallback) {
        this.onEndCallback();
      }
      return;
    }

    this.animationFrameId = requestAnimationFrame(this.animate);
  };

  public stop() {
    this.isPlaying = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    this.currentBeat = -1;
    if (this.onBeatCallback) {
      this.onBeatCallback(-1);
    }
  }

  public isCurrentlyPlaying(): boolean {
    return this.isPlaying;
  }

  public getCurrentBeat(): number {
    return this.currentBeat;
  }

  public playNote(pitch: number) {
    if (!this.audioContext) this.initAudioContext();
    if (!this.audioContext || !this.masterGain) return;
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
    const freq = NOTE_FREQUENCIES[pitch] || 440;
    const now = this.audioContext.currentTime;
    const duration = 0.3;

    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();

    osc.type = 'sine';
    osc.frequency.value = freq;

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.3, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + duration);
  }
}
