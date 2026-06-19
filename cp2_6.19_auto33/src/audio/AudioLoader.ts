import { SpectrumAnalyzer } from './SpectrumAnalyzer';

export type SpectrumCallback = (spectrum: number[]) => void;
export type AudioInfoCallback = (info: { name: string; duration: number; currentTime: number; isPlaying: boolean }) => void;

export class AudioLoader {
  private audioContext: AudioContext | null = null;
  private source: AudioBufferSourceNode | null = null;
  private gainNode: GainNode | null = null;
  private spectrumAnalyzer: SpectrumAnalyzer | null = null;
  private audioBuffer: AudioBuffer | null = null;
  private isPlaying: boolean = false;
  private startTime: number = 0;
  private pausedAt: number = 0;
  private animationFrameId: number | null = null;
  private spectrumCallback: SpectrumCallback | null = null;
  private audioInfoCallback: AudioInfoCallback | null = null;
  private fileName: string = '';

  constructor() {}

  setSpectrumCallback(callback: SpectrumCallback): void {
    this.spectrumCallback = callback;
  }

  setAudioInfoCallback(callback: AudioInfoCallback): void {
    this.audioInfoCallback = callback;
  }

  async loadFile(file: File): Promise<void> {
    this.stop();
    this.fileName = file.name;

    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }

    const arrayBuffer = await file.arrayBuffer();
    this.audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);

    this.spectrumAnalyzer = new SpectrumAnalyzer(this.audioContext);

    this.gainNode = this.audioContext.createGain();
    this.gainNode.gain.value = 0.7;

    this.connectAndPlay();
    this.startAnalysisLoop();
  }

  private connectAndPlay(): void {
    if (!this.audioContext || !this.audioBuffer || !this.spectrumAnalyzer || !this.gainNode) {
      return;
    }

    this.source = this.audioContext.createBufferSource();
    this.source.buffer = this.audioBuffer;
    this.source.connect(this.spectrumAnalyzer.getAnalyserNode());
    this.spectrumAnalyzer.getAnalyserNode().connect(this.gainNode);
    this.gainNode.connect(this.audioContext.destination);

    this.source.onended = () => {
      if (this.isPlaying) {
        this.isPlaying = false;
        this.pausedAt = 0;
        this.notifyAudioInfo();
      }
    };

    const offset = this.pausedAt;
    this.startTime = this.audioContext.currentTime - offset;
    this.source.start(0, offset);
    this.isPlaying = true;
    this.notifyAudioInfo();
  }

  private startAnalysisLoop(): void {
    const analyze = () => {
      if (this.spectrumAnalyzer && this.spectrumCallback) {
        const spectrum = this.spectrumAnalyzer.getSpectrum();
        this.spectrumCallback(spectrum);
      }
      this.notifyAudioInfo();
      this.animationFrameId = requestAnimationFrame(analyze);
    };
    analyze();
  }

  play(): void {
    if (!this.isPlaying && this.audioBuffer) {
      this.connectAndPlay();
    }
  }

  pause(): void {
    if (this.isPlaying && this.source && this.audioContext) {
      this.pausedAt = this.audioContext.currentTime - this.startTime;
      this.source.stop();
      this.source.disconnect();
      this.isPlaying = false;
      this.notifyAudioInfo();
    }
  }

  stop(): void {
    if (this.source) {
      try {
        this.source.stop();
        this.source.disconnect();
      } catch (e) {}
      this.source = null;
    }

    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    this.isPlaying = false;
    this.pausedAt = 0;
    this.audioBuffer = null;
  }

  seek(time: number): void {
    if (!this.audioBuffer) return;

    const wasPlaying = this.isPlaying;
    
    if (this.source) {
      try {
        this.source.stop();
        this.source.disconnect();
      } catch (e) {}
    }

    this.pausedAt = Math.max(0, Math.min(time, this.audioBuffer.duration));

    if (wasPlaying) {
      this.connectAndPlay();
    } else {
      this.notifyAudioInfo();
    }
  }

  getCurrentTime(): number {
    if (!this.audioContext || !this.isPlaying) {
      return this.pausedAt;
    }
    return this.audioContext.currentTime - this.startTime;
  }

  getDuration(): number {
    return this.audioBuffer?.duration || 0;
  }

  getIsPlaying(): boolean {
    return this.isPlaying;
  }

  private notifyAudioInfo(): void {
    if (this.audioInfoCallback) {
      this.audioInfoCallback({
        name: this.fileName,
        duration: this.getDuration(),
        currentTime: this.getCurrentTime(),
        isPlaying: this.isPlaying
      });
    }
  }

  getSpectrumAnalyzer(): SpectrumAnalyzer | null {
    return this.spectrumAnalyzer;
  }

  dispose(): void {
    this.stop();
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }
}
