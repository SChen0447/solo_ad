import { IAudioStateEvent, AudioStateListener, IPlayState } from '../shared/types';

export class AudioEngine {
  private audioContext: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private analyser: AnalyserNode | null = null;
  private audioBuffer: AudioBuffer | null = null;
  private sourceNode: AudioBufferSourceNode | null = null;
  private isPlaying: boolean = false;
  private startOffset: number = 0;
  private startContextTime: number = 0;
  private playbackRate: number = 1;
  private listeners: Set<AudioStateListener> = new Set();
  private rafId: number | null = null;
  private externalUrl: string | null = null;

  constructor() {}

  private ensureContext(): AudioContext {
    if (!this.audioContext) {
      this.audioContext = new AudioContext({
        latencyHint: 'interactive',
      });
      this.masterGain = this.audioContext.createGain();
      this.masterGain.gain.value = 0.9;
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 2048;
      this.masterGain.connect(this.analyser);
      this.analyser.connect(this.audioContext.destination);
    }
    return this.audioContext;
  }

  getContext(): AudioContext {
    return this.ensureContext();
  }

  getMasterGain(): GainNode | null {
    this.ensureContext();
    return this.masterGain;
  }

  getAnalyser(): AnalyserNode | null {
    this.ensureContext();
    return this.analyser;
  }

  setAudioBuffer(buffer: AudioBuffer): void {
    this.stop();
    this.audioBuffer = buffer;
    this.notifyListeners();
  }

  getAudioBuffer(): AudioBuffer | null {
    return this.audioBuffer;
  }

  async loadAudio(url: string): Promise<void> {
    const ctx = this.ensureContext();
    this.externalUrl = url;
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    const buffer = await ctx.decodeAudioData(arrayBuffer);
    this.setAudioBuffer(buffer);
  }

  getCurrentTime(): number {
    if (!this.isPlaying) {
      return this.startOffset * 1000;
    }
    const ctx = this.ensureContext();
    const elapsed = (ctx.currentTime - this.startContextTime) * this.playbackRate;
    return (this.startOffset + elapsed) * 1000;
  }

  getDuration(): number {
    return this.audioBuffer ? this.audioBuffer.duration * 1000 : 0;
  }

  getPlayState(): IPlayState {
    return {
      isPlaying: this.isPlaying,
      currentTime: this.getCurrentTime(),
      duration: this.getDuration(),
      playbackRate: this.playbackRate,
    };
  }

  play(): void {
    if (!this.audioBuffer || this.isPlaying) return;
    const ctx = this.ensureContext();
    if (ctx.state === 'suspended') {
      ctx.resume();
    }
    this.sourceNode = ctx.createBufferSource();
    this.sourceNode.buffer = this.audioBuffer;
    this.sourceNode.playbackRate.value = this.playbackRate;
    this.sourceNode.connect(this.masterGain!);
    this.startContextTime = ctx.currentTime;
    this.sourceNode.start(0, this.startOffset);
    this.isPlaying = true;
    this.sourceNode.onended = () => {
      if (this.isPlaying) {
        this.isPlaying = false;
        this.startOffset = 0;
        this.notifyListeners();
        this.stopRaf();
      }
    };
    this.startRaf();
    this.notifyListeners();
  }

  pause(): void {
    if (!this.isPlaying || !this.audioBuffer) return;
    const ctx = this.ensureContext();
    const elapsed = (ctx.currentTime - this.startContextTime) * this.playbackRate;
    this.startOffset = Math.min(this.startOffset + elapsed, this.audioBuffer.duration);
    try {
      this.sourceNode?.stop();
    } catch (_) {
      // ignore
    }
    this.sourceNode = null;
    this.isPlaying = false;
    this.stopRaf();
    this.notifyListeners();
  }

  stop(): void {
    if (this.sourceNode) {
      try {
        this.sourceNode.stop();
      } catch (_) {
        // ignore
      }
      this.sourceNode = null;
    }
    this.isPlaying = false;
    this.startOffset = 0;
    this.stopRaf();
    this.notifyListeners();
  }

  reset(): void {
    this.stop();
    this.startOffset = 0;
    this.notifyListeners();
  }

  seek(timeMs: number): void {
    const duration = this.getDuration();
    const clamped = Math.max(0, Math.min(timeMs, duration));
    const wasPlaying = this.isPlaying;
    if (this.isPlaying) {
      this.pause();
    }
    this.startOffset = clamped / 1000;
    if (wasPlaying) {
      this.play();
    } else {
      this.notifyListeners();
    }
  }

  setPlaybackRate(rate: number): void {
    const clamped = Math.max(0.5, Math.min(2, rate));
    if (this.isPlaying) {
      const ctx = this.ensureContext();
      const elapsed = (ctx.currentTime - this.startContextTime) * this.playbackRate;
      this.startOffset = Math.min(this.startOffset + elapsed, this.audioBuffer?.duration ?? 0);
      this.startContextTime = ctx.currentTime;
    }
    this.playbackRate = clamped;
    if (this.sourceNode) {
      this.sourceNode.playbackRate.value = clamped;
    }
    this.notifyListeners();
  }

  getPlaybackRate(): number {
    return this.playbackRate;
  }

  onStateChange(listener: AudioStateListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    const event: IAudioStateEvent = {
      isPlaying: this.isPlaying,
      currentTime: this.getCurrentTime(),
      duration: this.getDuration(),
    };
    this.listeners.forEach((l) => l(event));
  }

  private startRaf(): void {
    const tick = () => {
      this.notifyListeners();
      this.rafId = requestAnimationFrame(tick);
    };
    this.rafId = requestAnimationFrame(tick);
  }

  private stopRaf(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  getWaveformData(samples: number = 1024): Float32Array {
    if (!this.audioBuffer) return new Float32Array(samples);
    const channelData = this.audioBuffer.getChannelData(0);
    const blockSize = Math.floor(channelData.length / samples);
    const result = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
      let sum = 0;
      for (let j = 0; j < blockSize; j++) {
        sum += Math.abs(channelData[i * blockSize + j] ?? 0);
      }
      result[i] = blockSize > 0 ? sum / blockSize : 0;
    }
    return result;
  }

  getZoomedWaveformData(startMs: number, endMs: number, samples: number = 1024): Float32Array {
    if (!this.audioBuffer) return new Float32Array(samples);
    const duration = this.audioBuffer.duration * 1000;
    const start = Math.max(0, Math.min(startMs, duration));
    const end = Math.max(start, Math.min(endMs, duration));
    const sr = this.audioBuffer.sampleRate;
    const startSample = Math.floor((start / 1000) * sr);
    const endSample = Math.floor((end / 1000) * sr);
    const channelData = this.audioBuffer.getChannelData(0);
    const totalSamples = endSample - startSample;
    const blockSize = Math.max(1, Math.floor(totalSamples / samples));
    const result = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
      let sum = 0;
      const s0 = startSample + i * blockSize;
      const s1 = Math.min(s0 + blockSize, endSample);
      for (let j = s0; j < s1; j++) {
        sum += Math.abs(channelData[j] ?? 0);
      }
      result[i] = s1 - s0 > 0 ? sum / (s1 - s0) : 0;
    }
    return result;
  }
}

export const audioEngine = new AudioEngine();
