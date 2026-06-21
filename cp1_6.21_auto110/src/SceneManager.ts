import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import TWEEN from '@tweenjs/tween.js'
import { PipelineManager, PipelineConfig, PipelineType } from './PipelineManager'

export interface SceneConfig {
  roadLength: number
  roadWidth: number
  soilDepth: number
}

const DEFAULT_CONFIG: SceneConfig = {
  roadLength: 30,
  roadWidth: 12,
  soilDepth: 3
}

const INITIAL_CAMERA_POSITION = new THREE.Vector3(18, 12, 20)
const INITIAL_TARGET = new THREE.Vector3(0, -1, 0)

export class SceneManager {
  private scene: THREE.Scene
  private camera: THREE.PerspectiveCamera
  private renderer: THREE.WebGLRenderer
  private controls: OrbitControls
  private pipelineManager: PipelineManager
  private animationId: number | null = null
  private pipelineGroup: THREE.Group
  private soilGroup: THREE.Group
  private roadGroup: THREE.Group
  private highlightGroup: THREE.Group
  private conflictGroup: THREE.Group
  private config: SceneConfig
  private isDetailMode: boolean = true
  private detailThreshold: number = 35
  private onQualityChange?: (isHigh: boolean) => void
  private onConflictChange?: (hasConflict: boolean) => void
  private clock: THREE.Clock
  private pipelineVisibility: Record<PipelineType, boolean> = {
    water: true,
    drainage: true,
    electric: true,
    gas: true
  }

