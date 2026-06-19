import * as THREE from 'three'

export class RainSystem {
  public rainIntensity: number = 0
  public particleCount: number = 0

  private particles: THREE.Points
  private positions: Float32Array
  private velocities: Float32Array
  private sizes: Float32Array

  private scene: THREE.Scene
  private maxParticles: number
  private bounds: { minX: number; maxX: number; minZ: number; maxZ: number; height: number }
  private spawnTimer: number = 0
  private activeFlags: Uint8Array

  constructor(
    scene: THREE.Scene,
    maxParticles: number = 5000,
    bounds: { minX: number; maxX: number; minZ: number; maxZ: number; height: number }
  ) {
    this.scene = scene
    this.maxParticles = maxParticles
    this.bounds = bounds

    this.positions = new Float32Array(maxParticles * 3)
    this.velocities = new Float32Array(maxParticles)
    this.sizes = new Float32Array(maxParticles)
    this.activeFlags = new Uint8Array(maxParticles)

    for (let i = 0; i < maxParticles; i++) {
      this.positions[i * 3] = 0
      this.positions[i * 3 + 1] = -10
      this.positions[i * 3 + 2] = 0
      this.velocities[i] = 0
      this.sizes[i] = 0
      this.activeFlags[i] = 0
    }

    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3))
    geometry.setAttribute('size', new THREE.BufferAttribute(this.sizes, 1))

    const material = new THREE.PointsMaterial({
      color: 0xffffff,
      transparent: true,
      sizeAttenuation: true,
      opacity: 0.6
    })

    this.particles = new THREE.Points(geometry, material)
    this.scene.add(this.particles)
  }

  public update(deltaTime: number): void {
    const intensityFactor = this.rainIntensity / 200
    const spawnRate = intensityFactor * this.maxParticles
    this.spawnTimer += spawnRate * deltaTime

    const positions = this.positions
    const velocities = this.velocities
    const sizes = this.sizes
    const activeFlags = this.activeFlags
    const bounds = this.bounds
    const maxParticles = this.maxParticles

    for (let i = 0; i < maxParticles; i++) {
      const i3 = i * 3

      if (activeFlags[i] === 1) {
        positions[i3 + 1] -= velocities[i] * deltaTime

        if (positions[i3 + 1] < -1) {
          if (this.rainIntensity > 0 && this.spawnTimer > 0) {
            positions[i3] = bounds.minX + Math.random() * (bounds.maxX - bounds.minX)
            positions[i3 + 1] = bounds.height
            positions[i3 + 2] = bounds.minZ + Math.random() * (bounds.maxZ - bounds.minZ)
            velocities[i] = (2 + Math.random() * 3) * intensityFactor
            sizes[i] = 0.05 + Math.random() * 0.1
            this.spawnTimer--
          } else {
            activeFlags[i] = 0
            positions[i3 + 1] = -10
            this.particleCount--
          }
        }
      } else if (this.spawnTimer > 0 && this.rainIntensity > 0) {
        activeFlags[i] = 1
        positions[i3] = bounds.minX + Math.random() * (bounds.maxX - bounds.minX)
        positions[i3 + 1] = bounds.height
        positions[i3 + 2] = bounds.minZ + Math.random() * (bounds.maxZ - bounds.minZ)
        velocities[i] = (2 + Math.random() * 3) * intensityFactor
        sizes[i] = 0.05 + Math.random() * 0.1
        this.spawnTimer--
        this.particleCount++
      }
    }

    const positionAttr = this.particles.geometry.getAttribute('position') as THREE.BufferAttribute
    const sizeAttr = this.particles.geometry.getAttribute('size') as THREE.BufferAttribute
    positionAttr.needsUpdate = true
    sizeAttr.needsUpdate = true
  }

  public setIntensity(intensity: number): void {
    this.rainIntensity = Math.max(0, Math.min(200, intensity))
  }

  public reset(): void {
    this.rainIntensity = 0
    this.spawnTimer = 0
    this.particleCount = 0

    for (let i = 0; i < this.maxParticles; i++) {
      this.activeFlags[i] = 0
      this.positions[i * 3 + 1] = -10
    }

    const positionAttr = this.particles.geometry.getAttribute('position') as THREE.BufferAttribute
    positionAttr.needsUpdate = true
  }

  public getActiveCount(): number {
    return this.particleCount
  }
}
