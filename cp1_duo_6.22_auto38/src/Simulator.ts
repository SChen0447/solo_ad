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
  private frameAccumulator: number = 0
  private simFps: number = 30
  private simInterval: number = 1 / 30
  private lowQualityMode: boolean = false
  private currentParticleCount: number = 0

  private backBufferPositions1: Float32Array | null = null
  private backBufferPositions2: Float32Array | null = null
  private backBufferVelocities1: Float32Array | null = null
  private backBufferVelocities2: Float32Array | null = null

  private raycaster: THREE.Raycaster = new THREE.Raycaster()
  private mouseNDC: THREE.Vector2 = new THREE.Vector2()

  private MAX_FORCE: number = 5.0
  private MIN_DISTANCE: number = 0.15
  private MAX_SPEED: number = 8.0
  private SAMPLE_STEP_LOCAL: number = 25
  private SAMPLE_STEP_REMOTE: number = 12

  constructor(scene: THREE.Scene) {
    this.scene = scene

    this.heatmapCanvas = document.createElement('canvas')
    this.heatmapCanvas.width = 256
    this.heatmapCanvas.height = 256

    this.initGalaxies()
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
      0.0
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

    this.currentParticleCount = this.galaxy1.particleCount + this.galaxy2.particleCount
    this.allParticles = this.currentParticleCount

    this.backBufferPositions1 = new Float32Array(this.galaxy1.data.positions)
    this.backBufferPositions2 = new Float32Array(this.galaxy2.data.positions)
    this.backBufferVelocities1 = new Float32Array(this.galaxy1.data.velocities)
    this.backBufferVelocities2 = new Float32Array(this.galaxy2.data.velocities)

    this.checkPerformanceLevel()
    this.applyPerformanceMode()
  }

  private checkPerformanceLevel(): void {
    this.lowQualityMode = this.currentParticleCount > 8000
  }

  private applyPerformanceMode(): void {
    if (this.lowQualityMode) {
      this.galaxy1.setBaseSize(0.5)
      this.galaxy2.setBaseSize(0.5)
    } else {
      this.galaxy1.setBaseSize(1.0)
      this.galaxy2.setBaseSize(1.0)
    }
  }

  public setGravityConstant(g: number): void {
    this.gravityConstant = g
  }

  public pause(): void {
    this.isPaused = true
    this.galaxy1.setOpacity(0.45)
    this.galaxy2.setOpacity(0.45)
    this.showOrbitPredictions()
    if (this.onPauseChange) this.onPauseChange(true)
  }

  public resume(): void {
    this.isPaused = false
    this.galaxy1.setOpacity(1.0)
    this.galaxy2.setOpacity(1.0)
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

  private computeGravityForceOnParticle(
    px: number, py: number, pz: number,
    outForce: Float32Array
  ): void {
    outForce[0] = 0
    outForce[1] = 0
    outForce[2] = 0

    const G = this.gravityConstant
    const MIN_D2 = this.MIN_DISTANCE * this.MIN_DISTANCE
    const MAX_F = this.MAX_FORCE

    const processGalaxy = (galPos: Float32Array, count: number, sampleStep: number): void => {
      for (let j = 0; j < count; j += sampleStep) {
        const j3 = j * 3
        const dx = galPos[j3] - px
        const dy = galPos[j3 + 1] - py
        const dz = galPos[j3 + 2] - pz

        const distSq = dx * dx + dy * dy + dz * dz

        if (distSq < MIN_D2) continue

        const dist = Math.sqrt(distSq)

        const forceMag = (G * sampleStep) / distSq
        const clampedForce = Math.min(forceMag, MAX_F)

        const invDist = 1.0 / dist
        outForce[0] += dx * invDist * clampedForce
        outForce[1] += dy * invDist * clampedForce
        outForce[2] += dz * invDist * clampedForce
      }
    }

    processGalaxy(this.galaxy1.data.positions, this.galaxy1.particleCount, this.SAMPLE_STEP_LOCAL)
    processGalaxy(this.galaxy2.data.positions, this.galaxy2.particleCount, this.SAMPLE_STEP_REMOTE)
  }

  private stepSimulation(): void {
    const dt = this.timeStep
    const tmpForce = new Float32Array(3)

    const galaxies = [this.galaxy1, this.galaxy2]
    const backBuffers = [
      { pos: this.backBufferPositions1!, vel: this.backBufferVelocities1! },
      { pos: this.backBufferPositions2!, vel: this.backBufferVelocities2! }
    ]

    for (let gi = 0; gi < 2; gi++) {
      const gal = galaxies[gi]
      const curPos = gal.data.positions
      const curVel = gal.data.velocities
      const dstPos = backBuffers[gi].pos
      const dstVel = backBuffers[gi].vel
      const count = gal.particleCount

      for (let i = 0; i < count; i++) {
        const i3 = i * 3
        const px = curPos[i3]
        const py = curPos[i3 + 1]
        const pz = curPos[i3 + 2]

        this.computeGravityForceOnParticle(px, py, pz, tmpForce)

        const ax = tmpForce[0]
        const ay = tmpForce[1]
        const az = tmpForce[2]

        let vx = curVel[i3] + ax * dt
        let vy = curVel[i3 + 1] + ay * dt
        let vz = curVel[i3 + 2] + az * dt

        const speedSq = vx * vx + vy * vy + vz * vz
        if (speedSq > this.MAX_SPEED * this.MAX_SPEED) {
          const invSpeed = this.MAX_SPEED / Math.sqrt(speedSq)
          vx *= invSpeed
          vy *= invSpeed
          vz *= invSpeed
        }

        dstVel[i3] = vx
        dstVel[i3 + 1] = vy
        dstVel[i3 + 2] = vz

        dstPos[i3] = px + vx * dt
        dstPos[i3 + 1] = py + vy * dt
        dstPos[i3 + 2] = pz + vz * dt
      }
    }

    for (let gi = 0; gi < 2; gi++) {
      const gal = galaxies[gi]
      const srcPos = backBuffers[gi].pos
      const srcVel = backBuffers[gi].vel
      for (let i = 0; i < gal.particleCount * 3; i++) {
        gal.data.positions[i] = srcPos[i]
        gal.data.velocities[i] = srcVel[i]
      }
    }

    this.syncGeometryBuffers()
  }

  private syncGeometryBuffers(): void {
    const attr1 = this.galaxy1.positionAttribute
    const attr2 = this.galaxy2.positionAttribute
    const arr1 = attr1.array as Float32Array
    const arr2 = attr2.array as Float32Array
    const src1 = this.galaxy1.data.positions
    const src2 = this.galaxy2.data.positions

    for (let i = 0; i < this.galaxy1.particleCount * 3; i++) {
      arr1[i] = src1[i]
    }
    for (let i = 0; i < this.galaxy2.particleCount * 3; i++) {
      arr2[i] = src2[i]
    }

    attr1.needsUpdate = true
    attr2.needsUpdate = true
    this.galaxy1.geometry.attributes.position.needsUpdate = true
    this.galaxy2.geometry.attributes.position.needsUpdate = true
  }

  private predictOrbitRK4(
    startPos: Float32Array,
    startVel: Float32Array,
    duration: number
  ): THREE.Vector3[] {
    const dt = 0.02
    const steps = Math.max(1, Math.ceil(duration / dt))

    const p = new Float32Array(startPos)
    const v = new Float32Array(startVel)

    const positions: THREE.Vector3[] = [new THREE.Vector3(p[0], p[1], p[2])]

    const getAccel = (pos: Float32Array): Float32Array => {
      const acc = new Float32Array(3)
      const tmp = new Float32Array(3)
      this.computeGravityForceOnParticle(pos[0], pos[1], pos[2], tmp)
      acc[0] = tmp[0]
      acc[1] = tmp[1]
      acc[2] = tmp[2]
      return acc
    }

    for (let s = 0; s < steps; s++) {
      const k1v = getAccel(p)
      const k1p = new Float32Array([v[0], v[1], v[2]])

      const p2 = new Float32Array([p[0] + k1p[0] * dt / 2, p[1] + k1p[1] * dt / 2, p[2] + k1p[2] * dt / 2])
      const v2 = new Float32Array([v[0] + k1v[0] * dt / 2, v[1] + k1v[1] * dt / 2, v[2] + k1v[2] * dt / 2])
      const k2v = getAccel(p2)
      const k2p = new Float32Array([v2[0], v2[1], v2[2]])

      const p3 = new Float32Array([p[0] + k2p[0] * dt / 2, p[1] + k2p[1] * dt / 2, p[2] + k2p[2] * dt / 2])
      const v3 = new Float32Array([v[0] + k2v[0] * dt / 2, v[1] + k2v[1] * dt / 2, v[2] + k2v[2] * dt / 2])
      const k3v = getAccel(p3)
      const k3p = new Float32Array([v3[0], v3[1], v3[2]])

      const p4 = new Float32Array([p[0] + k3p[0] * dt, p[1] + k3p[1] * dt, p[2] + k3p[2] * dt])
      const v4 = new Float32Array([v[0] + k3v[0] * dt, v[1] + k3v[1] * dt, v[2] + k3v[2] * dt])
      const k4v = getAccel(p4)
      const k4p = new Float32Array([v4[0], v4[1], v4[2]])

      p[0] += (k1p[0] + 2 * k2p[0] + 2 * k3p[0] + k4p[0]) * dt / 6
      p[1] += (k1p[1] + 2 * k2p[1] + 2 * k3p[1] + k4p[1]) * dt / 6
      p[2] += (k1p[2] + 2 * k2p[2] + 2 * k3p[2] + k4p[2]) * dt / 6
      v[0] += (k1v[0] + 2 * k2v[0] + 2 * k3v[0] + k4v[0]) * dt / 6
      v[1] += (k1v[1] + 2 * k2v[1] + 2 * k3v[1] + k4v[1]) * dt / 6
      v[2] += (k1v[2] + 2 * k2v[2] + 2 * k3v[2] + k4v[2]) * dt / 6

      positions.push(new THREE.Vector3(p[0], p[1], p[2]))
    }

    return positions
  }

  private showOrbitPredictions(): void {
    this.removeOrbitLines()
    this.orbitLines = new THREE.Group()

    const PREDICT_DURATION = 0.5
    const samplesPerGalaxy = 40

    for (let gi = 0; gi < 2; gi++) {
      const gal = gi === 0 ? this.galaxy1 : this.galaxy2
      const count = gal.particleCount

      for (let s = 0; s < samplesPerGalaxy; s++) {
        const idx = Math.floor((s / samplesPerGalaxy) * count + Math.random() * (count / samplesPerGalaxy))
        const safeIdx = Math.min(Math.max(idx, 0), count - 1)
        const i3 = safeIdx * 3

        const startPos = gal.data.positions.subarray(i3, i3 + 3)
        const startVel = gal.data.velocities.subarray(i3, i3 + 3)

        const speed = Math.sqrt(startVel[0] * startVel[0] + startVel[1] * startVel[1] + startVel[2] * startVel[2])
        const durationScale = Math.min(0.3 + speed * 0.1, 1.0)
        const path = this.predictOrbitRK4(startPos, startVel, PREDICT_DURATION * durationScale)

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
          opacity: 0.4,
          dashSize: 0.12,
          gapSize: 0.08,
          depthWrite: false,
          linewidth: 1
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
      this.orbitLines.traverse((obj) => {
        if (obj instanceof THREE.Line) {
          obj.geometry.dispose()
          if (Array.isArray(obj.material)) {
            obj.material.forEach((m) => m.dispose())
          } else {
            obj.material.dispose()
          }
        }
      })
      this.scene.remove(this.orbitLines)
      this.orbitLines = null
    }
  }

  public computeDensity(worldPoint: THREE.Vector3, radius: number = 2): number {
    let count = 0
    const r2 = radius * radius

    const check = (gal: Galaxy): void => {
      const pos = gal.data.positions
      for (let i = 0; i < gal.particleCount; i += 3) {
        const i3 = i * 3
        const dx = pos[i3] - worldPoint.x
        const dy = pos[i3 + 1] - worldPoint.y
        const dz = pos[i3 + 2] - worldPoint.z
        if (dx * dx + dy * dy + dz * dz < r2) count++
      }
    }

    check(this.galaxy1)
    check(this.galaxy2)
    return count
  }

  public updateHeatmap(camera: THREE.Camera, screenX: number, screenY: number): number {
    this.mouseNDC.set(screenX, screenY)
    this.raycaster.setFromCamera(this.mouseNDC, camera)

    const camDir = new THREE.Vector3()
    camera.getWorldDirection(camDir)

    const sceneCenter = new THREE.Vector3(0, 0, 0)
    const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(camDir, sceneCenter)

    const intersectPoint = new THREE.Vector3()
    const hit = this.raycaster.ray.intersectPlane(plane, intersectPoint)
    if (!hit) {
      this.removeHeatmap()
      return 0
    }

    const density = this.computeDensity(intersectPoint, 1.5)

    this.renderHeatmapTexture(density)

    if (!this.heatmapMesh) {
      this.heatmapTexture = new THREE.CanvasTexture(this.heatmapCanvas)
      this.heatmapTexture.needsUpdate = true

      this.heatmapMaterial = new THREE.MeshBasicMaterial({
        map: this.heatmapTexture,
        transparent: true,
        opacity: 0.65,
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
      const lookTarget = intersectPoint.clone().add(camDir)
      this.heatmapMesh.lookAt(lookTarget)
      this.heatmapTexture.needsUpdate = true
    }

    return density
  }

  private renderHeatmapTexture(density: number): void {
    const canvas = this.heatmapCanvas
    const ctx = canvas.getContext('2d')!
    const w = canvas.width
    const h = canvas.height

    ctx.clearRect(0, 0, w, h)

    const MAX_DENSITY = 1200
    const t = Math.min(density / MAX_DENSITY, 1)

    const cx = w / 2
    const cy = h / 2
    const r = w / 2

    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r)

    const hue = 320 - t * 140
    const sat = 95
    const light = 62

    grad.addColorStop(0, `hsla(${hue}, ${sat}%, ${light}%, ${0.85 * t + 0.1})`)
    grad.addColorStop(0.3, `hsla(${hue + 20}, ${sat - 5}%, ${light + 8}%, ${0.55 * t + 0.08})`)
    grad.addColorStop(0.6, `hsla(${hue + 50}, ${sat - 20}%, ${light}%, ${0.25 * t + 0.04})`)
    grad.addColorStop(1, 'hsla(0, 0%, 0%, 0)')

    ctx.fillStyle = grad
    ctx.beginPath()
    ctx.arc(cx, cy, r, 0, Math.PI * 2)
    ctx.fill()

    if (t > 0.3) {
      const innerGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 0.5)
      innerGrad.addColorStop(0, `hsla(${hue - 20}, 100%, 80%, ${0.4 * t})`)
      innerGrad.addColorStop(1, 'hsla(0, 0%, 0%, 0)')
      ctx.fillStyle = innerGrad
      ctx.beginPath()
      ctx.arc(cx, cy, r * 0.5, 0, Math.PI * 2)
      ctx.fill()
    }
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

    const MAX_SUB_STEPS = 5
    let steps = 0

    while (this.frameAccumulator >= this.simInterval && steps < MAX_SUB_STEPS) {
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
