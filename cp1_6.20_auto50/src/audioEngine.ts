export interface AudioEngineState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  sampleRate: number;
  fileName: string;
  volume: number;
  pcmData: Float32Array | null;
  frequencyData: Uint8Array | null;
  timeDomainData: Uint8Array | null;
}

export type AudioEngineCallback = (state: AudioEngineState) => void;

const FFT_SIZE = 256;
const MAX_FILE_SIZE = 50 * 1024 * 1024;

class AudioEngine {
  private audioContext: AudioContext | null = null;
  private analyserNode: AnalyserNode | null = null;
  private gainNode: GainNode | null = null;
  private sourceNode: AudioBufferSourceNode | null = null;
  private audioBuffer: AudioBuffer | null = null;
  private pcmData: Float32Array | null = null;
  private frequencyData: Uint8Array<ArrayBuffer> | null = null;
  private timeDomainData: Uint8Array<ArrayBuffer> | null = null;
  private _isPlaying: boolean = false;
  private _startTime: number = 0;
  private _pauseOffset: number = 0;
  private _volume: number = 1;
  private _duration: number = 0;
  private _sampleRate: number = 0;
  private _fileName: string = '';
  private animFrameId: number = 0;
  private callback: AudioEngineCallback | null = null;
  private worker: Worker | null = null;

  get isPlaying(): boolean {
    return this._isPlaying;
  }

  get duration(): number {
    return this._duration;
  }

  get currentTime(): number {
    if (!this.audioContext || !this._isPlaying) return this._pauseOffset;
    return this.audioContext.currentTime - this._startTime + this._pauseOffset;
  }

  get sampleRate(): number {
    return this._sampleRate;
  }

  get fileName(): string {
    return this._fileName;
  }

  get volume(): number {
    return this._volume;
  }

  onStateChange(cb: AudioEngineCallback): void {
    this.callback = cb;
  }

  private notify(): void {
    if (!this.callback) return;
    this.callback({
      isPlaying: this._isPlaying,
      currentTime: this.currentTime,
      duration: this._duration,
      sampleRate: this._sampleRate,
      fileName: this._fileName,
      volume: this._volume,
      pcmData: this.pcmData,
      frequencyData: this.frequencyData,
      timeDomainData: this.timeDomainData,
    });
  }

  private initContext(): void {
    if (!this.audioContext) {
      this.audioContext = new AudioContext();
    }
    if (!this.analyserNode) {
      this.analyserNode = this.audioContext.createAnalyser();
      this.analyserNode.fftSize = FFT_SIZE * 2;
      this.analyserNode.smoothingTimeConstant = 0.8;
      this.frequencyData = new Uint8Array(new ArrayBuffer(this.analyserNode.frequencyBinCount));
      this.timeDomainData = new Uint8Array(new ArrayBuffer(this.analyserNode.frequencyBinCount));
    }
    if (!this.gainNode) {
      this.gainNode = this.audioContext.createGain();
      this.gainNode.gain.value = this._volume;
      this.gainNode.connect(this.audioContext.destination);
    }
  }

  private initWorker(): void {
    if (this.worker) return;
    const workerCode = `
      self.onmessage = function(e) {
        const { pcmData, sampleRate, fftSize } = e.data;
        const channelData = pcmData;
        const step = Math.floor(sampleRate / 60);
        const results = [];
        for (let i = 0; i < channelData.length; i += step) {
          const slice = channelData.subarray(i, Math.min(i + fftSize, channelData.length));
          let sum = 0;
          for (let j = 0; j < slice.length; j++) {
            sum += slice[j] * slice[j];
          }
          const rms = Math.sqrt(sum / slice.length);
          results.push(rms);
        }
        self.postMessage({ energyProfile: results });
      };
    `;
    const blob = new Blob([workerCode], { type: 'application/javascript' });
    this.worker = new Worker(URL.createObjectURL(blob));
  }

