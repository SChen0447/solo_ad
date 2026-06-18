import * as THREE from 'three'
import type { ParticleData } from './ParticleSystem'

export class ParticleRenderer {
  private points: THREE.Points
  private geometry: THREE.BufferGeometry
  private material: THREE.PointsMaterial
  private particleCount: number
  private positionAttribute: THREE.BufferAttribute
  private colorAttribute: THREE.BufferAttribute
  private sizeAttribute: THREE.BufferAttribute

  constructor(count: number) {
    this.particleCount = count
    this.geometry = new THREE.BufferGeometry()
    this.material = new THREE.PointsMaterial({
      size: 0.05,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true
    })

    const positions = new Float32Array(count * 3)
    const colors = new Float32Array(count * 3)
    const sizes = new Float32Array(count)

    this.positionAttribute = new THREE.BufferAttribute(positions, 3)
    this.colorAttribute = new THREE.BufferAttribute(colors, 3)
    this.sizeAttribute = new THREE.BufferAttribute(sizes, 1)

    this.geometry.setAttribute('position', this.positionAttribute)
    this.geometry.setAttribute('color', this.colorAttribute)

    this.points = new THREE.Points(this.geometry, this.material)
    this.points.frustumCulled = false
  }

  getPoints(): THREE.Points {
    return this.points
  }

  getGeometry(): THREE.BufferGeometry {
    return this.geometry
  }

  getMaterial(): THREE.PointsMaterial {
    return this.material
  }

  setCount(count: number) {
    if (count === this.particleCount) return

    this.particleCount = count

    const positions = new Float32Array(count * 3)
    const colors = new Float32Array(count * 3)
    const sizes = new Float32Array(count)

    const oldPositions = this.positionAttribute.array as Float32Array
    const oldColors = this.colorAttribute.array as Float32Array

    const copyCount = Math.min(this.particleCount, count)
    for (let i = 0; i < copyCount; i++) {
      positions[i * 3] = oldPositions[i * 3]
      positions[i * 3 + 1] = oldPositions[i * 3 + 1]
      positions[i * 3 + 2] = oldPositions[i * 3 + 2]
      colors[i * 3] = oldColors[i * 3]
      colors[i * 3 + 1] = oldColors[i * 3 + 1]
      colors[i * 3 + 2] = oldColors[i * 3 + 2]
    }

    this.positionAttribute = new THREE.BufferAttribute(positions, 3)
    this.colorAttribute = new THREE.BufferAttribute(colors, 3)
    this.sizeAttribute = new THREE.BufferAttribute(sizes, 1)

    this.geometry.setAttribute('position', this.positionAttribute)
    this.geometry.setAttribute('color', this.colorAttribute)

    this.geometry.setDrawRange(0, count)
    this.geometry.computeBoundingSphere()
  }

  updateGeometry(data: ParticleData, count: number) {
    const positions = this.positionAttribute.array as Float32Array
    const colors = this.colorAttribute.array as Float32Array

    for (let i = 0; i < count; i++) {
      const idx3 = i * 3
      positions[idx3] = data.positions[idx3]
      positions[idx3 + 1] = data.positions[idx3 + 1]
      positions[idx3 + 2] = data.positions[idx3 + 2]

      colors[idx3] = data.colors[idx3]
      colors[idx3 + 1] = data.colors[idx3 + 1]
      colors[idx3 + 2] = data.colors[idx3 + 2]
    }

    this.positionAttribute.needsUpdate = true
    this.colorAttribute.needsUpdate = true
    this.geometry.computeBoundingSphere()
  }

  dispose() {
    this.geometry.dispose()
    this.material.dispose()
  }
}

export class SparkSystem {
  private particles: Array<{
    position: THREE.Vector3
    velocity: THREE.Vector3
    color: THREE.Color
    life: number
    maxLife: number
    size: number
  }> = []
  private points: THREE.Points
  private geometry: THREE.BufferGeometry
  private material: THREE.PointsMaterial
  private maxSparks: number = 500
  private activeCount: number = 0

  constructor() {
    this.geometry = new THREE.BufferGeometry()
    this.material = new THREE.PointsMaterial({
      size: 0.08,
      vertexColors: true,
      transparent: true,
      opacity: 1,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })

    const positions = new Float32Array(this.maxSparks * 3)
    const colors = new Float32Array(this.maxSparks * 3)

    this.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    this.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    this.geometry.setDrawRange(0, 0)

    this.points = new THREE.Points(this.geometry, this.material)
    this.points.frustumCulled = false
  }

  getPoints(): THREE.Points {
    return this.points
  }

  emit(position: THREE.Vector3, color: THREE.Color, count: number = 15) {
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxSparks) {
        const old = this.particles.shift()
        if (old) {
          old.position.copy(position)
          old.velocity.set(
            (Math.random() - 0.5) * 4,
            (Math.random() - 0.5) * 4,
            (Math.random() - 0.5) * 4
          )
          old.color.copy(color)
          old.life = 0
          old.maxLife = 0.5 + Math.random() * 0.5
          old.size = 0.03 + Math.random() * 0.05
          this.particles.push(old)
        }
      } else {
        this.particles.push({
          position: position.clone(),
          velocity: new THREE.Vector3(
            (Math.random() - 0.5) * 4,
            (Math.random() - 0.5) * 4,
            (Math.random() - 0.5) * 4
          ),
          color: color.clone(),
          life: 0,
          maxLife: 0.5 + Math.random() * 0.5,
          size: 0.03 + Math.random() * 0.05
        })
      }
    }
  }

  update(dt: number) {
    const positions = this.geometry.attributes.position.array as Float32Array
    const colors = this.geometry.attributes.color.array as Float32Array

    this.activeCount = 0

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i]
      p.life += dt

      if (p.life >= p.maxLife) {
        this.particles.splice(i, 1)
        continue
      }

      p.position.add(p.velocity.clone().multiplyScalar(dt))
      p.velocity.multiplyScalar(0.95)

      const lifeRatio = p.life / p.maxLife
      const alpha = 1 - lifeRatio

      const idx3 = this.activeCount * 3
      positions[idx3] = p.position.x
      positions[idx3 + 1] = p.position.y
      positions[idx3 + 2] = p.position.z

      colors[idx3] = p.color.r * alpha
      colors[idx3 + 1] = p.color.g * alpha
      colors[idx3 + 2] = p.color.b * alpha

      this.activeCount++
    }

    this.geometry.setDrawRange(0, this.activeCount)
    this.geometry.attributes.position.needsUpdate = true
    this.geometry.attributes.color.needsUpdate = true
    this.geometry.computeBoundingSphere()
  }

  dispose() {
    this.geometry.dispose()
    this.material.dispose()
  }
}
