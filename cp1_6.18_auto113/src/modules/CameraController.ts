import * as THREE from 'three'

export interface CameraControllerOptions {
  camera: THREE.PerspectiveCamera
  target?: THREE.Vector3
  inertiaFactor?: number
  minDistance?: number
  maxDistance?: number
  minPolarAngle?: number
  maxPolarAngle?: number
}

export interface Waypoint {
  position: THREE.Vector3
  lookAt: THREE.Vector3
  highlightBuildingId?: string
  duration: number
}

interface TransformState {
  position: THREE.Vector3
  lookAt: THREE.Vector3
}

type EasingFn = (t: number) => number

const easeInOutCubic: EasingFn = (t) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2

const easeOutSine: EasingFn = (t) => Math.sin((t * Math.PI) / 2)

export class CameraController {
  private camera: THREE.PerspectiveCamera
  private target: THREE.Vector3
  private inertiaFactor: number
  private minDistance: number
  private maxDistance: number
  private minPolarAngle: number
  private maxPolarAngle: number

  private spherical = new THREE.Spherical()
  private sphericalDelta = new THREE.Spherical()
  private panOffset = new THREE.Vector3()
  private scale = 1

  private isAnimating = false
  private animationProgress = 0
  private animationDuration = 0
  private animationStart: TransformState | null = null
  private animationEnd: TransformState | null = null
  private animationEasing: EasingFn = easeInOutCubic

  private isAutoRoaming = false
  private autoRoamProgress = 0
  private autoRoamDuration = 30
  private autoRoamWaypoints: Waypoint[] = []
  private currentWaypointIndex = 0
  private waypointProgress = 0

  private onHighlightBuilding: ((id: string | null) => void) | null = null
  private onRoamComplete: (() => void) | null = null

  private lastHighlightedId: string | null = null

  constructor(options: CameraControllerOptions) {
    this.camera = options.camera
    this.target = options.target || new THREE.Vector3(0, 0, 0)
    this.inertiaFactor = options.inertiaFactor ?? 0.92
    this.minDistance = options.minDistance ?? 15
    this.maxDistance = options.maxDistance ?? 250
    this.minPolarAngle = options.minPolarAngle ?? 0.15
    this.maxPolarAngle = options.maxPolarAngle ?? Math.PI / 2 - 0.05

    this.updateSphericalFromCamera()
  }

  setOnHighlightBuilding(callback: (id: string | null) => void) {
    this.onHighlightBuilding = callback
  }

  setOnRoamComplete(callback: () => void) {
    this.onRoamComplete = callback
  }

  private updateSphericalFromCamera() {
    const offset = new THREE.Vector3().subVectors(this.camera.position, this.target)
    this.spherical.setFromVector3(offset)
    this.sphericalDelta.set(0, 0, 0)
  }

  private triggerHighlight(id: string | null) {
    if (id !== this.lastHighlightedId) {
      this.lastHighlightedId = id
      if (this.onHighlightBuilding) {
        this.onHighlightBuilding(id)
      }
    }
  }

  rotate(deltaX: number, deltaY: number) {
    if (this.isAnimating || this.isAutoRoaming) return
    this.sphericalDelta.theta -= deltaX * 0.005
    this.sphericalDelta.phi -= deltaY * 0.005
  }

  pan(deltaX: number, deltaY: number) {
    if (this.isAnimating || this.isAutoRoaming) return
    const targetDistance = this.spherical.radius

    const panLeft = new THREE.Vector3()
      .setFromMatrixColumn(this.camera.matrix, 0)
      .multiplyScalar(-deltaX * targetDistance * 0.001)

    const panUp = new THREE.Vector3()
      .setFromMatrixColumn(this.camera.matrix, 1)
      .multiplyScalar(deltaY * targetDistance * 0.001)

    this.panOffset.add(panLeft).add(panUp)
  }

  dolly(delta: number) {
    if (this.isAnimating || this.isAutoRoaming) return
    this.scale *= 1 + delta * 0.001
  }

  flyTo(
    position: THREE.Vector3,
    lookAt: THREE.Vector3,
    duration: number = 2,
    easing: EasingFn = easeInOutCubic
  ) {
    this.stopAutoRoam()
    this.animationStart = {
      position: this.camera.position.clone(),
      lookAt: this.target.clone(),
    }
    this.animationEnd = {
      position: position.clone(),
      lookAt: lookAt.clone(),
    }
    this.animationProgress = 0
    this.animationDuration = Math.max(0.1, duration)
    this.animationEasing = easing
    this.isAnimating = true
    this.sphericalDelta.set(0, 0, 0)
    this.panOffset.set(0, 0, 0)
  }

  resetView(duration: number = 1.5) {
    this.flyTo(
      new THREE.Vector3(120, 100, 120),
      new THREE.Vector3(0, 5, 0),
      duration
    )
  }

