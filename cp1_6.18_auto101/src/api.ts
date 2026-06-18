import axios from 'axios'
import type { Card, CreateCardRequest, MatchedSummary, WSMessage } from './types'

const API_BASE = '/api'

export const api = {
  async createCard(data: CreateCardRequest): Promise<Card> {
    const res = await axios.post<Card>(`${API_BASE}/cards`, data)
    return res.data
  },

  async getCards(): Promise<Card[]> {
    const res = await axios.get<Card[]>(`${API_BASE}/cards`)
    return res.data
  },

  async likeCard(id: string): Promise<{ id: string; likes: number }> {
    const res = await axios.post<{ id: string; likes: number }>(`${API_BASE}/cards/${id}/like`)
    return res.data
  },

  async matchEmotion(text: string, emotion: string): Promise<{ summaries: MatchedSummary[]; matchCount: number }> {
    const res = await axios.get(`${API_BASE}/match`, { params: { text, emotion } })
    return res.data
  },
}

type MatchedCallback = (data: { cardId: string; matchedSummaries: MatchedSummary[]; matchCount: number }) => void

let ws: WebSocket | null = null
const listeners = new Set<MatchedCallback>()

function connectWS() {
  if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
    return
  }

  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  const wsUrl = `${protocol}//${window.location.host}/ws`

  try {
    ws = new WebSocket(wsUrl)

    ws.onopen = () => {
      console.log('[MindEcho] WebSocket connected')
    }

    ws.onmessage = (event) => {
      try {
        const data: WSMessage = JSON.parse(event.data)
        if (data.type === 'matched') {
          for (const cb of listeners) {
            cb({
              cardId: data.cardId,
              matchedSummaries: data.matchedSummaries,
              matchCount: data.matchCount,
            })
          }
        }
      } catch (e) {
        console.error('[MindEcho] WS message parse error:', e)
      }
    }

    ws.onclose = () => {
      setTimeout(connectWS, 3000)
    }

    ws.onerror = () => {
      ws?.close()
    }
  } catch (e) {
    console.error('[MindEcho] WS connection error:', e)
    setTimeout(connectWS, 5000)
  }
}

export function subscribeMatched(callback: MatchedCallback): () => void {
  listeners.add(callback)
  if (!ws || ws.readyState === WebSocket.CLOSED) {
    connectWS()
  }
  return () => {
    listeners.delete(callback)
  }
}
