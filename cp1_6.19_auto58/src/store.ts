import { create } from 'zustand'

export interface MosaicBlock {
  x: number
  y: number
  width: number
  height: number
  color: { r: number; g: number; b: number }
  row: number
  col: number
}

export interface LockedColor {
  id: string
  r: number
  g: number
  b: number
  hex: string
}

interface AppState {
  imageData: ImageData | null
  imageSrc: string | null
  pixelSize: number
  colorLevels: number
  mosaicBlocks: MosaicBlock[]
  lockedColors: LockedColor[]
  animationKey: number

  setImageData: (data: ImageData | null, src: string | null) => void
  setPixelSize: (size: number) => void
  setColorLevels: (levels: number) => void
  setMosaicBlocks: (blocks: MosaicBlock[]) => void
  addLockedColor: (color: { r: number; g: number; b: number }) => void
  removeLockedColor: (id: string) => void
  setAnimationKey: (key: number) => void
}

const rgbToHex = (r: number, g: number, b: number): string => {
  return '#' + [r, g, b].map(x => {
    const hex = Math.round(x).toString(16)
    return hex.length === 1 ? '0' + hex : hex
  }).join('').toUpperCase()
}

export const useAppStore = create<AppState>((set, get) => ({
  imageData: null,
  imageSrc: null,
  pixelSize: 16,
  colorLevels: 8,
  mosaicBlocks: [],
  lockedColors: [],
  animationKey: 0,

  setImageData: (data, src) => set({ imageData: data, imageSrc: src }),
  setPixelSize: (size) => set({ pixelSize: size }),
  setColorLevels: (levels) => set({ colorLevels: levels }),
  setMosaicBlocks: (blocks) => set({ mosaicBlocks: blocks }),
  addLockedColor: (color) => {
    const hex = rgbToHex(color.r, color.g, color.b)
    const existing = get().lockedColors.find(c => c.hex === hex)
    if (existing) return
    set({
      lockedColors: [
        ...get().lockedColors,
        { id: `color-${Date.now()}`, ...color, hex }
      ]
    })
  },
  removeLockedColor: (id) => set({
    lockedColors: get().lockedColors.filter(c => c.id !== id)
  }),
  setAnimationKey: (key) => set({ animationKey: key }),
}))

export { rgbToHex }
