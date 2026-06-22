export type TimbreId = 'piano' | 'synth' | 'strings' | 'guitar' | 'bass' | 'drums';

export interface TimbreConfig {
  type: OscillatorType;
  filterType: BiquadFilterType;
  filterFreq: number;
  filterQ: number;
  attack: number;
  decay: number;
  sustain: number;
  release: number;
  gain: number;
  detune?: number;
  unison?: number;
}

export const TIMBRE_CONFIGS: Record<TimbreId, TimbreConfig> = {
  piano: {
    type: 'triangle',
    filterType: 'lowpass',
    filterFreq: 4000,
    filterQ: 1,
    attack: 0.005,
    decay: 0.3,
    sustain: 0.4,
    release: 0.8,
    gain: 0.6,
  },
  synth: {
    type: 'sawtooth',
    filterType: 'lowpass',
    filterFreq: 2500,
    filterQ: 4,
    attack: 0.01,
    decay: 0.2,
    sustain: 0.6,
    release: 0.5,
    gain: 0.5,
    unison: 3,
    detune: 10,
  },
  strings: {
    type: 'sawtooth',
    filterType: 'lowpass',
    filterFreq: 3000,
    filterQ: 2,
    attack: 0.15,
    decay: 0.3,
    sustain: 0.7,
    release: 1.2,
    gain: 0.45,
    unison: 4,
    detune: 5,
  },
  guitar: {
    type: 'square',
    filterType: 'bandpass',
    filterFreq: 1800,
    filterQ: 3,
    attack: 0.003,
    decay: 0.4,
    sustain: 0.3,
    release: 0.6,
    gain: 0.55,
  },
  bass: {
    type: 'sine',
    filterType: 'lowpass',
    filterFreq: 800,
    filterQ: 2,
    attack: 0.01,
    decay: 0.2,
    sustain: 0.8,
    release: 0.4,
    gain: 0.7,
  },
  drums: {
    type: 'square',
    filterType: 'highpass',
    filterFreq: 100,
    filterQ: 5,
    attack: 0.001,
    decay: 0.15,
    sustain: 0.0,
    release: 0.2,
    gain: 0.8,
  },
};

export const TIMBRE_NAMES: Record<TimbreId, string> = {
  piano: '钢琴',
  synth: '电子琴',
  strings: '弦乐',
  guitar: '吉他',
  bass: '贝斯',
  drums: '鼓',
};

const NOTE_FREQ_BASE = 440;
const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

