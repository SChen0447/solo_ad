import { create } from 'zustand';

export type DensityLevel = 'low' | 'medium' | 'high';

export interface MarkerInfo {
  name: string;
  nameZh: string;
  speed: number;
  direction: string;
  directionZh: string;
}

interface AppState {
  isPlaying: boolean;
  speed: number;
  density: DensityLevel;
  zoom: number;
  markerPosition: { lat: number; lng: number } | null;
  markerInfo: MarkerInfo | null;
  latInput: string;
  lngInput: string;
  setPlaying: (playing: boolean) => void;
  togglePlaying: () => void;
  setSpeed: (speed: number) => void;
  setDensity: (density: DensityLevel) => void;
  setZoom: (zoom: number) => void;
  setMarkerPosition: (pos: { lat: number; lng: number } | null) => void;
  setMarkerInfo: (info: MarkerInfo | null) => void;
  setLatInput: (val: string) => void;
  setLngInput: (val: string) => void;
}

export const useAppStore = create<AppState>((set) => ({
  isPlaying: false,
  speed: 1.0,
  density: 'medium',
  zoom: 1.0,
  markerPosition: null,
  markerInfo: null,
  latInput: '',
  lngInput: '',
  setPlaying: (playing) => set({ isPlaying: playing }),
  togglePlaying: () => set((s) => ({ isPlaying: !s.isPlaying })),
  setSpeed: (speed) => set({ speed }),
  setDensity: (density) => set({ density }),
  setZoom: (zoom) => set({ zoom: Math.max(0.5, Math.min(5, zoom)) }),
  setMarkerPosition: (pos) => set({ markerPosition: pos }),
  setMarkerInfo: (info) => set({ markerInfo: info }),
  setLatInput: (val) => set({ latInput: val }),
  setLngInput: (val) => set({ lngInput: val }),
}));

export function getParticleCount(density: DensityLevel): number {
  switch (density) {
    case 'low':
      return 2500;
    case 'medium':
      return 5000;
    case 'high':
      return 10000;
  }
}
