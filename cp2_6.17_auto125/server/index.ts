import express from 'express'
import cors from 'cors'
import { v4 as uuidv4 } from 'uuid'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

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

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const DATA_FILE = path.join(__dirname, 'data.json')

interface DataStore {
  [team: string]: Card[]
}

function loadData(): DataStore {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf-8')
      return JSON.parse(raw)
    }
  } catch (err) {
    console.error('Failed to load data:', err)
  }
  return {}
}

function saveData(data: DataStore): void {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8')
  } catch (err) {
    console.error('Failed to save data:', err)
  }
}

app.get('/api/cards', (req, res) => {
  const team = (req.query.team as string) || ''
  if (!team) {
    return res.status(400).json({ error: 'Team parameter is required' })
  }
  const data = loadData()
  const cards = data[team] || []
  res.json(cards)
})

app.post('/api/cards', (req, res) => {
  const { team, author, content, column } = req.body
  if (!team || !author || !content || !column) {
    return res.status(400).json({ error: 'Missing required fields' })
  }
  const data = loadData()
  if (!data[team]) {
    data[team] = []
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
  data[team].push(newCard)
  saveData(data)
  res.status(201).json(newCard)
})

app.put('/api/cards/:id', (req, res) => {
  const { id } = req.params
  const { content } = req.body
  if (!content) {
    return res.status(400).json({ error: 'Content is required' })
  }
  const data = loadData()
  for (const team of Object.keys(data)) {
    const card = data[team].find(c => c.id === id)
    if (card) {
      card.content = content
      card.updatedAt = Date.now()
      saveData(data)
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
  const data = loadData()
  for (const team of Object.keys(data)) {
    const card = data[team].find(c => c.id === id)
    if (card) {
      card.column = column as CardColumn
      card.updatedAt = Date.now()
      saveData(data)
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
  const data = loadData()
  const cards = data[team] || []
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
  console.log(`Data file: ${DATA_FILE}`)
})
