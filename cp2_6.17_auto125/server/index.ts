import express from 'express'
import cors from 'cors'
import { v4 as uuidv4 } from 'uuid'

const app = express()
const PORT = 3001

app.use(cors())
app.use(express.json())

export type CardColumn = 'highlight' | 'improvement' | 'action'

export interface Card {
  id: string
  team: string
  author: string
  content: string
  column: CardColumn
  createdAt: number
  updatedAt: number
}

export interface ReportStats {
  totalCards: number
  columnCounts: { [key in CardColumn]: number }
  memberCounts: { member: string; count: number }[]
  cards: Card[]
}

const cardsByTeam: { [team: string]: Card[] } = {}

app.get('/api/cards', (req, res) => {
  const team = (req.query.team as string) || ''
  if (!team) {
    return res.status(400).json({ error: 'Team parameter is required' })
  }
  const cards = cardsByTeam[team] || []
  res.json(cards)
})

app.post('/api/cards', (req, res) => {
  const { team, author, content, column } = req.body
  if (!team || !author || !content || !column) {
    return res.status(400).json({ error: 'Missing required fields' })
  }
  if (!cardsByTeam[team]) {
    cardsByTeam[team] = []
  }
  const now = Date.now()
  const newCard: Card = {
    id: uuidv4(),
    team,
    author,
    content,
    column,
    createdAt: now,
    updatedAt: now
  }
  cardsByTeam[team].push(newCard)
  res.status(201).json(newCard)
})

app.put('/api/cards/:id', (req, res) => {
  const { id } = req.params
  const { content } = req.body
  if (!content) {
    return res.status(400).json({ error: 'Content is required' })
  }
  for (const team of Object.keys(cardsByTeam)) {
    const card = cardsByTeam[team].find(c => c.id === id)
    if (card) {
      card.content = content
      card.updatedAt = Date.now()
      return res.json(card)
    }
  }
  res.status(404).json({ error: 'Card not found' })
})

app.put('/api/cards/:id/column', (req, res) => {
  const { id } = req.params
  const { column } = req.body
  if (!column) {
    return res.status(400).json({ error: 'Column is required' })
  }
  for (const team of Object.keys(cardsByTeam)) {
    const card = cardsByTeam[team].find(c => c.id === id)
    if (card) {
      card.column = column as CardColumn
      card.updatedAt = Date.now()
      return res.json(card)
    }
  }
  res.status(404).json({ error: 'Card not found' })
})

app.get('/api/report', (req, res) => {
  const team = (req.query.team as string) || ''
  if (!team) {
    return res.status(400).json({ error: 'Team parameter is required' })
  }
  const cards = cardsByTeam[team] || []
  const columnCounts: { [key in CardColumn]: number } = {
    highlight: 0,
    improvement: 0,
    action: 0
  }
  const memberMap: { [key: string]: number } = {}
  for (const card of cards) {
    columnCounts[card.column]++
    memberMap[card.author] = (memberMap[card.author] || 0) + 1
  }
  const memberCounts = Object.entries(memberMap)
    .map(([member, count]) => ({ member, count }))
    .sort((a, b) => b.count - a.count)
  const stats: ReportStats = {
    totalCards: cards.length,
    columnCounts,
    memberCounts,
    cards
  }
  res.json(stats)
})

app.listen(PORT, () => {
  console.log(`Retro board server running on port ${PORT}`)
})
