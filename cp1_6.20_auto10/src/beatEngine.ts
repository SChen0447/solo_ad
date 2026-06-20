export type Difficulty = 'easy' | 'normal' | 'hard';

export interface DifficultyConfig {
  readonly sensitivity: number;
  readonly minInterval: number;
  readonly windowSize: number;
  readonly speedMultiplier: number;
}

export interface BeatAnalysisResult {
  readonly beats: number[];
  readonly duration: number;
  readonly bpm: number;
}

const DIFFICULTY_CONFIGS: Record<Difficulty, DifficultyConfig> = {
  easy: {
    sensitivity: 1.3,
    minInterval: 0.55,
    windowSize: 2048,
    speedMultiplier: 0.75
  },
  normal: {
    sensitivity: 1.45,
    minInterval: 0.4,
    windowSize: 2048,
    speedMultiplier: 1.0
  },
  hard: {
    sensitivity: 1.6,
    minInterval: 0.28,
    windowSize: 1024,
    speedMultiplier: 1.35
  }
};

export function getDifficultyConfig(difficulty: Difficulty): DifficultyConfig {
  return DIFFICULTY_CONFIGS[difficulty];
}

export class BeatEngine {
  private audioContext: AudioContext | null = null;
  private audioBuffer: AudioBuffer | null = null;
  private sourceNode: AudioBufferSourceNode | null = null;
  private gainNode: GainNode | null = null;
  private isPlaying = false;
  private startTime = 0;
  private pauseOffset = 0;

  public get context(): AudioContext | null {
    return this.audioContext;
  }

  public get duration(): number {
    return this.audioBuffer?.duration ?? 0;
  }

  public get playbackTime(): number {
    if (!this.isPlaying || !this.audioContext) {
      return this.pauseOffset;
    }
    return this.audioContext.currentTime - this.startTime + this.pauseOffset;
  }

  public get playing(): boolean {
    return this.isPlaying;
  }

