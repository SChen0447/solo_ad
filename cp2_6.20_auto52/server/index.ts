import express from 'express'
import multer from 'multer'
import { styleProcessor } from './styleProcessor.js'
import crypto from 'crypto'

const app = express()
const port = 3002

app.use(express.json())

const storage = multer.memoryStorage()
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }
})

interface SharedImage {
  imageBuffer: Buffer
  createdAt: number
}

const sharedImages = new Map<string, SharedImage>()

setInterval(() => {
  const now = Date.now()
  for (const [id, data] of sharedImages) {
    if (now - data.createdAt > 5 * 60 * 1000) {
      sharedImages.delete(id)
    }
  }
}, 60 * 1000)

app.post('/api/style', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image uploaded' })
    }

    const style = req.body.style as string
    const intensity = parseFloat(req.body.intensity || '100')
    const contrast = parseFloat(req.body.contrast || '0')
    const detail = parseFloat(req.body.detail || '100')

    const result = await styleProcessor({
      imageBuffer: req.file.buffer,
      style,
      intensity,
      contrast,
      detail
    })

    res.json({
      success: true,
      image: `data:image/png;base64,${result.toString('base64')}`
    })
  } catch (error) {
    console.error('Style processing error:', error)
    res.status(500).json({ error: 'Failed to process image' })
  }
})

app.post('/api/share', upload.single('image'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image uploaded' })
    }

    const id = crypto.randomBytes(8).toString('hex')
    sharedImages.set(id, {
      imageBuffer: req.file.buffer,
      createdAt: Date.now()
    })

    res.json({
      success: true,
      shareId: id,
      shareUrl: `/share/${id}`
    })
  } catch (error) {
    console.error('Share error:', error)
    res.status(500).json({ error: 'Failed to create share link' })
  }
})

app.get('/api/share/:id', (req, res) => {
  const { id } = req.params
  const data = sharedImages.get(id)

  if (!data) {
    return res.status(404).json({ error: 'Share link not found or expired' })
  }

  res.setHeader('Content-Type', 'image/png')
  res.send(data.imageBuffer)
})

app.listen(port, () => {
  console.log(`Server running on port ${port}`)
})