function noteToFrequency(note: string): number {
  const match = note.match(/^([A-G]#?)(-?\d+)$/);
  if (!match) return 440;
  const [, name, octaveStr] = match;
  const octave = parseInt(octaveStr, 10);
  const semitone = NOTE_NAMES.indexOf(name);
  const midiNote = (octave + 1) * 12 + semitone;
  return NOTE_FREQ_BASE * Math.pow(2, (midiNote - 69) / 12);
}

interface ActiveVoice {
  oscillators: OscillatorNode[];
  gainNode: GainNode;
  filterNode: BiquadFilterNode;
  timbreGain: GainNode;
  panNode: StereoPannerNode;
  config: TimbreConfig;
  startTime: number;
}

class AudioEngine {
  private audioContext: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private activeVoices: Map<string, ActiveVoice> = new Map();
  private timbreGains: Map<TimbreId, GainNode> = new Map();
  private timbrePanners: Map<TimbreId, StereoPannerNode> = new Map();
  private timbreUsed: Set<TimbreId> = new Set();

  async initAudio(): Promise<void> {
    if (this.audioContext) return;
    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    this.masterGain = this.audioContext.createGain();
    this.masterGain.gain.value = 0.8;
    this.masterGain.connect(this.audioContext.destination);

    (Object.keys(TIMBRE_CONFIGS) as TimbreId[]).forEach((timbre) => {
      const gain = this.audioContext!.createGain();
      gain.gain.value = 0.8;
      const pan = this.audioContext!.createStereoPanner();
      pan.pan.value = 0;
      gain.connect(pan);
      pan.connect(this.masterGain!);
      this.timbreGains.set(timbre, gain);
      this.timbrePanners.set(timbre, pan);
    });
  }

  private ensureContext(): AudioContext {
    if (!this.audioContext) {
      throw new Error('AudioEngine not initialized. Call initAudio() first.');
    }
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
    return this.audioContext;
  }

  playNote(timbre: TimbreId, note: string, velocity: number = 1): void {
    const ctx = this.ensureContext();
    const voiceKey = `${timbre}-${note}`;

    if (this.activeVoices.has(voiceKey)) {
      this.stopNote(timbre, note);
    }

    this.timbreUsed.add(timbre);

    const config = TIMBRE_CONFIGS[timbre];
    const frequency = noteToFrequency(note);
    const now = ctx.currentTime;

    const timbreGain = this.timbreGains.get(timbre)!;
    const filterNode = ctx.createBiquadFilter();
    filterNode.type = config.filterType;
    filterNode.frequency.value = config.filterFreq;
    filterNode.Q.value = config.filterQ;

    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(
      config.gain * velocity,
      now + config.attack
    );
    gainNode.gain.linearRampToValueAtTime(
      config.gain * velocity * config.sustain,
      now + config.attack + config.decay
    );

    const oscillators: OscillatorNode[] = [];
    const unisonCount = config.unison || 1;
    const detuneAmount = config.detune || 0;

    for (let i = 0; i < unisonCount; i++) {
      const osc = ctx.createOscillator();
      osc.type = config.type;
      osc.frequency.value = frequency;
      if (unisonCount > 1) {
        const detune = detuneAmount * (i - (unisonCount - 1) / 2);
        osc.detune.value = detune;
      }
      osc.connect(filterNode);
      osc.start(now);
      oscillators.push(osc);
    }

    filterNode.connect(gainNode);
    gainNode.connect(timbreGain);

    this.activeVoices.set(voiceKey, {
      oscillators,
      gainNode,
      filterNode,
      timbreGain,
      panNode: this.timbrePanners.get(timbre)!,
      config,
      startTime: now,
    });
  }

  stopNote(timbre: TimbreId, note: string): void {
    const ctx = this.audioContext;
    if (!ctx) return;

    const voiceKey = `${timbre}-${note}`;
    const voice = this.activeVoices.get(voiceKey);
    if (!voice) return;

    const now = ctx.currentTime;
    const releaseTime = voice.config.release;

    voice.gainNode.gain.cancelScheduledValues(now);
    voice.gainNode.gain.setValueAtTime(voice.gainNode.gain.value, now);
    voice.gainNode.gain.linearRampToValueAtTime(0, now + releaseTime);

    const stopTime = now + releaseTime + 0.05;
    voice.oscillators.forEach((osc) => {
      try {
        osc.stop(stopTime);
      } catch (e) {
        // oscillator already stopped
      }
    });

    setTimeout(() => {
      try {
        voice.oscillators.forEach((osc) => osc.disconnect());
        voice.gainNode.disconnect();
        voice.filterNode.disconnect();
      } catch (e) {
        // already disconnected
      }
      this.activeVoices.delete(voiceKey);
    }, (releaseTime + 0.1) * 1000);
  }

  setVolume(timbre: TimbreId, volume: number): void {
    const gain = this.timbreGains.get(timbre);
    if (gain && this.audioContext) {
      const clampedVolume = Math.max(0, Math.min(1, volume));
      gain.gain.setTargetAtTime(clampedVolume, this.audioContext.currentTime, 0.01);
    }
  }

  setPan(timbre: TimbreId, pan: number): void {
    const panner = this.timbrePanners.get(timbre);
    if (panner && this.audioContext) {
      const clampedPan = Math.max(-1, Math.min(1, pan));
      panner.pan.setTargetAtTime(clampedPan, this.audioContext.currentTime, 0.01);
    }
  }

  getUsedTimbres(): TimbreId[] {
    return Array.from(this.timbreUsed);
  }

  markTimbreUsed(timbre: TimbreId): void {
    this.timbreUsed.add(timbre);
  }
}

export const audioEngine = new AudioEngine();
