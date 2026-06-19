import type { RenderData, WordPosition, Theme } from '../../types'

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  alpha: number
  color: string
  size: number
  life: number
}

interface AnimatedWord extends WordPosition {
  targetX: number
  targetY: number
  targetFontSize: number
  currentX: number
  currentY: number
  currentFontSize: number
  alpha: number
  scale: number
  pulseScale: number
  isNew: boolean
}

class WordCloudRenderer {
  private canvas: HTMLCanvasElement | null = null
  private ctx: CanvasRenderingContext2D | null = null
  private animatedWords: Map<string, AnimatedWord> = new Map()
  private particles: Particle[] = []
  private animationFrameId: number | null = null
  private currentTheme: Theme | null = null
  private isClearing: boolean = false
  private clearProgress: number = 0
  private dpr: number = 1

  attach(canvas: HTMLCanvasElement): void {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')
    this.resize()
    this.startAnimationLoop()
  }

  detach(): void {
    this.stopAnimationLoop()
    this.canvas = null
    this.ctx = null
  }

  resize(): void {
    if (!this.canvas) return
    this.dpr = window.devicePixelRatio || 1
    const rect = this.canvas.getBoundingClientRect()
    this.canvas.width = rect.width * this.dpr
    this.canvas.height = rect.height * this.dpr
    if (this.ctx) {
      this.ctx.scale(this.dpr, this.dpr)
    }
  }

  setTheme(theme: Theme): void {
    this.currentTheme = theme
  }

  getCanvas(): HTMLCanvasElement | null {
    return this.canvas
  }

  exportPNG(): string | null {
    if (!this.canvas) return null
    return this.canvas.toDataURL('image/png')
  }

  triggerClearAnimation(): Promise<void> {
    return new Promise((resolve) => {
      this.isClearing = true
      this.clearProgress = 0
      this.spawnClearParticles()

      const startTime = performance.now()
      const duration = 500

      const animate = () => {
        const elapsed = performance.now() - startTime
        this.clearProgress = Math.min(elapsed / duration, 1)

        if (this.clearProgress >= 1) {
          this.isClearing = false
          this.animatedWords.clear()
          this.particles = []
          resolve()
        } else {
          requestAnimationFrame(animate)
        }
      }
      requestAnimationFrame(animate)
    })
  }

  private spawnClearParticles(): void {
    if (!this.canvas) return
    const rect = this.canvas.getBoundingClientRect()
    const colors = this.currentTheme?.textColors || ['#3b82f6', '#8b5cf6', '#ec4899']

    for (let i = 0; i < 80; i++) {
      const angle = Math.random() * Math.PI * 2
      const speed = 1 + Math.random() * 3
      this.particles.push({
        x: rect.width / 2 + (Math.random() - 0.5) * rect.width * 0.6,
        y: rect.height / 2 + (Math.random() - 0.5) * rect.height * 0.6,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1,
        alpha: 1,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: 2 + Math.random() * 4,
        life: 1
      })
    }
  }

  triggerRocketAnimation(fromX: number, fromY: number, toX: number, toY: number, color: string): void {
    const startTime = performance.now()
    const duration = 500
    const particles: Particle[] = []

    const animate = () => {
      const elapsed = performance.now() - startTime
      const t = Math.min(elapsed / duration, 1)
      const easeT = 1 - Math.pow(1 - t, 3)

      const x = fromX + (toX - fromX) * easeT
      const y = fromY + (toY - fromY) * easeT

      for (let i = 0; i < 3; i++) {
        particles.push({
          x,
          y,
          vx: (Math.random() - 0.5) * 2,
          vy: (Math.random() - 0.5) * 2,
          alpha: 1,
          color,
          size: 2 + Math.random() * 3,
          life: 1
        })
      }

      particles.forEach((p) => {
        p.x += p.vx
        p.y += p.vy
        p.alpha *= 0.92
        p.life *= 0.92
      })

      for (let i = particles.length - 1; i >= 0; i--) {
        if (particles[i].life < 0.05) {
          particles.splice(i, 1)
        }
      }

      this.particles.push(...particles.splice(0))

      if (t < 1 || particles.length > 0) {
        requestAnimationFrame(animate)
      }
    }
    requestAnimationFrame(animate)
  }

