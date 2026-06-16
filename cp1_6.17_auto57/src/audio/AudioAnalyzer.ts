export interface BeatInfo {
  time: number;
  intensity: number;
}

export interface BPMResult {
  bpm: number;
  beats: BeatInfo[];
  duration: number;
}

export interface AudioAnalyzerCallbacks {
  onProgress: (percent: number) => void;
  onComplete: (result: BPMResult) => void;
  onError: (error: Error) => void;
}

export class AudioAnalyzer {
  private callbacks: AudioAnalyzerCallbacks;
  private audioBuffer: AudioBuffer | null = null;
  private audioContext: AudioContext | null = null;

  constructor(callbacks: AudioAnalyzerCallbacks) {
    this.callbacks = callbacks;
  }

  async analyze(buffer: ArrayBuffer): Promise<void> {
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.callbacks.onProgress(0.1);

      this.audioBuffer = await this.audioContext.decodeAudioData(
        buffer.slice(0),
        () => {},
        (err) => {
          throw err;
        }
      );

      this.callbacks.onProgress(0.3);

      const channelData = this.audioBuffer.getChannelData(0);
      const sampleRate = this.audioBuffer.sampleRate;
      const duration = this.audioBuffer.duration;

      this.callbacks.onProgress(0.4);

      const bpmResult = this.calculateBPM(channelData, sampleRate, duration);

      this.callbacks.onProgress(1.0);
      this.callbacks.onComplete(bpmResult);
    } catch (error) {
      this.callbacks.onError(error instanceof Error ? error : new Error(String(error)));
    }
  }

  private calculateBPM(
    channelData: Float32Array,
    sampleRate: number,
    duration: number
  ): BPMResult {
    const frameSize = 1024;
    const hopSize = 512;
    const numFrames = Math.floor((channelData.length - frameSize) / hopSize) + 1;

    const bpmCandidates: number[] = [];
    const beatTimes: number[] = [];
    const beatIntensities: number[] = [];

    for (let i = 0; i < numFrames; i++) {
      if (i % Math.floor(numFrames / 20) === 0) {
        const progress = 0.4 + 0.5 * (i / numFrames);
        this.callbacks.onProgress(progress);
      }

      const start = i * hopSize;
      const frame = channelData.subarray(start, start + frameSize);

      const energy = this.calculateEnergy(frame);

      const { bpm, isBeat } = this.autocorrelate(frame, sampleRate);

      if (bpm >= 60 && bpm <= 200 && isBeat) {
        bpmCandidates.push(bpm);
        const beatTime = start / sampleRate;
        beatTimes.push(beatTime);
        beatIntensities.push(energy);
      }
    }

    const sortedBPMs = [...bpmCandidates].sort((a, b) => a - b);
    const medianBPM =
      sortedBPMs.length > 0
        ? sortedBPMs[Math.floor(sortedBPMs.length / 2)]
        : 120;

    const beats: BeatInfo[] = beatTimes.map((time, index) => ({
      time,
      intensity: Math.min(1, beatIntensities[index] * 2),
    }));

    const filteredBeats = this.filterBeatsByBPM(beats, medianBPM, duration);

    return {
      bpm: Math.round(medianBPM * 100) / 100,
      beats: filteredBeats,
      duration,
    };
  }

  private calculateEnergy(frame: Float32Array): number {
    let sum = 0;
    for (let i = 0; i < frame.length; i++) {
      sum += frame[i] * frame[i];
    }
    return Math.sqrt(sum / frame.length);
  }

  private autocorrelate(
    signal: Float32Array,
    sampleRate: number
  ): { bpm: number; isBeat: boolean } {
    const size = signal.length;
    const c = new Float32Array(size);

    for (let i = 0; i < size; i++) {
      for (let j = 0; j < size - i; j++) {
        c[i] += signal[j] * signal[j + i];
      }
    }

    let d = 0;
    while (d < size - 1 && c[d] > c[d + 1]) {
      d++;
    }

    let maxVal = -1;
    let maxPos = -1;

    const minLag = Math.floor(sampleRate / 200);
    const maxLag = Math.floor(sampleRate / 60);

    for (let i = d + minLag; i < d + maxLag && i < size; i++) {
      if (c[i] > maxVal) {
        maxVal = c[i];
        maxPos = i;
      }
    }

    const T0 = d + maxPos;
    const bpm = (60 * sampleRate) / T0;

    const threshold = c[d] * 0.3;
    const isBeat = maxVal > threshold;

    return { bpm, isBeat };
  }

  private filterBeatsByBPM(
    beats: BeatInfo[],
    targetBPM: number,
    duration: number
  ): BeatInfo[] {
    if (beats.length === 0 || targetBPM <= 0) {
      const interval = 60 / (targetBPM || 120);
      const result: BeatInfo[] = [];
      for (let t = 0; t < duration; t += interval) {
        result.push({ time: t, intensity: 0.8 });
      }
      return result;
    }

    const interval = 60 / targetBPM;
    const result: BeatInfo[] = [];

    const sortedBeats = [...beats].sort((a, b) => a.time - b.time);

    for (let t = 0; t < duration; t += interval) {
      let bestBeat: BeatInfo | null = null;
      let bestDiff = Infinity;

      for (const beat of sortedBeats) {
        const diff = Math.abs(beat.time - t);
        if (diff < interval * 0.3 && diff < bestDiff) {
          bestDiff = diff;
          bestBeat = beat;
        }
      }

      if (bestBeat) {
        result.push(bestBeat);
      } else {
        result.push({ time: t, intensity: 0.5 });
      }
    }

    return result;
  }

  getAudioBuffer(): AudioBuffer | null {
    return this.audioBuffer;
  }

  getAudioContext(): AudioContext | null {
    return this.audioContext;
  }

  dispose(): void {
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    this.audioBuffer = null;
  }
}
