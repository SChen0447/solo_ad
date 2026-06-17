import express, {
  type Request,
  type Response,
  type NextFunction,
} from 'express'
import cors from 'cors'

interface Pixel {
  r: number
  g: number
  b: number
}

interface Cluster {
  centroid: Pixel
  pixels: Pixel[]
}

function distance(a: Pixel, b: Pixel): number {
  return Math.sqrt((a.r - b.r) ** 2 + (a.g - b.g) ** 2 + (a.b - b.b) ** 2)
}

function kmeans(pixels: Pixel[], k: number, maxIterations = 20): Cluster[] {
  const centroids: Pixel[] = []
  const used = new Set<number>()
  while (centroids.length < k) {
    const idx = Math.floor(Math.random() * pixels.length)
    if (!used.has(idx)) {
      used.add(idx)
      centroids.push({ ...pixels[idx] })
    }
  }

  let clusters: Cluster[] = centroids.map((c) => ({ centroid: c, pixels: [] }))

  for (let iter = 0; iter < maxIterations; iter++) {
    clusters.forEach((cl) => (cl.pixels = []))
    for (const px of pixels) {
      let minDist = Infinity
      let minIdx = 0
      for (let i = 0; i < clusters.length; i++) {
        const d = distance(px, clusters[i].centroid)
        if (d < minDist) {
          minDist = d
          minIdx = i
        }
      }
      clusters[minIdx].pixels.push(px)
    }

    let converged = true
    for (const cl of clusters) {
      if (cl.pixels.length === 0) continue
      const newR = Math.round(cl.pixels.reduce((s, p) => s + p.r, 0) / cl.pixels.length)
      const newG = Math.round(cl.pixels.reduce((s, p) => s + p.g, 0) / cl.pixels.length)
      const newB = Math.round(cl.pixels.reduce((s, p) => s + p.b, 0) / cl.pixels.length)
      if (newR !== cl.centroid.r || newG !== cl.centroid.g || newB !== cl.centroid.b) {
        converged = false
      }
      cl.centroid = { r: newR, g: newG, b: newB }
    }
    if (converged) break
  }

  return clusters
}

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map((v) => Math.max(0, Math.min(255, v)).toString(16).padStart(2, '0')).join('')
}

const app: express.Application = express()
const PORT = process.env.PORT || 3001

app.use(cors())
app.use(express.json({ limit: '50mb' }))
app.use(express.urlencoded({ extended: true, limit: '50mb' }))

app.post('/api/extract-colors', (req: Request, res: Response): void => {
  try {
    const { pixels } = req.body as { pixels: number[] }

    if (!pixels || !Array.isArray(pixels) || pixels.length < 15) {
      res.status(400).json({ success: false, error: 'Insufficient pixel data' })
      return
    }

    const sampledPixels: Pixel[] = []
    const step = Math.max(1, Math.floor(pixels.length / 3 / 5000))
    for (let i = 0; i < pixels.length - 2; i += step * 3) {
      sampledPixels.push({ r: pixels[i], g: pixels[i + 1], b: pixels[i + 2] })
    }

    const clusters = kmeans(sampledPixels, 5)
    const totalPixels = clusters.reduce((s, cl) => s + cl.pixels.length, 0)

    const colors = clusters
      .map((cl) => ({
        hex: rgbToHex(cl.centroid.r, cl.centroid.g, cl.centroid.b),
        percentage: Math.round((cl.pixels.length / totalPixels) * 10000) / 100,
      }))
      .sort((a, b) => b.percentage - a.percentage)

    res.json({ success: true, colors })
  } catch (error) {
    console.error('Color extraction error:', error)
    res.status(500).json({ success: false, error: 'Color extraction failed' })
  }
})

app.get('/api/health', (_req: Request, res: Response): void => {
  res.status(200).json({ success: true, message: 'ok' })
})

app.use((error: Error, _req: Request, res: Response, _next: NextFunction) => {
  res.status(500).json({ success: false, error: 'Server internal error' })
})

app.use((_req: Request, res: Response) => {
  res.status(404).json({ success: false, error: 'API not found' })
})

const server = app.listen(PORT, () => {
  console.log(`Color extraction server ready on port ${PORT}`)
})

process.on('SIGTERM', () => {
  server.close(() => process.exit(0))
})

process.on('SIGINT', () => {
  server.close(() => process.exit(0))
})
