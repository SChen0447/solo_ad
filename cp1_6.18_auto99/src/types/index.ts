export type NotePitch =
  | 'C3' | 'C#3' | 'D3' | 'D#3' | 'E3' | 'F3' | 'F#3' | 'G3' | 'G#3' | 'A3' | 'A#3' | 'B3'
  | 'C4' | 'C#4' | 'D4' | 'D#4' | 'E4' | 'F4' | 'F#4' | 'G4' | 'G#4' | 'A4' | 'A#4' | 'B4'
  | 'C5' | 'C#5' | 'D5' | 'D#5' | 'E5' | 'F5' | 'F#5' | 'G5' | 'G#5' | 'A5' | 'A#5' | 'B5'
  | 'C6';

export type NoteDuration = 0.25 | 0.5 | 1 | 2 | 4;

export interface Note {
  id: string;
  pitch: NotePitch;
  duration: NoteDuration;
  startTime: number;
  velocity: number;
  color: string;
  animating?: 'fadeIn' | 'fadeOut' | null;
}

export interface Cursor {
  userId: string;
  userName: string;
  color: string;
  x: number;
  y: number;
  noteId?: string;
}

export type ViewMode = 'staff' | 'jianpu';

export interface Collaborator {
  id: string;
  name: string;
  color: string;
  connected: boolean;
}

export interface ScoreState {
  notes: Note[];
  viewMode: ViewMode;
  bpm: number;
  timeSignature: [number, number];
  selectedNoteId: string | null;
  isPlaying: boolean;
  currentPlayTime: number;
  currentNoteId: string | null;
  collaborators: Collaborator[];
  cursors: Record<string, Cursor>;
  roomCode: string | null;
  isConnected: boolean;
  userId: string;
  userName: string;
  userColor: string;
}

export interface ScoreActions {
  addNote: (note: Note) => void;
  removeNote: (noteId: string) => void;
  updateNote: (noteId: string, updates: Partial<Note>) => void;
  setViewMode: (mode: ViewMode) => void;
  setBpm: (bpm: number) => void;
  setSelectedNote: (noteId: string | null) => void;
  setPlaying: (playing: boolean) => void;
  setCurrentPlayTime: (time: number) => void;
  setCurrentNoteId: (noteId: string | null) => void;
  addCollaborator: (collaborator: Collaborator) => void;
  removeCollaborator: (userId: string) => void;
  updateCursor: (cursor: Cursor) => void;
  removeCursor: (userId: string) => void;
  setRoomCode: (code: string | null) => void;
  setConnected: (connected: boolean) => void;
  setUserName: (name: string) => void;
  loadNotes: (notes: Note[]) => void;
}

export const NOTE_FREQUENCIES: Record<NotePitch, number> = {
  'C3': 130.81, 'C#3': 138.59, 'D3': 146.83, 'D#3': 155.56, 'E3': 164.81, 'F3': 174.61,
  'F#3': 185.00, 'G3': 196.00, 'G#3': 207.65, 'A3': 220.00, 'A#3': 233.08, 'B3': 246.94,
  'C4': 261.63, 'C#4': 277.18, 'D4': 293.66, 'D#4': 311.13, 'E4': 329.63, 'F4': 349.23,
  'F#4': 369.99, 'G4': 392.00, 'G#4': 415.30, 'A4': 440.00, 'A#4': 466.16, 'B4': 493.88,
  'C5': 523.25, 'C#5': 554.37, 'D5': 587.33, 'D#5': 622.25, 'E5': 659.25, 'F5': 698.46,
  'F#5': 739.99, 'G5': 783.99, 'G#5': 830.61, 'A5': 880.00, 'A#5': 932.33, 'B5': 987.77,
  'C6': 1046.50,
};

