import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import type { Entry, DateNode, MoodLevel, DeviceType, LayoutMode } from '@/types';
import { formatDate, addDays, sortEntriesByTimeDesc, computeStats } from './stats';
import type { StatsResult } from '@/types';

interface TimelineState {
  entries: Entry[];
  dateNodes: Record<string, DateNode>;
  selectedDate: string | null;
  deviceType: DeviceType;
  layoutMode: LayoutMode;
  visibleNodeCount: number;
  showStats: boolean;
  showExportAnimation: boolean;

  setDeviceType: (type: DeviceType) => void;
  setLayoutMode: (mode: LayoutMode) => void;
  setVisibleNodeCount: (count: number) => void;
  selectDate: (date: string | null) => void;
  toggleStats: () => void;
  setShowExportAnimation: (show: boolean) => void;

  addEntry: (date: string, text: string, images?: string[]) => void;
  deleteEntry: (id: string) => void;
  setMood: (date: string, mood: MoodLevel) => void;

  getEntriesForDate: (date: string) => Entry[];
  getDateNode: (date: string) => DateNode;
  getStats: () => StatsResult;
  exportData: () => string;

  loadSampleData: () => Promise<void>;
}

function rebuildDateNodes(entries: Entry[]): Record<string, DateNode> {
  const nodes: Record<string, DateNode> = {};
  for (const e of entries) {
    if (!nodes[e.date]) {
      nodes[e.date] = { date: e.date, mood: null, entryCount: 0, entries: [] };
    }
    nodes[e.date].entries.push(e);
    nodes[e.date].entryCount++;
  }
  return nodes;
}

export const useTimelineStore = create<TimelineState>((set, get) => ({
  entries: [],
  dateNodes: {},
  selectedDate: null,
  deviceType: 'desktop',
  layoutMode: 'horizontal',
  visibleNodeCount: 30,
  showStats: false,
  showExportAnimation: false,

  setDeviceType: (type) => set({ deviceType: type }),
  setLayoutMode: (mode) => set({ layoutMode: mode }),
  setVisibleNodeCount: (count) => set({ visibleNodeCount: count }),
  selectDate: (date) => set({ selectedDate: date }),
  toggleStats: () => set((s) => ({ showStats: !s.showStats })),
  setShowExportAnimation: (show) => set({ showExportAnimation: show }),

  addEntry: (date, text, images = []) => {
    const now = new Date();
    const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const entry: Entry = {
      id: uuidv4(),
      date,
      time,
      text: text.trim(),
      images,
      createdAt: now.getTime(),
    };
    set((state) => {
      const entries = [...state.entries, entry];
      return { entries, dateNodes: rebuildDateNodes(entries) };
    });
  },

  deleteEntry: (id) => {
    set((state) => {
      const entries = state.entries.filter((e) => e.id !== id);
      return { entries, dateNodes: rebuildDateNodes(entries) };
    });
  },

  setMood: (date, mood) => {
    set((state) => {
      const node = state.dateNodes[date] ?? { date, mood: null, entryCount: 0, entries: [] };
      return {
        dateNodes: {
          ...state.dateNodes,
          [date]: { ...node, mood },
        },
      };
    });
  },

  getEntriesForDate: (date) => {
    const node = get().dateNodes[date];
    return node ? sortEntriesByTimeDesc(node.entries) : [];
  },

  getDateNode: (date) => {
    return (
      get().dateNodes[date] ?? {
        date,
        mood: null,
        entryCount: 0,
        entries: [],
      }
    );
  },

  getStats: () => {
    return computeStats(get().entries, get().dateNodes, 30);
  },

  exportData: () => {
    const data = {
      exportedAt: new Date().toISOString(),
      entries: get().entries,
      dateNodes: get().dateNodes,
    };
    return JSON.stringify(data, null, 2);
  },

  loadSampleData: async () => {
    await new Promise((r) => setTimeout(r, 50));
    const today = formatDate(new Date());
    const sampleEntries: Entry[] = [];
    const sampleMoods: Record<string, MoodLevel> = {};

    const moods: MoodLevel[] = [3, 5, 7, 6, 8, 4, 9, 5, 6, 7];
    for (let i = 0; i < 30; i++) {
      const date = addDays(today, -i);
      const mood = moods[i % moods.length];
      sampleMoods[date] = mood;
      if (i % 3 === 0) {
        sampleEntries.push({
          id: uuidv4(),
          date,
          time: '09:30',
          text: `今天完成了${i + 1}项重要任务，感觉很充实。`,
          images: [],
          createdAt: Date.now() - i * 86400000,
        });
      }
      if (i % 5 === 0) {
        sampleEntries.push({
          id: uuidv4(),
          date,
          time: '18:45',
          text: '傍晚散步，日落很美 🌅',
          images: [],
          createdAt: Date.now() - i * 86400000 + 3600000,
        });
      }
    }

    const dateNodes: Record<string, DateNode> = rebuildDateNodes(sampleEntries);
    for (const [date, mood] of Object.entries(sampleMoods)) {
      if (!dateNodes[date]) {
        dateNodes[date] = { date, mood: null, entryCount: 0, entries: [] };
      }
      dateNodes[date].mood = mood;
    }

    set({ entries: sampleEntries, dateNodes });
  },
}));
