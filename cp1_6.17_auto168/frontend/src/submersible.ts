import * as THREE from 'three'

export interface CruiseWaypoint {
  position: [number, number, number]
  lookAt: [number, number, number]
  narration: string
}

export interface CruiseConfig {
  waypoints: CruiseWaypoint[]
  speed: number
  total_duration: number
  path_visible: boolean
  path_color: [number, number, number]
  path_opacity: number
}

export type ViewMode = 'free' | 'cruise'

export interface SubmersibleData {
  position: THREE.Vector3
  depth: number
  temperature: number
  pH: number
  mode: ViewMode
  narration?: string
}

export class Submersible {
  scene: THREE.Scene
  camera: THREE.PerspectiveCamera
  rendererDom: HTMLElement

  modelGroup: THREE.Group
  spotLightL: THREE.SpotLight
  spotLightR: THREE.SpotLight
  lightConeL: THREE.Mesh
  lightConeR: THREE.Mesh

  position: THREE.Vector3
  velocity: THREE.Vector3
  rotationY: number
  rotationX: number

  keys: Set<string>
  mouseDown: boolean
  lastMouseX: number
  lastMouseY: number
  moveSpeed: number

  mode: ViewMode
  cruiseConfig: CruiseConfig | null
  cruiseWaypointIndex: number
  cruiseProgress: number
  cruisePathLine: THREE.Line | null
  cruiseStartTime: number
  currentNarration: string

  onDataUpdate: (data: SubmersibleData) => void
  environmentDataProvider: ((pos: THREE.Vector3) => { temperature: number; pH: number; depth: number }) | null

  tempVec3: THREE.Vector3
  tempQuat: THREE.Quaternion

  constructor(
    scene: THREE.Scene,
    camera: THREE.PerspectiveCamera,
    rendererDom: HTMLElement
  ) {
    this.scene = scene
    this.camera = camera
    this.rendererDom = rendererDom

    this.position = new THREE.Vector3(25, 15, 25)
    this.velocity = new THREE.Vector3()
    this.rotationY = -Math.PI * 0.75
    this.rotationX = -0.3

    this.keys = new Set()
    this.mouseDown = false
    this.lastMouseX = 0
    this.lastMouseY = 0
    this.moveSpeed = 12

    this.mode = 'free'
    this.cruiseConfig = null
    this.cruiseWaypointIndex = 0
    this.cruiseProgress = 0
    this.cruisePathLine = null
    this.cruiseStartTime = 0
    this.currentNarration = ''

    this.onDataUpdate = () => {}
    this.environmentDataProvider = null

    this.tempVec3 = new THREE.Vector3()
    this.tempQuat = new THREE.Quaternion()

    this.modelGroup = new THREE.Group()
    this.scene.add(this.modelGroup)

    this.createSubmersibleModel()
    ;[this.spotLightL, this.lightConeL] = this.createSpotlight(-1.2, 0.2, -0.8)
    ;[this.spotLightR, this.lightConeR] = this.createSpotlight(1.2, 0.2, -0.8)

    this.setupInputListeners()
    this.updateTransform()
  }

