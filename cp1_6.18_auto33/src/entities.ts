export interface Vector2 {
  x: number
  y: number
}

export interface Entity {
  id: string
  active: boolean
  update: (deltaTime: number, gameState: GameStateData) => void
  draw: (ctx: CanvasRenderingContext2D) => void
}

export interface GameStateData {
  mousePos: Vector2
  canvasWidth: number
  canvasHeight: number
  particles: Particle[]
  time: number
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 15)
}

export class Ship implements Entity {
  id: string
  active: boolean = true
  position: Vector2
  targetPosition: Vector2
  rotation: number = 0
  pulseRotation: number = 0
  size: number = 20
  trailPositions: Vector2[] = []
  maxTrailLength: number = 15

  constructor(x: number, y: number) {
    this.id = generateId()
    this.position = { x, y }
    this.targetPosition = { x, y }
  }

  update(deltaTime: number, gameState: GameStateData): void {
    this.targetPosition = { ...gameState.mousePos }
    
    const dx = this.targetPosition.x - this.position.x
    const dy = this.targetPosition.y - this.position.y
    const speed = 0.15
    this.position.x += dx * speed
    this.position.y += dy * speed
    
    this.rotation = Math.atan2(dy, dx) + Math.PI / 2
    this.pulseRotation += deltaTime * 0.5
    
    this.trailPositions.unshift({ ...this.position })
    if (this.trailPositions.length > this.maxTrailLength) {
      this.trailPositions.pop()
    }
  }

  draw(ctx: CanvasRenderingContext2D): void {
    const { x, y } = this.position
    
    for (let i = this.trailPositions.length - 1; i >= 0; i--) {
      const pos = this.trailPositions[i]
      const alpha = (1 - i / this.trailPositions.length) * 0.3
      const size = this.size * (1 - i / this.trailPositions.length) * 0.5
      ctx.beginPath()
      ctx.arc(pos.x, pos.y, size, 0, Math.PI * 2)
      ctx.fillStyle = `rgba(139, 92, 246, ${alpha})`
      ctx.fill()
    }
    
    this.drawDodecahedronPulse(ctx, x, y)
    
    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(this.rotation)
    
    ctx.beginPath()
    ctx.moveTo(0, -this.size)
    ctx.lineTo(-this.size * 0.7, this.size * 0.7)
    ctx.lineTo(0, this.size * 0.4)
    ctx.lineTo(this.size * 0.7, this.size * 0.7)
    ctx.closePath()
    
    const gradient = ctx.createLinearGradient(0, -this.size, 0, this.size)
    gradient.addColorStop(0, '#a5b4fc')
    gradient.addColorStop(0.5, '#818cf8')
    gradient.addColorStop(1, '#6366f1')
    ctx.fillStyle = gradient
    ctx.fill()
    
    ctx.strokeStyle = '#c7d2fe'
    ctx.lineWidth = 2
    ctx.stroke()
    
    ctx.beginPath()
    ctx.arc(0, 0, this.size * 0.3, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)'
    ctx.fill()
    
    ctx.restore()
  }

  private drawDodecahedronPulse(ctx: CanvasRenderingContext2D, cx: number, cy: number): void {
    const outerRadius = this.size * 2.2
    const innerRadius = this.size * 1.6
    
    ctx.save()
    ctx.translate(cx, cy)
    ctx.rotate(this.pulseRotation)
    
    const vertices: Vector2[] = []
    const faces = 12
    for (let i = 0; i < faces; i++) {
      const angle = (i / faces) * Math.PI * 2
      const r = i % 2 === 0 ? outerRadius : innerRadius
      vertices.push({
        x: Math.cos(angle) * r,
        y: Math.sin(angle) * r,
      })
    }
    
    ctx.beginPath()
    for (let i = 0; i < vertices.length; i++) {
      const v = vertices[i]
      if (i === 0) ctx.moveTo(v.x, v.y)
      else ctx.lineTo(v.x, v.y)
    }
    ctx.closePath()
    
    ctx.strokeStyle = 'rgba(139, 92, 246, 0.4)'
    ctx.lineWidth = 2
    ctx.stroke()
    ctx.fillStyle = 'rgba(139, 92, 246, 0.05)'
    ctx.fill()
    
    for (let i = 0; i < vertices.length; i++) {
      const v = vertices[i]
      ctx.beginPath()
      ctx.arc(v.x, v.y, 3, 0, Math.PI * 2)
      ctx.fillStyle = 'rgba(167, 139, 250, 0.6)'
      ctx.fill()
    }
    
    ctx.restore()
  }
}

