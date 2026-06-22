export type BeatMode = 'quarter' | 'eighth';

export type MetronomeEvent = 'start' | 'stop' | 'beat';

export class MetronomeEngine {
  private audioContext: AudioContext | null = null;
  private masterGainNode: GainNode | null = null;
  private analyserNode: AnalyserNode | null = null;
  private bpm: number;
  private volume: number;
  private mode: BeatMode;
  private isPlaying: boolean = false;
  private nextNoteTime: number = 0;
  private currentBeat: number = 0;
  private schedulerTimer: number | null = null;
  private eventListeners: Map<MetronomeEvent, Set<(time: number) => void>> = new Map();
  
  private readonly lookahead: number = 25;
  private readonly scheduleAheadTime: number = 0.1;
  private readonly noteLength: number = 0.05;
  private readonly accentFreq: number = 1000;
  private readonly normalFreq: number = 800;

  constructor(bpm: number = 120, volume: number = 50, mode: BeatMode = 'quarter') {
    this.bpm = bpm;
    this.volume = volume;
    this.mode = mode;
  }

  private initAudioContext(): void {
    if (this.audioContext) return;
    
    this.audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    
    this.masterGainNode = this.audioContext.createGain();
    this.masterGainNode.gain.value = this.volume / 100;
    this.masterGainNode.connect(this.audioContext.destination);
    
    this.analyserNode = this.audioContext.createAnalyser();
    this.analyserNode.fftSize = 64;
    this.masterGainNode.connect(this.analyserNode);
  }

  private secondsPerSubdivision(): number {
    const secondsPerBeat = 60.0 / this.bpm;
    const subdivisions = this.mode === 'quarter' ? 1 : 2;
    return secondsPerBeat / subdivisions;
  }

  private nextNote(): void {
    this.nextNoteTime += this.secondsPerSubdivision();
    this.currentBeat++;
    const subdivisions = this.mode === 'quarter' ? 1 : 2;
    if (this.currentBeat >= subdivisions * 4) {
      this.currentBeat = 0;
    }
  }

  private scheduleNote(time: number, isAccent: boolean): void {
    if (!this.audioContext || !this.masterGainNode) return;

    const osc = this.audioContext.createOscillator();
    const noteGain = this.audioContext.createGain();

    osc.frequency.value = isAccent ? this.accentFreq : this.normalFreq;
    osc.type = 'sine';

    noteGain.gain.setValueAtTime(0, time);
    noteGain.gain.linearRampToValueAtTime(0.5, time + 0.001);
    noteGain.gain.exponentialRampToValueAtTime(0.001, time + this.noteLength);

    osc.connect(noteGain);
    noteGain.connect(this.masterGainNode);

    osc.start(time);
    osc.stop(time + this.noteLength);

    this.emit('beat', time);
  }

  private scheduler = (): void => {
    if (!this.audioContext || !this.isPlaying) return;

    while (this.nextNoteTime < this.audioContext.currentTime + this.scheduleAheadTime) {
      const subdivisions = this.mode === 'quarter' ? 1 : 2;
      const isAccent = this.currentBeat % subdivisions === 0 && this.currentBeat % (subdivisions * 4) === 0;
      this.scheduleNote(this.nextNoteTime, isAccent);
      this.nextNote();
    }
  };

  start(): void {
    if (this.isPlaying) return;

    this.initAudioContext();
    
    if (!this.audioContext) return;

    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }

    this.isPlaying = true;
    this.currentBeat = 0;
    this.nextNoteTime = this.audioContext.currentTime + 0.05;

    this.schedulerTimer = window.setInterval(this.scheduler, this.lookahead);

    this.scheduler();
    this.emit('start', this.audioContext.currentTime);
  }

  stop(): void {
    if (!this.isPlaying) return;

    this.isPlaying = false;
    
    if (this.schedulerTimer) {
      clearInterval(this.schedulerTimer);
      this.schedulerTimer = null;
    }

    if (this.audioContext) {
      this.emit('stop', this.audioContext.currentTime);
    }
  }

  setBPM(bpm: number): void {
    this.bpm = Math.max(20, Math.min(300, bpm));
  }

  getBPM(): number {
    return this.bpm;
  }

  setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(100, volume));
    if (this.masterGainNode && this.audioContext) {
      this.masterGainNode.gain.setTargetAtTime(this.volume / 100, this.audioContext.currentTime, 0.01);
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

  getCurrentTime(): number {
    return this.audioContext?.currentTime || 0;
  }

  on(event: MetronomeEvent, callback: (time: number) => void): () => void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)?.add(callback);
    
    return () => {
      this.eventListeners.get(event)?.delete(callback);
    };
  }

  private emit(event: MetronomeEvent, time: number): void {
    this.eventListeners.get(event)?.forEach(callback => {
      callback(time);
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
