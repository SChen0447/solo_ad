import * as THREE from 'three'
import { Galaxy } from './Galaxy'

export class Simulator {
  public scene: THREE.Scene
  public galaxy1!: Galaxy
  public galaxy2!: Galaxy
  public allParticles!: number
  public gravityConstant: number = 0.1
  public initialDistance: number = 12
  public timeStep: number = 0.01
  public isPaused: boolean = false
  public onPauseChange?: (paused: boolean) => void

  private orbitLines: THREE.Group | null = null
  private heatmapCanvas: HTMLCanvasElement
  private heatmapTexture: THREE.CanvasTexture | null = null
  private heatmapMesh: THREE.Mesh | null = null
  private heatmapMaterial: THREE.MeshBasicMaterial | null = null
  private lastFrameTime: number = 0
  private frameAccumulator: number = 0
  private simFps: number = 30
  private simInterval: number = 1 / 30
  private lowQualityMode: boolean = false

  private tempVec: THREE.Vector3 = new THREE.Vector3()
  private forceVec: THREE.Vector3 = new THREE.Vector3()

  constructor(scene: THREE.Scene) {
    this.scene = scene

    this.heatmapCanvas = document.createElement('canvas')
    this.heatmapCanvas.width = 256
    this.heatmapCanvas.height = 256

    this.initGalaxies()
    this.checkPerformanceLevel()
  }

  public initGalaxies(distance?: number): void {
    if (this.galaxy1) {
      this.scene.remove(this.galaxy1.points)
      this.galaxy1.dispose()
    }
    if (this.galaxy2) {
      this.scene.remove(this.galaxy2.points)
      this.galaxy2.dispose()
    }
    this.removeOrbitLines()
    this.removeHeatmap()

    const d = distance !== undefined ? distance : this.initialDistance
    this.initialDistance = d

    this.galaxy1 = new Galaxy(
      5000,
      new THREE.Vector3(-d / 2, 0, 0),
      0,
      0
    )

    this.galaxy2 = new Galaxy(
      5000,
      new THREE.Vector3(d / 2, 0, 0),
      Math.PI,
      0.08
    )

    const approachSpeed = 0.5
    for (let i = 0; i < 5000; i++) {
      this.galaxy1.data.velocities[i * 3] += approachSpeed
      this.galaxy2.data.velocities[i * 3] -= approachSpeed
    }

    this.scene.add(this.galaxy1.points)
    this.scene.add(this.galaxy2.points)

    this.allParticles = 10000
    this.checkPerformanceLevel()
    this.applyPerformanceMode()
  }

  private checkPerformanceLevel(): void {
    this.lowQualityMode = this.allParticles > 8000
  }

  private applyPerformanceMode(): void {
    if (this.lowQualityMode) {
      this.galaxy1.material.size = 0.025
      this.galaxy2.material.size = 0.025
    } else {
      this.galaxy1.material.size = 0.05
      this.galaxy2.material.size = 0.05
    }
  }

  public setGravityConstant(g: number): void {
    this.gravityConstant = g
  }

  public pause(): void {
    this.isPaused = true
    this.galaxy1.setOpacity(0.5)
    this.galaxy2.setOpacity(0.5)
    this.showOrbitPredictions()
    if (this.onPauseChange) this.onPauseChange(true)
  }

  public resume(): void {
    this.isPaused = false
    this.galaxy1.setOpacity(0.9)
    this.galaxy2.setOpacity(0.9)
    this.removeOrbitLines()
    if (this.onPauseChange) this.onPauseChange(false)
  }

  public togglePause(): void {
    if (this.isPaused) {
      this.resume()
    } else {
      this.pause()
    }
  }

  private computeAcceleration(
    positions: Float32Array,
    galaxyIdx: number,
    particleIdx: number,
    targetForce: THREE.Vector3
  ): void {
    targetForce.set(0, 0, 0)
    const px = positions[particleIdx * 3]
    const py = positions[particleIdx * 3 + 1]
    const pz = positions[particleIdx * 3 + 2]

    const allGalaxies = [this.galaxy1, this.galaxy2]

    for (let gi = 0; gi < 2; gi++) {
      const gal = allGalaxies[gi]
      const gpos = gal.data.positions
      const sampleStep = gi === galaxyIdx ? 20 : 10

      for (let j = 0; j < gal.particleCount; j += sampleStep) {
        const j3 = j * 3
        const dx = gpos[j3] - px
        const dy = gpos[j3 + 1] - py
        const dz = gpos[j3 + 2] - pz

        const distSq = dx * dx + dy * dy + dz * dz
        const minDist = 0.2
        if (distSq < minDist * minDist) continue

        const dist = Math.sqrt(distSq)
        const forceMag = (this.gravityConstant * sampleStep) / Math.max(distSq, minDist * minDist)
        const maxForce = 2.0
        const clampedForce = Math.min(forceMag, maxForce)

        targetForce.x += (dx / dist) * clampedForce
        targetForce.y += (dy / dist) * clampedForce
        targetForce.z += (dz / dist) * clampedForce
      }
    }
  }

