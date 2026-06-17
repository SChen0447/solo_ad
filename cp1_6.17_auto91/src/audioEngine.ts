export interface BandEnergy {
  low: number;
  mid: number;
  high: number;
}

export interface AudioConfig {
  fftSize: number;
  smoothingTimeConstant: number;
  lowBandRange: [number, number];
  midBandRange: [number, number];
  highBandRange: [number, number];
  thresholds: BandEnergy;
  debounceMs: number;
}

export const DEFAULT_AUDIO_CONFIG: AudioConfig = {
  fftSize: 1024,
  smoothingTimeConstant: 0.75,
  lowBandRange: [20, 250],
  midBandRange: [250, 2000],
  highBandRange: [2000, 16000],
  thresholds: { low: 0.55, mid: 0.50, high: 0.60 },
  debounceMs: 50
};

type TriggerCallback = (band: keyof BandEnergy) => void;

export class AudioEngine {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private microphone: MediaStreamAudioSourceNode | null = null;
  private stream: MediaStream | null = null;
  private frequencyData: Uint8Array | null = null;
  private timeData: Uint8Array | null = null;
  private sampleRate: number = 44100;

  private config: AudioConfig;
  private lastTriggerTime: BandEnergy = { low: 0, mid: 0, high: 0 };
  private onTriggerCallbacks: TriggerCallback[] = [];
  private isInitialized: boolean = false;
  private isRunning: boolean = false;

  private smoothedEnergy: BandEnergy = { low: 0, mid: 0, high: 0 };
  private peakEnergy: BandEnergy = { low: 0.5, mid: 0.5, high: 0.5 };

  constructor(config: Partial<AudioConfig> = {}) {
    this.config = { ...DEFAULT_AUDIO_CONFIG, ...config };
  }

  public async init(): Promise<boolean> {
    if (this.isInitialized) return true;

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false
        }
      });

      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.audioContext = new AudioCtx();
      this.sampleRate = this.audioContext.sampleRate;

      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = this.config.fftSize;
      this.analyser.smoothingTimeConstant = this.config.smoothingTimeConstant;

      this.microphone = this.audioContext.createMediaStreamSource(this.stream);
      this.microphone.connect(this.analyser);

      const bufferLength = this.analyser.frequencyBinCount;
      this.frequencyData = new Uint8Array(bufferLength);
      this.timeData = new Uint8Array(bufferLength);

      this.isInitialized = true;
      return true;
    } catch (error) {
      console.error('Failed to initialize audio engine:', error);
      return false;
    }
  }

  public start(): void {
    if (!this.isInitialized || this.isRunning) return;
    if (this.audioContext?.state === 'suspended') {
      this.audioContext.resume();
    }
    this.isRunning = true;
  }

  public stop(): void {
    this.isRunning = false;
  }

  public update(): BandEnergy {
    if (!this.isRunning || !this.analyser || !this.frequencyData || !this.timeData) {
      return { low: 0, mid: 0, high: 0 };
    }

    this.analyser.getByteFrequencyData(this.frequencyData as Uint8Array<ArrayBuffer>);
    this.analyser.getByteTimeDomainData(this.timeData as Uint8Array<ArrayBuffer>);

    const nyquist = this.sampleRate / 2;
    const binHz = nyquist / this.frequencyData.length;

    const calcBandEnergy = (range: [number, number]): number => {
      const startBin = Math.max(0, Math.floor(range[0] / binHz));
      const endBin = Math.min(this.frequencyData!.length - 1, Math.ceil(range[1] / binHz));
      let sum = 0;
      let count = 0;
      for (let i = startBin; i <= endBin; i++) {
        sum += this.frequencyData![i];
        count++;
      }
      return count > 0 ? (sum / count) / 255 : 0;
    };

    const rawEnergy: BandEnergy = {
      low: calcBandEnergy(this.config.lowBandRange),
      mid: calcBandEnergy(this.config.midBandRange),
      high: calcBandEnergy(this.config.highBandRange)
    };

    const alpha = 0.15;
    this.smoothedEnergy.low = this.smoothedEnergy.low * (1 - alpha) + rawEnergy.low * alpha;
    this.smoothedEnergy.mid = this.smoothedEnergy.mid * (1 - alpha) + rawEnergy.mid * alpha;
    this.smoothedEnergy.high = this.smoothedEnergy.high * (1 - alpha) + rawEnergy.high * alpha;

    (Object.keys(this.peakEnergy) as (keyof BandEnergy)[]).forEach((band) => {
      this.peakEnergy[band] = Math.max(
        this.peakEnergy[band] * 0.995,
        this.smoothedEnergy[band]
      );
    });

    const normalized: BandEnergy = {
      low: Math.min(1, this.smoothedEnergy.low / Math.max(0.1, this.peakEnergy.low)),
      mid: Math.min(1, this.smoothedEnergy.mid / Math.max(0.1, this.peakEnergy.mid)),
      high: Math.min(1, this.smoothedEnergy.high / Math.max(0.1, this.peakEnergy.high))
    };

    const now = performance.now();
    (Object.keys(normalized) as (keyof BandEnergy)[]).forEach((band) => {
      const threshold = this.config.thresholds[band];
      if (normalized[band] >= threshold && now - this.lastTriggerTime[band] >= this.config.debounceMs) {
        this.lastTriggerTime[band] = now;
        this.triggerCallbacks(band);
      }
    });

    return normalized;
  }

  public getNormalizedEnergy(): BandEnergy {
    return { ...this.smoothedEnergy };
  }

  public onTrigger(callback: TriggerCallback): () => void {
    this.onTriggerCallbacks.push(callback);
    return () => {
      const index = this.onTriggerCallbacks.indexOf(callback);
      if (index !== -1) this.onTriggerCallbacks.splice(index, 1);
    };
  }

  private triggerCallbacks(band: keyof BandEnergy): void {
    this.onTriggerCallbacks.forEach((cb) => cb(band));
  }

  public setThreshold(band: keyof BandEnergy, value: number): void {
    this.config.thresholds[band] = Math.max(0, Math.min(1, value));
  }

  public getThresholds(): BandEnergy {
    return { ...this.config.thresholds };
  }

  public getWaveformData(): number[] {
    if (!this.timeData) return [];
    return Array.from(this.timeData).map((v) => (v - 128) / 128);
  }

  public destroy(): void {
    this.stop();
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    this.analyser = null;
    this.microphone = null;
    this.frequencyData = null;
    this.timeData = null;
    this.isInitialized = false;
    this.onTriggerCallbacks = [];
  }

  public getInitialized(): boolean {
    return this.isInitialized;
  }

  public getRunning(): boolean {
    return this.isRunning;
  }
}
