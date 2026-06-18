import express, { Request, Response } from 'express'
import cors from 'cors'
import { WebSocketServer, WebSocket } from 'ws'
import { v4 as uuidv4 } from 'uuid'
import http from 'http'
import type { Card, CreateCardRequest, WSMessage, MatchedSummary } from '../src/types'
import { findTopMatches, generateMockCards } from './matcher'

const app = express()
const server = http.createServer(app)
const PORT = 3001

app.use(cors())
app.use(express.json())

const cards: Card[] = generateMockCards()
const likesMap = new Map<string, number>()

cards.forEach(c => {
  likesMap.set(c.id, Math.floor(Math.random() * 20) + 1)
})

interface ExtendedCard extends Card {
  clientId?: string
}

app.get('/api/cards', (_req: Request, res: Response) => {
  const sorted = [...cards].sort((a, b) => b.timestamp - a.timestamp)
  res.json(sorted)
})

app.post('/api/cards', (req: Request<{}, {}, CreateCardRequest>, res: Response) => {
  const { text, emotion } = req.body
  
  if (!text || !text.trim()) {
    res.status(400).json({ error: '文字内容不能为空' })
    return
  }
  
  if (!emotion) {
    res.status(400).json({ error: '请选择情绪类型' })
    return
  }
  
  const newCard: ExtendedCard = {
    id: uuidv4(),
    text: text.trim(),
    emotion,
    timestamp: Date.now(),
    matchedSummaries: [],
    matchCount: 0,
  }
  
  likesMap.set(newCard.id, 0)
  
  cards.push(newCard)
  
  const { summaries, matchCount } = findTopMatches(newCard.text, newCard.emotion, cards, newCard.id, 3)
  newCard.matchedSummaries = summaries
  newCard.matchCount = matchCount
  
  setTimeout(() => {
    const message: WSMessage = {
      type: 'matched',
      cardId: newCard.id,
      matchedSummaries: summaries,
      matchCount,
    }
    broadcast(message)
  }, 800 + Math.random() * 600)
  
  res.status(201).json(newCard)
})

app.post('/api/cards/:id/like', (req: Request, res: Response) => {
  const { id } = req.params
  const currentLikes = likesMap.get(id) || 0
  const newLikes = currentLikes + 1
  likesMap.set(id, newLikes)
  
  const card = cards.find(c => c.id === id)
  if (card) {
    card.matchedSummaries = card.matchedSummaries.map(s => 
      s.id === id ? { ...s, likes: newLikes } : s
    )
  }
  
  res.json({ id, likes: newLikes })
})

app.get('/api/match', (req: Request, res: Response) => {
  const text = (req.query.text as string) || ''
  const emotion = (req.query.emotion as any) || 'calm'
  
  const { summaries, matchCount } = findTopMatches(text, emotion, cards, undefined, 3)
  
  res.json({ summaries, matchCount })
})

const wss = new WebSocketServer({ server, path: '/ws' })
const clients = new Set<WebSocket>()

wss.on('connection', (ws: WebSocket) => {
  clients.add(ws)
  
  ws.on('close', () => {
    clients.delete(ws)
  })
  
  ws.on('error', () => {
    clients.delete(ws)
  })
})

function broadcast(message: WSMessage) {
  const data = JSON.stringify(message)
  for (const client of clients) {
    if (client.readyState === WebSocket.OPEN) {
      try {
        client.send(data)
      } catch (e) {
        clients.delete(client)
      }
    }
  }
}

server.listen(PORT, () => {
  console.log(`[MindEcho] Backend server running on http://localhost:${PORT}`)
  console.log(`[MindEcho] WebSocket server running on ws://localhost:${PORT}/ws`)
})
