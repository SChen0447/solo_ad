import { create } from 'zustand'

export type TimingPreset = 'ease' | 'ease-in' | 'ease-out' | 'ease-in-out' | 'linear' | 'custom'

export interface AnimationParams {
  duration: number
  delay: number
  iterations: number
  timingPreset: TimingPreset
  cubicBezier: [number, number, number, number]
}

export interface AnimationState {
  code: string
  originalCode: string
  params: AnimationParams
  compareMode: boolean
  animationKey: number
  setCode: (code: string) => void
  setOriginalCode: (code: string) => void
  setDuration: (duration: number) => void
  setDelay: (delay: number) => void
  setIterations: (iterations: number) => void
  setTimingPreset: (preset: TimingPreset) => void
  setCubicBezier: (bezier: [number, number, number, number]) => void
  toggleCompareMode: () => void
  replayAnimation: () => void
}

const DEFAULT_CODE = `@keyframes demo {
  0% {
    transform: translateX(0) rotate(0deg);
    background-color: #3b82f6;
  }
  50% {
    transform: translateX(150px) rotate(180deg);
    background-color: #8b5cf6;
  }
  100% {
    transform: translateX(0) rotate(360deg);
    background-color: #3b82f6;
  }
}

.animated-element {
  animation: demo 2s ease-in-out infinite;
}`

const DEFAULT_PARAMS: AnimationParams = {
  duration: 2,
  delay: 0,
  iterations: 1,
  timingPreset: 'ease-in-out',
  cubicBezier: [0.42, 0, 0.58, 1],
}

export const useAnimationStore = create<AnimationState>((set, get) => ({
  code: DEFAULT_CODE,
  originalCode: DEFAULT_CODE,
  params: DEFAULT_PARAMS,
  compareMode: false,
  animationKey: 0,

  setCode: (code) => set({ code, animationKey: get().animationKey + 1 }),
  setOriginalCode: (originalCode) => set({ originalCode }),
  setDuration: (duration) =>
    set({ params: { ...get().params, duration }, animationKey: get().animationKey + 1 }),
  setDelay: (delay) =>
    set({ params: { ...get().params, delay }, animationKey: get().animationKey + 1 }),
  setIterations: (iterations) =>
    set({ params: { ...get().params, iterations }, animationKey: get().animationKey + 1 }),
  setTimingPreset: (timingPreset) =>
    set({ params: { ...get().params, timingPreset }, animationKey: get().animationKey + 1 }),
  setCubicBezier: (cubicBezier) =>
    set({
      params: { ...get().params, cubicBezier, timingPreset: 'custom' },
      animationKey: get().animationKey + 1,
    }),
  toggleCompareMode: () => set({ compareMode: !get().compareMode }),
  replayAnimation: () => set({ animationKey: get().animationKey + 1 }),
}))
