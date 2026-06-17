import { create } from 'zustand'
import axios from 'axios'
import { io, Socket } from 'socket.io-client'
import { Card, Comment } from '../types'

interface KanbanState {
  cards: Card[]
  comments: Record<string, Comment[]>
  selectedCardId: string | null
  socket: Socket | null
  isLoading: boolean
  initSocket: () => void
  fetchCards: () => Promise<void>
  fetchComments: (cardId: string) => Promise<void>
  addCard: (card: Omit<Card, 'id' | 'x' | 'y' | 'votes' | 'createdAt'>) => Promise<void>
  updateCard: (id: string, updates: Partial<Card>) => Promise<void>
  deleteCard: (id: string) => Promise<void>
  voteCard: (id: string) => Promise<void>
  addComment: (cardId: string, author: string, content: string) => Promise<void>
  setSelectedCardId: (id: string | null) => void
  updateCardPosition: (id: string, x: number, y: number) => void
}

export const useKanbanStore = create<KanbanState>((set, get) => ({
  cards: [],
  comments: {},
  selectedCardId: null,
  socket: null,
  isLoading: false,

  initSocket: () => {
    if (get().socket) return

    const socket = io({ path: '/socket.io' })

    socket.on('card:created', (card: Card) => {
      set((state) => ({
        cards: [...state.cards, card],
      }))
    })

    socket.on('card:updated', (card: Card) => {
      set((state) => ({
        cards: state.cards.map((c) => (c.id === card.id ? card : c)),
      }))
    })

    socket.on('card:deleted', (id: string) => {
      set((state) => ({
        cards: state.cards.filter((c) => c.id !== id),
        selectedCardId: state.selectedCardId === id ? null : state.selectedCardId,
      }))
    })

    socket.on('card:voted', ({ id, votes }: { id: string; votes: number }) => {
      set((state) => ({
        cards: state.cards.map((c) =>
          c.id === id ? { ...c, votes } : c
        ),
      }))
    })

    socket.on('comment:created', (comment: Comment) => {
      set((state) => {
        const cardComments = state.comments[comment.cardId] || []
        return {
          comments: {
            ...state.comments,
            [comment.cardId]: [...cardComments, comment],
          },
        }
      })
    })

    set({ socket })
  },

  fetchCards: async () => {
    set({ isLoading: true })
    try {
      const res = await axios.get('/api/cards')
      set({ cards: res.data })
    } finally {
      set({ isLoading: false })
    }
  },

  fetchComments: async (cardId: string) => {
    try {
      const res = await axios.get(`/api/cards/${cardId}/comments`)
      set((state) => ({
        comments: {
          ...state.comments,
          [cardId]: res.data,
        },
      }))
    } catch (e) {
      console.error('Failed to fetch comments', e)
    }
  },

  addCard: async (card) => {
    try {
      await axios.post('/api/cards', card)
    } catch (e) {
      console.error('Failed to add card', e)
    }
  },

  updateCard: async (id, updates) => {
    try {
      await axios.put(`/api/cards/${id}`, updates)
    } catch (e) {
      console.error('Failed to update card', e)
    }
  },

  deleteCard: async (id) => {
    try {
      await axios.delete(`/api/cards/${id}`)
    } catch (e) {
      console.error('Failed to delete card', e)
    }
  },

  voteCard: async (id) => {
    try {
      await axios.post(`/api/cards/${id}/vote`)
    } catch (e) {
      console.error('Failed to vote card', e)
    }
  },

  addComment: async (cardId, author, content) => {
    try {
      await axios.post(`/api/cards/${cardId}/comments`, { author, content })
    } catch (e) {
      console.error('Failed to add comment', e)
    }
  },

  setSelectedCardId: (id) => {
    set({ selectedCardId: id })
    if (id) {
      get().fetchComments(id)
    }
  },

  updateCardPosition: (id, x, y) => {
    set((state) => ({
      cards: state.cards.map((c) =>
        c.id === id ? { ...c, x, y } : c
      ),
    }))
  },
}))
