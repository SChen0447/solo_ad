import * as THREE from 'three'
import type { MotionMode, ColorMode, SizeMode } from '../store'

export interface ParticleData {
  positions: Float32Array
  colors: Float32Array
  sizes: Float32Array
  velocities: Float32Array
  lifetimes: Float32Array
  maxLifetimes: Float32Array
  hueOffsets: Float32Array
  initialSizes: Float32Array
  initialPositions: Float32Array
  targetVelocities: Float32Array
  previousVelocities: Float32Array
}

export class ParticleSystem {
  private particleCount: number
  private data: ParticleData
  private time: number = 0
  private gravityPosition: THREE.Vector3 = new THREE.Vector3(0, 0, 0)
  private isGravityActive: boolean = false
  private motionMode: MotionMode = 'random'
  private previousMode: MotionMode = 'random'
  private transitionProgress: number = 1
  private particleSpeed: number = 1.0
  private startColor: THREE.Color = new THREE.Color(0x00d4ff)
  private endColor: THREE.Color = new THREE.Color(0x7b2ff7)
  private colorMode: ColorMode = 'linear'
  private sizeMode: SizeMode = 'constant'
  private explosionProgress: number = 0
  private isExploding: boolean = false
  private absorbedParticles: Set<number> = new Set()
  private sparkCallback?: (position: THREE.Vector3, color: THREE.Color) => void

  constructor(count: number) {
    this.particleCount = count
    this.data = this.createParticleData(count)
    this.initializeExplosion()
  }

  private createParticleData(count: number): ParticleData {
    return {
      positions: new Float32Array(count * 3),
      colors: new Float32Array(count * 3),
      sizes: new Float32Array(count),
      velocities: new Float32Array(count * 3),
      lifetimes: new Float32Array(count),
      maxLifetimes: new Float32Array(count),
      hueOffsets: new Float32Array(count),
      initialSizes: new Float32Array(count),
      initialPositions: new Float32Array(count * 3),
      targetVelocities: new Float32Array(count * 3),
      previousVelocities: new Float32Array(count * 3)
    }
  }

  private initializeExplosion() {
    for (let i = 0; i < this.particleCount; i++) {
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      const speed = 0.5 + Math.random() * 1.5

      const vx = Math.sin(phi) * Math.cos(theta) * speed
      const vy = Math.sin(phi) * Math.sin(theta) * speed
      const vz = Math.cos(phi) * speed

      this.data.positions[i * 3] = 0
      this.data.positions[i * 3 + 1] = 0
      this.data.positions[i * 3 + 2] = 0

      this.data.velocities[i * 3] = vx
      this.data.velocities[i * 3 + 1] = vy
      this.data.velocities[i * 3 + 2] = vz

      this.data.previousVelocities[i * 3] = vx
      this.data.previousVelocities[i * 3 + 1] = vy
      this.data.previousVelocities[i * 3 + 2] = vz

      this.data.targetVelocities[i * 3] = vx
      this.data.targetVelocities[i * 3 + 1] = vy
      this.data.targetVelocities[i * 3 + 2] = vz

      const hue = Math.random()
      this.data.hueOffsets[i] = hue
      const color = new THREE.Color().setHSL(hue, 1, 0.6)
      this.data.colors[i * 3] = color.r
      this.data.colors[i * 3 + 1] = color.g
      this.data.colors[i * 3 + 2] = color.b

      const size = 0.02 + Math.random() * 0.08
      this.data.sizes[i] = size
      this.data.initialSizes[i] = size

      const lifetime = 3 + Math.random() * 5
      this.data.lifetimes[i] = Math.random() * lifetime
      this.data.maxLifetimes[i] = lifetime

      this.data.initialPositions[i * 3] = 0
      this.data.initialPositions[i * 3 + 1] = 0
      this.data.initialPositions[i * 3 + 2] = 0
    }
  }