  private stepSimulation(): void {
    const galaxies = [this.galaxy1, this.galaxy2]

    for (let gi = 0; gi < 2; gi++) {
      const gal = galaxies[gi]
      const pos = gal.data.positions
      const vel = gal.data.velocities
      const count = gal.particleCount

      for (let i = 0; i < count; i++) {
        const i3 = i * 3

        this.computeAcceleration(pos, gi, i, this.forceVec)

        vel[i3] += this.forceVec.x * this.timeStep
        vel[i3 + 1] += this.forceVec.y * this.timeStep
        vel[i3 + 2] += this.forceVec.z * this.timeStep

        const speedSq = vel[i3] * vel[i3] + vel[i3 + 1] * vel[i3 + 1] + vel[i3 + 2] * vel[i3 + 2]
        const maxSpeed = 10
        if (speedSq > maxSpeed * maxSpeed) {
          const s = maxSpeed / Math.sqrt(speedSq)
          vel[i3] *= s
          vel[i3 + 1] *= s
          vel[i3 + 2] *= s
        }
      }
    }

    for (let gi = 0; gi < 2; gi++) {
      const gal = galaxies[gi]
      const pos = gal.data.positions
      const vel = gal.data.velocities
      const count = gal.particleCount

      for (let i = 0; i < count; i++) {
        const i3 = i * 3
        pos[i3] += vel[i3] * this.timeStep
        pos[i3 + 1] += vel[i3 + 1] * this.timeStep
        pos[i3 + 2] += vel[i3 + 2] * this.timeStep
      }
    }

    this.galaxy1.updatePositionsFromData()
    this.galaxy2.updatePositionsFromData()
  }

