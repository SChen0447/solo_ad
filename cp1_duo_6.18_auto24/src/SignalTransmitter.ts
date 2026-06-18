import * as THREE from 'three'
import { NeuronManager, Connection } from './NeuronManager'

export interface Particle {
  id: string
  connectionId: string
  position: THREE.Vector3
  progress: number
  speed: number
  trail: THREE.Vector3[]
  active: boolean
}

export class SignalTransmitter {
  private neuronManager: NeuronManager
  private particles: Particle[] = []
  private particlesPerConnection: number = 15
  private speed: number = 0.05
  private lastSpawnTime: Map<string, number> = new Map()
  private spawnInterval: number = 200

  constructor(neuronManager: NeuronManager) {
    this.neuronManager = neuronManager
    this.initParticles()
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

  public update(deltaTime: number = 1): void {
    const connections = this.neuronManager.getConnections()
    const now = Date.now()

    connections.forEach((conn) => {
      const lastSpawn = this.lastSpawnTime.get(conn.id) ?? -Infinity
      if (now - lastSpawn > this.spawnInterval) {
        this.spawnParticle(conn)
        this.lastSpawnTime.set(conn.id, now)
      }
    })

    this.particles.forEach((particle) => {
      if (!particle.active) return

      const conn = connections.find((c) => c.id === particle.connectionId)
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

      particle.trail.unshift(particle.position.clone())
      if (particle.trail.length > 5) {
        particle.trail.pop()
      }

      particle.position.copy(newPos)
    })

    this.particles = this.particles.filter((p) => p.active)
  }

  private spawnParticle(connection: Connection): void {
    const preNode = this.neuronManager.getNodeById(connection.presynapticId)
    if (!preNode) return

    const particleId = `particle-${connection.id}-${Date.now()}-${Math.random()}`

    const particle: Particle = {
      id: particleId,
      connectionId: connection.id,
      position: preNode.position.clone(),
      progress: 0,
      speed: this.speed,
      trail: [],
      active: true,
    }

    this.particles.push(particle)
  }
}
