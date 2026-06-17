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
  BeamEffect,
  GameStateData,
  Vector2,
} from './entities'
import { Renderer, RenderState } from './renderer'
import { UIRenderer, UIState } from './ui'
import { LevelData, LevelManager } from './levels'

export interface GameLoopCallbacks {
  onVictory?: () => void
  onLevelChange?: (level: number) => void
}

export class GameLoop {
  private canvas: HTMLCanvasElement
  private renderer: Renderer
  private uiRenderer: UIRenderer
  private levelData: LevelData
  private callbacks: GameLoopCallbacks

  private ship: Ship | null = null
  private bubbles: TimeBubble[] = []
  private sutures: VoidSuture[] = []
  private rifts: Rift[] = []
  private devourers: VoidDevourer[] = []
  private particles: Particle[] = []
  private ripples: EnergyRipple[] = []
  private timeSands: TimeSand[] = []
  private portalEffects: PortalEffect[] = []
  private beamEffects: BeamEffect[] = []

  private mousePos: Vector2 = { x: 0, y: 0 }
  private isMouseDown: boolean = false
  private draggingBubble: TimeBubble | null = null

  private energy: number = 100
  private maxEnergy: number = 100
  private energyRegenRate: number = 8
  private bubbleCost: number = 25

  private bubbleLifetimeBonus: number = 1
  private baseBubbleLifetime: number = 3

  private riftSpawnTimer: number = 0
  private devourerSpawnTimer: number = 0

  private gameTime: number = 0
  private lastTime: number = 0
  private deltaTime: number = 0
  private animationFrameId: number | null = null
  private running: boolean = false

  private fps: number = 60
  private fpsTimer: number = 0
  private fpsFrameCount: number = 0

  private victoryPhase: 'idle' | 'portal' | 'complete' = 'idle'
  private victoryTimer: number = 0
  private portalTriggered: boolean = false

  private maxParticles: number = 800

  constructor(canvas: HTMLCanvasElement, levelData: LevelData, callbacks: GameLoopCallbacks = {}) {
    this.canvas = canvas
    this.renderer = new Renderer(canvas)
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Failed to get 2D context')
    this.uiRenderer = new UIRenderer(ctx)
    this.levelData = levelData
    this.callbacks = callbacks

    this.loadLevel(levelData)
    this.setupEventListeners()
  }

  loadLevel(levelData: LevelData): void {
    this.levelData = levelData
    this.sutures = [...levelData.sutures]
    this.bubbles = []
    this.rifts = []
    this.devourers = []
    this.particles = []
    this.ripples = []
    this.timeSands = []
    this.portalEffects = []
    this.beamEffects = []
    this.energy = this.maxEnergy
    this.bubbleLifetimeBonus = 1
    this.riftSpawnTimer = levelData.riftSpawnInterval
    this.devourerSpawnTimer = levelData.devourerSpawnInterval
    this.victoryPhase = 'idle'
    this.victoryTimer = 0
    this.portalTriggered = false
    this.draggingBubble = null
    this.isMouseDown = false

    if (!this.ship) {
      this.ship = new Ship(this.canvas.width / 2, this.canvas.height / 2)
    } else {
      this.ship.position = { x: this.canvas.width / 2, y: this.canvas.height / 2 }
    }

    this.renderer.resize(this.canvas.width, this.canvas.height)
  }

  private setupEventListeners(): void {
    this.canvas.addEventListener('mousemove', this.handleMouseMove)
    this.canvas.addEventListener('mousedown', this.handleMouseDown)
    this.canvas.addEventListener('mouseup', this.handleMouseUp)
    this.canvas.addEventListener('mouseleave', this.handleMouseUp)
  }

  private removeEventListeners(): void {
    this.canvas.removeEventListener('mousemove', this.handleMouseMove)
    this.canvas.removeEventListener('mousedown', this.handleMouseDown)
    this.canvas.removeEventListener('mouseup', this.handleMouseUp)
    this.canvas.removeEventListener('mouseleave', this.handleMouseUp)
  }

