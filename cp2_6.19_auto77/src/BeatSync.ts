export type BeatCallback = (beatIndex: number, time: number) => void;

export class BeatSync {
  private audioContext: AudioContext | null = null;
  private beatInterval = 0.5;
  private nextBeatTime = 0;
  private beatIndex = 0;
  private startTime = 0;
  private onBeatCallbacks: BeatCallback[] = [];
  private onPreBeatCallbacks: BeatCallback[] = [];
  private running = false;
  private volume = 0.5;
  private gainNode: GainNode | null = null;
  private scheduledBeats: Set<number> = new Set();

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

    this.startTime = this.audioContext.currentTime;
    this.nextBeatTime = this.startTime + this.beatInterval;
    this.beatIndex = 0;
    this.scheduledBeats.clear();
    this.running = true;
  }

  public stop(): void {
    this.running = false;
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
    if (!this.running) return 0;
    const elapsed = this.getCurrentTime() - this.startTime;
    return (elapsed % this.beatInterval) / this.beatInterval;
  }

  public getBeatIndex(): number {
    return this.beatIndex;
  }

  public isRunning(): boolean {
    return this.running;
  }

  public update(): void {
    if (!this.running || !this.audioContext) return;
    const now = this.audioContext.currentTime;

    while (this.nextBeatTime - now < 0.3) {
      const beatIdx = this.beatIndex;
      const beatTime = this.nextBeatTime;

      if (!this.scheduledBeats.has(beatIdx)) {
        this.scheduledBeats.add(beatIdx);
        this.scheduleKick(beatTime);
        this.scheduleHat(beatTime + this.beatInterval * 0.5);

        const preBeatDelay = 0.1;
        const preBeatTime = beatTime - preBeatDelay;
        if (preBeatTime > now) {
          setTimeout(() => {
            if (this.running) {
              for (const cb of this.onPreBeatCallbacks) cb(beatIdx, preBeatTime);
            }
          }, Math.max(0, (preBeatTime - now) * 1000));
        }

        const beatDelay = Math.max(0, (beatTime - now) * 1000);
        setTimeout(() => {
          if (this.running) {
            for (const cb of this.onBeatCallbacks) cb(beatIdx, beatTime);
          }
        }, beatDelay);
      }

      this.beatIndex++;
      this.nextBeatTime += this.beatInterval;
    }

    const elapsed = now - this.startTime;
    const expectedIndex = Math.floor(elapsed / this.beatInterval);
    if (expectedIndex > this.beatIndex) {
      this.beatIndex = expectedIndex;
      this.nextBeatTime = this.startTime + (this.beatIndex + 1) * this.beatInterval;
    }
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
