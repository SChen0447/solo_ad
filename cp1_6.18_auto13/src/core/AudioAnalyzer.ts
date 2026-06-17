import type { AnalysisResult, BeatEvent, PresetTrack, BeatType } from '../types';

export type OnBeatCallback = (beat: BeatEvent, energy: number) => void;
export type OnCompleteCallback = (result: AnalysisResult) => void;
export type OnProgressCallback = (progress: number) => void;

const PRESET_TRACKS: PresetTrack[] = [
  { id: 'preset-1', title: '星际巡航 (120 BPM)', bpm: 120, duration: 200, pattern: 'steady' },
  { id: 'preset-2', title: '脉冲能量 (140 BPM)', bpm: 140, duration: 180, pattern: 'electronic' },
  { id: 'preset-3', title: '摇滚节拍 (100 BPM)', bpm: 100, duration: 240, pattern: 'rock' },
  { id: 'preset-4', title: '深空漫步 (90 BPM)', bpm: 90, duration: 260, pattern: 'steady' },
  { id: 'preset-5', title: '电光火石 (160 BPM)', bpm: 160, duration: 150, pattern: 'electronic' },
];

export class AudioAnalyzer {
  private audioContext: AudioContext | null = null;
  private audioBuffer: AudioBuffer | null = null;
  private analyser: AnalyserNode | null = null;
  private source: AudioBufferSourceNode | null = null;
  private beatCallbacks: OnBeatCallback[] = [];
  private completeCallbacks: OnCompleteCallback[] = [];
  private progressCallbacks: OnProgressCallback[] = [];
  private scheduledBeats: number[] = [];
  private isPlaying = false;
  private startTime = 0;
  private lastBeatIndex = -1;
  private analysisResult: AnalysisResult | null = null;
  private animationFrame: number | null = null;

  getPresetTracks(): PresetTrack[] {
    return PRESET_TRACKS;
  }

  onBeat(callback: OnBeatCallback) {
    this.beatCallbacks.push(callback);
  }

  onComplete(callback: OnCompleteCallback) {
    this.completeCallbacks.push(callback);
  }

  onProgress(callback: OnProgressCallback) {
    this.progressCallbacks.push(callback);
  }

  private ensureAudioContext() {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
    return this.audioContext;
  }

  private generateBeatsFromBPM(bpm: number, duration: number, startTime: number, title: string, pattern: string): AnalysisResult {
    const beats: BeatEvent[] = [];
    const beatInterval = 60 / bpm;
    const beatsPerBar = 4;
    const totalBeats = Math.floor(duration / beatInterval);

    for (let i = 0; i < totalBeats; i++) {
      const beatTime = startTime + i * beatInterval;
      const bar = Math.floor(i / beatsPerBar) + 1;
      const beatInBar = (i % beatsPerBar) + 1;

      let type: BeatType;
      if (beatInBar === 1) {
        type = 'strong';
      } else if (pattern === 'electronic' && (beatInBar === 3 || i % 8 === 5)) {
        type = Math.random() < 0.3 ? 'bonus' : 'weak';
      } else if (pattern === 'rock' && beatInBar === 3) {
        type = 'weak';
      } else {
        type = i % 12 === 7 ? 'bonus' : 'weak';
      }

      beats.push({
        time: beatTime,
        type,
        bar,
        beatInBar,
      });
    }

    return { bpm, startTime, duration, beats, title };
  }

  async loadFromPreset(preset: PresetTrack): Promise<AnalysisResult> {
    this.ensureAudioContext();
    this.analysisResult = this.generateBeatsFromBPM(
      preset.bpm,
      preset.duration,
      0.5,
      preset.title,
      preset.pattern
    );
    return this.analysisResult;
  }