  private ensureContext(): AudioContext {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    }
    return this.audioContext;
  }

  public async loadAudioFile(file: File): Promise<ArrayBuffer> {
    return await file.arrayBuffer();
  }

  public async decodeAudio(arrayBuffer: ArrayBuffer): Promise<void> {
    const ctx = this.ensureContext();
    const copy = arrayBuffer.slice(0);
    this.audioBuffer = await ctx.decodeAudioData(copy);
  }

  public analyzeBeats(difficulty: Difficulty): BeatAnalysisResult {
    if (!this.audioBuffer) {
      return { beats: [], duration: 0, bpm: 0 };
    }

    const config = getDifficultyConfig(difficulty);
    const channelData = this.getMonoChannelData();
    const duration = this.audioBuffer.duration;

    const beats = this.detectBeats(channelData, this.audioBuffer.sampleRate, config);

    const adjustedBeats = beats
      .map(t => t / config.speedMultiplier)
      .filter(t => t <= duration);

    const bpm = this.estimateBPM(adjustedBeats);

    return {
      beats: adjustedBeats,
      duration,
      bpm
    };
  }

  private getMonoChannelData(): Float32Array {
    if (!this.audioBuffer) return new Float32Array(0);

    const numChannels = this.audioBuffer.numberOfChannels;
    const length = this.audioBuffer.length;

    if (numChannels === 1) {
      return this.audioBuffer.getChannelData(0);
    }

    const mono = new Float32Array(length);
    for (let i = 0; i < numChannels; i++) {
      const channel = this.audioBuffer.getChannelData(i);
      for (let j = 0; j < length; j++) {
        mono[j] += channel[j];
      }
    }
    const inv = 1 / numChannels;
    for (let j = 0; j < length; j++) {
      mono[j] *= inv;
    }
    return mono;
  }

  private detectBeats(
    channelData: Float32Array,
    sampleRate: number,
    config: DifficultyConfig
  ): number[] {
    const windowSize = config.windowSize;
    const hopSize = windowSize / 2;
    const totalWindows = Math.floor((channelData.length - windowSize) / hopSize);
    const energies = new Float32Array(totalWindows);

    for (let i = 0; i < totalWindows; i++) {
      const start = i * hopSize;
      let sum = 0;
      for (let j = 0; j < windowSize; j++) {
        const s = channelData[start + j];
        sum += s * s;
      }
      energies[i] = sum / windowSize;
    }

    const historySize = 43;
    const beats: number[] = [];
    let lastBeatTime = -config.minInterval;

    for (let i = historySize; i < totalWindows; i++) {
      let historySum = 0;
      for (let j = i - historySize; j < i; j++) {
        historySum += energies[j];
      }
      const historyAvg = historySum / historySize;
      const threshold = historyAvg * config.sensitivity;

      if (energies[i] > threshold) {
        const beatTime = (i * hopSize + windowSize / 2) / sampleRate;

        if (beatTime - lastBeatTime >= config.minInterval) {
          let peakIdx = i;
          let peakEnergy = energies[i];
          const searchEnd = Math.min(i + 4, totalWindows);
          for (let k = i + 1; k < searchEnd; k++) {
            if (energies[k] > peakEnergy) {
              peakEnergy = energies[k];
              peakIdx = k;
            }
          }
          const correctedBeatTime = (peakIdx * hopSize + windowSize / 2) / sampleRate;
          beats.push(correctedBeatTime);
          lastBeatTime = correctedBeatTime;
        }
      }
    }

    return beats;
  }

  private estimateBPM(beats: number[]): number {
    if (beats.length < 4) return 0;

    const intervals: number[] = [];
    for (let i = 1; i < beats.length; i++) {
      intervals.push(beats[i] - beats[i - 1]);
    }

    intervals.sort((a, b) => a - b);
    const mid = Math.floor(intervals.length / 2);
    const median = intervals.length % 2 === 0
      ? (intervals[mid - 1] + intervals[mid]) / 2
      : intervals[mid];

    return Math.round(60 / median);
  }

  public start(): void {
    if (!this.audioBuffer || this.isPlaying) return;

    const ctx = this.ensureContext();
    if (ctx.state === 'suspended') {
      void ctx.resume();
    }

    this.sourceNode = ctx.createBufferSource();
    this.sourceNode.buffer = this.audioBuffer;

    this.gainNode = ctx.createGain();
    this.gainNode.gain.value = 0.85;

    this.sourceNode.connect(this.gainNode);
    this.gainNode.connect(ctx.destination);

    this.sourceNode.onended = () => {
      if (this.isPlaying && this.playbackTime >= this.duration - 0.05) {
        this.isPlaying = false;
      }
    };

    this.startTime = ctx.currentTime;
    this.sourceNode.start(0, this.pauseOffset);
    this.isPlaying = true;
  }

  public pause(): void {
    if (!this.isPlaying || !this.sourceNode || !this.audioContext) return;

    this.pauseOffset = this.audioContext.currentTime - this.startTime + this.pauseOffset;
    this.sourceNode.onended = null;
    this.sourceNode.stop();
    this.sourceNode.disconnect();
    if (this.gainNode) {
      this.gainNode.disconnect();
    }
    this.sourceNode = null;
    this.gainNode = null;
    this.isPlaying = false;
  }

  public stop(): void {
    if (this.sourceNode) {
      this.sourceNode.onended = null;
      try { this.sourceNode.stop(); } catch { /* noop */ }
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }
    if (this.gainNode) {
      this.gainNode.disconnect();
      this.gainNode = null;
    }
    this.isPlaying = false;
    this.pauseOffset = 0;
    this.startTime = 0;
  }

  public reset(): void {
    this.stop();
    this.pauseOffset = 0;
  }

  public dispose(): void {
    this.stop();
    this.audioBuffer = null;
    if (this.audioContext) {
      void this.audioContext.close();
      this.audioContext = null;
    }
  }
}
