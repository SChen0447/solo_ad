export interface Note {
  id: string;
  pitch: number;
  start: number;
  duration: number;
  trackId: string;
}

export interface Track {
  id: string;
  name: string;
  type: 'piano' | 'strings' | 'drums';
  notes: Note[];
}

export interface ScoreState {
  tracks: Track[];
  bpm: number;
  quantize: number;
  currentTrackId: string;
}

export interface User {
  id: string;
  name: string;
  color: string;
  cursor: { x: number; y: number } | null;
}

export const MIDI_NOTES = {
  MIN_MIDI: 36,
  MAX_MIDI: 108,
  NOTE_COUNT: 73,
};

export function midiToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

export function midiToNoteName(midi: number): string {
  const names = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const octave = Math.floor(midi / 12) - 1;
  return `${names[midi % 12]}${octave}`;
}

export function isBlackKey(midi: number): boolean {
  const n = midi % 12;
  return n === 1 || n === 3 || n === 6 || n === 8 || n === 10;
}

export function getNoteColor(midi: number): string {
  const minMidi = MIDI_NOTES.MIN_MIDI;
  const maxMidi = MIDI_NOTES.MAX_MIDI;
  const t = Math.max(0, Math.min(1, (midi - minMidi) / (maxMidi - minMidi)));
  if (t < 0.33) {
    const r = Math.floor(80 + t * 3 * 20);
    const g = Math.floor(120 + t * 3 * 60);
    const b = Math.floor(220 - t * 3 * 40);
    return `rgb(${r}, ${g}, ${b})`;
  } else if (t < 0.66) {
    const tt = (t - 0.33) * 3;
    const r = Math.floor(100 + tt * 80);
    const g = Math.floor(180 - tt * 40);
    const b = Math.floor(180 - tt * 100);
    return `rgb(${r}, ${g}, ${b})`;
  } else {
    const tt = (t - 0.66) * 3;
    const r = Math.floor(180 + tt * 50);
    const g = Math.floor(140 - tt * 80);
    const b = Math.floor(80 - tt * 40);
    return `rgb(${r}, ${g}, ${b})`;
  }
}

export function quantizeValue(value: number, quantize: number): number {
  if (quantize <= 0) return value;
  const step = 1 / quantize;
  return Math.round(value / step) * step;
}
