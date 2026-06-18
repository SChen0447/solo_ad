import { create } from 'zustand';
import type { Paragraph, Branch, Character, User } from '../utils/storyParser';

interface EditingInfo {
  userId: string;
  userName: string;
  branchId: string;
  isEditing: boolean;
}

interface StoryState {
  currentUser: User | null;
  onlineUsers: User[];
  branches: Branch[];
  currentBranchId: string | null;
  paragraphs: Record<string, Paragraph[]>;
  characters: Character[];
  cooldownSeconds: number;
  maxWords: number;
  lastSubmitTime: number | undefined;
  isEditorLocked: boolean;
  editingUsers: Record<string, EditingInfo>;
  storyTitle: string;

  setCurrentUser: (user: User) => void;
  addOnlineUser: (user: User) => void;
  removeOnlineUser: (userId: string) => void;
  setOnlineUsers: (users: User[]) => void;
  setCurrentBranch: (branchId: string) => void;
  addParagraph: (paragraph: Paragraph) => void;
  setParagraphs: (branchId: string, paragraphs: Paragraph[]) => void;
  addBranch: (branch: Branch) => void;
  setBranches: (branches: Branch[]) => void;
  addCharacter: (character: Character) => void;
  updateCharacter: (character: Character) => void;
  removeCharacter: (id: string) => void;
  setCharacters: (characters: Character[]) => void;
  setLastSubmit: (time: number) => void;
  setEditorLocked: (locked: boolean) => void;
  setEditingInfo: (info: EditingInfo) => void;
  initStory: (data: {
    id: string;
    title: string;
    branches: Branch[];
    paragraphs: Record<string, Paragraph[]>;
    characters: Character[];
    cooldownSeconds: number;
    maxWords: number;
  }) => void;
}

export const useStoryStore = create<StoryState>((set, get) => ({
  currentUser: null,
  onlineUsers: [],
  branches: [],
  currentBranchId: null,
  paragraphs: {},
  characters: [],
  cooldownSeconds: 30,
  maxWords: 300,
  lastSubmitTime: undefined,
  isEditorLocked: false,
  editingUsers: {},
  storyTitle: '我们的故事',

  setCurrentUser: (user) => set({ currentUser: user }),

  addOnlineUser: (user) =>
    set((state) => ({
      onlineUsers: state.onlineUsers.find((u) => u.id === user.id)
        ? state.onlineUsers
        : [...state.onlineUsers, user]
    })),

  removeOnlineUser: (userId) =>
    set((state) => ({
      onlineUsers: state.onlineUsers.filter((u) => u.id !== userId)
    })),

  setOnlineUsers: (users) => set({ onlineUsers: users }),

  setCurrentBranch: (branchId) => set({ currentBranchId: branchId }),

  addParagraph: (paragraph) =>
    set((state) => {
      const branchParagraphs = state.paragraphs[paragraph.branchId] || [];
      return {
        paragraphs: {
          ...state.paragraphs,
          [paragraph.branchId]: [...branchParagraphs, paragraph]
        }
      };
    }),

  setParagraphs: (branchId, paragraphs) =>
    set((state) => ({
      paragraphs: { ...state.paragraphs, [branchId]: paragraphs }
    })),

  addBranch: (branch) =>
    set((state) => ({
      branches: [...state.branches, branch]
    })),

  setBranches: (branches) => set({ branches }),

  addCharacter: (character) =>
    set((state) => ({
      characters: [...state.characters, character]
    })),

  updateCharacter: (character) =>
    set((state) => ({
      characters: state.characters.map((c) =>
        c.id === character.id ? character : c
      )
    })),

  removeCharacter: (id) =>
    set((state) => ({
      characters: state.characters.filter((c) => c.id !== id)
    })),

  setCharacters: (characters) => set({ characters }),

  setLastSubmit: (time) => set({ lastSubmitTime: time }),

  setEditorLocked: (locked) => set({ isEditorLocked: locked }),

  setEditingInfo: (info) =>
    set((state) => {
      if (!info.isEditing) {
        const next = { ...state.editingUsers };
        delete next[info.userId];
        return { editingUsers: next };
      }
      return {
        editingUsers: {
          ...state.editingUsers,
          [info.userId]: info
        }
      };
    }),

  initStory: (data) =>
    set({
      storyTitle: data.title,
      branches: data.branches,
      paragraphs: data.paragraphs,
      characters: data.characters,
      cooldownSeconds: data.cooldownSeconds,
      maxWords: data.maxWords,
      currentBranchId: data.branches[0]?.id || null
    })
}));

export function getCurrentBranchParagraphs(): Paragraph[] {
  const s = get();
  if (!s.currentBranchId) return [];
  return s.paragraphs[s.currentBranchId] || [];
}
