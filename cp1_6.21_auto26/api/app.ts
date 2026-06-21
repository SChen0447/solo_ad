import express, { type Request, type Response } from 'express'
import cors from 'cors'
import { v4 as uuidv4 } from 'uuid'

export type MediaType = 'book' | 'movie' | 'music'

export interface MediaItem {
  id: string
  type: MediaType
  title: string
  creator: string
  year: number
  coverUrl: string
  rating: number
  tags: string[]
  createdAt: number
}

interface CreateItemBody extends Omit<MediaItem, 'id' | 'createdAt'> {}
interface UpdateItemBody extends Partial<Omit<MediaItem, 'id' | 'createdAt' | 'coverUrl'>> {}

interface StatsData {
  total: number
  byType: Record<MediaType, number>
  avgRating: number
  tagCloud: Array<{ tag: string; count: number }>
}

const app = express()

app.use(cors())
app.use(express.json({ limit: '10mb' }))

const storage = new Map<string, MediaItem>()

const seedData: Array<Omit<MediaItem, 'id' | 'createdAt'>> = [
  {
    type: 'book', title: '百年孤独', creator: '加西亚·马尔克斯', year: 1967,
    coverUrl: 'https://picsum.photos/seed/book1/400/600', rating: 5, tags: ['经典', '魔幻现实主义', '推荐']
  },
  {
    type: 'book', title: '三体', creator: '刘慈欣', year: 2008,
    coverUrl: 'https://picsum.photos/seed/book2/400/600', rating: 5, tags: ['科幻', '经典', '中国']
  },
  {
    type: 'book', title: '活着', creator: '余华', year: 1993,
    coverUrl: 'https://picsum.photos/seed/book3/400/600', rating: 4, tags: ['经典', '中国', '文学']
  },
  {
    type: 'book', title: '小王子', creator: '圣埃克苏佩里', year: 1943,
    coverUrl: 'https://picsum.photos/seed/book4/400/600', rating: 5, tags: ['治愈', '童话', '经典']
  },
  {
    type: 'movie', title: '肖申克的救赎', creator: '弗兰克·德拉邦特', year: 1994,
    coverUrl: 'https://picsum.photos/seed/movie1/400/600', rating: 5, tags: ['经典', '励志', '人性']
  },
  {
    type: 'movie', title: '盗梦空间', creator: '克里斯托弗·诺兰', year: 2010,
    coverUrl: 'https://picsum.photos/seed/movie2/400/600', rating: 5, tags: ['科幻', '悬疑', '推荐']
  },
  {
    type: 'movie', title: '千与千寻', creator: '宫崎骏', year: 2001,
    coverUrl: 'https://picsum.photos/seed/movie3/400/600', rating: 5, tags: ['治愈', '动画', '经典']
  },
  {
    type: 'movie', title: '星际穿越', creator: '克里斯托弗·诺兰', year: 2014,
    coverUrl: 'https://picsum.photos/seed/movie4/400/600', rating: 4, tags: ['科幻', '太空', '感人']
  },
  {
    type: 'music', title: 'Thriller', creator: 'Michael Jackson', year: 1982,
    coverUrl: 'https://picsum.photos/seed/music1/400/600', rating: 5, tags: ['经典', '流行', '推荐']
  },
  {
    type: 'music', title: '夜曲', creator: '周杰伦', year: 2005,
    coverUrl: 'https://picsum.photos/seed/music2/400/600', rating: 5, tags: ['华语', '经典', '中国']
  },
  {
    type: 'music', title: 'OK Computer', creator: 'Radiohead', year: 1997,
    coverUrl: 'https://picsum.photos/seed/music3/400/600', rating: 4, tags: ['摇滚', '经典', '另类']
  },
  {
    type: 'music', title: '稻香', creator: '周杰伦', year: 2008,
    coverUrl: 'https://picsum.photos/seed/music4/400/600', rating: 5, tags: ['华语', '治愈', '中国']
  }
]

const now = Date.now()
seedData.forEach((item, idx) => {
  const id = uuidv4()
  storage.set(id, { ...item, id, createdAt: now - idx * 100000 })
})