export class TimeBubble implements Entity {
  id: string
  active: boolean = true
  position: Vector2
  velocity: Vector2
  radius: number
  initialRadius: number
  lifetime: number
  maxLifetime: number
  isDragging: boolean = false
  trail: Vector2[] = []
  maxTrailLength: number = 20

  constructor(x: number, y: number, maxLifetime: number = 3) {
    this.id = generateId()
    this.position = { x, y }
    this.velocity = { x: 0, y: 0 }
    this.initialRadius = 40
    this.radius = this.initialRadius
    this.maxLifetime = maxLifetime
    this.lifetime = maxLifetime
  }

  update(deltaTime: number, gameState: GameStateData): void {
    if (this.isDragging) {
      const dx = gameState.mousePos.x - this.position.x
      const dy = gameState.mousePos.y - this.position.y
      this.position.x += dx * 0.3
      this.position.y += dy * 0.3
      
      this.trail.unshift({ ...this.position })
      if (this.trail.length > this.maxTrailLength) {
        this.trail.pop()
      }
    } else {
      this.trail = []
    }
    
    this.lifetime -= deltaTime
    const lifeRatio = this.lifetime / this.maxLifetime
    this.radius = this.initialRadius * (0.3 + lifeRatio * 0.7)
    
    if (this.lifetime <= 0) {
      this.active = false
      this.createPopParticles(gameState.particles)
    }
  }

  private createPopParticles(particles: Particle[]): void {
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2
      const speed = 80 + Math.random() * 40
      particles.push(new Particle(
        this.position.x,
        this.position.y,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
        0.5,
        '#c4b5fd',
        3 + Math.random() * 3
      ))
    }
  }

  draw(ctx: CanvasRenderingContext2D): void {
    const { x, y } = this.position
    
    if (this.trail.length > 1) {
      for (let i = 1; i < this.trail.length; i++) {
        const t0 = this.trail[i - 1]
        const t1 = this.trail[i]
        const alpha = (1 - i / this.trail.length) * 0.6
        const width = this.radius * (1 - i / this.trail.length) * 0.5
        
        const gradient = ctx.createLinearGradient(t0.x, t0.y, t1.x, t1.y)
        gradient.addColorStop(0, `rgba(139, 92, 246, ${alpha})`)
        gradient.addColorStop(1, `rgba(6, 182, 212, ${alpha * 0.5})`)
        
        ctx.beginPath()
        ctx.moveTo(t0.x, t0.y)
        ctx.lineTo(t1.x, t1.y)
        ctx.strokeStyle = gradient
        ctx.lineWidth = width
        ctx.lineCap = 'round'
        ctx.stroke()
      }
    }
    
    const glowGradient = ctx.createRadialGradient(x, y, 0, x, y, this.radius * 1.5)
    glowGradient.addColorStop(0, 'rgba(255, 255, 255, 0.3)')
    glowGradient.addColorStop(0.3, 'rgba(196, 181, 253, 0.2)')
    glowGradient.addColorStop(1, 'rgba(139, 92, 246, 0)')
    ctx.beginPath()
    ctx.arc(x, y, this.radius * 1.5, 0, Math.PI * 2)
    ctx.fillStyle = glowGradient
    ctx.fill()
    
    const bubbleGradient = ctx.createRadialGradient(
      x - this.radius * 0.3, y - this.radius * 0.3, 0,
      x, y, this.radius
    )
    bubbleGradient.addColorStop(0, 'rgba(255, 255, 255, 0.6)')
    bubbleGradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.2)')
    bubbleGradient.addColorStop(1, 'rgba(255, 255, 255, 0.05)')
    
    ctx.beginPath()
    ctx.arc(x, y, this.radius, 0, Math.PI * 2)
    ctx.fillStyle = bubbleGradient
    ctx.fill()
    
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)'
    ctx.lineWidth = 2
    ctx.stroke()
    
    ctx.beginPath()
    ctx.arc(x - this.radius * 0.3, y - this.radius * 0.3, this.radius * 0.2, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)'
    ctx.fill()
  }
}

