import { create } from 'zustand'

export type ParticleType = 'wind' | 'rain' | 'snow' | 'wind+rain'

export interface LightningEffect {
  id: number
  position: [number, number, number]
  timestamp: number
}

export interface ShockwaveEffect {
  id: number
  position: [number, number, number]
  timestamp: number
}

interface WeatherState {
  particleType: ParticleType
  density: number
  speed: number
  windDirection: number
  lightningEffects: LightningEffect[]
  shockwaveEffects: ShockwaveEffect[]
  terrainHeightFn: ((x: number, z: number) => number) | null
  animationTransition: number
  targetParticleType: ParticleType | null

  setParticleType: (type: ParticleType) => void
  setDensity: (density: number) => void
  setSpeed: (speed: number) => void
  setWindDirection: (dir: number) => void
  setTerrainHeightFn: (fn: (x: number, z: number) => number) => void
  addLightning: (position: [number, number, number]) => void
  addShockwave: (position: [number, number, number]) => void
  cleanupEffects: () => void
  updateTransition: (delta: number) => void
  cycleWeather: () => void
}

const weatherCycle: ParticleType[] = ['wind', 'rain', 'snow', 'wind+rain']

export const useWeatherStore = create<WeatherState>((set, get) => ({
  particleType: 'wind',
  density: 100,
  speed: 1,
  windDirection: 0,
  lightningEffects: [],
  shockwaveEffects: [],
  terrainHeightFn: null,
  animationTransition: 1,
  targetParticleType: null,

  setParticleType: (type: ParticleType) => {
    const current = get().particleType
    if (current === type) return
    set({ targetParticleType: type, animationTransition: 0 })
  },

  setDensity: (density: number) => set({ density: Math.max(0, Math.min(200, density)) }),
  setSpeed: (speed: number) => set({ speed: Math.max(0.1, Math.min(5, speed)) }),
  setWindDirection: (dir: number) => set({ windDirection: dir }),
  setTerrainHeightFn: (fn) => set({ terrainHeightFn: fn }),

  addLightning: (position: [number, number, number]) => {
    const id = Date.now() + Math.random()
    set((state) => ({
      lightningEffects: [...state.lightningEffects, { id, position, timestamp: performance.now() }]
    }))
    setTimeout(() => {
      set((state) => ({
        lightningEffects: state.lightningEffects.filter((e) => e.id !== id)
      }))
    }, 300)
  },

  addShockwave: (position: [number, number, number]) => {
    const id = Date.now() + Math.random()
    set((state) => ({
      shockwaveEffects: [...state.shockwaveEffects, { id, position, timestamp: performance.now() }]
    }))
    setTimeout(() => {
      set((state) => ({
        shockwaveEffects: state.shockwaveEffects.filter((e) => e.id !== id)
      }))
    }, 1000)
  },

  cleanupEffects: () => {
    const now = performance.now()
    set((state) => ({
      lightningEffects: state.lightningEffects.filter((e) => now - e.timestamp < 300),
      shockwaveEffects: state.shockwaveEffects.filter((e) => now - e.timestamp < 1000)
    }))
  },

  updateTransition: (delta: number) => {
    const { animationTransition, targetParticleType } = get()
    if (targetParticleType !== null) {
      const newTransition = Math.min(1, animationTransition + delta * 2)
      if (newTransition >= 1 && animationTransition < 0.5) {
        set({ particleType: targetParticleType })
      }
      if (newTransition >= 1) {
        set({ animationTransition: 1, targetParticleType: null })
      } else {
        set({ animationTransition: newTransition })
      }
    }
  },

  cycleWeather: () => {
    const { particleType } = get()
    const currentIndex = weatherCycle.indexOf(particleType)
    const nextIndex = (currentIndex + 1) % weatherCycle.length
    get().setParticleType(weatherCycle[nextIndex])
  }
}))
