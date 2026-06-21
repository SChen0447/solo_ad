import { eventBus } from '../EventBus';
import type { SoundData } from '../types';

export class SoundEngine {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private microphone: MediaStreamAudioSourceNode | null = null;
  private stream: MediaStream | null = null;
  private timeDataBuffer: Float32Array;
  private freqDataBuffer: Uint8Array;
  private waveformBuffer: Float32Array;
  private isRunning: boolean = false;
  private isCalibrating: boolean = false;
  private calibrationStartTime: number = 0;
  private calibrationDuration: number = 5000;
  private calibrationFrequencies: number[] = [];
  private calibrationVolumes: number[] = [];
  private baseFrequency: number = 0;
  private animationFrameId: number | null = null;

  constructor() {
    const bufferSize = 2048;
    this.timeDataBuffer = new Float32Array(bufferSize);
    this.freqDataBuffer = new Uint8Array(bufferSize / 2);
    this.waveformBuffer = new Float32Array(40);
  }

  async init(): Promise<void> {
    try {
      const AudioContextClass = (window as any).AudioContext || (window as any).webkitAudioContext;
      this.audioContext = new AudioContextClass();
      
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false
        }
      });

      this.microphone = this.audioContext!.createMediaStreamSource(this.stream!);
      this.analyser = this.audioContext!.createAnalyser();
      this.analyser.fftSize = 2048;
      this.analyser.smoothingTimeConstant = 0.1;
      
      this.microphone.connect(this.analyser);
      
      this.isRunning = true;
      this.startAnalysis();
    } catch (error) {
      console.error('Failed to initialize microphone:', error);
      throw error;
    }
  }

  private startAnalysis(): void {
    const analyze = () => {
      if (!this.isRunning || !this.analyser) return;

      this.analyser.getFloatTimeDomainData(this.timeDataBuffer);
      this.analyser.getByteFrequencyData(this.freqDataBuffer);

      const frequency = this.detectFrequency();
      const volume = this.calculateVolume();
      const waveform = this.getWaveform();

      const calibratedFrequency = this.baseFrequency > 0 
        ? Math.max(0, frequency - this.baseFrequency)
        : frequency;

      const soundData: SoundData = {
        frequency: calibratedFrequency,
        volume,
        waveform
      };

      eventBus.emit('sound:data', soundData);

      if (this.isCalibrating) {
        this.updateCalibration(calibratedFrequency, volume);
      }

      this.animationFrameId = requestAnimationFrame(analyze);
    };

    analyze();
  }

  private detectFrequency(): number {
    const buffer = this.timeDataBuffer;
    const bufferSize = buffer.length;
    const sampleRate = this.audioContext?.sampleRate || 44100;
    
    const threshold = 0.02;
    let rms = 0;
    
    for (let i = 0; i < bufferSize; i++) {
      rms += buffer[i] * buffer[i];
    }
    rms = Math.sqrt(rms / bufferSize);
    
    if (rms < threshold) {
      return 0;
    }

    const minPeriod = Math.floor(sampleRate / 1200);
    const maxPeriod = Math.floor(sampleRate / 80);

    const d = new Float32Array(maxPeriod + 1);
    
    for (let tau = 0; tau <= maxPeriod; tau++) {
      let sum = 0;
      for (let i = 0; i < bufferSize - tau; i++) {
        const diff = buffer[i] - buffer[i + tau];
        sum += diff * diff;
      }
      d[tau] = sum;
    }

    let minVal = Infinity;
    let minTau = 0;
    
    for (let tau = minPeriod; tau <= maxPeriod; tau++) {
      if (d[tau] < minVal) {
        minVal = d[tau];
        minTau = tau;
      }
    }

    if (minTau < minPeriod || minTau > maxPeriod) {
      return 0;
    }

    const frequency = sampleRate / minTau;
    
    if (frequency < 80 || frequency > 1200) {
      return 0;
    }

    return frequency;
  }

  private calculateVolume(): number {
    const buffer = this.timeDataBuffer;
    let sum = 0;
    
    for (let i = 0; i < buffer.length; i++) {
      sum += buffer[i] * buffer[i];
    }
    
    const rms = Math.sqrt(sum / buffer.length);
    const normalizedVolume = Math.min(1, rms * 3);
    
    return normalizedVolume;
  }

  private getWaveform(): Float32Array {
    const source = this.timeDataBuffer;
    const target = this.waveformBuffer;
    const step = Math.floor(source.length / target.length);
    
    for (let i = 0; i < target.length; i++) {
      let sum = 0;
      for (let j = 0; j < step; j++) {
        sum += source[i * step + j];
      }
      target[i] = sum / step;
    }
    
    return target;
  }

  startCalibration(): void {
    this.isCalibrating = true;
    this.calibrationStartTime = Date.now();
    this.calibrationFrequencies = [];
    this.calibrationVolumes = [];
    this.baseFrequency = 0;
    eventBus.emit('sound:calibrationStart');
  }

  private updateCalibration(frequency: number, volume: number): void {
    const elapsed = Date.now() - this.calibrationStartTime;
    
    if (elapsed >= this.calibrationDuration) {
      this.finishCalibration();
      return;
    }

    if (volume > 0.1) {
      this.calibrationFrequencies.push(frequency);
      this.calibrationVolumes.push(volume);
    }

    const progress = elapsed / this.calibrationDuration;
    eventBus.emit('sound:calibrationProgress', progress);
  }

  private finishCalibration(): void {
    this.isCalibrating = false;
    
    if (this.calibrationFrequencies.length > 0) {
      const sum = this.calibrationFrequencies.reduce((a, b) => a + b, 0);
      this.baseFrequency = sum / this.calibrationFrequencies.length;
    }

    eventBus.emit('sound:calibrationComplete', {
      baseFrequency: this.baseFrequency,
      averageVolume: this.calibrationVolumes.length > 0
        ? this.calibrationVolumes.reduce((a, b) => a + b, 0) / this.calibrationVolumes.length
        : 0
    });
  }

  stop(): void {
    this.isRunning = false;
    
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    
    this.analyser = null;
    this.microphone = null;
  }

  getBaseFrequency(): number {
    return this.baseFrequency;
  }

  isInitialized(): boolean {
    return this.isRunning;
  }
}
