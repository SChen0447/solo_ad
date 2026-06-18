import { create } from 'zustand'

export interface AuroraState {
  spectrumValue: number
  setSpectrumValue: (value: number) => void
  getPrimaryColor: () => string
  getSecondaryColor: () => string
  getColorName: () => string
  getWaveFrequency: () => number
  getWaveAmplitude: () => number
}

const hslToHex = (h: number, s: number, l: number): string => {
  s /= 100
  l /= 100
  const k = (n: number) => (n + h / 30) % 12
  const a = s * Math.min(l, 1 - l)
  const f = (n: number) =>
    l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))
  const toHex = (x: number) =>
    Math.round(255 * x).toString(16).padStart(2, '0')
  return `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t

const getHueFromSpectrum = (value: number): { start: number; end: number } => {
  const segments = [
    { t: 0.0, hueStart: 200, hueEnd: 270 },
    { t: 0.25, hueStart: 170, hueEnd: 200 },
    { t: 0.5, hueStart: 50, hueEnd: 120 },
    { t: 0.75, hueStart: 0, hueEnd: 45 },
    { t: 1.0, hueStart: 270, hueEnd: 320 },
  ]

  for (let i = 0; i < segments.length - 1; i++) {
    const curr = segments[i]
    const next = segments[i + 1]
    if (value >= curr.t && value <= next.t) {
      const localT = (value - curr.t) / (next.t - curr.t)
      return {
        start: lerp(curr.hueStart, next.hueStart, localT),
        end: lerp(curr.hueEnd, next.hueEnd, localT),
      }
    }
  }
  return { start: 270, end: 320 }
}

const getColorNameFromSpectrum = (value: number): string => {
  if (value < 0.125) return '蓝紫'
  if (value < 0.25) return '青蓝'
  if (value < 0.375) return '青绿'
  if (value < 0.5) return '翠绿'
  if (value < 0.625) return '金黄'
  if (value < 0.75) return '橙红'
  if (value < 0.875) return '赤红'
  return '紫红'
}

export const useAuroraStore = create<AuroraState>((set, get) => ({
  spectrumValue: 0,

  setSpectrumValue: (value: number) =>
    set({ spectrumValue: Math.max(0, Math.min(1, value)) }),

  getPrimaryColor: () => {
    const { spectrumValue } = get()
    const { start } = getHueFromSpectrum(spectrumValue)
    return hslToHex(start, 100, 65)
  },

  getSecondaryColor: () => {
    const { spectrumValue } = get()
    const { end } = getHueFromSpectrum(spectrumValue)
    return hslToHex(end, 100, 70)
  },

  getColorName: () => {
    const { spectrumValue } = get()
    return getColorNameFromSpectrum(spectrumValue)
  },

  getWaveFrequency: () => {
    const { spectrumValue } = get()
    return lerp(0.15, 1.2, spectrumValue)
  },

  getWaveAmplitude: () => {
    const { spectrumValue } = get()
    return lerp(1.5, 3.5, spectrumValue)
  },
}))
