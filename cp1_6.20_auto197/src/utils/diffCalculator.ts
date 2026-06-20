import axios from 'axios'
import type { DiffResult } from '../types'

export async function calculateDiff(
  imageUrl1: string,
  imageUrl2: string
): Promise<DiffResult> {
  const response = await axios.post(
    '/api/diff',
    { imageUrl1, imageUrl2 },
    { timeout: 3000 }
  )
  return response.data
}

export function createHeatmapCanvas(
  ctx: CanvasRenderingContext2D,
  base64Data: string,
  opacity: number
): Promise<void> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      ctx.globalAlpha = opacity
      ctx.drawImage(img, 0, 0)
      ctx.globalAlpha = 1
      resolve()
    }
    img.onerror = reject
    img.src = `data:image/png;base64,${base64Data}`
  })
}

export function drawImageOnCanvas(
  ctx: CanvasRenderingContext2D,
  imageUrl: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      ctx.drawImage(img, 0, 0)
      resolve()
    }
    img.onerror = reject
    img.src = imageUrl
  })
}
