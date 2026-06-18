import { create } from 'zustand'
import { v4 as uuidv4 } from 'uuid'

export interface Star {
  id: string
  name: string
  mass: number
  position: { x: number; y: number; z: number }
  velocity: { x: number; y: number; z: number }
  color: string
  trail: { x: number; y: number; z: number }[]
  initialState: {
    position: { x: number; y: number; z: number }
    velocity: { x: number; y: number; z: number }
  }
}

export interface CameraState {
  position: { x: number; y: number; z: number }
  zoom: number
}

export interface EnergyDataPoint {
  time: number
  kinetic: number
  potential: number
  total: number
  perStar: { [starId: string]: number }
}

interface SimulationState {
  stars: Star[]
  isSimulating: boolean
  time: number
  energyHistory: EnergyDataPoint[]
  maxEnergyPoints: number
  hoveredStarId: string | null

  addStar: (star?: Partial<Star>) => void
  removeStar: (id: string) => void
  updateStar: (id: string, updates: Partial<Star>) => void
  setSimulating: (value: boolean) => void
  resetSimulation: () => void
  updatePhysics: (newStars: Star[], newEnergy: EnergyDataPoint) => void
  setHoveredStarId: (id: string | null) => void
}

let starCounter = 0

const generateStarName = () => {
  starCounter++
  return `Star-${String(starCounter).padStart(2, '0')}`
}

const defaultColors = [
  '#ff6b6b',
  '#4ecdc4',
  '#ffe66d',
  '#95e1d3',
  '#f38181',
  '#aa96da',
  '#fcbad3',
  '#a8d8ea',
]

const getDefaultColor = () => {
  return defaultColors[starCounter % defaultColors.length]
}

export const useSimulationStore = create<SimulationState>((set, get) => ({
  stars: [],
  isSimulating: false,
  time: 0,
  energyHistory: [],
  maxEnergyPoints: 200,
  hoveredStarId: null,

  addStar: (star) => {
    const name = star?.name || generateStarName()
    const newStar: Star = {
      id: star?.id || uuidv4(),
      name,
      mass: star?.mass ?? 1,
      position: star?.position || { x: 0, y: 0, z: 0 },
      velocity: star?.velocity || { x: 0, y: 0, z: 0 },
      color: star?.color || getDefaultColor(),
      trail: [],
      initialState: {
        position: { ...(star?.position || { x: 0, y: 0, z: 0 }) },
        velocity: { ...(star?.velocity || { x: 0, y: 0, z: 0 }) },
      },
    }
    set((state) => ({ stars: [...state.stars, newStar] }))
  },

  removeStar: (id) => {
    set((state) => ({
      stars: state.stars.filter((s) => s.id !== id),
    }))
  },

  updateStar: (id, updates) => {
    set((state) => ({
      stars: state.stars.map((s) => {
        if (s.id !== id) return s
        const updated = { ...s, ...updates }
        if (updates.position) {
          updated.initialState = {
            ...s.initialState,
            position: { ...updates.position },
          }
        }
        if (updates.velocity) {
          updated.initialState = {
            ...s.initialState,
            velocity: { ...updates.velocity },
          }
        }
        return updated
      }),
    }))
  },

  setSimulating: (value) => {
    set({ isSimulating: value })
  },

  resetSimulation: () => {
    set((state) => ({
      isSimulating: false,
      time: 0,
      energyHistory: [],
      stars: state.stars.map((s) => ({
        ...s,
        position: { ...s.initialState.position },
        velocity: { ...s.initialState.velocity },
        trail: [],
      })),
    }))
  },

  updatePhysics: (newStars, newEnergy) => {
    set((state) => {
      const newHistory = [...state.energyHistory, newEnergy]
      if (newHistory.length > state.maxEnergyPoints) {
        newHistory.shift()
      }
      return {
        stars: newStars,
        time: state.time + 0.01,
        energyHistory: newHistory,
      }
    })
  },

  setHoveredStarId: (id) => {
    set({ hoveredStarId: id })
  },
}))
