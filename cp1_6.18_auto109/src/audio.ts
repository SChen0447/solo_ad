export interface BeatPoint {
  time: number;
  strength: number;
}

export class AudioManager {
  private audioContext: AudioContext | null = null;
  private audioBuffer: AudioBuffer | null = null;
  private sourceNode: AudioBufferSourceNode | null = null;
  private analyser: AnalyserNode | null = null;
  private gainNode: GainNode | null = null;
  private beatPoints: BeatPoint[] = [];
  private bpm: number = 120;
  private startTime: number = 0;
  private isPlaying: boolean = false;
  private duration: number = 0;

  constructor() {}

  async loadAudio(file: File): Promise<void> {
    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    const arrayBuffer = await file.arrayBuffer();
    this.audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
    this.duration = this.audioBuffer.duration;
    
    await this.analyzeBeats();
  }

  private async analyzeBeats(): Promise<void> {
    if (!this.audioBuffer) return;

    const channelData = this.audioBuffer.getChannelData(0);
    const sampleRate = this.audioBuffer.sampleRate;
    const windowSize = Math.floor(sampleRate * 0.05);
    const hopSize = Math.floor(windowSize / 2);
    
    const energy: number[] = [];
    const times: number[] = [];
    
    for (let i = 0; i < channelData.length - windowSize; i += hopSize) {
      let sum = 0;
      for (let j = 0; j < windowSize; j++) {
        sum += Math.abs(channelData[i + j]);
      }
      energy.push(sum / windowSize);
      times.push(i / sampleRate);
    }
    
    const avgEnergy = energy.reduce((a, b) => a + b, 0) / energy.length;
    const variance = energy.reduce((a, b) => a + Math.pow(b - avgEnergy, 2), 0) / energy.length;
    const stdDev = Math.sqrt(variance);
    const strongThreshold = avgEnergy + stdDev * 1.5;
    const weakThreshold = avgEnergy + stdDev * 0.8;
    
    const minBeatInterval = 0.25;
    let lastBeatTime = -minBeatInterval;
    
    this.beatPoints = [];
    
    for (let i = 1; i < energy.length - 1; i++) {
      const currentTime = times[i];
      if (currentTime - lastBeatTime < minBeatInterval) continue;
      
      const isLocalMax = energy[i] > energy[i - 1] && energy[i] > energy[i + 1];
      
      if (isLocalMax) {
        if (energy[i] > strongThreshold) {
          this.beatPoints.push({ time: currentTime, strength: 1.0 });
          lastBeatTime = currentTime;
        } else if (energy[i] > weakThreshold) {
          this.beatPoints.push({ time: currentTime, strength: 0.5 });
          lastBeatTime = currentTime;
        }
      }
    }
    
    if (this.beatPoints.length >= 2) {
      const intervals: number[] = [];
      for (let i = 1; i < this.beatPoints.length; i++) {
        intervals.push(this.beatPoints[i].time - this.beatPoints[i - 1].time);
      }
      intervals.sort((a, b) => a - b);
      const medianInterval = intervals[Math.floor(intervals.length / 2)];
      this.bpm = Math.round(60 / medianInterval);
      this.bpm = Math.max(60, Math.min(200, this.bpm));
    }
    
    if (this.beatPoints.length === 0) {
      const interval = 60 / this.bpm;
      for (let t = 0; t < this.duration; t += interval) {
        this.beatPoints.push({ time: t, strength: 1.0 });
      }
    }
  }

  play(): void {
    if (!this.audioContext || !this.audioBuffer) return;
    
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
    
    this.stop();
    
    this.sourceNode = this.audioContext.createBufferSource();
    this.sourceNode.buffer = this.audioBuffer;
    
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 256;
    
    this.gainNode = this.audioContext.createGain();
    this.gainNode.gain.value = 0.8;
    
    this.sourceNode.connect(this.analyser);
    this.analyser.connect(this.gainNode);
    this.gainNode.connect(this.audioContext.destination);
    
    this.sourceNode.start(0);
    this.startTime = this.audioContext.currentTime;
    this.isPlaying = true;
    
    this.sourceNode.onended = () => {
      this.isPlaying = false;
    };
  }

  stop(): void {
    if (this.sourceNode) {
      try {
        this.sourceNode.stop();
        this.sourceNode.disconnect();
      } catch (e) {}
      this.sourceNode = null;
    }
    this.isPlaying = false;
  }

  getCurrentTime(): number {
    if (!this.audioContext || !this.isPlaying) return 0;
    return this.audioContext.currentTime - this.startTime;
  }

  getBeatPoints(): BeatPoint[] {
    return this.beatPoints;
  }

  getBPM(): number {
    return this.bpm;
  }

  getDuration(): number {
    return this.duration;
  }

  getIsPlaying(): boolean {
    return this.isPlaying;
  }

  getFrequencyData(): Uint8Array {
    if (!this.analyser) return new Uint8Array(0);
    const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteFrequencyData(dataArray);
    return dataArray;
  }

  dispose(): void {
    this.stop();
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    this.audioBuffer = null;
    this.beatPoints = [];
  }
}
