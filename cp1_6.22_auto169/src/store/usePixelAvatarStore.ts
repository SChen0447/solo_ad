import { create } from 'zustand'

interface PixelAvatarState {
  sourceImage: HTMLImageElement | null
  pixelGrid: string[][]
  palette: string[]
  gridSize: 16 | 32
  isProcessing: boolean
  setSourceImage: (img: HTMLImageElement | null) => void
  setPixelGrid: (grid: string[][]) => void
  setPalette: (colors: string[]) => void
  updatePaletteColor: (index: number, color: string) => void
  setGridSize: (size: 16 | 32) => void
  setIsProcessing: (val: boolean) => void
  reset: () => void
}

const DEFAULT_PALETTE = Array.from({ length: 16 }, () => '#cccccc')

export const usePixelAvatarStore = create<PixelAvatarState>((set) => ({
  sourceImage: null,
  pixelGrid: [],
  palette: [...DEFAULT_PALETTE],
  gridSize: 16,
  isProcessing: false,
  setSourceImage: (img) => set({ sourceImage: img }),
  setPixelGrid: (grid) => set({ pixelGrid: grid }),
  setPalette: (colors) => set({ palette: colors }),
  updatePaletteColor: (index, color) =>
    set((state) => {
      const newPalette = [...state.palette]
      newPalette[index] = color
      const newGrid = state.pixelGrid.map((row) =>
        row.map((cell) => (cell === state.palette[index] ? color : cell))
      )
      return { palette: newPalette, pixelGrid: newGrid }
    }),
  setGridSize: (size) => set({ gridSize: size }),
  setIsProcessing: (val) => set({ isProcessing: val }),
  reset: () =>
    set({
      sourceImage: null,
      pixelGrid: [],
      palette: [...DEFAULT_PALETTE],
      gridSize: 16,
      isProcessing: false,
    }),
}))
