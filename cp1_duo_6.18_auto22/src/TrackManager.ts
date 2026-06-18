import type { WaveformData, TrackEQ } from './AudioEngine';

export interface Track {
  id: string;
  name: string;
  color: string;
  audioBuffer: AudioBuffer | null;
  waveformData: WaveformData | null;
  volume: number;
  muted: boolean;
  solo: boolean;
  eq: TrackEQ;
}

export const TRACK_COLORS = [
  '#ff7043',
  '#66bb6a',
  '#42a5f5',
  '#ab47bc',
  '#ec407a',
  '#ffee58',
  '#26a69a',
  '#78909c',
];

export const MAX_TRACKS = 6;

export type Listener = (tracks: Track[]) => void;

export class TrackManager {
  private tracks: Track[] = [];
  private selectedTrackId: string | null = null;
  private listeners: Set<Listener> = new Set();
  private trackCounter = 0;

  getTracks(): Track[] {
    return [...this.tracks];
  }

  getSelectedTrackId(): string | null {
    return this.selectedTrackId;
  }

  getSelectedTrack(): Track | null {
    return this.tracks.find(t => t.id === this.selectedTrackId) || null;
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    const snapshot = [...this.tracks];
    this.listeners.forEach(l => l(snapshot));
  }

  addTrack(): Track | null {
    if (this.tracks.length >= MAX_TRACKS) return null;

    this.trackCounter++;
    const colorIndex = (this.trackCounter - 1) % TRACK_COLORS.length;

    const track: Track = {
      id: `track-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      name: `音轨 ${this.trackCounter}`,
      color: TRACK_COLORS[colorIndex],
      audioBuffer: null,
      waveformData: null,
      volume: 80,
      muted: false,
      solo: false,
      eq: { low: 0, mid: 0, high: 0 },
    };

    this.tracks.push(track);
    if (!this.selectedTrackId) {
      this.selectedTrackId = track.id;
    }
    this.notify();
    return track;
  }

  removeTrack(id: string): void {
    const index = this.tracks.findIndex(t => t.id === id);
    if (index === -1) return;

    this.tracks.splice(index, 1);
    if (this.selectedTrackId === id) {
      this.selectedTrackId = this.tracks.length > 0 ? this.tracks[0].id : null;
    }
    this.notify();
  }

  selectTrack(id: string): void {
    if (this.selectedTrackId !== id) {
      this.selectedTrackId = id;
      this.notify();
    }
  }

  updateTrack(id: string, updates: Partial<Omit<Track, 'id'>>): void {
    const track = this.tracks.find(t => t.id === id);
    if (track) {
      Object.assign(track, updates);
      this.notify();
    }
  }

  setTrackAudio(id: string, audioBuffer: AudioBuffer, waveformData: WaveformData): void {
    this.updateTrack(id, { audioBuffer, waveformData });
  }

  setVolume(id: string, volume: number): void {
    this.updateTrack(id, { volume: Math.max(0, Math.min(100, volume)) });
  }

  setMuted(id: string, muted: boolean): void {
    this.updateTrack(id, { muted });
  }

  setSolo(id: string, solo: boolean): void {
    this.updateTrack(id, { solo });
  }

  setEQ(id: string, band: 'low' | 'mid' | 'high', value: number): void {
    const track = this.tracks.find(t => t.id === id);
    if (track) {
      track.eq = { ...track.eq, [band]: Math.max(-12, Math.min(12, value)) };
      this.notify();
    }
  }

  renameTrack(id: string, name: string): void {
    this.updateTrack(id, { name: name.trim() || '未命名音轨' });
  }

  clearAll(): void {
    this.tracks = [];
    this.selectedTrackId = null;
    this.trackCounter = 0;
    this.notify();
  }
}

export const trackManager = new TrackManager();
