import { create } from 'zustand';
import {
  ScoreState,
  ScoreActions,
  Note,
  Collaborator,
  Cursor,
  ViewMode,
  generateId,
  USER_COLORS,
  NoteDuration,
} from '@/types';

const DEFAULT_NOTES: Note[] = [
  { id: generateId(), pitch: 'C4', duration: 1, startTime: 0, velocity: 0.7, color: '#ff6b6b' },
  { id: generateId(), pitch: 'D4', duration: 1, startTime: 1, velocity: 0.7, color: '#48dbfb' },
  { id: generateId(), pitch: 'E4', duration: 1, startTime: 2, velocity: 0.7, color: '#ffb347' },
  { id: generateId(), pitch: 'F4', duration: 1, startTime: 3, velocity: 0.7, color: '#a29bfe' },
  { id: generateId(), pitch: 'G4', duration: 2, startTime: 4, velocity: 0.7, color: '#55efc4' },
  { id: generateId(), pitch: 'E4', duration: 1, startTime: 6, velocity: 0.7, color: '#ffb347' },
  { id: generateId(), pitch: 'C4', duration: 1, startTime: 7, velocity: 0.7, color: '#ff6b6b' },
];

const storedUserId = localStorage.getItem('score_user_id');
const storedUserName = localStorage.getItem('score_user_name');
const storedUserColor = localStorage.getItem('score_user_color');

const userId = storedUserId || generateId();
const userName = storedUserName || `用户${Math.floor(Math.random() * 10000)}`;
const userColor = storedUserColor || USER_COLORS[Math.floor(Math.random() * USER_COLORS.length)];

if (!storedUserId) localStorage.setItem('score_user_id', userId);
if (!storedUserName) localStorage.setItem('score_user_name', userName);
if (!storedUserColor) localStorage.setItem('score_user_color', userColor);

export const useScoreStore = create<ScoreState & ScoreActions>((set, get) => ({
  notes: DEFAULT_NOTES,
  viewMode: 'staff',
  bpm: 100,
  timeSignature: [4, 4],
  selectedNoteId: null,
  isPlaying: false,
  currentPlayTime: 0,
  currentNoteId: null,
  collaborators: [],
  cursors: {},
  roomCode: null,
  isConnected: false,
  userId,
  userName,
  userColor,

  addNote: (note: Note) => {
    set((state) => ({ notes: [...state.notes, { ...note, animating: 'fadeIn' }] }));
    setTimeout(() => {
      set((state) => ({
        notes: state.notes.map((n) => (n.id === note.id ? { ...n, animating: null } : n)),
      }));
    }, 400);
  },

  removeNote: (noteId: string) => {
    set((state) => ({
      notes: state.notes.map((n) => (n.id === noteId ? { ...n, animating: 'fadeOut' } : n)),
    }));
    setTimeout(() => {
      set((state) => ({ notes: state.notes.filter((n) => n.id !== noteId) }));
    }, 300);
  },

  updateNote: (noteId: string, updates: Partial<Note>) => {
    set((state) => ({
      notes: state.notes.map((n) => (n.id === noteId ? { ...n, ...updates } : n)),
    }));
  },

  setViewMode: (mode: ViewMode) => set({ viewMode: mode }),
  setBpm: (bpm: number) => set({ bpm }),
  setSelectedNote: (noteId: string | null) => set({ selectedNoteId: noteId }),
  setPlaying: (playing: boolean) => set({ isPlaying: playing }),
  setCurrentPlayTime: (time: number) => set({ currentPlayTime: time }),
  setCurrentNoteId: (noteId: string | null) => set({ currentNoteId: noteId }),

  addCollaborator: (collaborator: Collaborator) => {
    set((state) => {
      const exists = state.collaborators.some((c) => c.id === collaborator.id);
      if (exists) {
        return {
          collaborators: state.collaborators.map((c) =>
            c.id === collaborator.id ? { ...c, connected: true, ...collaborator } : c
          ),
        };
      }
      return { collaborators: [...state.collaborators, { ...collaborator, connected: true }] };
    });
  },

  removeCollaborator: (userId: string) => {
    set((state) => ({
      collaborators: state.collaborators.map((c) =>
        c.id === userId ? { ...c, connected: false } : c
      ),
    }));
  },

  updateCursor: (cursor: Cursor) => {
    set((state) => ({
      cursors: { ...state.cursors, [cursor.userId]: cursor },
    }));
  },

  removeCursor: (userId: string) => {
    set((state) => {
      const newCursors = { ...state.cursors };
      delete newCursors[userId];
      return { cursors: newCursors };
    });
  },

  setRoomCode: (code: string | null) => set({ roomCode: code }),
  setConnected: (connected: boolean) => set({ isConnected: connected }),

  setUserName: (name: string) => {
    localStorage.setItem('score_user_name', name);
    set({ userName: name });
  },

  loadNotes: (notes: Note[]) => set({ notes }),
}));

export const getNextStartTime = (): number => {
  const notes = useScoreStore.getState().notes;
  if (notes.length === 0) return 0;
  const maxEnd = Math.max(...notes.map((n) => n.startTime + n.duration));
  return Math.ceil(maxEnd * 4) / 4;
};

export const DURATION_OPTIONS: { value: NoteDuration; label: string; symbol: string }[] = [
  { value: 0.25, label: '十六分音符', symbol: '𝅘𝅥𝅯' },
  { value: 0.5, label: '八分音符', symbol: '𝅘𝅥𝅮' },
  { value: 1, label: '四分音符', symbol: '𝅘𝅥' },
  { value: 2, label: '二分音符', symbol: '𝅗𝅥' },
  { value: 4, label: '全音符', symbol: '𝅝' },
];
