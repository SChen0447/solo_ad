import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { DragControls } from 'three/addons/controls/DragControls.js'
import {
  updateCurveGeometry,
  getPointOnCurve,
  pointColors,
  defaultControlPoints,
  spiralControlPoints
} from './CurveEngine'

export interface SceneControllerOptions {
  container: HTMLElement
  onControlPointChange?: (index: number, position: THREE.Vector3) => void
  onProgressChange?: (progress: number) => void
  onPlayStateChange?: (isPlaying: boolean) => void
}

export class SceneController {
  private scene: THREE.Scene
  private camera: THREE.PerspectiveCamera
  private renderer: THREE.WebGLRenderer
  private controls!: OrbitControls
  private dragControls!: DragControls

  private controlPointMeshes: THREE.Mesh[] = []
  private controlPointPositions: THREE.Vector3[] = []
  private targetPositions: THREE.Vector3[] = []

  private curveLine!: THREE.Line
  private curvePoints!: THREE.Points
  private targetCurvePositions: Float32Array | null = null
  private currentCurvePositions: Float32Array | null = null
  private curveTransitionProgress = 1

  private previewBall!: THREE.Mesh
  private previewBallGlow!: THREE.Mesh
  private trailMeshes: THREE.Mesh[] = []
  private trailPositions: THREE.Vector3[] = []
  private maxTrailLength = 30

  private clock: THREE.Clock
  private isPlaying = false
  private animationDuration = 3
  private currentProgress = 0
  private targetProgress = 0
  private progressTransitionSpeed = 3

  private keyframePositions: number[] = [0, 0.33, 0.66, 1]

  private dirty = true
  private disposed = false

  private isPresetPath = false

  constructor(private options: SceneControllerOptions) {
    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color(0x1a1a2e)

    this.camera = new THREE.PerspectiveCamera(
      60,
      options.container.clientWidth / options.container.clientHeight,
      0.1,
      100
    )
    this.camera.position.set(8, 6, 10)

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    this.renderer.setSize(options.container.clientWidth, options.container.clientHeight)
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.shadowMap.enabled = true
    options.container.appendChild(this.renderer.domElement)

    this.controls = new OrbitControls(this.camera, this.renderer.domElement)
    this.controls.enableDamping = true
    this.controls.dampingFactor = 0.2
    this.controls.minDistance = 2
    this.controls.maxDistance = 30
    this.controls.target.set(0, 1, 0)

    this.clock = new THREE.Clock()

    this.createGround()
    this.createAxes()
    this.createCurve()
    this.createPreviewBall()
    this.createControlPoints()
    this.setupDragControls()
    this.setupEventListeners()
  }

  private createGround(): void {
    const gridHelper = new THREE.GridHelper(20, 20, 0x444466, 0x333355)
    gridHelper.position.y = -0.01
    this.scene.add(gridHelper)

    const groundGeometry = new THREE.PlaneGeometry(20, 20)
    const groundMaterial = new THREE.MeshBasicMaterial({
      color: 0x16213e,
      transparent: true,
      opacity: 0.3,
      side: THREE.DoubleSide
    })
    const ground = new THREE.Mesh(groundGeometry, groundMaterial)
    ground.rotation.x = -Math.PI / 2
    ground.position.y = -0.02
    this.scene.add(ground)
  }

