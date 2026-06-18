import { create } from 'zustand'
import type { Card } from '../collection'

export interface CanvasCard extends Card {
  x: number
  y: number
}

interface CanvasState {
  canvasCards: Map<string, CanvasCard>
  zoom: number
  panX: number
  panY: number
  highlightedIds: Set<string>
  setZoom: (zoom: number) => void
  setPan: (x: number, y: number) => void
  addCanvasCard: (card: Card, x: number, y: number) => void
  removeCanvasCard: (id: string) => void
  updateCanvasCardPos: (id: string, x: number, y: number) => void
  setHighlighted: (ids: string[]) => void
  clearHighlighted: () => void
}

export const useCanvasStore = create<CanvasState>((set) => ({
  canvasCards: new Map(),
  zoom: 1,
  panX: 0,
  panY: 0,
  highlightedIds: new Set(),

  setZoom: (zoom) => set({ zoom: Math.max(0.2, Math.min(4, zoom)) }),
  setPan: (panX, panY) => set({ panX, panY }),

  addCanvasCard: (card, x, y) =>
    set((state) => {
      const newMap = new Map(state.canvasCards)
      if (!newMap.has(card.id)) {
        newMap.set(card.id, { ...card, x, y })
      }
      return { canvasCards: newMap }
    }),

  removeCanvasCard: (id) =>
    set((state) => {
      const newMap = new Map(state.canvasCards)
      newMap.delete(id)
      return { canvasCards: newMap }
    }),

  updateCanvasCardPos: (id, x, y) =>
    set((state) => {
      const newMap = new Map(state.canvasCards)
      const card = newMap.get(id)
      if (card) {
        newMap.set(id, { ...card, x, y })
      }
      return { canvasCards: newMap }
    }),

  setHighlighted: (ids) => set({ highlightedIds: new Set(ids) }),
  clearHighlighted: () => set({ highlightedIds: new Set() }),
}))
