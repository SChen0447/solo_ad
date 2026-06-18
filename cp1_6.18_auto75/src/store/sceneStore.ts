import { create } from 'zustand'
import { v4 as uuidv4 } from 'uuid'
import type {
  GeometryItem,
  GeometryType,
  LightingParams,
  MaterialProps,
  Rotation3,
  Vector3,
} from '../types'

interface SceneState {
  geometries: GeometryItem[]
  selectedId: string | null
  lighting: LightingParams

  addGeometry: (type: GeometryType, position?: Partial<Vector3>) => void
  removeGeometry: (id: string) => void
  updateGeometry: (id: string, updates: Partial<Omit<GeometryItem, 'id' | 'createdAt'>>) => void
  selectGeometry: (id: string | null) => void

  setDirectionalLight: (params: Partial<LightingParams['directional']>) => void
  setAmbientLight: (params: Partial<LightingParams['ambient']>) => void
  setPointLight: (params: Partial<LightingParams['point']>) => void

  updateGeometryPosition: (id: string, position: Partial<Vector3>) => void
  updateGeometryRotation: (id: string, rotation: Partial<Rotation3>) => void
  updateGeometryScale: (id: string, scale: number) => void
  updateGeometryMaterial: (id: string, material: Partial<MaterialProps>) => void
}

const randomColor = (): string => {
  const colors = [
    '#ff6b9d',
    '#c44dff',
    '#4fc3f7',
    '#66ffa6',
    '#ffd54f',
    '#ff8a65',
    '#7c4dff',
    '#4dd0e1',
  ]
  return colors[Math.floor(Math.random() * colors.length)]
}

export const useSceneStore = create<SceneState>((set, get) => ({
  geometries: [],
  selectedId: null,
  lighting: {
    directional: {
      azimuth: 45,
      elevation: 60,
      intensity: 1.2,
    },
    ambient: {
      intensity: 0.6,
    },
    point: {
      color: '#ffffff',
      position: { x: 2, y: 3, z: 2 },
      intensity: 1.0,
    },
  },

  addGeometry: (type, position) => {
    const id = uuidv4()
    const geometry: GeometryItem = {
      id,
      type,
      position: { x: position?.x ?? 0, y: position?.y ?? 1, z: position?.z ?? 0 },
      rotation: {
        pitch: Math.random() * 360,
        yaw: Math.random() * 360,
        roll: Math.random() * 360,
      },
      scale: 1,
      material: {
        metalness: 0.3 + Math.random() * 0.4,
        roughness: 0.2 + Math.random() * 0.5,
        color: randomColor(),
      },
      createdAt: Date.now(),
    }
    set((state) => ({
      geometries: [...state.geometries, geometry],
      selectedId: id,
    }))
  },

  removeGeometry: (id) => {
    set((state) => ({
      geometries: state.geometries.filter((g) => g.id !== id),
      selectedId: state.selectedId === id ? null : state.selectedId,
    }))
  },

  updateGeometry: (id, updates) => {
    set((state) => ({
      geometries: state.geometries.map((g) => (g.id === id ? { ...g, ...updates } : g)),
    }))
  },

  selectGeometry: (id) => {
    set({ selectedId: id })
  },

  setDirectionalLight: (params) => {
    set((state) => ({
      lighting: {
        ...state.lighting,
        directional: { ...state.lighting.directional, ...params },
      },
    }))
  },

  setAmbientLight: (params) => {
    set((state) => ({
      lighting: {
        ...state.lighting,
        ambient: { ...state.lighting.ambient, ...params },
      },
    }))
  },

  setPointLight: (params) => {
    set((state) => ({
      lighting: {
        ...state.lighting,
        point: { ...state.lighting.point, ...params },
      },
    }))
  },

  updateGeometryPosition: (id, position) => {
    get().updateGeometry(id, {
      position: { ...get().geometries.find((g) => g.id === id)!.position, ...position },
    })
  },

  updateGeometryRotation: (id, rotation) => {
    get().updateGeometry(id, {
      rotation: { ...get().geometries.find((g) => g.id === id)!.rotation, ...rotation },
    })
  },

  updateGeometryScale: (id, scale) => {
    get().updateGeometry(id, { scale })
  },

  updateGeometryMaterial: (id, material) => {
    const current = get().geometries.find((g) => g.id === id)
    if (current) {
      get().updateGeometry(id, { material: { ...current.material, ...material } })
    }
  },
}))
