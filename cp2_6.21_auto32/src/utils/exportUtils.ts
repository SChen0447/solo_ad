import { CanvasElement, PaperSize, PAPER_SIZES } from '../types'

export async function exportToPNG(elements: CanvasElement[], paperSize: PaperSize): Promise<Blob> {
  const { width: baseWidth, height: baseHeight } = PAPER_SIZES[paperSize]
  const width = baseWidth * 3
  const height = baseHeight * 3

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')!

  ctx.fillStyle = '#FFFFFF'
  ctx.fillRect(0, 0, width, height)

  for (const el of elements) {
    ctx.save()
    const cx = el.x * 3 + (el.width * 3) / 2
    const cy = el.y * 3 + (el.height * 3) / 2
    ctx.translate(cx, cy)
    ctx.rotate((el.rotation * Math.PI) / 180)
    ctx.translate(-cx, -cy)

    const x = el.x * 3
    const y = el.y * 3
    const w = el.width * 3
    const h = el.height * 3

    if (el.type === 'rect') {
      ctx.fillStyle = el.backgroundColor
      ctx.beginPath()
      const r = el.borderRadius * 3
      ctx.moveTo(x + r, y)
      ctx.lineTo(x + w - r, y)
      ctx.quadraticCurveTo(x + w, y, x + w, y + r)
      ctx.lineTo(x + w, y + h - r)
      ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
      ctx.lineTo(x + r, y + h)
      ctx.quadraticCurveTo(x, y + h, x, y + h - r)
      ctx.lineTo(x, y + r)
      ctx.quadraticCurveTo(x, y, x + r, y)
      ctx.closePath()
      ctx.fill()

      if (el.borderWidth > 0) {
        ctx.strokeStyle = el.borderColor
        ctx.lineWidth = el.borderWidth * 3
        if (el.borderStyle === 'dashed') {
          ctx.setLineDash([6 * 3, 3 * 3])
        } else if (el.borderStyle === 'dotted') {
          ctx.setLineDash([2 * 3, 2 * 3])
        } else {
          ctx.setLineDash([])
        }
        ctx.stroke()
      }
    }

    if (el.type === 'text') {
      if (el.backgroundColor !== 'transparent') {
        ctx.fillStyle = el.backgroundColor
        ctx.fillRect(x, y, w, h)
      }
      ctx.fillStyle = el.fontColor || '#000000'
      ctx.font = `${(el.fontSize || 14) * 3}px sans-serif`
      ctx.textBaseline = 'top'
      if (el.letterSpacing && el.letterSpacing > 0) {
        let offsetX = 0
        for (const char of (el.text || '')) {
          ctx.fillText(char, x + offsetX, y)
          offsetX += ctx.measureText(char).width + el.letterSpacing * 3
        }
      } else {
        ctx.fillText(el.text || '', x, y)
      }
    }

    if (el.type === 'line') {
      ctx.fillStyle = el.backgroundColor
      ctx.fillRect(x, y, w, h)
    }

    if (el.type === 'dateLabel') {
      ctx.fillStyle = el.backgroundColor
      ctx.fillRect(x, y, w, h)
      if (el.borderWidth > 0) {
        ctx.strokeStyle = el.borderColor
        ctx.lineWidth = el.borderWidth * 3
        ctx.strokeRect(x, y, w, h)
      }
      ctx.fillStyle = el.fontColor || '#000000'
      ctx.font = `${(el.fontSize || 12) * 3}px sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(el.text || '', x + w / 2, y + h / 2)
    }

    ctx.restore()
  }

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob)
      } else {
        reject(new Error('Failed to export PNG'))
      }
    }, 'image/png')
  })
}

export function generateThumbnail(elements: CanvasElement[], paperSize: PaperSize): string {
  const canvas = document.createElement('canvas')
  canvas.width = 200
  canvas.height = 280
  const ctx = canvas.getContext('2d')!

  const { width: paperW, height: paperH } = PAPER_SIZES[paperSize]
  const scale = Math.min(200 / paperW, 280 / paperH)
  const offsetX = (200 - paperW * scale) / 2
  const offsetY = (280 - paperH * scale) / 2

  ctx.fillStyle = '#FFFFFF'
  ctx.fillRect(0, 0, 200, 280)

  for (const el of elements) {
    ctx.save()
    const cx = offsetX + (el.x + el.width / 2) * scale
    const cy = offsetY + (el.y + el.height / 2) * scale
    ctx.translate(cx, cy)
    ctx.rotate((el.rotation * Math.PI) / 180)
    ctx.translate(-cx, -cy)

    const x = offsetX + el.x * scale
    const y = offsetY + el.y * scale
    const w = el.width * scale
    const h = el.height * scale

    if (el.type === 'rect') {
      ctx.fillStyle = el.backgroundColor
      ctx.fillRect(x, y, w, h)
      if (el.borderWidth > 0) {
        ctx.strokeStyle = el.borderColor
        ctx.lineWidth = Math.max(1, el.borderWidth * scale)
        ctx.strokeRect(x, y, w, h)
      }
    }

    if (el.type === 'text') {
      if (el.backgroundColor !== 'transparent') {
        ctx.fillStyle = el.backgroundColor
        ctx.fillRect(x, y, w, h)
      }
      ctx.fillStyle = el.fontColor || '#000000'
      ctx.font = `${Math.max(8, (el.fontSize || 14) * scale)}px sans-serif`
      ctx.textBaseline = 'top'
      ctx.fillText(el.text || '', x, y)
    }

    if (el.type === 'line') {
      ctx.fillStyle = el.backgroundColor
      ctx.fillRect(x, y, w, h)
    }

    if (el.type === 'dateLabel') {
      ctx.fillStyle = el.backgroundColor
      ctx.fillRect(x, y, w, h)
      ctx.fillStyle = el.fontColor || '#000000'
      ctx.font = `${Math.max(8, (el.fontSize || 12) * scale)}px sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(el.text || '', x + w / 2, y + h / 2)
    }

    ctx.restore()
  }

  return canvas.toDataURL('image/png')
}