  private createAxes(): void {
    const axesGroup = new THREE.Group()

    const xGeom = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(10, 0, 0)
    ])
    const xMat = new THREE.LineBasicMaterial({ color: 0xff4444, linewidth: 2 })
    const xAxis = new THREE.Line(xGeom, xMat)
    axesGroup.add(xAxis)

    const yGeom = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 10, 0)
    ])
    const yMat = new THREE.LineBasicMaterial({ color: 0x44ff44, linewidth: 2 })
    const yAxis = new THREE.Line(yGeom, yMat)
    axesGroup.add(yAxis)

    const zGeom = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, 10)
    ])
    const zMat = new THREE.LineBasicMaterial({ color: 0x4488ff, linewidth: 2 })
    const zAxis = new THREE.Line(zGeom, zMat)
    axesGroup.add(zAxis)

    axesGroup.position.y = 0.01
    this.scene.add(axesGroup)
  }

  private createCurve(): void {
    const curveGeometry = new THREE.BufferGeometry()
    const curveMaterial = new THREE.LineBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.9
    })
    this.curveLine = new THREE.Line(curveGeometry, curveMaterial)
    this.scene.add(this.curveLine)

    const pointsGeometry = new THREE.BufferGeometry()
    const pointsMaterial = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.08,
      transparent: true,
      opacity: 0.7
    })
    this.curvePoints = new THREE.Points(pointsGeometry, pointsMaterial)
    this.scene.add(this.curvePoints)

    const glowGeometry = new THREE.BufferGeometry()
    const glowMaterial = new THREE.LineBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.3
    })
    const glowLine = new THREE.Line(glowGeometry, glowMaterial)
    this.scene.add(glowLine)
  }

  private createPreviewBall(): void {
    const ballGeometry = new THREE.SphereGeometry(0.3, 32, 32)
    const ballMaterial = new THREE.MeshBasicMaterial({
      color: 0xffd700,
      transparent: true,
      opacity: 1
    })
    this.previewBall = new THREE.Mesh(ballGeometry, ballMaterial)
    this.previewBall.visible = false
    this.scene.add(this.previewBall)

    const glowGeometry = new THREE.SphereGeometry(0.5, 32, 32)
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: 0xffd700,
      transparent: true,
      opacity: 0.3
    })
    this.previewBallGlow = new THREE.Mesh(glowGeometry, glowMaterial)
    this.previewBallGlow.visible = false
    this.scene.add(this.previewBallGlow)

    for (let i = 0; i < this.maxTrailLength; i++) {
      const trailGeom = new THREE.SphereGeometry(0.15, 16, 16)
      const trailMat = new THREE.MeshBasicMaterial({
        color: 0xffd700,
        transparent: true,
        opacity: 0
      })
      const trail = new THREE.Mesh(trailGeom, trailMat)
      trail.visible = false
      this.trailMeshes.push(trail)
      this.trailPositions.push(new THREE.Vector3())
      this.scene.add(trail)
    }
  }

  private createControlPoints(): void {
    const positions = [...defaultControlPoints]
    this.controlPointPositions = positions.map(p => p.clone())
    this.targetPositions = positions.map(p => p.clone())

    for (let i = 0; i < positions.length; i++) {
      const geometry = new THREE.SphereGeometry(0.25, 32, 32)
      const material = new THREE.MeshBasicMaterial({
        color: pointColors[i % pointColors.length]
      })
      const mesh = new THREE.Mesh(geometry, material)
      mesh.position.copy(positions[i])
      mesh.userData.index = i
      this.controlPointMeshes.push(mesh)
      this.scene.add(mesh)
    }

    this.updateCurveGeometry(false)
  }

  private setupDragControls(): void {
    this.dragControls = new DragControls(
      this.controlPointMeshes,
      this.camera,
      this.renderer.domElement
    )

    this.dragControls.addEventListener('dragstart', () => {
      this.controls.enabled = false
    })

    this.dragControls.addEventListener('drag', (event: any) => {
      const index = event.object.userData.index
      const pos = event.object.position
      this.targetPositions[index].copy(pos)
      this.options.onControlPointChange?.(index, pos)
      this.dirty = true
      this.curveTransitionProgress = 0
    })

    this.dragControls.addEventListener('dragend', () => {
      this.controls.enabled = true
    })
  }

  private setupEventListeners(): void {
    window.addEventListener('resize', this.onResize)
  }

  private onResize = (): void => {
    const { container } = this.options
    this.camera.aspect = container.clientWidth / container.clientHeight
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(container.clientWidth, container.clientHeight)
    this.dirty = true
  }

  public updateCurveGeometry(animate: boolean = true): void {
    const positions = this.targetPositions
    const sampleCount = 60
    const newPositions = new Float32Array((sampleCount + 1) * 3)

    for (let i = 0; i <= sampleCount; i++) {
      const t = i / sampleCount
      const point = getPointOnCurve(positions, t)
      newPositions[i * 3] = point.x
      newPositions[i * 3 + 1] = point.y
      newPositions[i * 3 + 2] = point.z
    }

    if (animate) {
      const lineGeom = this.curveLine.geometry as THREE.BufferGeometry
      const oldPosAttr = lineGeom.getAttribute('position')
      if (oldPosAttr && oldPosAttr.count > 0) {
        this.currentCurvePositions = new Float32Array(oldPosAttr.array as Float32Array)
      }
      this.targetCurvePositions = newPositions
      this.curveTransitionProgress = 0
    } else {
      const lineGeom = this.curveLine.geometry as THREE.BufferGeometry
      lineGeom.setAttribute('position', new THREE.BufferAttribute(newPositions, 3))
      lineGeom.computeBoundingSphere()

      const pointsGeom = this.curvePoints.geometry as THREE.BufferGeometry
      pointsGeom.setAttribute('position', new THREE.BufferAttribute(new Float32Array(newPositions), 3))
      pointsGeom.computeBoundingSphere()

      this.currentCurvePositions = null
      this.targetCurvePositions = null
      this.curveTransitionProgress = 1
    }

    this.dirty = true
  }

  private lerpCurvePositions(progress: number): void {
    if (!this.currentCurvePositions || !this.targetCurvePositions) return

    const result = new Float32Array(this.currentCurvePositions.length)
    for (let i = 0; i < this.currentCurvePositions.length; i++) {
      result[i] = THREE.MathUtils.lerp(
        this.currentCurvePositions[i],
        this.targetCurvePositions[i],
        progress
      )
    }

    const lineGeom = this.curveLine.geometry as THREE.BufferGeometry
    lineGeom.setAttribute('position', new THREE.BufferAttribute(result, 3))
    lineGeom.computeBoundingSphere()

    const pointsGeom = this.curvePoints.geometry as THREE.BufferGeometry
    pointsGeom.setAttribute('position', new THREE.BufferAttribute(new Float32Array(result), 3))
    pointsGeom.computeBoundingSphere()
  }

  public play(): void {
    if (this.isPlaying) return
    this.isPlaying = true
    this.clock.start()
    this.previewBall.visible = true
    this.previewBallGlow.visible = true
    this.trailMeshes.forEach(t => t.visible = true)
    this.options.onPlayStateChange?.(true)
    this.dirty = true
  }

  public pause(): void {
    this.isPlaying = false
    this.options.onPlayStateChange?.(false)
  }

  public reset(): void {
    this.isPlaying = false
    this.currentProgress = 0
    this.targetProgress = 0
    this.trailPositions.forEach(p => p.set(0, 0, 0))
    this.trailMeshes.forEach(t => {
      t.visible = false
      ;(t.material as THREE.MeshBasicMaterial).opacity = 0
    })
    this.options.onProgressChange?.(0)
    this.options.onPlayStateChange?.(false)
    this.dirty = true
  }

  public setProgress(progress: number): void {
    this.targetProgress = THREE.MathUtils.clamp(progress, 0, 1)
    if (!this.isPlaying) {
      this.previewBall.visible = true
      this.previewBallGlow.visible = true
    }
    this.dirty = true
  }

  public getProgress(): number {
    return this.currentProgress
  }

  public getIsPlaying(): boolean {
    return this.isPlaying
  }

  public setControlPointPosition(index: number, position: THREE.Vector3): void {
    if (index >= 0 && index < this.targetPositions.length) {
      this.targetPositions[index].copy(position)
      this.controlPointMeshes[index].position.copy(position)
      this.curveTransitionProgress = 0
      this.dirty = true
    }
  }

  public getControlPoints(): THREE.Vector3[] {
    return this.targetPositions.map(p => p.clone())
  }

  public loadPresetPath(): void {
    this.isPresetPath = true
    const positions = [...spiralControlPoints]

    while (this.controlPointMeshes.length > positions.length) {
      const mesh = this.controlPointMeshes.pop()
      if (mesh) this.scene.remove(mesh)
      this.targetPositions.pop()
      this.controlPointPositions.pop()
    }

    while (this.controlPointMeshes.length < positions.length) {
      const i = this.controlPointMeshes.length
      const geometry = new THREE.SphereGeometry(0.25, 32, 32)
      const material = new THREE.MeshBasicMaterial({
        color: pointColors[i % pointColors.length]
      })
      const mesh = new THREE.Mesh(geometry, material)
      mesh.position.copy(positions[i])
      mesh.userData.index = i
      this.controlPointMeshes.push(mesh)
      this.targetPositions.push(positions[i].clone())
      this.controlPointPositions.push(positions[i].clone())
      this.scene.add(mesh)
    }

    for (let i = 0; i < positions.length; i++) {
      this.targetPositions[i].copy(positions[i])
      this.controlPointMeshes[i].position.copy(positions[i])
      this.options.onControlPointChange?.(i, positions[i])
    }

    this.updateCurveGeometry(false)
    this.dragControls.dispose()
    this.setupDragControls()
    this.updateTrailColors(true)
  }

  public loadDefaultPath(): void {
    this.isPresetPath = false
    const positions = [...defaultControlPoints]

    while (this.controlPointMeshes.length > positions.length) {
      const mesh = this.controlPointMeshes.pop()
      if (mesh) this.scene.remove(mesh)
      this.targetPositions.pop()
      this.controlPointPositions.pop()
    }

    while (this.controlPointMeshes.length < positions.length) {
      const i = this.controlPointMeshes.length
      const geometry = new THREE.SphereGeometry(0.25, 32, 32)
      const material = new THREE.MeshBasicMaterial({
        color: pointColors[i % pointColors.length]
      })
      const mesh = new THREE.Mesh(geometry, material)
      mesh.position.copy(positions[i])
      mesh.userData.index = i
      this.controlPointMeshes.push(mesh)
      this.targetPositions.push(positions[i].clone())
      this.controlPointPositions.push(positions[i].clone())
      this.scene.add(mesh)
    }

    for (let i = 0; i < positions.length; i++) {
      this.targetPositions[i].copy(positions[i])
      this.controlPointMeshes[i].position.copy(positions[i])
      this.options.onControlPointChange?.(i, positions[i])
    }

    this.updateCurveGeometry(false)
    this.dragControls.dispose()
    this.setupDragControls()
    this.updateTrailColors(false)
  }

  public clearControlPoints(): void {
    this.isPresetPath = false
    const positions = [
      new THREE.Vector3(-3, 0, -2),
      new THREE.Vector3(-1, 1, 0),
      new THREE.Vector3(1, 0, 1),
      new THREE.Vector3(3, 1, -1)
    ]

    while (this.controlPointMeshes.length > positions.length) {
      const mesh = this.controlPointMeshes.pop()
      if (mesh) this.scene.remove(mesh)
      this.targetPositions.pop()
      this.controlPointPositions.pop()
    }

    while (this.controlPointMeshes.length < positions.length) {
      const i = this.controlPointMeshes.length
      const geometry = new THREE.SphereGeometry(0.25, 32, 32)
      const material = new THREE.MeshBasicMaterial({
        color: pointColors[i % pointColors.length]
      })
      const mesh = new THREE.Mesh(geometry, material)
      mesh.position.copy(positions[i])
      mesh.userData.index = i
      this.controlPointMeshes.push(mesh)
      this.targetPositions.push(positions[i].clone())
      this.controlPointPositions.push(positions[i].clone())
      this.scene.add(mesh)
    }

    for (let i = 0; i < positions.length; i++) {
      this.targetPositions[i].copy(positions[i])
      this.controlPointMeshes[i].position.copy(positions[i])
      this.options.onControlPointChange?.(i, positions[i])
    }

    this.updateCurveGeometry(false)
    this.dragControls.dispose()
    this.setupDragControls()
    this.updateTrailColors(false)
  }

  private updateTrailColors(isPreset: boolean): void {
    for (let i = 0; i < this.trailMeshes.length; i++) {
      const material = this.trailMeshes[i].material as THREE.MeshBasicMaterial
      if (isPreset) {
        const hue = (1 - i / this.trailMeshes.length) * 0.8
        material.color.setHSL(hue, 1, 0.6)
      } else {
        material.color.set(0xffd700)
      }
    }
  }

  public update(): void {
    if (this.disposed) return

    const delta = this.clock.getDelta()
    let needsRender = false

    this.controls.update()
    if (this.controls.enableDamping) {
      needsRender = true
    }

    for (let i = 0; i < this.controlPointMeshes.length; i++) {
      const target = this.targetPositions[i]
      const current = this.controlPointPositions[i]
      const mesh = this.controlPointMeshes[i]

      current.lerp(target, 1 - Math.pow(0.001, delta))

      if (current.distanceTo(mesh.position) > 0.001) {
        mesh.position.copy(current)
        needsRender = true
      }
    }

    if (this.curveTransitionProgress < 1) {
      this.curveTransitionProgress = Math.min(1, this.curveTransitionProgress + delta * 2)
      const eased = 1 - Math.pow(1 - this.curveTransitionProgress, 3)
      this.lerpCurvePositions(eased)
      needsRender = true
    }

    if (this.isPlaying) {
      this.currentProgress += delta / this.animationDuration
      if (this.currentProgress >= 1) {
        this.currentProgress = 1
        this.isPlaying = false
        this.options.onPlayStateChange?.(false)
      }
      this.targetProgress = this.currentProgress
      this.options.onProgressChange?.(this.currentProgress)
      needsRender = true
    } else if (Math.abs(this.currentProgress - this.targetProgress) > 0.001) {
      this.currentProgress = THREE.MathUtils.lerp(
        this.currentProgress,
        this.targetProgress,
        1 - Math.pow(0.01, delta * this.progressTransitionSpeed)
      )
      needsRender = true
    }

    if (this.previewBall.visible && needsRender) {
      const pos = getPointOnCurve(this.targetPositions, this.currentProgress)
      this.previewBall.position.copy(pos)
      this.previewBallGlow.position.copy(pos)

      if (this.isPlaying || this.trailMeshes[0].visible) {
        this.updateTrail(pos, delta)
      }
    }

    if (this.dirty || needsRender) {
      this.render()
      this.dirty = false
    }
  }

  private updateTrail(currentPos: THREE.Vector3, delta: number): void {
    const lastPos = this.trailPositions[0]
    const moveDist = currentPos.distanceTo(lastPos)

    if (moveDist > 0.05) {
      for (let i = this.trailPositions.length - 1; i > 0; i--) {
        this.trailPositions[i].copy(this.trailPositions[i - 1])
      }
      this.trailPositions[0].copy(currentPos)
    }

    for (let i = 0; i < this.trailMeshes.length; i++) {
      const mesh = this.trailMeshes[i]
      const pos = this.trailPositions[i]
      mesh.position.copy(pos)

      const opacity = Math.max(0, 1 - i / this.trailMeshes.length) * 0.6
      ;(mesh.material as THREE.MeshBasicMaterial).opacity = opacity * (this.isPlaying ? 1 : 0.3)
      mesh.scale.setScalar(1 - i / this.trailMeshes.length * 0.7)
      mesh.visible = opacity > 0.01
    }
  }

  private render(): void {
    this.renderer.render(this.scene, this.camera)
  }

  public getKeyframePositions(): number[] {
    return [...this.keyframePositions]
  }

  public setKeyframePosition(index: number, value: number): void {
    if (index >= 0 && index < this.keyframePositions.length) {
      this.keyframePositions[index] = THREE.MathUtils.clamp(value, 0, 1)
    }
  }

  public dispose(): void {
    this.disposed = true
    window.removeEventListener('resize', this.onResize)
    this.controls.dispose()
    this.dragControls.dispose()
    this.renderer.dispose()
    if (this.renderer.domElement.parentNode) {
      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement)
    }
  }
}
