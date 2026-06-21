import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { AnimationClip, AnimationType, AnimationDirection } from '@/engine/KeyframeGenerator';

interface AnimationStore {
  clips: AnimationClip[];
  selectedClipId: string | null;
  isPlaying: boolean;
  currentTime: number;
  zoom: number;

  addClip: (type: AnimationType) => void;
  removeClip: (id: string) => void;
  updateClip: (id: string, updates: Partial<AnimationClip>) => void;
  selectClip: (id: string | null) => void;
  setPlaying: (playing: boolean) => void;
  setCurrentTime: (time: number) => void;
  setZoom: (zoom: number) => void;
  moveClip: (id: string, newStartTime: number) => void;
  resizeClip: (id: string, newDuration: number) => void;
}

const getDefaultStartValue = (type: AnimationType): number => {
  switch (type) {
    case 'translate':
      return 0;
    case 'rotate':
      return 0;
    case 'scale':
      return 1;
    case 'opacity':
      return 1;
    default:
      return 0;
  }
};

const getDefaultEndValue = (type: AnimationType): number => {
  switch (type) {
    case 'translate':
      return 100;
    case 'rotate':
      return 360;
    case 'scale':
      return 1.5;
    case 'opacity':
      return 0;
    default:
      return 100;
  }
};

export const useAnimationStore = create<AnimationStore>((set) => ({
  clips: [],
  selectedClipId: null,
  isPlaying: false,
  currentTime: 0,
  zoom: 1,

  addClip: (type: AnimationType) => {
    const id = uuidv4();
    const clip: AnimationClip = {
      id,
      selector: '.target-element',
      type,
      startValue: getDefaultStartValue(type),
      endValue: getDefaultEndValue(type),
      startTime: 0,
      duration: 2,
      easing: 'ease-in-out',
      iterationCount: 1,
      direction: 'normal' as AnimationDirection,
    };
    set((state) => ({
      clips: [...state.clips, clip],
      selectedClipId: id,
    }));
  },

  removeClip: (id: string) => {
    set((state) => ({
      clips: state.clips.filter((clip) => clip.id !== id),
      selectedClipId: state.selectedClipId === id ? null : state.selectedClipId,
    }));
  },

  updateClip: (id: string, updates: Partial<AnimationClip>) => {
    set((state) => ({
      clips: state.clips.map((clip) =>
        clip.id === id ? { ...clip, ...updates } : clip
      ),
    }));
  },

  selectClip: (id: string | null) => {
    set({ selectedClipId: id });
  },

  setPlaying: (playing: boolean) => {
    set({ isPlaying: playing });
  },

  setCurrentTime: (time: number) => {
    set({ currentTime: time });
  },

  setZoom: (zoom: number) => {
    set({ zoom: Math.min(3, Math.max(0.5, zoom)) });
  },

  moveClip: (id: string, newStartTime: number) => {
    set((state) => ({
      clips: state.clips.map((clip) =>
        clip.id === id ? { ...clip, startTime: Math.max(0, newStartTime) } : clip
      ),
    }));
  },

  resizeClip: (id: string, newDuration: number) => {
    set((state) => ({
      clips: state.clips.map((clip) =>
        clip.id === id ? { ...clip, duration: Math.max(0.1, newDuration) } : clip
      ),
    }));
  },
}));
