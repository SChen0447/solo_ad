import { eventBus, GameEvents } from '../core/EventBus';

export interface PingAudioData {
  duration: number;
  frequency: number;
  speed: number;
}

export interface ReflectAudioData {
  distance: number;
  intensity: number;
}

export class AudioEngine {
  private audioContext: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private initialized: boolean = false;

  constructor() {}

  public init(): void {
    if (this.initialized) return;

    try {
      this.audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      this.masterGain = this.audioContext.createGain();
      this.masterGain.gain.value = 0.4;
      this.masterGain.connect(this.audioContext.destination);

      this.initialized = true;
      this.registerEvents();
    } catch (e) {
      console.error('Failed to initialize AudioContext:', e);
    }
  }

  private registerEvents(): void {
    eventBus.on(GameEvents.AUDIO_PLAY_PING, (data) => this.playPing(data as PingAudioData));
    eventBus.on(GameEvents.AUDIO_PLAY_REFLECT, (data) => this.playReflect(data as ReflectAudioData));
    eventBus.on(GameEvents.AUDIO_PLAY_SCREAM, () => this.playScream());
    eventBus.on(GameEvents.AUDIO_PLAY_COLLECT, () => this.playCollect());
    eventBus.on(GameEvents.AUDIO_PLAY_DOOR, () => this.playDoor());
    eventBus.on(GameEvents.AUDIO_PLAY_HURT, () => this.playHurt());
  }

  private ensureContext(): void {
    if (!this.audioContext || !this.masterGain) return;
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
  }

  public playPing(data: PingAudioData): void {
    if (!this.audioContext || !this.masterGain) return;
    this.ensureContext();

    const ctx = this.audioContext;
    const duration = Math.min(Math.max(data.duration / 1000, 0.05), 1.2);
    const baseFreq = 400 + data.speed * 80;

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(baseFreq, ctx.currentTime);
    osc1.frequency.exponentialRampToValueAtTime(baseFreq * 0.5, ctx.currentTime + duration);

    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(baseFreq * 1.5, ctx.currentTime);
    osc2.frequency.exponentialRampToValueAtTime(baseFreq * 0.75, ctx.currentTime + duration);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2000, ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(500, ctx.currentTime + duration);

    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.25, ctx.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc1.start(ctx.currentTime);
    osc2.start(ctx.currentTime);
    osc1.stop(ctx.currentTime + duration);
    osc2.stop(ctx.currentTime + duration);
  }

  public playReflect(data: ReflectAudioData): void {
    if (!this.audioContext || !this.masterGain) return;
    this.ensureContext();

    const ctx = this.audioContext;
    const intensity = Math.min(Math.max(data.intensity, 0.1), 1);
    const distanceFactor = Math.max(0.2, 1 - data.distance / 800);
    const duration = 0.08 + intensity * 0.1;
    const freq = 600 + intensity * 400 + distanceFactor * 200;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.6, ctx.currentTime + duration);

    filter.type = 'bandpass';
    filter.frequency.value = freq;
    filter.Q.value = 2;

    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.2 * intensity * distanceFactor, ctx.currentTime + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);
  }

  public playScream(): void {
    if (!this.audioContext || !this.masterGain) return;
    this.ensureContext();

    const ctx = this.audioContext;
    const duration = 0.8;

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(800, ctx.currentTime);
    osc1.frequency.linearRampToValueAtTime(1600, ctx.currentTime + 0.1);
    osc1.frequency.linearRampToValueAtTime(300, ctx.currentTime + duration);

    osc2.type = 'square';
    osc2.frequency.setValueAtTime(1200, ctx.currentTime);
    osc2.frequency.linearRampToValueAtTime(2400, ctx.currentTime + 0.1);
    osc2.frequency.linearRampToValueAtTime(500, ctx.currentTime + duration);

    filter.type = 'highpass';
    filter.frequency.value = 500;

    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.25, ctx.currentTime + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc1.start(ctx.currentTime);
    osc2.start(ctx.currentTime);
    osc1.stop(ctx.currentTime + duration);
    osc2.stop(ctx.currentTime + duration);
  }

  public playCollect(): void {
    if (!this.audioContext || !this.masterGain) return;
    this.ensureContext();

    const ctx = this.audioContext;
    const duration = 0.3;
    const notes = [523.25, 659.25, 783.99, 1046.50];

    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const startTime = ctx.currentTime + i * 0.05;

      osc.type = 'sine';
      osc.frequency.value = freq;

      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.15, startTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

      osc.connect(gain);
      gain.connect(this.masterGain!);

      osc.start(startTime);
      osc.stop(startTime + duration);
    });
  }

  public playDoor(): void {
    if (!this.audioContext || !this.masterGain) return;
    this.ensureContext();

    const ctx = this.audioContext;
    const duration = 1.5;

    const osc = ctx.createOscillator();
    const noise = ctx.createBufferSource();
    const gain = ctx.createGain();
    const noiseGain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    const bufferSize = ctx.sampleRate * duration;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    }
    noise.buffer = noiseBuffer;

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(80, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(40, ctx.currentTime + duration);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(300, ctx.currentTime);
    filter.frequency.linearRampToValueAtTime(150, ctx.currentTime + duration);

    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.15, ctx.currentTime + 0.2);
    gain.gain.linearRampToValueAtTime(0.1, ctx.currentTime + duration - 0.3);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

    noiseGain.gain.setValueAtTime(0.1, ctx.currentTime);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    noise.connect(noiseGain);
    noiseGain.connect(this.masterGain);

    osc.start(ctx.currentTime);
    noise.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);
    noise.stop(ctx.currentTime + duration);
  }

  public playHurt(): void {
    if (!this.audioContext || !this.masterGain) return;
    this.ensureContext();

    const ctx = this.audioContext;
    const duration = 0.4;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(200, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + duration);

    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);
  }

  public destroy(): void {
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }
}