  createSubmersibleModel() {
    const bodyGeo = new THREE.SphereGeometry(1.0, 12, 10)
    bodyGeo.scale(1.3, 0.9, 1.6)
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x2e8b57,
      metalness: 0.8,
      roughness: 0.35
    })
    const body = new THREE.Mesh(bodyGeo, bodyMat)
    this.modelGroup.add(body)

    const hullRingGeo = new THREE.TorusGeometry(1.35, 0.08, 6, 16)
    const hullRing = new THREE.Mesh(hullRingGeo, bodyMat)
    hullRing.rotation.y = Math.PI / 2
    this.modelGroup.add(hullRing)

    const domeGeo = new THREE.SphereGeometry(0.55, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2)
    const domeMat = new THREE.MeshStandardMaterial({
      color: 0x87ceeb,
      metalness: 0.9,
      roughness: 0.1,
      transparent: true,
      opacity: 0.6
    })
    const dome = new THREE.Mesh(domeGeo, domeMat)
    dome.position.set(0, 0.5, 0)
    this.modelGroup.add(dome)

    const finGeo = new THREE.BoxGeometry(0.08, 0.6, 0.7)
    const finMat = new THREE.MeshStandardMaterial({
      color: 0x1e6b42,
      metalness: 0.7,
      roughness: 0.4
    })
    const finL = new THREE.Mesh(finGeo, finMat)
    finL.position.set(-1.3, 0.1, 0.1)
    this.modelGroup.add(finL)
    const finR = finL.clone()
    finR.position.x = 1.3
    this.modelGroup.add(finR)

    const propGeo = new THREE.CylinderGeometry(0.3, 0.3, 0.12, 8)
    const propMat = new THREE.MeshStandardMaterial({
      color: 0x444444,
      metalness: 0.9,
      roughness: 0.2
    })
    for (let s = 0; s < 3; s++) {
      const bladeGeo = new THREE.BoxGeometry(0.6, 0.04, 0.08)
      const blade = new THREE.Mesh(bladeGeo, propMat)
      blade.rotation.z = (s / 3) * Math.PI
      this.modelGroup.add(blade)
    }
    const prop = new THREE.Mesh(propGeo, propMat)
    prop.rotation.x = Math.PI / 2
    prop.position.set(0, 0, 1.5)
    this.modelGroup.add(prop)

    const armGeo = new THREE.BoxGeometry(0.12, 0.12, 0.8)
    const arm = new THREE.Mesh(armGeo, finMat)
    arm.position.set(0.9, -0.3, -1.0)
    arm.rotation.x = -0.3
    this.modelGroup.add(arm)

    const clampGeo = new THREE.BoxGeometry(0.3, 0.15, 0.2)
    const clamp = new THREE.Mesh(clampGeo, finMat)
    clamp.position.set(1.05, -0.55, -1.6)
    this.modelGroup.add(clamp)
  }

  createSpotlight(xOffset: number, yOffset: number, zOffset: number): [THREE.SpotLight, THREE.Mesh] {
    const spotLight = new THREE.SpotLight(0xffffff, 1.8, 60, Math.PI / 6, 0.5, 1.2)
    spotLight.position.set(xOffset, yOffset, zOffset)
    this.modelGroup.add(spotLight)

    const target = new THREE.Object3D()
    target.position.set(xOffset, yOffset - 3, zOffset - 20)
    this.modelGroup.add(target)
    spotLight.target = target

    const coneGeo = new THREE.ConeGeometry(7, 22, 20, 1, true)
    const coneMat = new THREE.MeshBasicMaterial({
      color: 0xffffcc,
      transparent: true,
      opacity: 0.08,
      side: THREE.DoubleSide,
      depthWrite: false
    })
    const cone = new THREE.Mesh(coneGeo, coneMat)
    cone.position.set(xOffset, yOffset - 11, zOffset - 10)
    cone.rotation.x = -Math.PI / 2
    this.modelGroup.add(cone)

    return [spotLight, cone]
  }

  setupInputListeners() {
    window.addEventListener('keydown', (e) => {
      this.keys.add(e.code)
      if (e.code === 'KeyC') {
        this.toggleMode()
      }
    })
    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.code)
    })
    this.rendererDom.addEventListener('mousedown', (e) => {
      if (e.button === 0) {
        this.mouseDown = true
        this.lastMouseX = e.clientX
        this.lastMouseY = e.clientY
      }
    })
    window.addEventListener('mouseup', () => {
      this.mouseDown = false
    })
    window.addEventListener('mousemove', (e) => {
      if (this.mouseDown && this.mode === 'free') {
        const dx = e.clientX - this.lastMouseX
        const dy = e.clientY - this.lastMouseY
        this.rotationY -= dx * 0.005
        this.rotationX -= dy * 0.005
        this.rotationX = Math.max(-Math.PI / 2 + 0.05, Math.min(Math.PI / 2 - 0.05, this.rotationX))
        this.lastMouseX = e.clientX
        this.lastMouseY = e.clientY
      }
    })
    this.rendererDom.addEventListener('wheel', (e) => {
      if (this.mode === 'free') {
        e.preventDefault()
        const dir = new THREE.Vector3(0, 0, -1)
        dir.applyEuler(new THREE.Euler(this.rotationX, this.rotationY, 0, 'YXZ'))
        const zoomSpeed = -e.deltaY * 0.015
        this.position.addScaledVector(dir, zoomSpeed * this.moveSpeed * 0.8)
      }
    }, { passive: false })
  }

  toggleMode() {
    if (this.mode === 'free') {
      this.mode = 'cruise'
      if (this.cruiseConfig) {
        this.cruiseWaypointIndex = 0
        this.cruiseProgress = 0
        this.cruiseStartTime = performance.now()
        if (this.cruiseConfig.path_visible) {
          this.showCruisePath()
        }
      }
    } else {
      this.mode = 'free'
      this.hideCruisePath()
      this.currentNarration = ''
    }
  }

  setCruiseConfig(config: CruiseConfig) {
    this.cruiseConfig = config
  }

  showCruisePath() {
    if (!this.cruiseConfig) return
    this.hideCruisePath()

    const points = this.cruiseConfig.waypoints.map(wp =>
      new THREE.Vector3(wp.position[0], wp.position[1], wp.position[2])
    )
    const curve = new THREE.CatmullRomCurve3(points, true, 'catmullrom', 0.5)
    const sampledPoints = curve.getPoints(200)
    const geometry = new THREE.BufferGeometry().setFromPoints(sampledPoints)
    const material = new THREE.LineDashedMaterial({
      color: new THREE.Color(
        this.cruiseConfig.path_color[0],
        this.cruiseConfig.path_color[1],
        this.cruiseConfig.path_color[2]
      ),
      opacity: this.cruiseConfig.path_opacity,
      transparent: true,
      dashSize: 1.2,
      gapSize: 0.8
    })
    this.cruisePathLine = new THREE.Line(geometry, material)
    this.cruisePathLine.computeLineDistances()
    this.scene.add(this.cruisePathLine)
  }

  hideCruisePath() {
    if (this.cruisePathLine) {
      this.scene.remove(this.cruisePathLine)
      this.cruisePathLine.geometry.dispose()
      ;(this.cruisePathLine.material as THREE.Material).dispose()
      this.cruisePathLine = null
    }
  }

  update(dt: number) {
    if (this.mode === 'free') {
      this.updateFreeMode(dt)
    } else {
      this.updateCruiseMode(dt)
    }

    this.clampPosition()
    this.updateTransform()
    this.emitData()
  }

  updateFreeMode(dt: number) {
    const forward = new THREE.Vector3(0, 0, -1)
    forward.applyEuler(new THREE.Euler(0, this.rotationY, 0))
    const right = new THREE.Vector3(1, 0, 0)
    right.applyEuler(new THREE.Euler(0, this.rotationY, 0))
    const up = new THREE.Vector3(0, 1, 0)

    this.velocity.set(0, 0, 0)

    if (this.keys.has('KeyW')) this.velocity.addScaledVector(forward, 1)
    if (this.keys.has('KeyS')) this.velocity.addScaledVector(forward, -1)
    if (this.keys.has('KeyA')) this.velocity.addScaledVector(right, -1)
    if (this.keys.has('KeyD')) this.velocity.addScaledVector(right, 1)
    if (this.keys.has('Space')) this.velocity.addScaledVector(up, 1)
    if (this.keys.has('ShiftLeft') || this.keys.has('ShiftRight')) this.velocity.addScaledVector(up, -1)

    if (this.velocity.lengthSq() > 0) {
      this.velocity.normalize().multiplyScalar(this.moveSpeed)
      this.position.addScaledVector(this.velocity, dt)
    }
  }

  updateCruiseMode(dt: number) {
    if (!this.cruiseConfig || this.cruiseConfig.waypoints.length < 2) {
      this.toggleMode()
      return
    }

    const waypoints = this.cruiseConfig.waypoints
    const total = waypoints.length

    this.cruiseProgress += dt * this.cruiseConfig.speed * 0.05
    if (this.cruiseProgress >= 1) {
      this.cruiseProgress -= 1
    }

    const floatIndex = this.cruiseProgress * total
    const i0 = Math.floor(floatIndex) % total
    const i1 = (i0 + 1) % total
    const localT = floatIndex - Math.floor(floatIndex)

    const easeT = localT < 0.5
      ? 2 * localT * localT
      : 1 - Math.pow(-2 * localT + 2, 2) / 2

    const wp0 = waypoints[i0]
    const wp1 = waypoints[i1]

    this.tempVec3.set(
      this.lerp(wp0.position[0], wp1.position[0], easeT),
      this.lerp(wp0.position[1], wp1.position[1], easeT),
      this.lerp(wp0.position[2], wp1.position[2], easeT)
    )
    this.position.copy(this.tempVec3)

    const lookX = this.lerp(wp0.lookAt[0], wp1.lookAt[0], easeT)
    const lookY = this.lerp(wp0.lookAt[1], wp1.lookAt[1], easeT)
    const lookZ = this.lerp(wp0.lookAt[2], wp1.lookAt[2], easeT)

    const dirX = lookX - this.position.x
    const dirY = lookY - this.position.y
    const dirZ = lookZ - this.position.z
    const dist = Math.sqrt(dirX * dirX + dirY * dirY + dirZ * dirZ)

    if (dist > 0.001) {
      this.rotationY = Math.atan2(-dirX, -dirZ)
      this.rotationX = -Math.asin(dirY / dist)
    }

    this.currentNarration = easeT < 0.5 ? wp0.narration : wp1.narration
  }

  clampPosition() {
    const boundary = 60
    this.position.x = Math.max(-boundary, Math.min(boundary, this.position.x))
    this.position.z = Math.max(-boundary, Math.min(boundary, this.position.z))
    this.position.y = Math.max(-1, Math.min(60, this.position.y))
  }

  updateTransform() {
    this.modelGroup.position.copy(this.position)
    this.tempQuat.setFromEuler(new THREE.Euler(this.rotationX, this.rotationY, 0, 'YXZ'))
    this.modelGroup.quaternion.copy(this.tempQuat)

    const cameraOffset = new THREE.Vector3(0, 0.5, 4)
    cameraOffset.applyEuler(new THREE.Euler(this.rotationX, this.rotationY, 0, 'YXZ'))
    this.camera.position.copy(this.position).add(cameraOffset)
    this.camera.quaternion.copy(this.tempQuat)
  }

  emitData() {
    let temperature = 2
    let pH = 7.5
    let depth = 2500 + (55 - this.position.y) * 15

    if (this.environmentDataProvider) {
      const env = this.environmentDataProvider(this.position)
      temperature = env.temperature
      pH = env.pH
      depth = env.depth
    }

    this.onDataUpdate({
      position: this.position.clone(),
      depth,
      temperature,
      pH,
      mode: this.mode,
      narration: this.currentNarration || undefined
    })
  }

  lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t
  }

  setEnvironmentDataProvider(
    fn: (pos: THREE.Vector3) => { temperature: number; pH: number; depth: number }
  ) {
    this.environmentDataProvider = fn
  }
}
