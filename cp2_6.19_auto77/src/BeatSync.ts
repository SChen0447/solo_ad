export type BeatCallback = (beatIndex: number, time: number) => void;

export class BeatSync {
  private audioContext: AudioContext | null = null;
  private beatInterval = 0.5;
  private startTime = 0;
  private nextNoteTime = 0;
  private currentBeatIndex = 0;
  private lastScheduledBeat = -1;
  private lastDetectedBeat = -1;

  private onBeatCallbacks: BeatCallback[] = [];
  private onPreBeatCallbacks: BeatCallback[] = [];

  private running = false;
  private volume = 0.5;
  private gainNode: GainNode | null = null;

  private schedulerTimer: number | null = null;
  private lookahead = 0.1;
  private scheduleAheadTime = 0.3;

  private preBeatNotified: Set<number> = new Set();

  public getBeatInterval(): number {
    return this.beatInterval;
  }

  public setVolume(v: number): void {
    this.volume = Math.max(0, Math.min(1, v));
    if (this.gainNode) {
      this.gainNode.gain.value = this.volume;
    }
  }

  public getVolume(): number {
    return this.volume;
  }

  public onBeat(cb: BeatCallback): void {
    this.onBeatCallbacks.push(cb);
  }

  public onPreBeat(cb: BeatCallback): void {
    this.onPreBeatCallbacks.push(cb);
  }

  public async start(): Promise<void> {
    if (this.running) return;
    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
    this.gainNode = this.audioContext.createGain();
    this.gainNode.gain.value = this.volume;
    this.gainNode.connect(this.audioContext.destination);

    this.startTime = this.audioContext.currentTime + 0.05;
    this.nextNoteTime = this.startTime;
    this.currentBeatIndex = 0;
    this.lastScheduledBeat = -1;
    this.lastDetectedBeat = -1;
    this.preBeatNotified.clear();
    this.running = true;

    this.schedulerTimer = window.setInterval(() => this.scheduler(), this.lookahead * 1000);
  }

  public stop(): void {
    this.running = false;
    if (this.schedulerTimer) {
      clearInterval(this.schedulerTimer);
      this.schedulerTimer = null;
    }
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    this.gainNode = null;
  }

  public getCurrentTime(): number {
    return this.audioContext ? this.audioContext.currentTime : 0;
  }

  public getBeatProgress(): number {
    if (!this.running || !this.audioContext) return 0;
    const elapsed = this.audioContext.currentTime - this.startTime;
    if (elapsed < 0) return 0;
    return (elapsed % this.beatInterval) / this.beatInterval;
  }

  public getBeatIndex(): number {
    if (!this.running || !this.audioContext) return 0;
    const elapsed = this.audioContext.currentTime - this.startTime;
    if (elapsed < 0) return -1;
    return Math.floor(elapsed / this.beatInterval);
  }

  public isRunning(): boolean {
    return this.running;
  }

  private scheduler(): void {
    if (!this.running || !this.audioContext) return;
    const now = this.audioContext.currentTime;

    while (this.nextNoteTime < now + this.scheduleAheadTime) {
      const beatIndex = this.lastScheduledBeat + 1;
      this.scheduleKick(this.nextNoteTime);
      this.scheduleHat(this.nextNoteTime + this.beatInterval * 0.5);
      this.lastScheduledBeat = beatIndex;
      this.nextNoteTime += this.beatInterval;
    }
  }

  public update(): void {
    if (!this.running || !this.audioContext) return;

    const now = this.audioContext.currentTime;
    const elapsed = now - this.startTime;
    if (elapsed < 0) return;

    const beatIndex = Math.floor(elapsed / this.beatInterval);
    const beatProgress = (elapsed % this.beatInterval) / this.beatInterval;

    if (beatIndex > this.lastDetectedBeat) {
      for (let i = this.lastDetectedBeat + 1; i <= beatIndex; i++) {
        const beatTime = this.startTime + i * this.beatInterval;
        for (const cb of this.onBeatCallbacks) cb(i, beatTime);
      }
      this.lastDetectedBeat = beatIndex;
      this.preBeatNotified.clear();
    }

    const preBeatThreshold = 0.8;
    if (beatProgress >= preBeatThreshold && !this.preBeatNotified.has(beatIndex + 1)) {
      this.preBeatNotified.add(beatIndex + 1);
      const preBeatTime = this.startTime + (beatIndex + 1) * this.beatInterval - 0.1;
      for (const cb of this.onPreBeatCallbacks) cb(beatIndex + 1, preBeatTime);
    }

    this.currentBeatIndex = beatIndex;
  }

  private scheduleKick(time: number): void {
    if (!this.audioContext || !this.gainNode) return;
    const ctx = this.audioContext;

    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(150, time);
    osc.frequency.exponentialRampToValueAtTime(40, time + 0.1);
    oscGain.gain.setValueAtTime(0.8, time);
    oscGain.gain.exponentialRampToValueAtTime(0.001, time + 0.2);
    osc.connect(oscGain).connect(this.gainNode);
    osc.start(time);
    osc.stop(time + 0.2);

    const noise = ctx.createBufferSource();
    const buffer = ctx.createBuffer(1, ctx.sampleRate * 0.05, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    }
    noise.buffer = buffer;
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.3, time);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, time + 0.05);
    noise.connect(noiseGain).connect(this.gainNode);
    noise.start(time);
    noise.stop(time + 0.05);
  }

  private scheduleHat(time: number): void {
    if (!this.audioContext || !this.gainNode) return;
    const ctx = this.audioContext;

    const noise = ctx.createBufferSource();
    const buffer = ctx.createBuffer(1, ctx.sampleRate * 0.03, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    }
    noise.buffer = buffer;
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 7000;
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.15, time);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, time + 0.03);
    noise.connect(hp).connect(noiseGain).connect(this.gainNode);
    noise.start(time);
    noise.stop(time + 0.03);
  }
}