  setParticleCount(count: number) {
    if (count === this.particleCount) return
    const oldCount = this.particleCount
    this.particleCount = count
    const oldData = this.data
    this.data = this.createParticleData(count)

    const copyCount = Math.min(oldCount, count)
    for (let i = 0; i < copyCount; i++) {
      this.data.positions[i * 3] = oldData.positions[i * 3]
      this.data.positions[i * 3 + 1] = oldData.positions[i * 3 + 1]
      this.data.positions[i * 3 + 2] = oldData.positions[i * 3 + 2]
      this.data.colors[i * 3] = oldData.colors[i * 3]
      this.data.colors[i * 3 + 1] = oldData.colors[i * 3 + 1]
      this.data.colors[i * 3 + 2] = oldData.colors[i * 3 + 2]
      this.data.sizes[i] = oldData.sizes[i]
      this.data.velocities[i * 3] = oldData.velocities[i * 3]
      this.data.velocities[i * 3 + 1] = oldData.velocities[i * 3 + 1]
      this.data.velocities[i * 3 + 2] = oldData.velocities[i * 3 + 2]
      this.data.lifetimes[i] = oldData.lifetimes[i]
      this.data.maxLifetimes[i] = oldData.maxLifetimes[i]
      this.data.hueOffsets[i] = oldData.hueOffsets[i]
      this.data.initialSizes[i] = oldData.initialSizes[i]
      this.data.initialPositions[i * 3] = oldData.initialPositions[i * 3]
      this.data.initialPositions[i * 3 + 1] = oldData.initialPositions[i * 3 + 1]
      this.data.initialPositions[i * 3 + 2] = oldData.initialPositions[i * 3 + 2]
      this.data.targetVelocities[i * 3] = oldData.targetVelocities[i * 3]
      this.data.targetVelocities[i * 3 + 1] = oldData.targetVelocities[i * 3 + 1]
      this.data.targetVelocities[i * 3 + 2] = oldData.targetVelocities[i * 3 + 2]
      this.data.previousVelocities[i * 3] = oldData.previousVelocities[i * 3]
      this.data.previousVelocities[i * 3 + 1] = oldData.previousVelocities[i * 3 + 1]
      this.data.previousVelocities[i * 3 + 2] = oldData.previousVelocities[i * 3 + 2]
    }

    if (count > oldCount) {
      for (let i = oldCount; i < count; i++) {
        const theta = Math.random() * Math.PI * 2
        const phi = Math.acos(2 * Math.random() - 1)
        const speed = 0.5 + Math.random() * 1.5

        const vx = Math.sin(phi) * Math.cos(theta) * speed
        const vy = Math.sin(phi) * Math.sin(theta) * speed
        const vz = Math.cos(phi) * speed

        this.data.positions[i * 3] = 0
        this.data.positions[i * 3 + 1] = 0
        this.data.positions[i * 3 + 2] = 0

        this.data.velocities[i * 3] = vx
        this.data.velocities[i * 3 + 1] = vy
        this.data.velocities[i * 3 + 2] = vz

        this.data.previousVelocities[i * 3] = vx
        this.data.previousVelocities[i * 3 + 1] = vy
        this.data.previousVelocities[i * 3 + 2] = vz

        this.data.targetVelocities[i * 3] = vx
        this.data.targetVelocities[i * 3 + 1] = vy
        this.data.targetVelocities[i * 3 + 2] = vz

        const hue = Math.random()
        this.data.hueOffsets[i] = hue
        const color = new THREE.Color().setHSL(hue, 1, 0.6)
        this.data.colors[i * 3] = color.r
        this.data.colors[i * 3 + 1] = color.g
        this.data.colors[i * 3 + 2] = color.b

        const size = 0.02 + Math.random() * 0.08
        this.data.sizes[i] = size
        this.data.initialSizes[i] = size

        const lifetime = 3 + Math.random() * 5
        this.data.lifetimes[i] = Math.random() * lifetime
        this.data.maxLifetimes[i] = lifetime
      }
    }
  }

  setMotionMode(mode: MotionMode, previous: MotionMode) {
    this.previousMode = previous
    this.motionMode = mode
    this.transitionProgress = 0
    this.calculateTargetVelocities(mode)
    this.savePreviousVelocities()
  }

  setTransitionProgress(progress: number) {
    this.transitionProgress = progress
  }

