import { EventEmitter, BeatEvent } from './types';

export class AudioEngine extends EventEmitter {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private dataArray: Uint8Array | null = null;
  private isPlaying: boolean = false;
  private bpm: number = 120;
  private lastBeatTime: number = 0;
  private beatInterval: number = 500;
  private startTime: number = 0;
  private beatCount: number = 0;
  private simulatedBeatTimer: number = 0;
  private useSimulated: boolean = true;
  private oscillator: OscillatorNode | null = null;
  private gainNode: GainNode | null = null;

  constructor() {
    super();
    this.setBPM(120);
  }

  async init(): Promise<void> {
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 2048;
      this.analyser.smoothingTimeConstant = 0.8;
      this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
      this.useSimulated = true;
      this.startGeneratedBeat();
    } catch (e) {
      console.warn('Web Audio API not available, using simulated beats');
      this.useSimulated = true;
    }
  }

  private startGeneratedBeat(): void {
    if (!this.audioContext) return;
    
    this.gainNode = this.audioContext.createGain();
    this.gainNode.gain.value = 0.15;
    this.gainNode.connect(this.audioContext.destination);
  }

  private playKick(): void {
    if (!this.audioContext || !this.gainNode) return;
    
    const now = this.audioContext.currentTime;
    const osc = this.audioContext.createOscillator();
    const kickGain = this.audioContext.createGain();
    
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.1);
    
    kickGain.gain.setValueAtTime(0.4, now);
    kickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    
    osc.connect(kickGain);
    kickGain.connect(this.gainNode);
    
    osc.start(now);
    osc.stop(now + 0.2);
  }

  private playHiHat(): void {
    if (!this.audioContext || !this.gainNode) return;
    
    const now = this.audioContext.currentTime;
    const bufferSize = this.audioContext.sampleRate * 0.05;
    const noiseBuffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }
    
    const noise = this.audioContext.createBufferSource();
    noise.buffer = noiseBuffer;
    
    const filter = this.audioContext.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 7000;
    
    const hatGain = this.audioContext.createGain();
    hatGain.gain.setValueAtTime(0.1, now);
    hatGain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
    
    noise.connect(filter);
    filter.connect(hatGain);
    hatGain.connect(this.gainNode);
    
    noise.start(now);
    noise.stop(now + 0.05);
  }

  setBPM(bpm: number): void {
    this.bpm = bpm;
    this.beatInterval = 60000 / bpm;
    this.emit('bpm', bpm);
  }

  getBPM(): number {
    return this.bpm;
  }

  start(): void {
    if (this.isPlaying) return;
    this.isPlaying = true;
    this.startTime = performance.now();
    this.lastBeatTime = this.startTime;
    this.beatCount = 0;
    this.simulatedBeatTimer = 0;

    if (this.audioContext?.state === 'suspended') {
      this.audioContext.resume();
    }
  }

  pause(): void {
    this.isPlaying = false;
  }

  stop(): void {
    this.isPlaying = false;
    this.beatCount = 0;
  }

  update(dt: number): void {
    if (!this.isPlaying) return;

    if (this.useSimulated) {
      this.simulatedBeatTimer += dt * 1000;
      
      if (this.simulatedBeatTimer >= this.beatInterval) {
        this.simulatedBeatTimer -= this.beatInterval;
        this.triggerBeat();
      }
    } else if (this.analyser && this.dataArray) {
      this.analyser.getByteFrequencyData(this.dataArray);
      const lowFreqSum = this.dataArray.slice(0, 10).reduce((a, b) => a + b, 0);
      const lowFreqAvg = lowFreqSum / 10;
      const threshold = 150;
      
      if (lowFreqAvg > threshold) {
        const now = performance.now();
        if (now - this.lastBeatTime > this.beatInterval * 0.6) {
          this.triggerBeat(lowFreqAvg / 255);
        }
      }
    }
  }

  private triggerBeat(intensity: number = 1): void {
    const now = performance.now();
    this.lastBeatTime = now;
    this.beatCount++;

    const isDownBeat = this.beatCount % 4 === 1;
    if (isDownBeat) {
      this.playKick();
    } else {
      this.playHiHat();
    }

    const beatEvent: BeatEvent = {
      time: now,
      bpm: this.bpm,
      intensity: Math.min(1, Math.max(0.3, intensity))
    };

    this.emit('beat', beatEvent);
    this.emit('beatCount', this.beatCount);
  }

  getBeatCount(): number {
    return this.beatCount;
  }

  getElapsedTime(): number {
    return this.isPlaying ? performance.now() - this.startTime : 0;
  }

  destroy(): void {
    this.stop();
    this.removeAllListeners();
    if (this.oscillator) {
      try { this.oscillator.stop(); } catch (e) {}
      this.oscillator.disconnect();
    }
    if (this.gainNode) {
      this.gainNode.disconnect();
    }
    if (this.analyser) {
      this.analyser.disconnect();
    }
    if (this.audioContext) {
      this.audioContext.close();
    }
  }
}
