export type InputSource = 'microphone' | 'file' | 'none';

export interface AudioFileInfo {
  name: string;
  duration: number;
  sampleRate: number;
}

export interface AudioData {
  timeDomain: Float32Array;
  frequency: Uint8Array;
  peakFrequency: number;
  peakAmplitude: number;
  averageLoudness: number;
}

export interface AudioEngineCallbacks {
  onData?: (data: AudioData) => void;
  onSourceChange?: (source: InputSource) => void;
  onFileInfo?: (info: AudioFileInfo) => void;
  onError?: (error: string) => void;
}

export class AudioEngine {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private mediaStreamSource: MediaStreamAudioSourceNode | null = null;
  private audioElement: HTMLAudioElement | null = null;
  private mediaElementSource: MediaElementAudioSourceNode | null = null;
  private gainNode: GainNode | null = null;
  private animationFrameId: number | null = null;
  private currentSource: InputSource = 'none';
  private isRunning: boolean = false;
  private callbacks: AudioEngineCallbacks;
  private fftSize: number = 512;
  private timeDomainData: Float32Array<ArrayBuffer>;
  private frequencyData: Uint8Array<ArrayBuffer>;

  constructor(callbacks: AudioEngineCallbacks = {}) {
    this.callbacks = callbacks;
    this.timeDomainData = new Float32Array(this.fftSize) as Float32Array<ArrayBuffer>;
    this.frequencyData = new Uint8Array(this.fftSize / 2) as Uint8Array<ArrayBuffer>;
  }

  async init(): Promise<void> {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = this.fftSize;
      this.analyser.smoothingTimeConstant = 0.8;
      this.gainNode = this.audioContext.createGain();
      this.gainNode.gain.value = 1;
      this.analyser.connect(this.gainNode);
      this.gainNode.connect(this.audioContext.destination);
    }
  }

  async switchToMicrophone(): Promise<void> {
    try {
      await this.cleanupCurrentSource();
      await this.init();

      if (!this.audioContext || !this.analyser) {
        throw new Error('AudioContext not initialized');
      }

      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.mediaStreamSource = this.audioContext.createMediaStreamSource(stream);
      this.mediaStreamSource.connect(this.analyser);
      this.currentSource = 'microphone';
      this.isRunning = true;
      this.startAnalysisLoop();
      this.callbacks.onSourceChange?.('microphone');
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : '无法访问麦克风';
      this.callbacks.onError?.(errorMsg);
      throw error;
    }
  }

  async loadAudioFile(file: File): Promise<void> {
    try {
      await this.cleanupCurrentSource();
      await this.init();

      if (!this.audioContext || !this.analyser) {
        throw new Error('AudioContext not initialized');
      }

      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      const url = URL.createObjectURL(file);
      this.audioElement = new Audio(url);
      this.audioElement.crossOrigin = 'anonymous';
      this.audioElement.loop = true;

      const audioContext = this.audioContext;
      await new Promise<void>((resolve, reject) => {
        if (!this.audioElement) return reject();
        this.audioElement.onloadedmetadata = () => {
          this.mediaElementSource = audioContext.createMediaElementSource(this.audioElement!);
          this.mediaElementSource.connect(this.analyser!);
          resolve();
        };
        this.audioElement.onerror = reject;
      });

      const fileInfo: AudioFileInfo = {
        name: file.name,
        duration: this.audioElement.duration,
        sampleRate: this.audioContext.sampleRate
      };

      this.callbacks.onFileInfo?.(fileInfo);
      this.currentSource = 'file';
      await this.audioElement.play();
      this.isRunning = true;
      this.startAnalysisLoop();
      this.callbacks.onSourceChange?.('file');
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : '无法加载音频文件';
      this.callbacks.onError?.(errorMsg);
      throw error;
    }
  }

  private startAnalysisLoop(): void {
    const analyze = () => {
      if (!this.isRunning || !this.analyser) return;

      this.analyser.getFloatTimeDomainData(this.timeDomainData);
      this.analyser.getByteFrequencyData(this.frequencyData);

      let peakFreq = 0;
      let peakAmp = 0;
      let totalLoudness = 0;

      for (let i = 0; i < this.frequencyData.length; i++) {
        const amplitude = this.frequencyData[i];
        totalLoudness += amplitude;
        if (amplitude > peakAmp) {
          peakAmp = amplitude;
          peakFreq = i;
        }
      }

      const sampleRate = this.audioContext?.sampleRate || 44100;
      const nyquist = sampleRate / 2;
      const frequencyHz = (peakFreq * nyquist) / this.frequencyData.length;
      const amplitudeDb = 20 * Math.log10(peakAmp / 255 || 0.001);
      const avgLoudness = totalLoudness / this.frequencyData.length / 255;

      const audioData: AudioData = {
        timeDomain: new Float32Array(this.timeDomainData),
        frequency: new Uint8Array(this.frequencyData),
        peakFrequency: Math.round(frequencyHz),
        peakAmplitude: Math.round(amplitudeDb * 10) / 10,
        averageLoudness: Math.round(avgLoudness * 100) / 100
      };

      this.callbacks.onData?.(audioData);
      this.animationFrameId = requestAnimationFrame(analyze);
    };

    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
    analyze();
  }

  pause(): void {
    if (this.audioElement) {
      this.audioElement.pause();
    }
    this.isRunning = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  async resume(): Promise<void> {
    if (this.audioContext?.state === 'suspended') {
      await this.audioContext.resume();
    }
    if (this.audioElement && this.currentSource === 'file') {
      await this.audioElement.play();
    }
    this.isRunning = true;
    this.startAnalysisLoop();
  }

  private async cleanupCurrentSource(): Promise<void> {
    this.isRunning = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    if (this.mediaStreamSource) {
      try {
        this.mediaStreamSource.disconnect();
        const stream = this.mediaStreamSource.mediaStream;
        stream.getTracks().forEach(track => track.stop());
      } catch (e) {}
      this.mediaStreamSource = null;
    }

    if (this.mediaElementSource) {
      try {
        this.mediaElementSource.disconnect();
      } catch (e) {}
      this.mediaElementSource = null;
    }

    if (this.audioElement) {
      this.audioElement.pause();
      this.audioElement.src = '';
      this.audioElement = null;
    }

    this.currentSource = 'none';
    this.callbacks.onSourceChange?.('none');
  }

  async stop(): Promise<void> {
    await this.cleanupCurrentSource();
  }

  getCurrentSource(): InputSource {
    return this.currentSource;
  }

  getFftSize(): number {
    return this.fftSize;
  }

  setFftSize(size: number): void {
    this.fftSize = size;
    if (this.analyser) {
      this.analyser.fftSize = size;
    }
    this.timeDomainData = new Float32Array(size) as Float32Array<ArrayBuffer>;
    this.frequencyData = new Uint8Array(size / 2) as Uint8Array<ArrayBuffer>;
  }

  async destroy(): Promise<void> {
    await this.cleanupCurrentSource();
    if (this.gainNode) {
      this.gainNode.disconnect();
      this.gainNode = null;
    }
    if (this.analyser) {
      this.analyser.disconnect();
      this.analyser = null;
    }
    if (this.audioContext) {
      await this.audioContext.close();
      this.audioContext = null;
    }
  }
}
