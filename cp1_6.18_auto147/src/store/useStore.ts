import { create } from 'zustand';

export interface NebulaParameters {
  density: number;
  colorScheme: number;
  rotationSpeed: number;
  particleSize: number;
  spread: number;
}

export interface ParticleData {
  positions: Float32Array;
  colors: Float32Array;
  sizes: Float32Array;
  orbitRadii: Float32Array;
  orbitSpeeds: Float32Array;
  orbitPhases: Float32Array;
  opacityOffsets: Float32Array;
  count: number;
}

export const COLOR_SCHEMES = [
  { name: '蓝紫', colors: [[0.3, 0.4, 1.0], [0.6, 0.2, 0.9], [0.9, 0.3, 0.7]] },
  { name: '红橙', colors: [[1.0, 0.3, 0.1], [1.0, 0.6, 0.1], [1.0, 0.9, 0.3]] },
  { name: '绿青', colors: [[0.1, 0.9, 0.5], [0.1, 0.7, 0.8], [0.2, 0.5, 1.0]] },
  { name: '金白', colors: [[1.0, 0.85, 0.4], [1.0, 0.95, 0.8], [0.9, 0.9, 1.0]] },
  { name: '暗红', colors: [[0.8, 0.1, 0.1], [0.6, 0.05, 0.2], [0.4, 0.0, 0.3]] },
];

interface NebulaStore {
  parameters: NebulaParameters;
  particleData: ParticleData | null;
  isGenerating: boolean;
  autoCruise: boolean;
  fps: number;
  adaptiveEnabled: boolean;
  activeParticleCount: number;
  generated: boolean;

  setParameter: <K extends keyof NebulaParameters>(key: K, value: NebulaParameters[K]) => void;
  setParticleData: (data: ParticleData) => void;
  setGenerating: (v: boolean) => void;
  setAutoCruise: (v: boolean) => void;
  setFps: (v: number) => void;
  setAdaptiveEnabled: (v: boolean) => void;
  setActiveParticleCount: (v: number) => void;
  setGenerated: (v: boolean) => void;
}

export const useStore = create<NebulaStore>((set) => ({
  parameters: {
    density: 2000,
    colorScheme: 0,
    rotationSpeed: 0.3,
    particleSize: 3,
    spread: 1.0,
  },
  particleData: null,
  isGenerating: false,
  autoCruise: false,
  fps: 60,
  adaptiveEnabled: true,
  activeParticleCount: 0,
  generated: false,

  setParameter: (key, value) =>
    set((state) => ({ parameters: { ...state.parameters, [key]: value } })),
  setParticleData: (data) => set({ particleData: data, activeParticleCount: data.count }),
  setGenerating: (v) => set({ isGenerating: v }),
  setAutoCruise: (v) => set({ autoCruise: v }),
  setFps: (v) => set({ fps: v }),
  setAdaptiveEnabled: (v) => set({ adaptiveEnabled: v }),
  setActiveParticleCount: (v) => set({ activeParticleCount: v }),
  setGenerated: (v) => set({ generated: v }),
}));
