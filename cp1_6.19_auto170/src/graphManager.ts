import * as THREE from 'three'
import type { Particle } from './particleEngine'

export interface Connection {
  id: string
  particleAId: string
  particleBId: string
  strength: number
  createdAt: number
}

export interface DragState {
  isDragging: boolean
  fromParticleId: string | null
  dragStartPosition: THREE.Vector3 | null
  dragCurrentPosition: THREE.Vector3 | null
  hoveredParticleId: string | null
}

export type ConnectionListener = (conn: Connection) => void

export class GraphManager {
  private connections: Map<string, Connection> = new Map()
  private connectionListeners: ConnectionListener[] = []
  private disconnectionListeners: ConnectionListener[] = []
  private dragState: DragState = {
    isDragging: false,
    fromParticleId: null,
    dragStartPosition: null,
    dragCurrentPosition: null,
    hoveredParticleId: null
  }

  constructor() {}

  startDrag(particleId: string, position: THREE.Vector3) {
    this.dragState = {
      isDragging: true,
      fromParticleId: particleId,
      dragStartPosition: position.clone(),
      dragCurrentPosition: position.clone(),
      hoveredParticleId: null
    }
  }

  updateDrag(position: THREE.Vector3, particles: Particle[]): Particle | null {
    if (!this.dragState.isDragging) return null

    this.dragState.dragCurrentPosition = position.clone()

    let closestParticle: Particle | null = null
    let closestDistance = Infinity

    for (const particle of particles) {
      if (particle.id === this.dragState.fromParticleId) continue

      const distance = particle.position.distanceTo(position)
      if (distance < 2 && distance < closestDistance) {
        closestDistance = distance
        closestParticle = particle
      }
    }

    this.dragState.hoveredParticleId = closestParticle?.id || null
    return closestParticle
  }

  endDrag(): Connection | null {
    if (!this.dragState.isDragging) {
      this.resetDrag()
      return null
    }

    const { fromParticleId, hoveredParticleId } = this.dragState
    this.resetDrag()

    if (fromParticleId && hoveredParticleId) {
      return this.createConnection(fromParticleId, hoveredParticleId)
    }

    return null
  }

  cancelDrag() {
    this.resetDrag()
  }

  private resetDrag() {
    this.dragState = {
      isDragging: false,
      fromParticleId: null,
      dragStartPosition: null,
      dragCurrentPosition: null,
      hoveredParticleId: null
    }
  }

  private createConnection(particleAId: string, particleBId: string): Connection | null {
    const key = this.getConnectionKey(particleAId, particleBId)
    if (this.connections.has(key)) return null

    const connection: Connection = {
      id: key,
      particleAId,
      particleBId,
      strength: 1,
      createdAt: Date.now()
    }

    this.connections.set(key, connection)

    for (const listener of this.connectionListeners) {
      listener(connection)
    }

    return connection
  }

  removeConnection(particleAId: string, particleBId: string): boolean {
    const key = this.getConnectionKey(particleAId, particleBId)
    const connection = this.connections.get(key)
    if (!connection) return false

    this.connections.delete(key)

    for (const listener of this.disconnectionListeners) {
      listener(connection)
    }

    return true
  }

  private getConnectionKey(aId: string, bId: string): string {
    return [aId, bId].sort().join('-')
  }

  hasConnection(particleAId: string, particleBId: string): boolean {
    return this.connections.has(this.getConnectionKey(particleAId, particleBId))
  }

  getConnection(particleAId: string, particleBId: string): Connection | undefined {
    return this.connections.get(this.getConnectionKey(particleAId, particleBId))
  }

  getAllConnections(): Connection[] {
    return Array.from(this.connections.values())
  }

  getConnectionsForParticle(particleId: string): Connection[] {
    return this.getAllConnections().filter(
      c => c.particleAId === particleId || c.particleBId === particleId
    )
  }

  getConnectionCount(): number {
    return this.connections.size
  }

  onConnection(listener: ConnectionListener): () => void {
    this.connectionListeners.push(listener)
    return () => {
      const idx = this.connectionListeners.indexOf(listener)
      if (idx > -1) this.connectionListeners.splice(idx, 1)
    }
  }

  onDisconnection(listener: ConnectionListener): () => void {
    this.disconnectionListeners.push(listener)
    return () => {
      const idx = this.disconnectionListeners.indexOf(listener)
      if (idx > -1) this.disconnectionListeners.splice(idx, 1)
    }
  }

  getDragState(): DragState {
    return { ...this.dragState }
  }

  getFlowLightPosition(particleA: Particle, particleB: Particle): THREE.Vector3 {
    const time = performance.now() * 0.001
    const progress = (time % 2) / 2

    const midPoint = new THREE.Vector3()
      .addVectors(particleA.position, particleB.position)
      .multiplyScalar(0.5)

    const direction = new THREE.Vector3().subVectors(particleB.position, particleA.position)
    const distance = direction.length()

    const arcHeight = distance * 0.2
    const directionNormalized = direction.clone().normalize()
    const perpendicular = new THREE.Vector3(
      -directionNormalized.z,
      directionNormalized.y * 0.5,
      directionNormalized.x
    ).normalize()

    const t = progress
    const linearPos = particleA.position.clone().lerp(particleB.position, t)
    const arcOffset = perpendicular.multiplyScalar(Math.sin(t * Math.PI) * arcHeight)

    return linearPos.add(arcOffset)
  }

  getArcPoints(particleA: Particle, particleB: Particle, segments: number = 20): THREE.Vector3[] {
    const points: THREE.Vector3[] = []

    const direction = new THREE.Vector3().subVectors(particleB.position, particleA.position)
    const distance = direction.length()
    const arcHeight = distance * 0.2
    const directionNormalized = direction.clone().normalize()
    const perpendicular = new THREE.Vector3(
      -directionNormalized.z,
      directionNormalized.y * 0.5,
      directionNormalized.x
    ).normalize()

    for (let i = 0; i <= segments; i++) {
      const t = i / segments
      const linearPos = particleA.position.clone().lerp(particleB.position, t)
      const arcOffset = perpendicular.clone().multiplyScalar(Math.sin(t * Math.PI) * arcHeight)
      points.push(linearPos.add(arcOffset))
    }

    return points
  }

  getProximityConnections(particles: Particle[], maxDistance: number = 5): Array<{ particleA: Particle; particleB: Particle; distance: number }> {
    const result: Array<{ particleA: Particle; particleB: Particle; distance: number }> = []

    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const distance = particles[i].position.distanceTo(particles[j].position)
        if (distance < maxDistance) {
          result.push({
            particleA: particles[i],
            particleB: particles[j],
            distance
          })
        }
      }
    }

    return result
  }

  clearAllConnections() {
    this.connections.clear()
  }

  setConnections(connections: Connection[]) {
    this.connections.clear()
    for (const conn of connections) {
      this.connections.set(conn.id, conn)
    }
  }
}
