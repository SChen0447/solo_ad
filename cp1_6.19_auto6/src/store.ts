import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import dayjs from 'dayjs';

export type MoodType = 'happy' | 'calm' | 'touched' | 'anxious' | 'tired' | 'surprised';

export const MOOD_EMOJIS: Record<MoodType, string> = {
  happy: '😊',
  calm: '😌',
  touched: '🥹',
  anxious: '😰',
  tired: '😴',
  surprised: '😲',
};

export const MOOD_COLORS: Record<MoodType, string> = {
  happy: '#ffb74d',
  calm: '#81c784',
  touched: '#ce93d8',
  anxious: '#ef5350',
  tired: '#90a4ae',
  surprised: '#4fc3f7',
};

export interface DiaryEntry {
  id: string;
  title: string;
  content: string;
  date: string;
  mood: MoodType;
  tags: string[];
  image?: string;
  createdAt: string;
  updatedAt: string;
}

interface AppState {
  entries: DiaryEntry[];
  currentView: 'week' | 'month';
  selectedDate: string;
  selectedEntryId: string | null;
  searchQuery: string;
  expandedGroups: string[];
  isCreating: boolean;

  addEntry: (entry: Omit<DiaryEntry, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateEntry: (id: string, updates: Partial<DiaryEntry>) => void;
  deleteEntry: (id: string) => void;
  setCurrentView: (view: 'week' | 'month') => void;
  setSelectedDate: (date: string) => void;
  setSelectedEntryId: (id: string | null) => void;
  setSearchQuery: (query: string) => void;
  toggleGroupExpanded: (dateKey: string) => void;
  setIsCreating: (isCreating: boolean) => void;
}

const today = dayjs().format('YYYY-MM-DD');

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      entries: [
        {
          id: uuidv4(),
          title: '美好的周末早晨',
          content: '今天阳光明媚，和朋友一起去了公园散步。\n\n- 看到了美丽的樱花\n- 喝了一杯香醇的咖啡\n- 读了一本好书\n\n**真是完美的一天！**',
          date: today,
          mood: 'happy',
          tags: ['周末', '阳光'],
          createdAt: dayjs().toISOString(),
          updatedAt: dayjs().toISOString(),
        },
        {
          id: uuidv4(),
          title: '深夜的思考',
          content: '安静的夜晚，适合整理思绪。\n\n*有时候慢下来，才能看清前方的路。*',
          date: dayjs().subtract(1, 'day').format('YYYY-MM-DD'),
          mood: 'calm',
          tags: ['思考', '夜晚'],
          createdAt: dayjs().subtract(1, 'day').toISOString(),
          updatedAt: dayjs().subtract(1, 'day').toISOString(),
        },
      ],
      currentView: 'week',
      selectedDate: today,
      selectedEntryId: null,
      searchQuery: '',
      expandedGroups: [],
      isCreating: false,

      addEntry: (entry) => {
        const now = dayjs().toISOString();
        const newEntry: DiaryEntry = {
          ...entry,
          id: uuidv4(),
          createdAt: now,
          updatedAt: now,
        };
        set((state) => ({
          entries: [newEntry, ...state.entries],
          selectedEntryId: newEntry.id,
          isCreating: false,
        }));
      },

      updateEntry: (id, updates) => {
        set((state) => ({
          entries: state.entries.map((e) =>
            e.id === id ? { ...e, ...updates, updatedAt: dayjs().toISOString() } : e
          ),
        }));
      },

      deleteEntry: (id) => {
        const { entries, selectedEntryId } = get();
        set((state) => ({
          entries: state.entries.filter((e) => e.id !== id),
          selectedEntryId: selectedEntryId === id ? null : selectedEntryId,
        }));
      },

      setCurrentView: (view) => set({ currentView: view }),
      setSelectedDate: (date) => set({ selectedDate: date }),
      setSelectedEntryId: (id) => set({ selectedEntryId: id }),
      setSearchQuery: (query) => set({ searchQuery: query }),
      toggleGroupExpanded: (dateKey) => {
        set((state) => ({
          expandedGroups: state.expandedGroups.includes(dateKey)
            ? state.expandedGroups.filter((k) => k !== dateKey)
            : [...state.expandedGroups, dateKey],
        }));
      },
      setIsCreating: (isCreating) => set({ isCreating }),
    }),
    {
      name: 'shouzhang-storage',
    }
  )
);
