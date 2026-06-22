export type BeatMode = 'quarter' | 'eighth';

export type MetronomeEvent = 'start' | 'stop' | 'beat';

export class MetronomeEngine {
  private audioContext: AudioContext | null = null;
  private gainNode: GainNode | null = null;
  private analyserNode: AnalyserNode | null = null;
  private bpm: number;
  private volume: number;
  private mode: BeatMode;
  private isPlaying: boolean = false;
  private nextNoteTime: number = 0;
  private currentBeat: number = 0;
  private schedulerTimer: number | null = null;
  private eventListeners: Map<MetronomeEvent, Set<() => void>> = new Map();
  private readonly lookahead: number = 25;
  private readonly scheduleAheadTime: number = 0.1;

  constructor(bpm: number = 120, volume: number = 50, mode: BeatMode = 'quarter') {
    this.bpm = bpm;
    this.volume = volume;
    this.mode = mode;
  }

  private initAudioContext(): void {
    if (this.audioContext) return;
    
    this.audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    
    this.gainNode = this.audioContext.createGain();
    this.gainNode.gain.value = this.volume / 100;
    this.gainNode.connect(this.audioContext.destination);
    
    this.analyserNode = this.audioContext.createAnalyser();
    this.analyserNode.fftSize = 64;
    this.gainNode.connect(this.analyserNode);
  }

  private nextNote(): void {
    const secondsPerBeat = 60.0 / this.bpm;
    const subdivisions = this.mode === 'quarter' ? 1 : 2;
    this.nextNoteTime += secondsPerBeat / subdivisions;
    this.currentBeat++;
    if (this.currentBeat >= subdivisions * 4) {
      this.currentBeat = 0;
    }
  }

  private scheduleNote(time: number): void {
    if (!this.audioContext || !this.gainNode) return;

    const osc = this.audioContext.createOscillator();
    const noteGain = this.audioContext.createGain();

    const isAccent = this.currentBeat % (this.mode === 'quarter' ? 1 : 2) === 0;
    const freq = isAccent ? 1000 : 800;

    osc.frequency.value = freq;
    osc.type = 'sine';

    noteGain.gain.value = 0;
    noteGain.gain.setValueAtTime(0, time);
    noteGain.gain.linearRampToValueAtTime(this.volume / 100 * 0.5, time + 0.001);
    noteGain.gain.exponentialRampToValueAtTime(0.001, time + 0.05);

    osc.connect(noteGain);
    noteGain.connect(this.gainNode);

    osc.start(time);
    osc.stop(time + 0.05);

    this.emit('beat');
  }

  private scheduler(): void {
    while (this.nextNoteTime < (this.audioContext?.currentTime || 0) + this.scheduleAheadTime) {
      this.scheduleNote(this.nextNoteTime);
      this.nextNote();
    }
  }

  start(): void {
    if (this.isPlaying) return;

    this.initAudioContext();
    
    if (this.audioContext?.state === 'suspended') {
      this.audioContext.resume();
    }

    this.isPlaying = true;
    this.currentBeat = 0;
    this.nextNoteTime = this.audioContext?.currentTime || 0;

    this.schedulerTimer = window.setInterval(() => {
      this.scheduler();
    }, this.lookahead);

    this.emit('start');
  }

  stop(): void {
    if (!this.isPlaying) return;

    this.isPlaying = false;
    
    if (this.schedulerTimer) {
      clearInterval(this.schedulerTimer);
      this.schedulerTimer = null;
    }

    this.emit('stop');
  }

  setBPM(bpm: number): void {
    this.bpm = Math.max(20, Math.min(300, bpm));
  }

  getBPM(): number {
    return this.bpm;
  }

  setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(100, volume));
    if (this.gainNode) {
      this.gainNode.gain.value = this.volume / 100;
    }
  }

  getVolume(): number {
    return this.volume;
  }

  setMode(mode: BeatMode): void {
    this.mode = mode;
  }

  getMode(): BeatMode {
    return this.mode;
  }

  getIsPlaying(): boolean {
    return this.isPlaying;
  }

  getAnalyserNode(): AnalyserNode | null {
    return this.analyserNode;
  }

  getAudioContext(): AudioContext | null {
    return this.audioContext;
  }

  on(event: MetronomeEvent, callback: () => void): () => void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)?.add(callback);
    
    return () => {
      this.eventListeners.get(event)?.delete(callback);
    };
  }

  private emit(event: MetronomeEvent): void {
    this.eventListeners.get(event)?.forEach(callback => {
      callback();
    });
  }

  destroy(): void {
    this.stop();
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    this.eventListeners.clear();
  }
}
