import { create } from 'zustand'
import * as THREE from 'three'

export interface FragmentData {
  id: string
  name: string
  size: number
  file: File
  geometry: THREE.BufferGeometry | null
  position: THREE.Vector3
  rotation: THREE.Euler
  scale: THREE.Vector3
  selected: boolean
  thumbnail: string | null
  edgePoints: THREE.Vector3[]
  curvatures: number[]
  isAnimating: boolean
}

export interface MatchResult {
  fragmentAId: string
  fragmentBId: string
  score: number
  bestAlignMatrix: THREE.Matrix4
  edgeDistance: number
  timestamp: number
}

export interface MatchHistoryEntry {
  id: string
  fragmentAId: string
  fragmentBId: string
  score: number
  timestamp: number
}

export interface AppConfig {
  matchThreshold: number
  rotationStep: number
  fineRotationStep: number
  gridRadius: number
  backgroundColor: string
  panelColor: string
  highlightColor: string
}

interface AppState {
  fragments: FragmentData[]
  selectedFragmentId: string | null
  matchResults: Map<string, MatchResult>
  matchHistory: MatchHistoryEntry[]
  isPreviewMode: boolean
  mergedGeometry: THREE.BufferGeometry | null
  config: AppConfig
  panelExpanded: {
    fragmentList: boolean
    matchPanel: boolean
  }

  addFragment: (fragment: Omit<FragmentData, 'id'> & { id?: string }) => void
  removeFragment: (id: string) => void
  selectFragment: (id: string | null) => void
  updateFragmentTransform: (
    id: string,
    position?: THREE.Vector3,
    rotation?: THREE.Euler,
    scale?: THREE.Vector3
  ) => void
  setFragmentGeometry: (id: string, geometry: THREE.BufferGeometry) => void
  setFragmentEdgeData: (id: string, edgePoints: THREE.Vector3[], curvatures: number[]) => void
  setFragmentThumbnail: (id: string, thumbnail: string) => void
  setFragmentAnimating: (id: string, isAnimating: boolean) => void

  addMatchResult: (result: MatchResult) => void
  clearMatchResults: () => void

  addMatchHistory: (entry: Omit<MatchHistoryEntry, 'id' | 'timestamp'>) => void

  setPreviewMode: (enabled: boolean, mergedGeometry?: THREE.BufferGeometry | null) => void

  setPanelExpanded: (panel: 'fragmentList' | 'matchPanel', expanded: boolean) => void
  updateConfig: (config: Partial<AppConfig>) => void

  getFragmentById: (id: string) => FragmentData | undefined
  getSelectedFragment: () => FragmentData | undefined
  getMatchResult: (aId: string, bId: string) => MatchResult | undefined
}

const generateId = () =>
  `frag_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

const defaultConfig: AppConfig = {
  matchThreshold: 0.5,
  rotationStep: 15,
  fineRotationStep: 1,
  gridRadius: 10,
  backgroundColor: '#1a1a2e',
  panelColor: '#16213e',
  highlightColor: '#e94560'
}

export const useAppStore = create<AppState>((set, get) => ({
  fragments: [],
  selectedFragmentId: null,
  matchResults: new Map(),
  matchHistory: [],
  isPreviewMode: false,
  mergedGeometry: null,
  config: defaultConfig,
  panelExpanded: {
    fragmentList: true,
    matchPanel: true
  },

  addFragment: (fragment) => {
    const id = fragment.id || generateId()
    const newFragment: FragmentData = {
      ...fragment,
      id,
      position: fragment.position || new THREE.Vector3(),
      rotation: fragment.rotation || new THREE.Euler(),
      scale: fragment.scale || new THREE.Vector3(1, 1, 1),
      selected: false,
      edgePoints: fragment.edgePoints || [],
      curvatures: fragment.curvatures || [],
      isAnimating: false
    }
    set((state) => ({
      fragments: [...state.fragments, newFragment]
    }))
  },

  removeFragment: (id) => {
    set((state) => {
      const newMatchResults = new Map(state.matchResults)
      newMatchResults.forEach((_, key) => {
        if (key.includes(id)) {
          newMatchResults.delete(key)
        }
      })
      return {
        fragments: state.fragments.filter((f) => f.id !== id),
        selectedFragmentId: state.selectedFragmentId === id ? null : state.selectedFragmentId,
        matchResults: newMatchResults
      }
    })
  },

  selectFragment: (id) => {
    set((state) => ({
      selectedFragmentId: id,
      fragments: state.fragments.map((f) => ({
        ...f,
        selected: f.id === id
      }))
    }))
  },

  updateFragmentTransform: (id, position, rotation, scale) => {
    set((state) => ({
      fragments: state.fragments.map((f) => {
        if (f.id !== id) return f
        return {
          ...f,
          position: position ? position.clone() : f.position,
          rotation: rotation ? rotation.clone() : f.rotation,
          scale: scale ? scale.clone() : f.scale
        }
      })
    }))
  },

  setFragmentGeometry: (id, geometry) => {
    set((state) => ({
      fragments: state.fragments.map((f) =>
        f.id === id ? { ...f, geometry } : f
      )
    }))
  },

  setFragmentEdgeData: (id, edgePoints, curvatures) => {
    set((state) => ({
      fragments: state.fragments.map((f) =>
        f.id === id ? { ...f, edgePoints, curvatures } : f
      )
    }))
  },

  setFragmentThumbnail: (id, thumbnail) => {
    set((state) => ({
      fragments: state.fragments.map((f) =>
        f.id === id ? { ...f, thumbnail } : f
      )
    }))
  },

  setFragmentAnimating: (id, isAnimating) => {
    set((state) => ({
      fragments: state.fragments.map((f) =>
        f.id === id ? { ...f, isAnimating } : f
      )
    }))
  },

  addMatchResult: (result) => {
    const key = [result.fragmentAId, result.fragmentBId].sort().join('|')
    set((state) => {
      const newMatchResults = new Map(state.matchResults)
      newMatchResults.set(key, result)
      return { matchResults: newMatchResults }
    })
  },

  clearMatchResults: () => {
    set({ matchResults: new Map() })
  },

  addMatchHistory: (entry) => {
    const historyEntry: MatchHistoryEntry = {
      ...entry,
      id: `hist_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      timestamp: Date.now()
    }
    set((state) => ({
      matchHistory: [...state.matchHistory, historyEntry].slice(-100)
    }))
  },

  setPreviewMode: (enabled, mergedGeometry) => {
    set({
      isPreviewMode: enabled,
      mergedGeometry: mergedGeometry !== undefined ? mergedGeometry : null
    })
  },

  setPanelExpanded: (panel, expanded) => {
    set((state) => ({
      panelExpanded: {
        ...state.panelExpanded,
        [panel]: expanded
      }
    }))
  },

  updateConfig: (config) => {
    set((state) => ({
      config: { ...state.config, ...config }
    }))
  },

  getFragmentById: (id) => {
    return get().fragments.find((f) => f.id === id)
  },

  getSelectedFragment: () => {
    const id = get().selectedFragmentId
    return id ? get().fragments.find((f) => f.id === id) : undefined
  },

  getMatchResult: (aId, bId) => {
    const key = [aId, bId].sort().join('|')
    return get().matchResults.get(key)
  }
}))
