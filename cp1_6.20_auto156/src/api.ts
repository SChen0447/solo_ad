import axios from 'axios'
import type { MoodCard, MoodAggregate, MoodType } from './types'

const API_BASE = '/api'

const api = axios.create({
  baseURL: API_BASE,
  timeout: 10000,
})

export const moodApi = {
  getCards: async (params?: { mood?: MoodType; memberId?: string }): Promise<MoodCard[]> => {
    const { data } = await api.get('/cards', { params })
    return data
  },

  createCard: async (card: Omit<MoodCard, 'id' | 'createdAt'>): Promise<MoodCard> => {
    const { data } = await api.post('/cards', card)
    return data
  },

  getCard: async (id: string): Promise<MoodCard> => {
    const { data } = await api.get(`/cards/${id}`)
    return data
  },

  deleteCard: async (id: string): Promise<void> => {
    await api.delete(`/cards/${id}`)
  },

  getAggregate: async (): Promise<MoodAggregate> => {
    const { data } = await api.get('/aggregate')
    return data
  },

  getMembers: async (): Promise<{ id: string; name: string }[]> => {
    const { data } = await api.get('/members')
    return data
  },
}

type MessageHandler = (data: MoodCard) => void

class MoodWebSocket {
  private listeners: Set<MessageHandler> = new Set()
  private lastCardId: string = ''
  private pollTimer: number | null = null
  private connected: boolean = false

  connect() {
    if (this.connected) return
    this.connected = true
    this.startPolling()
  }

  disconnect() {
    this.connected = false
    if (this.pollTimer) {
      clearInterval(this.pollTimer)
      this.pollTimer = null
    }
  }

  private startPolling() {
    const poll = async () => {
      try {
        const cards = await moodApi.getCards()
        if (cards.length > 0) {
          const latestId = cards[0].id
          if (this.lastCardId && latestId !== this.lastCardId) {
            const newCards = cards.filter((_, idx) => {
              const lastIdx = cards.findIndex(c => c.id === this.lastCardId)
              return lastIdx === -1 ? true : idx < lastIdx
            })
            newCards.forEach(card => this.notifyListeners(card))
          }
          this.lastCardId = latestId
        }
      } catch (e) {
        // ignore
      }
    }
    poll()
    this.pollTimer = window.setInterval(poll, 2000)
  }

  subscribe(handler: MessageHandler): () => void {
    this.listeners.add(handler)
    return () => this.listeners.delete(handler)
  }

  private notifyListeners(data: MoodCard) {
    this.listeners.forEach(handler => {
      try {
        handler(data)
      } catch (e) {
        console.error('WS handler error', e)
      }
    })
  }
}

export const moodWS = new MoodWebSocket()
