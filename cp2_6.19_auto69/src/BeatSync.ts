export interface BeatEvent {
  time: number;
  beatIndex: number;
}

export type BeatCallback = (event: BeatEvent) => void;

export class BeatSync {
  private audioContext: AudioContext | null = null;
  private interval = 0.5;
  private nextBeatTime = 0;
  private beatIndex = 0;
  private isRunning = false;
  private schedulerTimer: number | null = null;
  private scheduleAheadTime = 0.1;
  private lookAheadMs = 25;
  private onBeat: BeatCallback | null = null;
  private lastBeatProcessed = -1;
  private gainNode: GainNode | null = null;
  private volume = 0.5;

  start(callback: BeatCallback): void {
    this.onBeat = callback;
    this.audioContext = new AudioContext();
    this.gainNode = this.audioContext.createGain();
    this.gainNode.gain.value = this.volume;
    this.gainNode.connect(this.audioContext.destination);
    this.nextBeatTime = this.audioContext.currentTime + 0.1;
    this.beatIndex = 0;
    this.isRunning = true;
    this.lastBeatProcessed = -1;
    this.schedule();
  }

  private schedule(): void {
    if (!this.isRunning || !this.audioContext) return;
    while (this.nextBeatTime < this.audioContext.currentTime + this.scheduleAheadTime) {
      this.playKick(this.nextBeatTime);
      this.playHiHat(this.nextBeatTime + this.interval / 2);
      const event: BeatEvent = {
        time: this.nextBeatTime,
        beatIndex: this.beatIndex,
      };
      if (this.onBeat) {
        this.onBeat(event);
      }
      this.beatIndex++;
      this.nextBeatTime += this.interval;
    }
    this.schedulerTimer = window.setTimeout(() => this.schedule(), this.lookAheadMs);
  }

  private playKick(time: number): void {
    if (!this.audioContext || !this.gainNode) return;
    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(150, time);
    osc.frequency.exponentialRampToValueAtTime(30, time + 0.1);
    gain.gain.setValueAtTime(0.8, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.15);
    osc.connect(gain);
    gain.connect(this.gainNode);
    osc.start(time);
    osc.stop(time + 0.15);
  }

  private playHiHat(time: number): void {
    if (!this.audioContext || !this.gainNode) return;
    const bufferSize = this.audioContext.sampleRate * 0.05;
    const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 3);
    }
    const source = this.audioContext.createBufferSource();
    source.buffer = buffer;
    const gain = this.audioContext.createGain();
    gain.gain.setValueAtTime(0.3, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.05);
    const filter = this.audioContext.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 7000;
    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.gainNode);
    source.start(time);
  }

  stop(): void {
    this.isRunning = false;
    if (this.schedulerTimer !== null) {
      clearTimeout(this.schedulerTimer);
      this.schedulerTimer = null;
    }
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    this.gainNode = null;
    this.lastBeatProcessed = -1;
  }

  getCurrentTime(): number {
    return this.audioContext ? this.audioContext.currentTime : 0;
  }

  getBeatProgress(): number {
    if (!this.audioContext || !this.isRunning) return 0;
    const elapsed = this.audioContext.currentTime - (this.nextBeatTime - this.interval);
    return Math.max(0, Math.min(1, elapsed / this.interval));
  }

  getIsOnBeat(): boolean {
    if (!this.audioContext || !this.isRunning) return false;
    const progress = this.getBeatProgress();
    return progress < 0.15 || progress > 0.85;
  }

  getLastBeatProcessed(): number {
    return this.lastBeatProcessed;
  }

  setLastBeatProcessed(index: number): void {
    this.lastBeatProcessed = index;
  }

  setVolume(v: number): void {
    this.volume = v;
    if (this.gainNode) {
      this.gainNode.gain.value = v;
    }
  }

  getVolume(): number {
    return this.volume;
  }

  getInterval(): number {
    return this.interval;
  }

  getIsRunning(): boolean {
    return this.isRunning;
  }

  getNextBeatTime(): number {
    return this.nextBeatTime;
  }
}
