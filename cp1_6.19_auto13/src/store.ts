import { create } from 'zustand';
import type { AppStore, Obstacle } from './types';

export const useAppStore = create<AppStore>((set) => ({
  light: 50,
  moisture: 60,
  temperature: 20,
  obstacles: [],
  isAddingObstacle: false,

  setLight: (value: number) => set({ light: Math.max(0, Math.min(100, value)) }),
  setMoisture: (value: number) => set({ moisture: Math.max(0, Math.min(100, value)) }),
  setTemperature: (value: number) => set({ temperature: Math.max(-5, Math.min(45, value)) }),

  addObstacle: (obstacle: Obstacle) =>
    set((state) => ({ obstacles: [...state.obstacles, obstacle] })),

  setIsAddingObstacle: (value: boolean) => set({ isAddingObstacle: value }),

  updateObstacleOpacity: (id: string, opacity: number) =>
    set((state) => ({
      obstacles: state.obstacles.map((o) =>
        o.id === id ? { ...o, opacity } : o
      ),
    })),
}));