  async loadFile(file: File): Promise<void> {
    if (file.size > MAX_FILE_SIZE) {
      throw new Error('File size exceeds 50MB limit');
    }
    const ext = file.name.toLowerCase();
    if (!ext.endsWith('.wav') && !ext.endsWith('.mp3')) {
      throw new Error('Only WAV and MP3 files are supported');
    }

    this.initContext();
    this.initWorker();

    if (this._isPlaying) {
      this.stop();
    }

    const arrayBuffer = await file.arrayBuffer();
    this.audioBuffer = await this.audioContext!.decodeAudioData(arrayBuffer);
    this._duration = this.audioBuffer.duration;
    this._sampleRate = this.audioBuffer.sampleRate;
    this._fileName = file.name;
    this._pauseOffset = 0;

    const channelData = this.audioBuffer.getChannelData(0);
    this.pcmData = new Float32Array(channelData);

    this.worker!.postMessage({
      pcmData: this.pcmData,
      sampleRate: this._sampleRate,
      fftSize: FFT_SIZE,
    });

    this.notify();
  }

  play(): void {
    if (!this.audioBuffer || !this.audioContext || !this.analyserNode || !this.gainNode) return;

    if (this.sourceNode) {
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }

    this.sourceNode = this.audioContext.createBufferSource();
    this.sourceNode.buffer = this.audioBuffer;
    this.sourceNode.connect(this.analyserNode);
    this.analyserNode.connect(this.gainNode);

    const offset = this._pauseOffset;
    this.sourceNode.start(0, offset);
    this._startTime = this.audioContext.currentTime;
    this._isPlaying = true;

    this.sourceNode.onended = () => {
      if (this._isPlaying) {
        this._isPlaying = false;
        this._pauseOffset = 0;
        this.notify();
      }
    };

    this.startLoop();
    this.notify();
  }

  pause(): void {
    if (!this._isPlaying || !this.audioContext) return;
    this._pauseOffset = this.currentTime;
    this._isPlaying = false;
    if (this.sourceNode) {
      this.sourceNode.onended = null;
      this.sourceNode.stop();
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }
    cancelAnimationFrame(this.animFrameId);
    this.notify();
  }

  stop(): void {
    this._isPlaying = false;
    this._pauseOffset = 0;
    if (this.sourceNode) {
      this.sourceNode.onended = null;
      try { this.sourceNode.stop(); } catch (_) { /* ignore */ }
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }
    cancelAnimationFrame(this.animFrameId);
    this.notify();
  }

  togglePlay(): void {
    if (this._isPlaying) {
      this.pause();
    } else {
      this.play();
    }
  }

  seek(time: number): void {
    if (!this.audioBuffer) return;
    const wasPlaying = this._isPlaying;
    if (wasPlaying) {
      if (this.sourceNode) {
        this.sourceNode.onended = null;
        try { this.sourceNode.stop(); } catch (_) { /* ignore */ }
        this.sourceNode.disconnect();
        this.sourceNode = null;
      }
      this._isPlaying = false;
      cancelAnimationFrame(this.animFrameId);
    }
    this._pauseOffset = Math.max(0, Math.min(time, this._duration));
    if (wasPlaying) {
      this.play();
    } else {
      this.notify();
    }
  }

  seekRelative(delta: number): void {
    this.seek(this.currentTime + delta);
  }

  setVolume(v: number): void {
    this._volume = Math.max(0, Math.min(1, v));
    if (this.gainNode) {
      this.gainNode.gain.value = this._volume;
    }
    this.notify();
  }

  getFrequencyData(): Uint8Array<ArrayBuffer> | null {
    if (!this.analyserNode || !this.frequencyData) return null;
    this.analyserNode.getByteFrequencyData(this.frequencyData);
    return this.frequencyData;
  }

  getTimeDomainData(): Uint8Array<ArrayBuffer> | null {
    if (!this.analyserNode || !this.timeDomainData) return null;
    this.analyserNode.getByteTimeDomainData(this.timeDomainData);
    return this.timeDomainData;
  }

  private startLoop(): void {
    const loop = () => {
      if (!this._isPlaying) return;
      this.getFrequencyData();
      this.getTimeDomainData();
      this.notify();
      this.animFrameId = requestAnimationFrame(loop);
    };
    this.animFrameId = requestAnimationFrame(loop);
  }

  destroy(): void {
    this.stop();
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    this.analyserNode = null;
    this.gainNode = null;
    this.audioBuffer = null;
    this.pcmData = null;
    this.frequencyData = null;
    this.timeDomainData = null;
  }
}

export const audioEngine = new AudioEngine();
