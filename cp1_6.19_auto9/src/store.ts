import { create } from 'zustand'

export type TabType = 'settings' | 'filters'

interface StarStore {
  starCount: number
  setStarCount: (count: number) => void
  speedMultiplier: number
  setSpeedMultiplier: (speed: number) => void
  orbitScale: number
  setOrbitScale: (scale: number) => void
  trailLength: number
  setTrailLength: (length: number) => void
  blurIntensity: number
  setBlurIntensity: (intensity: number) => void
  colorGradientMode: boolean
  setColorGradientMode: (enabled: boolean) => void
  resetView: () => void
  viewResetTrigger: number
  activeTab: TabType
  setActiveTab: (tab: TabType) => void
  performanceLow: boolean
  setPerformanceLow: (low: boolean) => void
  fps: number
  setFps: (fps: number) => void
}

export const useStarStore = create<StarStore>((set) => ({
  starCount: 200,
  setStarCount: (count) => set({ starCount: count }),
  speedMultiplier: 1.0,
  setSpeedMultiplier: (speed) => set({ speedMultiplier: speed }),
  orbitScale: 1.0,
  setOrbitScale: (scale) => set({ orbitScale: scale }),
  trailLength: 60,
  setTrailLength: (length) => set({ trailLength: length }),
  blurIntensity: 0,
  setBlurIntensity: (intensity) => set({ blurIntensity: intensity }),
  colorGradientMode: false,
  setColorGradientMode: (enabled) => set({ colorGradientMode: enabled }),
  resetView: () => set((state) => ({ viewResetTrigger: state.viewResetTrigger + 1 })),
  viewResetTrigger: 0,
  activeTab: 'settings',
  setActiveTab: (tab) => set({ activeTab: tab }),
  performanceLow: false,
  setPerformanceLow: (low) => set({ performanceLow: low }),
  fps: 60,
  setFps: (fps) => set({ fps }),
}))

export const STAR_COLORS = [
  '#9b59b6',
  '#2ecc71',
  '#3498db',
  '#e67e22',
  '#e74c3c',
  '#ecf0f1',
  '#f1c40f',
  '#1abc9c',
]

export const DEFAULTS = {
  starCount: 200,
  speedMultiplier: 1.0,
  orbitScale: 1.0,
  trailLength: 60,
  blurIntensity: 0,
}
