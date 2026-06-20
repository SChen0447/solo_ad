import * as THREE from 'three'
import type { BuildingModel, FloorInfo } from '../models/BuildingModel'

interface Particle {
  position: THREE.Vector3
  velocity: THREE.Vector3
  life: number
  maxLife: number
  size: number
  floorIndex: number
  active: boolean
}

export class ParticleSystem {
  public readonly points: THREE.Points
  public readonly maxParticles: number = 200
  public readonly baseRiseSpeed: number = 0.2
  public readonly baseLife: number = 2.0
  public readonly abnormalThreshold: number = 0.7

  private readonly scene: THREE.Scene
  private readonly buildingModel: BuildingModel
  private particles: Particle[] = []
  private geometry: THREE.BufferGeometry
  private material: THREE.PointsMaterial
  private positions: Float32Array
  private colors: Float32Array
  private sizes: Float32Array
  private spawnTimers: Map<number, number> = new Map()
  private floorParticleCounts: Map<number, number> = new Map()
  private enabled: boolean = true

  private readonly particleColor: THREE.Color = new THREE.Color(0xff5500)

  constructor(scene: THREE.Scene, buildingModel: BuildingModel) {
    this.scene = scene
    this.buildingModel = buildingModel

    this.positions = new Float32Array(this.maxParticles * 3)
    this.colors = new Float32Array(this.maxParticles * 3)
    this.sizes = new Float32Array(this.maxParticles)

    for (let i = 0; i < this.maxParticles; i++) {
      this.positions[i * 3] = 0
      this.positions[i * 3 + 1] = -10000
      this.positions[i * 3 + 2] = 0

      this.colors[i * 3] = this.particleColor.r
      this.colors[i * 3 + 1] = this.particleColor.g
      this.colors[i * 3 + 2] = this.particleColor.b

      this.sizes[i] = 0
    }

    this.geometry = new THREE.BufferGeometry()
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3))
    this.geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3))
    this.geometry.setAttribute('size', new THREE.BufferAttribute(this.sizes, 1))

    this.material = new THREE.PointsMaterial({
      size: 0.2,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true
    })

    this.points = new THREE.Points(this.geometry, this.material)
    this.points.name = 'EnergyParticles'
    this.points.frustumCulled = false

    for (let i = 0; i < this.maxParticles; i++) {
      this.particles.push({
        position: new THREE.Vector3(0, -10000, 0),
        velocity: new THREE.Vector3(),
        life: 0,
        maxLife: this.baseLife,
        size: 0.2,
        floorIndex: -1,
        active: false
      })
    }

    const floorInfos = this.buildingModel.getAllFloorInfos()
    for (const info of floorInfos) {
      this.spawnTimers.set(info.floorIndex, 0)
      this.floorParticleCounts.set(info.floorIndex, 0)
    }

    this.scene.add(this.points)
  }

  public setEnabled(enabled: boolean): void {
    this.enabled = enabled
    if (!enabled) {
      this.clearAllParticles()
    }
  }

  public isEnabled(): boolean {
    return this.enabled
  }

  public toggleEnabled(): boolean {
    this.setEnabled(!this.enabled)
    return this.enabled
  }

  public updateFloorAbnormalState(
    floorStates: Array<{ floor: number; consumption: number }>
  ): void {
    for (const state of floorStates) {
      const floorInfo = this.buildingModel.getFloorInfo(state.floor)
      if (!floorInfo) continue

      const targetCount = this.computeTargetParticleCount(state.consumption)
      this.floorParticleCounts.set(state.floor, targetCount)
    }
  }

  public update(deltaTime: number): void {
    if (!this.enabled) {
      this.updateBuffers()
      return
    }

    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i]
      if (!p.active) continue

      p.life -= deltaTime
      if (p.life <= 0) {
        this.deactivateParticle(i)
        continue
      }

      p.position.addScaledVector(p.velocity, deltaTime)
      const floorInfo = this.buildingModel.getFloorInfo(p.floorIndex)
      if (floorInfo) {
        const topY = floorInfo.position.y + floorInfo.size.y / 2 + 2.0
        if (p.position.y >= topY) {
          this.deactivateParticle(i)
          continue
        }
      }

      const lifeRatio = p.life / p.maxLife
      this.positions[i * 3] = p.position.x
      this.positions[i * 3 + 1] = p.position.y
      this.positions[i * 3 + 2] = p.position.z
      this.sizes[i] = p.size * (0.5 + lifeRatio * 0.5)

      const fadeAlpha = Math.min(1, lifeRatio * 2)
      this.colors[i * 3] = this.particleColor.r
      this.colors[i * 3 + 1] = this.particleColor.g * (0.7 + fadeAlpha * 0.3)
      this.colors[i * 3 + 2] = this.particleColor.b * fadeAlpha
    }

    this.processSpawning(deltaTime)
    this.updateBuffers()
  }

  public dispose(): void {
    this.geometry.dispose()
    this.material.dispose()
    this.scene.remove(this.points)
  }

  private computeTargetParticleCount(consumption: number): number {
    if (consumption <= this.abnormalThreshold) {
      return 0
    }
    const t = (consumption - this.abnormalThreshold) / (1.0 - this.abnormalThreshold)
    return Math.round(10 + t * 20)
  }

  private processSpawning(deltaTime: number): void {
    const floorInfos = this.buildingModel.getAllFloorInfos()

    for (const floorInfo of floorInfos) {
      const targetCount = this.floorParticleCounts.get(floorInfo.floorIndex) ?? 0
      if (targetCount <= 0) continue

      const currentCount = this.countActiveParticlesForFloor(floorInfo.floorIndex)
      if (currentCount >= targetCount) continue

      const spawnInterval = this.baseLife / targetCount
      let timer = this.spawnTimers.get(floorInfo.floorIndex) ?? 0
      timer += deltaTime

      while (timer >= spawnInterval && currentCount < targetCount) {
        if (this.trySpawnParticle(floorInfo)) {
          timer -= spawnInterval
        } else {
          break
        }
      }
      this.spawnTimers.set(floorInfo.floorIndex, timer)
    }
  }

  private countActiveParticlesForFloor(floorIndex: number): number {
    let count = 0
    for (const p of this.particles) {
      if (p.active && p.floorIndex === floorIndex) {
        count++
      }
    }
    return count
  }

  private trySpawnParticle(floorInfo: FloorInfo): boolean {
    const slotIndex = this.findInactiveSlot()
    if (slotIndex === -1) {
      return false
    }

    const halfWidth = floorInfo.size.x / 2
    const halfDepth = floorInfo.size.z / 2
    const baseY = floorInfo.position.y - floorInfo.size.y / 2

    const spawnX = floorInfo.position.x + (Math.random() - 0.5) * halfWidth * 1.8
    const spawnZ = floorInfo.position.z + (Math.random() - 0.5) * halfDepth * 1.8
    const spawnY = baseY + Math.random() * floorInfo.size.y * 0.5

    const particle = this.particles[slotIndex]
    particle.position.set(spawnX, spawnY, spawnZ)
    particle.velocity.set(
      (Math.random() - 0.5) * 0.15,
      this.baseRiseSpeed + Math.random() * 0.1,
      (Math.random() - 0.5) * 0.15
    )
    particle.maxLife = this.baseLife + (Math.random() - 0.5) * 0.5
    particle.life = particle.maxLife
    particle.size = 0.1 + Math.random() * 0.2
    particle.floorIndex = floorInfo.floorIndex
    particle.active = true

    return true
  }

  private findInactiveSlot(): number {
    for (let i = 0; i < this.particles.length; i++) {
      if (!this.particles[i].active) {
        return i
      }
    }
    return -1
  }

  private deactivateParticle(index: number): void {
    const p = this.particles[index]
    if (!p.active) return

    p.active = false
    p.floorIndex = -1
    p.position.set(0, -10000, 0)
    this.positions[index * 3] = 0
    this.positions[index * 3 + 1] = -10000
    this.positions[index * 3 + 2] = 0
    this.sizes[index] = 0
  }

  private clearAllParticles(): void {
    for (let i = 0; i < this.particles.length; i++) {
      this.deactivateParticle(i)
    }
    this.updateBuffers()
  }

  private updateBuffers(): void {
    const posAttr = this.geometry.getAttribute('position') as THREE.BufferAttribute
    const colorAttr = this.geometry.getAttribute('color') as THREE.BufferAttribute
    const sizeAttr = this.geometry.getAttribute('size') as THREE.BufferAttribute

    posAttr.array = this.positions
    colorAttr.array = this.colors
    sizeAttr.array = this.sizes

    posAttr.needsUpdate = true
    colorAttr.needsUpdate = true
    sizeAttr.needsUpdate = true

    this.geometry.computeBoundingSphere()
  }
}