export class VoidSuture implements Entity {
  id: string
  active: boolean = true
  position: Vector2
  size: number = 30
  activated: boolean = false
  pulsePhase: number = 0
  rotationMid: number = 0
  rotationOuter: number = 0
  neighbors: string[] = []
  activationProgress: number = 0

  constructor(x: number, y: number) {
    this.id = generateId()
    this.position = { x, y }
    this.pulsePhase = Math.random() * Math.PI * 2
  }

  update(deltaTime: number): void {
    this.pulsePhase += deltaTime * 3
    this.rotationMid -= deltaTime * 1.5
    this.rotationOuter += deltaTime * 0.8
    
    if (this.activated) {
      this.activationProgress = Math.min(1, this.activationProgress + deltaTime * 2)
    }
  }

  draw(ctx: CanvasRenderingContext2D): void {
    const { x, y } = this.position
    const pulse = 1 + Math.sin(this.pulsePhase) * 0.15
    
    const outerSize = this.size * 2.2 * pulse
    const outerGradient = ctx.createRadialGradient(x, y, this.size * 1.5, x, y, outerSize)
    outerGradient.addColorStop(0, this.activated ? 'rgba(34, 211, 238, 0.3)' : 'rgba(139, 92, 246, 0.2)')
    outerGradient.addColorStop(1, 'rgba(139, 92, 246, 0)')
    ctx.beginPath()
    ctx.arc(x, y, outerSize, 0, Math.PI * 2)
    ctx.fillStyle = outerGradient
    ctx.fill()
    
    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(this.rotationOuter)
    
    ctx.beginPath()
    const outerPoints = 8
    for (let i = 0; i < outerPoints; i++) {
      const angle = (i / outerPoints) * Math.PI * 2
      const r = this.size * 1.6
      const px = Math.cos(angle) * r
      const py = Math.sin(angle) * r
      if (i === 0) ctx.moveTo(px, py)
      else ctx.lineTo(px, py)
    }
    ctx.closePath()
    ctx.strokeStyle = this.activated ? 'rgba(34, 211, 238, 0.6)' : 'rgba(167, 139, 250, 0.4)'
    ctx.lineWidth = 2
    ctx.stroke()
    
    ctx.restore()
    
    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(this.rotationMid)
    
    ctx.beginPath()
    const midPoints = 6
    for (let i = 0; i < midPoints; i++) {
      const angle = (i / midPoints) * Math.PI * 2
      const r = this.size * 1.1
      const px = Math.cos(angle) * r
      const py = Math.sin(angle) * r
      if (i === 0) ctx.moveTo(px, py)
      else ctx.lineTo(px, py)
    }
    ctx.closePath()
    ctx.strokeStyle = this.activated ? 'rgba(103, 232, 249, 0.8)' : 'rgba(196, 181, 253, 0.6)'
    ctx.lineWidth = 2
    ctx.stroke()
    
    ctx.restore()
    
    const innerSize = this.size * 0.5 * pulse
    const innerGradient = ctx.createRadialGradient(x, y, 0, x, y, innerSize)
    if (this.activated) {
      innerGradient.addColorStop(0, 'rgba(255, 255, 255, 0.9)')
      innerGradient.addColorStop(0.5, 'rgba(34, 211, 238, 0.7)')
      innerGradient.addColorStop(1, 'rgba(6, 182, 212, 0.3)')
    } else {
      innerGradient.addColorStop(0, 'rgba(255, 255, 255, 0.7)')
      innerGradient.addColorStop(0.5, 'rgba(167, 139, 250, 0.5)')
      innerGradient.addColorStop(1, 'rgba(139, 92, 246, 0.2)')
    }
    ctx.beginPath()
    ctx.arc(x, y, innerSize, 0, Math.PI * 2)
    ctx.fillStyle = innerGradient
    ctx.fill()
  }

  checkBubbleCoverage(bubble: TimeBubble): boolean {
    const dx = bubble.position.x - this.position.x
    const dy = bubble.position.y - this.position.y
    const distance = Math.sqrt(dx * dx + dy * dy)
    return distance + this.size * 0.3 < bubble.radius * 0.8
  }
}

export class Rift implements Entity {
  id: string
  active: boolean = true
  position: Vector2
  velocity: Vector2
  size: number
  points: Vector2[] = []
  rotation: number
  lifespan: number = 15

