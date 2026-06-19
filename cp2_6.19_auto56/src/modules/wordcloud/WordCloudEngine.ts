import { EventEmitter } from '../../utils/EventEmitter'
import type {
  KeywordWeight,
  WordPosition,
  RenderData,
  Theme,
  WordCloudEventMap
} from '../../types'

interface PlacedWord {
  word: string
  weight: number
  x: number
  y: number
  width: number
  height: number
  fontSize: number
  color: string
  rotate: number
  radius: number
}

class WordCloudEngine extends EventEmitter<WordCloudEventMap> {
  private canvasWidth: number = 800
  private canvasHeight: number = 600
  private currentTheme: Theme | null = null
  private placedWords: PlacedWord[] = []
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

  private measureText(word: string, fontSize: number, rotate: number): { width: number; height: number } {
    const ctx = this.getMeasureContext()
    if (!ctx) {
      return { width: word.length * fontSize * 0.6, height: fontSize * 1.2 }
    }
    ctx.font = `bold ${fontSize}px sans-serif`
    const metrics = ctx.measureText(word)
    const w = metrics.width
    const h = fontSize * 1.2
    if (rotate === 0) {
      return { width: w, height: h }
    }
    const rad = (rotate * Math.PI) / 180
    const absCos = Math.abs(Math.cos(rad))
    const absSin = Math.abs(Math.sin(rad))
    return {
      width: w * absCos + h * absSin,
      height: w * absSin + h * absCos
    }
  }

  private rectsCollide(
    a: { x: number; y: number; width: number; height: number },
    b: { x: number; y: number; width: number; height: number },
    padding: number = 4
  ): boolean {
    return !(
      a.x + a.width / 2 + padding < b.x - b.width / 2 ||
      a.x - a.width / 2 - padding > b.x + b.width / 2 ||
      a.y + a.height / 2 + padding < b.y - b.height / 2 ||
      a.y - a.height / 2 - padding > b.y + b.height / 2
    )
  }

  private collidesWithAny(candidate: { x: number; y: number; width: number; height: number }): boolean {
    for (const placed of this.placedWords) {
      if (this.rectsCollide(candidate, placed, 6)) {
        return true
      }
    }
    return false
  }

  private inBounds(pos: { x: number; y: number; width: number; height: number }): boolean {
    const margin = 20
    return (
      pos.x - pos.width / 2 >= margin &&
      pos.x + pos.width / 2 <= this.canvasWidth - margin &&
      pos.y - pos.height / 2 >= margin &&
      pos.y + pos.height / 2 <= this.canvasHeight - margin
    )
  }

  private findArchimedeanSpiralPosition(
    size: { width: number; height: number },
    weightRatio: number
  ): { x: number; y: number; radius: number } | null {
    const centerX = this.canvasWidth / 2
    const centerY = this.canvasHeight / 2
    const maxRadius = Math.min(this.canvasWidth, this.canvasHeight) / 2 - 20

    const startRadius = maxRadius * (1 - weightRatio) * 0.6
    const angleStep = 0.15
    const radiusGrowth = 0.8

    let angle = Math.random() * Math.PI * 2
    let radius = startRadius

    for (let i = 0; i < 4000; i++) {
      const x = centerX + Math.cos(angle) * radius
      const y = centerY + Math.sin(angle) * radius

      const candidate = { x, y, width: size.width, height: size.height }
      if (this.inBounds(candidate) && !this.collidesWithAny(candidate)) {
        return { x, y, radius }
      }

      angle += angleStep
      radius = startRadius + radiusGrowth * (angle / (2 * Math.PI))

      if (radius > maxRadius) {
        break
      }
    }

    for (let i = 0; i < 2000; i++) {
      const angle2 = Math.random() * Math.PI * 2
      const radius2 = startRadius + Math.random() * (maxRadius - startRadius)
      const x = centerX + Math.cos(angle2) * radius2
      const y = centerY + Math.sin(angle2) * radius2

      const candidate = { x, y, width: size.width, height: size.height }
      if (this.inBounds(candidate) && !this.collidesWithAny(candidate)) {
        return { x, y, radius: radius2 }
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

  private getColorForWord(weightRatio: number, rank: number): string {
    if (this.currentTheme && this.currentTheme.textColors.length > 0) {
      const colors = this.currentTheme.textColors
      const idx = Math.min(Math.floor(weightRatio * colors.length), colors.length - 1)
      return colors[idx]
    }
    const colors = ['#2563eb', '#7c3aed', '#db2777', '#ea580c', '#059669']
    return colors[rank % colors.length]
  }

  private getRotation(weight: number, maxWeight: number, rank: number): number {
    if (rank < 3) {
      return 0
    }
    if (weight < maxWeight * 0.5) {
      return Math.random() > 0.75 ? (Math.random() > 0.5 ? 90 : -90) : 0
    }
    return 0
  }

  compute(keywords: KeywordWeight[]): RenderData {
    const startTime = performance.now()

    if (keywords.length === 0) {
      this.placedWords = []
      const result: RenderData = { positions: [], width: this.canvasWidth, height: this.canvasHeight }
      this.emit('data:update', result)
      return result
    }

    const sorted = [...keywords].sort((a, b) => b.weight - a.weight)
    const maxWeight = sorted[0].weight
    const minWeight = sorted[sorted.length - 1].weight
    const limit = Math.min(sorted.length, 100)

    this.placedWords = []
    const positions: WordPosition[] = []

    for (let i = 0; i < limit; i++) {
      const kw = sorted[i]
      const weightRatio = maxWeight === minWeight ? (1 - i / Math.max(limit - 1, 1)) : (kw.weight - minWeight) / (maxWeight - minWeight)
      const fontSize = this.calculateFontSize(kw.weight, maxWeight, minWeight, i, limit)
      const rotate = this.getRotation(kw.weight, maxWeight, i)
      const textSize = this.measureText(kw.word, fontSize, rotate)
      const color = this.getColorForWord(weightRatio, i)

      const posResult = this.findArchimedeanSpiralPosition(textSize, weightRatio)

      if (posResult) {
        const placed: PlacedWord = {
          word: kw.word,
          weight: kw.weight,
          x: posResult.x,
          y: posResult.y,
          width: textSize.width,
          height: textSize.height,
          fontSize,
          color,
          rotate,
          radius: posResult.radius
        }
        this.placedWords.push(placed)
        positions.push({
          word: kw.word,
          weight: kw.weight,
          x: posResult.x,
          y: posResult.y,
          fontSize,
          color,
          rotate
        })
      }
    }

    this.placedWords.sort((a, b) => a.radius - b.radius)

    const sortedPositions = [...positions].sort((a, b) => {
      const ra = Math.sqrt(Math.pow(a.x - this.canvasWidth / 2, 2) + Math.pow(a.y - this.canvasHeight / 2, 2))
      const rb = Math.sqrt(Math.pow(b.x - this.canvasWidth / 2, 2) + Math.pow(b.y - this.canvasHeight / 2, 2))
      return ra - rb
    })

    const result: RenderData = {
      positions: sortedPositions,
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
      positions: this.placedWords.map((p) => ({
        word: p.word,
        weight: p.weight,
        x: p.x,
        y: p.y,
        fontSize: p.fontSize,
        color: p.color,
        rotate: p.rotate
      })),
      width: this.canvasWidth,
      height: this.canvasHeight
    }
  }
}

export const wordCloudEngine = new WordCloudEngine()
export type { WordCloudEngine }
