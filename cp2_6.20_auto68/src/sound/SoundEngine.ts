export interface SoundData {
  frequency: number;
  volume: number;
  waveform: Float32Array;
}

export interface CalibrationResult {
  baseFrequency: number;
  frequencyRange: number;
}

export class SoundEngine {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private dataArray: Uint8Array | null = null;
  private floatArray: Float32Array | null = null;
  private stream: MediaStream | null = null;
  private source: MediaStreamAudioSourceNode | null = null;

  private calibrating = false;
  private calibrationSamples: number[] = [];
  private calibrationStartTime = 0;
  private calibrationDuration = 5000;
  private calibrationComplete = false;
  private _calibrationResult: CalibrationResult = { baseFrequency: 200, frequencyRange: 200 };

  private _currentFrequency = 0;
  private _currentVolume = 0;
  private _currentWaveform: Float32Array = new Float32Array(0);

  async init(): Promise<void> {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    this.audioContext = new AudioCtx();

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false } as any);
    }

    this.source = this.audioContext.createMediaStreamSource(this.stream);

    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 2048;
    this.analyser.smoothingTimeConstant = 0.8;

    this.source.connect(this.analyser);

    const bufferLength = this.analyser.frequencyBinCount;
    this.dataArray = new Uint8Array(bufferLength);
    this.floatArray = new Float32Array(bufferLength);
    this._currentWaveform = new Float32Array(128);
  }

  startCalibration(): void {
    this.calibrating = true;
    this.calibrationSamples = [];
    this.calibrationStartTime = performance.now();
    this.calibrationComplete = false;
  }

  update(): void {
    if (!this.analyser || !this.dataArray || !this.floatArray) return;

    this.analyser.getByteFrequencyData(this.dataArray);
    this.analyser.getFloatTimeDomainData(this.floatArray);

    this._currentFrequency = this.detectFrequency();
    this._currentVolume = this.calculateVolume();
    this._currentWaveform = this.extractWaveform();

    if (this.calibrating && !this.calibrationComplete) {
      if (this._currentVolume > 0.05) {
        this.calibrationSamples.push(this._currentFrequency);
      }

      const elapsed = performance.now() - this.calibrationStartTime;
      if (elapsed >= this.calibrationDuration) {
        this.finishCalibration();
      }
    }
  }

  getSoundData(): SoundData {
    return {
      frequency: this._currentFrequency,
      volume: this._currentVolume,
      waveform: this._currentWaveform
    };
  }

  isCalibrating(): boolean {
    return this.calibrating;
  }

  isCalibrationComplete(): boolean {
    return this.calibrationComplete;
  }

  getCalibrationProgress(): number {
    if (!this.calibrating) return 0;
    return Math.min(1, (performance.now() - this.calibrationStartTime) / this.calibrationDuration);
  }

  getCalibrationResult(): CalibrationResult {
    return this._calibrationResult;
  }

  getCalibratedFrequency(): number {
    return this._currentFrequency - this._calibrationResult.baseFrequency + 200;
  }

  private detectFrequency(): number {
    if (!this.analyser || !this.dataArray) return 0;

    const sampleRate = this.audioContext!.sampleRate;
    const binCount = this.analyser.frequencyBinCount;
    const frequencyResolution = sampleRate / (binCount * 2);

    let maxVal = 0;
    let maxIndex = 0;

    for (let i = 1; i < binCount; i++) {
      if (this.dataArray[i] > maxVal) {
        maxVal = this.dataArray[i];
        maxIndex = i;
      }
    }

    if (maxVal < 20) return 0;

    return maxIndex * frequencyResolution;
  }

  private calculateVolume(): number {
    if (!this.floatArray) return 0;

    let sum = 0;
    for (let i = 0; i < this.floatArray.length; i++) {
      sum += this.floatArray[i] * this.floatArray[i];
    }
    const rms = Math.sqrt(sum / this.floatArray.length);
    return Math.min(1, rms * 5);
  }

  private extractWaveform(): Float32Array {
    if (!this.floatArray) return new Float32Array(0);

    const sampleCount = 64;
    const step = Math.floor(this.floatArray.length / sampleCount);
    const result = new Float32Array(sampleCount);

    for (let i = 0; i < sampleCount; i++) {
      result[i] = this.floatArray[i * step];
    }

    return result;
  }

  private finishCalibration(): void {
    this.calibrating = false;
    this.calibrationComplete = true;

    if (this.calibrationSamples.length > 0) {
      const sum = this.calibrationSamples.reduce((a, b) => a + b, 0);
      const avg = sum / this.calibrationSamples.length;

      const variance = this.calibrationSamples.reduce((s, f) => s + (f - avg) ** 2, 0) / this.calibrationSamples.length;
      const stdDev = Math.sqrt(variance);

      this._calibrationResult = {
        baseFrequency: avg,
        frequencyRange: Math.max(100, stdDev * 2)
      };
    }
  }

  destroy(): void {
    if (this.source) {
      this.source.disconnect();
    }
    if (this.stream) {
      this.stream.getTracks().forEach(t => t.stop());
    }
    if (this.audioContext) {
      this.audioContext.close();
    }
  }
}
