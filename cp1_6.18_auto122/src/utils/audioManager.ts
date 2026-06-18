import { Howl } from 'howler';

export type SoundType =
  | 'laser'
  | 'rocket'
  | 'electromagnetic'
  | 'explosion'
  | 'upgrade'
  | 'gold'
  | 'damage'
  | 'build'
  | 'sell'
  | 'waveStart'
  | 'victory'
  | 'defeat';

interface SoundConfig {
  type: SoundType;
  frequency: number;
  duration: number;
  volume: number;
  type2?: OscillatorType;
}

const SOUND_CONFIGS: Record<SoundType, SoundConfig> = {
  laser: { type: 'laser', frequency: 880, duration: 0.1, volume: 0.2, type2: 'sine' },
  rocket: { type: 'rocket', frequency: 150, duration: 0.3, volume: 0.3, type2: 'sawtooth' },
  electromagnetic: { type: 'electromagnetic', frequency: 440, duration: 0.15, volume: 0.25, type2: 'square' },
  explosion: { type: 'explosion', frequency: 80, duration: 0.4, volume: 0.4, type2: 'sawtooth' },
  upgrade: { type: 'upgrade', frequency: 660, duration: 0.3, volume: 0.3, type2: 'sine' },
  gold: { type: 'gold', frequency: 1200, duration: 0.15, volume: 0.25, type2: 'sine' },
  damage: { type: 'damage', frequency: 200, duration: 0.2, volume: 0.3, type2: 'sawtooth' },
  build: { type: 'build', frequency: 523, duration: 0.2, volume: 0.3, type2: 'sine' },
  sell: { type: 'sell', frequency: 392, duration: 0.2, volume: 0.25, type2: 'triangle' },
  waveStart: { type: 'waveStart', frequency: 330, duration: 0.5, volume: 0.35, type2: 'square' },
  victory: { type: 'victory', frequency: 523, duration: 1, volume: 0.4, type2: 'sine' },
  defeat: { type: 'defeat', frequency: 196, duration: 1.5, volume: 0.4, type2: 'sawtooth' },
};

class AudioManager {
  private audioContext: AudioContext | null = null;
  private soundCache: Map<SoundType, AudioBuffer> = new Map();
  private masterVolume: number = 0.5;
  private enabled: boolean = true;
  private initialized: boolean = false;

  constructor() {
    this.initialize();
  }

  private initialize(): void {
    if (typeof window !== 'undefined' && !this.initialized) {
      try {
        this.audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
        this.initialized = true;
        this.generateSounds();
      } catch (e) {
        console.warn('Web Audio API not supported:', e);
        this.enabled = false;
      }
    }
  }

  private generateSounds(): void {
    if (!this.audioContext) return;

    Object.entries(SOUND_CONFIGS).forEach(([type, config]) => {
      const buffer = this.generateSoundBuffer(config);
      if (buffer) {
        this.soundCache.set(type as SoundType, buffer);
      }
    });
  }

  private generateSoundBuffer(config: SoundConfig): AudioBuffer | null {
    if (!this.audioContext) return null;

    const sampleRate = this.audioContext.sampleRate;
    const length = Math.floor(sampleRate * config.duration);
    const buffer = this.audioContext.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      let sample = 0;

      switch (config.type2 || 'sine') {
        case 'sine':
          sample = Math.sin(2 * Math.PI * config.frequency * t);
          break;
        case 'square':
          sample = Math.sign(Math.sin(2 * Math.PI * config.frequency * t));
          break;
        case 'sawtooth':
          sample = 2 * (t * config.frequency - Math.floor(t * config.frequency + 0.5));
          break;
        case 'triangle':
          sample = Math.abs(4 * (t * config.frequency - Math.floor(t * config.frequency + 0.75)) - 1) * 2 - 1;
          break;
      }

      const envelope = Math.exp(-t * 5);
      data[i] = sample * envelope * config.volume;
    }

    return buffer;
  }

  public play(soundType: SoundType): void {
    if (!this.enabled || !this.audioContext || !this.initialized) {
      this.initialize();
      if (!this.enabled) return;
    }

    if (this.audioContext?.state === 'suspended') {
      this.audioContext.resume();
    }

    const buffer = this.soundCache.get(soundType);
    if (!buffer) return;

    const source = this.audioContext!.createBufferSource();
    const gainNode = this.audioContext!.createGain();

    source.buffer = buffer;
    gainNode.gain.value = this.masterVolume;

    source.connect(gainNode);
    gainNode.connect(this.audioContext!.destination);

    source.start();
  }

  public playLaser(): void {
    this.play('laser');
  }

  public playRocket(): void {
    this.play('rocket');
  }

  public playElectromagnetic(): void {
    this.play('electromagnetic');
  }

  public playExplosion(): void {
    this.play('explosion');
  }

  public playUpgrade(): void {
    this.play('upgrade');
  }

  public playGold(): void {
    this.play('gold');
  }

  public playDamage(): void {
    this.play('damage');
  }

  public playBuild(): void {
    this.play('build');
  }

  public playSell(): void {
    this.play('sell');
  }

  public playWaveStart(): void {
    this.play('waveStart');
  }

  public playVictory(): void {
    this.play('victory');
  }

  public playDefeat(): void {
    this.play('defeat');
  }

  public setVolume(volume: number): void {
    this.masterVolume = Math.max(0, Math.min(1, volume));
  }

  public toggleEnabled(): boolean {
    this.enabled = !this.enabled;
    return this.enabled;
  }

  public isEnabled(): boolean {
    return this.enabled;
  }
}

export const audioManager = new AudioManager();