  constructor(canvasWidth: number, canvasHeight: number) {
    this.id = generateId()
    
    const side = Math.floor(Math.random() * 4)
    switch (side) {
      case 0:
        this.position = { x: Math.random() * canvasWidth, y: -50 }
        break
      case 1:
        this.position = { x: canvasWidth + 50, y: Math.random() * canvasHeight }
        break
      case 2:
        this.position = { x: Math.random() * canvasWidth, y: canvasHeight + 50 }
        break
      default:
        this.position = { x: -50, y: Math.random() * canvasHeight }
    }
    
    const centerX = canvasWidth / 2
    const centerY = canvasHeight / 2
    const angle = Math.atan2(centerY - this.position.y, centerX - this.position.x)
    const speed = 20 + Math.random() * 20
    this.velocity = {
      x: Math.cos(angle) * speed,
      y: Math.sin(angle) * speed,
    }
    
    this.size = 30 + Math.random() * 40
    this.rotation = Math.random() * Math.PI * 2
    
    this.generatePoints()
  }

  private generatePoints(): void {
    const numPoints = 8 + Math.floor(Math.random() * 5)
    for (let i = 0; i < numPoints; i++) {
      const angle = (i / numPoints) * Math.PI * 2
      const r = this.size * (0.5 + Math.random() * 0.5)
      this.points.push({
        x: Math.cos(angle) * r,
        y: Math.sin(angle) * r,
      })
    }
  }

  update(deltaTime: number, gameState: GameStateData): void {
    this.position.x += this.velocity.x * deltaTime
    this.position.y += this.velocity.y * deltaTime
    this.rotation += deltaTime * 0.3
    this.lifespan -= deltaTime
    
    const margin = 100
    if (
      this.position.x < -margin ||
      this.position.x > gameState.canvasWidth + margin ||
      this.position.y < -margin ||
      this.position.y > gameState.canvasHeight + margin ||
      this.lifespan <= 0
    ) {
      this.active = false
    }
  }

  draw(ctx: CanvasRenderingContext2D): void {
    ctx.save()
    ctx.translate(this.position.x, this.position.y)
    ctx.rotate(this.rotation)
    
    ctx.beginPath()
    for (let i = 0; i < this.points.length; i++) {
      const p = this.points[i]
      if (i === 0) ctx.moveTo(p.x, p.y)
      else ctx.lineTo(p.x, p.y)
    }
    ctx.closePath()
    
    const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, this.size)
    gradient.addColorStop(0, 'rgba(239, 68, 68, 0.4)')
    gradient.addColorStop(0.5, 'rgba(220, 38, 38, 0.2)')
    gradient.addColorStop(1, 'rgba(220, 38, 38, 0)')
    ctx.fillStyle = gradient
    ctx.fill()
    
    ctx.strokeStyle = 'rgba(248, 113, 113, 0.7)'
    ctx.lineWidth = 2
    ctx.stroke()
    
    ctx.beginPath()
    ctx.moveTo(-this.size * 0.3, 0)
    ctx.lineTo(this.size * 0.3, 0)
    ctx.moveTo(0, -this.size * 0.3)
    ctx.lineTo(0, this.size * 0.3)
    ctx.strokeStyle = 'rgba(252, 165, 165, 0.5)'
    ctx.lineWidth = 1
    ctx.stroke()
    
    ctx.restore()
  }

  checkCollisionWithShip(ship: Ship): boolean {
    const dx = this.position.x - ship.position.x
    const dy = this.position.y - ship.position.y
    const distance = Math.sqrt(dx * dx + dy * dy)
    return distance < this.size * 0.7 + ship.size * 0.5
  }
}

export class VoidDevourer implements Entity {
  id: string
  active: boolean = true
  position: Vector2
  size: number = 35
  baseSize: number = 35
  health: number = 3
  frozen: boolean = false
  frozenTime: number = 0
  breathPhase: number = 0
  sinePhase: number = 0
  sineAmplitude: number = 100
  chaseSpeed: number = 60
  slowFieldRadius: number = 150

  constructor(x: number, y: number) {
    this.id = generateId()
    this.position = { x, y }
    this.breathPhase = Math.random() * Math.PI * 2
    this.sinePhase = Math.random() * Math.PI * 2
  }

