import { create } from 'zustand';
import type { AppState, SunlightResult } from '../types';

export const useAppStore = create<AppState>((set) => ({
  time: 12,
  month: 6,
  day: 21,
  selectedBuildingId: null,
  sunlightResult: null,
  setTime: (time: number) => set({ time }),
  setDate: (month: number, day: number) => set({ month, day }),
  selectBuilding: (id: string | null) => set({ selectedBuildingId: id }),
  setSunlightResult: (result: SunlightResult | null) => set({ sunlightResult: result }),
}));
