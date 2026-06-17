import express from 'express'
import cors from 'cors'
import { createServer } from 'http'
import { Server } from 'socket.io'
import { v4 as uuidv4 } from 'uuid'

const app = express()
const httpServer = createServer(app)
const io = new Server(httpServer, {
  cors: {
    origin: '*',
  },
})

app.use(cors())
app.use(express.json())

interface Card {
  id: string
  title: string
  description: string
  urgency: number
  importance: number
  x: number
  y: number
  votes: number
  createdAt: number
}

interface Comment {
  id: string
  cardId: string
  author: string
  content: string
  createdAt: number
}

const cards: Map<string, Card> = new Map()
const comments: Map<string, Comment[]> = new Map()

function getRandomPosition(quadrant: number): { x: number; y: number } {
  const margin = 8
  const minX = quadrant % 2 === 0 ? margin : 50 + margin
  const maxX = quadrant % 2 === 0 ? 50 - margin : 100 - margin
  const minY = quadrant < 2 ? 50 + margin : margin
  const maxY = quadrant < 2 ? 100 - margin : 50 - margin
  return {
    x: Math.random() * (maxX - minX) + minX,
    y: Math.random() * (maxY - minY) + minY,
  }
}

function getQuadrant(urgency: number, importance: number): number {
  const isImportant = importance > 3
  const isUrgent = urgency > 3
  if (isImportant && isUrgent) return 0
  if (isImportant && !isUrgent) return 1
  if (!isImportant && isUrgent) return 2
  return 3
}

function clampPositionToQuadrant(x: number, y: number, quadrant: number): { x: number; y: number } {
  const margin = 5
  const minX = quadrant % 2 === 0 ? margin : 50 + margin
  const maxX = quadrant % 2 === 0 ? 50 - margin : 100 - margin
  const minY = quadrant < 2 ? 50 + margin : margin
  const maxY = quadrant < 2 ? 100 - margin : 50 - margin
  return {
    x: Math.max(minX, Math.min(maxX, x)),
    y: Math.max(minY, Math.min(maxY, y)),
  }
}

app.get('/api/cards', (_req, res) => {
  res.json(Array.from(cards.values()))
})

app.get('/api/cards/:id/comments', (req, res) => {
  const cardId = req.params.id
  res.json(comments.get(cardId) || [])
})

app.post('/api/cards', (req, res) => {
  const { title, description, urgency, importance } = req.body
  const id = uuidv4()
  const quadrant = getQuadrant(urgency, importance)
  const pos = getRandomPosition(quadrant)
  const card: Card = {
    id,
    title,
    description,
    urgency,
    importance,
    x: pos.x,
    y: pos.y,
    votes: 0,
    createdAt: Date.now(),
  }
  cards.set(id, card)
  comments.set(id, [])
  io.emit('card:created', card)
  res.status(201).json(card)
})

app.put('/api/cards/:id', (req, res) => {
  const id = req.params.id
  const existing = cards.get(id)
  if (!existing) {
    return res.status(404).json({ error: 'Card not found' })
  }
  const { title, description, urgency, importance, x, y } = req.body
  let newQuadrant = getQuadrant(
    urgency !== undefined ? urgency : existing.urgency,
    importance !== undefined ? importance : existing.importance
  )
  const oldQuadrant = getQuadrant(existing.urgency, existing.importance)

  let finalX = x
  let finalY = y

  if (urgency !== undefined || importance !== undefined) {
    if (newQuadrant !== oldQuadrant) {
      const pos = getRandomPosition(newQuadrant)
      finalX = pos.x
      finalY = pos.y
    }
  } else if (x !== undefined && y !== undefined) {
    const clamped = clampPositionToQuadrant(x, y, oldQuadrant)
    finalX = clamped.x
    finalY = clamped.y
  }

  const updated: Card = {
    ...existing,
    title: title !== undefined ? title : existing.title,
    description: description !== undefined ? description : existing.description,
    urgency: urgency !== undefined ? urgency : existing.urgency,
    importance: importance !== undefined ? importance : existing.importance,
    x: finalX !== undefined ? finalX : existing.x,
    y: finalY !== undefined ? finalY : existing.y,
  }
  cards.set(id, updated)
  io.emit('card:updated', updated)
  res.json(updated)
})

app.delete('/api/cards/:id', (req, res) => {
  const id = req.params.id
  if (!cards.has(id)) {
    return res.status(404).json({ error: 'Card not found' })
  }
  cards.delete(id)
  comments.delete(id)
  io.emit('card:deleted', id)
  res.status(204).send()
})

app.post('/api/cards/:id/vote', (req, res) => {
  const id = req.params.id
  const card = cards.get(id)
  if (!card) {
    return res.status(404).json({ error: 'Card not found' })
  }
  card.votes += 1
  io.emit('card:voted', { id, votes: card.votes })
  res.json({ votes: card.votes })
})

app.post('/api/cards/:id/comments', (req, res) => {
  const cardId = req.params.id
  if (!cards.has(cardId)) {
    return res.status(404).json({ error: 'Card not found' })
  }
  const { author, content } = req.body
  const comment: Comment = {
    id: uuidv4(),
    cardId,
    author,
    content,
    createdAt: Date.now(),
  }
  const cardComments = comments.get(cardId) || []
  cardComments.push(comment)
  comments.set(cardId, cardComments)
  io.emit('comment:created', comment)
  res.status(201).json(comment)
})

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id)
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id)
  })
})

const PORT = 3001
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
