import { create } from 'zustand'
import * as THREE from 'three'

export type MotionMode = 'random' | 'vortex' | 'gravity' | 'explosion'
export type ColorMode = 'linear' | 'sine' | 'step'
export type SizeMode = 'constant' | 'pulse' | 'decay'

interface ParticleState {
  particleCount: number
  particleSpeed: number
  motionMode: MotionMode
  startColor: string
  endColor: string
  colorMode: ColorMode
  sizeMode: SizeMode
  gravityPosition: THREE.Vector3
  isGravityActive: boolean
  isExploding: boolean
  explosionProgress: number
  transitionProgress: number
  previousMode: MotionMode
  isTransitioning: boolean
  uiExpandedGroups: Record<string, boolean>
  isMobileDrawerOpen: boolean
  setParticleCount: (count: number) => void
  setParticleSpeed: (speed: number) => void
  setMotionMode: (mode: MotionMode) => void
  setStartColor: (color: string) => void
  setEndColor: (color: string) => void
  setColorMode: (mode: ColorMode) => void
  setSizeMode: (mode: SizeMode) => void
  setGravityPosition: (pos: THREE.Vector3) => void
  setIsGravityActive: (active: boolean) => void
  triggerExplosion: () => void
  setExplosionProgress: (progress: number) => void
  setTransitionProgress: (progress: number) => void
  toggleGroup: (group: string) => void
  setMobileDrawerOpen: (open: boolean) => void
  updateTransition: (dt: number) => void
  updateExplosion: (dt: number) => void
}

export const useParticleStore = create<ParticleState>((set, get) => ({
  particleCount: 3000,
  particleSpeed: 1.0,
  motionMode: 'random',
  startColor: '#00d4ff',
  endColor: '#7b2ff7',
  colorMode: 'linear',
  sizeMode: 'constant',
  gravityPosition: new THREE.Vector3(0, 0, 0),
  isGravityActive: false,
  isExploding: false,
  explosionProgress: 0,
  transitionProgress: 1,
  previousMode: 'random',
  isTransitioning: false,
  uiExpandedGroups: {
    particles: true,
    motion: true,
    colors: true
  },
  isMobileDrawerOpen: false,

  setParticleCount: (count) => set({ particleCount: count }),
  setParticleSpeed: (speed) => set({ particleSpeed: speed }),
  setMotionMode: (mode) => {
    const { motionMode: currentMode } = get()
    if (currentMode !== mode) {
      set({
        previousMode: currentMode,
        motionMode: mode,
        transitionProgress: 0,
        isTransitioning: true
      })
    }
  },
  setStartColor: (color) => set({ startColor: color }),
  setEndColor: (color) => set({ endColor: color }),
  setColorMode: (mode) => set({ colorMode: mode }),
  setSizeMode: (mode) => set({ sizeMode: mode }),
  setGravityPosition: (pos) => set({ gravityPosition: pos }),
  setIsGravityActive: (active) => set({ isGravityActive: active }),
  triggerExplosion: () => {
    const { motionMode: currentMode } = get()
    set({
      isExploding: true,
      explosionProgress: 0,
      previousMode: currentMode,
      motionMode: 'explosion'
    })
  },
  setExplosionProgress: (progress) => set({ explosionProgress: progress }),
  setTransitionProgress: (progress) => set({ transitionProgress: progress }),
  toggleGroup: (group) => set((state) => ({
    uiExpandedGroups: {
      ...state.uiExpandedGroups,
      [group]: !state.uiExpandedGroups[group]
    }
  })),
  setMobileDrawerOpen: (open) => set({ isMobileDrawerOpen: open }),

  updateTransition: (dt) => {
    const { isTransitioning, transitionProgress } = get()
    if (isTransitioning) {
      const newProgress = Math.min(transitionProgress + dt / 0.8, 1)
      set({
        transitionProgress: newProgress,
        isTransitioning: newProgress < 1
      })
    }
  },

  updateExplosion: (dt) => {
    const { isExploding, explosionProgress, previousMode, motionMode } = get()
    if (isExploding) {
      const newProgress = Math.min(explosionProgress + dt / 0.5, 1)
      if (newProgress >= 1) {
        set({
          isExploding: false,
          explosionProgress: 0,
          previousMode: motionMode,
          motionMode: 'random',
          transitionProgress: 0,
          isTransitioning: true
        })
      } else {
        set({ explosionProgress: newProgress })
      }
    }
  }
}))
