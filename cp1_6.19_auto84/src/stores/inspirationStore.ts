import { defineStore } from 'pinia'
import type { InspirationCard } from '../types'

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

export const useInspirationStore = defineStore('inspiration', {
  state: () => ({
    cards: [] as InspirationCard[],
    activeTag: null as string | null
  }),

  getters: {
    sortedCards: (state): InspirationCard[] => {
      const filtered = state.activeTag
        ? state.cards.filter((card) => card.tags.includes(state.activeTag!))
        : state.cards
      return [...filtered].sort((a, b) => b.createdAt - a.createdAt)
    },

    cardById: (state) => (id: string): InspirationCard | undefined => {
      return state.cards.find((card) => card.id === id)
    },

    allTags: (state): string[] => {
      const tags = new Set<string>()
      state.cards.forEach((card) => {
        card.tags.forEach((tag) => tags.add(tag))
      })
      return Array.from(tags)
    }
  },

  actions: {
    addCard(file: File, colors: string[]): InspirationCard {
      const url = URL.createObjectURL(file)
      const card: InspirationCard = {
        id: generateUUID(),
        fileName: file.name,
        imageUrl: url,
        colors: [...colors],
        createdAt: Date.now(),
        tags: []
      }
      this.cards.push(card)
      return card
    },

    updateCardColors(cardId: string, colors: string[]): void {
      const card = this.cards.find((c) => c.id === cardId)
      if (card) {
        card.colors = [...colors]
      }
    },

    updateCardTags(cardId: string, tags: string[]): void {
      const card = this.cards.find((c) => c.id === cardId)
      if (card) {
        card.tags = [...tags]
      }
    },

    removeCard(cardId: string): void {
      const idx = this.cards.findIndex((c) => c.id === cardId)
      if (idx !== -1) {
        URL.revokeObjectURL(this.cards[idx].imageUrl)
        this.cards.splice(idx, 1)
      }
    },

    setActiveTag(tag: string | null): void {
      this.activeTag = tag
    }
  }
})
