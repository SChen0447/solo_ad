import { create } from 'zustand'

export interface AnimationParams {
  duration: number
  delay: number
  iterations: number
  timingFunction: string
  cubicBezier: { x1: number; y1: number; x2: number; y2: number }
  useCubicBezier: boolean
}

interface AnimationState {
  code: string
  originalCode: string
  params: AnimationParams
  compareMode: boolean
  playKey: number
  setCode: (code: string) => void
  setOriginalCode: (code: string) => void
  setDuration: (duration: number) => void
  setDelay: (delay: number) => void
  setIterations: (iterations: number) => void
  setTimingFunction: (timingFunction: string) => void
  setCubicBezier: (bezier: { x1: number; y1: number; x2: number; y2: number }) => void
  setUseCubicBezier: (use: boolean) => void
  toggleCompareMode: () => void
  replayAnimation: () => void
}

const defaultCode = `@keyframes bounce {
  0% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-50px);
  }
  100% {
    transform: translateY(0);
  }
}

.animated-element {
  animation: bounce 1s ease-in-out infinite;
}
`

export const useAnimationStore = create<AnimationState>((set, get) => ({
  code: defaultCode,
  originalCode: defaultCode,
  params: {
    duration: 1,
    delay: 0,
    iterations: 1,
    timingFunction: 'ease',
    cubicBezier: { x1: 0.25, y1: 0.1, x2: 0.25, y2: 1 },
    useCubicBezier: false
  },
  compareMode: false,
  playKey: 0,

  setCode: (code: string) => set({ code, playKey: Date.now() }),
  setOriginalCode: (code: string) => set({ originalCode: code }),
  setDuration: (duration: number) =>
    set((state) => ({
      params: { ...state.params, duration },
      playKey: Date.now()
    })),
  setDelay: (delay: number) =>
    set((state) => ({
      params: { ...state.params, delay },
      playKey: Date.now()
    })),
  setIterations: (iterations: number) =>
    set((state) => ({
      params: { ...state.params, iterations },
      playKey: Date.now()
    })),
  setTimingFunction: (timingFunction: string) =>
    set((state) => ({
      params: { ...state.params, timingFunction, useCubicBezier: false },
      playKey: Date.now()
    })),
  setCubicBezier: (bezier: { x1: number; y1: number; x2: number; y2: number }) =>
    set((state) => ({
      params: {
        ...state.params,
        cubicBezier: bezier,
        useCubicBezier: true,
        timingFunction: `cubic-bezier(${bezier.x1}, ${bezier.y1}, ${bezier.x2}, ${bezier.y2})`
      },
      playKey: Date.now()
    })),
  setUseCubicBezier: (use: boolean) =>
    set((state) => ({
      params: { ...state.params, useCubicBezier: use }
    })),
  toggleCompareMode: () => {
    const { compareMode, code } = get()
    if (!compareMode) {
      set({ compareMode: true, originalCode: code, playKey: Date.now() })
    } else {
      set({ compareMode: false, playKey: Date.now() })
    }
  },
  replayAnimation: () => set({ playKey: Date.now() })
}))
