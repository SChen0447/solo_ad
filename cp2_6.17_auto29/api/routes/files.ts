import { Router, type Request, type Response } from 'express'
import multer from 'multer'
import { v4 as uuidv4 } from 'uuid'

interface ArchiveFile {
  id: string
  fileName: string
  fileSize: number
  fileType: 'pdf' | 'jpg' | 'png' | 'svg' | 'txt'
  uploadTime: string
  tags: string[]
  notes: string
  importance: number
  dataUrl?: string
}

interface SearchParams {
  fileTypes?: string[]
  tags?: string[]
  dateFrom?: string
  dateTo?: string
  importance?: number
}

const files: ArchiveFile[] = []

const ALLOWED_TYPES: Record<string, string> = {
  'application/pdf': 'pdf',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/svg+xml': 'svg',
  'text/plain': 'txt',
}

const MAX_FILE_SIZE = 20 * 1024 * 1024

const storage = multer.memoryStorage()
const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_TYPES[file.mimetype]) {
      cb(null, true)
    } else {
      cb(new Error(`Unsupported file type: ${file.mimetype}`))
    }
  },
})

const router = Router()

router.post(
  '/files',
  upload.single('file'),
  (req: Request, res: Response): void => {
    try {
      const file = req.file
      if (!file) {
        res.status(400).json({ error: 'No file uploaded' })
        return
      }

      const fileType = ALLOWED_TYPES[file.mimetype]
      if (!fileType) {
        res.status(400).json({ error: 'Unsupported file type' })
        return
      }

      const base64 = file.buffer.toString('base64')
      const mimeType = file.mimetype
      const dataUrl = `data:${mimeType};base64,${base64}`

      const archiveFile: ArchiveFile = {
        id: uuidv4(),
        fileName: file.originalname,
        fileSize: file.size,
        fileType: fileType as ArchiveFile['fileType'],
        uploadTime: new Date().toISOString(),
        tags: [],
        notes: '',
        importance: 0,
        dataUrl,
      }

      files.push(archiveFile)
      res.status(201).json(archiveFile)
    } catch (err) {
      res.status(500).json({ error: 'Upload failed' })
    }
  }
)

router.get('/files/stats/trend', (_req: Request, res: Response): void => {
  const trend: { date: string; count: number }[] = []
  const now = new Date()
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    const dateStr = d.toISOString().split('T')[0]
    const count = files.filter(
      (f) => f.uploadTime.split('T')[0] === dateStr
    ).length
    trend.push({ date: dateStr, count })
  }
  res.json(trend)
})

router.get('/files/stats', (_req: Request, res: Response): void => {
  const today = new Date().toISOString().split('T')[0]
  const todayCount = files.filter(
    (f) => f.uploadTime.split('T')[0] === today
  ).length

  const typeDistribution: Record<string, number> = {}
  for (const f of files) {
    typeDistribution[f.fileType] = (typeDistribution[f.fileType] || 0) + 1
  }

  res.json({
    total: files.length,
    todayCount,
    typeDistribution,
  })
})

router.get('/files', (_req: Request, res: Response): void => {
  const result = files.map(({ dataUrl, ...rest }) => {
    if (rest.fileType === 'jpg' || rest.fileType === 'png' || rest.fileType === 'svg') {
      return { ...rest, dataUrl }
    }
    return rest
  })
  res.json(result)
})

router.get('/files/:id', (req: Request, res: Response): void => {
  const file = files.find((f) => f.id === req.params.id)
  if (!file) {
    res.status(404).json({ error: 'File not found' })
    return
  }
  res.json(file)
})

router.put('/files/:id', (req: Request, res: Response): void => {
  const idx = files.findIndex((f) => f.id === req.params.id)
  if (idx === -1) {
    res.status(404).json({ error: 'File not found' })
    return
  }

  const { tags, notes, importance } = req.body
  if (tags !== undefined) {
    if (Array.isArray(tags) && tags.length <= 5) {
      files[idx].tags = tags
    }
  }
  if (notes !== undefined) {
    if (typeof notes === 'string' && notes.length <= 200) {
      files[idx].notes = notes
    }
  }
  if (importance !== undefined) {
    const val = Number(importance)
    if (val >= 1 && val <= 5) {
      files[idx].importance = val
    }
  }

  res.json(files[idx])
})

router.post('/files/search', (req: Request, res: Response): void => {
  const params: SearchParams = req.body

  let results = [...files]

  if (params.fileTypes && params.fileTypes.length > 0) {
    results = results.filter((f) => params.fileTypes!.includes(f.fileType))
  }

  if (params.tags && params.tags.length > 0) {
    results = results.filter((f) =>
      params.tags!.some((t) => f.tags.includes(t))
    )
  }

  if (params.dateFrom) {
    results = results.filter((f) => f.uploadTime >= params.dateFrom!)
  }

  if (params.dateTo) {
    const toDate = params.dateTo + 'T23:59:59.999Z'
    results = results.filter((f) => f.uploadTime <= toDate)
  }

  if (params.importance !== undefined && params.importance > 0) {
    results = results.filter((f) => f.importance === params.importance)
  }

  const mapped = results.map(({ dataUrl, ...rest }) => rest)
  res.json(mapped)
})

export default router
