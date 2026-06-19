import { EventEmitter } from '../../utils/EventEmitter'
import type {
  KeywordWeight,
  WordPosition,
  RenderData,
  Theme,
  WordCloudEventMap
} from '../../types'

interface Rect {
  left: number
  right: number
  top: number
  bottom: number
}

class WordCloudEngine extends EventEmitter<WordCloudEventMap> {
  private canvasWidth: number = 800
  private canvasHeight: number = 600
  private currentTheme: Theme | null = null
  private placedRects: Rect[] = []
  private measureCanvas: HTMLCanvasElement | null = null

  setCanvasSize(width: number, height: number): void {
    this.canvasWidth = width
    this.canvasHeight = height
  }

  setTheme(theme: Theme): void {
    this.currentTheme = theme
  }

  private getMeasureContext(): CanvasRenderingContext2D | null {
    if (!this.measureCanvas) {
      if (typeof document !== 'undefined') {
        this.measureCanvas = document.createElement('canvas')
      } else {
        return null
      }
    }
    return this.measureCanvas.getContext('2d')
  }

  private measureTextBBox(word: string, fontSize: number, rotate: number): { halfW: number; halfH: number } {
    const ctx = this.getMeasureContext()
    let textW: number
    let textH: number
    if (!ctx) {
      textW = word.length * fontSize * 0.6
      textH = fontSize * 1.2
    } else {
      ctx.font = `bold ${fontSize}px sans-serif`
      const metrics = ctx.measureText(word)
      textW = metrics.width
      textH = fontSize * 1.2
    }
    if (rotate === 0) {
      return { halfW: textW / 2, halfH: textH / 2 }
    }
    const rad = (rotate * Math.PI) / 180
    const absCos = Math.abs(Math.cos(rad))
    const absSin = Math.abs(Math.sin(rad))
    return {
      halfW: (textW * absCos + textH * absSin) / 2,
      halfH: (textW * absSin + textH * absCos) / 2
    }
  }

  private toRect(cx: number, cy: number, halfW: number, halfH: number, pad: number): Rect {
    return {
      left: cx - halfW - pad,
      right: cx + halfW + pad,
      top: cy - halfH - pad,
      bottom: cy + halfH + pad
    }
  }

  private rectsOverlap(a: Rect, b: Rect): boolean {
    return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top
  }

  private collidesWithAny(candidate: Rect): boolean {
    for (let i = this.placedRects.length - 1; i >= 0; i--) {
      if (this.rectsOverlap(candidate, this.placedRects[i])) {
        return true
      }
    }
    return false
  }

  private inBounds(cx: number, cy: number, halfW: number, halfH: number): boolean {
    const margin = 16
    return (
      cx - halfW >= margin &&
      cx + halfW <= this.canvasWidth - margin &&
      cy - halfH >= margin &&
      cy + halfH <= this.canvasHeight - margin
    )
  }

  private findPosition(
    halfW: number,
    halfH: number,
    weightRatio: number
  ): { x: number; y: number } | null {
    const centerX = this.canvasWidth / 2
    const centerY = this.canvasHeight / 2
    const maxRadius = Math.sqrt(centerX * centerX + centerY * centerY)
    const pad = 5

    const tightPad = 2
    const idealStartRadius = maxRadius * (1 - weightRatio) * 0.5

    let angle = 0
    let radius = Math.max(0, idealStartRadius)
    const angleStep = 0.2 + Math.random() * 0.1
    const radiusStepPerRevolution = Math.max(halfW, halfH) * 0.5 + 8

    for (let i = 0; i < 6000; i++) {
      const cx = centerX + Math.cos(angle) * radius
      const cy = centerY + Math.sin(angle) * radius

      if (this.inBounds(cx, cy, halfW, halfH)) {
        const candidate = this.toRect(cx, cy, halfW, halfH, pad)
        if (!this.collidesWithAny(candidate)) {
          const verifyRect = this.toRect(cx, cy, halfW, halfH, tightPad)
          if (!this.collidesWithAny(verifyRect)) {
            return { x: cx, y: cy }
          }
        }
      }

      angle += angleStep
      radius = idealStartRadius + radiusStepPerRevolution * (angle / (2 * Math.PI))

      if (radius > maxRadius) {
        break
      }
    }

    for (let attempt = 0; attempt < 3000; attempt++) {
      const r = idealStartRadius + Math.random() * (maxRadius * 0.8 - idealStartRadius)
      const a = Math.random() * Math.PI * 2
      const cx = centerX + Math.cos(a) * r
      const cy = centerY + Math.sin(a) * r

      if (this.inBounds(cx, cy, halfW, halfH)) {
        const candidate = this.toRect(cx, cy, halfW, halfH, pad)
        if (!this.collidesWithAny(candidate)) {
          return { x: cx, y: cy }
        }
      }
    }

    return null
  }

