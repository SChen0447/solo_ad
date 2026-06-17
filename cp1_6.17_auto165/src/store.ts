import { create } from 'zustand';
import { Note, Score, Version, User, CursorPosition, OperationTrail, COLOR_POOL } from './types';

interface AppState {
  currentUser: User;
  users: User[];
  score: Score | null;
  versions: Version[];
  cursors: CursorPosition[];
  operationTrails: OperationTrail[];
  isPlaying: boolean;
  playbackSpeed: number;
  currentPlaybackTime: number;
  highlightedNoteIds: string[];
  isMobile: boolean;
  isRightPanelOpen: boolean;
  saveInterval: number | null;
  setCurrentUser: (user: User) => void;
  setUsers: (users: User[]) => void;
  addUser: (user: User) => void;
  removeUser: (userId: string) => void;
  setScore: (score: Score) => void;
  updateNote: (type: 'add' | 'delete' | 'update', note: Note) => void;
  setVersions: (versions: Version[]) => void;
  addVersion: (version: Version) => void;
  setCursor: (userId: string, x: number, y: number) => void;
  addOperationTrail: (trail: OperationTrail) => void;
  removeOperationTrail: (trailId: string) => void;
  setIsPlaying: (isPlaying: boolean) => void;
  setPlaybackSpeed: (speed: number) => void;
  setCurrentPlaybackTime: (time: number) => void;
  setHighlightedNoteIds: (ids: string[]) => void;
  setIsMobile: (isMobile: boolean) => void;
  setIsRightPanelOpen: (isOpen: boolean) => void;
  setSaveInterval: (interval: number | null) => void;
}

const generateUserId = () => Math.random().toString(36).substring(2, 9);
const generateUserName = () => {
  const names = ['小明', '小红', '小刚', '小丽', '阿强', '小美', '大伟', '小芳'];
  return names[Math.floor(Math.random() * names.length)] + Math.floor(Math.random() * 100);
};

const generateInitialUser = (): User => {
  const colorIndex = Math.floor(Math.random() * COLOR_POOL.length);
  return {
    id: generateUserId(),
    name: generateUserName(),
    color: COLOR_POOL[colorIndex],
    avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${Date.now()}`,
  };
};

const initialScore: Score = {
  id: 'demo-score-1',
  title: '未命名乐谱',
  timeSignature: '4/4',
  keySignature: 'C大调',
  notes: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

export const useAppStore = create<AppState>((set, get) => ({
  currentUser: generateInitialUser(),
  users: [],
  score: initialScore,
  versions: [],
  cursors: [],
  operationTrails: [],
  isPlaying: false,
  playbackSpeed: 1,
  currentPlaybackTime: 0,
  highlightedNoteIds: [],
  isMobile: window.innerWidth < 768,
  isRightPanelOpen: window.innerWidth >= 768,
  saveInterval: null,

  setCurrentUser: (user) => set({ currentUser: user }),
  setUsers: (users) => set({ users }),
  addUser: (user) => set((state) => ({ users: [...state.users, user] })),
  removeUser: (userId) => set((state) => ({
    users: state.users.filter((u) => u.id !== userId),
    cursors: state.cursors.filter((c) => c.userId !== userId),
  })),

  setScore: (score) => set({ score }),
  updateNote: (type, note) => set((state) => {
    if (!state.score) return state;
    let newNotes: Note[];
    switch (type) {
      case 'add':
        newNotes = [...state.score.notes, note];
        break;
      case 'delete':
        newNotes = state.score.notes.filter((n) => n.id !== note.id);
        break;
      case 'update':
        newNotes = state.score.notes.map((n) => n.id === note.id ? note : n);
        break;
      default:
        return state;
    }
    return {
      score: {
        ...state.score,
        notes: newNotes,
        updatedAt: new Date().toISOString(),
      },
    };
  }),

  setVersions: (versions) => set({ versions }),
  addVersion: (version) => set((state) => ({
    versions: [version, ...state.versions],
  })),

  setCursor: (userId, x, y) => set((state) => {
    const existingIndex = state.cursors.findIndex((c) => c.userId === userId);
    const newCursor: CursorPosition = {
      userId,
      x,
      y,
      timestamp: Date.now(),
    };
    if (existingIndex >= 0) {
      const newCursors = [...state.cursors];
      newCursors[existingIndex] = newCursor;
      return { cursors: newCursors };
    }
    return { cursors: [...state.cursors, newCursor] };
  }),

  addOperationTrail: (trail) => set((state) => ({
    operationTrails: [...state.operationTrails, trail],
  })),
  removeOperationTrail: (trailId) => set((state) => ({
    operationTrails: state.operationTrails.filter((t) => t.id !== trailId),
  })),

  setIsPlaying: (isPlaying) => set({ isPlaying }),
  setPlaybackSpeed: (playbackSpeed) => set({ playbackSpeed }),
  setCurrentPlaybackTime: (currentPlaybackTime) => set({ currentPlaybackTime }),
  setHighlightedNoteIds: (highlightedNoteIds) => set({ highlightedNoteIds }),

  setIsMobile: (isMobile) => set({ isMobile }),
  setIsRightPanelOpen: (isRightPanelOpen) => set({ isRightPanelOpen }),
  setSaveInterval: (saveInterval) => set({ saveInterval }),
}));
