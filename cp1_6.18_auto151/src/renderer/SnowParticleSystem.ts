import * as THREE from 'three'

export class SnowParticleSystem {
  private particleCount: number
  private geometry: THREE.BufferGeometry
  private material: THREE.PointsMaterial
  private points: THREE.Points
  private velocities: Float32Array
  private rotations: Float32Array
  private rotationSpeeds: Float32Array
  private bounds: { minX: number; maxX: number; minY: number; maxY: number; minZ: number; maxZ: number }

  constructor(count: number = 200) {
    this.particleCount = count
    this.bounds = {
      minX: -6,
      maxX: 6,
      minY: -2,
      maxY: 8,
      minZ: -6,
      maxZ: 6
    }

    this.geometry = new THREE.BufferGeometry()
    this.velocities = new Float32Array(count)
    this.rotations = new Float32Array(count)
    this.rotationSpeeds = new Float32Array(count)

    const positions = new Float32Array(count * 3)
    const sizes = new Float32Array(count)

    for (let i = 0; i < count; i++) {
      const i3 = i * 3
      positions[i3] = this.randomRange(this.bounds.minX, this.bounds.maxX)
      positions[i3 + 1] = this.randomRange(this.bounds.minY, this.bounds.maxY)
      positions[i3 + 2] = this.randomRange(this.bounds.minZ, this.bounds.maxZ)

      this.velocities[i] = this.randomRange(0.3, 0.8)
      this.rotations[i] = Math.random() * Math.PI * 2
      this.rotationSpeeds[i] = this.randomRange(0.5, 1.5) * (Math.random() > 0.5 ? 1 : -1)
      sizes[i] = this.randomRange(0.02, 0.06)
    }

    this.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    this.geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1))

    this.material = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.05,
      transparent: true,
      opacity: 0.7,
      sizeAttenuation: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })

    this.points = new THREE.Points(this.geometry, this.material)
  }

  private randomRange(min: number, max: number): number {
    return min + Math.random() * (max - min)
  }

  getPoints(): THREE.Points {
    return this.points
  }

  update(deltaTime: number): void {
    const positions = this.geometry.attributes.position.array as Float32Array

    for (let i = 0; i < this.particleCount; i++) {
      const i3 = i * 3

      positions[i3 + 1] -= this.velocities[i] * deltaTime

      this.rotations[i] += this.rotationSpeeds[i] * deltaTime
      positions[i3] += Math.sin(this.rotations[i]) * 0.1 * deltaTime

      if (positions[i3 + 1] < this.bounds.minY) {
        positions[i3 + 1] = this.bounds.maxY
        positions[i3] = this.randomRange(this.bounds.minX, this.bounds.maxX)
        positions[i3 + 2] = this.randomRange(this.bounds.minZ, this.bounds.maxZ)
      }
    }

    this.geometry.attributes.position.needsUpdate = true
  }

  dispose(): void {
    this.geometry.dispose()
    this.material.dispose()
  }
}