  generateDefaultWaypoints(): Waypoint[] {
    const center = new THREE.Vector3(0, 0, 0)
    const waypoints: Waypoint[] = []
    const count = 8
    const radius = 140
    const heights = [90, 70, 60, 50, 45, 55, 70, 85]

    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2
      const x = Math.cos(angle) * radius
      const z = Math.sin(angle) * radius
      const y = heights[i]
      waypoints.push({
        position: new THREE.Vector3(x, y, z),
        lookAt: center.clone().add(new THREE.Vector3(0, 5, 0)),
        highlightBuildingId:
          i % 2 === 0 ? `building-${(i * 25).toString().padStart(4, '0')}` : undefined,
        duration: this.autoRoamDuration / count,
      })
    }

    return waypoints
  }

  startAutoRoam(duration: number = 30) {
    this.isAutoRoaming = true
    this.autoRoamDuration = duration
    this.autoRoamProgress = 0
    this.currentWaypointIndex = 0
    this.waypointProgress = 0
    this.autoRoamWaypoints = this.generateDefaultWaypoints()
    this.isAnimating = false
    this.sphericalDelta.set(0, 0, 0)
    this.panOffset.set(0, 0, 0)
  }

  stopAutoRoam() {
    if (this.isAutoRoaming) {
      this.isAutoRoaming = false
      this.triggerHighlight(null)
      if (this.onRoamComplete) {
        this.onRoamComplete()
      }
    }
  }

  getIsAutoRoaming(): boolean {
    return this.isAutoRoaming
  }

  private updateAnimation(deltaTime: number) {
    if (!this.isAnimating || !this.animationStart || !this.animationEnd) return

    this.animationProgress += deltaTime / this.animationDuration

    if (this.animationProgress >= 1) {
      this.animationProgress = 1
      this.isAnimating = false
      this.camera.position.copy(this.animationEnd.position)
      this.target.copy(this.animationEnd.lookAt)
      this.updateSphericalFromCamera()
      return
    }

    const t = this.animationEasing(this.animationProgress)
    const pos = this.animationStart.position.clone().lerp(this.animationEnd.position, t)
    const look = this.animationStart.lookAt.clone().lerp(this.animationEnd.lookAt, t)

    this.camera.position.copy(pos)
    this.target.copy(look)
  }

  private updateAutoRoam(deltaTime: number) {
    if (!this.isAutoRoaming || this.autoRoamWaypoints.length === 0) return

    this.autoRoamProgress += deltaTime

    const currentWaypoint = this.autoRoamWaypoints[this.currentWaypointIndex]
    this.waypointProgress += deltaTime / currentWaypoint.duration

    if (this.waypointProgress >= 1) {
      this.waypointProgress = 0
      this.currentWaypointIndex = (this.currentWaypointIndex + 1) % this.autoRoamWaypoints.length

      if (this.currentWaypointIndex === 0) {
        this.stopAutoRoam()
        return
      }
    }

    const prevIndex = this.currentWaypointIndex
    const nextIndex = (this.currentWaypointIndex + 1) % this.autoRoamWaypoints.length
    const prev = this.autoRoamWaypoints[prevIndex]
    const next = this.autoRoamWaypoints[nextIndex]
    const t = easeOutSine(this.waypointProgress)

    const position = prev.position.clone().lerp(next.position, t)
    const lookAt = prev.lookAt.clone().lerp(next.lookAt, t)

    this.camera.position.copy(position)
    this.target.copy(lookAt)

    const highlightId = t < 0.5 ? prev.highlightBuildingId : next.highlightBuildingId
    this.triggerHighlight(highlightId || null)
  }

  private updateManual(deltaTime: number) {
    if (this.isAnimating || this.isAutoRoaming) return

    const offset = new THREE.Vector3().setFromSpherical(this.spherical)

    this.target.add(this.panOffset)

    this.spherical.radius *= this.scale
    this.spherical.radius = THREE.MathUtils.clamp(
      this.spherical.radius,
      this.minDistance,
      this.maxDistance
    )

    this.spherical.theta += this.sphericalDelta.theta
    this.spherical.phi += this.sphericalDelta.phi
    this.spherical.phi = THREE.MathUtils.clamp(
      this.spherical.phi,
      this.minPolarAngle,
      this.maxPolarAngle
    )

    this.spherical.makeSafe()
    offset.setFromSpherical(this.spherical)

    this.camera.position.copy(this.target).add(offset)
    this.camera.lookAt(this.target)

    this.sphericalDelta.theta *= this.inertiaFactor
    this.sphericalDelta.phi *= this.inertiaFactor
    this.panOffset.multiplyScalar(this.inertiaFactor)

    if (Math.abs(this.sphericalDelta.theta) < 1e-6) this.sphericalDelta.theta = 0
    if (Math.abs(this.sphericalDelta.phi) < 1e-6) this.sphericalDelta.phi = 0
    if (this.panOffset.lengthSq() < 1e-6) this.panOffset.set(0, 0, 0)

    this.scale = 1
  }

  update(deltaTime: number) {
    if (this.isAnimating) {
      this.updateAnimation(deltaTime)
    } else if (this.isAutoRoaming) {
      this.updateAutoRoam(deltaTime)
    } else {
      this.updateManual(deltaTime)
    }
  }

  getCameraPosition(): THREE.Vector3 {
    return this.camera.position.clone()
  }

  getTarget(): THREE.Vector3 {
    return this.target.clone()
  }
}