  private savePreviousVelocities() {
    for (let i = 0; i < this.particleCount; i++) {
      this.data.previousVelocities[i * 3] = this.data.velocities[i * 3]
      this.data.previousVelocities[i * 3 + 1] = this.data.velocities[i * 3 + 1]
      this.data.previousVelocities[i * 3 + 2] = this.data.velocities[i * 3 + 2]
    }
  }

  private calculateTargetVelocities(mode: MotionMode) {
    for (let i = 0; i < this.particleCount; i++) {
      const px = this.data.positions[i * 3]
      const py = this.data.positions[i * 3 + 1]
      const pz = this.data.positions[i * 3 + 2]

      let vx: number, vy: number, vz: number

      switch (mode) {
        case 'random':
          const theta1 = Math.random() * Math.PI * 2
          const phi1 = Math.acos(2 * Math.random() - 1)
          const speed1 = this.particleSpeed * (0.3 + Math.random() * 0.7)
          vx = Math.sin(phi1) * Math.cos(theta1) * speed1
          vy = Math.sin(phi1) * Math.sin(theta1) * speed1
          vz = Math.cos(phi1) * speed1
          break

        case 'vortex':
          const angle = Math.atan2(pz, px)
          const radius = Math.sqrt(px * px + pz * pz) + 0.001
          const vortexSpeed = this.particleSpeed * 1.5
          vx = -Math.sin(angle) * vortexSpeed
          vz = Math.cos(angle) * vortexSpeed
          vy = (Math.random() - 0.5) * 0.3 + py * -0.2
          break

        case 'gravity':
          const dx = this.gravityPosition.x - px
          const dy = this.gravityPosition.y - py
          const dz = this.gravityPosition.z - pz
          const dist = Math.sqrt(dx * dx + dy * dy + dz * dz) + 0.001
          const gravityStrength = this.particleSpeed * 2
          vx = (dx / dist) * gravityStrength
          vy = (dy / dist) * gravityStrength
          vz = (dz / dist) * gravityStrength
          break

        case 'explosion':
          const ex = px || (Math.random() - 0.5) * 0.1
          const ey = py || (Math.random() - 0.5) * 0.1
          const ez = pz || (Math.random() - 0.5) * 0.1
          const eDist = Math.sqrt(ex * ex + ey * ey + ez * ez) + 0.001
          const explosionSpeed = this.particleSpeed * 8
          vx = (ex / eDist) * explosionSpeed
          vy = (ey / eDist) * explosionSpeed
          vz = (ez / eDist) * explosionSpeed
          break

        default:
          vx = 0
          vy = 0
          vz = 0
      }

      this.data.targetVelocities[i * 3] = vx
      this.data.targetVelocities[i * 3 + 1] = vy
      this.data.targetVelocities[i * 3 + 2] = vz
    }
  }

  setGravityPosition(pos: THREE.Vector3) {
    this.gravityPosition.copy(pos)
  }

  setIsGravityActive(active: boolean) {
    this.isGravityActive = active
  }

  setParticleSpeed(speed: number) {
    this.particleSpeed = speed
  }

  setStartColor(color: string) {
    this.startColor = new THREE.Color(color)
  }

  setEndColor(color: string) {
    this.endColor = new THREE.Color(color)
  }

  setColorMode(mode: ColorMode) {
    this.colorMode = mode
  }

  setSizeMode(mode: SizeMode) {
    this.sizeMode = mode
  }

  setExplosionProgress(progress: number) {
    this.explosionProgress = progress
  }

  setIsExploding(exploding: boolean) {
    this.isExploding = exploding
  }

  setSparkCallback(callback: (position: THREE.Vector3, color: THREE.Color) => void) {
    this.sparkCallback = callback
  }

  triggerExplosion() {
    this.isExploding = true
    this.explosionProgress = 0
    this.previousMode = this.motionMode
    this.motionMode = 'explosion'
    this.savePreviousVelocities()
    this.calculateTargetVelocities('explosion')
    this.transitionProgress = 0
  }

  getData(): ParticleData {
    return this.data
  }

  getCount(): number {
    return this.particleCount
  }

