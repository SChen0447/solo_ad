import { create } from 'zustand'

export interface Card {
  id: string
  title: string
  content: string
  timestamp: Date | null
  imageUrl?: string
  color: string
  isUnfiled: boolean
  createdAt: number
  x: number
  y: number
  scale: number
  isNew?: boolean
  isUpdating?: boolean
}

export const TAG_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
  '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'
]

export const getRandomColor = (): string => {
  return TAG_COLORS[Math.floor(Math.random() * TAG_COLORS.length)]
}

interface GridState {
  cards: Card[]
  zoom: number
  scrollX: number
  focusedCardId: string | null
  editingCardId: string | null
  viewportWidth: number
  viewportHeight: number
  isDragging: boolean
  addCard: (card: Card) => void
  updateCard: (id: string, updates: Partial<Card>) => void
  removeCard: (id: string) => void
  setZoom: (zoom: number) => void
  setScrollX: (x: number) => void
  setFocusedCard: (id: string | null) => void
  setEditingCard: (id: string | null) => void
  setViewport: (width: number, height: number) => void
  setIsDragging: (dragging: boolean) => void
  reorderCards: (draggedId: string, targetId: string) => void
  clearNewFlag: (id: string) => void
  clearUpdatingFlag: (id: string) => void
}

export const useGridStore = create<GridState>((set, get) => ({
  cards: [],
  zoom: 1,
  scrollX: 0,
  focusedCardId: null,
  editingCardId: null,
  viewportWidth: typeof window !== 'undefined' ? window.innerWidth : 1200,
  viewportHeight: typeof window !== 'undefined' ? window.innerHeight : 800,
  isDragging: false,

  addCard: (card: Card) => {
    const { cards } = get()
    const sortedCards = [...cards, card].sort((a, b) => {
      if (a.timestamp === null && b.timestamp === null) return b.createdAt - a.createdAt
      if (a.timestamp === null) return 1
      if (b.timestamp === null) return -1
      return a.timestamp.getTime() - b.timestamp.getTime()
    })
    set({ cards: sortedCards })
  },

  updateCard: (id: string, updates: Partial<Card>) => {
    const { cards } = get()
    const updatedCards = cards.map(card =>
      card.id === id ? { ...card, ...updates } : card
    )
    if (updates.timestamp !== undefined) {
      updatedCards.sort((a, b) => {
        if (a.timestamp === null && b.timestamp === null) return b.createdAt - a.createdAt
        if (a.timestamp === null) return 1
        if (b.timestamp === null) return -1
        return a.timestamp.getTime() - b.timestamp.getTime()
      })
    }
    set({ cards: updatedCards })
  },

  removeCard: (id: string) => {
    const { cards } = get()
    set({ cards: cards.filter(card => card.id !== id) })
  },

  setZoom: (zoom: number) => {
    const clampedZoom = Math.max(0.5, Math.min(1.5, zoom))
    set({ zoom: clampedZoom })
  },

  setScrollX: (x: number) => {
    set({ scrollX: x })
  },

  setFocusedCard: (id: string | null) => {
    set({ focusedCardId: id })
  },

  setEditingCard: (id: string | null) => {
    set({ editingCardId: id })
  },

  setViewport: (width: number, height: number) => {
    set({ viewportWidth: width, viewportHeight: height })
  },

  setIsDragging: (dragging: boolean) => {
    set({ isDragging: dragging })
  },

  reorderCards: (draggedId: string, targetId: string) => {
    const { cards } = get()
    const draggedIndex = cards.findIndex(c => c.id === draggedId)
    const targetIndex = cards.findIndex(c => c.id === targetId)
    if (draggedIndex === -1 || targetIndex === -1) return

    const newCards = [...cards]
    const [draggedCard] = newCards.splice(draggedIndex, 1)
    newCards.splice(targetIndex, 0, draggedCard)
    set({ cards: newCards })
  },

  clearNewFlag: (id: string) => {
    const { cards } = get()
    set({
      cards: cards.map(card =>
        card.id === id ? { ...card, isNew: false } : card
      )
    })
  },

  clearUpdatingFlag: (id: string) => {
    const { cards } = get()
    set({
      cards: cards.map(card =>
        card.id === id ? { ...card, isUpdating: false } : card
      )
    })
  }
}))
