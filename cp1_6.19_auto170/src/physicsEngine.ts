import * as THREE from 'three'
import type { Particle } from './particleEngine'

export interface CollisionEvent {
  particleA: Particle
  particleB: Particle
  position: THREE.Vector3
}

export interface BurstParticle {
  id: number
  position: THREE.Vector3
  velocity: THREE.Vector3
  color: THREE.Color
  life: number
  maxLife: number
  size: number
}

export class PhysicsEngine {
  private gravityPoint: THREE.Vector3 = new THREE.Vector3(0, 0, 0)
  private gravityStrength: number = 1
  private gravityPointColor: THREE.Color = new THREE.Color('#ffffff')
  private collisionListeners: ((event: CollisionEvent) => void)[] = []
  private burstParticles: BurstParticle[] = []
  private burstIdCounter: number = 0
  private collisionCooldown: Map<string, number> = new Map()

  constructor() {}

  update(particles: Particle[], deltaTime: number, connections: Array<{ particleA: Particle; particleB: Particle }>): BurstParticle[] {
    this.applyConnectionForces(particles, connections, deltaTime)
    this.detectCollisions(particles)
    this.updateBurstParticles(deltaTime)
    return this.burstParticles
  }

  private applyConnectionForces(
    particles: Particle[],
    connections: Array<{ particleA: Particle; particleB: Particle }>,
    deltaTime: number
  ) {
    for (const conn of connections) {
      const { particleA, particleB } = conn
      const direction = new THREE.Vector3().subVectors(particleB.position, particleA.position)
      const distance = direction.length()

      if (distance < 0.1) continue

      const force = 0.05 * deltaTime
      direction.normalize()

      const attraction = direction.clone().multiplyScalar(force)
      particleA.position.add(attraction)
      particleB.position.sub(attraction)

      for (const particle of particles) {
        if (particle === particleA || particle === particleB) continue

        const toLine = this.distanceToLine(particle.position, particleA.position, particleB.position)
        if (toLine < 2) {
          const pullStrength = (1 - toLine / 2) * 0.02 * deltaTime
          const closestPoint = this.closestPointOnLine(
            particle.position,
            particleA.position,
            particleB.position
          )
          const pullDir = new THREE.Vector3().subVectors(closestPoint, particle.position).normalize()
          particle.position.add(pullDir.multiplyScalar(pullStrength))
        }
      }
    }
  }

  private distanceToLine(point: THREE.Vector3, lineA: THREE.Vector3, lineB: THREE.Vector3): number {
    const lineDir = new THREE.Vector3().subVectors(lineB, lineA)
    const pointDir = new THREE.Vector3().subVectors(point, lineA)
    const cross = new THREE.Vector3().crossVectors(lineDir, pointDir)
    return cross.length() / lineDir.length()
  }

  private closestPointOnLine(point: THREE.Vector3, lineA: THREE.Vector3, lineB: THREE.Vector3): THREE.Vector3 {
    const lineDir = new THREE.Vector3().subVectors(lineB, lineA)
    const pointDir = new THREE.Vector3().subVectors(point, lineA)
    const t = Math.max(0, Math.min(1, pointDir.dot(lineDir) / lineDir.dot(lineDir)))
    return lineA.clone().add(lineDir.multiplyScalar(t))
  }

  private detectCollisions(particles: Particle[]) {
    const now = performance.now()

    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const pA = particles[i]
        const pB = particles[j]

        const key = [pA.id, pB.id].sort().join('-')
        const lastCollision = this.collisionCooldown.get(key)
        if (lastCollision && now - lastCollision < 500) continue

        const distance = pA.position.distanceTo(pB.position)
        const collisionDistance = (pA.size + pB.size) * 0.5

        if (distance < collisionDistance && (pA.isDensityBoosted || pB.isDensityBoosted)) {
          this.collisionCooldown.set(key, now)
          this.createBurstParticles(pA, pB)
          this.notifyCollision(pA, pB)
        }
      }
    }

    for (const [key, time] of this.collisionCooldown) {
      if (now - time > 1000) {
        this.collisionCooldown.delete(key)
      }
    }
  }

  private createBurstParticles(particleA: Particle, particleB: Particle) {
    const center = new THREE.Vector3()
      .addVectors(particleA.position, particleB.position)
      .multiplyScalar(0.5)

    const count = 6
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2
      const speed = 0.5 + Math.random() * 0.5
      const velocity = new THREE.Vector3(
        Math.cos(angle) * speed,
        (Math.random() - 0.5) * speed,
        Math.sin(angle) * speed
      )

      this.burstParticles.push({
        id: this.burstIdCounter++,
        position: center.clone(),
        velocity,
        color: particleA.color.clone().lerp(particleB.color, 0.5),
        life: 0.5,
        maxLife: 0.5,
        size: 0.3 + Math.random() * 0.3
      })
    }
  }

  private updateBurstParticles(deltaTime: number) {
    for (let i = this.burstParticles.length - 1; i >= 0; i--) {
      const bp = this.burstParticles[i]
      bp.position.add(bp.velocity.clone().multiplyScalar(deltaTime))
      bp.velocity.multiplyScalar(0.95)
      bp.life -= deltaTime

      if (bp.life <= 0) {
        this.burstParticles.splice(i, 1)
      }
    }
  }

  private notifyCollision(particleA: Particle, particleB: Particle) {
    const event: CollisionEvent = {
      particleA,
      particleB,
      position: new THREE.Vector3()
        .addVectors(particleA.position, particleB.position)
        .multiplyScalar(0.5)
    }

    for (const listener of this.collisionListeners) {
      listener(event)
    }
  }

  onCollision(listener: (event: CollisionEvent) => void) {
    this.collisionListeners.push(listener)
    return () => {
      const idx = this.collisionListeners.indexOf(listener)
      if (idx > -1) this.collisionListeners.splice(idx, 1)
    }
  }

  setGravityPoint(position: THREE.Vector3) {
    this.gravityPoint.copy(position)
  }

  getGravityPoint(): THREE.Vector3 {
    return this.gravityPoint.clone()
  }

  setGravityStrength(strength: number) {
    this.gravityStrength = strength
  }

  getGravityStrength(): number {
    return this.gravityStrength
  }

  setGravityPointColor(color: THREE.Color) {
    this.gravityPointColor.copy(color)
  }

  getGravityPointColor(): THREE.Color {
    return this.gravityPointColor.clone()
  }

  getBurstParticles(): BurstParticle[] {
    return this.burstParticles
  }

  isConnectionEnhanced(
    particleA: Particle,
    particleB: Particle
  ): boolean {
    const midPoint = new THREE.Vector3()
      .addVectors(particleA.position, particleB.position)
      .multiplyScalar(0.5)
    return midPoint.distanceTo(this.gravityPoint) < 4
  }

  getConnectionPulse(): number {
    return 0.5 + 0.5 * Math.sin(performance.now() * 0.002 * Math.PI)
  }
}
