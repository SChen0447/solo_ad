import express from 'express'
import cors from 'cors'
import { v4 as uuidv4 } from 'uuid'

const app = express()
const PORT = 3001

app.use(cors())
app.use(express.json())

export type ReviewGrade = 'hard' | 'normal' | 'easy'

export interface Card {
  id: string
  title: string
  content: string
  tags: string[]
  createdAt: number
  lastReviewedAt: number | null
  nextReviewAt: number
  repetitions: number
  easeFactor: number
  interval: number
}

let cards: Card[] = []

const ONE_DAY = 24 * 60 * 60 * 1000

function calculateNextReview(card: Card, grade: ReviewGrade): Partial<Card> {
  const now = Date.now()
  let { repetitions, easeFactor, interval } = card

  const quality = grade === 'easy' ? 5 : grade === 'normal' ? 3 : 0

  if (quality < 3) {
    repetitions = 0
    interval = 1
  } else {
    if (repetitions === 0) {
      interval = 1
    } else if (repetitions === 1) {
      interval = 6
    } else {
      interval = Math.round(interval * easeFactor)
    }
    repetitions += 1
  }

  easeFactor = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
  if (easeFactor < 1.3) easeFactor = 1.3

  const nextReviewAt = now + interval * ONE_DAY

  return {
    lastReviewedAt: now,
    nextReviewAt,
    repetitions,
    easeFactor,
    interval,
  }
}

function dedupeTags(tags: string[]): string[] {
  const seen = new Set<string>()
  return tags.filter(t => t && !seen.has(t) && (seen.add(t), true)).slice(0, 5)
}

function createCard(data: Omit<Card, 'id' | 'createdAt' | 'lastReviewedAt' | 'nextReviewAt' | 'repetitions' | 'easeFactor' | 'interval'>): Card {
  const now = Date.now()
  return {
    id: uuidv4(),
    ...data,
    createdAt: now,
    lastReviewedAt: null,
    nextReviewAt: now,
    repetitions: 0,
    easeFactor: 2.5,
    interval: 0,
  }
}

app.get('/api/cards', (req, res) => {
  const { search, tag } = req.query
  let result = [...cards]

  if (typeof search === 'string' && search.trim()) {
    const keyword = search.trim().toLowerCase()
    result = result.filter(c =>
      c.title.toLowerCase().includes(keyword) ||
      c.content.toLowerCase().includes(keyword)
    )
  }

  if (typeof tag === 'string' && tag.trim()) {
    result = result.filter(c => c.tags.includes(tag.trim()))
  }

  result.sort((a, b) => {
    const aDue = a.nextReviewAt <= Date.now() ? 0 : 1
    const bDue = b.nextReviewAt <= Date.now() ? 0 : 1
    if (aDue !== bDue) return aDue - bDue
    return a.nextReviewAt - b.nextReviewAt
  })

  res.json(result)
})

app.get('/api/cards/due', (req, res) => {
  const now = Date.now()
  const dueCards = cards
    .filter(c => c.nextReviewAt <= now)
    .sort((a, b) => a.nextReviewAt - b.nextReviewAt)
  res.json(dueCards)
})

app.post('/api/cards', (req, res) => {
  const { title, content, tags } = req.body

  if (!title || typeof title !== 'string' || title.trim().length === 0) {
    return res.status(400).json({ error: '标题不能为空' })
  }
  if (title.length > 50) {
    return res.status(400).json({ error: '标题不能超过50字' })
  }

  let tagList: string[] = []
  if (tags) {
    if (Array.isArray(tags)) {
      tagList = dedupeTags(tags.map((t: string) => t.trim()))
    } else if (typeof tags === 'string') {
      tagList = dedupeTags(tags.split(',').map(t => t.trim()))
    }
  }
  if (tagList.length > 5) {
    return res.status(400).json({ error: '标签不能超过5个' })
  }

  const card = createCard({
    title: title.trim(),
    content: content || '',
    tags: tagList,
  })
  cards.unshift(card)
  res.status(201).json(card)
})

app.put('/api/cards/:id', (req, res) => {
  const { id } = req.params
  const index = cards.findIndex(c => c.id === id)

  if (index === -1) {
    return res.status(404).json({ error: '卡片不存在' })
  }

  const { title, content, tags } = req.body

  if (title !== undefined) {
    if (typeof title !== 'string' || title.trim().length === 0) {
      return res.status(400).json({ error: '标题不能为空' })
    }
    if (title.length > 50) {
      return res.status(400).json({ error: '标题不能超过50字' })
    }
  }

  let tagList: string[] | undefined
  if (tags !== undefined) {
    if (Array.isArray(tags)) {
      tagList = dedupeTags(tags.map((t: string) => t.trim()))
    } else if (typeof tags === 'string') {
      tagList = dedupeTags(tags.split(',').map(t => t.trim()))
    }
    if (tagList && tagList.length > 5) {
      return res.status(400).json({ error: '标签不能超过5个' })
    }
  }

  const updated: Card = {
    ...cards[index],
    ...(title !== undefined ? { title: title.trim() } : {}),
    ...(content !== undefined ? { content } : {}),
    ...(tagList !== undefined ? { tags: tagList } : {}),
  }
  cards[index] = updated
  res.json(updated)
})

app.put('/api/cards/:id/review', (req, res) => {
  const { id } = req.params
  const { grade } = req.body
  const index = cards.findIndex(c => c.id === id)

  if (index === -1) {
    return res.status(404).json({ error: '卡片不存在' })
  }

  if (!grade || !['hard', 'normal', 'easy'].includes(grade)) {
    return res.status(400).json({ error: '复习等级必须是 hard、normal 或 easy' })
  }

  const updates = calculateNextReview(cards[index], grade as ReviewGrade)
  cards[index] = { ...cards[index], ...updates }
  res.json(cards[index])
})

app.delete('/api/cards/:id', (req, res) => {
  const { id } = req.params
  const index = cards.findIndex(c => c.id === id)
  if (index === -1) {
    return res.status(404).json({ error: '卡片不存在' })
  }
  const deleted = cards[index]
  cards.splice(index, 1)
  res.json(deleted)
})

app.get('/api/tags', (_req, res) => {
  const tagCount: Record<string, number> = {}
  cards.forEach(card => {
    card.tags.forEach(tag => {
      tagCount[tag] = (tagCount[tag] || 0) + 1
    })
  })
  const result = Object.entries(tagCount)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
  res.json(result)
})

app.listen(PORT, () => {
  console.log(`Backend server running at http://localhost:${PORT}`)
})