  update(deltaTime: number, gameState: GameStateData): void {
    this.breathPhase += deltaTime * 2
    
    if (this.frozen) {
      this.frozenTime -= deltaTime
      this.size = this.baseSize * (1 - this.frozenTime / 2) * 0.5
      if (this.frozenTime <= 0) {
        this.active = false
        this.createExplosionParticles(gameState.particles)
      }
      return
    }
    
    const target = gameState.mousePos
    const dx = target.x - this.position.x
    const dy = target.y - this.position.y
    const dist = Math.sqrt(dx * dx + dy * dy)
    
    if (dist > 0) {
      const normX = dx / dist
      const normY = dy / dist
      
      this.sinePhase += deltaTime * 2
      const perpX = -normY
      const perpY = normX
      const sineOffset = Math.sin(this.sinePhase) * this.sineAmplitude * deltaTime
      
      this.position.x += normX * this.chaseSpeed * deltaTime + perpX * sineOffset * 0.5
      this.position.y += normY * this.chaseSpeed * deltaTime + perpY * sineOffset * 0.5
    }
    
    this.size = this.baseSize * (1 + Math.sin(this.breathPhase) * 0.1)
  }

  private createExplosionParticles(particles: Particle[]): void {
    const colors = ['#f472b6', '#c084fc', '#60a5fa', '#34d399', '#fbbf24']
    for (let i = 0; i < 30; i++) {
      const angle = Math.random() * Math.PI * 2
      const speed = 100 + Math.random() * 150
      const color = colors[Math.floor(Math.random() * colors.length)]
      particles.push(new Particle(
        this.position.x,
        this.position.y,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
        0.8 + Math.random() * 0.5,
        color,
        3 + Math.random() * 5
      ))
    }
  }

  draw(ctx: CanvasRenderingContext2D): void {
    const { x, y } = this.position
    
    if (!this.frozen) {
      const fieldGradient = ctx.createRadialGradient(x, y, 0, x, y, this.slowFieldRadius)
      fieldGradient.addColorStop(0, 'rgba(139, 92, 246, 0.1)')
      fieldGradient.addColorStop(0.7, 'rgba(139, 92, 246, 0.05)')
      fieldGradient.addColorStop(1, 'rgba(139, 92, 246, 0)')
      ctx.beginPath()
      ctx.arc(x, y, this.slowFieldRadius, 0, Math.PI * 2)
      ctx.fillStyle = fieldGradient
      ctx.fill()
      
      ctx.beginPath()
      ctx.arc(x, y, this.slowFieldRadius, 0, Math.PI * 2)
      ctx.strokeStyle = 'rgba(167, 139, 250, 0.2)'
      ctx.lineWidth = 1
      ctx.setLineDash([5, 10])
      ctx.stroke()
      ctx.setLineDash([])
    }
    
    const glowSize = this.size * 2
    const glowGradient = ctx.createRadialGradient(x, y, this.size * 0.5, x, y, glowSize)
    if (this.frozen) {
      glowGradient.addColorStop(0, 'rgba(96, 165, 250, 0.5)')
      glowGradient.addColorStop(1, 'rgba(96, 165, 250, 0)')
    } else {
      glowGradient.addColorStop(0, 'rgba(88, 28, 135, 0.6)')
      glowGradient.addColorStop(1, 'rgba(88, 28, 135, 0)')
    }
    ctx.beginPath()
    ctx.arc(x, y, glowSize, 0, Math.PI * 2)
    ctx.fillStyle = glowGradient
    ctx.fill()
    
    const bodyGradient = ctx.createRadialGradient(x, y, 0, x, y, this.size)
    if (this.frozen) {
      bodyGradient.addColorStop(0, '#1e3a5f')
      bodyGradient.addColorStop(0.7, '#0f172a')
      bodyGradient.addColorStop(1, '#020617')
    } else {
      bodyGradient.addColorStop(0, '#3b0764')
      bodyGradient.addColorStop(0.7, '#1e1b4b')
      bodyGradient.addColorStop(1, '#0c0a1d')
    }
    ctx.beginPath()
    ctx.arc(x, y, this.size, 0, Math.PI * 2)
    ctx.fillStyle = bodyGradient
    ctx.fill()
    
    ctx.strokeStyle = this.frozen ? 'rgba(147, 197, 253, 0.6)' : 'rgba(168, 85, 247, 0.5)'
    ctx.lineWidth = 2
    ctx.stroke()
    
    const eyeSize = this.size * 0.25
    ctx.beginPath()
    ctx.arc(x - eyeSize * 0.8, y - eyeSize * 0.2, eyeSize, 0, Math.PI * 2)
    ctx.fillStyle = this.frozen ? '#93c5fd' : '#c084fc'
    ctx.fill()
    
    ctx.beginPath()
    ctx.arc(x + eyeSize * 0.8, y - eyeSize * 0.2, eyeSize, 0, Math.PI * 2)
    ctx.fillStyle = this.frozen ? '#93c5fd' : '#c084fc'
    ctx.fill()
    
    if (!this.frozen) {
      for (let i = 0; i < this.health; i++) {
        const hx = x - (this.health - 1) * 8 + i * 16
        const hy = y - this.size - 15
        ctx.beginPath()
        ctx.arc(hx, hy, 4, 0, Math.PI * 2)
        ctx.fillStyle = '#f472b6'
        ctx.fill()
      }
    }
  }

