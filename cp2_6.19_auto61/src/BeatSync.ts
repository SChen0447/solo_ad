export type BeatEvent = {
  beatIndex: number;
  time: number;
  strength: number;
};

export type BeatCallback = (event: BeatEvent) => void;

export class BeatSync {
  private audioContext: AudioContext | null = null;
  private gainNode: GainNode | null = null;
  private isPlaying: boolean = false;
  private beatInterval: number = 0.5;
  private nextBeatTime: number = 0;
  private beatIndex: number = 0;
  private beatCallbacks: BeatCallback[] = [];
  private volume: number = 0.5;
  private startTime: number = 0;
  private schedulerTimer: number | null = null;
  private lookahead: number = 0.025;

  constructor() {}

  public init(): void {
    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    this.gainNode = this.audioContext.createGain();
    this.gainNode.gain.value = this.volume;
    this.gainNode.connect(this.audioContext.destination);
  }

  public start(): void {
    if (!this.audioContext) {
      this.init();
    }
    if (this.audioContext?.state === 'suspended') {
      this.audioContext.resume();
    }
    if (this.isPlaying) return;

    this.isPlaying = true;
    this.startTime = this.audioContext!.currentTime;
    this.nextBeatTime = this.startTime + this.beatInterval;
    this.beatIndex = 0;
    this.scheduleBeats();
  }

  public stop(): void {
    this.isPlaying = false;
    if (this.schedulerTimer !== null) {
      window.clearTimeout(this.schedulerTimer);
      this.schedulerTimer = null;
    }
  }

  public setVolume(value: number): void {
    this.volume = Math.max(0, Math.min(1, value));
    if (this.gainNode) {
      this.gainNode.gain.value = this.volume;
    }
  }

  public getVolume(): number {
    return this.volume;
  }

  public getBeatInterval(): number {
    return this.beatInterval;
  }

  public getCurrentTime(): number {
    if (!this.audioContext) return 0;
    return this.audioContext.currentTime - this.startTime;
  }

  public getBeatProgress(): number {
    if (!this.audioContext || !this.isPlaying) return 0;
    const currentTime = this.audioContext.currentTime;
    const timeSinceStart = currentTime - this.startTime;
    const beatProgress = (timeSinceStart % this.beatInterval) / this.beatInterval;
    return beatProgress;
  }

  public getBeatIndex(): number {
    return this.beatIndex;
  }

  public isBeatNear(threshold: number = 0.1): boolean {
    const progress = this.getBeatProgress();
    return progress < threshold || progress > (1 - threshold);
  }

  public onBeat(callback: BeatCallback): void {
    this.beatCallbacks.push(callback);
  }

  public offBeat(callback: BeatCallback): void {
    this.beatCallbacks = this.beatCallbacks.filter(cb => cb !== callback);
  }

  private scheduleBeats = (): void => {
    if (!this.isPlaying || !this.audioContext) return;

    while (this.nextBeatTime < this.audioContext.currentTime + this.lookahead + 0.1) {
      this.scheduleBeat(this.nextBeatTime);
      this.nextBeatTime += this.beatInterval;
    }

    this.schedulerTimer = window.setTimeout(this.scheduleBeats, 25);
  };

  private scheduleBeat(time: number): void {
    const beatIdx = this.beatIndex++;

    this.triggerBeatSound(time, beatIdx);

    const delay = (time - this.audioContext!.currentTime) * 1000;
    setTimeout(() => {
      const event: BeatEvent = {
        beatIndex: beatIdx,
        time: this.audioContext!.currentTime - this.startTime,
        strength: 1.0
      };
      this.beatCallbacks.forEach(cb => cb(event));
    }, Math.max(0, delay));
  }

  private triggerBeatSound(time: number, beatIdx: number): void {
    if (!this.audioContext || !this.gainNode) return;

    const isDownbeat = beatIdx % 4 === 0;
    const hasSnare = beatIdx % 2 === 1;

    const kickOsc = this.audioContext.createOscillator();
    const kickGain = this.audioContext.createGain();
    kickOsc.type = 'sine';
    kickOsc.frequency.setValueAtTime(isDownbeat ? 150 : 120, time);
    kickOsc.frequency.exponentialRampToValueAtTime(40, time + 0.1);
    kickGain.gain.setValueAtTime(isDownbeat ? 0.8 : 0.6, time);
    kickGain.gain.exponentialRampToValueAtTime(0.001, time + 0.15);
    kickOsc.connect(kickGain);
    kickGain.connect(this.gainNode);
    kickOsc.start(time);
    kickOsc.stop(time + 0.15);

    if (hasSnare) {
      const noiseBuffer = this.createNoiseBuffer();
      const snareSource = this.audioContext.createBufferSource();
      snareSource.buffer = noiseBuffer;
      const snareGain = this.audioContext.createGain();
      const snareFilter = this.audioContext.createBiquadFilter();
      snareFilter.type = 'highpass';
      snareFilter.frequency.value = 1000;
      snareGain.gain.setValueAtTime(0.3, time);
      snareGain.gain.exponentialRampToValueAtTime(0.001, time + 0.12);
      snareSource.connect(snareFilter);
      snareFilter.connect(snareGain);
      snareGain.connect(this.gainNode);
      snareSource.start(time);
      snareSource.stop(time + 0.12);
    }

    const hihatOsc = this.audioContext.createOscillator();
    const hihatGain = this.audioContext.createGain();
    const hihatFilter = this.audioContext.createBiquadFilter();
    hihatOsc.type = 'square';
    hihatOsc.frequency.value = 8000;
    hihatFilter.type = 'highpass';
    hihatFilter.frequency.value = 5000;
    hihatGain.gain.setValueAtTime(0.08, time);
    hihatGain.gain.exponentialRampToValueAtTime(0.001, time + 0.05);
    hihatOsc.connect(hihatFilter);
    hihatFilter.connect(hihatGain);
    hihatGain.connect(this.gainNode);
    hihatOsc.start(time);
    hihatOsc.stop(time + 0.05);

    const bassOsc = this.audioContext.createOscillator();
    const bassGain = this.audioContext.createGain();
    const bassFreq = isDownbeat ? 55 : (hasSnare ? 73 : 65);
    bassOsc.type = 'sawtooth';
    bassOsc.frequency.setValueAtTime(bassFreq, time);
    bassGain.gain.setValueAtTime(0.15, time);
    bassGain.gain.exponentialRampToValueAtTime(0.001, time + 0.2);
    bassOsc.connect(bassGain);
    bassGain.connect(this.gainNode);
    bassOsc.start(time);
    bassOsc.stop(time + 0.2);
  }

  private createNoiseBuffer(): AudioBuffer {
    if (!this.audioContext) throw new Error('AudioContext not initialized');
    const bufferSize = this.audioContext.sampleRate * 0.2;
    const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  public getTimeUntilNextBeat(): number {
    if (!this.audioContext || !this.isPlaying) return this.beatInterval;
    const currentTime = this.audioContext.currentTime;
    const timeSinceStart = currentTime - this.startTime;
    const timeUntilNext = this.beatInterval - (timeSinceStart % this.beatInterval);
    return timeUntilNext;
  }
}
