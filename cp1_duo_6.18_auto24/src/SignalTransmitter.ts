import * as THREE from 'three'
import { NeuronManager, Connection } from './NeuronManager'

export interface Particle {
  id: string
  connectionId: string
  position: THREE.Vector3
  progress: number
  speed: number
  positionHistory: THREE.Vector3[]
  active: boolean
}

export class SignalTransmitter {
  private static readonly MAX_TOTAL_PARTICLES: number = 750
  private static readonly DEFAULT_PARTICLES_PER_CONNECTION: number = 15
  private static readonly POSITION_HISTORY_LENGTH: number = 5
  private static readonly POSITION_UPDATE_BUDGET_MS: number = 0.5

  private neuronManager: NeuronManager
  private particles: Particle[] = []
  private particlesPerConnection: number = 15
  private speed: number = 0.05
  private lastSpawnTime: Map<string, number> = new Map()
  private spawnInterval: number = 200

  constructor(neuronManager: NeuronManager) {
    this.neuronManager = neuronManager
    this.updateParticlesPerConnection()
    this.initParticles()
  }

  private updateParticlesPerConnection(): void {
    const connectionCount = this.neuronManager.getSynapseCount()
    const maxPerConn = Math.floor(
      SignalTransmitter.MAX_TOTAL_PARTICLES / Math.max(1, connectionCount)
    )
    this.particlesPerConnection = Math.min(
      SignalTransmitter.DEFAULT_PARTICLES_PER_CONNECTION,
      Math.max(1, maxPerConn)
    )
  }

  private initParticles(): void {
    this.particles = []
    this.lastSpawnTime.clear()

    const connections = this.neuronManager.getConnections()
    connections.forEach((conn) => {
      this.lastSpawnTime.set(conn.id, -Infinity)
    })
  }

  public reset(): void {
    this.updateParticlesPerConnection()
    this.initParticles()
  }

  public setSpeed(speed: number): void {
    this.speed = speed
  }

  public setSignalStrength(strength: number): void {
    const minInterval = 80
    const maxInterval = 500
    this.spawnInterval = maxInterval - (strength / 100) * (maxInterval - minInterval)
  }

  public getParticles(): Particle[] {
    return this.particles.filter((p) => p.active)
  }

  public getParticlesPerConnectionCount(): number {
    return this.particlesPerConnection
  }

  public update(deltaTime: number = 1): void {
    const startTime = performance.now()
    const connections = this.neuronManager.getConnections()
    const now = Date.now()

    connections.forEach((conn) => {
      const lastSpawn = this.lastSpawnTime.get(conn.id) ?? -Infinity
      if (now - lastSpawn > this.spawnInterval) {
        this.spawnParticle(conn)
        this.lastSpawnTime.set(conn.id, now)
      }
    })

    const activeParticles = this.particles.filter((p) => p.active)
    for (let i = 0; i < activeParticles.length; i++) {
      const particle = activeParticles[i]
      this.updateParticle(particle, deltaTime)
    }

    this.particles = this.particles.filter((p) => p.active)

    const elapsed = performance.now() - startTime
    if (elapsed > SignalTransmitter.POSITION_UPDATE_BUDGET_MS) {
      console.warn(
        `Particle update took ${elapsed.toFixed(3)}ms, exceeds ${SignalTransmitter.POSITION_UPDATE_BUDGET_MS}ms budget`
      )
    }
  }

  private updateParticle(particle: Particle, deltaTime: number): void {
    const conn = this.neuronManager
      .getConnections()
      .find((c) => c.id === particle.connectionId)
    if (!conn) return

    const preNode = this.neuronManager.getNodeById(conn.presynapticId)
    const postNode = this.neuronManager.getNodeById(conn.postsynapticId)

    if (!preNode || !postNode) return

    particle.progress += this.speed * deltaTime

    if (particle.progress >= 1) {
      particle.active = false
      this.neuronManager.triggerFlash(conn.postsynapticId)
      return
    }

    const newPos = new THREE.Vector3().lerpVectors(
      preNode.position,
      postNode.position,
      particle.progress
    )

    particle.positionHistory.unshift(particle.position.clone())
    if (particle.positionHistory.length > SignalTransmitter.POSITION_HISTORY_LENGTH) {
      particle.positionHistory.pop()
    }

    particle.position.copy(newPos)
  }

  private spawnParticle(connection: Connection): void {
    if (this.particles.filter((p) => p.active).length >= SignalTransmitter.MAX_TOTAL_PARTICLES) {
      return
    }

    const preNode = this.neuronManager.getNodeById(connection.presynapticId)
    if (!preNode) return

    const activeOnConn = this.particles.filter(
      (p) => p.connectionId === connection.id && p.active
    ).length
    if (activeOnConn >= this.particlesPerConnection) {
      return
    }

    this.neuronManager.triggerEmitPulse(connection.presynapticId)

    const particleId = `particle-${connection.id}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`

    const particle: Particle = {
      id: particleId,
      connectionId: connection.id,
      position: preNode.position.clone(),
      progress: 0,
      speed: this.speed,
      positionHistory: [],
      active: true,
    }

    this.particles.push(particle)
  }
}
