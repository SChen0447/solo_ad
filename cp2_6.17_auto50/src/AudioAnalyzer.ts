export interface AudioAnalysisData {
  frequencyData: Uint8Array<ArrayBuffer>;
  timeDomainData: Uint8Array<ArrayBuffer>;
  lowFrequency: number;
  midFrequency: number;
  highFrequency: number;
  averageFrequency: number;
}

type AnalysisCallback = (data: AudioAnalysisData) => void;

export class AudioAnalyzer {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private source: AudioBufferSourceNode | null = null;
  private audioBuffer: AudioBuffer | null = null;
  private frequencyData: Uint8Array<ArrayBuffer> | null = null;
  private timeDomainData: Uint8Array<ArrayBuffer> | null = null;
  private animationId: number | null = null;
  private isPlaying: boolean = false;
  private onAnalyze: AnalysisCallback;
  private onEnded: (() => void) | null = null;
  private startTime: number = 0;
  private pausedAt: number = 0;

  constructor(onAnalyze: AnalysisCallback) {
    this.onAnalyze = onAnalyze;
  }

  async loadFile(file: File): Promise<void> {
    this.cleanup();

    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 2048;
    this.analyser.smoothingTimeConstant = 0.8;

    const bufferLength = this.analyser.frequencyBinCount;
    this.frequencyData = new Uint8Array(new ArrayBuffer(bufferLength));
    this.timeDomainData = new Uint8Array(new ArrayBuffer(bufferLength));

    const arrayBuffer = await file.arrayBuffer();
    try {
      this.audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
    } catch (e) {
      this.cleanup();
      throw e;
    }
  }

  play(): void {
    if (!this.audioContext || !this.audioBuffer || !this.analyser) return;

    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }

    this.stopSource();

    this.source = this.audioContext.createBufferSource();
    this.source.buffer = this.audioBuffer;
    this.source.connect(this.analyser);
    this.analyser.connect(this.audioContext.destination);

    this.source.onended = () => {
      if (this.isPlaying) {
        this.isPlaying = false;
        this.stopSource();
        if (this.onEnded) this.onEnded();
      }
    };

    this.startTime = this.audioContext.currentTime - this.pausedAt;
    this.source.start(0, this.pausedAt);
    this.isPlaying = true;

    this.animate();
  }

  private stopSource(): void {
    if (this.source) {
      try {
        this.source.onended = null;
        this.source.stop();
      } catch (e) {
      }
      try {
        this.source.disconnect();
      } catch (e) {
      }
      this.source = null;
    }
  }

  pause(): void {
    if (!this.source || !this.audioContext || !this.isPlaying) return;

    this.pausedAt = this.audioContext.currentTime - this.startTime;
    this.stopSource();
    this.isPlaying = false;

    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  togglePlay(): void {
    if (this.isPlaying) {
      this.pause();
    } else {
      this.play();
    }
  }

  getIsPlaying(): boolean {
    return this.isPlaying;
  }

  setOnEnded(callback: () => void): void {
    this.onEnded = callback;
  }

  private animate = (): void => {
    if (!this.isPlaying || !this.analyser || !this.frequencyData || !this.timeDomainData) return;

    this.analyser.getByteFrequencyData(this.frequencyData);
    this.analyser.getByteTimeDomainData(this.timeDomainData);

    const sampleRate = this.audioContext?.sampleRate || 44100;
    const nyquist = sampleRate / 2;
    const binCount = this.frequencyData.length;

    const lowEnd = Math.floor((200 / nyquist) * binCount);
    const midEnd = Math.floor((2000 / nyquist) * binCount);
    const highEnd = Math.floor((8000 / nyquist) * binCount);

    let lowSum = 0;
    for (let i = 0; i < lowEnd && i < binCount; i++) {
      lowSum += this.frequencyData[i];
    }
    const lowFrequency = lowSum / Math.max(lowEnd, 1) / 255;

    let midSum = 0;
    for (let i = lowEnd; i < midEnd && i < binCount; i++) {
      midSum += this.frequencyData[i];
    }
    const midFrequency = midSum / Math.max(midEnd - lowEnd, 1) / 255;

    let highSum = 0;
    for (let i = midEnd; i < highEnd && i < binCount; i++) {
      highSum += this.frequencyData[i];
    }
    const highFrequency = highSum / Math.max(highEnd - midEnd, 1) / 255;

    let totalSum = 0;
    for (let i = 0; i < binCount; i++) {
      totalSum += this.frequencyData[i];
    }
    const averageFrequency = totalSum / binCount / 255;

    this.onAnalyze({
      frequencyData: this.frequencyData,
      timeDomainData: this.timeDomainData,
      lowFrequency,
      midFrequency,
      highFrequency,
      averageFrequency,
    });

    this.animationId = requestAnimationFrame(this.animate);
  };

  cleanup(): void {
    this.pause();
    this.stopSource();

    if (this.analyser) {
      try {
        this.analyser.disconnect();
      } catch (e) {
      }
      this.analyser = null;
    }

    if (this.audioContext) {
      try {
        this.audioContext.close();
      } catch (e) {
      }
      this.audioContext = null;
    }

    this.audioBuffer = null;
    this.frequencyData = null;
    this.timeDomainData = null;
    this.pausedAt = 0;
  }
}