  private predictOrbitRK4(
    galaxyIdx: number,
    particleIdx: number,
    duration: number
  ): THREE.Vector3[] {
    const gal = galaxyIdx === 0 ? this.galaxy1 : this.galaxy2
    const dt = 0.02
    const steps = Math.ceil(duration / dt)

    const statePos = new Float32Array(3)
    const stateVel = new Float32Array(3)
    const i3 = particleIdx * 3
    statePos[0] = gal.data.positions[i3]
    statePos[1] = gal.data.positions[i3 + 1]
    statePos[2] = gal.data.positions[i3 + 2]
    stateVel[0] = gal.data.velocities[i3]
    stateVel[1] = gal.data.velocities[i3 + 1]
    stateVel[2] = gal.data.velocities[i3 + 2]

    const positions: THREE.Vector3[] = [new THREE.Vector3(statePos[0], statePos[1], statePos[2])]

    const allGals = [this.galaxy1, this.galaxy2]
    const allPos = [allGals[0].data.positions, allGals[1].data.positions]

    const getAccel = (p: Float32Array, v: Float32Array, gi: number, idx: number): Float32Array => {
      const acc = new Float32Array(3)
      for (let g = 0; g < 2; g++) {
        const gpos = allPos[g]
        const sampleStep = g === gi ? 30 : 20
        for (let j = 0; j < 5000; j += sampleStep) {
          const j3 = j * 3
          const dx = gpos[j3] - p[0]
          const dy = gpos[j3 + 1] - p[1]
          const dz = gpos[j3 + 2] - p[2]
          const distSq = dx * dx + dy * dy + dz * dz
          const minDist = 0.2
          if (distSq < minDist * minDist) continue
          const dist = Math.sqrt(distSq)
          const forceMag = (this.gravityConstant * sampleStep) / Math.max(distSq, minDist * minDist)
          const clampedForce = Math.min(forceMag, 2.0)
          acc[0] += (dx / dist) * clampedForce
          acc[1] += (dy / dist) * clampedForce
          acc[2] += (dz / dist) * clampedForce
        }
      }
      return acc
    }

    for (let s = 0; s < steps; s++) {
      const k1v = getAccel(statePos, stateVel, galaxyIdx, particleIdx)
      const k1p = new Float32Array([stateVel[0], stateVel[1], stateVel[2]])

      const p2 = new Float32Array([statePos[0] + k1p[0] * dt / 2, statePos[1] + k1p[1] * dt / 2, statePos[2] + k1p[2] * dt / 2])
      const v2 = new Float32Array([stateVel[0] + k1v[0] * dt / 2, stateVel[1] + k1v[1] * dt / 2, stateVel[2] + k1v[2] * dt / 2])
      const k2v = getAccel(p2, v2, galaxyIdx, particleIdx)
      const k2p = new Float32Array([v2[0], v2[1], v2[2]])

      const p3 = new Float32Array([statePos[0] + k2p[0] * dt / 2, statePos[1] + k2p[1] * dt / 2, statePos[2] + k2p[2] * dt / 2])
      const v3 = new Float32Array([stateVel[0] + k2v[0] * dt / 2, stateVel[1] + k2v[1] * dt / 2, stateVel[2] + k2v[2] * dt / 2])
      const k3v = getAccel(p3, v3, galaxyIdx, particleIdx)
      const k3p = new Float32Array([v3[0], v3[1], v3[2]])

      const p4 = new Float32Array([statePos[0] + k3p[0] * dt, statePos[1] + k3p[1] * dt, statePos[2] + k3p[2] * dt])
      const v4 = new Float32Array([stateVel[0] + k3v[0] * dt, stateVel[1] + k3v[1] * dt, stateVel[2] + k3v[2] * dt])
      const k4v = getAccel(p4, v4, galaxyIdx, particleIdx)
      const k4p = new Float32Array([v4[0], v4[1], v4[2]])

      statePos[0] += (k1p[0] + 2 * k2p[0] + 2 * k3p[0] + k4p[0]) * dt / 6
      statePos[1] += (k1p[1] + 2 * k2p[1] + 2 * k3p[1] + k4p[1]) * dt / 6
      statePos[2] += (k1p[2] + 2 * k2p[2] + 2 * k3p[2] + k4p[2]) * dt / 6
      stateVel[0] += (k1v[0] + 2 * k2v[0] + 2 * k3v[0] + k4v[0]) * dt / 6
      stateVel[1] += (k1v[1] + 2 * k2v[1] + 2 * k3v[1] + k4v[1]) * dt / 6
      stateVel[2] += (k1v[2] + 2 * k2v[2] + 2 * k3v[2] + k4v[2]) * dt / 6

      positions.push(new THREE.Vector3(statePos[0], statePos[1], statePos[2]))
    }

    return positions
  }

  private showOrbitPredictions(): void {
    this.removeOrbitLines()
    this.orbitLines = new THREE.Group()

    const samples = 60
    const samplesPerGalaxy = samples / 2

    for (let gi = 0; gi < 2; gi++) {
      for (let s = 0; s < samplesPerGalaxy; s++) {
        const idx = Math.floor(Math.random() * 5000)
        const gal = gi === 0 ? this.galaxy1 : this.galaxy2
        const i3 = idx * 3
        const vx = gal.data.velocities[i3]
        const vy = gal.data.velocities[i3 + 1]
        const vz = gal.data.velocities[i3 + 2]
        const speed = Math.sqrt(vx * vx + vy * vy + vz * vz)
        const duration = 0.3 + Math.min(speed * 0.1, 0.3)

        const path = this.predictOrbitRK4(gi, idx, duration)

        const positions = new Float32Array(path.length * 3)
        for (let i = 0; i < path.length; i++) {
          positions[i * 3] = path[i].x
          positions[i * 3 + 1] = path[i].y
          positions[i * 3 + 2] = path[i].z
        }

        const geom = new THREE.BufferGeometry()
        geom.setAttribute('position', new THREE.BufferAttribute(positions, 3))

        const color = gi === 0 ? 0x818cf8 : 0xc084fc
        const mat = new THREE.LineDashedMaterial({
          color: color,
          transparent: true,
          opacity: 0.35,
          dashSize: 0.15,
          gapSize: 0.1,
          depthWrite: false
        })

        const line = new THREE.Line(geom, mat)
        line.computeLineDistances()
        this.orbitLines.add(line)
      }
    }

    this.scene.add(this.orbitLines)
  }

  private removeOrbitLines(): void {
    if (this.orbitLines) {
      this.orbitLines.children.forEach(obj => {
        if (obj instanceof THREE.Line) {
          obj.geometry.dispose()
          const mat = obj.material as THREE.LineDashedMaterial
          mat.dispose()
        }
      })
      this.scene.remove(this.orbitLines)
      this.orbitLines = null
    }
  }

