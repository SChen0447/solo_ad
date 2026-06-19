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

  private rectsCollide(a: { x: number; y: number; width: number; height: number }, b: { x: number; y: number; width: number; height: number }): boolean {
    return !(
      a.x + a.width / 2 < b.x - b.width / 2 ||
      a.x - a.width / 2 > b.x + b.width / 2 ||
      a.y + a.height / 2 < b.y - b.height / 2 ||
      a.y - a.height / 2 > b.y + b.height / 2
    )
  }

  private collidesWithAny(candidate: { x: number; y: number; width: number; height: number }): boolean {
    for (const placed of this.placedWords) {
      if (this.rectsCollide(candidate, placed)) {
        return true
      }
    }
    return false
  }

  private inBounds(pos: { x: number; y: number; width: number; height: number }): boolean {
    return (
      pos.x - pos.width / 2 >= -10 &&
      pos.x + pos.width / 2 <= this.canvasWidth + 10 &&
      pos.y - pos.height / 2 >= -10 &&
      pos.y + pos.height / 2 <= this.canvasHeight + 10
    )
  }

  private findSpiralPosition(
    size: { width: number; height: number },
    startX: number,
    startY: number
  ): { x: number; y: number } | null {
    const centerX = this.canvasWidth / 2
    const centerY = this.canvasHeight / 2
    const maxRadius = Math.min(this.canvasWidth, this.canvasHeight) / 2
    let angle = 0
    let radius = 0
    const angleStep = 0.25
    const radiusStep = 0.5

    for (let i = 0; i < 3000; i++) {
      const x = centerX + Math.cos(angle) * radius
      const y = centerY + Math.sin(angle) * radius

      const candidate = { x, y, width: size.width, height: size.height }
      if (this.inBounds(candidate) && !this.collidesWithAny(candidate)) {
        return { x, y }
      }

      angle += angleStep
      radius += radiusStep * (angleStep / (2 * Math.PI))

      if (radius > maxRadius) {
        break
      }
    }

    const fallback = { x: startX, y: startY, width: size.width, height: size.height }
    if (this.inBounds(fallback) && !this.collidesWithAny(fallback)) {
      return { x: startX, y: startY }
    }
    return null
  }

  private calculateFontSize(weight: number, maxWeight: number, minWeight: number): number {
    const minFontSize = 14
    const maxFontSize = 72
    if (maxWeight === minWeight) {
      return (minFontSize + maxFontSize) / 2
    }
    const ratio = (weight - minWeight) / (maxWeight - minWeight)
    return minFontSize + ratio * ratio * (maxFontSize - minFontSize)
  }

  private getColorForWord(index: number): string {
    if (this.currentTheme && this.currentTheme.textColors.length > 0) {
      return this.currentTheme.textColors[index % this.currentTheme.textColors.length]
    }
    const colors = ['#2563eb', '#7c3aed', '#db2777', '#ea580c', '#059669']
    return colors[index % colors.length]
  }

  private getRotation(weight: number, maxWeight: number): number {
    if (weight < maxWeight * 0.3) {
      return Math.random() > 0.7 ? 90 : 0
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

    this.placedWords = []
    const positions: WordPosition[] = []
    const limit = Math.min(sorted.length, 100)

    for (let i = 0; i < limit; i++) {
      const kw = sorted[i]
      const fontSize = this.calculateFontSize(kw.weight, maxWeight, minWeight)
      const rotate = this.getRotation(kw.weight, maxWeight)
      const textSize = this.measureText(kw.word, fontSize, rotate)
      const color = this.getColorForWord(i)

      const pos = this.findSpiralPosition(textSize, this.canvasWidth / 2, this.canvasHeight / 2)

      if (pos) {
        const placed: PlacedWord = {
          word: kw.word,
          weight: kw.weight,
          x: pos.x,
          y: pos.y,
          width: textSize.width,
          height: textSize.height,
          fontSize,
          color,
          rotate
        }
        this.placedWords.push(placed)
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
