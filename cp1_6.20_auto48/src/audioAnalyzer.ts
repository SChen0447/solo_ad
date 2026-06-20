export interface SpectrumData {
  low: number;
  mid: number;
  high: number;
  bands: number[];
}

export class AudioAnalyzer {
  private static instance: AudioAnalyzer;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private source: AudioBufferSourceNode | null = null;
  private gainNode: GainNode | null = null;
  private audioBuffer: AudioBuffer | null = null;
  private dataArray: Uint8Array | null = null;
  private spectrumBands: number[] = new Array(24).fill(0);
  private listeners: Map<string, Set<(data?: unknown) => void>> = new Map();
  
  private isPlaying: boolean = false;
  private isAnalyzing: boolean = false;
  private lastBeatTime: number = 0;
  private beatThreshold: number = 0.5;
  private energyHistory: number[] = [];
  private bpm: number = 120;
  private beatIntervals: number[] = [];
  private lastBeatDetected: number = 0;
  private animationFrameId: number | null = null;
  private spectrumUpdateInterval: number = 1000 / 24;
  private lastSpectrumUpdate: number = 0;
  private beatCount: number = 0;
  private audioStartTime: number = 0;
  private duration: number = 0;

  private constructor() {}

  static getInstance(): AudioAnalyzer {
    if (!AudioAnalyzer.instance) {
      AudioAnalyzer.instance = new AudioAnalyzer();
    }
    return AudioAnalyzer.instance;
  }

