import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import type { Note, ScoreState, Track, User } from '../types.js';

export interface CursorInfo {
  x: number;
  y: number;
}

export interface Notification {
  id: string;
  message: string;
  type: 'info' | 'join' | 'leave';
}

interface StoreState extends ScoreState {
  roomId: string | null;
  currentUser: User | null;
  users: User[];
  remoteCursors: Map<string, CursorInfo>;
  isPlaying: boolean;
  playbackHead: number;
  highlightedPitches: Set<number>;
  notifications: Notification[];
  justUpdatedNotes: Set<string>;

  setScore: (score: ScoreState) => void;
  setCurrentTrack: (trackId: string) => void;
  setBPM: (bpm: number) => void;
  setQuantize: (q: number) => void;

  addNote: (note: Note) => void;
  updateNote: (noteId: string, updates: Partial<Note>) => void;
  deleteNote: (noteId: string) => void;

  setPlaying: (p: boolean) => void;
  setPlaybackHead: (h: number) => void;
  setHighlightedPitches: (pitches: Set<number>) => void;
  addHighlightedPitch: (p: number) => void;
  removeHighlightedPitch: (p: number) => void;

  joinRoom: (roomId: string, user: User, score: ScoreState, users: User[]) => void;
  leaveRoom: () => void;
  addUser: (user: User) => void;
  removeUser: (userId: string, users: User[]) => void;
  setUsers: (users: User[]) => void;
  setRemoteCursor: (userId: string, cursor: CursorInfo | null) => void;

  pushNotification: (message: string, type: Notification['type']) => void;
  removeNotification: (id: string) => void;

  markNoteJustUpdated: (noteId: string) => void;
  clearJustUpdated: (noteId: string) => void;
}

function createDefaultTracks(): Track[] {
  return [
    { id: 'track-piano', name: '钢琴', type: 'piano', notes: [] },
    { id: 'track-strings', name: '弦乐', type: 'strings', notes: [] },
    { id: 'track-drums', name: '鼓', type: 'drums', notes: [] },
  ];
}

export const useStore = create<StoreState>((set, get) => ({
  tracks: createDefaultTracks(),
  bpm: 120,
  quantize: 4,
  currentTrackId: 'track-piano',

  roomId: null,
  currentUser: null,
  users: [],
  remoteCursors: new Map(),
  isPlaying: false,
  playbackHead: 0,
  highlightedPitches: new Set(),
  notifications: [],
  justUpdatedNotes: new Set(),

  setScore: (score) => set({
    tracks: score.tracks,
    bpm: score.bpm,
    quantize: score.quantize,
    currentTrackId: score.currentTrackId,
  }),

  setCurrentTrack: (trackId) => set({ currentTrackId: trackId }),

  setBPM: (bpm) => {
    const clamped = Math.max(60, Math.min(180, bpm));
    const state = get();
    set({ bpm: clamped });
  },

  setQuantize: (q) => set({ quantize: q }),

  addNote: (note) => {
    const state = get();
    const tracks = state.tracks.map((t) =>
      t.id === note.trackId
        ? { ...t, notes: [...t.notes, note] }
        : t
    );
    set({ tracks });
  },

  updateNote: (noteId, updates) => {
    const state = get();
    const tracks = state.tracks.map((t) => ({
      ...t,
      notes: t.notes.map((n) => (n.id === noteId ? { ...n, ...updates } : n)),
    }));
    set({ tracks });
  },

  deleteNote: (noteId) => {
    const state = get();
    const tracks = state.tracks.map((t) => ({
      ...t,
      notes: t.notes.filter((n) => n.id !== noteId),
    }));
    set({ tracks });
  },

  setPlaying: (p) => set({ isPlaying: p }),
  setPlaybackHead: (h) => set({ playbackHead: h }),
  setHighlightedPitches: (pitches) => set({ highlightedPitches: new Set(pitches) }),
  addHighlightedPitch: (p) => {
    const s = new Set(get().highlightedPitches);
    s.add(p);
    set({ highlightedPitches: s });
  },
  removeHighlightedPitch: (p) => {
    const s = new Set(get().highlightedPitches);
    s.delete(p);
    set({ highlightedPitches: s });
  },

  joinRoom: (roomId, user, score, users) => set({
    roomId,
    currentUser: user,
    users,
    tracks: score.tracks,
    bpm: score.bpm,
    quantize: score.quantize,
    currentTrackId: score.currentTrackId,
  }),

  leaveRoom: () => set({
    roomId: null,
    currentUser: null,
    users: [],
    remoteCursors: new Map(),
    tracks: createDefaultTracks(),
    currentTrackId: 'track-piano',
  }),

  addUser: (user) => {
    const state = get();
    if (state.users.find((u) => u.id === user.id)) return;
    set({ users: [...state.users, user] });
  },

  removeUser: (userId, users) => set({ users }),

  setUsers: (users) => set({ users }),

  setRemoteCursor: (userId, cursor) => {
    const m = new Map(get().remoteCursors);
    if (cursor) m.set(userId, cursor);
    else m.delete(userId);
    set({ remoteCursors: m });
  },

  pushNotification: (message, type) => {
    const id = uuidv4();
    set({ notifications: [...get().notifications, { id, message, type }] });
    setTimeout(() => get().removeNotification(id), 2000);
  },

  removeNotification: (id) => {
    set({ notifications: get().notifications.filter((n) => n.id !== id) });
  },

  markNoteJustUpdated: (noteId) => {
    const s = new Set(get().justUpdatedNotes);
    s.add(noteId);
    set({ justUpdatedNotes: s });
    setTimeout(() => get().clearJustUpdated(noteId), 300);
  },

  clearJustUpdated: (noteId) => {
    const s = new Set(get().justUpdatedNotes);
    s.delete(noteId);
    set({ justUpdatedNotes: s });
  },
}));