  private handleMouseMove = (e: MouseEvent): void => {
    const rect = this.canvas.getBoundingClientRect()
    this.mousePos = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    }
  }

  private handleMouseDown = (e: MouseEvent): void => {
    if (e.button !== 0) return
    this.isMouseDown = true

    if (this.victoryPhase !== 'idle') return

    let clickedBubble: TimeBubble | null = null
    for (const bubble of this.bubbles) {
      const dx = bubble.position.x - this.mousePos.x
      const dy = bubble.position.y - this.mousePos.y
      const distance = Math.sqrt(dx * dx + dy * dy)
      if (distance < bubble.radius && bubble.lifetime > 0.5) {
        clickedBubble = bubble
        break
      }
    }

    if (clickedBubble) {
      this.draggingBubble = clickedBubble
      clickedBubble.isDragging = true
    } else if (this.energy >= this.bubbleCost) {
      this.spawnBubble(this.mousePos.x, this.mousePos.y)
    }
  }

  private handleMouseUp = (): void => {
    this.isMouseDown = false
    if (this.draggingBubble) {
      this.draggingBubble.isDragging = false
      this.draggingBubble = null
    }
  }

  private spawnBubble(x: number, y: number): void {
    if (this.energy < this.bubbleCost) return

    const lifetime = this.baseBubbleLifetime * this.bubbleLifetimeBonus
    const bubble = new TimeBubble(x, y, lifetime)
    this.bubbles.push(bubble)
    this.energy -= this.bubbleCost

    this.draggingBubble = bubble
    bubble.isDragging = true

    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2
      const speed = 60 + Math.random() * 30
      this.addParticle(new Particle(
        x,
        y,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
        0.4,
        '#c4b5fd',
        2 + Math.random() * 2
      ))
    }
  }

  private addParticle(particle: Particle): void {
    if (this.particles.length < this.maxParticles) {
      this.particles.push(particle)
    }
  }

  start(): void {
    if (this.running) return
    this.running = true
    this.lastTime = performance.now()
    this.gameLoop()
  }

  stop(): void {
    this.running = false
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId)
      this.animationFrameId = null
    }
    this.removeEventListeners()
  }

  private gameLoop = (): void => {
    if (!this.running) return

    const now = performance.now()
    this.deltaTime = Math.min((now - this.lastTime) / 1000, 0.1)
    this.lastTime = now
    this.gameTime += this.deltaTime

    this.fpsFrameCount++
    this.fpsTimer += this.deltaTime
    if (this.fpsTimer >= 1) {
      this.fps = this.fpsFrameCount
      this.fpsFrameCount = 0
      this.fpsTimer = 0
    }

    this.update()
    this.render()

    this.animationFrameId = requestAnimationFrame(this.gameLoop)
  }

  private update(): void {
    const { deltaTime } = this

    if (this.victoryPhase === 'complete') return

    const gameState: GameStateData = {
      mousePos: this.mousePos,
      canvasWidth: this.canvas.width,
      canvasHeight: this.canvas.height,
      particles: this.particles,
      time: this.gameTime,
    }

    this.renderer.updateStars(deltaTime)
    this.uiRenderer.update(deltaTime)

    if (this.victoryPhase === 'portal') {
      this.updateVictoryPhase(deltaTime, gameState)
      this.updateEffects(deltaTime, gameState)
      this.cleanupEntities()
      return
    }

    if (this.ship) {
      let slowFactor = 1
      for (const devourer of this.devourers) {
        if (devourer.isInSlowField(this.ship)) {
          slowFactor = 0.5
          break
        }
      }
      
      const originalSpeed = 0.15
      const newSpeed = originalSpeed * slowFactor
      const dx = this.mousePos.x - this.ship.position.x
      const dy = this.mousePos.y - this.ship.position.y
      this.ship.position.x += dx * newSpeed
      this.ship.position.y += dy * newSpeed
      this.ship.rotation = Math.atan2(dy, dx) + Math.PI / 2
      this.ship.pulseRotation += deltaTime * 0.5
      
      this.ship.trailPositions.unshift({ ...this.ship.position })
      if (this.ship.trailPositions.length > this.ship.maxTrailLength) {
        this.ship.trailPositions.pop()
      }
    }

    for (const bubble of this.bubbles) {
      bubble.update(deltaTime, gameState)
    }

    for (const suture of this.sutures) {
      suture.update(deltaTime)
    }

    for (const rift of this.rifts) {
      rift.update(deltaTime, gameState)
    }

    for (const devourer of this.devourers) {
      devourer.update(deltaTime, gameState)
    }

    for (const ripple of this.ripples) {
      ripple.update(deltaTime)
    }

    for (const timeSand of this.timeSands) {
      timeSand.update(deltaTime)
    }

    for (const portal of this.portalEffects) {
      portal.update(deltaTime, gameState)
    }

    for (const beam of this.beamEffects) {
      beam.update(deltaTime)
    }

    for (const particle of this.particles) {
      particle.update(deltaTime)
    }

    this.checkCollisions()
    this.spawnEnemies(deltaTime)
    this.updateEffects(deltaTime, gameState)
    this.regenerateEnergy(deltaTime)
    this.checkVictoryCondition()
    this.cleanupEntities()
  }

  private updateEffects(deltaTime: number, gameState: GameStateData): void {
  }

  private updateVictoryPhase(deltaTime: number, gameState: GameStateData): void {
    this.victoryTimer -= deltaTime

    if (this.victoryTimer <= 0) {
      if (!this.portalTriggered) {
        this.triggerPortal()
        this.portalTriggered = true
        this.victoryTimer = 2
      } else {
        this.victoryPhase = 'complete'
        if (this.callbacks.onVictory) {
          setTimeout(() => this.callbacks.onVictory?.(), 500)
        }
      }
    }
  }

  private checkCollisions(): void {
    if (!this.ship) return

    for (const rift of this.rifts) {
      if (rift.checkCollisionWithShip(this.ship)) {
        this.reduceBubbleLifetime(0.2)
        rift.active = false
        
        for (let i = 0; i < 10; i++) {
          const angle = Math.random() * Math.PI * 2
          const speed = 80 + Math.random() * 60
          this.addParticle(new Particle(
            rift.position.x,
            rift.position.y,
            Math.cos(angle) * speed,
            Math.sin(angle) * speed,
            0.5,
            '#f87171',
            3 + Math.random() * 3
          ))
        }
      }
    }

    for (const bubble of this.bubbles) {
      if (!bubble.active || bubble.lifetime <= 0.1) continue

      for (const suture of this.sutures) {
        if (!suture.activated && suture.checkBubbleCoverage(bubble)) {
          this.activateSuture(suture)
        }
      }

      for (const devourer of this.devourers) {
        if (!devourer.frozen && devourer.checkBubbleHit(bubble)) {
          devourer.hit()
          bubble.active = false
          
          for (let i = 0; i < 8; i++) {
            const angle = Math.random() * Math.PI * 2
            const speed = 60 + Math.random() * 40
            this.addParticle(new Particle(
              bubble.position.x,
              bubble.position.y,
              Math.cos(angle) * speed,
              Math.sin(angle) * speed,
              0.4,
              '#c084fc',
              2 + Math.random() * 2
            ))
          }

          if (devourer.frozen) {
            this.spawnTimeSand(devourer.position.x, devourer.position.y)
            this.energy = Math.min(this.maxEnergy, this.energy + 20)
          }
        }
      }
    }

    for (const timeSand of this.timeSands) {
      if (timeSand.checkCollisionWithShip(this.ship)) {
        timeSand.active = false
        this.bubbleLifetimeBonus = Math.min(2, this.bubbleLifetimeBonus + 0.5)
        this.energy = Math.min(this.maxEnergy, this.energy + 15)
        
        for (let i = 0; i < 15; i++) {
          const angle = Math.random() * Math.PI * 2
          const speed = 50 + Math.random() * 50
          this.addParticle(new Particle(
            timeSand.position.x,
            timeSand.position.y,
            Math.cos(angle) * speed,
            Math.sin(angle) * speed,
            0.6,
            '#fbbf24',
            2 + Math.random() * 3
          ))
        }

        setTimeout(() => {
          this.bubbleLifetimeBonus = Math.max(1, this.bubbleLifetimeBonus - 0.5)
        }, 10000)
      }
    }
  }

  private activateSuture(suture: VoidSuture): void {
    suture.activated = true
    
    this.ripples.push(new EnergyRipple(suture.position.x, suture.position.y, 250))
    
    for (let i = 0; i < 20; i++) {
      const angle = Math.random() * Math.PI * 2
      const speed = 100 + Math.random() * 80
      this.addParticle(new Particle(
        suture.position.x,
        suture.position.y,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
        0.6,
        '#22d3ee',
        2 + Math.random() * 3
      ))
    }
  }

  private reduceBubbleLifetime(reduction: number): void {
    for (const bubble of this.bubbles) {
      bubble.maxLifetime *= (1 - reduction)
      bubble.lifetime = Math.min(bubble.lifetime, bubble.maxLifetime)
    }
  }

  private spawnEnemies(deltaTime: number): void {
    this.riftSpawnTimer -= deltaTime
    if (this.riftSpawnTimer <= 0) {
      this.rifts.push(new Rift(this.canvas.width, this.canvas.height))
      this.riftSpawnTimer = this.levelData.riftSpawnInterval * (0.8 + Math.random() * 0.4)
    }

    if (this.devourers.length < this.levelData.maxDevourers) {
      this.devourerSpawnTimer -= deltaTime
      if (this.devourerSpawnTimer <= 0) {
        const side = Math.floor(Math.random() * 4)
        let x: number, y: number
        switch (side) {
          case 0:
            x = Math.random() * this.canvas.width
            y = -50
            break
          case 1:
            x = this.canvas.width + 50
            y = Math.random() * this.canvas.height
            break
          case 2:
            x = Math.random() * this.canvas.width
            y = this.canvas.height + 50
            break
          default:
            x = -50
            y = Math.random() * this.canvas.height
        }
        this.devourers.push(new VoidDevourer(x, y))
        this.devourerSpawnTimer = this.levelData.devourerSpawnInterval * (0.8 + Math.random() * 0.4)
      }
    }
  }

  private spawnTimeSand(x: number, y: number): void {
    this.timeSands.push(new TimeSand(x, y))
  }

  private regenerateEnergy(deltaTime: number): void {
    this.energy = Math.min(this.maxEnergy, this.energy + this.energyRegenRate * deltaTime)
  }

  private checkVictoryCondition(): void {
    if (this.victoryPhase !== 'idle') return

    const allActivated = this.sutures.every(s => s.activated)
    if (allActivated) {
      this.startVictorySequence()
    }
  }

  private startVictorySequence(): void {
    this.victoryPhase = 'portal'
    this.victoryTimer = 0.5

    const centerX = this.canvas.width / 2
    const centerY = this.canvas.height / 2

    for (const suture of this.sutures) {
      this.beamEffects.push(new BeamEffect(
        suture.position.x,
        suture.position.y,
        centerX,
        centerY
      ))
    }
  }

  private triggerPortal(): void {
    const centerX = this.canvas.width / 2
    const centerY = this.canvas.height / 2
    this.portalEffects.push(new PortalEffect(centerX, centerY))

    for (let i = 0; i < 50; i++) {
      const angle = Math.random() * Math.PI * 2
      const r = 20 + Math.random() * 80
      const speed = 150 + Math.random() * 100
      this.addParticle(new Particle(
        centerX + Math.cos(angle) * r,
        centerY + Math.sin(angle) * r,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
        0.8 + Math.random() * 0.5,
        Math.random() > 0.5 ? '#a78bfa' : '#22d3ee',
        3 + Math.random() * 4
      ))
    }
  }

  private cleanupEntities(): void {
    this.bubbles = this.bubbles.filter(b => b.active)
    this.rifts = this.rifts.filter(r => r.active)
    this.devourers = this.devourers.filter(d => d.active)
    this.particles = this.particles.filter(p => p.active)
    this.ripples = this.ripples.filter(r => r.active)
    this.timeSands = this.timeSands.filter(t => t.active)
    this.portalEffects = this.portalEffects.filter(p => p.active)
    this.beamEffects = this.beamEffects.filter(b => b.active)

    if (this.draggingBubble && !this.draggingBubble.active) {
      this.draggingBubble = null
    }
  }

  private render(): void {
    const renderState: RenderState = {
      ship: this.ship,
      bubbles: this.bubbles,
      sutures: this.sutures,
      rifts: this.rifts,
      devourers: this.devourers,
      particles: this.particles,
      ripples: this.ripples,
      timeSands: this.timeSands,
      portalEffects: this.portalEffects,
      stars: [],
      beamEffects: this.beamEffects,
      canvasWidth: this.canvas.width,
      canvasHeight: this.canvas.height,
      time: this.gameTime,
    }

    this.renderer.render(renderState)

    const uiState: UIState = {
      levelNumber: this.levelData.levelNumber,
      activatedSutures: LevelManager.getActivatedCount(this.sutures),
      totalSutures: this.levelData.targetSutures,
      energy: this.energy,
      maxEnergy: this.maxEnergy,
      description: this.levelData.description,
      fps: Math.round(this.fps),
      bubbleLifetimeBonus: this.bubbleLifetimeBonus,
    }

    this.uiRenderer.render(uiState, this.canvas.width, this.canvas.height)
  }

  getFPS(): number {
    return this.fps
  }

  resize(width: number, height: number): void {
    this.renderer.resize(width, height)
  }
}
