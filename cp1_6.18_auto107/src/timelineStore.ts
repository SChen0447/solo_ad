import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';

export type EventCategory = 'sleep' | 'work' | 'study' | 'exercise' | 'leisure' | 'other';

export interface TimelineEvent {
  id: string;
  title: string;
  note: string;
  category: EventCategory;
  startHour: number;
  duration: number;
  date: string;
}

export interface WeeklyGoal {
  category: EventCategory;
  targetCount: number;
}

export interface RecommendedEvent {
  id: string;
  title: string;
  category: EventCategory;
  startHour: number;
  duration: number;
  date: string;
}

export interface DailyStats {
  date: string;
  categoryMinutes: Record<EventCategory, number>;
  utilizationPercent: number;
}

export type StatsViewMode = 'day' | 'week' | 'month';

export const CATEGORY_COLORS: Record<EventCategory, string> = {
  sleep: '#4a6fa5',
  work: '#c17f59',
  study: '#6b8f71',
  exercise: '#a35d5d',
  leisure: '#8b7da8',
  other: '#7a7a8a',
};

export const CATEGORY_LABELS: Record<EventCategory, string> = {
  sleep: '睡眠',
  work: '工作',
  study: '学习',
  exercise: '运动',
  leisure: '休闲',
  other: '其他',
};

interface TimelineState {
  events: TimelineEvent[];
  recommendedEvents: RecommendedEvent[];
  weeklyGoals: WeeklyGoal[];
  selectedDate: string;
  statsViewMode: StatsViewMode;
  editingEventId: string | null;
  contextMenuEventId: string | null;
  contextMenuPos: { x: number; y: number } | null;

  setSelectedDate: (date: string) => void;
  setStatsViewMode: (mode: StatsViewMode) => void;
  addEvent: (event: Omit<TimelineEvent, 'id'>) => void;
  updateEvent: (id: string, updates: Partial<TimelineEvent>) => void;
  deleteEvent: (id: string) => void;
  setEditingEventId: (id: string | null) => void;
  setContextMenu: (eventId: string | null, pos: { x: number; y: number } | null) => void;
  setWeeklyGoals: (goals: WeeklyGoal[]) => void;
  setRecommendedEvents: (events: RecommendedEvent[]) => void;
  confirmRecommendedEvents: () => void;
  clearRecommendedEvents: () => void;
  importEvents: (events: TimelineEvent[]) => void;
  loadFromStorage: () => void;
  saveToStorage: () => void;
}

const STORAGE_KEY = 'time-axis-optimizer-data';

const today = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export const useTimelineStore = create<TimelineState>((set, get) => ({
  events: [],
  recommendedEvents: [],
  weeklyGoals: [
    { category: 'exercise', targetCount: 3 },
    { category: 'study', targetCount: 5 },
  ],
  selectedDate: today(),
  statsViewMode: 'day',
  editingEventId: null,
  contextMenuEventId: null,
  contextMenuPos: null,

  setSelectedDate: (date) => set({ selectedDate: date }),
  setStatsViewMode: (mode) => set({ statsViewMode: mode }),

  addEvent: (event) => {
    set((state) => ({
      events: [...state.events, { ...event, id: uuidv4() }],
    }));
    get().saveToStorage();
  },

  updateEvent: (id, updates) => {
    set((state) => ({
      events: state.events.map((e) => (e.id === id ? { ...e, ...updates } : e)),
    }));
    get().saveToStorage();
  },

  deleteEvent: (id) => {
    set((state) => ({
      events: state.events.filter((e) => e.id !== id),
    }));
    get().saveToStorage();
  },

  setEditingEventId: (id) => set({ editingEventId: id }),
  setContextMenu: (eventId, pos) =>
    set({ contextMenuEventId: eventId, contextMenuPos: pos }),

  setWeeklyGoals: (goals) => {
    set({ weeklyGoals: goals });
    get().saveToStorage();
  },

  setRecommendedEvents: (events) => set({ recommendedEvents: events }),

  confirmRecommendedEvents: () => {
    const { recommendedEvents } = get();
    if (recommendedEvents.length === 0) return;
    const newEvents: TimelineEvent[] = recommendedEvents.map((r) => ({
      id: uuidv4(),
      title: r.title,
      note: '',
      category: r.category,
      startHour: r.startHour,
      duration: r.duration,
      date: r.date,
    }));
    set((state) => ({
      events: [...state.events, ...newEvents],
      recommendedEvents: [],
    }));
    get().saveToStorage();
  },

  clearRecommendedEvents: () => set({ recommendedEvents: [] }),

  importEvents: (events) => {
    set((state) => ({
      events: [
        ...state.events.filter(
          (e) => !events.some((ie) => ie.id === e.id)
        ),
        ...events,
      ],
    }));
    get().saveToStorage();
  },

  loadFromStorage: () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const data = JSON.parse(raw);
      if (data.events) set({ events: data.events });
      if (data.weeklyGoals) set({ weeklyGoals: data.weeklyGoals });
    } catch {}
  },

  saveToStorage: () => {
    const { events, weeklyGoals } = get();
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ events, weeklyGoals })
      );
    } catch {}
  },
}));
