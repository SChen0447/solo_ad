import type { EmotionResult } from './EmotionMapper'

interface Particle {
  x: number
  y: number
  originX: number
  originY: number
  vx: number
  vy: number
  size: number
  color: string
  alpha: number
  life: number
  maxLife: number
  phase: number
  amplitude: number
  frequency: number
}

export class ParticleEngine {
  private canvas: HTMLCanvasElement | null = null
  private ctx: CanvasRenderingContext2D | null = null
  private particles: Particle[] = []
  private animationId: number | null = null
  private lastTime: number = 0
  private frameCount: number = 0
  private fpsUpdateTime: number = 0
  private currentFps: number = 60

  constructor() {}

  attach(canvas: HTMLCanvasElement): void {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')
    this.resize()
  }

  resize(): void {
    if (!this.canvas) return
    const rect = this.canvas.getBoundingClientRect()
    const dpr = window.devicePixelRatio || 1
    this.canvas.width = rect.width * dpr
    this.canvas.height = rect.height * dpr
    if (this.ctx) {
      this.ctx.scale(dpr, dpr)
    }
  }

  trigger(originX: number, originY: number, emotion: EmotionResult): void {
    const count = 30 + Math.floor(Math.random() * 51)
    const duration = 2000 + Math.random() * 1000

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2
      const speed = 20 + Math.random() * 60
      const size = 3 + Math.random() * 5

      this.particles.push({
        x: originX,
        y: originY,
        originX,
        originY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size,
        color: emotion.color,
        alpha: 1,
        life: 0,
        maxLife: duration,
        phase: Math.random() * Math.PI * 2,
        amplitude: 3 + Math.random() * 8,
        frequency: 1 + Math.random() * 2
      })
    }

    if (!this.animationId) {
      this.lastTime = performance.now()
      this.loop()
    }
  }

  private loop = (): void => {
    const now = performance.now()
    const deltaTime = now - this.lastTime
    this.lastTime = now

    this.frameCount++
    if (now - this.fpsUpdateTime >= 500) {
      this.currentFps = Math.round((this.frameCount * 1000) / (now - this.fpsUpdateTime))
      this.frameCount = 0
      this.fpsUpdateTime = now
    }

    this.update(deltaTime)
    this.render()

    if (this.particles.length > 0) {
      this.animationId = requestAnimationFrame(this.loop)
    } else {
      this.animationId = null
      this.clear()
    }
  }

  private update(deltaTime: number): void {
    const dt = deltaTime / 1000

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i]
      p.life += deltaTime

      if (p.life >= p.maxLife) {
        this.particles.splice(i, 1)
        continue
      }

      const t = p.life
      const sineOffset = Math.sin(t * 0.003 * p.frequency + p.phase) * p.amplitude
      const perpX = -p.vy
      const perpY = p.vx
      const perpLen = Math.sqrt(perpX * perpX + perpY * perpY) || 1

      p.x += (p.vx + (perpX / perpLen) * sineOffset) * dt
      p.y += (p.vy + (perpY / perpLen) * sineOffset) * dt

      p.vx *= 0.98
      p.vy *= 0.98

      const lifeRatio = p.life / p.maxLife
      p.alpha = 1 - easeOutCubic(lifeRatio)
    }
  }

  private render(): void {
    if (!this.ctx || !this.canvas) return

    const rect = this.canvas.getBoundingClientRect()
    this.ctx.clearRect(0, 0, rect.width, rect.height)

    for (let i = 0; i < this.particles.length; i++) {
      const p1 = this.particles[i]
      for (let j = i + 1; j < this.particles.length; j++) {
        const p2 = this.particles[j]
        const dx = p1.x - p2.x
        const dy = p1.y - p2.y
        const dist = Math.sqrt(dx * dx + dy * dy)

        if (dist < 80) {
          const alpha = (1 - dist / 80) * 0.6 * Math.min(p1.alpha, p2.alpha)
          this.ctx.beginPath()
          this.ctx.moveTo(p1.x, p1.y)
          this.ctx.lineTo(p2.x, p2.y)
          this.ctx.strokeStyle = hexToRgba(p1.color, alpha)
          this.ctx.lineWidth = 1
          this.ctx.stroke()
        }
      }
    }

    for (const p of this.particles) {
      this.ctx.beginPath()
      this.ctx.arc(p.x, p.y, p.size * p.alpha, 0, Math.PI * 2)
      this.ctx.fillStyle = hexToRgba(p.color, p.alpha)
      this.ctx.fill()
    }
  }

  clear(): void {
    if (!this.ctx || !this.canvas) return
    const rect = this.canvas.getBoundingClientRect()
    this.ctx.clearRect(0, 0, rect.width, rect.height)
  }

  stop(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId)
      this.animationId = null
    }
    this.particles = []
    this.clear()
  }

  getFps(): number {
    return this.currentFps
  }

  destroy(): void {
    this.stop()
    this.canvas = null
    this.ctx = null
  }
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3)
}

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}
