import { create } from 'zustand';
import type { User, StickyNote, Room } from '../types';
import { NOTE_COLORS } from '../utils/constants';

interface AppState {
  room: Room | null;
  currentUser: User | null;
  selectedNoteId: string | null;
  activeVoteNoteId: string | null;
  isMemberPanelCollapsed: boolean;
  setRoom: (room: Room | null) => void;
  setCurrentUser: (user: User | null) => void;
  setSelectedNoteId: (id: string | null) => void;
  setActiveVoteNoteId: (id: string | null) => void;
  toggleMemberPanel: () => void;
  addNote: (note: StickyNote) => void;
  updateNote: (note: StickyNote) => void;
  deleteNote: (noteId: string) => void;
  addUser: (user: User) => void;
  removeUser: (userId: string) => void;
  setUserSpeaking: (userId: string, speaking: boolean) => void;
  updateVote: (noteId: string, vote: any) => void;
  setVoteEnded: (ended: boolean) => void;
  rearrangeNotes: () => void;
}

export const calculateVoteScore = (note: StickyNote): number => {
  if (!note.vote) return 0;
  const values = Object.values(note.vote.votes);
  if (values.length === 0) return 0;
  switch (note.vote.type) {
    case 'approve':
      return values.filter((v) => v === 1).length - values.filter((v) => v === -1).length;
    case 'stars':
    case 'priority':
      return values.reduce((sum, v) => sum + v, 0) / values.length;
    default:
      return 0;
  }
};

export const useAppStore = create<AppState>((set, get) => ({
  room: null,
  currentUser: null,
  selectedNoteId: null,
  activeVoteNoteId: null,
  isMemberPanelCollapsed: false,

  setRoom: (room) => set({ room }),
  setCurrentUser: (user) => set({ currentUser: user }),
  setSelectedNoteId: (id) => set({ selectedNoteId: id }),
  setActiveVoteNoteId: (id) => set({ activeVoteNoteId: id }),
  toggleMemberPanel: () => set((s) => ({ isMemberPanelCollapsed: !s.isMemberPanelCollapsed })),

  addNote: (note) =>
    set((s) => {
      if (!s.room) return s;
      return { room: { ...s.room, notes: [...s.room.notes, note] } };
    }),

  updateNote: (note) =>
    set((s) => {
      if (!s.room) return s;
      const notes = s.room.notes.map((n) => (n.id === note.id ? note : n));
      return { room: { ...s.room, notes } };
    }),

  deleteNote: (noteId) =>
    set((s) => {
      if (!s.room) return s;
      const notes = s.room.notes.filter((n) => n.id !== noteId);
      return {
        room: { ...s.room, notes },
        selectedNoteId: s.selectedNoteId === noteId ? null : s.selectedNoteId,
      };
    }),

  addUser: (user) =>
    set((s) => {
      if (!s.room) return s;
      if (s.room.users.find((u) => u.id === user.id)) return s;
      return { room: { ...s.room, users: [...s.room.users, user] } };
    }),

  removeUser: (userId) =>
    set((s) => {
      if (!s.room) return s;
      const users = s.room.users.filter((u) => u.id !== userId);
      return { room: { ...s.room, users } };
    }),

  setUserSpeaking: (userId, speaking) =>
    set((s) => {
      if (!s.room) return s;
      const users = s.room.users.map((u) =>
        u.id === userId ? { ...u, isSpeaking: speaking } : u
      );
      return { room: { ...s.room, users } };
    }),

  updateVote: (noteId, vote) =>
    set((s) => {
      if (!s.room) return s;
      const notes = s.room.notes.map((n) =>
        n.id === noteId ? { ...n, vote } : n
      );
      return { room: { ...s.room, notes } };
    }),

  setVoteEnded: (ended) =>
    set((s) => {
      if (!s.room) return s;
      return { room: { ...s.room, voteEnded: ended } };
    }),

  rearrangeNotes: () => {
    const { room } = get();
    if (!room) return;
    const sorted = [...room.notes].sort(
      (a, b) => calculateVoteScore(b) - calculateVoteScore(a)
    );
    const cols = 4;
    const spacing = 40;
    const noteW = 180;
    const noteH = 180;
    const rearranged = sorted.map((note, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      return {
        ...note,
        x: 100 + col * (noteW + spacing),
        y: 100 + row * (noteH + spacing),
      };
    });
    set({ room: { ...room, notes: rearranged } });
  },
}));

export const getRandomNoteColor = () =>
  NOTE_COLORS[Math.floor(Math.random() * NOTE_COLORS.length)];