  async loadFromFile(file: File): Promise<AnalysisResult> {
    const ctx = this.ensureAudioContext();

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const arrayBuffer = e.target?.result as ArrayBuffer;
          this.audioBuffer = await ctx.decodeAudioData(arrayBuffer.slice(0));
          const detectedBPM = this.detectBPM(this.audioBuffer);
          const detectedStart = this.detectStartTime(this.audioBuffer);

          this.analysisResult = this.generateBeatsFromBPM(
            detectedBPM,
            this.audioBuffer.duration,
            detectedStart,
            file.name.replace(/\.[^/.]+$/, ''),
            'steady'
          );

          resolve(this.analysisResult);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = () => reject(new Error('读取文件失败'));
      reader.readAsArrayBuffer(file);
    });
  }

  private detectBPM(buffer: AudioBuffer): number {
    const channelData = buffer.getChannelData(0);
    const sampleRate = buffer.sampleRate;
    const windowSize = Math.floor(sampleRate * 0.05);
    const energies: number[] = [];

    for (let i = 0; i < channelData.length - windowSize; i += windowSize) {
      let energy = 0;
      for (let j = 0; j < windowSize; j++) {
        energy += channelData[i + j] * channelData[i + j];
      }
      energies.push(energy / windowSize);
    }

    const avgEnergy = energies.reduce((a, b) => a + b, 0) / energies.length;
    const peaks = energies
      .map((e, i) => (e > avgEnergy * 1.3 ? i : -1))
      .filter((i) => i !== -1);

    if (peaks.length < 2) return 120;

    const intervals: number[] = [];
    for (let i = 1; i < peaks.length; i++) {
      const interval = peaks[i] - peaks[i - 1];
      if (interval > 3 && interval < 40) {
        intervals.push(interval);
      }
    }

    if (intervals.length === 0) return 120;

    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const bpm = Math.round((60 * 1000) / (avgInterval * 50));

    return Math.max(60, Math.min(200, bpm || 120));
  }

  private detectStartTime(buffer: AudioBuffer): number {
    const channelData = buffer.getChannelData(0);
    const sampleRate = buffer.sampleRate;
    const windowSize = Math.floor(sampleRate * 0.01);
    const threshold = 0.01;

    for (let i = 0; i < channelData.length - windowSize; i += windowSize) {
      let energy = 0;
      for (let j = 0; j < windowSize; j++) {
        energy += Math.abs(channelData[i + j]);
      }
      if (energy / windowSize > threshold) {
        return Math.max(0, i / sampleRate - 0.1);
      }
    }
    return 0.5;
  }

  startPlayback() {
    if (!this.analysisResult) {
      throw new Error('必须先加载音频');
    }

    const ctx = this.ensureAudioContext();
    this.isPlaying = true;
    this.startTime = ctx.currentTime;
    this.lastBeatIndex = -1;
    this.scheduledBeats = [];

    if (this.audioBuffer) {
      this.source = ctx.createBufferSource();
      this.source.buffer = this.audioBuffer;
      this.analyser = ctx.createAnalyser();
      this.analyser.fftSize = 256;
      this.source.connect(this.analyser);
      this.analyser.connect(ctx.destination);
      this.source.start(0, this.analysisResult.startTime);

      this.source.onended = () => {
        this.isPlaying = false;
        if (this.analysisResult) {
          this.completeCallbacks.forEach((cb) => cb(this.analysisResult!));
        }
      };
    }

    this.tick();
  }

  stopPlayback() {
    this.isPlaying = false;
    if (this.source) {
      try {
        this.source.stop();
      } catch (e) {}
      this.source.disconnect();
      this.source = null;
    }
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
    this.analyser = null;
  }

  private tick = () => {
    if (!this.isPlaying || !this.analysisResult) return;

    const ctx = this.audioContext!;
    const currentTime = ctx.currentTime - this.startTime + this.analysisResult.startTime;

    const beats = this.analysisResult.beats;
    const lookAhead = 0.1;

    for (let i = this.lastBeatIndex + 1; i < beats.length; i++) {
      const beat = beats[i];
      const timeDiff = beat.time - currentTime;

      if (timeDiff < -0.05) {
        this.lastBeatIndex = i;
        continue;
      }

      if (timeDiff <= lookAhead && !this.scheduledBeats.includes(i)) {
        this.scheduledBeats.push(i);
        const energy = this.getCurrentEnergy();
        const delay = Math.max(0, (beat.time - currentTime) * 1000);

        setTimeout(() => {
          if (this.isPlaying) {
            this.beatCallbacks.forEach((cb) => cb(beat, energy));
          }
        }, delay);
      }

      if (timeDiff > lookAhead) {
        break;
      }
    }

    if (!this.audioBuffer && currentTime >= this.analysisResult.duration) {
      this.isPlaying = false;
      this.completeCallbacks.forEach((cb) => cb(this.analysisResult!));
      return;
    }

    const totalDuration = this.analysisResult.duration;
    const progress = Math.min(1, currentTime / totalDuration);
    this.progressCallbacks.forEach((cb) => cb(progress));

    this.animationFrame = requestAnimationFrame(this.tick);
  };

  private getCurrentEnergy(): number {
    if (!this.analyser) return 0.7 + Math.random() * 0.3;

    const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteFrequencyData(dataArray);
    const sum = dataArray.reduce((a, b) => a + b, 0);
    return Math.min(1, sum / dataArray.length / 128);
  }

  getCurrentTime(): number {
    if (!this.audioContext || !this.analysisResult) return 0;
    return this.audioContext.currentTime - this.startTime + this.analysisResult.startTime;
  }

  getAnalysisResult(): AnalysisResult | null {
    return this.analysisResult;
  }

  getIsPlaying(): boolean {
    return this.isPlaying;
  }

  cleanup() {
    this.stopPlayback();
    this.beatCallbacks = [];
    this.completeCallbacks = [];
    this.progressCallbacks = [];
    this.audioBuffer = null;
    this.analysisResult = null;
  }
}
