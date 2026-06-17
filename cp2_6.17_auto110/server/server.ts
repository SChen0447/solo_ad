import express, {
  type Request,
  type Response,
  type NextFunction,
} from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { v4 as uuidv4 } from 'uuid'

dotenv.config()

const app: express.Application = express()
const PORT = process.env.PORT || 3001

app.use(cors())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

interface Bookmark {
  id: string
  url: string
  title: string
  favicon: string
  note: string
  tags: string[]
  folderId: string | null
  createdAt: string
  shareCode: string | null
}

interface Folder {
  id: string
  name: string
  collapsed: boolean
}

const bookmarks: Bookmark[] = [
  {
    id: uuidv4(),
    url: 'https://react.dev',
    title: 'React – A JavaScript library for building user interfaces',
    favicon: 'https://react.dev/favicon.ico',
    note: 'Official React documentation with tutorials and API reference',
    tags: ['react', 'frontend', 'documentation'],
    folderId: null,
    createdAt: new Date().toISOString(),
    shareCode: null,
  },
  {
    id: uuidv4(),
    url: 'https://typescriptlang.org',
    title: 'TypeScript: JavaScript With Syntax For Types',
    favicon: 'https://typescriptlang.org/favicon-32x32.png',
    note: 'TypeScript is a strongly typed programming language that builds on JavaScript',
    tags: ['typescript', 'programming', 'documentation'],
    folderId: null,
    createdAt: new Date().toISOString(),
    shareCode: null,
  },
  {
    id: uuidv4(),
    url: 'https://tailwindcss.com',
    title: 'Tailwind CSS - Rapidly build modern websites',
    favicon: 'https://tailwindcss.com/favicon.ico',
    note: 'A utility-first CSS framework for rapidly building custom designs',
    tags: ['css', 'frontend', 'design'],
    folderId: null,
    createdAt: new Date().toISOString(),
    shareCode: null,
  },
]

const folders: Folder[] = [
  {
    id: uuidv4(),
    name: '前端开发',
    collapsed: false,
  },
]

const URL_PATTERN = /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&/=]*)$/

function generateShareCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

function simulateFetchUrl(url: string): { title: string; favicon: string } {
  try {
    const urlObj = new URL(url)
    const domain = urlObj.hostname.replace('www.', '')
    const name = domain.split('.')[0]
    const capitalizedName = name.charAt(0).toUpperCase() + name.slice(1)
    return {
      title: `${capitalizedName} - Official Website`,
      favicon: `${urlObj.origin}/favicon.ico`,
    }
  } catch {
    return {
      title: url,
      favicon: '',
    }
  }
}

app.get('/api/bookmarks', (_req: Request, res: Response) => {
  res.json({ success: true, data: bookmarks })
})

app.get('/api/bookmarks/search', (req: Request, res: Response) => {
  const q = ((req.query.q as string) || '').toLowerCase().trim()
  const tagsParam = (req.query.tags as string) || ''
  const selectedTags = tagsParam
    ? tagsParam.split(',').map(t => t.trim().toLowerCase())
    : []

  let filtered = [...bookmarks]

  if (q) {
    filtered = filtered.filter(
      b =>
        b.title.toLowerCase().includes(q) ||
        b.url.toLowerCase().includes(q) ||
        b.note.toLowerCase().includes(q)
    )
  }

  if (selectedTags.length > 0) {
    filtered = filtered.filter(b =>
      selectedTags.some(st => b.tags.some(bt => bt.toLowerCase().includes(st)))
    )
  }

  res.json({ success: true, data: filtered })
})

app.get('/api/bookmarks/tags', (_req: Request, res: Response) => {
  const allTags = [...new Set(bookmarks.flatMap(b => b.tags))]
  res.json({ success: true, data: allTags })
})

app.post('/api/bookmarks/fetch-url', (req: Request, res: Response) => {
  const { url } = req.body
  if (!url) {
    res.status(400).json({ success: false, error: 'URL is required' })
    return
  }

  if (!URL_PATTERN.test(url)) {
    res.status(400).json({
      success: false,
      error: 'Invalid URL format. Must start with http:// or https://',
    })
    return
  }

  const result = simulateFetchUrl(url)
  res.json({ success: true, data: result })
})

app.post('/api/bookmarks', (req: Request, res: Response) => {
  const { url, title, note, tags, folderId } = req.body

  if (!url || typeof url !== 'string') {
    res
      .status(400)
      .json({ success: false, error: 'URL is required and must be a string' })
    return
  }

  if (!URL_PATTERN.test(url)) {
    res.status(400).json({
      success: false,
      error:
        'Invalid URL format. Must start with http:// or https:// and contain a valid domain',
    })
    return
  }

  if (tags && (!Array.isArray(tags) || tags.length > 5)) {
    res.status(400).json({
      success: false,
      error: 'Tags must be an array with maximum 5 items',
    })
    return
  }

  if (title && typeof title !== 'string') {
    res
      .status(400)
      .json({ success: false, error: 'Title must be a string' })
    return
  }

  if (note && typeof note !== 'string') {
    res.status(400).json({ success: false, error: 'Note must be a string' })
    return
  }

  const fetchResult = simulateFetchUrl(url)
  const bookmark: Bookmark = {
    id: uuidv4(),
    url,
    title: title || fetchResult.title,
    favicon: fetchResult.favicon,
    note: note || '',
    tags: (tags || []).slice(0, 5),
    folderId: folderId || null,
    createdAt: new Date().toISOString(),
    shareCode: null,
  }

  bookmarks.unshift(bookmark)
  res.status(201).json({ success: true, data: bookmark })
})

