import * as THREE from 'three'
import { FragmentData, MatchResult } from '../store/appStore'
import { MatchingEngine } from '../engine/MatchingEngine'

export interface SceneFragmentState {
  id: string
  mesh: THREE.Mesh | null
  outline: THREE.LineSegments | null
  helperAxes: THREE.Group | null
  shadowLine: THREE.Line | null
  matchLabel: THREE.Sprite | null
}

export class SceneManager {
  private scene: THREE.Scene
  private camera: THREE.PerspectiveCamera
  private renderer: THREE.WebGLRenderer | null = null
  private fragmentStates: Map<string, SceneFragmentState> = new Map()
  private matchHighlightLines: Map<string, THREE.Line> = new Map()
  private animationFrameId: number | null = null
  private onFrameCallback: (() => void) | null = null
  private groundGrid: THREE.GridHelper | null = null
  private referenceRing: THREE.LineLoop | null = null
  private lightGroup: THREE.Group | null = null
  private mergedMesh: THREE.Mesh | null = null

  constructor() {
    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color('#1a1a2e')
    this.scene.fog = new THREE.Fog('#1a1a2e', 30, 80)

    this.camera = new THREE.PerspectiveCamera(
      60,
      1,
      0.1,
      1000
    )
    this.camera.position.set(15, 12, 15)
    this.camera.lookAt(0, 0, 0)
  }

  public initialize(container: HTMLElement): void {
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.setSize(container.clientWidth, container.clientHeight)
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
    this.renderer.outputColorSpace = THREE.SRGBColorSpace
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.2

    container.appendChild(this.renderer.domElement)

    this.setupLighting()
    this.setupGround()
    this.startRenderLoop()

    window.addEventListener('resize', this.handleResize)
  }

  private setupLighting(): void {
    this.lightGroup = new THREE.Group()

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4)
    this.lightGroup.add(ambientLight)

    const warmLight = new THREE.PointLight(0xffaa66, 0.8, 50)
    warmLight.position.set(10, 15, 10)
    warmLight.castShadow = true
    warmLight.shadow.mapSize.width = 1024
    warmLight.shadow.mapSize.height = 1024
    this.lightGroup.add(warmLight)

    const coolLight = new THREE.PointLight(0x6699ff, 0.6, 50)
    coolLight.position.set(-10, 12, -8)
    this.lightGroup.add(coolLight)

    const fillLight = new THREE.DirectionalLight(0xffffff, 0.3)
    fillLight.position.set(0, 20, 0)
    this.lightGroup.add(fillLight)

