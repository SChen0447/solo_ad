import {
  Ship,
  TimeBubble,
  VoidSuture,
  Rift,
  VoidDevourer,
  Particle,
  EnergyRipple,
  TimeSand,
  PortalEffect,
  Star,
  BeamEffect,
  Vector2,
} from './entities'

export interface RenderState {
  ship: Ship | null
  bubbles: TimeBubble[]
  sutures: VoidSuture[]
  rifts: Rift[]
  devourers: VoidDevourer[]
  particles: Particle[]
  ripples: EnergyRipple[]
  timeSands: TimeSand[]
  portalEffects: PortalEffect[]
  stars: Star[]
  beamEffects: BeamEffect[]
  canvasWidth: number
  canvasHeight: number
  time: number
}

export class Renderer {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private stars: Star[] = []
  private maxParticles: number = 800

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Failed to get 2D context')
    this.ctx = ctx
    this.initStars()
  }

  private initStars(): void {
    this.stars = []
    const starCount = 150
    for (let i = 0; i < starCount; i++) {
      this.stars.push(new Star(this.canvas.width, this.canvas.height))
    }
  }

  resize(width: number, height: number): void {
    this.canvas.width = width
    this.canvas.height = height
    this.initStars()
  }

  updateStars(deltaTime: number): void {
    for (const star of this.stars) {
      star.update(deltaTime)
    }
  }

  render(state: RenderState): void {
    const { ctx } = this
    const { canvasWidth, canvasHeight } = state

    ctx.clearRect(0, 0, canvasWidth, canvasHeight)

    this.drawBackground(canvasWidth, canvasHeight)

    for (const star of this.stars) {
      star.draw(ctx)
    }

    this.drawSutureConnections(state.sutures)

    for (const suture of state.sutures) {
      suture.draw(ctx)
    }

    for (const ripple of state.ripples) {
      ripple.draw(ctx)
    }

    for (const rift of state.rifts) {
      rift.draw(ctx)
    }

    for (const timeSand of state.timeSands) {
      timeSand.draw(ctx)
    }

    for (const devourer of state.devourers) {
      devourer.draw(ctx)
    }

    for (const bubble of state.bubbles) {
      bubble.draw(ctx)
    }

    for (const beam of state.beamEffects) {
      beam.draw(ctx)
    }

    for (const portal of state.portalEffects) {
      portal.draw(ctx)
    }

    if (state.ship) {
      state.ship.draw(ctx)
    }

    const particlesToDraw = state.particles.slice(0, this.maxParticles)
    for (const particle of particlesToDraw) {
      particle.draw(ctx)
    }
  }

  private drawBackground(width: number, height: number): void {
    const { ctx } = this

    const gradient = ctx.createRadialGradient(
      width / 2,
      height / 2,
      0,
      width / 2,
      height / 2,
      Math.max(width, height) * 0.8
    )
    gradient.addColorStop(0, '#1e1b4b')
    gradient.addColorStop(0.3, '#312e81')
    gradient.addColorStop(0.6, '#1e1b4b')
    gradient.addColorStop(1, '#0c0a1d')

    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, width, height)

    const nebulaGradient1 = ctx.createRadialGradient(
      width * 0.2,
      height * 0.3,
      0,
      width * 0.2,
      height * 0.3,
      width * 0.5
    )
    nebulaGradient1.addColorStop(0, 'rgba(139, 92, 246, 0.08)')
    nebulaGradient1.addColorStop(1, 'rgba(139, 92, 246, 0)')
    ctx.fillStyle = nebulaGradient1
    ctx.fillRect(0, 0, width, height)

    const nebulaGradient2 = ctx.createRadialGradient(
      width * 0.8,
      height * 0.7,
      0,
      width * 0.8,
      height * 0.7,
      width * 0.6
    )
    nebulaGradient2.addColorStop(0, 'rgba(59, 130, 246, 0.06)')
    nebulaGradient2.addColorStop(1, 'rgba(59, 130, 246, 0)')
    ctx.fillStyle = nebulaGradient2
    ctx.fillRect(0, 0, width, height)
  }

  private drawSutureConnections(sutures: VoidSuture[]): void {
    const { ctx } = this

    if (sutures.length < 2) return

    for (let i = 0; i < sutures.length; i++) {
      for (let j = i + 1; j < sutures.length; j++) {
        const s1 = sutures[i]
        const s2 = sutures[j]
        const dx = s2.position.x - s1.position.x
        const dy = s2.position.y - s1.position.y
        const distance = Math.sqrt(dx * dx + dy * dy)

        if (distance < 300) {
          const alpha = (1 - distance / 300) * 0.3
          const bothActivated = s1.activated && s2.activated
          
          ctx.beginPath()
          ctx.moveTo(s1.position.x, s1.position.y)
          ctx.lineTo(s2.position.x, s2.position.y)
          ctx.strokeStyle = bothActivated
            ? `rgba(34, 211, 238, ${alpha + 0.2})`
            : `rgba(139, 92, 246, ${alpha})`
          ctx.lineWidth = bothActivated ? 2 : 1
          ctx.setLineDash([5, 10])
          ctx.stroke()
          ctx.setLineDash([])
        }
      }
    }
  }

  getContext(): CanvasRenderingContext2D {
    return this.ctx
  }
}
