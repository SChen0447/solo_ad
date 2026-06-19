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
  targetColor: string
  currentColor: string
  alpha: number
  scale: number
  pulseScale: number
  targetRotate: number
  currentRotate: number
  isNew: boolean
  fadeInStartTime: number
  pulseStartTime: number
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      }
    : { r: 0, g: 0, b: 0 }
}

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map((x) => Math.round(x).toString(16).padStart(2, '0')).join('')
}

function lerpColor(color1: string, color2: string, t: number): string {
  const c1 = hexToRgb(color1)
  const c2 = hexToRgb(color2)
  return rgbToHex(c1.r + (c2.r - c1.r) * t, c1.g + (c2.g - c1.g) * t, c1.b + (c2.b - c1.b) * t)
}

const FADE_DURATION = 600
const PULSE_DURATION = 200
const THEME_TRANSITION_DURATION = 400
const CLEAR_DURATION = 500

class WordCloudRenderer {
  private canvas: HTMLCanvasElement | null = null
  private ctx: CanvasRenderingContext2D | null = null
  private animatedWords: Map<string, AnimatedWord> = new Map()
  private particles: Particle[] = []
  private animationFrameId: number | null = null
  private currentTheme: Theme | null = null
  private targetTheme: Theme | null = null
  private themeTransitionStart: number = 0
  private isThemeTransitioning: boolean = false
  private isClearing: boolean = false
  private clearStartTime: number = 0
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
      this.ctx.setTransform(1, 0, 0, 1, 0, 0)
      this.ctx.scale(this.dpr, this.dpr)
    }
  }

  setTheme(theme: Theme): void {
    if (!this.currentTheme) {
      this.currentTheme = theme
      this.targetTheme = theme
      return
    }
    if (this.currentTheme.id !== theme.id) {
      this.targetTheme = theme
      this.themeTransitionStart = performance.now()
      this.isThemeTransitioning = true
    }
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
      this.clearStartTime = performance.now()
      this.spawnClearParticles()

      const checkDone = () => {
        if (!this.isClearing) {
          resolve()
        } else {
          requestAnimationFrame(checkDone)
        }
      }
      requestAnimationFrame(checkDone)
    })
  }

  private spawnClearParticles(): void {
    if (!this.canvas) return
    const rect = this.canvas.getBoundingClientRect()
    const colors = this.currentTheme?.textColors || ['#3b82f6', '#8b5cf6', '#ec4899']

    for (let i = 0; i < 120; i++) {
      const angle = Math.random() * Math.PI * 2
      const speed = 2 + Math.random() * 5
      this.particles.push({
        x: rect.width / 2 + (Math.random() - 0.5) * rect.width * 0.7,
        y: rect.height / 2 + (Math.random() - 0.5) * rect.height * 0.7,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2,
        alpha: 1,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: 2 + Math.random() * 5,
        life: 1
      })
    }
  }

  triggerRocketAnimation(fromX: number, fromY: number, toX: number, toY: number, color: string): void {
    const startTime = performance.now()
    const duration = 500
    let lastX = fromX
    let lastY = fromY

    const animate = () => {
      const elapsed = performance.now() - startTime
      const t = Math.min(elapsed / duration, 1)
      const easeT = 1 - Math.pow(1 - t, 3)

      const x = fromX + (toX - fromX) * easeT
      const y = fromY + (toY - fromY) * easeT

      const dx = x - lastX
      const dy = y - lastY
      const dist = Math.sqrt(dx * dx + dy * dy)
      const particleCount = Math.max(2, Math.floor(dist / 4))

      for (let i = 0; i < particleCount; i++) {
        const pt = i / particleCount
        const px = lastX + dx * pt
        const py = lastY + dy * pt
        this.particles.push({
          x: px,
          y: py,
          vx: (Math.random() - 0.5) * 1.5,
          vy: (Math.random() - 0.5) * 1.5 - 0.5,
          alpha: 0.9,
          color,
          size: 2 + Math.random() * 3,
          life: 1
        })
      }

      lastX = x
      lastY = y

      if (t < 1) {
        requestAnimationFrame(animate)
      } else {
        for (let i = 0; i < 15; i++) {
          const angle = Math.random() * Math.PI * 2
          const speed = 1 + Math.random() * 3
          this.particles.push({
            x: toX,
            y: toY,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            alpha: 1,
            color,
            size: 3 + Math.random() * 3,
            life: 1
          })
        }
      }
    }
    requestAnimationFrame(animate)
  }

  update(data: RenderData, previousWeights?: Map<string, number>): void {
    const now = performance.now()
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
        existing.targetColor = pos.color
        existing.targetRotate = pos.rotate
        existing.weight = pos.weight
      } else {
        this.animatedWords.set(pos.word, {
          ...pos,
          targetX: pos.x,
          targetY: pos.y,
          targetFontSize: pos.fontSize,
          currentX: pos.x,
          currentY: pos.y,
          currentFontSize: pos.fontSize * 0.3,
          targetColor: pos.color,
          currentColor: pos.color,
          alpha: 0,
          scale: 0.3,
          pulseScale: 1,
          targetRotate: pos.rotate,
          currentRotate: pos.rotate,
          isNew: true,
          fadeInStartTime: now,
          pulseStartTime: 0
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
        w.pulseScale = 1.4
        w.pulseStartTime = now
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

  private getInterpolatedTheme(now: number): Theme | null {
    if (!this.currentTheme) return null
    if (!this.isThemeTransitioning || !this.targetTheme) return this.currentTheme

    const t = Math.min((now - this.themeTransitionStart) / THEME_TRANSITION_DURATION, 1)
    const easeT = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2

    if (t >= 1) {
      this.currentTheme = this.targetTheme
      this.isThemeTransitioning = false
      return this.currentTheme
    }

    const interpolatedTextColors = this.currentTheme.textColors.map((c, i) => {
      const target = this.targetTheme?.textColors[i] || c
      return lerpColor(c, target, easeT)
    })

    return {
      id: this.targetTheme.id,
      name: this.targetTheme.name,
      primary: lerpColor(this.currentTheme.primary, this.targetTheme.primary, easeT),
      background: lerpColor(this.currentTheme.background, this.targetTheme.background, easeT),
      canvasBackground: lerpColor(
        this.currentTheme.canvasBackground,
        this.targetTheme.canvasBackground,
        easeT
      ),
      textColors: interpolatedTextColors,
      accent: lerpColor(this.currentTheme.accent, this.targetTheme.accent, easeT)
    }
  }

  private renderFrame(): void {
    if (!this.ctx || !this.canvas) return
    const rect = this.canvas.getBoundingClientRect()
    const ctx = this.ctx
    const now = performance.now()

    const theme = this.getInterpolatedTheme(now)

    ctx.clearRect(0, 0, rect.width, rect.height)

    if (theme) {
      ctx.fillStyle = theme.canvasBackground
      ctx.fillRect(0, 0, rect.width, rect.height)
    } else {
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, rect.width, rect.height)
    }

    if (this.isClearing) {
      const elapsed = now - this.clearStartTime
      const progress = Math.min(elapsed / CLEAR_DURATION, 1)
      if (progress >= 1) {
        this.isClearing = false
        this.animatedWords.clear()
      } else {
        this.renderClearEffect(ctx, progress)
      }
    } else {
      this.renderWords(ctx, now)
    }

    this.renderParticles(ctx)
  }

  private renderWords(ctx: CanvasRenderingContext2D, now: number): void {
    const moveSpeed = 0.15
    const scaleSpeed = 0.12
    const colorSpeed = 0.15
    const rotateSpeed = 0.15

    for (const [, word] of this.animatedWords) {
      if (word.isNew) {
        const fadeElapsed = now - word.fadeInStartTime
        const fadeProgress = Math.min(fadeElapsed / FADE_DURATION, 1)
        const easeFade = fadeProgress < 0.5
          ? 2 * fadeProgress * fadeProgress
          : 1 - Math.pow(-2 * fadeProgress + 2, 2) / 2

        word.alpha = easeFade
        word.scale = 0.3 + 0.7 * easeFade

        if (fadeProgress >= 1) {
          word.isNew = false
          word.alpha = 1
          word.scale = 1
        }
      } else {
        if (word.scale < 1) {
          word.scale = Math.min(1, word.scale + scaleSpeed)
        }
        if (word.alpha < 1) {
          word.alpha = Math.min(1, word.alpha + 0.05)
        }
      }

      if (word.pulseStartTime > 0) {
        const pulseElapsed = now - word.pulseStartTime
        const pulseProgress = Math.min(pulseElapsed / PULSE_DURATION, 1)
        word.pulseScale = 1 + 0.4 * (1 - pulseProgress) * (1 - pulseProgress)
        if (pulseProgress >= 1) {
          word.pulseStartTime = 0
          word.pulseScale = 1
        }
      }

      word.currentX += (word.targetX - word.currentX) * moveSpeed
      word.currentY += (word.targetY - word.currentY) * moveSpeed
      word.currentFontSize += (word.targetFontSize - word.currentFontSize) * moveSpeed
      word.currentRotate += (word.targetRotate - word.currentRotate) * rotateSpeed
      word.currentColor = lerpColor(word.currentColor, word.targetColor, colorSpeed)

      ctx.save()
      ctx.globalAlpha = word.alpha
      ctx.translate(word.currentX, word.currentY)
      ctx.rotate((word.currentRotate * Math.PI) / 180)
      ctx.scale(word.scale * word.pulseScale, word.scale * word.pulseScale)

      ctx.font = `bold ${word.currentFontSize}px sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillStyle = word.currentColor
      ctx.fillText(word.word, 0, 0)

      ctx.restore()
    }
  }

  private renderClearEffect(ctx: CanvasRenderingContext2D, progress: number): void {
    for (const [, word] of this.animatedWords) {
      ctx.save()
      ctx.globalAlpha = 1 - progress
      const easeProgress = progress * progress
      const dx = (Math.sin(word.currentX * 0.01 + progress * 10) * 80) * easeProgress
      const dy = -easeProgress * 120 + (Math.random() - 0.5) * 20 * easeProgress
      ctx.translate(word.currentX + dx, word.currentY + dy)
      ctx.rotate(
        (word.currentRotate * Math.PI) / 180 + (Math.random() - 0.5) * progress * 0.8
      )
      ctx.scale(1 - progress * 0.6, 1 - progress * 0.6)

      ctx.font = `bold ${word.currentFontSize}px sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillStyle = word.currentColor
      ctx.fillText(word.word, 0, 0)

      ctx.restore()
    }
  }

  private renderParticles(ctx: CanvasRenderingContext2D): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i]
      p.x += p.vx
      p.y += p.vy
      p.vy += 0.08
      p.alpha *= 0.94
      p.life *= 0.94

      if (p.life < 0.02) {
        this.particles.splice(i, 1)
        continue
      }

      ctx.save()
      ctx.globalAlpha = p.alpha
      ctx.fillStyle = p.color
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
    }
  }
}

export const wordCloudRenderer = new WordCloudRenderer()
export type { WordCloudRenderer }
