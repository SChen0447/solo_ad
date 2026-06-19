import { SpectrumAnalyzer } from './SpectrumAnalyzer';

export type SpectrumCallback = (spectrum: number[]) => void;

export class AudioLoader {
  private audioContext: AudioContext | null = null;
  private spectrumAnalyzer: SpectrumAnalyzer | null = null;
  private audioBuffer: AudioBuffer | null = null;
  private gainNode: GainNode | null = null;
  private animationFrameId: number | null = null;
  private spectrumCallback: SpectrumCallback | null = null;
  private fileName: string = '';

  constructor() {}

  setSpectrumCallback(callback: SpectrumCallback): void {
    this.spectrumCallback = callback;
  }

  async loadFile(file: File): Promise<void> {
    this.unload();
    this.fileName = file.name;

    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }

    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }

    const arrayBuffer = await file.arrayBuffer();
    this.audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);

    this.spectrumAnalyzer = new SpectrumAnalyzer(this.audioContext);
    this.gainNode = this.audioContext.createGain();
    this.gainNode.gain.value = 0.7;

    this.gainNode.connect(this.audioContext.destination);

    this.startAnalysisLoop();
  }

  getAudioContext(): AudioContext | null {
    return this.audioContext;
  }

  getAudioBuffer(): AudioBuffer | null {
    return this.audioBuffer;
  }

  getSpectrumAnalyzer(): SpectrumAnalyzer | null {
    return this.spectrumAnalyzer;
  }

  getGainNode(): GainNode | null {
    return this.gainNode;
  }

  getFileName(): string {
    return this.fileName;
  }

  getDuration(): number {
    return this.audioBuffer?.duration || 0;
  }

  private startAnalysisLoop(): void {
    const analyze = () => {
      if (this.spectrumAnalyzer && this.spectrumCallback) {
        const spectrum = this.spectrumAnalyzer.getSpectrum();
        this.spectrumCallback(spectrum);
      }
      this.animationFrameId = requestAnimationFrame(analyze);
    };
    analyze();
  }

  unload(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    this.audioBuffer = null;
    this.spectrumAnalyzer = null;
    this.gainNode = null;
  }

  dispose(): void {
    this.unload();
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }
}
