import { create } from 'zustand'

export type EmotionMode = 'joy' | 'calm' | 'sorrow' | 'fervor'
export type ViewPreset = 'top45' | 'side90' | 'bottom30' | 'default'

export const EMOTION_CONFIGS: Record<EmotionMode, {
  color: [number, number, number]
  speedMultiplier: number
  amplitudeMultiplier: number
  label: string
  hex: string
}> = {
  joy: { color: [48, 100, 62], speedMultiplier: 1.5, amplitudeMultiplier: 1.8, label: '喜悦', hex: '#FFD93D' },
  calm: { color: [128, 50, 61], speedMultiplier: 0.5, amplitudeMultiplier: 0.6, label: '宁静', hex: '#6BCB77' },
  sorrow: { color: [217, 100, 65], speedMultiplier: 0.8, amplitudeMultiplier: 1.0, label: '忧愁', hex: '#4D96FF' },
  fervor: { color: [0, 100, 71], speedMultiplier: 2.0, amplitudeMultiplier: 2.5, label: '激昂', hex: '#FF6B6B' },
}

export const VIEW_PRESETS: Record<ViewPreset, { position: [number, number, number]; name: string }> = {
  default: { position: [0, 5, 20], name: '默认视角' },
  top45: { position: [0, 20, 20], name: '俯视 45°' },
  side90: { position: [25, 0, 0], name: '侧视 90°' },
  bottom30: { position: [0, -12, 20], name: '仰视 30°' },
}

interface StoreState {
  emotionMode: EmotionMode
  particleCount: number
  particleSize: number
  motionSpeed: number
  currentView: ViewPreset
  isMobile: boolean
  setEmotionMode: (mode: EmotionMode) => void
  setParticleCount: (count: number) => void
  setParticleSize: (size: number) => void
  setMotionSpeed: (speed: number) => void
  setCurrentView: (view: ViewPreset) => void
  setIsMobile: (val: boolean) => void
}

export const useStore = create<StoreState>((set) => ({
  emotionMode: 'joy',
  particleCount: 1000,
  particleSize: 0.2,
  motionSpeed: 1.0,
  currentView: 'default',
  isMobile: window.innerWidth < 768,
  setEmotionMode: (mode) => set({ emotionMode: mode }),
  setParticleCount: (count) => set({ particleCount: count }),
  setParticleSize: (size) => set({ particleSize: size }),
  setMotionSpeed: (speed) => set({ motionSpeed: speed }),
  setCurrentView: (view) => set({ currentView: view }),
  setIsMobile: (val) => set({ isMobile: val }),
}))
