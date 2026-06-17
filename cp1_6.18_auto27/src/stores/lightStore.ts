import { v4 as uuidv4 } from 'uuid'
import { create } from 'zustand'
import type { LightData, LightType, ScenePreset } from '@/types'

const PRESET_LIVING: ScenePreset = {
  name: '简约客厅',
  description: '现代简约风格客厅，暖色调灯光氛围',
  wallColor: '#2a2a3e',
  floorColor: '#3a2a1a',
  furniture: [
    { type: 'sofa', position: [0, 0.4, 2], scale: [3, 0.8, 1], color: '#4a4a5e', rotation: 0 },
    { type: 'table', position: [0, 0.35, 0.5], scale: [1.5, 0.05, 0.8], color: '#5a4a3a', rotation: 0 },
    { type: 'shelf', position: [-3.5, 1.5, -3.5], scale: [0.4, 3, 1.5], color: '#5a5050', rotation: 0 },
    { type: 'tv', position: [0, 1, -3.8], scale: [2.5, 1.5, 0.1], color: '#1a1a2e', rotation: 0 },
    { type: 'rug', position: [0, 0.01, 1], scale: [3, 0.02, 2], color: '#3a3050', rotation: 0 },
  ],
  lights: [
    {
      id: uuidv4(),
      type: 'point',
      position: [0, 3.5, 0],
      intensity: 1.5,
      color: '#ffe4b5',
      distance: 12,
      decay: 2,
      angle: Math.PI / 4,
      penumbra: 0.5,
      target: [0, 0, 0],
    },
    {
      id: uuidv4(),
      type: 'spot',
      position: [0, 3.8, -3],
      intensity: 2,
      color: '#fff5e6',
      distance: 10,
      decay: 2,
      angle: Math.PI / 6,
      penumbra: 0.6,
      target: [0, 0, -3.5],
    },
  ],
}

const PRESET_STUDY: ScenePreset = {
  name: '书房角落',
  description: '安静阅读空间，柔和暖光与台灯配合',
  wallColor: '#2e2a2a',
  floorColor: '#2a1a0a',
  furniture: [
    { type: 'desk', position: [1.5, 0.4, -2.5], scale: [2, 0.05, 1], color: '#6a5040', rotation: 0 },
    { type: 'chair', position: [1.5, 0.3, -1.5], scale: [0.6, 0.6, 0.6], color: '#4a3a3a', rotation: 0 },
    { type: 'bookshelf', position: [-3, 1.5, -1], scale: [0.5, 3, 2], color: '#5a4030', rotation: 0 },
    { type: 'lamp', position: [2.5, 0.8, -2.5], scale: [0.15, 0.8, 0.15], color: '#8a7a6a', rotation: 0 },
    { type: 'rug', position: [0, 0.01, -1], scale: [2.5, 0.02, 2.5], color: '#3a2a2a', rotation: 0 },
  ],
  lights: [
    {
      id: uuidv4(),
      type: 'point',
      position: [1.5, 3, -2],
      intensity: 1.2,
      color: '#ffd699',
      distance: 8,
      decay: 2,
      angle: Math.PI / 4,
      penumbra: 0.5,
      target: [0, 0, 0],
    },
    {
      id: uuidv4(),
      type: 'spot',
      position: [2.5, 1.8, -2.5],
      intensity: 2.5,
      color: '#fff0cc',
      distance: 5,
      decay: 2,
      angle: Math.PI / 8,
      penumbra: 0.7,
      target: [2.5, 0, -2.5],
    },
  ],
}

const PRESET_GALLERY: ScenePreset = {
  name: '画廊展厅',
  description: '艺术展厅空间，冷白聚焦灯光照亮画作',
  wallColor: '#e8e4e0',
  floorColor: '#2a2a2a',
  furniture: [
    { type: 'wall-art-1', position: [-3.9, 1.8, -1], scale: [0.05, 1.5, 2], color: '#c0b0a0', rotation: 0 },
    { type: 'wall-art-2', position: [-3.9, 1.8, 2], scale: [0.05, 1.2, 1.5], color: '#a0b0c0', rotation: 0 },
    { type: 'pedestal', position: [0, 0.5, 0], scale: [0.6, 1, 0.6], color: '#d0d0d0', rotation: 0 },
    { type: 'pedestal-2', position: [2, 0.5, -2], scale: [0.5, 1, 0.5], color: '#d0d0d0', rotation: 0 },
    { type: 'bench', position: [0, 0.25, 2.5], scale: [2, 0.1, 0.5], color: '#5a5a5a', rotation: 0 },
  ],
  lights: [
    {
      id: uuidv4(),
      type: 'spot',
      position: [-3, 3.8, -1],
      intensity: 3,
      color: '#ffffff',
      distance: 8,
      decay: 2,
      angle: Math.PI / 8,
      penumbra: 0.4,
      target: [-3.9, 1.8, -1],
    },
    {
      id: uuidv4(),
      type: 'spot',
      position: [-3, 3.8, 2],
      intensity: 3,
      color: '#f0f0ff',
      distance: 8,
      decay: 2,
      angle: Math.PI / 8,
      penumbra: 0.4,
      target: [-3.9, 1.8, 2],
    },
    {
      id: uuidv4(),
      type: 'directional',
      position: [2, 4, 0],
      intensity: 0.8,
      color: '#e8e8f0',
      distance: 15,
      decay: 1,
      angle: Math.PI / 4,
      penumbra: 0.2,
      target: [0, 0, 0],
    },
  ],
}

export const SCENE_PRESETS: Record<string, ScenePreset> = {
  living: PRESET_LIVING,
  study: PRESET_STUDY,
  gallery: PRESET_GALLERY,
}

interface LightStore {
  lights: LightData[]
  selectedLightId: string | null
  currentPreset: string
  presetData: ScenePreset
  addLight: (type: LightType) => void
  removeLight: (id: string) => void
  updateLight: (id: string, updates: Partial<LightData>) => void
  selectLight: (id: string | null) => void
  setPreset: (presetName: string) => void
}

const createDefaultLight = (type: LightType): LightData => ({
  id: uuidv4(),
  type,
  position: [0, 3, 0],
  intensity: type === 'directional' ? 1 : 2,
  color: '#ffffff',
  distance: 10,
  decay: 2,
  angle: Math.PI / 4,
  penumbra: 0.5,
  target: [0, 0, 0],
})

export const useLightStore = create<LightStore>((set) => ({
  lights: PRESET_LIVING.lights.map((l) => ({ ...l })),
  selectedLightId: null,
  currentPreset: 'living',
  presetData: PRESET_LIVING,
  addLight: (type) =>
    set((state) => {
      if (state.lights.length >= 8) return state
      const newLight = createDefaultLight(type)
      return { lights: [...state.lights, newLight], selectedLightId: newLight.id }
    }),
  removeLight: (id) =>
    set((state) => ({
      lights: state.lights.filter((l) => l.id !== id),
      selectedLightId: state.selectedLightId === id ? null : state.selectedLightId,
    })),
  updateLight: (id, updates) =>
    set((state) => ({
      lights: state.lights.map((l) => (l.id === id ? { ...l, ...updates } : l)),
    })),
  selectLight: (id) => set({ selectedLightId: id }),
  setPreset: (presetName) =>
    set(() => {
      const preset = SCENE_PRESETS[presetName]
      if (!preset) return {}
      return {
        currentPreset: presetName,
        presetData: preset,
        lights: preset.lights.map((l) => ({ ...l })),
        selectedLightId: null,
      }
    }),
}))