  checkBubbleHit(bubble: TimeBubble): boolean {
    const dx = bubble.position.x - this.position.x
    const dy = bubble.position.y - this.position.y
    const distance = Math.sqrt(dx * dx + dy * dy)
    return distance < this.size + bubble.radius * 0.5
  }

  isInSlowField(ship: Ship): boolean {
    if (this.frozen) return false
    const dx = ship.position.x - this.position.x
    const dy = ship.position.y - this.position.y
    const distance = Math.sqrt(dx * dx + dy * dy)
    return distance < this.slowFieldRadius
  }

  hit(): void {
    this.health--
    if (this.health <= 0) {
      this.frozen = true
      this.frozenTime = 2
    }
  }
}

export class Particle implements Entity {
  id: string
  active: boolean = true
  position: Vector2
  velocity: Vector2
  lifetime: number
  maxLifetime: number
  color: string
  size: number

  constructor(
    x: number,
    y: number,
    vx: number,
    vy: number,
    lifetime: number,
    color: string,
    size: number
  ) {
    this.id = generateId()
    this.position = { x, y }
    this.velocity = { x: vx, y: vy }
    this.maxLifetime = lifetime
    this.lifetime = lifetime
    this.color = color
    this.size = size
  }

  update(deltaTime: number): void {
    this.position.x += this.velocity.x * deltaTime
    this.position.y += this.velocity.y * deltaTime
    this.velocity.x *= 0.98
    this.velocity.y *= 0.98
    this.lifetime -= deltaTime
    
    if (this.lifetime <= 0) {
      this.active = false
    }
  }

  draw(ctx: CanvasRenderingContext2D): void {
    const alpha = this.lifetime / this.maxLifetime
    ctx.beginPath()
    ctx.arc(this.position.x, this.position.y, this.size * alpha, 0, Math.PI * 2)
    ctx.fillStyle = this.color
    ctx.globalAlpha = alpha
    ctx.fill()
    ctx.globalAlpha = 1
  }
}

export class EnergyRipple implements Entity {
  id: string
  active: boolean = true
  position: Vector2
  radius: number = 5
  maxRadius: number = 200
  lifetime: number = 1
  maxLifetime: number = 1

  constructor(x: number, y: number, maxRadius: number = 200) {
    this.id = generateId()
    this.position = { x, y }
    this.maxRadius = maxRadius
  }

  update(deltaTime: number): void {
    this.lifetime -= deltaTime
    const progress = 1 - this.lifetime / this.maxLifetime
    this.radius = this.maxRadius * progress
    
    if (this.lifetime <= 0) {
      this.active = false
    }
  }

  draw(ctx: CanvasRenderingContext2D): void {
    const alpha = this.lifetime / this.maxLifetime
    
    ctx.beginPath()
    ctx.arc(this.position.x, this.position.y, this.radius, 0, Math.PI * 2)
    ctx.strokeStyle = `rgba(34, 211, 238, ${alpha * 0.8})`
    ctx.lineWidth = 3
    ctx.stroke()
    
    ctx.beginPath()
    ctx.arc(this.position.x, this.position.y, this.radius * 0.8, 0, Math.PI * 2)
    ctx.strokeStyle = `rgba(103, 232, 249, ${alpha * 0.4})`
    ctx.lineWidth = 2
    ctx.stroke()
  }
}

