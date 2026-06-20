import * as THREE from 'three'
import {
  randomRange,
  generateRandomLifetime,
  getFlameColor,
  ColorGradient,
  createCircleTexture,
  createSimplePointTexture
} from './utils'

interface Particle {
  position: THREE.Vector3
  velocity: THREE.Vector3
  color: THREE.Color
  size: number
  lifetime: number
  maxLifetime: number
  active: boolean
}

export interface FlameParams {
  particleCount: number
  particleSize: number
  riseSpeed: number
  driftAmount: number
  colorGradient: ColorGradient
  emissionInterval: number
  flameWidth: number
}

export const DEFAULT_FLAME_PARAMS: FlameParams = {
  particleCount: 1500,
  particleSize: 0.15,
  riseSpeed: 1.0,
  driftAmount: 0.3,
  colorGradient: 'orange-yellow',
  emissionInterval: 0.3,
  flameWidth: 1.5
}

export class Flame {
  private scene: THREE.Scene
  private particles: Particle[] = []
  private maxParticles: number = 3000
  private geometry: THREE.BufferGeometry
  private material: THREE.PointsMaterial
  private points: THREE.Points
  private positions: Float32Array
  private colors: Float32Array
  private sizes: Float32Array
  private circleTexture: THREE.Texture
  private simpleTexture: THREE.Texture
  private emissionTimer: number = 0
  private mouseWorldPos: THREE.Vector3 | null = null
  private mouseHovering: boolean = false
  public params: FlameParams