  update(dt: number) {
    this.time += dt

    const speedMultiplier = this.isExploding
      ? 1 - this.explosionProgress * 0.7
      : 1

    if (!this.isExploding && this.transitionProgress < 1) {
      this.transitionProgress = Math.min(this.transitionProgress + dt / 0.8, 1)
    }

    const t = this.transitionProgress
    const easeT = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2

    for (let i = 0; i < this.particleCount; i++) {
      if (this.absorbedParticles.has(i)) continue

      const idx3 = i * 3

      let vx = this.data.velocities[idx3]
      let vy = this.data.velocities[idx3 + 1]
      let vz = this.data.velocities[idx3 + 2]

      if (this.isExploding || this.transitionProgress < 1) {
        const pvx = this.data.previousVelocities[idx3]
        const pvy = this.data.previousVelocities[idx3 + 1]
        const pvz = this.data.previousVelocities[idx3 + 2]
        const tvx = this.data.targetVelocities[idx3]
        const tvy = this.data.targetVelocities[idx3 + 1]
        const tvz = this.data.targetVelocities[idx3 + 2]

        vx = pvx + (tvx - pvx) * easeT
        vy = pvy + (tvy - pvy) * easeT
        vz = pvz + (tvz - pvz) * easeT
      } else if (this.motionMode === 'random') {
        vx += (Math.random() - 0.5) * this.particleSpeed * dt * 2
        vy += (Math.random() - 0.5) * this.particleSpeed * dt * 2
        vz += (Math.random() - 0.5) * this.particleSpeed * dt * 2

        const speed = Math.sqrt(vx * vx + vy * vy + vz * vz)
        if (speed > this.particleSpeed * 2) {
          const scale = (this.particleSpeed * 2) / speed
          vx *= scale
          vy *= scale
          vz *= scale
        }
      } else if (this.motionMode === 'vortex') {
        const px = this.data.positions[idx3]
        const py = this.data.positions[idx3 + 1]
        const pz = this.data.positions[idx3 + 2]

        const angle = Math.atan2(pz, px)
        const radius = Math.sqrt(px * px + pz * pz) + 0.001

        const vortexSpeed = this.particleSpeed * 1.5
        const targetVx = -Math.sin(angle) * vortexSpeed
        const targetVz = Math.cos(angle) * vortexSpeed
        const targetVy = -py * 0.3 + (Math.random() - 0.5) * 0.2

        vx += (targetVx - vx) * dt * 2
        vy += (targetVy - vy) * dt * 2
        vz += (targetVz - vz) * dt * 2
      } else if (this.motionMode === 'gravity' && this.isGravityActive) {
        const px = this.data.positions[idx3]
        const py = this.data.positions[idx3 + 1]
        const pz = this.data.positions[idx3 + 2]

        const dx = this.gravityPosition.x - px
        const dy = this.gravityPosition.y - py
        const dz = this.gravityPosition.z - pz
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz) + 0.001

        if (dist < 3) {
          const gravityStrength = this.particleSpeed * 5 / (dist * dist + 0.5)
          vx += (dx / dist) * gravityStrength * dt
          vy += (dy / dist) * gravityStrength * dt
          vz += (dz / dist) * gravityStrength * dt

          if (dist < 0.4) {
            this.absorbParticle(i)
            continue
          }
        }
      }

      this.data.velocities[idx3] = vx
      this.data.velocities[idx3 + 1] = vy
      this.data.velocities[idx3 + 2] = vz

      this.data.positions[idx3] += vx * dt * speedMultiplier
      this.data.positions[idx3 + 1] += vy * dt * speedMultiplier
      this.data.positions[idx3 + 2] += vz * dt * speedMultiplier

      this.data.lifetimes[i] += dt

      const lifeRatio = (this.data.lifetimes[i] % this.data.maxLifetimes[i]) / this.data.maxLifetimes[i]

      this.updateParticleColor(i, lifeRatio)
      this.updateParticleSize(i, lifeRatio)
    }
  }

  private absorbParticle(index: number) {
    if (this.absorbedParticles.has(index)) return

    this.absorbedParticles.add(index)

    const idx3 = index * 3
    const pos = new THREE.Vector3(
      this.data.positions[idx3],
      this.data.positions[idx3 + 1],
      this.data.positions[idx3 + 2]
    )
    const color = new THREE.Color(
      this.data.colors[idx3],
      this.data.colors[idx3 + 1],
      this.data.colors[idx3 + 2]
    )

    if (this.sparkCallback) {
      this.sparkCallback(pos, color)
    }

    const theta = Math.random() * Math.PI * 2
    const phi = Math.acos(2 * Math.random() - 1)
    const speed = this.particleSpeed * (0.5 + Math.random() * 1.5)
    const dist = 8 + Math.random() * 5

    this.data.positions[idx3] = Math.sin(phi) * Math.cos(theta) * dist
    this.data.positions[idx3 + 1] = Math.sin(phi) * Math.sin(theta) * dist
    this.data.positions[idx3 + 2] = Math.cos(phi) * dist

    this.data.velocities[idx3] = -Math.sin(phi) * Math.cos(theta) * speed
    this.data.velocities[idx3 + 1] = -Math.sin(phi) * Math.sin(theta) * speed
    this.data.velocities[idx3 + 2] = -Math.cos(phi) * speed

    this.data.previousVelocities[idx3] = this.data.velocities[idx3]
    this.data.previousVelocities[idx3 + 1] = this.data.velocities[idx3 + 1]
    this.data.previousVelocities[idx3 + 2] = this.data.velocities[idx3 + 2]

    this.data.targetVelocities[idx3] = this.data.velocities[idx3]
    this.data.targetVelocities[idx3 + 1] = this.data.velocities[idx3 + 1]
    this.data.targetVelocities[idx3 + 2] = this.data.velocities[idx3 + 2]

    this.data.lifetimes[index] = 0

    setTimeout(() => {
      this.absorbedParticles.delete(index)
    }, 100)
  }

  private updateParticleColor(index: number, lifeRatio: number) {
    const idx3 = index * 3
    const hueOffset = this.data.hueOffsets[index]

    let t: number
    switch (this.colorMode) {
      case 'linear':
        t = lifeRatio
        break
      case 'sine':
        t = (Math.sin(lifeRatio * Math.PI * 2 - Math.PI / 2) + 1) / 2
        break
      case 'step':
        t = Math.floor(lifeRatio * 5) / 4
        break
      default:
        t = lifeRatio
    }

    const hue1 = this.startColor.getHSL({ h: 0, s: 0, l: 0 }).h
    const hue2 = this.endColor.getHSL({ h: 0, s: 0, l: 0 }).h
    const sat1 = this.startColor.getHSL({ h: 0, s: 0, l: 0 }).s
    const sat2 = this.endColor.getHSL({ h: 0, s: 0, l: 0 }).s
    const light1 = this.startColor.getHSL({ h: 0, s: 0, l: 0 }).l
    const light2 = this.endColor.getHSL({ h: 0, s: 0, l: 0 }).l

    const finalHue = (hue1 + (hue2 - hue1) * t + hueOffset * 0.1) % 1
    const finalSat = sat1 + (sat2 - sat1) * t
    const finalLight = light1 + (light2 - light1) * t

    const color = new THREE.Color().setHSL(finalHue, finalSat, finalLight)
    this.data.colors[idx3] = color.r
    this.data.colors[idx3 + 1] = color.g
    this.data.colors[idx3 + 2] = color.b
  }

  private updateParticleSize(index: number, lifeRatio: number) {
    const initialSize = this.data.initialSizes[index]

    let sizeMultiplier: number
    switch (this.sizeMode) {
      case 'constant':
        sizeMultiplier = 1
        break
      case 'pulse':
        sizeMultiplier = 0.5 + Math.sin(this.time * 2 + index) * 0.5 + 0.5
        sizeMultiplier = Math.min(2, Math.max(0.5, sizeMultiplier))
        break
      case 'decay':
        sizeMultiplier = 1 - lifeRatio
        break
      default:
        sizeMultiplier = 1
    }

    this.data.sizes[index] = initialSize * sizeMultiplier
  }

  regenerate() {
    this.absorbedParticles.clear()
    this.initializeExplosion()
    this.isExploding = true
    this.explosionProgress = 0
    this.transitionProgress = 1
    this.savePreviousVelocities()
    this.calculateTargetVelocities('explosion')
  }
}
