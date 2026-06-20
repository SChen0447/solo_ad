import * as Tone from 'tone';
import { Note, DURATION_VALUES } from './NoteEditor';
import { musicApi, ChordData } from '../api/musicApi';

export interface PlaybackState {
  isPlaying: boolean;
  currentBeat: number;
  bpm: number;
  speed: number;
}

export type PlaybackCallback = (state: PlaybackState) => void;
export type ChordCallback = (chords: ChordData[]) => void;
export type NoteOnCallback = (note: Note, time: number) => void;

export class PlaybackEngine {
  private synth: Tone.PolySynth | null = null;
  private part: Tone.Part | null = null;
  private transport: typeof Tone.Transport;
  private bpm: number = 120;
  private speed: number = 1;
  private isPlaying: boolean = false;
  private currentBeat: number = 0;
  private notes: Note[] = [];
  private playbackCallbacks: Set<PlaybackCallback> = new Set();
  private chordCallbacks: Set<ChordCallback> = new Set();
  private noteOnCallbacks: Set<NoteOnCallback> = new Set();
  private animationFrameId: number | null = null;
  private chords: ChordData[] = [];

  constructor() {
    this.transport = Tone.Transport;
    this.initializeSynth();
  }

  private initializeSynth(): void {
    this.synth = new Tone.PolySynth(Tone.Synth, {
      oscillator: {
        type: 'sine',
      },
      envelope: {
        attack: 0.02,
        decay: 0.3,
        sustain: 0.4,
        release: 0.8,
      },
    }).toDestination();
  }

  private notifyPlaybackUpdate(): void {
    const state: PlaybackState = {
      isPlaying: this.isPlaying,
      currentBeat: this.currentBeat,
      bpm: this.bpm,
      speed: this.speed,
    };
    this.playbackCallbacks.forEach(cb => cb(state));
  }

  private notifyChordUpdate(): void {
    this.chordCallbacks.forEach(cb => cb(this.chords));
  }

  private notifyNoteOn(note: Note, time: number): void {
    this.noteOnCallbacks.forEach(cb => cb(note, time));
  }

  async setNotes(notes: Note[]): Promise<void> {
    this.notes = notes;
    this.rebuildPart();
    await this.analyzeChords();
  }

  private rebuildPart(): void {
    if (this.part) {
      this.part.dispose();
      this.part = null;
    }

    if (!this.synth || this.notes.length === 0) return;

    const events = this.notes.map(note => ({
      time: note.beat * (60 / this.bpm),
      note: note.pitch,
      duration: DURATION_VALUES[note.duration] * (60 / this.bpm),
      originalNote: note,
    }));

    this.part = new Tone.Part((time, value) => {
      this.synth?.triggerAttackRelease(value.note, value.duration, time);
      this.notifyNoteOn(value.originalNote, time);
    }, events);

    this.part.start(0);
  }

  async analyzeChords(): Promise<void> {
    try {
      const response = await musicApi.analyzeChords(this.notes, 4);
      this.chords = response.chords;
      this.notifyChordUpdate();
    } catch (e) {
      console.error('和弦分析失败:', e);
    }
  }

  async convertToAudio(): Promise<Blob | null> {
    try {
      return await musicApi.convertMidiToAudio(this.notes, this.bpm);
    } catch (e) {
      console.error('MIDI转音频失败:', e);
      return null;
    }
  }

  async play(): Promise<void> {
    if (this.isPlaying) return;

    await Tone.start();
    
    this.transport.bpm.value = this.bpm * this.speed;
    
    if (this.currentBeat > 0) {
      const timeOffset = this.currentBeat * (60 / this.bpm);
      this.transport.seconds = timeOffset;
    } else {
      this.transport.seconds = 0;
    }

    this.transport.start();
    this.isPlaying = true;
    this.notifyPlaybackUpdate();
    this.startProgressLoop();
  }

  pause(): void {
    if (!this.isPlaying) return;

    this.transport.pause();
    this.isPlaying = false;
    this.notifyPlaybackUpdate();
    this.stopProgressLoop();
  }

  async togglePlay(): Promise<void> {
    if (this.isPlaying) {
      this.pause();
    } else {
      await this.play();
    }
  }

  stop(): void {
    this.transport.stop();
    this.isPlaying = false;
    this.currentBeat = 0;
    this.notifyPlaybackUpdate();
    this.stopProgressLoop();
  }

  seek(beat: number): void {
    const maxBeat = this.getTotalDuration();
    this.currentBeat = Math.max(0, Math.min(maxBeat, beat));
    
    if (this.isPlaying) {
      const timeOffset = this.currentBeat * (60 / this.bpm);
      this.transport.seconds = timeOffset;
    }
    
    this.notifyPlaybackUpdate();
  }

  setBpm(bpm: number): void {
    this.bpm = Math.max(40, Math.min(240, bpm));
    this.transport.bpm.value = this.bpm * this.speed;
    this.rebuildPart();
    this.notifyPlaybackUpdate();
  }

  getBpm(): number {
    return this.bpm;
  }

  setSpeed(speed: number): void {
    this.speed = Math.max(0.5, Math.min(2, speed));
    this.transport.bpm.value = this.bpm * this.speed;
    this.notifyPlaybackUpdate();
  }

  getSpeed(): number {
    return this.speed;
  }

  getTotalDuration(): number {
    if (this.notes.length === 0) return 0;
    return Math.max(...this.notes.map(n => n.beat + DURATION_VALUES[n.duration]));
  }

  private startProgressLoop(): void {
    const updateProgress = () => {
      if (!this.isPlaying) return;

      const currentSeconds = this.transport.seconds;
      this.currentBeat = currentSeconds * (this.bpm / 60);
      
      const maxBeat = this.getTotalDuration();
      if (this.currentBeat >= maxBeat) {
        this.stop();
        return;
      }

      this.notifyPlaybackUpdate();
      this.animationFrameId = requestAnimationFrame(updateProgress);
    };

    this.animationFrameId = requestAnimationFrame(updateProgress);
  }

  private stopProgressLoop(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  onPlaybackChange(callback: PlaybackCallback): () => void {
    this.playbackCallbacks.add(callback);
    return () => this.playbackCallbacks.delete(callback);
  }

  onChordChange(callback: ChordCallback): () => void {
    this.chordCallbacks.add(callback);
    return () => this.chordCallbacks.delete(callback);
  }

  onNoteOn(callback: NoteOnCallback): () => void {
    this.noteOnCallbacks.add(callback);
    return () => this.noteOnCallbacks.delete(callback);
  }

  previewNote(pitch: string, duration: string = 'quarter'): void {
    if (!this.synth) return;
    
    const noteDuration = DURATION_VALUES[duration as keyof typeof DURATION_VALUES] || 1;
    const durationInSeconds = noteDuration * (60 / this.bpm);
    
    this.synth.triggerAttackRelease(pitch, durationInSeconds);
  }

  getChords(): ChordData[] {
    return this.chords;
  }

  getState(): PlaybackState {
    return {
      isPlaying: this.isPlaying,
      currentBeat: this.currentBeat,
      bpm: this.bpm,
      speed: this.speed,
    };
  }

  dispose(): void {
    this.stopProgressLoop();
    if (this.part) {
      this.part.dispose();
    }
    if (this.synth) {
      this.synth.dispose();
    }
    this.transport.stop();
    this.playbackCallbacks.clear();
    this.chordCallbacks.clear();
    this.noteOnCallbacks.clear();
  }
}

export default PlaybackEngine;