export class TimeSand implements Entity {
  id: string
  active: boolean = true
  position: Vector2
  velocity: Vector2
  size: number = 15
  rotation: number = 0
  lifetime: number = 10
  collected: boolean = false

  constructor(x: number, y: number) {
    this.id = generateId()
    this.position = { x, y }
    this.velocity = {
      x: (Math.random() - 0.5) * 50,
      y: (Math.random() - 0.5) * 50,
    }
  }

  update(deltaTime: number): void {
    this.position.x += this.velocity.x * deltaTime
    this.position.y += this.velocity.y * deltaTime
    this.velocity.x *= 0.95
    this.velocity.y *= 0.95
    this.rotation += deltaTime * 2
    this.lifetime -= deltaTime
    
    if (this.lifetime <= 0) {
      this.active = false
    }
  }

  draw(ctx: CanvasRenderingContext2D): void {
    const { x, y } = this.position
    const pulse = 1 + Math.sin(this.lifetime * 5) * 0.2
    
    const glowGradient = ctx.createRadialGradient(x, y, 0, x, y, this.size * 3 * pulse)
    glowGradient.addColorStop(0, 'rgba(251, 191, 36, 0.4)')
    glowGradient.addColorStop(0.5, 'rgba(251, 191, 36, 0.1)')
    glowGradient.addColorStop(1, 'rgba(251, 191, 36, 0)')
    ctx.beginPath()
    ctx.arc(x, y, this.size * 3 * pulse, 0, Math.PI * 2)
    ctx.fillStyle = glowGradient
    ctx.fill()
    
    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(this.rotation)
    
    ctx.beginPath()
    ctx.moveTo(0, -this.size)
    ctx.lineTo(this.size * 0.6, 0)
    ctx.lineTo(0, this.size)
    ctx.lineTo(-this.size * 0.6, 0)
    ctx.closePath()
    
    const gradient = ctx.createLinearGradient(0, -this.size, 0, this.size)
    gradient.addColorStop(0, '#fef3c7')
    gradient.addColorStop(0.5, '#fbbf24')
    gradient.addColorStop(1, '#f59e0b')
    ctx.fillStyle = gradient
    ctx.fill()
    
    ctx.strokeStyle = '#fde68a'
    ctx.lineWidth = 2
    ctx.stroke()
    
    ctx.restore()
  }

  checkCollisionWithShip(ship: Ship): boolean {
    const dx = this.position.x - ship.position.x
    const dy = this.position.y - ship.position.y
    const distance = Math.sqrt(dx * dx + dy * dy)
    return distance < this.size + ship.size
  }
}

export class PortalEffect implements Entity {
  id: string
  active: boolean = true
  position: Vector2
  lifetime: number = 2
  maxLifetime: number = 2
  rotation: number = 0
  particles: Particle[] = []

  constructor(x: number, y: number) {
    this.id = generateId()
    this.position = { x, y }
  }

  update(deltaTime: number, gameState: GameStateData): void {
    this.lifetime -= deltaTime
    this.rotation += deltaTime * 3
    
    if (this.lifetime > 0 && gameState.particles.length < 800) {
      for (let i = 0; i < 5; i++) {
        const angle = Math.random() * Math.PI * 2
        const r = 30 + Math.random() * 50
        const px = this.position.x + Math.cos(angle) * r
        const py = this.position.y + Math.sin(angle) * r
        const speed = 100 + Math.random() * 100
        
        gameState.particles.push(new Particle(
          px,
          py,
          Math.cos(angle) * speed,
          Math.sin(angle) * speed,
          0.5 + Math.random() * 0.5,
          Math.random() > 0.5 ? '#a78bfa' : '#22d3ee',
          2 + Math.random() * 3
        ))
      }
    }
    
    if (this.lifetime <= 0) {
      this.active = false
    }
  }

