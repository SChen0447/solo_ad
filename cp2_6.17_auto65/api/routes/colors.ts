import { Router, type Request, type Response } from 'express'

const router = Router()

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
  return Math.sqrt(
    (a.r - b.r) ** 2 + (a.g - b.g) ** 2 + (a.b - b.b) ** 2
  )
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

router.post('/extract-colors', (req: Request, res: Response): void => {
  try {
    const { pixels } = req.body as { pixels: number[] }

    if (!pixels || !Array.isArray(pixels) || pixels.length < 15) {
      res.status(400).json({ success: false, error: 'Insufficient pixel data' })
      return
    }

    const sampledPixels: Pixel[] = []
    const step = Math.max(1, Math.floor(pixels.length / 3 / 5000))
    for (let i = 0; i < pixels.length - 2; i += step * 3) {
      sampledPixels.push({
        r: pixels[i],
        g: pixels[i + 1],
        b: pixels[i + 2],
      })
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

export default router