  update(data: RenderData, previousWeights?: Map<string, number>): void {
    const newWords = new Set<string>()
    const pulseWords = new Set<string>()

    data.positions.forEach((pos) => {
      const existing = this.animatedWords.get(pos.word)
      if (existing) {
        if (previousWeights && previousWeights.has(pos.word)) {
          const prevWeight = previousWeights.get(pos.word)!
          if (pos.weight > prevWeight) {
            pulseWords.add(pos.word)
          }
        }
        existing.targetX = pos.x
        existing.targetY = pos.y
        existing.targetFontSize = pos.fontSize
        existing.color = pos.color
        existing.weight = pos.weight
        existing.rotate = pos.rotate
      } else {
        newWords.add(pos.word)
        this.animatedWords.set(pos.word, {
          ...pos,
          targetX: pos.x,
          targetY: pos.y,
          targetFontSize: pos.fontSize,
          currentX: pos.x,
          currentY: pos.y,
          currentFontSize: pos.fontSize * 0.5,
          alpha: 0,
          scale: 0.5,
          pulseScale: 1,
          isNew: true
        })
      }
    })

    const currentWords = new Set(data.positions.map((p) => p.word))
    for (const word of this.animatedWords.keys()) {
      if (!currentWords.has(word)) {
        this.animatedWords.delete(word)
      }
    }

    pulseWords.forEach((word) => {
      const w = this.animatedWords.get(word)
      if (w) {
        w.pulseScale = 1.3
      }
    })
  }

  private startAnimationLoop(): void {
    this.stopAnimationLoop()
    const loop = () => {
      this.renderFrame()
      this.animationFrameId = requestAnimationFrame(loop)
    }
    this.animationFrameId = requestAnimationFrame(loop)
  }

  private stopAnimationLoop(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId)
      this.animationFrameId = null
    }
  }

  private renderFrame(): void {
    if (!this.ctx || !this.canvas) return
    const rect = this.canvas.getBoundingClientRect()
    const ctx = this.ctx

    ctx.clearRect(0, 0, rect.width, rect.height)

    if (this.currentTheme) {
      ctx.fillStyle = this.currentTheme.canvasBackground
      ctx.fillRect(0, 0, rect.width, rect.height)
    } else {
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, rect.width, rect.height)
    }

    if (this.isClearing) {
      this.renderClearEffect(ctx, rect)
    } else {
      this.renderWords(ctx)
    }

    this.renderParticles(ctx)
  }

  private renderWords(ctx: CanvasRenderingContext2D): void {
    for (const [, word] of this.animatedWords) {
      const fadeSpeed = 1 / (60 * 0.6)
      const moveSpeed = 0.12
      const scaleSpeed = 0.1
      const pulseSpeed = 0.15

      if (word.alpha < 1) {
        word.alpha = Math.min(1, word.alpha + fadeSpeed)
      }
      if (word.scale < 1) {
        word.scale = Math.min(1, word.scale + scaleSpeed)
      }
      if (word.pulseScale > 1) {
        word.pulseScale = Math.max(1, word.pulseScale - pulseSpeed)
      }

      word.currentX += (word.targetX - word.currentX) * moveSpeed
      word.currentY += (word.targetY - word.currentY) * moveSpeed
      word.currentFontSize += (word.targetFontSize - word.currentFontSize) * moveSpeed

      ctx.save()
      ctx.globalAlpha = word.alpha
      ctx.translate(word.currentX, word.currentY)
      ctx.rotate((word.rotate * Math.PI) / 180)
      ctx.scale(word.scale * word.pulseScale, word.scale * word.pulseScale)

      ctx.font = `bold ${word.currentFontSize}px sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillStyle = word.color
      ctx.fillText(word.word, 0, 0)

      ctx.restore()
    }
  }

  private renderClearEffect(ctx: CanvasRenderingContext2D, rect: { width: number; height: number }): void {
    for (const [, word] of this.animatedWords) {
      ctx.save()
      ctx.globalAlpha = 1 - this.clearProgress
      const dx = (Math.random() - 0.5) * this.clearProgress * 100
      const dy = -this.clearProgress * 80 + (Math.random() - 0.5) * 30
      ctx.translate(word.currentX + dx, word.currentY + dy)
      ctx.rotate((word.rotate * Math.PI) / 180 + (Math.random() - 0.5) * this.clearProgress * 0.5)
      ctx.scale(1 - this.clearProgress * 0.5, 1 - this.clearProgress * 0.5)

      ctx.font = `bold ${word.currentFontSize}px sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillStyle = word.color
      ctx.fillText(word.word, 0, 0)

      ctx.restore()
    }
    void rect
  }

  private renderParticles(ctx: CanvasRenderingContext2D): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i]
      p.x += p.vx
      p.y += p.vy
      p.vy += 0.05
      p.alpha *= 0.96
      p.life *= 0.96

      if (p.life < 0.02) {
        this.particles.splice(i, 1)
        continue
      }

      ctx.save()
      ctx.globalAlpha = p.alpha
      ctx.fillStyle = p.color
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
    }
  }
}

export const wordCloudRenderer = new WordCloudRenderer()
export type { WordCloudRenderer }
