import { create } from 'zustand'
import { analyzeEmotions } from '../utils/emotionAnalyzer'

export interface EmotionDimensions {
  joy: number
  sadness: number
  anger: number
  calm: number
  anxiety: number
}

export interface ParticleParams {
  count: number
  speedMultiplier: number
  baseColor: { r: number; g: number; b: number; a: number }
}

export interface UIState {
  isGenerating: boolean
  diaryText: string
}

interface EmotionStore {
  emotions: EmotionDimensions
  particleParams: ParticleParams
  ui: UIState
  setEmotions: (emotions: Partial<EmotionDimensions>) => void
  setParticleParams: (params: Partial<ParticleParams>) => void
  setDiaryText: (text: string) => void
  setIsGenerating: (isGenerating: boolean) => void
  generateFromText: (text: string) => void
}

const defaultEmotions: EmotionDimensions = {
  joy: 0.5,
  sadness: 0.3,
  anger: 0.2,
  calm: 0.6,
  anxiety: 0.4
}

const defaultParticleParams: ParticleParams = {
  count: 1000,
  speedMultiplier: 1,
  baseColor: { r: 100, g: 150, b: 255, a: 1 }
}

const defaultUI: UIState = {
  isGenerating: false,
  diaryText: ''
}

export const useEmotionStore = create<EmotionStore>((set, get) => ({
  emotions: defaultEmotions,
  particleParams: defaultParticleParams,
  ui: defaultUI,

  setEmotions: (emotions) => set((state) => ({
    emotions: { ...state.emotions, ...emotions }
  })),

  setParticleParams: (params) => set((state) => ({
    particleParams: { ...state.particleParams, ...params }
  })),

  setDiaryText: (text) => set({
    ui: { ...get().ui, diaryText: text }
  }),

  setIsGenerating: (isGenerating) => set({
    ui: { ...get().ui, isGenerating }
  }),

  generateFromText: (text) => {
    set({ ui: { ...get().ui, isGenerating: true, diaryText: text } })
    
    const emotions = analyzeEmotions(text)
    
    setTimeout(() => {
      set({
        emotions,
        ui: { ...get().ui, isGenerating: false }
      })
    }, 300)
  }
}))
