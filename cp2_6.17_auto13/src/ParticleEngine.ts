import type { EmotionResult } from './EmotionMapper'
import type { Stroke, StrokePoint } from './Analyzer'

type ParticleShape = 'circle' | 'line'

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
  baseAlpha: number
  life: number
  maxLife: number
  phase: number
  amplitude: number
  frequency: number
  strokeId: number
  shape: ParticleShape
  rotation: number
  angularVelocity: number
  lineLength: number
  lineAngle: number
  flickerStart: number
  flickerCount: number
  flickerPhase: number
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

  trigger(strokes: Stroke[], emotion: EmotionResult): void {
    const allPoints: { point: StrokePoint; strokeId: number }[] = []
    for (let s = 0; s < strokes.length; s++) {
      const stroke = strokes[s]
      for (let p = 0; p < stroke.points.length; p++) {
        allPoints.push({ point: stroke.points[p], strokeId: s })
      }
    }
    if (allPoints.length === 0) return

    const totalPoints = allPoints.length
    const count = 30 + Math.floor(Math.random() * 51)
    const duration = 2000 + Math.random() * 1000
    const flickerStartMs = duration - 500

    for (let i = 0; i < count; i++) {
      const sampled = allPoints[Math.floor(Math.random() * totalPoints)]
      const point = sampled.point
      const angle = Math.random() * Math.PI * 2
      const speed = 20 + Math.random() * 60
      const size = 3 + Math.random() * 5
      const shape: ParticleShape = Math.random() < 0.55 ? 'circle' : 'line'

      this.particles.push({
        x: point.x,
        y: point.y,
        originX: point.x,
        originY: point.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size,
        color: emotion.color,
        alpha: 1,
        baseAlpha: 1,
        life: 0,
        maxLife: duration,
        phase: Math.random() * Math.PI * 2,
        amplitude: 3 + Math.random() * 8,
        frequency: 1 + Math.random() * 2,
        strokeId: sampled.strokeId,
        shape,
        rotation: Math.random() * Math.PI * 2,
        angularVelocity: (0.01 + Math.random() * 0.04) * (Math.random() < 0.5 ? 1 : -1),
        lineLength: 4 + Math.random() * 8,
        lineAngle: Math.random() * Math.PI * 2,
        flickerStart: flickerStartMs,
        flickerCount: 2 + Math.floor(Math.random() * 2),
        flickerPhase: Math.random() * Math.PI
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

      p.rotation += p.angularVelocity
      p.lineAngle += p.angularVelocity * 0.5

      const lifeRatio = p.life / p.maxLife
      let alpha = 1 - easeOutCubic(lifeRatio)

      const remaining = p.maxLife - p.life
      if (remaining < 500 && remaining > 0) {
        const flickerProgress = (500 - remaining) / 500
        const flickerCycles = p.flickerCount * 2
        const wave = Math.sin(flickerProgress * flickerCycles * Math.PI + p.flickerPhase)
        const flickerIntensity = flickerProgress
        alpha = alpha * (0.35 + 0.65 * (0.5 + 0.5 * wave) * (1 - flickerIntensity) + 0.5 * flickerIntensity)
      }

      p.alpha = Math.max(0, Math.min(1, alpha))
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
          const sameStroke = p1.strokeId === p2.strokeId
          const baseAlphaMult = sameStroke ? 0.6 : 0.3
          const alpha = (1 - dist / 80) * baseAlphaMult * Math.min(p1.alpha, p2.alpha)
          if (alpha <= 0.005) continue

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
      if (p.alpha <= 0.01) continue
      const ctx = this.ctx
      ctx.save()
      ctx.translate(p.x, p.y)
      ctx.rotate(p.rotation)
      ctx.globalAlpha = p.alpha

      if (p.shape === 'circle') {
        ctx.beginPath()
        ctx.arc(0, 0, p.size, 0, Math.PI * 2)
        ctx.fillStyle = hexToRgba(p.color, 1)
        ctx.fill()

        if (p.size > 4) {
          ctx.beginPath()
          ctx.arc(-p.size * 0.25, -p.size * 0.25, p.size * 0.3, 0, Math.PI * 2)
          ctx.fillStyle = 'rgba(255,255,255,0.35)'
          ctx.fill()
        }
      } else {
        const half = p.lineLength / 2
        const thickness = Math.max(1, p.size * 0.5)
        ctx.rotate(p.lineAngle)
        ctx.strokeStyle = hexToRgba(p.color, 1)
        ctx.lineWidth = thickness
        ctx.lineCap = 'round'
        ctx.beginPath()
        ctx.moveTo(-half, 0)
        ctx.lineTo(half, 0)
        ctx.stroke()

        ctx.strokeStyle = 'rgba(255,255,255,0.4)'
        ctx.lineWidth = thickness * 0.3
        ctx.beginPath()
        ctx.moveTo(-half * 0.8, -thickness * 0.15)
        ctx.lineTo(half * 0.8, -thickness * 0.15)
        ctx.stroke()
      }

      ctx.restore()
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