export const JIANPU_NUMBERS: Record<NotePitch, string> = {
  'C3': '1̣', 'C#3': '#1̣', 'D3': '2̣', 'D#3': '#2̣', 'E3': '3̣', 'F3': '4̣',
  'F#3': '#4̣', 'G3': '5̣', 'G#3': '#5̣', 'A3': '6̣', 'A#3': '#6̣', 'B3': '7̣',
  'C4': '1', 'C#4': '#1', 'D4': '2', 'D#4': '#2', 'E4': '3', 'F4': '4',
  'F#4': '#4', 'G4': '5', 'G#4': '#5', 'A4': '6', 'A#4': '#6', 'B4': '7',
  'C5': '1̇', 'C#5': '#1̇', 'D5': '2̇', 'D#5': '#2̇', 'E5': '3̇', 'F5': '4̇',
  'F#5': '#4̇', 'G5': '5̇', 'G#5': '#5̇', 'A5': '6̇', 'A#5': '#6̇', 'B5': '7̇',
  'C6': '1̈',
};

export const STAFF_POSITIONS: Record<NotePitch, number> = {
  'C3': 14, 'C#3': 14, 'D3': 13, 'D#3': 13, 'E3': 12, 'F3': 11,
  'F#3': 11, 'G3': 10, 'G#3': 10, 'A3': 9, 'A#3': 9, 'B3': 8,
  'C4': 7, 'C#4': 7, 'D4': 6, 'D#4': 6, 'E4': 5, 'F4': 4,
  'F#4': 4, 'G4': 3, 'G#4': 3, 'A4': 2, 'A#4': 2, 'B4': 1,
  'C5': 0, 'C#5': 0, 'D5': -1, 'D#5': -1, 'E5': -2, 'F5': -3,
  'F#5': -3, 'G5': -4, 'G#5': -4, 'A5': -5, 'A#5': -5, 'B5': -6,
  'C6': -7,
};

export const PIANO_KEYS: { pitch: NotePitch; isBlack: boolean }[] = [
  { pitch: 'C3', isBlack: false }, { pitch: 'C#3', isBlack: true },
  { pitch: 'D3', isBlack: false }, { pitch: 'D#3', isBlack: true },
  { pitch: 'E3', isBlack: false },
  { pitch: 'F3', isBlack: false }, { pitch: 'F#3', isBlack: true },
  { pitch: 'G3', isBlack: false }, { pitch: 'G#3', isBlack: true },
  { pitch: 'A3', isBlack: false }, { pitch: 'A#3', isBlack: true },
  { pitch: 'B3', isBlack: false },
  { pitch: 'C4', isBlack: false }, { pitch: 'C#4', isBlack: true },
  { pitch: 'D4', isBlack: false }, { pitch: 'D#4', isBlack: true },
  { pitch: 'E4', isBlack: false },
  { pitch: 'F4', isBlack: false }, { pitch: 'F#4', isBlack: true },
  { pitch: 'G4', isBlack: false }, { pitch: 'G#4', isBlack: true },
  { pitch: 'A4', isBlack: false }, { pitch: 'A#4', isBlack: true },
  { pitch: 'B4', isBlack: false },
  { pitch: 'C5', isBlack: false }, { pitch: 'C#5', isBlack: true },
  { pitch: 'D5', isBlack: false }, { pitch: 'D#5', isBlack: true },
  { pitch: 'E5', isBlack: false },
  { pitch: 'F5', isBlack: false }, { pitch: 'F#5', isBlack: true },
  { pitch: 'G5', isBlack: false }, { pitch: 'G#5', isBlack: true },
  { pitch: 'A5', isBlack: false }, { pitch: 'A#5', isBlack: true },
  { pitch: 'B5', isBlack: false },
  { pitch: 'C6', isBlack: false },
];

export const USER_COLORS = [
  '#ff6b6b', '#48dbfb', '#ffb347', '#a29bfe', '#55efc4',
  '#fd79a8', '#6c5ce7', '#00b894', '#e17055', '#0984e3',
];

export const generateId = (): string =>
  Math.random().toString(36).substring(2, 11) + Date.now().toString(36);

export const generateRoomCode = (): string =>
  Math.random().toString(36).substring(2, 8).toUpperCase();
