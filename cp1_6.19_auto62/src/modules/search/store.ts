import { create } from 'zustand'
import { useCollectionStore } from '../collection'
import { useCanvasStore } from '../canvas'

interface SearchState {
  query: string
  setQuery: (query: string) => void
  search: () => string[]
  clear: () => void
}

export const useSearchStore = create<SearchState>((set, get) => ({
  query: '',

  setQuery: (query) => {
    set({ query })
    const canvasStore = useCanvasStore.getState()
    if (!query.trim()) {
      canvasStore.clearHighlighted()
      return
    }
    const cards = useCollectionStore.getState().cards
    const lowerQuery = query.toLowerCase()
    const matchedIds = cards
      .filter(
        (c) =>
          c.title.toLowerCase().includes(lowerQuery) ||
          c.description.toLowerCase().includes(lowerQuery) ||
          c.tags.some((t) => t.toLowerCase().includes(lowerQuery))
      )
      .map((c) => c.id)
    canvasStore.setHighlighted(matchedIds)
  },

  search: () => {
    const { query } = get()
    if (!query.trim()) return []
    const cards = useCollectionStore.getState().cards
    const lowerQuery = query.toLowerCase()
    return cards
      .filter((c) => c.title.toLowerCase().includes(lowerQuery))
      .map((c) => c.id)
  },

  clear: () => {
    set({ query: '' })
    useCanvasStore.getState().clearHighlighted()
  },
}))
