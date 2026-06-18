import { create } from 'zustand'

export interface WaveSource {
  id: number
  position: [number, number, number]
  frequency: number
  amplitude: number
  phase: number
  enabled: boolean
}

export type VisualizationMode = 'wave' | 'interference-slice' | 'energy'

interface WaveState {
  sources: WaveSource[]
  mode: VisualizationMode
  showInterference: boolean
  sliceZ: number
  interferenceData: Float32Array | null
  energyData: Float32Array | null
  time: number
  fps: number
  nextId: number

  addSource: () => void
  removeSource: (id: number) => void
  updateSource: (id: number, updates: Partial<Omit<WaveSource, 'id'>>) => void
  setMode: (mode: VisualizationMode) => void
  setShowInterference: (show: boolean) => void
  setSliceZ: (z: number) => void
  setInterferenceData: (data: Float32Array | null) => void
  setEnergyData: (data: Float32Array | null) => void
  setTime: (time: number) => void
  setFps: (fps: number) => void
}

const DEFAULT_POSITIONS: [number, number, number][] = [
  [-3, 0, 0],
  [3, 0, 0],
  [0, 3, 0],
]

function createDefaultSources(): WaveSource[] {
  return [0, 1].map((i) => ({
    id: i + 1,
    position: DEFAULT_POSITIONS[i],
    frequency: 30,
    amplitude: 5,
    phase: 0,
    enabled: true,
  }))
}

export const useWaveStore = create<WaveState>((set) => ({
  sources: createDefaultSources(),
  mode: 'wave',
  showInterference: false,
  sliceZ: 0,
  interferenceData: null,
  energyData: null,
  time: 0,
  fps: 0,
  nextId: 3,

  addSource: () =>
    set((state) => {
      if (state.sources.length >= 3) return state
      const idx = state.sources.length
      return {
        sources: [
          ...state.sources,
          {
            id: state.nextId,
            position: DEFAULT_POSITIONS[idx] || [0, 0, 0],
            frequency: 30,
            amplitude: 5,
            phase: 0,
            enabled: true,
          },
        ],
        nextId: state.nextId + 1,
      }
    }),

  removeSource: (id) =>
    set((state) => ({
      sources: state.sources.filter((s) => s.id !== id),
    })),

  updateSource: (id, updates) =>
    set((state) => ({
      sources: state.sources.map((s) =>
        s.id === id ? { ...s, ...updates } : s
      ),
    })),

  setMode: (mode) => set({ mode }),
  setShowInterference: (show) => set({ showInterference: show }),
  setSliceZ: (z) => set({ sliceZ: z }),
  setInterferenceData: (data) => set({ interferenceData: data }),
  setEnergyData: (data) => set({ energyData: data }),
  setTime: (time) => set({ time }),
  setFps: (fps) => set({ fps }),
}))
