import { create } from "zustand";
import { TimelineEvent, mockEvents } from "@/data/mockData";

interface TimelineStore {
  events: TimelineEvent[];
  addEvent: (event: Omit<TimelineEvent, "id">) => void;
  removeEvent: (id: string) => void;
  updateEvent: (id: string, updates: Partial<TimelineEvent>) => void;
  moveEvent: (fromIndex: number, toIndex: number) => void;
  importEvents: (events: TimelineEvent[]) => void;
  exportEvents: () => string;
}

const generateId = () => Date.now().toString(36) + Math.random().toString(36).substring(2);

const STORAGE_KEY = "timeline-storybook-events";

const loadFromStorage = (): TimelineEvent[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    // ignore parse errors
  }
  return mockEvents;
};

const saveToStorage = (events: TimelineEvent[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
  } catch {
    // ignore storage errors
  }
};

export const useTimeline = create<TimelineStore>((set, get) => ({
  events: loadFromStorage(),

  addEvent: (event) => {
    const newEvent: TimelineEvent = { ...event, id: generateId() };
    set((state) => {
      const events = [...state.events, newEvent];
      saveToStorage(events);
      return { events };
    });
  },

  removeEvent: (id) => {
    set((state) => {
      const events = state.events.filter((e) => e.id !== id);
      saveToStorage(events);
      return { events };
    });
  },

  updateEvent: (id, updates) => {
    set((state) => {
      const events = state.events.map((e) =>
        e.id === id ? { ...e, ...updates } : e
      );
      saveToStorage(events);
      return { events };
    });
  },

  moveEvent: (fromIndex, toIndex) => {
    set((state) => {
      const events = [...state.events];
      const [moved] = events.splice(fromIndex, 1);
      events.splice(toIndex, 0, moved);
      saveToStorage(events);
      return { events };
    });
  },

  importEvents: (events) => {
    saveToStorage(events);
    set({ events });
  },

  exportEvents: () => {
    const { events } = get();
    return JSON.stringify(events, null, 2);
  },
}));
