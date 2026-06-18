import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';

export type GradientType = 'linear' | 'radial';
export type RadialShape = 'circle' | 'ellipse';

export interface ColorStop {
  id: string;
  color: string;
  position: number;
}

export interface GradientConfig {
  type: GradientType;
  stops: ColorStop[];
  angle: number;
  shape: RadialShape;
  centerX: number;
  centerY: number;
  selectedStopId: string | null;
}

export interface SavedGradient {
  id: string;
  name: string;
  config: GradientConfig;
  createdAt: number;
}

const LIBRARY_STORAGE_KEY = 'gradient-library';
const MAX_LIBRARY_SIZE = 50;

const createDefaultStops = (): ColorStop[] => [
  { id: uuidv4(), color: '#ff6b6b', position: 0 },
  { id: uuidv4(), color: '#4ecdc4', position: 25 },
  { id: uuidv4(), color: '#45b7d1', position: 50 },
  { id: uuidv4(), color: '#96c93d', position: 75 },
  { id: uuidv4(), color: '#f9ca24', position: 100 },
];

const loadLibraryFromStorage = (): SavedGradient[] => {
  try {
    const raw = localStorage.getItem(LIBRARY_STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch {
    // ignore
  }
  return [];
};

const saveLibraryToStorage = (library: SavedGradient[]) => {
  try {
    localStorage.setItem(LIBRARY_STORAGE_KEY, JSON.stringify(library));
  } catch {
    // ignore
  }
};

export const generateCSSGradient = (config: GradientConfig): string => {
  const sortedStops = [...config.stops].sort((a, b) => a.position - b.position);
  const stopsStr = sortedStops
    .map((stop) => `${stop.color} ${stop.position.toFixed(1)}%`)
    .join(', ');

  if (config.type === 'linear') {
    return `linear-gradient(${config.angle}deg, ${stopsStr})`;
  } else {
    return `radial-gradient(${config.shape} at ${config.centerX}% ${config.centerY}%, ${stopsStr})`;
  }
};

interface GradientStore {
  config: GradientConfig;
  library: SavedGradient[];
  searchQuery: string;

  setType: (type: GradientType) => void;
  addStop: () => void;
  removeStop: (id: string) => void;
  updateStopColor: (id: string, color: string) => void;
  updateStopPosition: (id: string, position: number) => void;
  selectStop: (id: string | null) => void;
  setAngle: (angle: number) => void;
  setShape: (shape: RadialShape) => void;
  setCenter: (x: number, y: number) => void;

  saveToLibrary: (name: string) => void;
  loadFromLibrary: (id: string) => void;
  deleteFromLibrary: (id: string) => void;
  setSearchQuery: (query: string) => void;
}

export const useGradientStore = create<GradientStore>((set, get) => ({
  config: {
    type: 'linear',
    stops: createDefaultStops(),
    angle: 135,
    shape: 'circle',
    centerX: 50,
    centerY: 50,
    selectedStopId: null,
  },
  library: loadLibraryFromStorage(),
  searchQuery: '',

  setType: (type) =>
    set((state) => ({
      config: { ...state.config, type },
    })),

  addStop: () =>
    set((state) => {
      const stops = [...state.config.stops];
      if (stops.length === 0) {
        return {
          config: {
            ...state.config,
            stops: [{ id: uuidv4(), color: '#ffffff', position: 50 }],
          },
        };
      }
      const lastStop = stops[stops.length - 1];
      const newPosition = Math.min(100, lastStop.position + 10);
      const newStop: ColorStop = {
        id: uuidv4(),
        color: lastStop.color,
        position: newPosition,
      };
      stops.push(newStop);
      return {
        config: {
          ...state.config,
          stops,
          selectedStopId: newStop.id,
        },
      };
    }),

  removeStop: (id) =>
    set((state) => {
      if (state.config.stops.length <= 2) {
        return state;
      }
      const newStops = state.config.stops.filter((s) => s.id !== id);
      const newSelectedId =
        state.config.selectedStopId === id
          ? newStops.length > 0
            ? newStops[0].id
            : null
          : state.config.selectedStopId;
      return {
        config: {
          ...state.config,
          stops: newStops,
          selectedStopId: newSelectedId,
        },
      };
    }),

  updateStopColor: (id, color) =>
    set((state) => ({
      config: {
        ...state.config,
        stops: state.config.stops.map((s) =>
          s.id === id ? { ...s, color } : s
        ),
      },
    })),

  updateStopPosition: (id, position) =>
    set((state) => ({
      config: {
        ...state.config,
        stops: state.config.stops.map((s) =>
          s.id === id ? { ...s, position: Math.max(0, Math.min(100, position)) } : s
        ),
      },
    })),

  selectStop: (id) =>
    set((state) => ({
      config: { ...state.config, selectedStopId: id },
    })),

  setAngle: (angle) =>
    set((state) => ({
      config: { ...state.config, angle: Math.max(0, Math.min(360, angle)) },
    })),

  setShape: (shape) =>
    set((state) => ({
      config: { ...state.config, shape },
    })),

  setCenter: (x, y) =>
    set((state) => ({
      config: {
        ...state.config,
        centerX: Math.max(0, Math.min(100, x)),
        centerY: Math.max(0, Math.min(100, y)),
      },
    })),

  saveToLibrary: (name) => {
    const saved: SavedGradient = {
      id: uuidv4(),
      name,
      config: JSON.parse(JSON.stringify(get().config)),
      createdAt: Date.now(),
    };
    set((state) => {
      let newLibrary = [saved, ...state.library];
      if (newLibrary.length > MAX_LIBRARY_SIZE) {
        newLibrary = newLibrary.slice(0, MAX_LIBRARY_SIZE);
      }
      saveLibraryToStorage(newLibrary);
      return { library: newLibrary };
    });
  },

  loadFromLibrary: (id) => {
    const saved = get().library.find((g) => g.id === id);
    if (saved) {
      set((state) => ({
        config: {
          ...JSON.parse(JSON.stringify(saved.config)),
          selectedStopId: state.config.selectedStopId,
        },
      }));
    }
  },

  deleteFromLibrary: (id) =>
    set((state) => {
      const newLibrary = state.library.filter((g) => g.id !== id);
      saveLibraryToStorage(newLibrary);
      return { library: newLibrary };
    }),

  setSearchQuery: (query) => set({ searchQuery: query }),
}));

export const hexToHsl = (hex: string): { h: number; s: number; l: number } => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return { h: 0, s: 0, l: 0 };

  let r = parseInt(result[1], 16) / 255;
  let g = parseInt(result[2], 16) / 255;
  let b = parseInt(result[3], 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  return { h: h * 360, s: s * 100, l: l * 100 };
};

export const hslToHex = (h: number, s: number, l: number): string => {
  h = h / 360;
  s = s / 100;
  l = l / 100;

  let r, g, b;

  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }

  const toHex = (x: number) => {
    const hex = Math.round(x * 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
};