  public computeDensity(worldPoint: THREE.Vector3, radius: number = 2): number {
    let count = 0
    const r2 = radius * radius

    const checkGalaxy = (gal: Galaxy) => {
      const pos = gal.data.positions
      for (let i = 0; i < gal.particleCount; i++) {
        const i3 = i * 3
        const dx = pos[i3] - worldPoint.x
        const dy = pos[i3 + 1] - worldPoint.y
        const dz = pos[i3 + 2] - worldPoint.z
        if (dx * dx + dy * dy + dz * dz < r2) count++
      }
    }

    checkGalaxy(this.galaxy1)
    checkGalaxy(this.galaxy2)
    return count
  }

  public updateHeatmap(camera: THREE.Camera, screenX: number, screenY: number): number {
    const raycaster = new THREE.Raycaster()
    const ndc = new THREE.Vector2(screenX, screenY)
    raycaster.setFromCamera(ndc, camera)

    const planeNormal = new THREE.Vector3()
    camera.getWorldDirection(planeNormal)
    const sceneCenter = new THREE.Vector3(0, 0, 0)
    const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(planeNormal, sceneCenter)

    const intersectPoint = new THREE.Vector3()
    raycaster.ray.intersectPlane(plane, intersectPoint)

    const density = this.computeDensity(intersectPoint, 1.5)

    this.renderHeatmapTexture(intersectPoint, density)

    if (!this.heatmapMesh) {
      this.heatmapTexture = new THREE.CanvasTexture(this.heatmapCanvas)
      this.heatmapTexture.needsUpdate = true

      this.heatmapMaterial = new THREE.MeshBasicMaterial({
        map: this.heatmapTexture,
        transparent: true,
        opacity: 0.6,
        depthWrite: false,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending
      })

      const planeGeom = new THREE.PlaneGeometry(6, 6, 1, 1)
      this.heatmapMesh = new THREE.Mesh(planeGeom, this.heatmapMaterial)
      this.scene.add(this.heatmapMesh)
    }

    if (this.heatmapMesh && this.heatmapTexture) {
      this.heatmapMesh.position.copy(intersectPoint)
      this.heatmapMesh.lookAt(camera.position)
      this.heatmapTexture.needsUpdate = true
    }

    return density
  }

  private renderHeatmapTexture(center: THREE.Vector3, density: number): void {
    const canvas = this.heatmapCanvas
    const ctx = canvas.getContext('2d')!
    const w = canvas.width
    const h = canvas.height

    ctx.clearRect(0, 0, w, h)

    const maxDensity = 1000
    const t = Math.min(density / maxDensity, 1)

    const centerX = w / 2
    const centerY = h / 2
    const radius = w / 2

    const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius)

    const hue = 320 - t * 120
    const sat = 90
    const light = 60

    gradient.addColorStop(0, `hsla(${hue}, ${sat}%, ${light}%, ${0.8 * t + 0.1})`)
    gradient.addColorStop(0.4, `hsla(${hue + 30}, ${sat - 10}%, ${light + 10}%, ${0.5 * t + 0.05})`)
    gradient.addColorStop(0.7, `hsla(${hue + 60}, ${sat - 20}%, ${light}%, ${0.2 * t + 0.02})`)
    gradient.addColorStop(1, 'hsla(0, 0%, 0%, 0)')

    ctx.fillStyle = gradient
    ctx.beginPath()
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2)
    ctx.fill()
  }

  public removeHeatmap(): void {
    if (this.heatmapMesh) {
      this.scene.remove(this.heatmapMesh)
      if (this.heatmapMesh.geometry) this.heatmapMesh.geometry.dispose()
      if (this.heatmapMaterial) this.heatmapMaterial.dispose()
      if (this.heatmapTexture) this.heatmapTexture.dispose()
      this.heatmapMesh = null
      this.heatmapMaterial = null
      this.heatmapTexture = null
    }
  }

  public update(deltaTime: number): void {
    this.frameAccumulator += deltaTime

    const maxSubSteps = 4
    let steps = 0

    while (this.frameAccumulator >= this.simInterval && steps < maxSubSteps) {
      if (!this.isPaused) {
        this.stepSimulation()
      }
      this.frameAccumulator -= this.simInterval
      steps++
    }
  }

  public dispose(): void {
    this.removeOrbitLines()
    this.removeHeatmap()
    if (this.galaxy1) this.galaxy1.dispose()
    if (this.galaxy2) this.galaxy2.dispose()
  }
}
