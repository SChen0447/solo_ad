export interface AudioData {
  frequencyAverage: number;
  isBeat: boolean;
}

export class AudioAnalyzer extends EventTarget {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private source: MediaElementAudioSourceNode | null = null;
  private audioElement: HTMLAudioElement | null = null;
  private frequencyData: Uint8Array | null = null;
  private lastBeatTime: number = 0;
  private previousEnergy: number = 0;
  private beatThreshold: number = 150;

  async loadFile(file: File): Promise<void> {
    this.cleanup();

    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 256;
    this.analyser.smoothingTimeConstant = 0.8;

    const bufferLength = this.analyser.frequencyBinCount;
    this.frequencyData = new Uint8Array(bufferLength);

    this.audioElement = new Audio();
    this.audioElement.src = URL.createObjectURL(file);
    this.audioElement.crossOrigin = 'anonymous';
    this.audioElement.loop = true;

    this.source = this.audioContext.createMediaElementSource(this.audioElement);
    this.source.connect(this.analyser);
    this.analyser.connect(this.audioContext.destination);

    await this.audioElement.play();
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
  }

  getAudioData(): AudioData {
    if (!this.analyser || !this.frequencyData) {
      return { frequencyAverage: 0, isBeat: false };
    }

    this.analyser.getByteFrequencyData(this.frequencyData);

    let sum = 0;
    let lowFreqSum = 0;
    const lowFreqCount = Math.floor(this.frequencyData.length * 0.1);

    for (let i = 0; i < this.frequencyData.length; i++) {
      sum += this.frequencyData[i];
      if (i < lowFreqCount) {
        lowFreqSum += this.frequencyData[i];
      }
    }

    const frequencyAverage = sum / this.frequencyData.length;
    const lowFreqAverage = lowFreqSum / lowFreqCount;

    let isBeat = false;
    const now = performance.now();
    if (now - this.lastBeatTime > 500) {
      if (lowFreqAverage > this.beatThreshold && lowFreqAverage > this.previousEnergy * 1.3) {
        isBeat = true;
        this.lastBeatTime = now;
      }
    }
    this.previousEnergy = lowFreqAverage;

    return {
      frequencyAverage: Math.min(255, Math.max(0, frequencyAverage)),
      isBeat
    };
  }

  start(): void {
    if (this.audioElement) {
      this.audioElement.play();
    }
  }

  stop(): void {
    if (this.audioElement) {
      this.audioElement.pause();
      this.audioElement.currentTime = 0;
    }
  }

  private cleanup(): void {
    if (this.audioElement) {
      this.audioElement.pause();
      if (this.audioElement.src) {
        URL.revokeObjectURL(this.audioElement.src);
      }
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
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    this.frequencyData = null;
  }

  dispose(): void {
    this.cleanup();
  }
}
