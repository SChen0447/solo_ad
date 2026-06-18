import { useGameStore } from '../store'
import { TunnelSegment, Obstacle, Crystal } from '../types'
import { v4 as uuidv4 } from 'uuid'
import { checkCollisions } from './CollisionSystem'

const SEGMENT_LENGTH = 100
const TUNNEL_HALF_WIDTH = 5
const WARNING_DISTANCE = 80

export class GameLoop {
  private animationFrameId: number | null = null
  private lastTime = 0
  private tunnelSegments: TunnelSegment[] = []
  private keys: Record<string, boolean> = {}
  private cartTargetX = 0
  private cartSmoothX = 0
  private hitCooldown = false
  private segmentsGenerated = 0

  constructor() {
    this.setupInputListeners()
  }

  private setupInputListeners() {
    window.addEventListener('keydown', (e) => {
      this.keys[e.code] = true
    })
    window.addEventListener('keyup', (e) => {
      this.keys[e.code] = false
    })
    window.addEventListener('wheel', (e) => {
      if (useGameStore.getState().gameStatus !== 'playing') return
      const currentPitch = useGameStore.getState().cameraPitch
      useGameStore.getState().setCameraPitch(currentPitch + e.deltaY * 0.05)
    })
  }

  public start() {
    this.reset()
    this.lastTime = performance.now()
    this.loop()
  }

  public stop() {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId)
      this.animationFrameId = null
    }
  }

  private reset() {
    this.tunnelSegments = []
    this.cartTargetX = 0
    this.cartSmoothX = 0
    this.segmentsGenerated = 0
    this.hitCooldown = false
    for (let i = 0; i < 5; i++) {
      this.generateSegment(i * SEGMENT_LENGTH)
    }
  }

  private generateSegment(startZ: number) {
    const difficulty = Math.min(this.segmentsGenerated * 0.1, 1)
    const obstacleCount = Math.floor(3 + difficulty * 5 + Math.random() * 3)
    const crystalCount = Math.floor(2 + Math.random() * 4)

    const obstacles: Obstacle[] = []
    for (let i = 0; i < obstacleCount; i++) {
      obstacles.push({
        id: uuidv4(),
        position: {
          x: (Math.random() - 0.5) * (TUNNEL_HALF_WIDTH * 2 - 2),
          y: 0,
          z: startZ + 10 + Math.random() * (SEGMENT_LENGTH - 20),
        },
        warningStartTime: 0,
        opacity: 0,
        active: true,
      })
    }

    const crystals: Crystal[] = []
    for (let i = 0; i < crystalCount; i++) {
      crystals.push({
        id: uuidv4(),
        position: {
          x: (Math.random() - 0.5) * (TUNNEL_HALF_WIDTH * 2 - 2),
          y: 0.5,
          z: startZ + 10 + Math.random() * (SEGMENT_LENGTH - 20),
        },
        rotation: 0,
        collected: false,
      })
    }

    this.tunnelSegments.push({
      id: uuidv4(),
      startZ,
      length: SEGMENT_LENGTH,
      curvature: (Math.random() - 0.5) * difficulty * 0.02,
      obstacles,
      crystals,
    })

    this.segmentsGenerated++
  }

  private loop = () => {
    const now = performance.now()
    const deltaTime = Math.min((now - this.lastTime) / 1000, 0.05)
    this.lastTime = now

    const state = useGameStore.getState()

    if (state.gameStatus === 'playing') {
      this.update(deltaTime, now)
    }

    this.animationFrameId = requestAnimationFrame(this.loop)
  }

  private update(deltaTime: number, now: number) {
    const state = useGameStore.getState()

    const moveSpeed = 12
    if (this.keys['ArrowLeft'] || this.keys['KeyA']) {
      this.cartTargetX = Math.max(this.cartTargetX - moveSpeed * deltaTime, -TUNNEL_HALF_WIDTH + 1)
    }
    if (this.keys['ArrowRight'] || this.keys['KeyD']) {
      this.cartTargetX = Math.min(this.cartTargetX + moveSpeed * deltaTime, TUNNEL_HALF_WIDTH - 1)
    }

    const lerpFactor = 1 - Math.pow(0.001, deltaTime)
    this.cartSmoothX += (this.cartTargetX - this.cartSmoothX) * lerpFactor

    let velocity = state.velocity
    if (state.isBoosting && now > state.boostEndTime) {
      useGameStore.setState({
        isBoosting: false,
        velocity: state.baseSpeed,
      })
      velocity = state.baseSpeed
    }

    const deltaZ = velocity * deltaTime
    const newZ = state.playerZ + deltaZ
    useGameStore.getState().updateDistance(deltaZ)
    useGameStore.getState().setPlayerPosition(this.cartSmoothX, newZ)

    const cartPosition = { x: this.cartSmoothX, y: 0.5, z: newZ }

    for (const segment of this.tunnelSegments) {
      for (const obstacle of segment.obstacles) {
        const dist = obstacle.position.z - newZ
        if (dist < WARNING_DISTANCE && dist > 0 && obstacle.opacity < 1) {
          if (obstacle.warningStartTime === 0) {
            obstacle.warningStartTime = now
          }
          const warnProgress = Math.min((now - obstacle.warningStartTime) / 500, 1)
          obstacle.opacity = warnProgress
        }
      }
      for (const crystal of segment.crystals) {
        if (!crystal.collected) {
          crystal.rotation += deltaTime * 2
        }
      }
    }

    const allObstacles: Obstacle[] = []
    const allCrystals: Crystal[] = []
    for (const segment of this.tunnelSegments) {
      for (const obstacle of segment.obstacles) {
        if (Math.abs(obstacle.position.z - newZ) < 50) {
          allObstacles.push(obstacle)
        }
      }
      for (const crystal of segment.crystals) {
        if (!crystal.collected && Math.abs(crystal.position.z - newZ) < 50) {
          allCrystals.push(crystal)
        }
      }
    }

    const collision = checkCollisions(cartPosition, allObstacles, allCrystals)

    if (collision.hitObstacle && !this.hitCooldown) {
      this.hitCooldown = true
      useGameStore.getState().triggerHit()
      setTimeout(() => {
        this.hitCooldown = false
      }, 800)
    }

    for (const crystalId of collision.collectedCrystals) {
      for (const segment of this.tunnelSegments) {
        const crystal = segment.crystals.find((c) => c.id === crystalId)
        if (crystal && !crystal.collected) {
          crystal.collected = true
          useGameStore.getState().addEnergy()
        }
      }
    }

    const lastSegment = this.tunnelSegments[this.tunnelSegments.length - 1]
    if (lastSegment && newZ + 300 > lastSegment.startZ + lastSegment.length) {
      this.generateSegment(lastSegment.startZ + lastSegment.length)
    }

    this.tunnelSegments = this.tunnelSegments.filter(
      (s) => s.startZ + s.length > newZ - 50
    )
  }

  public getTunnelSegments(): TunnelSegment[] {
    return this.tunnelSegments
  }

  public getCartSmoothX(): number {
    return this.cartSmoothX
  }

  public getCartTargetX(): number {
    return this.cartTargetX
  }
}
