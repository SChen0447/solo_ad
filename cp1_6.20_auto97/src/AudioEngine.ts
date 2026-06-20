interface ActiveNote {
  oscillators: OscillatorNode[];
  gainNode: GainNode;
  startTime: number;
}

export class AudioEngine {
  private audioContext: AudioContext | null = null;
  private activeNotes: Map<string, ActiveNote> = new Map();
  private masterGain: GainNode | null = null;

  constructor() {}

  private init(): void {
    if (this.audioContext) return;
    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    this.masterGain = this.audioContext.createGain();
    this.masterGain.gain.value = 0.6;
    this.masterGain.connect(this.audioContext.destination);
  }

  public resume(): void {
    this.init();
    if (this.audioContext && this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
  }

  private getFrequency(note: string, octave: number): number {
    const noteFrequencies: Record<string, number> = {
      'C': 261.63, 'C#': 277.18, 'D': 293.66, 'D#': 311.13,
      'E': 329.63, 'F': 349.23, 'F#': 369.99, 'G': 392.00,
      'G#': 415.30, 'A': 440.00, 'A#': 466.16, 'B': 493.88
    };
    const baseFreq = noteFrequencies[note];
    const octaveDiff = octave - 4;
    return baseFreq * Math.pow(2, octaveDiff);
  }

  public noteOn(note: string, octave: number, velocity: number = 0.8): void {
    this.init();
    if (!this.audioContext || !this.masterGain) return;

    const noteKey = `${note}${octave}`;
    if (this.activeNotes.has(noteKey)) {
      this.noteOff(note, octave);
    }

    const frequency = this.getFrequency(note, octave);
    const now = this.audioContext.currentTime;

    const gainNode = this.audioContext.createGain();
    gainNode.connect(this.masterGain);

    const oscillators: OscillatorNode[] = [];
    const harmonics = [
      { ratio: 1, gain: 1.0 },
      { ratio: 2, gain: 0.5 },
      { ratio: 3, gain: 0.25 },
      { ratio: 4, gain: 0.125 },
      { ratio: 5, gain: 0.06 }
    ];

    harmonics.forEach((h) => {
      const osc = this.audioContext!.createOscillator();
      osc.type = 'triangle';
      osc.frequency.value = frequency * h.ratio;

      const oscGain = this.audioContext!.createGain();
      oscGain.gain.value = h.gain * velocity * 0.3;
      osc.connect(oscGain);
      oscGain.connect(gainNode);
      osc.start(now);
      oscillators.push(osc);
    });

    const attackTime = 0.005;
    const decayTime = 0.1;
    const sustainLevel = 0.6;

    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(velocity * 0.8, now + attackTime);
    gainNode.gain.linearRampToValueAtTime(velocity * sustainLevel * 0.8, now + attackTime + decayTime);

    this.activeNotes.set(noteKey, {
      oscillators,
      gainNode,
      startTime: now
    });
  }

  public noteOff(note: string, octave: number): void {
    const noteKey = `${note}${octave}`;
    const activeNote = this.activeNotes.get(noteKey);
    if (!activeNote || !this.audioContext) return;

    const now = this.audioContext.currentTime;
    const releaseTime = 0.3;

    activeNote.gainNode.gain.cancelScheduledValues(now);
    activeNote.gainNode.gain.setValueAtTime(activeNote.gainNode.gain.value, now);
    activeNote.gainNode.gain.linearRampToValueAtTime(0, now + releaseTime);

    activeNote.oscillators.forEach((osc) => {
      osc.stop(now + releaseTime + 0.05);
    });

    this.activeNotes.delete(noteKey);
  }

  public allNotesOff(): void {
    for (const [noteKey] of this.activeNotes) {
      const match = noteKey.match(/^([A-G]#?)(\d)$/);
      if (match) {
        this.noteOff(match[1], parseInt(match[2], 10));
      }
    }
  }

  public getContextTime(): number {
    this.init();
    return this.audioContext ? this.audioContext.currentTime : 0;
  }

  public getAudioContext(): AudioContext | null {
    this.init();
    return this.audioContext;
  }
}
