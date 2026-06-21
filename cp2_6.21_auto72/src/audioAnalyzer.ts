export type SpectrumData = Float32Array;

export class AudioAnalyzer {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private source: MediaElementAudioSourceNode | null = null;
  private audioElement: HTMLAudioElement | null = null;
  private gainNode: GainNode | null = null;
  private frequencyData: Float32Array;
  private onSpectrumUpdate: ((data: SpectrumData) => void) | null = null;
  private animationId: number | null = null;
  private lastUpdateTime: number = 0;
  private readonly updateInterval: number = 1000 / 30;

  constructor() {
    this.frequencyData = new Float32Array(128);
  }

  async loadAudioFile(file: File): Promise<void> {
    if (this.audioContext) {
      this.cleanup();
    }

    this.audioContext = new AudioContext({ sampleRate: 44100 });
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 256;
    this.analyser.smoothingTimeConstant = 0.8;

    this.gainNode = this.audioContext.createGain();
    this.gainNode.gain.value = 1;

    const arrayBuffer = await file.arrayBuffer();
    const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);

    const blob = new Blob([arrayBuffer], { type: file.type });
    const url = URL.createObjectURL(blob);

    this.audioElement = new Audio();
    this.audioElement.src = url;
    this.audioElement.crossOrigin = 'anonymous';
    this.audioElement.loop = true;

    this.source = this.audioContext.createMediaElementSource(this.audioElement);
    this.source.connect(this.analyser);
    this.analyser.connect(this.gainNode);
    this.gainNode.connect(this.audioContext.destination);

    this.frequencyData = new Float32Array(this.analyser.frequencyBinCount);

    await this.audioContext.resume();
  }

  setVolume(volume: number): void {
    if (this.gainNode) {
      this.gainNode.gain.value = volume / 100;
    }
  }

  play(): void {
    if (this.audioElement && this.audioContext) {
      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume();
      }
      this.audioElement.play();
      this.startSpectrumUpdate();
    }
  }

  pause(): void {
    if (this.audioElement) {
      this.audioElement.pause();
      this.stopSpectrumUpdate();
    }
  }

  isPlaying(): boolean {
    return this.audioElement ? !this.audioElement.paused : false;
  }

  setOnSpectrumUpdate(callback: (data: SpectrumData) => void): void {
    this.onSpectrumUpdate = callback;
  }

  getFrequencyData(): SpectrumData {
    if (this.analyser) {
      this.analyser.getFloatFrequencyData(this.frequencyData);
      const normalized = new Float32Array(128);
      for (let i = 0; i < 128; i++) {
        const dbValue = this.frequencyData[i];
        const normalizedValue = Math.max(0, (dbValue + 100) / 100);
        normalized[i] = normalizedValue;
      }
      return normalized;
    }
    return new Float32Array(128);
  }

  private startSpectrumUpdate(): void {
    const update = (timestamp: number) => {
      if (timestamp - this.lastUpdateTime >= this.updateInterval) {
        const data = this.getFrequencyData();
        if (this.onSpectrumUpdate) {
          this.onSpectrumUpdate(data);
        }
        this.lastUpdateTime = timestamp;
      }
      this.animationId = requestAnimationFrame(update);
    };
    this.animationId = requestAnimationFrame(update);
  }

  private stopSpectrumUpdate(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  cleanup(): void {
    this.stopSpectrumUpdate();
    if (this.audioElement) {
      this.audioElement.pause();
      this.audioElement.src = '';
      this.audioElement = null;
    }
    if (this.source) {
      this.source.disconnect();
      this.source = null;
    }
    if (this.gainNode) {
      this.gainNode.disconnect();
      this.gainNode = null;
    }
    if (this.analyser) {
      this.analyser.disconnect();
      this.analyser = null;
    }
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }
}
