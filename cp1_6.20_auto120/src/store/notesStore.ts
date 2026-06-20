import { create } from 'zustand';
import type { Note, Timestamp, Highlight, Tag } from '@/types';
import * as notesApi from '@/api/notesApi';

interface NotesState {
  notes: Note[];
  currentNote: Note | null;
  loading: boolean;
  error: string | null;
  uploadProgress: number;
  reviewMode: boolean;

  fetchNotes: () => Promise<void>;
  fetchNoteById: (id: string) => Promise<void>;
  createNote: (data: Partial<Note>) => Promise<void>;
  updateNote: (id: string, data: Partial<Note>) => Promise<void>;
  uploadAndTranscribe: (file: File) => Promise<void>;
  toggleReviewMode: () => void;
  setCurrentNote: (note: Note | null) => void;
  setUploadProgress: (progress: number) => void;
}

export const useNotesStore = create<NotesState>((set, get) => ({
  notes: [],
  currentNote: null,
  loading: false,
  error: null,
  uploadProgress: 0,
  reviewMode: false,

  fetchNotes: async () => {
    set({ loading: true, error: null });
    try {
      const { data } = await notesApi.fetchNotes();
      set({ notes: data, loading: false });
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },

  fetchNoteById: async (id: string) => {
    set({ loading: true, error: null });
    try {
      const { data } = await notesApi.fetchNoteById(id);
      set({ currentNote: data, loading: false });
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },

  createNote: async (data: Partial<Note>) => {
    set({ loading: true, error: null });
    try {
      const { data: note } = await notesApi.createNote(data);
      set((state) => ({ notes: [...state.notes, note], loading: false }));
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },

  updateNote: async (id: string, data: Partial<Note>) => {
    set({ loading: true, error: null });
    try {
      const { data: updated } = await notesApi.updateNote(id, data);
      set((state) => ({
        notes: state.notes.map((n) => (n.id === id ? updated : n)),
        currentNote: state.currentNote?.id === id ? updated : state.currentNote,
        loading: false,
      }));
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },

  uploadAndTranscribe: async (file: File) => {
    set({ loading: true, error: null, uploadProgress: 0 });
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await notesApi.transcribeFile(file);
      set({ uploadProgress: 100, loading: false });
      return response.data;
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },

  toggleReviewMode: () => set((state) => ({ reviewMode: !state.reviewMode })),

  setCurrentNote: (note: Note | null) => set({ currentNote: note }),

  setUploadProgress: (progress: number) => set({ uploadProgress: progress }),
}));

export type { Note, Timestamp, Highlight, Tag };