    this.scene.add(this.lightGroup)
  }

  private setupGround(): void {
    this.groundGrid = new THREE.GridHelper(40, 40, 0x4a4a6e, 0x2a2a4e)
    this.groundGrid.position.y = -0.01
    this.groundGrid.material.transparent = true
    this.groundGrid.material.opacity = 0.4
    this.scene.add(this.groundGrid)

    const ringPoints: THREE.Vector3[] = []
    const ringRadius = 10
    const segments = 128
    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2
      ringPoints.push(
        new THREE.Vector3(
          Math.cos(angle) * ringRadius,
          0,
          Math.sin(angle) * ringRadius
        )
      )
    }
    const ringGeometry = new THREE.BufferGeometry().setFromPoints(ringPoints)
    const ringMaterial = new THREE.LineBasicMaterial({
      color: 0x4a4a6e,
      transparent: true,
      opacity: 0.6
    })
    this.referenceRing = new THREE.LineLoop(ringGeometry, ringMaterial)
    this.scene.add(this.referenceRing)
  }

  private startRenderLoop(): void {
    const animate = () => {
      this.animationFrameId = requestAnimationFrame(animate)
      this.updateMatchHighlights()
      this.render()
      if (this.onFrameCallback) {
        this.onFrameCallback()
      }
    }
    animate()
  }

  private render(): void {
    if (!this.renderer) return
    this.renderer.render(this.scene, this.camera)
  }

  private handleResize = (): void => {
    if (!this.renderer || !this.renderer.domElement.parentElement) return
    const parent = this.renderer.domElement.parentElement
    const width = parent.clientWidth
    const height = parent.clientHeight
    this.camera.aspect = width / height
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(width, height)
  }

  public setOnFrameCallback(callback: (() => void) | null): void {
    this.onFrameCallback = callback
  }

  public getScene(): THREE.Scene {
    return this.scene
  }

  public getCamera(): THREE.PerspectiveCamera {
    return this.camera
  }

  public getRenderer(): THREE.WebGLRenderer | null {
    return this.renderer
  }

  public addFragment(fragment: FragmentData): void {
    if (!fragment.geometry) return

    const state: SceneFragmentState = {
      id: fragment.id,
      mesh: null,
      outline: null,
      helperAxes: null,
      shadowLine: null,
      matchLabel: null
    }

    const material = new THREE.MeshStandardMaterial({
      color: 0xd4a574,
      roughness: 0.7,
      metalness: 0.1,
      flatShading: false,
      side: THREE.DoubleSide
    })

    const mesh = new THREE.Mesh(fragment.geometry.clone(), material)
    mesh.position.copy(fragment.position)
    mesh.rotation.copy(fragment.rotation)
    mesh.scale.copy(fragment.scale)
    mesh.castShadow = true
    mesh.receiveShadow = true
    mesh.userData.fragmentId = fragment.id

    state.mesh = mesh
    this.scene.add(mesh)

    const edges = new THREE.EdgesGeometry(fragment.geometry, 20)
    const outlineMaterial = new THREE.LineBasicMaterial({
      color: fragment.selected ? 0xe94560 : 0xffffff,
      transparent: true,
      opacity: fragment.selected ? 1 : 0.3
    })
    const outline = new THREE.LineSegments(edges, outlineMaterial)
    outline.position.copy(fragment.position)
    outline.rotation.copy(fragment.rotation)
    outline.scale.copy(fragment.scale)
    state.outline = outline
    this.scene.add(outline)

    this.fragmentStates.set(fragment.id, state)
  }

  public updateFragment(fragment: FragmentData): void {
    const state = this.fragmentStates.get(fragment.id)
    if (!state) return

    if (state.mesh) {
      state.mesh.position.copy(fragment.position)
      state.mesh.rotation.copy(fragment.rotation)
      state.mesh.scale.copy(fragment.scale)
    }

    if (state.outline) {
      state.outline.position.copy(fragment.position)
      state.outline.rotation.copy(fragment.rotation)
      state.outline.scale.copy(fragment.scale)
      const outlineMat = state.outline.material as THREE.LineBasicMaterial
      outlineMat.color.setHex(fragment.selected ? 0xe94560 : 0xffffff)
      outlineMat.opacity = fragment.selected ? 1 : 0.3
    }
  }

  public removeFragment(id: string): void {
    const state = this.fragmentStates.get(id)
    if (!state) return

    if (state.mesh) {
      this.scene.remove(state.mesh)
      state.mesh.geometry.dispose()
      ;(state.mesh.material as THREE.Material).dispose()
    }
    if (state.outline) {
      this.scene.remove(state.outline)
      state.outline.geometry.dispose()
      ;(state.outline.material as THREE.Material).dispose()
    }
    if (state.helperAxes) {
      this.scene.remove(state.helperAxes)
    }
    if (state.shadowLine) {
      this.scene.remove(state.shadowLine)
    }
    if (state.matchLabel) {
      this.scene.remove(state.matchLabel)
    }

    this.fragmentStates.delete(id)
    this.removeMatchHighlight(id)
  }

  public showHelperAxes(id: string, show: boolean): void {
    const state = this.fragmentStates.get(id)
    if (!state || !state.mesh) return

    if (show && !state.helperAxes) {
      const axesGroup = new THREE.Group()

      const xAxis = this.createAxisLine(0xff4444, new THREE.Vector3(2, 0, 0))
      const yAxis = this.createAxisLine(0x44ff44, new THREE.Vector3(0, 2, 0))
      const zAxis = this.createAxisLine(0x4488ff, new THREE.Vector3(0, 0, 2))

      axesGroup.add(xAxis, yAxis, zAxis)
      axesGroup.position.copy(state.mesh.position)
      axesGroup.rotation.copy(state.mesh.rotation)

      state.helperAxes = axesGroup
      this.scene.add(axesGroup)
    } else if (!show && state.helperAxes) {
      this.scene.remove(state.helperAxes)
      state.helperAxes = null
    }
  }

  private createAxisLine(color: number, direction: THREE.Vector3): THREE.Group {
    const group = new THREE.Group()

    const points = [new THREE.Vector3(0, 0, 0), direction.clone()]
    const geometry = new THREE.BufferGeometry().setFromPoints(points)
    const material = new THREE.LineBasicMaterial({ color, linewidth: 2 })
    const line = new THREE.Line(geometry, material)
    group.add(line)

    const coneGeometry = new THREE.ConeGeometry(0.08, 0.25, 8)
    const coneMaterial = new THREE.MeshBasicMaterial({ color })
    const cone = new THREE.Mesh(coneGeometry, coneMaterial)

    if (direction.x !== 0) {
      cone.rotation.z = -Math.PI / 2
      cone.position.set(direction.x, 0, 0)
    } else if (direction.y !== 0) {
      cone.position.set(0, direction.y, 0)
    } else {
      cone.rotation.x = Math.PI / 2
      cone.position.set(0, 0, direction.z)
    }
    group.add(cone)

    return group
  }

  public showShadowProjection(id: string, show: boolean): void {
    const state = this.fragmentStates.get(id)
    if (!state || !state.mesh) return

    if (show && !state.shadowLine) {
      const points = [
        state.mesh.position.clone(),
        new THREE.Vector3(state.mesh.position.x, 0, state.mesh.position.z)
      ]
      const geometry = new THREE.BufferGeometry().setFromPoints(points)
      const material = new THREE.LineDashedMaterial({
        color: 0x8888aa,
        dashSize: 0.2,
        gapSize: 0.1,
        transparent: true,
        opacity: 0.6
      })
      const line = new THREE.Line(geometry, material)
      line.computeLineDistances()
      state.shadowLine = line
      this.scene.add(line)
    } else if (!show && state.shadowLine) {
      this.scene.remove(state.shadowLine)
      state.shadowLine.geometry.dispose()
      ;(state.shadowLine.material as THREE.Material).dispose()
      state.shadowLine = null
    }
  }

  public updateShadowProjection(id: string): void {
    const state = this.fragmentStates.get(id)
    if (!state || !state.mesh || !state.shadowLine) return

    const positions = state.shadowLine.geometry.attributes.position
    positions.setXYZ(0, state.mesh.position.x, state.mesh.position.y, state.mesh.position.z)
    positions.setXYZ(1, state.mesh.position.x, 0, state.mesh.position.z)
    positions.needsUpdate = true
    state.shadowLine.computeLineDistances()
  }

  public updateHelperAxesTransform(id: string): void {
    const state = this.fragmentStates.get(id)
    if (!state || !state.helperAxes || !state.mesh) return

    state.helperAxes.position.copy(state.mesh.position)
    state.helperAxes.rotation.copy(state.mesh.rotation)
  }

  public updateMatchLabel(
    fragAId: string,
    fragBId: string,
    score: number
  ): void {
    const stateA = this.fragmentStates.get(fragAId)
    if (!stateA || !stateA.mesh) return

    const key = [fragAId, fragBId].sort().join('|')

    let label = stateA.matchLabel
    if (!label) {
      const canvas = document.createElement('canvas')
      canvas.width = 256
      canvas.height = 128
      const ctx = canvas.getContext('2d')!

      const texture = new THREE.CanvasTexture(canvas)
      const material = new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        depthTest: false
      })
      label = new THREE.Sprite(material)
      label.scale.set(3, 1.5, 1)
      stateA.matchLabel = label
      this.scene.add(label)
    }

    const canvas = (label.material as THREE.SpriteMaterial).map!.image as HTMLCanvasElement
    const ctx = canvas.getContext('2d')!
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    let color = '#ff4444'
    if (score > 80) color = '#44ff88'
    else if (score >= 50) color = '#ffcc44'

    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'
    ctx.beginPath()
    ctx.roundRect(8, 8, 240, 112, 12)
    ctx.fill()

    ctx.strokeStyle = color
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.roundRect(8, 8, 240, 112, 12)
    ctx.stroke()

    ctx.fillStyle = color
    ctx.font = 'bold 48px Arial'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(`${score}%`, canvas.width / 2, canvas.height / 2)

    ;(label.material as THREE.SpriteMaterial).map!.needsUpdate = true

    const mesh = stateA.mesh
    const bbox = new THREE.Box3().setFromObject(mesh)
    label.position.set(
      (bbox.min.x + bbox.max.x) / 2,
      bbox.max.y + 1.5,
      (bbox.min.z + bbox.max.z) / 2
    )
  }

  public removeMatchLabel(id: string): void {
    const state = this.fragmentStates.get(id)
    if (!state || !state.matchLabel) return
    this.scene.remove(state.matchLabel)
    const mat = state.matchLabel.material as THREE.SpriteMaterial
    if (mat.map) mat.map.dispose()
    mat.dispose()
    state.matchLabel = null
  }

  public updateMatchHighlight(
    fragAId: string,
    fragBId: string,
    edgePointsA: THREE.Vector3[],
    edgePointsB: THREE.Vector3[],
    posA: THREE.Vector3,
    posB: THREE.Vector3,
    rotA: THREE.Euler,
    rotB: THREE.Euler
  ): void {
    const key = [fragAId, fragBId].sort().join('|')

    if (edgePointsA.length === 0 || edgePointsB.length === 0) {
      this.removeMatchHighlightByKey(key)
      return
    }

    let line = this.matchHighlightLines.get(key)
    if (!line) {
      const points: THREE.Vector3[] = []
      for (let i = 0; i < 100; i++) {
        points.push(new THREE.Vector3())
      }
      const geometry = new THREE.BufferGeometry().setFromPoints(points)
      const material = new THREE.PointsMaterial({
        color: 0x44aaff,
        size: 0.15,
        transparent: true,
        opacity: 0.9,
        blending: THREE.AdditiveBlending
      })
      line = new THREE.Line(geometry, material)
      this.matchHighlightLines.set(key, line)
      this.scene.add(line)
    }

    const positions = line.geometry.attributes.position as THREE.BufferAttribute
    const rotMatA = new THREE.Matrix4().makeRotationFromEuler(rotA)
    const rotMatB = new THREE.Matrix4().makeRotationFromEuler(rotB)

    const sampleCount = Math.min(edgePointsA.length, edgePointsB.length, 50)
    for (let i = 0; i < sampleCount; i++) {
      const t = i / sampleCount
      const idxA = Math.floor(t * edgePointsA.length)
      const idxB = Math.floor(t * edgePointsB.length)

      const pA = edgePointsA[idxA].clone().applyMatrix4(rotMatA).add(posA)
      const pB = edgePointsB[idxB].clone().applyMatrix4(rotMatB).add(posB)

      const mid = new THREE.Vector3().addVectors(pA, pB).multiplyScalar(0.5)
      positions.setXYZ(i, mid.x, mid.y, mid.z)
    }

    for (let i = sampleCount; i < 100; i++) {
      positions.setXYZ(i, 0, -100, 0)
    }

    positions.needsUpdate = true
    line.geometry.setDrawRange(0, sampleCount)
  }

  private updateMatchHighlights(): void {
    const time = Date.now() * 0.001
    this.matchHighlightLines.forEach((line) => {
      const mat = line.material as THREE.PointsMaterial
      mat.opacity = 0.6 + 0.3 * Math.sin(time * 3)
    })
  }

  public removeMatchHighlight(id: string): void {
    const keysToRemove: string[] = []
    this.matchHighlightLines.forEach((_, key) => {
      if (key.includes(id)) {
        keysToRemove.push(key)
      }
    })
    keysToRemove.forEach((k) => this.removeMatchHighlightByKey(k))
  }

  private removeMatchHighlightByKey(key: string): void {
    const line = this.matchHighlightLines.get(key)
    if (line) {
      this.scene.remove(line)
      line.geometry.dispose()
      ;(line.material as THREE.Material).dispose()
      this.matchHighlightLines.delete(key)
    }
  }

  public showMergedModel(geometry: THREE.BufferGeometry | null): void {
    if (this.mergedMesh) {
      this.scene.remove(this.mergedMesh)
      this.mergedMesh.geometry.dispose()
      ;(this.mergedMesh.material as THREE.Material).dispose()
      this.mergedMesh = null
    }

    if (!geometry) return

    const material = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.8,
      metalness: 0.05,
      side: THREE.DoubleSide
    })

    this.mergedMesh = new THREE.Mesh(geometry, material)
    this.mergedMesh.castShadow = true
    this.mergedMesh.receiveShadow = true
    this.scene.add(this.mergedMesh)

    this.fragmentStates.forEach((state) => {
      if (state.mesh) state.mesh.visible = false
      if (state.outline) state.outline.visible = false
    })
  }

  public hideMergedModel(): void {
    if (this.mergedMesh) {
      this.scene.remove(this.mergedMesh)
      this.mergedMesh.geometry.dispose()
      ;(this.mergedMesh.material as THREE.Material).dispose()
      this.mergedMesh = null
    }

    this.fragmentStates.forEach((state) => {
      if (state.mesh) state.mesh.visible = true
      if (state.outline) state.outline.visible = true
    })
  }

  public getFragmentMesh(id: string): THREE.Mesh | null {
    return this.fragmentStates.get(id)?.mesh || null
  }

  public clearAll(): void {
    this.fragmentStates.forEach((_, id) => this.removeFragment(id))
    this.fragmentStates.clear()
    this.matchHighlightLines.clear()
  }

  public dispose(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId)
    }
    window.removeEventListener('resize', this.handleResize)
    this.clearAll()
    if (this.renderer) {
      this.renderer.dispose()
      if (this.renderer.domElement.parentElement) {
        this.renderer.domElement.parentElement.removeChild(
          this.renderer.domElement
        )
      }
    }
  }

  public getRandomRingPosition(radius: number = 10): THREE.Vector3 {
    const angle = Math.random() * Math.PI * 2
    const r = radius * (0.7 + Math.random() * 0.3)
    return new THREE.Vector3(
      Math.cos(angle) * r,
      Math.random() * 2 - 1,
      Math.sin(angle) * r
    )
  }

  public captureScreenshot(): string | null {
    if (!this.renderer) return null
    this.render()
    return this.renderer.domElement.toDataURL('image/png')
  }
}