app.put('/api/bookmarks/:id', (req: Request, res: Response) => {
  const { id } = req.params
  const index = bookmarks.findIndex(b => b.id === id)

  if (index === -1) {
    res.status(404).json({ success: false, error: 'Bookmark not found' })
    return
  }

  const updates = req.body
  if (updates.tags && updates.tags.length > 5) {
    updates.tags = updates.tags.slice(0, 5)
  }

  bookmarks[index] = { ...bookmarks[index], ...updates }
  res.json({ success: true, data: bookmarks[index] })
})

app.delete('/api/bookmarks/:id', (req: Request, res: Response) => {
  const { id } = req.params
  const index = bookmarks.findIndex(b => b.id === id)

  if (index === -1) {
    res.status(404).json({ success: false, error: 'Bookmark not found' })
    return
  }

  bookmarks.splice(index, 1)
  res.json({ success: true })
})

app.post('/api/bookmarks/batch-delete', (req: Request, res: Response) => {
  const { ids } = req.body
  if (!ids || !Array.isArray(ids)) {
    res
      .status(400)
      .json({ success: false, error: 'ids array is required' })
    return
  }

  ids.forEach((id: string) => {
    const index = bookmarks.findIndex(b => b.id === id)
    if (index !== -1) {
      bookmarks.splice(index, 1)
    }
  })

  res.json({ success: true })
})

app.post('/api/bookmarks/batch-tag', (req: Request, res: Response) => {
  const { ids, tags } = req.body
  if (
    !ids ||
    !Array.isArray(ids) ||
    !tags ||
    !Array.isArray(tags)
  ) {
    res.status(400).json({
      success: false,
      error: 'ids and tags arrays are required',
    })
    return
  }

  ids.forEach((id: string) => {
    const bookmark = bookmarks.find(b => b.id === id)
    if (bookmark) {
      const merged = [...new Set([...bookmark.tags, ...tags])].slice(0, 5)
      bookmark.tags = merged
    }
  })

  res.json({ success: true })
})

app.post('/api/bookmarks/batch-move', (req: Request, res: Response) => {
  const { ids, folderId } = req.body
  if (!ids || !Array.isArray(ids)) {
    res
      .status(400)
      .json({ success: false, error: 'ids array is required' })
    return
  }

  ids.forEach((id: string) => {
    const bookmark = bookmarks.find(b => b.id === id)
    if (bookmark) {
      bookmark.folderId = folderId
    }
  })

  res.json({ success: true })
})

app.post('/api/bookmarks/:id/share', (req: Request, res: Response) => {
  const { id } = req.params
  const bookmark = bookmarks.find(b => b.id === id)

  if (!bookmark) {
    res.status(404).json({ success: false, error: 'Bookmark not found' })
    return
  }

  if (!bookmark.shareCode) {
    bookmark.shareCode = generateShareCode()
  }

  res.json({ success: true, data: { shareCode: bookmark.shareCode } })
})

app.get('/api/folders', (_req: Request, res: Response) => {
  const foldersWithBookmarks = folders.map(f => ({
    ...f,
    bookmarks: bookmarks.filter(b => b.folderId === f.id),
  }))
  res.json({ success: true, data: foldersWithBookmarks })
})

app.post('/api/folders', (req: Request, res: Response) => {
  const { name } = req.body
  if (!name) {
    res
      .status(400)
      .json({ success: false, error: 'Folder name is required' })
    return
  }

  const folder: Folder = {
    id: uuidv4(),
    name,
    collapsed: false,
  }

  folders.push(folder)
  res.status(201).json({ success: true, data: folder })
})

app.put('/api/folders/:id', (req: Request, res: Response) => {
  const { id } = req.params
  const index = folders.findIndex(f => f.id === id)

  if (index === -1) {
    res.status(404).json({ success: false, error: 'Folder not found' })
    return
  }

  folders[index] = { ...folders[index], ...req.body }
  res.json({ success: true, data: folders[index] })
})

app.delete('/api/folders/:id', (req: Request, res: Response) => {
  const { id } = req.params
  const index = folders.findIndex(f => f.id === id)

  if (index === -1) {
    res.status(404).json({ success: false, error: 'Folder not found' })
    return
  }

  bookmarks.forEach(b => {
    if (b.folderId === id) {
      b.folderId = null
    }
  })

  folders.splice(index, 1)
  res.json({ success: true })
})

app.get('/api/health', (_req: Request, res: Response) => {
  res.status(200).json({ success: true, message: 'ok' })
})

app.use((error: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(error)
  res.status(500).json({
    success: false,
    error: 'Server internal error',
  })
})

app.use((_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'API not found',
  })
})

const server = app.listen(PORT, () => {
  console.log(`Server ready on port ${PORT}`)
})

process.on('SIGTERM', () => {
  console.log('SIGTERM signal received')
  server.close(() => {
    console.log('Server closed')
    process.exit(0)
  })
})

process.on('SIGINT', () => {
  console.log('SIGINT signal received')
  server.close(() => {
    console.log('Server closed')
    process.exit(0)
  })
})

export default app
