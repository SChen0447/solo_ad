import { create } from 'zustand';

export interface PlantData {
  id: string;
  position: [number, number, number];
  growthProgress: number;
  light: number;
  water: number;
  wind: number;
  isGrowing: boolean;
  growStartTime: number;
}

export interface Puddle {
  id: string;
  position: [number, number, number];
  createdAt: number;
}

export interface PulseEffect {
  id: string;
  partId: string;
  plantId: string;
  partType: 'leaf' | 'flower' | 'stem';
  params: { light: number; water: number };
  createdAt: number;
}

interface PlantState {
  plants: PlantData[];
  puddles: Puddle[];
  pulseEffects: PulseEffect[];
  currentLight: number;
  currentWater: number;
  currentWind: number;
  windDragging: boolean;
  generatePlant: (position?: [number, number, number]) => void;
  updateGrowth: (time: number) => void;
  setCurrentLight: (value: number) => void;
  setCurrentWater: (value: number) => void;
  setCurrentWind: (value: number) => void;
  setWindDragging: (value: boolean) => void;
  addPuddle: (position: [number, number, number]) => void;
  removeOldPuddles: (time: number) => void;
  addPulseEffect: (
    partId: string,
    plantId: string,
    partType: 'leaf' | 'flower' | 'stem',
    params: { light: number; water: number }
  ) => void;
  removeOldPulseEffects: (time: number) => void;
  getWaterCountNear: (position: [number, number], radius: number) => number;
}

let nextId = 0;
const genId = () => `id_${Date.now()}_${nextId++}`;

export const usePlantStore = create<PlantState>((set, get) => ({
  plants: [],
  puddles: [],
  pulseEffects: [],
  currentLight: 70,
  currentWater: 50,
  currentWind: 3,
  windDragging: false,

  generatePlant: (position?: [number, number, number]) => {
    const { currentLight, currentWater, currentWind } = get();
    const pos: [number, number, number] = position ?? [
      (Math.random() - 0.5) * 3,
      0,
      (Math.random() - 0.5) * 3,
    ];
    const newPlant: PlantData = {
      id: genId(),
      position: pos,
      growthProgress: 0,
      light: currentLight,
      water: currentWater,
      wind: currentWind,
      isGrowing: true,
      growStartTime: performance.now(),
    };
    set((state) => ({
      plants: state.plants.length >= 5 ? [...state.plants.slice(1), newPlant] : [...state.plants, newPlant],
    }));
  },

  updateGrowth: (time: number) => {
    set((state) => {
      let changed = false;
      const updated = state.plants.map((plant) => {
        if (!plant.isGrowing) return plant;
        const elapsed = (time - plant.growStartTime) / 2000;
        if (elapsed >= 1) {
          changed = true;
          return { ...plant, growthProgress: 1, isGrowing: false };
        }
        changed = true;
        return { ...plant, growthProgress: elapsed };
      });
      return changed ? { plants: updated } : {};
    });
  },

  setCurrentLight: (value: number) => set({ currentLight: Math.max(0, Math.min(100, value)) }),
  setCurrentWater: (value: number) => set({ currentWater: Math.max(0, Math.min(100, value)) }),
  setCurrentWind: (value: number) => set({ currentWind: Math.max(0, Math.min(10, value)) }),
  setWindDragging: (value: boolean) => set({ windDragging: value }),

  addPuddle: (position: [number, number, number]) => {
    if (get().puddles.length >= 20) {
      set((state) => ({
        puddles: [...state.puddles.slice(-19), { id: genId(), position, createdAt: performance.now() }],
      }));
    } else {
      set((state) => ({
        puddles: [...state.puddles, { id: genId(), position, createdAt: performance.now() }],
      }));
    }
  },

  removeOldPuddles: (time: number) => {
    set((state) => {
      const filtered = state.puddles.filter((p) => time - p.createdAt < 15000);
      return filtered.length !== state.puddles.length ? { puddles: filtered } : {};
    });
  },

  addPulseEffect: (partId, plantId, partType, params) => {
    set((state) => ({
      pulseEffects: [
        ...state.pulseEffects,
        { id: genId(), partId, plantId, partType, params, createdAt: performance.now() },
      ],
    }));
  },

  removeOldPulseEffects: (time: number) => {
    set((state) => {
      const filtered = state.pulseEffects.filter((p) => time - p.createdAt < 1000);
      return filtered.length !== state.pulseEffects.length ? { pulseEffects: filtered } : {};
    });
  },

  getWaterCountNear: (position, radius) => {
    const { puddles } = get();
    return puddles.filter((p) => {
      const dx = p.position[0] - position[0];
      const dz = p.position[2] - position[1];
      return Math.sqrt(dx * dx + dz * dz) < radius;
    }).length;
  },
}));