  constructor(scene: THREE.Scene, params?: Partial<FlameParams>) {
    this.scene = scene
    this.params = { ...DEFAULT_FLAME_PARAMS, ...params }

    this.circleTexture = createCircleTexture()
    this.simpleTexture = createSimplePointTexture()

    this.geometry = new THREE.BufferGeometry()
    this.positions = new Float32Array(this.maxParticles * 3)
    this.colors = new Float32Array(this.maxParticles * 3)
    this.sizes = new Float32Array(this.maxParticles)

    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3))
    this.geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3))
    this.geometry.setAttribute('size', new THREE.BufferAttribute(this.sizes, 1))

    this.material = new THREE.PointsMaterial({
      size: this.params.particleSize,
      vertexColors: true,
      transparent: true,
      opacity: 1.0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      map: this.params.particleCount > 2000 ? this.simpleTexture : this.circleTexture,
      sizeAttenuation: true
    })

    this.points = new THREE.Points(this.geometry, this.material)
    this.points.frustumCulled = false
    this.scene.add(this.points)

    this.initParticles()
    this.createGroundGlow()
  }

  private createGroundGlow(): void {
    const glowGeometry = new THREE.CircleGeometry(2, 64)
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: 0xff6600,
      transparent: true,
      opacity: 0.1,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })
    const glow = new THREE.Mesh(glowGeometry, glowMaterial)
    glow.rotation.x = -Math.PI / 2
    glow.position.y = -0.99
    this.scene.add(glow)
  }

  private initParticles(): void {
    this.particles = []
    for (let i = 0; i < this.maxParticles; i++) {
      this.particles.push({
        position: new THREE.Vector3(0, -100, 0),
        velocity: new THREE.Vector3(),
        color: new THREE.Color(0, 0, 0),
        size: 0,
        lifetime: 0,
        maxLifetime: 0,
        active: false
      })
      this.sizes[i] = 0
    }
    this.geometry.attributes.size.needsUpdate = true

    for (let i = 0; i < this.params.particleCount; i++) {
      this.emitParticle()
    }
  }

  private emitParticle(): void {
    const inactiveIndex = this.particles.findIndex(p => !p.active)
    if (inactiveIndex === -1) return

    const particle = this.particles[inactiveIndex]
    const angle = Math.random() * Math.PI * 2
    const radius = Math.sqrt(Math.random()) * this.params.flameWidth
    particle.position.set(
      Math.cos(angle) * radius,
      randomRange(-1, 0),
      Math.sin(angle) * radius
    )
    particle.velocity.set(
      randomRange(-0.5, 0.5) * this.params.driftAmount,
      randomRange(0.5, 2.0) * this.params.riseSpeed,
      randomRange(-0.5, 0.5) * this.params.driftAmount
    )
    particle.maxLifetime = generateRandomLifetime(3, 6)
    particle.lifetime = particle.maxLifetime
    particle.color = getFlameColor(0, this.params.colorGradient)
    particle.size = 0.08
    particle.active = true
  }

  public update(deltaTime: number): void {
    this.emissionTimer += deltaTime

    const particlesToEmit = Math.floor(this.emissionTimer / this.params.emissionInterval)
    if (particlesToEmit > 0) {
      this.emissionTimer -= particlesToEmit * this.params.emissionInterval
      const activeCount = this.particles.filter(p => p.active).length
      const availableSlots = this.params.particleCount - activeCount
      const actualEmit = Math.min(particlesToEmit, availableSlots, 20)
      for (let i = 0; i < actualEmit; i++) {
        this.emitParticle()
      }
    }

    for (let i = 0; i < this.particles.length; i++) {
      const particle = this.particles[i]
      if (!particle.active) {
        this.sizes[i] = 0
        continue
      }

      particle.lifetime -= deltaTime
      if (particle.lifetime <= 0) {
        particle.active = false
        this.sizes[i] = 0
        continue
      }

      const lifeRatio = 1 - particle.lifetime / particle.maxLifetime

      particle.position.x += particle.velocity.x * deltaTime
      particle.position.y += particle.velocity.y * deltaTime
      particle.position.z += particle.velocity.z * deltaTime

      particle.velocity.x += (Math.random() - 0.5) * this.params.driftAmount * deltaTime * 2
      particle.velocity.z += (Math.random() - 0.5) * this.params.driftAmount * deltaTime * 2

      if (this.mouseHovering && this.mouseWorldPos) {
        const dx = particle.position.x - this.mouseWorldPos.x
        const dy = particle.position.y - this.mouseWorldPos.y
        const dz = particle.position.z - this.mouseWorldPos.z
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz)
        if (dist < 2.0 && dist > 0.001) {
          const repelStrength = 0.02 * (1 - dist / 2.0)
          particle.position.x += (dx / dist) * repelStrength
          particle.position.y += (dy / dist) * repelStrength
          particle.position.z += (dz / dist) * repelStrength
        }
      }

      const currentRadiusAtY = this.params.flameWidth * (1 - lifeRatio * 0.67)
      const horizontalDist = Math.sqrt(
        particle.position.x * particle.position.x +
        particle.position.z * particle.position.z
      )
      if (horizontalDist > currentRadiusAtY) {
        const scale = currentRadiusAtY / horizontalDist
        particle.position.x *= scale
        particle.position.z *= scale
      }

      if (lifeRatio < 0.5) {
        particle.size = 0.08 + lifeRatio * 2 * 0.07
      } else {
        particle.size = 0.15 * (1 - (lifeRatio - 0.5) * 2)
      }

      const color = getFlameColor(lifeRatio, this.params.colorGradient)
      particle.color.copy(color)

      this.positions[i * 3] = particle.position.x
      this.positions[i * 3 + 1] = particle.position.y
      this.positions[i * 3 + 2] = particle.position.z

      this.colors[i * 3] = particle.color.r
      this.colors[i * 3 + 1] = particle.color.g
      this.colors[i * 3 + 2] = particle.color.b

      let alpha = 1.0
      if (particle.lifetime < 1.0) {
        alpha = particle.lifetime
      }
      this.sizes[i] = particle.size * this.params.particleSize * 10 * alpha
    }

    this.geometry.attributes.position.needsUpdate = true
    this.geometry.attributes.color.needsUpdate = true
    this.geometry.attributes.size.needsUpdate = true
  }

  public setParticleCount(count: number): void {
    this.params.particleCount = Math.max(500, Math.min(3000, count))
    this.material.map = count > 2000 ? this.simpleTexture : this.circleTexture
    this.material.needsUpdate = true
  }

  public setParticleSize(size: number): void {
    this.params.particleSize = size
  }

  public setRiseSpeed(speed: number): void {
    this.params.riseSpeed = speed
  }

  public setDriftAmount(amount: number): void {
    this.params.driftAmount = amount
  }

  public setColorGradient(gradient: ColorGradient): void {
    this.params.colorGradient = gradient
  }

  public setEmissionInterval(interval: number): void {
    this.params.emissionInterval = interval
  }

  public setFlameWidth(width: number): void {
    this.params.flameWidth = width
  }

  public setMouseWorldPosition(position: THREE.Vector3 | null): void {
    this.mouseWorldPos = position
    this.mouseHovering = position !== null
  }

  public getPoints(): THREE.Points {
    return this.points
  }

  public resetParams(): void {
    this.params = { ...DEFAULT_FLAME_PARAMS }
    this.material.map = this.params.particleCount > 2000 ? this.simpleTexture : this.circleTexture
    this.material.needsUpdate = true
  }

  public dispose(): void {
    this.geometry.dispose()
    this.material.dispose()
    this.circleTexture.dispose()
    this.simpleTexture.dispose()
    this.scene.remove(this.points)
  }
}
