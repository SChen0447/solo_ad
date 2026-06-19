export type BeatEvent = {
  time: number;
  index: number;
  isStrong: boolean;
};

type BeatListener = (event: BeatEvent) => void;
type EndListener = () => void;

export class MusicAnalyzer {
  private bpm: number = 120;
  private duration: number = 60;
  private beatTimes: number[] = [];
  private audioContext: AudioContext | null = null;
  private audioBuffer: AudioBuffer | null = null;
  private sourceNode: AudioBufferSourceNode | null = null;
  private startTime: number = 0;
  private currentBeatIndex: number = -1;
  private rafId: number = 0;
  private beatListeners: Set<BeatListener> = new Set();
  private endListeners: Set<EndListener> = new Set();
  private isPlaying: boolean = false;

  async load(): Promise<void> {
    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    this.generateBeats();
    this.audioBuffer = this.generateAudio();
  }

  private generateBeats(): void {
    this.beatTimes = [];
    const beatInterval = 60 / this.bpm;
    for (let t = 0; t <= this.duration; t += beatInterval) {
      this.beatTimes.push(Number(t.toFixed(3)));
    }
  }

  private generateAudio(): AudioBuffer {
    const sampleRate = 44100;
    const totalSamples = sampleRate * this.duration;
    const buffer = this.audioContext!.createBuffer(2, totalSamples, sampleRate);

    for (let channel = 0; channel < 2; channel++) {
      const data = buffer.getChannelData(channel);
      for (let i = 0; i < totalSamples; i++) {
        data[i] = 0;
      }
      this.beatTimes.forEach((beatTime, idx) => {
        const beatSample = Math.floor(beatTime * sampleRate);
        const isStrong = idx % 4 === 0;
        const freq = isStrong ? 220 : 165;
        const duration = isStrong ? 0.1 : 0.06;
        const length = Math.floor(duration * sampleRate);
        for (let j = 0; j < length; j++) {
          const t = j / sampleRate;
          const envelope = Math.exp(-t * 20);
          const sample = Math.sin(2 * Math.PI * freq * t) * envelope * (isStrong ? 0.4 : 0.25);
          if (beatSample + j < totalSamples) {
            data[beatSample + j] += sample;
          }
        }
      });
    }
    return buffer;
  }

  getBeatTimes(): number[] {
    return [...this.beatTimes];
  }

  getBpm(): number {
    return this.bpm;
  }

  getDuration(): number {
    return this.duration;
  }

  onBeat(listener: BeatListener): () => void {
    this.beatListeners.add(listener);
    return () => this.beatListeners.delete(listener);
  }

  onEnd(listener: EndListener): () => void {
    this.endListeners.add(listener);
    return () => this.endListeners.delete(listener);
  }

  play(): void {
    if (!this.audioContext || !this.audioBuffer || this.isPlaying) return;
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
    this.sourceNode = this.audioContext.createBufferSource();
    this.sourceNode.buffer = this.audioBuffer;
    this.sourceNode.connect(this.audioContext.destination);
    this.sourceNode.onended = () => {
      if (this.isPlaying) {
        this.stop();
        this.endListeners.forEach((l) => l());
      }
    };
    this.startTime = this.audioContext.currentTime;
    this.currentBeatIndex = -1;
    this.sourceNode.start(0);
    this.isPlaying = true;
    this.loop();
  }

  pause(): void {
    if (this.sourceNode && this.isPlaying) {
      this.sourceNode.stop();
      this.sourceNode.disconnect();
      this.isPlaying = false;
      cancelAnimationFrame(this.rafId);
    }
  }

  stop(): void {
    if (this.sourceNode) {
      try {
        this.sourceNode.stop();
      } catch (_) {}
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }
    this.isPlaying = false;
    cancelAnimationFrame(this.rafId);
    this.currentBeatIndex = -1;
  }

  getCurrentTime(): number {
    if (!this.audioContext || !this.isPlaying) return 0;
    return this.audioContext.currentTime - this.startTime;
  }

  getPlaying(): boolean {
    return this.isPlaying;
  }

  private loop(): void {
    if (!this.isPlaying) return;
    const currentTime = this.getCurrentTime();
    while (
      this.currentBeatIndex + 1 < this.beatTimes.length &&
      this.beatTimes[this.currentBeatIndex + 1] <= currentTime
    ) {
      this.currentBeatIndex++;
      const event: BeatEvent = {
        time: this.beatTimes[this.currentBeatIndex],
        index: this.currentBeatIndex,
        isStrong: this.currentBeatIndex % 4 === 0,
      };
      this.beatListeners.forEach((l) => l(event));
    }
    this.rafId = requestAnimationFrame(() => this.loop());
  }

  findNearestBeat(time: number): BeatEvent | null {
    if (this.beatTimes.length === 0) return null;
    let left = 0;
    let right = this.beatTimes.length - 1;
    while (left <= right) {
      const mid = Math.floor((left + right) / 2);
      if (this.beatTimes[mid] < time) left = mid + 1;
      else right = mid - 1;
    }
    const candidates: number[] = [];
    if (right >= 0) candidates.push(right);
    if (left < this.beatTimes.length) candidates.push(left);
    let bestIdx = -1;
    let bestDiff = Infinity;
    for (const idx of candidates) {
      const diff = Math.abs(this.beatTimes[idx] - time);
      if (diff < bestDiff) {
        bestDiff = diff;
        bestIdx = idx;
      }
    }
    if (bestIdx < 0) return null;
    return {
      time: this.beatTimes[bestIdx],
      index: bestIdx,
      isStrong: bestIdx % 4 === 0,
    };
  }

  isNearBeat(time: number, windowMs: number = 150): { near: boolean; beat: BeatEvent | null; diff: number } {
    const beat = this.findNearestBeat(time);
    if (!beat) return { near: false, beat: null, diff: Infinity };
    const diff = Math.abs(beat.time - time) * 1000;
    return { near: diff <= windowMs, beat, diff };
  }

  destroy(): void {
    this.stop();
    this.beatListeners.clear();
    this.endListeners.clear();
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    this.audioBuffer = null;
  }
}
