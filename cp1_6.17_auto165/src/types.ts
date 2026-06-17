export interface Note {
  id: string;
  pitch: string;
  duration: number;
  measure: number;
  position: number;
  x: number;
  y: number;
  velocity?: number;
  delay?: number;
}

export interface Score {
  id: string;
  title: string;
  timeSignature: string;
  keySignature: string;
  notes: Note[];
  createdAt: string;
  updatedAt: string;
}

export interface Version {
  id: string;
  scoreId: string;
  timestamp: string;
  userId: string;
  userName: string;
  snapshot: Score;
  description: string;
}

export interface User {
  id: string;
  name: string;
  color: string;
  avatar: string;
}

export interface CursorPosition {
  userId: string;
  x: number;
  y: number;
  timestamp: number;
}

export interface OperationTrail {
  id: string;
  userId: string;
  points: { x: number; y: number }[];
  timestamp: number;
}

export type EditType = 'add' | 'delete' | 'update';

export interface EditNoteEvent {
  roomId: string;
  type: EditType;
  note: Note;
  userId: string;
}

export interface NoteAnimation {
  noteId: string;
  type: 'add' | 'drag' | 'highlight';
  startTime: number;
  duration: number;
}

export const COLOR_POOL = [
  '#E74C3C',
  '#3498DB',
  '#2ECC71',
  '#F39C12',
  '#9B59B6',
  '#1ABC9C',
  '#E67E22',
  '#34495E',
];

export const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export const TIME_SIGNATURES = ['4/4', '3/4', '6/8'];

export const KEY_SIGNATURES = [
  'C大调', 'G大调', 'D大调', 'A大调', 'E大调', 'B大调',
  'F大调', '降B大调', '降E大调', '降A大调', '降D大调', '降G大调',
  'A小调', 'E小调', 'B小调', '升F小调', '升C小调', '升G小调',
  'D小调', 'G小调', 'C小调', 'F小调', '降B小调', '降E小调',
];

export const PLAYBACK_SPEEDS = [0.5, 1, 1.5, 2];
