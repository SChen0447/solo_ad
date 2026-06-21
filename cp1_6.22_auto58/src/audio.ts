export interface ActiveNote {
  oscillator: OscillatorNode;
  gainNode: GainNode;
}

export class PianoAudio {
  private audioContext: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private activeNotes: Map<string, ActiveNote> = new Map();

  private static readonly NOTE_FREQS: Record<string, number> = {};

  constructor() {
    this.initFrequencyMap();
  }

  private initFrequencyMap(): void {
    const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const a4Freq = 440;
    const a4Midi = 69;

    for (let midi = 21; midi <= 108; midi++) {
      const semitonesFromA4 = midi - a4Midi;
      const freq = a4Freq * Math.pow(2, semitonesFromA4 / 12);
      const octave = Math.floor(midi / 12) - 1;
      const noteIndex = midi % 12;
      const noteName = noteNames[noteIndex];
      const noteKey = `${noteName}${octave}`;
      PianoAudio.NOTE_FREQS[noteKey] = freq;
    }
  }

  public getFrequency(note: string): number {
    return PianoAudio.NOTE_FREQS[note] || 0;
  }

  public ensureContext(): AudioContext {
    if (!this.audioContext) {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.audioContext = new Ctx();
      this.masterGain = this.audioContext.createGain();
      this.masterGain.gain.value = 0.6;
      this.masterGain.connect(this.audioContext.destination);
    }
    if (this.audioContext.state === 'suspended') {
      void this.audioContext.resume();
    }
    return this.audioContext;
  }

  public noteOn(note: string, type: OscillatorType = 'triangle'): void {
    if (this.activeNotes.has(note)) {
      return;
    }

    const ctx = this.ensureContext();
    const freq = this.getFrequency(note);
    if (freq === 0) return;

    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);

    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.8, now + 0.01);
    gainNode.gain.linearRampToValueAtTime(0.5, now + 0.05);

    osc.connect(gainNode);
    gainNode.connect(this.masterGain!);

    osc.start(now);

    this.activeNotes.set(note, { oscillator: osc, gainNode });
  }

  public noteOff(note: string): void {
    const active = this.activeNotes.get(note);
    if (!active) return;

    const ctx = this.audioContext!;
    const now = ctx.currentTime;
    const oscillator = active.oscillator;
    const gainNode = active.gainNode;

    gainNode.gain.cancelScheduledValues(now);
    gainNode.gain.setValueAtTime(gainNode.gain.value, now);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

    oscillator.stop(now + 0.25);

    this.activeNotes.delete(note);
  }

  public stopAll(): void {
    for (const note of Array.from(this.activeNotes.keys())) {
      this.noteOff(note);
    }
  }

  public destroy(): void {
    this.stopAll();
    if (this.audioContext) {
      void this.audioContext.close();
      this.audioContext = null;
      this.masterGain = null;
    }
  }
}
