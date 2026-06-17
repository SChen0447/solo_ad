import { create } from 'zustand';
import type { Note, ColorBarData, WeeklyStats } from './types';
import { MOOD_COLORS } from './types';
import { notesApi } from './api/notes';

interface NoteStore {
  notes: Note[];
  searchKeyword: string;
  weekOffset: number;
  isLoading: boolean;
  newlyAddedId: string | null;
  setSearchKeyword: (keyword: string) => void;
  setWeekOffset: (offset: number) => void;
  fetchNotes: () => Promise<void>;
  addNote: (note: { content: string; mood: string; createdAt?: string }) => Promise<Note>;
  deleteNote: (id: string) => Promise<void>;
  setNewlyAddedId: (id: string | null) => void;
  getWeeklyColorBars: () => ColorBarData[];
  getWeeklyStats: () => WeeklyStats;
  getFilteredNotes: () => Note[];
  getCurrentWeekMonday: () => string;
}

function getWeekMonday(offset: number): Date {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(now.setDate(diff));
  monday.setDate(monday.getDate() + offset * 7);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

function mergeAdjacentSameMood(notes: Note[]): ColorBarData[] {
  if (notes.length === 0) return [];

  const sortedByDate = [...notes].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  const bars: ColorBarData[] = [];
  let currentBar: ColorBarData | null = null;

  for (const note of sortedByDate) {
    const noteDate = new Date(note.createdAt).toDateString();

    if (!currentBar) {
      currentBar = {
        mood: note.mood,
        days: 1,
        count: 1,
        startDate: note.createdAt,
        endDate: note.createdAt,
        percentage: 0
      };
    } else if (currentBar.mood === note.mood) {
      currentBar.count++;
      if (noteDate !== new Date(currentBar.endDate).toDateString()) {
        currentBar.days++;
        currentBar.endDate = note.createdAt;
      }
    } else {
      bars.push(currentBar);
      currentBar = {
        mood: note.mood,
        days: 1,
        count: 1,
        startDate: note.createdAt,
        endDate: note.createdAt,
        percentage: 0
      };
    }
  }

  if (currentBar) {
    bars.push(currentBar);
  }

  const totalCount = bars.reduce((sum, bar) => sum + bar.count, 0);
  bars.forEach(bar => {
    bar.percentage = totalCount > 0 ? (bar.count / totalCount) * 100 : 0;
  });

  return bars;
}

export const useNoteStore = create<NoteStore>((set, get) => ({
  notes: [],
  searchKeyword: '',
  weekOffset: 0,
  isLoading: false,
  newlyAddedId: null,

  setSearchKeyword: (keyword) => set({ searchKeyword: keyword }),

  setWeekOffset: (offset) => set({ weekOffset: offset }),

  setNewlyAddedId: (id) => set({ newlyAddedId: id }),

  getCurrentWeekMonday: () => {
    return getWeekMonday(get().weekOffset).toISOString().split('T')[0];
  },

  fetchNotes: async () => {
    set({ isLoading: true });
    try {
      const weekMonday = get().getCurrentWeekMonday();
      const notes = await notesApi.getNotes(weekMonday);
      set({ notes, isLoading: false });
    } catch (error) {
      console.error('获取便签失败:', error);
      set({ isLoading: false });
    }
  },

  addNote: async (note) => {
    const newNote = await notesApi.createNote(note);
    set((state) => ({
      notes: [newNote, ...state.notes].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ),
      newlyAddedId: newNote.id
    }));
    return newNote;
  },

  deleteNote: async (id) => {
    await notesApi.deleteNote(id);
    set((state) => ({
      notes: state.notes.filter((note) => note.id !== id)
    }));
  },

  getFilteredNotes: () => {
    const { notes, searchKeyword } = get();
    if (!searchKeyword.trim()) return notes;
    const keyword = searchKeyword.toLowerCase();
    return notes.filter((note) =>
      note.content.toLowerCase().includes(keyword)
    );
  },

  getWeeklyColorBars: () => {
    const { notes } = get();
    return mergeAdjacentSameMood(notes);
  },

  getWeeklyStats: () => {
    const { notes } = get();

    if (notes.length === 0) {
      return {
        mostCommonMood: 'soft-pink',
        moodPercentages: {},
        totalNotes: 0,
        totalDays: 0
      };
    }

    const moodCounts: Record<string, number> = {};
    const daysSet = new Set<string>();

    for (const note of notes) {
      moodCounts[note.mood] = (moodCounts[note.mood] || 0) + 1;
      daysSet.add(new Date(note.createdAt).toDateString());
    }

    let mostCommonMood = 'soft-pink';
    let maxCount = 0;

    for (const [mood, count] of Object.entries(moodCounts)) {
      if (count > maxCount) {
        maxCount = count;
        mostCommonMood = mood;
      }
    }

    const totalNotes = notes.length;
    const moodPercentages: Record<string, number> = {};

    for (const mood of Object.keys(MOOD_COLORS)) {
      moodPercentages[mood] = totalNotes > 0
        ? ((moodCounts[mood] || 0) / totalNotes) * 100
        : 0;
    }

    return {
      mostCommonMood,
      moodPercentages,
      totalNotes,
      totalDays: daysSet.size
    };
  }
}));
