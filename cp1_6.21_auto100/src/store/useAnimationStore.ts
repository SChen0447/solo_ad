import { create } from 'zustand';
import { produce } from 'immer';
import { v4 as uuidv4 } from 'uuid';
import type { AnimationSlice, TimelineState } from '@/types';
import { DEFAULT_TRANSFORM, DEFAULT_COLOR } from '@/types';

interface AnimationStore extends TimelineState {
  addSlice: () => void;
  removeSlice: (id: string) => void;
  selectSlice: (id: string | null) => void;
  updateSlice: (id: string, updates: Partial<AnimationSlice>) => void;
  reorderSlices: (fromIndex: number, toIndex: number) => void;
  setPlaying: (playing: boolean) => void;
  setCurrentTime: (time: number) => void;
  recalcTotalDuration: () => void;
}

export const useAnimationStore = create<AnimationStore>((set, get) => ({
  slices: [],
  selectedSliceId: null,
  isPlaying: false,
  currentTime: 0,
  totalDuration: 0,

  addSlice: () => {
    const slices = get().slices;
    const lastEnd = slices.length > 0
      ? Math.max(...slices.map(s => s.startTime + s.duration + s.delay))
      : 0;
    const newSlice: AnimationSlice = {
      id: uuidv4(),
      selector: '.element',
      startTime: lastEnd,
      duration: 1000,
      delay: 0,
      easing: 'ease',
      transform: { ...DEFAULT_TRANSFORM },
      opacity: 1,
      color: { ...DEFAULT_COLOR },
    };
    set(produce((state: TimelineState) => {
      state.slices.push(newSlice);
      state.selectedSliceId = newSlice.id;
      state.totalDuration = Math.max(state.totalDuration, newSlice.startTime + newSlice.duration + newSlice.delay);
    }));
  },

  removeSlice: (id) => {
    set(produce((state: TimelineState) => {
      state.slices = state.slices.filter(s => s.id !== id);
      if (state.selectedSliceId === id) {
        state.selectedSliceId = state.slices.length > 0 ? state.slices[0].id : null;
      }
      state.totalDuration = state.slices.length > 0
        ? Math.max(...state.slices.map(s => s.startTime + s.duration + s.delay))
        : 0;
    }));
  },

  selectSlice: (id) => {
    set(produce((state: TimelineState) => {
      state.selectedSliceId = id;
    }));
  },

  updateSlice: (id, updates) => {
    set(produce((state: TimelineState) => {
      const idx = state.slices.findIndex(s => s.id === id);
      if (idx !== -1) {
        Object.assign(state.slices[idx], updates);
        state.totalDuration = Math.max(...state.slices.map(s => s.startTime + s.duration + s.delay));
      }
    }));
  },

  reorderSlices: (fromIndex, toIndex) => {
    set(produce((state: TimelineState) => {
      const [moved] = state.slices.splice(fromIndex, 1);
      state.slices.splice(toIndex, 0, moved);
    }));
  },

  setPlaying: (playing) => {
    set(produce((state: TimelineState) => {
      state.isPlaying = playing;
      if (playing) {
        state.currentTime = 0;
      }
    }));
  },

  setCurrentTime: (time) => {
    set(produce((state: TimelineState) => {
      state.currentTime = time;
      if (time >= state.totalDuration) {
        state.isPlaying = false;
        state.currentTime = 0;
      }
    }));
  },

  recalcTotalDuration: () => {
    set(produce((state: TimelineState) => {
      state.totalDuration = state.slices.length > 0
        ? Math.max(...state.slices.map(s => s.startTime + s.duration + s.delay))
        : 0;
    }));
  },
}));