  constructor(canvas: HTMLCanvasElement, config?: Partial<SceneConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.clock = new THREE.Clock()

    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color(0x2A2A2A)
    this.scene.fog = new THREE.Fog(0x2A2A2A, 30, 80)

    this.camera = new THREE.PerspectiveCamera(
      50,
      window.innerWidth / window.innerHeight,
      0.1,
      200
    )
    this.camera.position.copy(INITIAL_CAMERA_POSITION)

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false
    })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.setSize(window.innerWidth, window.innerHeight)
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.1

    this.controls = new OrbitControls(this.camera, this.renderer.domElement)
    this.controls.enableDamping = true
    this.controls.dampingFactor = 0.05
    this.controls.target.copy(INITIAL_TARGET)
    this.controls.minDistance = 5
    this.controls.maxDistance = 60
    this.controls.maxPolarAngle = Math.PI * 0.48
    this.controls.minPolarAngle = 0.1

    this.pipelineGroup = new THREE.Group()
    this.pipelineGroup.name = 'pipelines'
    this.soilGroup = new THREE.Group()
    this.soilGroup.name = 'soil'
    this.roadGroup = new THREE.Group()
    this.roadGroup.name = 'road'
    this.highlightGroup = new THREE.Group()
    this.highlightGroup.name = 'highlights'
    this.conflictGroup = new THREE.Group()
    this.conflictGroup.name = 'conflicts'

    this.scene.add(this.pipelineGroup, this.soilGroup, this.roadGroup, this.highlightGroup, this.conflictGroup)

    this.pipelineManager = new PipelineManager(this.config)

    this.setupLights()
    this.createRoadAndSoil()
    this.createGridHelper()
    this.setupResizeHandler()
  }

  private setupLights(): void {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4)
    this.scene.add(ambientLight)

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8)
    directionalLight.position.set(10, 15, 10)
    directionalLight.castShadow = true
    directionalLight.shadow.mapSize.width = 2048
    directionalLight.shadow.mapSize.height = 2048
    directionalLight.shadow.camera.near = 0.5
    directionalLight.shadow.camera.far = 50
    directionalLight.shadow.camera.left = -20
    directionalLight.shadow.camera.right = 20
    directionalLight.shadow.camera.top = 20
    directionalLight.shadow.camera.bottom = -20
    this.scene.add(directionalLight)

    const fillLight = new THREE.DirectionalLight(0x88aaff, 0.3)
    fillLight.position.set(-8, 5, -8)
    this.scene.add(fillLight)

    const hemisphereLight = new THREE.HemisphereLight(0x87CEEB, 0x3a2817, 0.3)
    this.scene.add(hemisphereLight)
  }

  private createRoadAndSoil(): void {
    const { roadLength, roadWidth, soilDepth } = this.config

    const roadGeometry = new THREE.BoxGeometry(roadWidth, 0.15, roadLength)
    const roadMaterial = new THREE.MeshStandardMaterial({
      color: 0x4a4a4a,
      roughness: 0.8,
      metalness: 0.1,
      transparent: true,
      opacity: 0.7
    })
    const road = new THREE.Mesh(roadGeometry, roadMaterial)
    road.position.y = -0.075
    road.receiveShadow = true
    this.roadGroup.add(road)

    const soilLayers = this.pipelineManager.createSoilLayers()
    this.soilGroup.add(...soilLayers)

    const sideWallMaterial = new THREE.MeshStandardMaterial({
      color: 0x5c4033,
      roughness: 0.9,
      metalness: 0.0,
      side: THREE.DoubleSide
    })

    const leftWall = new THREE.Mesh(
      new THREE.PlaneGeometry(roadLength, soilDepth),
      sideWallMaterial
    )
    leftWall.rotation.y = Math.PI / 2
    leftWall.position.set(-roadWidth / 2, -soilDepth / 2, 0)
    this.soilGroup.add(leftWall)

    const rightWall = new THREE.Mesh(
      new THREE.PlaneGeometry(roadLength, soilDepth),
      sideWallMaterial
    )
    rightWall.rotation.y = -Math.PI / 2
    rightWall.position.set(roadWidth / 2, -soilDepth / 2, 0)
    this.soilGroup.add(rightWall)

    const backWall = new THREE.Mesh(
      new THREE.PlaneGeometry(roadWidth, soilDepth),
      sideWallMaterial
    )
    backWall.position.set(0, -soilDepth / 2, -roadLength / 2)
    this.soilGroup.add(backWall)
  }

  private createGridHelper(): void {
    const gridHelper = new THREE.GridHelper(40, 40, 0x444444, 0x333333)
    gridHelper.position.y = -0.01
    this.scene.add(gridHelper)
  }

  private setupResizeHandler(): void {
    window.addEventListener('resize', this.handleResize.bind(this))
  }

  private handleResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(window.innerWidth, window.innerHeight)
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  }

  public addPipeline(config: PipelineConfig): void {
    const meshes = this.pipelineManager.createPipeline(config)
    meshes.forEach(mesh => {
      this.pipelineGroup.add(mesh)
    })
    this.updateConflictDetection()
  }

  public removePipeline(type: PipelineType): void {
    const toRemove: THREE.Object3D[] = []
    this.pipelineGroup.traverse((child) => {
      if (child.userData.pipelineType === type) {
        toRemove.push(child)
      }
    })
    toRemove.forEach(obj => {
      this.pipelineGroup.remove(obj)
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose()
        if (Array.isArray(obj.material)) {
          obj.material.forEach(m => m.dispose())
        } else {
          obj.material.dispose()
        }
      }
    })
    this.updateConflictDetection()
  }

  public updatePipeline(type: PipelineType, config: Partial<PipelineConfig>): void {
    const pipeMeshes: THREE.Mesh[] = []
    this.pipelineGroup.traverse((child) => {
      if (child.userData.pipelineType === type && child instanceof THREE.Mesh) {
        pipeMeshes.push(child)
      }
    })

    if (pipeMeshes.length === 0) return

    const oldDepth = pipeMeshes[0].userData.depth
    const oldDiameter = pipeMeshes[0].userData.diameter

    const newDepth = config.depth !== undefined ? config.depth : oldDepth
    const newDiameter = config.diameter !== undefined ? config.diameter : oldDiameter
    const newX = config.xPosition !== undefined ? config.xPosition : pipeMeshes[0].position.x

    this.showHighlight(newX, newDepth, newDiameter)

    pipeMeshes.forEach(mesh => {
      const startPos = { y: mesh.position.y, x: mesh.position.x }
      const endPos = { y: newDepth, x: newX }

      new TWEEN.Tween(startPos)
        .to(endPos, 400)
        .easing(TWEEN.Easing.Cubic.Out)
        .onUpdate(() => {
          mesh.position.y = startPos.y
          mesh.position.x = startPos.x
        })
        .start()

      if (mesh.userData.isPipe) {
        const startScale = { x: mesh.scale.x, y: mesh.scale.y }
        const endScale = {
          x: newDiameter / (mesh.userData.baseDiameter || 1),
          y: newDiameter / (mesh.userData.baseDiameter || 1)
        }

        new TWEEN.Tween(startScale)
          .to(endScale, 400)
          .easing(TWEEN.Easing.Cubic.Out)
          .onUpdate(() => {
            mesh.scale.x = startScale.x
            mesh.scale.y = startScale.y
          })
          .start()
      }

      mesh.userData.depth = newDepth
      mesh.userData.diameter = newDiameter
    })

    setTimeout(() => {
      this.updateConflictDetection()
    }, 450)
  }

  private showHighlight(x: number, y: number, diameter: number): void {
    const highlightGeo = new THREE.RingGeometry(diameter * 0.6, diameter * 1.8, 32)
    const highlightMat = new THREE.MeshBasicMaterial({
      color: 0xffe066,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide
    })
    const highlight = new THREE.Mesh(highlightGeo, highlightMat)
    highlight.position.set(x, y, 0)
    highlight.rotation.x = Math.PI / 2
    this.highlightGroup.add(highlight)

    const opacity = { value: 0 }
    new TWEEN.Tween(opacity)
      .to({ value: 0.6 }, 200)
      .easing(TWEEN.Easing.Quadratic.Out)
      .onUpdate(() => {
        highlightMat.opacity = opacity.value
      })
      .start()

    setTimeout(() => {
      new TWEEN.Tween(opacity)
        .to({ value: 0 }, 500)
        .easing(TWEEN.Easing.Quadratic.In)
        .onUpdate(() => {
          highlightMat.opacity = opacity.value
        })
        .onComplete(() => {
          this.highlightGroup.remove(highlight)
          highlightGeo.dispose()
          highlightMat.dispose()
        })
        .start()
    }, 1500)
  }

  private updateConflictDetection(): void {
    while (this.conflictGroup.children.length > 0) {
      const child = this.conflictGroup.children[0]
      this.conflictGroup.remove(child)
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose()
        if (Array.isArray(child.material)) {
          child.material.forEach(m => m.dispose())
        } else {
          child.material.dispose()
        }
      }
    }

    const pipes: { mesh: THREE.Mesh; type: PipelineType; x: number; y: number; diameter: number }[] = []
    this.pipelineGroup.traverse((child) => {
      if (child.userData.isPipe && child instanceof THREE.Mesh) {
        pipes.push({
          mesh: child,
          type: child.userData.pipelineType,
          x: child.position.x,
          y: child.userData.depth,
          diameter: child.userData.diameter
        })
      }
    })

    const conflictDistance = 0.3
    let hasConflict = false

    for (let i = 0; i < pipes.length; i++) {
      for (let j = i + 1; j < pipes.length; j++) {
        const pipeA = pipes[i]
        const pipeB = pipes[j]

        const hDist = Math.abs(pipeA.x - pipeB.x) - (pipeA.diameter + pipeB.diameter) / 2
        const vDist = Math.abs(pipeA.y - pipeB.y) - (pipeA.diameter + pipeB.diameter) / 2

        if (hDist < conflictDistance || vDist < conflictDistance) {
          hasConflict = true
          this.createConflictIndicator(pipeA, pipeB)
        }
      }
    }

    if (this.onConflictChange) {
      this.onConflictChange(hasConflict)
    }
  }

  private createConflictIndicator(
    pipeA: { x: number; y: number; type: PipelineType },
    pipeB: { x: number; y: number; type: PipelineType }
  ): void {
    const lineGeometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(pipeA.x, pipeA.y, 0),
      new THREE.Vector3(pipeB.x, pipeB.y, 0)
    ])
    const lineMaterial = new THREE.LineBasicMaterial({
      color: 0xff4444,
      transparent: true,
      opacity: 0.7
    })
    const line = new THREE.Line(lineGeometry, lineMaterial)
    line.userData.isConflictLine = true
    this.conflictGroup.add(line)

    const dotGeometry = new THREE.SphereGeometry(0.08, 12, 12)
    const dotMaterial = new THREE.MeshBasicMaterial({
      color: 0xff2222,
      transparent: true,
      opacity: 1
    })
    const dot = new THREE.Mesh(dotGeometry, dotMaterial)
    dot.position.set(pipeB.x, pipeB.y, 0)
    dot.userData.isConflictDot = true
    dot.userData.blinkPhase = Math.random() * Math.PI * 2
    this.conflictGroup.add(dot)

    const dot2 = new THREE.Mesh(dotGeometry.clone(), dotMaterial.clone())
    dot2.position.set(pipeA.x, pipeA.y, 0)
    dot2.userData.isConflictDot = true
    dot2.userData.blinkPhase = Math.random() * Math.PI * 2
    this.conflictGroup.add(dot2)

    const midX = (pipeA.x + pipeB.x) / 2
    const midY = (pipeA.y + pipeB.y) / 2
    const label = this.createTextLabel('冲突！最小间距不足', 0xff4444)
    label.position.set(midX, midY + 0.3, 0.5)
    label.userData.isConflictLabel = true
    this.conflictGroup.add(label)
  }

  private createTextLabel(text: string, color: number): THREE.Sprite {
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d')!
    canvas.width = 256
    canvas.height = 64

    context.font = 'bold 20px sans-serif'
    context.textAlign = 'center'
    context.textBaseline = 'middle'

    context.fillStyle = 'rgba(0, 0, 0, 0.7)'
    const textWidth = context.measureText(text).width
    const bgWidth = textWidth + 24
    const bgHeight = 36
    context.fillRect(
      (canvas.width - bgWidth) / 2,
      (canvas.height - bgHeight) / 2,
      bgWidth,
      bgHeight
    )

    context.strokeStyle = '#' + color.toString(16).padStart(6, '0')
    context.lineWidth = 2
    context.strokeRect(
      (canvas.width - bgWidth) / 2,
      (canvas.height - bgHeight) / 2,
      bgWidth,
      bgHeight
    )

    context.fillStyle = '#' + color.toString(16).padStart(6, '0')
    context.fillText(text, canvas.width / 2, canvas.height / 2)

    const texture = new THREE.CanvasTexture(canvas)
    const spriteMaterial = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: false
    })
    const sprite = new THREE.Sprite(spriteMaterial)
    sprite.scale.set(2, 0.5, 1)

    return sprite
  }

  public setPipelineVisibility(type: PipelineType, visible: boolean): void {
    this.pipelineVisibility[type] = visible
    this.updatePipelineVisibility(type)
    this.updateConflictDetection()
  }

  private updatePipelineVisibility(type: PipelineType): void {
    const visible = this.pipelineVisibility[type]
    const isDetail = this.isDetailMode

    this.pipelineGroup.traverse((child) => {
      if (child.userData.pipelineType === type) {
        if (child.userData.isPipe) {
          child.visible = visible && isDetail
        } else if (child.userData.isProtector) {
          child.visible = visible && isDetail
        } else if (child.userData.isSimplified) {
          child.visible = visible && !isDetail
        } else {
          child.visible = visible
        }
      }
    })
  }

  public resetCamera(): void {
    const startPos = { ...this.camera.position }
    const startTarget = { ...this.controls.target }
    const endPos = { x: INITIAL_CAMERA_POSITION.x, y: INITIAL_CAMERA_POSITION.y, z: INITIAL_CAMERA_POSITION.z }
    const endTarget = { x: INITIAL_TARGET.x, y: INITIAL_TARGET.y, z: INITIAL_TARGET.z }

    new TWEEN.Tween({ ...startPos, tx: startTarget.x, ty: startTarget.y, tz: startTarget.z })
      .to({ ...endPos, tx: endTarget.x, ty: endTarget.y, tz: endTarget.z }, 600)
      .easing(TWEEN.Easing.Cubic.InOut)
      .onUpdate((obj: { x: number; y: number; z: number; tx: number; ty: number; tz: number }) => {
        this.camera.position.set(obj.x, obj.y, obj.z)
        this.controls.target.set(obj.tx, obj.ty, obj.tz)
        this.controls.update()
      })
      .start()
  }

  public setOnQualityChange(callback: (isHigh: boolean) => void): void {
    this.onQualityChange = callback
  }

  public setOnConflictChange(callback: (hasConflict: boolean) => void): void {
    this.onConflictChange = callback
  }

  private updateDetailLevel(): void {
    const distance = this.camera.position.distanceTo(this.controls.target)
    const shouldBeDetail = distance < this.detailThreshold

    if (shouldBeDetail !== this.isDetailMode) {
      this.isDetailMode = shouldBeDetail
      this.applyDetailLevel(shouldBeDetail)
    }
  }

  private applyDetailLevel(isDetail: boolean): void {
    const types: PipelineType[] = ['water', 'drainage', 'electric', 'gas']
    types.forEach(type => {
      this.updatePipelineVisibility(type)
    })

    this.soilGroup.traverse((child) => {
      if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial) {
        const targetOpacity = isDetail ? 0.85 : 0.5
        new TWEEN.Tween({ opacity: child.material.opacity || 0.85 })
          .to({ opacity: targetOpacity }, 300)
          .easing(TWEEN.Easing.Quadratic.InOut)
          .onUpdate((obj: { opacity: number }) => {
            child.material.opacity = obj.opacity
          })
          .start()
      }
    })

    if (this.onQualityChange) {
      this.onQualityChange(isDetail)
    }
  }

  public start(): void {
    this.animate()
  }

  public stop(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId)
      this.animationId = null
    }
  }

  private animate(): void {
    this.animationId = requestAnimationFrame(this.animate.bind(this))

    const elapsed = this.clock.getElapsedTime()

    TWEEN.update()
    this.controls.update()

    this.updateDetailLevel()

    this.conflictGroup.traverse((child) => {
      if (child.userData.isConflictDot && child instanceof THREE.Mesh) {
        const phase = child.userData.blinkPhase || 0
        const blink = (Math.sin(elapsed * Math.PI * 2 / 0.8 + phase) + 1) / 2
        if (child.material instanceof THREE.MeshBasicMaterial) {
          child.material.opacity = 0.3 + blink * 0.7
        }
      }
      if (child.userData.isConflictLabel && child instanceof THREE.Sprite) {
        const phase = child.userData.blinkPhase || 0
        const blink = (Math.sin(elapsed * Math.PI * 2 / 0.8 + phase) + 1) / 2
        if (child.material instanceof THREE.SpriteMaterial) {
          child.material.opacity = 0.5 + blink * 0.5
        }
      }
    })

    this.renderer.render(this.scene, this.camera)
  }

  public dispose(): void {
    this.stop()
    window.removeEventListener('resize', this.handleResize.bind(this))
    this.controls.dispose()
    this.renderer.dispose()
  }
}
