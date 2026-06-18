import { create } from 'zustand'

export type ModelType = 'mandelbrot' | 'julia' | 'minimal'

interface JuliaParams {
  cx: number
  cy: number
  iterations: number
  resolution: number
}

interface MandelbrotParams {
  iterations: number
  resolution: number
}

interface MinimalParams {
  t: number
  resolution: number
}

interface MathState {
  modelType: ModelType
  mandelbrotParams: MandelbrotParams
  juliaParams: JuliaParams
  minimalParams: MinimalParams
  setModelType: (type: ModelType) => void
  setMandelbrotParams: (params: Partial<MandelbrotParams>) => void
  setJuliaParams: (params: Partial<JuliaParams>) => void
  setMinimalParams: (params: Partial<MinimalParams>) => void
}

export const useMathStore = create<MathState>((set) => ({
  modelType: 'mandelbrot',
  mandelbrotParams: {
    iterations: 100,
    resolution: 256,
  },
  juliaParams: {
    cx: -0.7,
    cy: 0.27015,
    iterations: 100,
    resolution: 256,
  },
  minimalParams: {
    t: 1.0,
    resolution: 128,
  },
  setModelType: (type) => set({ modelType: type }),
  setMandelbrotParams: (params) =>
    set((state) => ({
      mandelbrotParams: { ...state.mandelbrotParams, ...params },
    })),
  setJuliaParams: (params) =>
    set((state) => ({
      juliaParams: { ...state.juliaParams, ...params },
    })),
  setMinimalParams: (params) =>
    set((state) => ({
      minimalParams: { ...state.minimalParams, ...params },
    })),
}))