  on(event: string, callback: (data?: unknown) => void): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  off(event: string, callback: (data?: unknown) => void): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.delete(callback);
    }
  }

  private emit(event: string, data?: unknown): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach(callback => callback(data));
    }
  }

  async loadAudioFile(file: File): Promise<{ name: string; duration: number }> {
    this.stop();
    this.cleanup();

    this.audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 256;
    this.analyser.smoothingTimeConstant = 0.8;
    
    this.gainNode = this.audioContext.createGain();
    this.gainNode.gain.value = 0.7;
    
    const bufferLength = this.analyser.frequencyBinCount;
    this.dataArray = new Uint8Array(bufferLength);

    const arrayBuffer = await file.arrayBuffer();
    this.audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
    this.duration = this.audioBuffer.duration;

    const detectedBpm = await this.detectBpm(this.audioBuffer);
    this.bpm = detectedBpm;

    return {
      name: file.name.replace(/\.[^/.]+$/, ''),
      duration: this.audioBuffer.duration
    };
  }

  private async detectBpm(buffer: AudioBuffer): Promise<number> {
    const offlineContext = new OfflineAudioContext(
      buffer.numberOfChannels,
      buffer.length,
      buffer.sampleRate
    );
    
    const source = offlineContext.createBufferSource();
    source.buffer = buffer;
    
    const lowpass = offlineContext.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.value = 150;
    
    const analyser = offlineContext.createAnalyser();
    analyser.fftSize = 256;
    
    source.connect(lowpass);
    lowpass.connect(analyser);
    analyser.connect(offlineContext.destination);
    
    source.start();
    await offlineContext.startRendering();

    const channelData = buffer.getChannelData(0);
    const sampleRate = buffer.sampleRate;
    const windowSize = Math.floor(sampleRate * 0.1);
    const hopSize = Math.floor(windowSize / 2);
    
    const energyCurve: number[] = [];
    for (let i = 0; i < channelData.length - windowSize; i += hopSize) {
      let energy = 0;
      for (let j = 0; j < windowSize; j++) {
        energy += Math.abs(channelData[i + j]);
      }
      energyCurve.push(energy / windowSize);
    }

    const peaks: number[] = [];
    const threshold = this.calculateThreshold(energyCurve);
    
    for (let i = 1; i < energyCurve.length - 1; i++) {
      if (energyCurve[i] > threshold && 
          energyCurve[i] > energyCurve[i - 1] && 
          energyCurve[i] > energyCurve[i + 1]) {
        peaks.push(i * hopSize / sampleRate);
      }
    }

    if (peaks.length < 2) return 120;

    const intervals: number[] = [];
    for (let i = 1; i < peaks.length; i++) {
      const interval = peaks[i] - peaks[i - 1];
      if (interval >= 0.3 && interval <= 7.5) {
        intervals.push(interval);
      }
    }

    if (intervals.length === 0) return 120;

    intervals.sort((a, b) => a - b);
    const median = intervals[Math.floor(intervals.length / 2)];
    let bpm = 60 / median;

    while (bpm < 80) bpm *= 2;
    while (bpm > 200) bpm /= 2;

    return Math.round(bpm);
  }

  private calculateThreshold(data: number[]): number {
    const mean = data.reduce((a, b) => a + b, 0) / data.length;
    const variance = data.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / data.length;
    const std = Math.sqrt(variance);
    return mean + std * 1.5;
  }

  play(): void {
    if (!this.audioContext || !this.audioBuffer || !this.analyser || !this.gainNode) return;

    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }

    this.source = this.audioContext.createBufferSource();
    this.source.buffer = this.audioBuffer;
    this.source.connect(this.analyser);
    this.analyser.connect(this.gainNode);
    this.gainNode.connect(this.audioContext.destination);
    
    this.source.onended = () => {
      if (this.isPlaying) {
        this.emit('audioEnded');
      }
    };

    this.source.start(0);
    this.audioStartTime = this.audioContext.currentTime;
    this.isPlaying = true;
    this.isAnalyzing = true;
    this.lastBeatTime = 0;
    this.beatIntervals = [];
    this.energyHistory = [];
    this.beatCount = 0;
    this.animate();
  }

  pause(): void {
    if (this.source) {
      this.source.stop();
      this.source = null;
    }
    this.isPlaying = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  stop(): void {
    this.pause();
    this.isAnalyzing = false;
    this.spectrumBands = new Array(24).fill(0);
    this.lastBeatTime = 0;
    this.energyHistory = [];
    this.beatIntervals = [];
    this.beatCount = 0;
  }

  cleanup(): void {
    this.stop();
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    this.analyser = null;
    this.source = null;
    this.gainNode = null;
    this.audioBuffer = null;
    this.dataArray = null;
  }

  private animate = (): void => {
    if (!this.isAnalyzing || !this.analyser || !this.dataArray) return;

    const now = performance.now();

    if (now - this.lastSpectrumUpdate >= this.spectrumUpdateInterval) {
      this.analyser.getByteFrequencyData(this.dataArray);
      this.processSpectrum();
      this.lastSpectrumUpdate = now;
    }

    this.detectBeat();
    this.animationFrameId = requestAnimationFrame(this.animate);
  };

  private processSpectrum(): void {
    if (!this.dataArray) return;

    const bufferLength = this.dataArray.length;
    const bands = 24;
    const bandWidth = Math.floor(bufferLength / bands);

    for (let i = 0; i < bands; i++) {
      let sum = 0;
      for (let j = 0; j < bandWidth; j++) {
        sum += this.dataArray[i * bandWidth + j];
      }
      const normalized = sum / (bandWidth * 255);
      this.spectrumBands[i] = Math.max(0, Math.min(1, normalized));
    }

    let lowSum = 0, midSum = 0, highSum = 0;
    const lowBands = Math.floor(bands * 0.1);
    const midBands = Math.floor(bands * 0.4);

    for (let i = 0; i < lowBands; i++) {
      lowSum += this.spectrumBands[i];
    }
    for (let i = lowBands; i < lowBands + midBands; i++) {
      midSum += this.spectrumBands[i];
    }
    for (let i = lowBands + midBands; i < bands; i++) {
      highSum += this.spectrumBands[i];
    }

    const spectrumData: SpectrumData = {
      low: lowSum / lowBands,
      mid: midSum / midBands,
      high: highSum / (bands - lowBands - midBands),
      bands: [...this.spectrumBands]
    };

    this.emit('spectrum', spectrumData);
  }

  private detectBeat(): void {
    if (!this.dataArray || !this.audioContext) return;

    let lowFrequencyEnergy = 0;
    const lowFrequencyBins = Math.floor(this.dataArray.length * 0.1);

    for (let i = 0; i < lowFrequencyBins; i++) {
      lowFrequencyEnergy += this.dataArray[i];
    }
    lowFrequencyEnergy /= lowFrequencyBins * 255;

    this.energyHistory.push(lowFrequencyEnergy);
    if (this.energyHistory.length > 43) {
      this.energyHistory.shift();
    }

    if (this.energyHistory.length < 43) return;

    const average = this.energyHistory.reduce((a, b) => a + b, 0) / this.energyHistory.length;
    const variance = this.energyHistory.reduce((a, b) => a + Math.pow(b - average, 2), 0) / this.energyHistory.length;
    const std = Math.sqrt(variance);
    
    const adaptiveThreshold = average + std * this.beatThreshold;
    const currentTime = this.audioContext.currentTime - this.audioStartTime;
    const minBeatInterval = 60 / 200;
    const maxBeatInterval = 60 / 80;

    if (lowFrequencyEnergy > adaptiveThreshold && 
        currentTime - this.lastBeatDetected > minBeatInterval) {
      
      const timeSinceLastBeat = currentTime - this.lastBeatDetected;
      
      if (timeSinceLastBeat < maxBeatInterval) {
        this.beatIntervals.push(timeSinceLastBeat);
        if (this.beatIntervals.length > 10) {
          this.beatIntervals.shift();
        }
        
        const avgInterval = this.beatIntervals.reduce((a, b) => a + b, 0) / this.beatIntervals.length;
        this.bpm = Math.round(60 / avgInterval);
        this.bpm = Math.max(80, Math.min(200, this.bpm));
      }

      this.beatCount++;
      this.lastBeatDetected = currentTime;
      this.lastBeatTime = currentTime;
      
      this.emit('beat', {
        time: currentTime,
        bpm: this.bpm,
        beatCount: this.beatCount,
        energy: lowFrequencyEnergy
      });
    }
  }

  getBpm(): number {
    return this.bpm;
  }

  getSpectrum(): number[] {
    return [...this.spectrumBands];
  }

  getCurrentTime(): number {
    if (!this.audioContext || !this.isPlaying) return 0;
    return this.audioContext.currentTime - this.audioStartTime;
  }

  getDuration(): number {
    return this.duration;
  }

  isAudioPlaying(): boolean {
    return this.isPlaying;
  }

  generateDemoAudio(): void {
    this.bpm = 128;
    this.duration = 60;
    this.emit('bpmDetected', this.bpm);
  }

  startDemoAnalysis(): void {
    this.isAnalyzing = true;
    this.isPlaying = true;
    this.audioStartTime = performance.now() / 1000;
    this.lastBeatTime = 0;
    this.beatCount = 0;
    this.beatIntervals = [60 / 128];
    
    this.demoAnimate();
  }

  private demoAnimate = (): void => {
    if (!this.isAnalyzing) return;

    const now = performance.now() / 1000 - this.audioStartTime;
    
    for (let i = 0; i < 24; i++) {
      this.spectrumBands[i] = Math.random() * 0.5 + 0.2;
    }

    const spectrumData: SpectrumData = {
      low: 0.5 + Math.random() * 0.3,
      mid: 0.4 + Math.random() * 0.3,
      high: 0.3 + Math.random() * 0.3,
      bands: [...this.spectrumBands]
    };
    this.emit('spectrum', spectrumData);

    const beatInterval = 60 / this.bpm;
    if (now - this.lastBeatTime >= beatInterval) {
      this.beatCount++;
      this.lastBeatTime = now;
      this.emit('beat', {
        time: now,
        bpm: this.bpm,
        beatCount: this.beatCount,
        energy: 0.8
      });
    }

    this.animationFrameId = requestAnimationFrame(this.demoAnimate);
  };

  stopDemo(): void {
    this.isAnalyzing = false;
    this.isPlaying = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }
}