  draw(ctx: CanvasRenderingContext2D): void {
    const { x, y } = this.position
    const alpha = Math.min(1, this.lifetime / 0.5) * Math.min(1, (this.maxLifetime - this.lifetime) / 0.5)
    
    for (let i = 0; i < 3; i++) {
      ctx.save()
      ctx.translate(x, y)
      ctx.rotate(this.rotation * (1 + i * 0.5))
      
      ctx.beginPath()
      const spiralPoints = 50
      for (let j = 0; j < spiralPoints; j++) {
        const t = j / spiralPoints
        const angle = t * Math.PI * 4
        const r = 10 + t * (60 + i * 20)
        const px = Math.cos(angle) * r
        const py = Math.sin(angle) * r
        if (j === 0) ctx.moveTo(px, py)
        else ctx.lineTo(px, py)
      }
      
      const colors = ['#a78bfa', '#818cf8', '#22d3ee']
      ctx.strokeStyle = colors[i]
      ctx.globalAlpha = alpha * 0.6
      ctx.lineWidth = 3 - i
      ctx.stroke()
      ctx.globalAlpha = 1
      
      ctx.restore()
    }
    
    const centerGradient = ctx.createRadialGradient(x, y, 0, x, y, 40)
    centerGradient.addColorStop(0, `rgba(255, 255, 255, ${alpha * 0.8})`)
    centerGradient.addColorStop(0.3, `rgba(167, 139, 250, ${alpha * 0.5})`)
    centerGradient.addColorStop(1, `rgba(139, 92, 246, 0)`)
    ctx.beginPath()
    ctx.arc(x, y, 40, 0, Math.PI * 2)
    ctx.fillStyle = centerGradient
    ctx.fill()
  }
}

export class Star implements Entity {
  id: string
  active: boolean = true
  position: Vector2
  size: number
  baseBrightness: number
  twinklePhase: number
  twinkleSpeed: number

  constructor(canvasWidth: number, canvasHeight: number) {
    this.id = generateId()
    this.position = {
      x: Math.random() * canvasWidth,
      y: Math.random() * canvasHeight,
    }
    this.size = 0.5 + Math.random() * 2
    this.baseBrightness = 0.3 + Math.random() * 0.7
    this.twinklePhase = Math.random() * Math.PI * 2
    this.twinkleSpeed = 0.5 + Math.random() * 2
  }

  update(deltaTime: number): void {
    this.twinklePhase += deltaTime * this.twinkleSpeed
  }

  draw(ctx: CanvasRenderingContext2D): void {
    const brightness = this.baseBrightness * (0.7 + Math.sin(this.twinklePhase) * 0.3)
    ctx.beginPath()
    ctx.arc(this.position.x, this.position.y, this.size, 0, Math.PI * 2)
    ctx.fillStyle = `rgba(255, 255, 255, ${brightness})`
    ctx.fill()
  }
}

export class BeamEffect implements Entity {
  id: string
  active: boolean = true
  startPos: Vector2
  endPos: Vector2
  lifetime: number = 2
  maxLifetime: number = 2

  constructor(startX: number, startY: number, endX: number, endY: number) {
    this.id = generateId()
    this.startPos = { x: startX, y: startY }
    this.endPos = { x: endX, y: endY }
  }

  update(deltaTime: number): void {
    this.lifetime -= deltaTime
    if (this.lifetime <= 0) {
      this.active = false
    }
  }

  draw(ctx: CanvasRenderingContext2D): void {
    const alpha = Math.min(1, this.lifetime / 0.5) * Math.min(1, (this.maxLifetime - this.lifetime) / 0.3)
    
    const gradient = ctx.createLinearGradient(
      this.startPos.x, this.startPos.y,
      this.endPos.x, this.endPos.y
    )
    gradient.addColorStop(0, `rgba(34, 211, 238, ${alpha * 0.8})`)
    gradient.addColorStop(0.5, `rgba(103, 232, 249, ${alpha})`)
    gradient.addColorStop(1, `rgba(167, 139, 250, ${alpha * 0.8})`)
    
    ctx.beginPath()
    ctx.moveTo(this.startPos.x, this.startPos.y)
    ctx.lineTo(this.endPos.x, this.endPos.y)
    ctx.strokeStyle = gradient
    ctx.lineWidth = 4
    ctx.lineCap = 'round'
    ctx.stroke()
    
    ctx.beginPath()
    ctx.moveTo(this.startPos.x, this.startPos.y)
    ctx.lineTo(this.endPos.x, this.endPos.y)
    ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.5})`
    ctx.lineWidth = 1
    ctx.stroke()
  }
}
