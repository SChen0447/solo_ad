export class AudioAnalyzer {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private microphone: MediaStreamAudioSourceNode | null = null;
  private stream: MediaStream | null = null;
  private waveformData: Float32Array | null = null;
  private frequencyData: Uint8Array | null = null;
  private _isInitialized = false;
  private _isRunning = false;
  private fftSize = 2048;
  private smoothingTimeConstant = 0.8;

  get isInitialized(): boolean {
    return this._isInitialized;
  }

  get isRunning(): boolean {
    return this._isRunning;
  }

  async init(): Promise<void> {
    if (this._isInitialized) return;

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });

      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = this.fftSize;
      this.analyser.smoothingTimeConstant = this.smoothingTimeConstant;

      this.microphone = this.audioContext.createMediaStreamSource(this.stream);
      this.microphone.connect(this.analyser);

      this.waveformData = new Float32Array(this.analyser.fftSize);
      this.frequencyData = new Uint8Array(this.analyser.frequencyBinCount);

      this._isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize audio analyzer:', error);
      throw error;
    }
  }

  start(): void {
    if (!this._isInitialized || !this.audioContext) return;
    
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
    this._isRunning = true;
  }

  stop(): void {
    this._isRunning = false;
  }

  getWaveform(): Float32Array {
    if (!this.analyser || !this.waveformData || !this._isRunning) {
      return new Float32Array(this.fftSize);
    }
    this.analyser.getFloatTimeDomainData(this.waveformData);
    return this.waveformData;
  }

  getFrequency(): Uint8Array {
    if (!this.analyser || !this.frequencyData || !this._isRunning) {
      return new Uint8Array(this.fftSize / 2);
    }
    this.analyser.getByteFrequencyData(this.frequencyData);
    return this.frequencyData;
  }

  getFrequencyBinCount(): number {
    return this.analyser?.frequencyBinCount || 0;
  }

  setSmoothing(value: number): void {
    if (this.analyser) {
      this.analyser.smoothingTimeConstant = Math.max(0, Math.min(1, value));
    }
  }

  setFFTSize(size: number): void {
    if (this.analyser) {
      this.analyser.fftSize = size;
      this.waveformData = new Float32Array(size);
      this.frequencyData = new Uint8Array(this.analyser.frequencyBinCount);
    }
  }

  destroy(): void {
    this._isRunning = false;
    this._isInitialized = false;

    if (this.microphone) {
      this.microphone.disconnect();
      this.microphone = null;
    }

    if (this.analyser) {
      this.analyser.disconnect();
      this.analyser = null;
    }

    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    this.waveformData = null;
    this.frequencyData = null;
  }
}

export const audioAnalyzer = new AudioAnalyzer();
