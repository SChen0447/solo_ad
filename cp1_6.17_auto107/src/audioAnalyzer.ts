export type AudioSourceType = 'microphone' | 'file';

export interface FrequencyBands {
  low: number;
  midLow: number;
  mid: number;
  midHigh: number;
  high: number;
}

export interface BeatDetectionResult {
  isBeat: boolean;
  bands: FrequencyBands;
  averageEnergy: number;
}

export class AudioAnalyzer {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private source: MediaStreamAudioSourceNode | MediaElementAudioSourceNode | null = null;
  private gainNode: GainNode | null = null;
  private frequencyData: Uint8Array<ArrayBuffer> | null = null;
  private audioElement: HTMLAudioElement | null = null;
  private mediaStream: MediaStream | null = null;
  private sourceType: AudioSourceType | null = null;

  private beatHistory: number[] = [];
  private beatThreshold: number = 0.6;
  private lastBeatTime: number = 0;
  private beatHoldTime: number = 200;
  private peakEnergy: number = 0;
  private peakDecay: number = 0.95;

  constructor() {
  }

  public async initMicrophone(): Promise<void> {
    this.cleanup();

    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.source = this.audioContext.createMediaStreamSource(this.mediaStream);
      this.setupAnalyser();
      this.sourceType = 'microphone';
    } catch (error) {
      throw new Error('麦克风授权失败: ' + (error as Error).message);
    }
  }

  public async initFromFile(file: File): Promise<void> {
    this.cleanup();

    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    this.audioElement = new Audio();
    this.audioElement.src = URL.createObjectURL(file);
    this.audioElement.crossOrigin = 'anonymous';
    this.audioElement.loop = true;

    await this.audioElement.play().catch(() => {});
    this.audioElement.pause();
    this.audioElement.currentTime = 0;

    this.source = this.audioContext.createMediaElementSource(this.audioElement);
    this.setupAnalyser();
    this.sourceType = 'file';
  }

  private setupAnalyser(): void {
    if (!this.audioContext || !this.source) return;

    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 256;
    this.analyser.smoothingTimeConstant = 0.8;

    this.gainNode = this.audioContext.createGain();
    this.gainNode.gain.value = 1.0;

    this.source.connect(this.analyser);
    this.analyser.connect(this.gainNode);
    this.gainNode.connect(this.audioContext.destination);

    const bufferLength = this.analyser.frequencyBinCount;
    this.frequencyData = new Uint8Array(bufferLength) as Uint8Array<ArrayBuffer>;
  }

  public play(): void {
    if (this.audioContext?.state === 'suspended') {
      this.audioContext.resume();
    }
    if (this.sourceType === 'file' && this.audioElement) {
      this.audioElement.play();
    }
  }

  public pause(): void {
    if (this.sourceType === 'file' && this.audioElement) {
      this.audioElement.pause();
    }
  }

  public stop(): void {
    if (this.sourceType === 'file' && this.audioElement) {
      this.audioElement.pause();
      this.audioElement.currentTime = 0;
    }
  }

  public getBeatThreshold(): number {
    return this.beatThreshold;
  }

  public setBeatThreshold(value: number): void {
    this.beatThreshold = Math.max(0.1, Math.min(1.0, value));
  }

  public getSourceType(): AudioSourceType | null {
    return this.sourceType;
  }

  public analyze(): BeatDetectionResult {
    if (!this.analyser || !this.frequencyData) {
      return {
        isBeat: false,
        bands: { low: 0, midLow: 0, mid: 0, midHigh: 0, high: 0 },
        averageEnergy: 0
      };
    }

    this.analyser.getByteFrequencyData(this.frequencyData);

    const bands = this.calculateFrequencyBands();
    const averageEnergy = this.calculateAverageEnergy(bands);
    const isBeat = this.detectBeat(bands.low);

    return { isBeat, bands, averageEnergy };
  }

  private calculateFrequencyBands(): FrequencyBands {
    if (!this.frequencyData) {
      return { low: 0, midLow: 0, mid: 0, midHigh: 0, high: 0 };
    }

    const data = this.frequencyData;
    const length = data.length;

    const lowEnd = Math.floor(length * 0.1);
    const midLowEnd = Math.floor(length * 0.25);
    const midEnd = Math.floor(length * 0.5);
    const midHighEnd = Math.floor(length * 0.75);

    const low = this.average(data, 0, lowEnd) / 255;
    const midLow = this.average(data, lowEnd, midLowEnd) / 255;
    const mid = this.average(data, midLowEnd, midEnd) / 255;
    const midHigh = this.average(data, midEnd, midHighEnd) / 255;
    const high = this.average(data, midHighEnd, length) / 255;

    return { low, midLow, mid, midHigh, high };
  }

  private average(data: Uint8Array, start: number, end: number): number {
    if (start >= end) return 0;
    let sum = 0;
    for (let i = start; i < end; i++) {
      sum += data[i];
    }
    return sum / (end - start);
  }

  private calculateAverageEnergy(bands: FrequencyBands): number {
    return (bands.low + bands.midLow + bands.mid + bands.midHigh + bands.high) / 5;
  }

  private detectBeat(lowEnergy: number): boolean {
    const now = performance.now();

    this.beatHistory.push(lowEnergy);
    if (this.beatHistory.length > 40) {
      this.beatHistory.shift();
    }

    const historyAvg = this.beatHistory.reduce((a, b) => a + b, 0) / this.beatHistory.length;
    const threshold = historyAvg + this.beatThreshold * (1 - historyAvg);

    if (lowEnergy > this.peakEnergy) {
      this.peakEnergy = lowEnergy;
    } else {
      this.peakEnergy *= this.peakDecay;
    }

    const isAboveThreshold = lowEnergy > threshold;
    const hasHoldPassed = now - this.lastBeatTime > this.beatHoldTime;
    const isPeakSignificant = lowEnergy > 0.2;

    if (isAboveThreshold && hasHoldPassed && isPeakSignificant) {
      this.lastBeatTime = now;
      return true;
    }

    return false;
  }

  public cleanup(): void {
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }
    if (this.audioElement) {
      this.audioElement.pause();
      this.audioElement.src = '';
      this.audioElement = null;
    }
    if (this.source) {
      this.source.disconnect();
      this.source = null;
    }
    if (this.analyser) {
      this.analyser.disconnect();
      this.analyser = null;
    }
    if (this.gainNode) {
      this.gainNode.disconnect();
      this.gainNode = null;
    }
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    this.frequencyData = null;
    this.sourceType = null;
    this.beatHistory = [];
    this.lastBeatTime = 0;
    this.peakEnergy = 0;
  }

  public isInitialized(): boolean {
    return this.analyser !== null;
  }
}
