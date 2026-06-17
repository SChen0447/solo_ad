export interface AudioAnalysisData {
  frequencyData: Uint8Array;
  timeDomainData: Uint8Array;
  lowFrequency: number;
  midFrequency: number;
  highFrequency: number;
  averageSpectrum: number;
}

export type AnalysisCallback = (data: AudioAnalysisData) => void;

const FFT_SIZE = 2048;
const SAMPLE_RATE = 44100;
const BIN_SIZE = SAMPLE_RATE / FFT_SIZE;

const LOW_FREQ_START = 0;
const LOW_FREQ_END = 200;
const MID_FREQ_START = 200;
const MID_FREQ_END = 2000;
const HIGH_FREQ_START = 2000;
const HIGH_FREQ_END = 8000;

const freqToBin = (freq: number): number => Math.floor(freq / BIN_SIZE);

export class AudioAnalyzer {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private source: AudioBufferSourceNode | MediaElementAudioSourceNode | null = null;
  private audioBuffer: AudioBuffer | null = null;
  private frequencyData: Uint8Array;
  private timeDomainData: Uint8Array;
  private animationId: number | null = null;
  private onAnalysis: AnalysisCallback;
  private _isPlaying = false;
  private _fileName = '';
  private startTime = 0;
  private pausedAt = 0;

  constructor(onAnalysis: AnalysisCallback) {
    this.onAnalysis = onAnalysis;
    this.frequencyData = new Uint8Array(FFT_SIZE / 2);
    this.timeDomainData = new Uint8Array(FFT_SIZE / 2);
  }

  get isPlaying(): boolean {
    return this._isPlaying;
  }

  get fileName(): string {
    return this._fileName;
  }

  async loadFile(file: File): Promise<void> {
    this.stop();
    this.disposeContext();

    const validTypes = ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp3'];
    const validExtensions = ['.mp3', '.wav', '.ogg'];
    const isValidType = validTypes.includes(file.type) ||
      validExtensions.some(ext => file.name.toLowerCase().endsWith(ext));

    if (!isValidType) {
      throw new Error('Unsupported audio format. Please upload mp3, wav, or ogg files.');
    }

    if (file.size > 30 * 1024 * 1024) {
      throw new Error('File size exceeds 30MB limit.');
    }

    this._fileName = file.name;

    this.audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = FFT_SIZE;
    this.analyser.smoothingTimeConstant = 0.8;

    const arrayBuffer = await file.arrayBuffer();
    this.audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);

    this.frequencyData = new Uint8Array(this.analyser.frequencyBinCount);
    this.timeDomainData = new Uint8Array(this.analyser.frequencyBinCount);
  }

  play(): void {
    if (!this.audioContext || !this.analyser || !this.audioBuffer) return;

    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }

    if (this.source) {
      this.source.disconnect();
    }

    const source = this.audioContext.createBufferSource();
    source.buffer = this.audioBuffer;
    source.connect(this.analyser);
    this.analyser.connect(this.audioContext.destination);

    const offset = this.pausedAt;
    source.start(0, offset);
    this.startTime = this.audioContext.currentTime - offset;
    this.source = source;

    source.onended = () => {
      if (this._isPlaying) {
        this._isPlaying = false;
        this.pausedAt = 0;
      }
    };

    this._isPlaying = true;
    this.startAnalysisLoop();
  }

  pause(): void {
    if (!this.audioContext || !this.source) return;

    this.pausedAt = this.audioContext.currentTime - this.startTime;
    this.source.stop();
    this.source.disconnect();
    this.source = null;
    this._isPlaying = false;
    this.stopAnalysisLoop();
  }

  stop(): void {
    if (this.source) {
      try {
        this.source.stop();
      } catch {
        // ignore
      }
      this.source.disconnect();
      this.source = null;
    }
    this._isPlaying = false;
    this.pausedAt = 0;
    this.stopAnalysisLoop();
  }

  private startAnalysisLoop(): void {
    const analyze = () => {
      if (!this.analyser) return;

      this.analyser.getByteFrequencyData(this.frequencyData);
      this.analyser.getByteTimeDomainData(this.timeDomainData);

      const lowBinStart = freqToBin(LOW_FREQ_START);
      const lowBinEnd = Math.min(freqToBin(LOW_FREQ_END), this.frequencyData.length - 1);
      const midBinStart = freqToBin(MID_FREQ_START);
      const midBinEnd = Math.min(freqToBin(MID_FREQ_END), this.frequencyData.length - 1);
      const highBinStart = freqToBin(HIGH_FREQ_START);
      const highBinEnd = Math.min(freqToBin(HIGH_FREQ_END), this.frequencyData.length - 1);

      const lowFrequency = this.averageRange(this.frequencyData, lowBinStart, lowBinEnd) / 255;
      const midFrequency = this.averageRange(this.frequencyData, midBinStart, midBinEnd) / 255;
      const highFrequency = this.averageRange(this.frequencyData, highBinStart, highBinEnd) / 255;
      const averageSpectrum = this.averageRange(this.frequencyData, 0, this.frequencyData.length - 1) / 255;

      this.onAnalysis({
        frequencyData: this.frequencyData,
        timeDomainData: this.timeDomainData,
        lowFrequency,
        midFrequency,
        highFrequency,
        averageSpectrum,
      });

      if (this._isPlaying) {
        this.animationId = requestAnimationFrame(analyze);
      }
    };

    analyze();
  }

  private stopAnalysisLoop(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  private averageRange(data: Uint8Array, start: number, end: number): number {
    if (start > end) return 0;
    let sum = 0;
    for (let i = start; i <= end; i++) {
      sum += data[i];
    }
    return sum / (end - start + 1);
  }

  private disposeContext(): void {
    this.stopAnalysisLoop();
    if (this.source) {
      try {
        this.source.stop();
      } catch {
        // ignore
      }
      this.source.disconnect();
      this.source = null;
    }
    if (this.analyser) {
      this.analyser.disconnect();
      this.analyser = null;
    }
    if (this.audioContext) {
      this.audioContext.close().catch(() => {
        // ignore
      });
      this.audioContext = null;
    }
    this.audioBuffer = null;
  }

  dispose(): void {
    this.disposeContext();
    this._fileName = '';
    this._isPlaying = false;
  }
}