function validateCreate(body: unknown): body is CreateItemBody {
  if (typeof body !== 'object' || body === null) return false
  const b = body as Record<string, unknown>
  return (
    (b.type === 'book' || b.type === 'movie' || b.type === 'music') &&
    typeof b.title === 'string' && b.title.trim().length > 0 &&
    typeof b.creator === 'string' && b.creator.trim().length > 0 &&
    typeof b.year === 'number' && b.year > 0 &&
    typeof b.coverUrl === 'string' && b.coverUrl.trim().length > 0 &&
    typeof b.rating === 'number' && b.rating >= 1 && b.rating <= 5 &&
    Array.isArray(b.tags) && (b.tags as unknown[]).every(t => typeof t === 'string') && b.tags.length <= 5
  )
}

function validateUpdate(body: unknown): body is UpdateItemBody {
  if (typeof body !== 'object' || body === null) return false
  const b = body as Record<string, unknown>
  if (b.type !== undefined && b.type !== 'book' && b.type !== 'movie' && b.type !== 'music') return false
  if (b.title !== undefined && (typeof b.title !== 'string' || b.title.trim().length === 0)) return false
  if (b.creator !== undefined && (typeof b.creator !== 'string' || b.creator.trim().length === 0)) return false
  if (b.year !== undefined && (typeof b.year !== 'number' || b.year <= 0)) return false
  if (b.rating !== undefined && (typeof b.rating !== 'number' || b.rating < 1 || b.rating > 5)) return false
  if (b.tags !== undefined) {
    if (!Array.isArray(b.tags)) return false
    if (!(b.tags as unknown[]).every(t => typeof t === 'string')) return false
    if (b.tags.length > 5) return false
  }
  return true
}

app.get('/api/items', (_req: Request, res: Response) => {
  const items = Array.from(storage.values()).sort((a, b) => b.createdAt - a.createdAt)
  res.json(items)
})

app.get('/api/items/:id', (req: Request, res: Response) => {
  const item = storage.get(req.params.id)
  if (!item) return res.status(404).json({ success: false, error: 'Item not found' })
  res.json(item)
})

app.post('/api/items', (req: Request, res: Response) => {
  if (!validateCreate(req.body)) {
    return res.status(400).json({ success: false, error: 'Validation failed' })
  }
  const id = uuidv4()
  const item: MediaItem = { ...req.body, id, createdAt: Date.now() }
  storage.set(id, item)
  res.status(201).json(item)
})

app.put('/api/items/:id', (req: Request, res: Response) => {
  const existing = storage.get(req.params.id)
  if (!existing) return res.status(404).json({ success: false, error: 'Item not found' })
  if (!validateUpdate(req.body)) {
    return res.status(400).json({ success: false, error: 'Validation failed' })
  }
  const updated: MediaItem = { ...existing, ...req.body }
  storage.set(req.params.id, updated)
  res.json(updated)
})

app.delete('/api/items/:id', (req: Request, res: Response) => {
  const ok = storage.delete(req.params.id)
  if (!ok) return res.status(404).json({ success: false, error: 'Item not found' })
  res.json({ success: true })
})

app.get('/api/tags', (_req: Request, res: Response) => {
  const set = new Set<string>()
  for (const item of storage.values()) {
    item.tags.forEach(t => set.add(t))
  }
  res.json(Array.from(set).sort())
})

app.get('/api/stats', (_req: Request, res: Response) => {
  const values = Array.from(storage.values())
  const byType: Record<MediaType, number> = { book: 0, movie: 0, music: 0 }
  let ratingSum = 0
  const tagCounts = new Map<string, number>()
  values.forEach(item => {
    byType[item.type] += 1
    ratingSum += item.rating
    item.tags.forEach(t => {
      tagCounts.set(t, (tagCounts.get(t) ?? 0) + 1)
    })
  })
  const avgRating = values.length ? Number((ratingSum / values.length).toFixed(1)) : 0
  const tagCloud = Array.from(tagCounts.entries())
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 30)
  const stats: StatsData = { total: values.length, byType, avgRating, tagCloud }
  res.json(stats)
})

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ success: true, message: 'ok' })
})

app.use((_req: Request, res: Response) => {
  res.status(404).json({ success: false, error: 'API not found' })
})

export default app
