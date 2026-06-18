import { create } from 'zustand'
import type { Card, Emotion, MatchedSummary } from './types'

interface AppState {
  cards: Card[]
  currentEmotion: Emotion | null
  searchQuery: string
  filteredCards: Card[]
  setCurrentEmotion: (emotion: Emotion | null) => void
  setSearchQuery: (query: string) => void
  addCard: (card: Card) => void
  setCards: (cards: Card[]) => void
  updateMatchedSummaries: (cardId: string, summaries: MatchedSummary[], matchCount: number) => void
  toggleLike: (summaryId: string, parentCardId?: string) => void
}

function filterCardsByQuery(cards: Card[], query: string): Card[] {
  if (!query.trim()) return cards
  const lowerQuery = query.toLowerCase()
  return cards.filter(card =>
    card.text.toLowerCase().includes(lowerQuery)
  )
}

export const useAppStore = create<AppState>((set, get) => ({
  cards: [],
  currentEmotion: null,
  searchQuery: '',
  filteredCards: [],

  setCurrentEmotion: (emotion) => set({ currentEmotion: emotion }),

  setSearchQuery: (query) => {
    const { cards } = get()
    set({
      searchQuery: query,
      filteredCards: filterCardsByQuery(cards, query),
    })
  },

  addCard: (card) => {
    const { cards, searchQuery } = get()
    const newCards = [card, ...cards]
    set({
      cards: newCards,
      filteredCards: filterCardsByQuery(newCards, searchQuery),
    })
  },

  setCards: (cards) => {
    const { searchQuery } = get()
    const sorted = [...cards].sort((a, b) => b.timestamp - a.timestamp)
    set({
      cards: sorted,
      filteredCards: filterCardsByQuery(sorted, searchQuery),
    })
  },

  updateMatchedSummaries: (cardId, summaries, matchCount) => {
    const { cards, searchQuery } = get()
    const newCards = cards.map(card =>
      card.id === cardId
        ? { ...card, matchedSummaries: summaries, matchCount }
        : card
    )
    set({
      cards: newCards,
      filteredCards: filterCardsByQuery(newCards, searchQuery),
    })
  },

  toggleLike: (summaryId, parentCardId) => {
    const { cards, searchQuery } = get()
    const newCards = cards.map(card => {
      if (parentCardId && card.id !== parentCardId) return card
      const newSummaries = card.matchedSummaries.map(s =>
        s.id === summaryId
          ? { ...s, likes: s.likes + 1 }
          : s
      )
      if (newSummaries.length !== card.matchedSummaries.length) return card
      const changed = newSummaries.some((s, i) => s.likes !== card.matchedSummaries[i].likes)
      return changed ? { ...card, matchedSummaries: newSummaries } : card
    })
    set({
      cards: newCards,
      filteredCards: filterCardsByQuery(newCards, searchQuery),
    })
  },
}))