  private calculateFontSize(weight: number, maxWeight: number, minWeight: number, rank: number, total: number): number {
    const minFontSize = 14
    const maxFontSize = 72

    if (maxWeight === minWeight) {
      return Math.round(minFontSize + (maxFontSize - minFontSize) * (1 - rank / Math.max(total - 1, 1)))
    }

    const weightRatio = (weight - minWeight) / (maxWeight - minWeight)
    const rankRatio = 1 - rank / Math.max(total - 1, 1)
    const combinedRatio = weightRatio * 0.7 + rankRatio * 0.3

    return Math.round(minFontSize + Math.pow(combinedRatio, 1.5) * (maxFontSize - minFontSize))
  }

  private getColorForWord(weightRatio: number): string {
    if (this.currentTheme && this.currentTheme.textColors.length > 0) {
      const colors = this.currentTheme.textColors
      const idx = Math.min(Math.floor(weightRatio * colors.length), colors.length - 1)
      return colors[idx]
    }
    const colors = ['#2563eb', '#7c3aed', '#db2777', '#ea580c', '#059669']
    return colors[Math.floor(Math.random() * colors.length)]
  }

  private getRotation(rank: number, weight: number, maxWeight: number): number {
    if (rank < 3 || weight >= maxWeight * 0.5) {
      return 0
    }
    return Math.random() > 0.7 ? (Math.random() > 0.5 ? 90 : -90) : 0
  }

  compute(keywords: KeywordWeight[]): RenderData {
    const startTime = performance.now()

    if (keywords.length === 0) {
      this.placedRects = []
      const result: RenderData = { positions: [], width: this.canvasWidth, height: this.canvasHeight }
      this.emit('data:update', result)
      return result
    }

    const sorted = [...keywords].sort((a, b) => b.weight - a.weight)
    const maxWeight = sorted[0].weight
    const minWeight = sorted[sorted.length - 1].weight
    const limit = Math.min(sorted.length, 100)

    this.placedRects = []
    const positions: WordPosition[] = []

    for (let i = 0; i < limit; i++) {
      const kw = sorted[i]
      const weightRatio = maxWeight === minWeight
        ? (1 - i / Math.max(limit - 1, 1))
        : (kw.weight - minWeight) / (maxWeight - minWeight)
      const fontSize = this.calculateFontSize(kw.weight, maxWeight, minWeight, i, limit)
      const rotate = this.getRotation(i, kw.weight, maxWeight)
      const bbox = this.measureTextBBox(kw.word, fontSize, rotate)
      const color = this.getColorForWord(weightRatio)

      const pos = this.findPosition(bbox.halfW, bbox.halfH, weightRatio)

      if (pos) {
        const placedRect = this.toRect(pos.x, pos.y, bbox.halfW, bbox.halfH, 5)
        this.placedRects.push(placedRect)
        positions.push({
          word: kw.word,
          weight: kw.weight,
          x: pos.x,
          y: pos.y,
          fontSize,
          color,
          rotate
        })
      }
    }

    const result: RenderData = {
      positions,
      width: this.canvasWidth,
      height: this.canvasHeight
    }

    this.emit('data:update', result)

    const elapsed = performance.now() - startTime
    if (elapsed > 50) {
      console.warn(`WordCloud compute took ${elapsed.toFixed(1)}ms (target < 50ms)`)
    }

    return result
  }

  getCurrentRenderData(): RenderData {
    return {
      positions: this.placedRects.map((rect, i) => {
        const cx = (rect.left + rect.right) / 2
        const cy = (rect.top + rect.bottom) / 2
        return {
          word: `word-${i}`,
          weight: 1,
          x: cx,
          y: cy,
          fontSize: 20,
          color: '#333',
          rotate: 0
        }
      }),
      width: this.canvasWidth,
      height: this.canvasHeight
    }
  }
}

export const wordCloudEngine = new WordCloudEngine()
export type { WordCloudEngine }
