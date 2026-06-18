import { create } from 'zustand'
import type { ProcessedCell } from './types'

interface StoreState {
  currentTimeIndex: number
  totalTimePoints: number
  isPlaying: boolean
  isLooping: boolean
  selectedCellIndex: number | null
  cameraOffset: { x: number; z: number }
  processedCells: ProcessedCell[]
  isTransitioning: boolean
  transitionProgress: number

  setTimeIndex: (index: number) => void
  setIsPlaying: (playing: boolean) => void
  setIsLooping: (looping: boolean) => void
  setSelectedCell: (index: number | null) => void
  setCameraOffset: (offset: { x: number; z: number }) => void
  moveCamera: (dx: number, dz: number) => void
  setProcessedCells: (cells: ProcessedCell[]) => void
  setIsTransitioning: (value: boolean) => void
  setTransitionProgress: (value: number) => void
  advanceTime: () => void
}

export const useStore = create<StoreState>((set, get) => ({
  currentTimeIndex: 0,
  totalTimePoints: 12,
  isPlaying: false,
  isLooping: true,
  selectedCellIndex: null,
  cameraOffset: { x: 0, z: 0 },
  processedCells: [],
  isTransitioning: false,
  transitionProgress: 0,

  setTimeIndex: (index) => set({ currentTimeIndex: index }),
  setIsPlaying: (playing) => set({ isPlaying: playing }),
  setIsLooping: (looping) => set({ isLooping: looping }),
  setSelectedCell: (index) => set({ selectedCellIndex: index }),
  setCameraOffset: (offset) => set({ cameraOffset: offset }),
  moveCamera: (dx, dz) => {
    const { cameraOffset } = get()
    set({
      cameraOffset: {
        x: cameraOffset.x + dx,
        z: cameraOffset.z + dz
      }
    })
  },
  setProcessedCells: (cells) => set({ processedCells: cells }),
  setIsTransitioning: (value) => set({ isTransitioning: value }),
  setTransitionProgress: (value) => set({ transitionProgress: value }),
  advanceTime: () => {
    const { currentTimeIndex, totalTimePoints, isLooping } = get()
    let next = currentTimeIndex + 1
    if (next >= totalTimePoints) {
      next = isLooping ? 0 : totalTimePoints - 1
      if (!isLooping) {
        set({ isPlaying: false })
      }
    }
    set({ currentTimeIndex: next })
  }
}))
