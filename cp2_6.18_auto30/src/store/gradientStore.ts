import { create } from 'zustand';
import type {
  ColorStop,
  GradientType,
  GradientScheme,
  AnimationParams,
  SavedScheme,
} from '@/types';
import { loadSavedSchemes, addSavedScheme, deleteSavedScheme } from '@/utils/storage';

let nextId = 1;
function genId(): string {
  return `gs-${Date.now()}-${nextId++}`;
}

function createDefaultScheme(): GradientScheme {
  return {
    id: genId(),
    name: '未命名方案',
    colorStops: [
      { id: genId(), color: '#ff7e5f', position: 0 },
      { id: genId(), color: '#feb47b', position: 33 },
      { id: genId(), color: '#ff6a88', position: 66 },
      { id: genId(), color: '#ff99ac', position: 100 },
    ],
    gradientType: 'linear',
    angle: 135,
  };
}

function createDefaultAnimation(): AnimationParams {
  return {
    duration: 3,
    delay: 0,
    easing: 'ease',
    cubicBezierValue: 'cubic-bezier(0.4, 0, 0.2, 1)',
  };
}

interface GradientStore {
  currentScheme: GradientScheme;
  animationParams: AnimationParams;
  isPlaying: boolean;
  animProgress: number;
  savedSchemes: SavedScheme[];
  exportModalOpen: boolean;

  setCurrentScheme: (scheme: GradientScheme) => void;
  updateColorStops: (stops: ColorStop[]) => void;
  updateGradientType: (type: GradientType) => void;
  updateAngle: (angle: number) => void;
  updateSchemeName: (name: string) => void;
  setAnimationParams: (params: Partial<AnimationParams>) => void;
  setIsPlaying: (playing: boolean) => void;
  setAnimProgress: (progress: number) => void;
  loadSavedSchemes: () => void;
  saveCurrentScheme: () => void;
  deleteScheme: (id: string) => void;
  loadScheme: (scheme: GradientScheme & { animationParams?: AnimationParams }) => void;
  setExportModalOpen: (open: boolean) => void;
}

export const useGradientStore = create<GradientStore>((set, get) => ({
  currentScheme: createDefaultScheme(),
  animationParams: createDefaultAnimation(),
  isPlaying: false,
  animProgress: 0,
  savedSchemes: loadSavedSchemes(),
  exportModalOpen: false,

  setCurrentScheme: (scheme) => set({ currentScheme: scheme }),

  updateColorStops: (stops) =>
    set((state) => ({
      currentScheme: { ...state.currentScheme, colorStops: stops },
    })),

  updateGradientType: (type) =>
    set((state) => ({
      currentScheme: { ...state.currentScheme, gradientType: type },
    })),

  updateAngle: (angle) =>
    set((state) => ({
      currentScheme: { ...state.currentScheme, angle },
    })),

  updateSchemeName: (name) =>
    set((state) => ({
      currentScheme: { ...state.currentScheme, name },
    })),

  setAnimationParams: (params) =>
    set((state) => ({
      animationParams: { ...state.animationParams, ...params },
    })),

  setIsPlaying: (playing) => set({ isPlaying: playing }),

  setAnimProgress: (progress) => set({ animProgress: progress }),

  loadSavedSchemes: () => set({ savedSchemes: loadSavedSchemes() }),

  saveCurrentScheme: () => {
    const { currentScheme, animationParams } = get();
    const saved: SavedScheme = {
      ...currentScheme,
      animationParams,
      createdAt: Date.now(),
    };
    const schemes = addSavedScheme(saved);
    set({ savedSchemes: schemes });
  },

  deleteScheme: (id) => {
    const schemes = deleteSavedScheme(id);
    set({ savedSchemes: schemes });
  },

  loadScheme: (scheme) => {
    const { animationParams, ...rest } = scheme;
    set({
      currentScheme: { ...rest, id: genId() },
      animationParams: animationParams || createDefaultAnimation(),
      isPlaying: false,
    });
  },

  setExportModalOpen: (open) => set({ exportModalOpen: open }),
}));
