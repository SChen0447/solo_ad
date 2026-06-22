import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { generateTerrain, type TerrainData, getHeightAt } from './terrain/terrainGenerator'
import { decorateTerrain, disposeDecorations, type DecorationObjects } from './terrain/terrainDecorator'
import { createControls, setControlsEnabled, type ControlParams } from './ui/controls'
import { StatsPanel, createHoverTooltip, createHighlightGrid } from './ui/statPanel'
import GUI from 'lil-gui'

class TerrainEditor {
  private scene: THREE.Scene
  private camera: THREE.PerspectiveCamera
  private renderer: THREE.WebGLRenderer
  private controls: OrbitControls
  private gui: GUI | null = null
  private statsPanel: StatsPanel
  private hoverTooltip: ReturnType<typeof createHoverTooltip>
  private highlightGrid: ReturnType<typeof createHighlightGrid>
  private raycaster: THREE.Raycaster
  private mouse: THREE.Vector2

  private terrainData: TerrainData | null = null
  private decorations: DecorationObjects | null = null
  private terrainGroup: THREE.Group
  private ambientLight: THREE.AmbientLight
  private directionalLight: THREE.DirectionalLight

  private controlParams: ControlParams
  private debounceTimer: number | null = null
  private isTourRunning: boolean = false
  private tourStartTime: number = 0
  private tourDuration: number = 12000
  private tourPath: THREE.Vector3[] = []
  private tourLookPath: THREE.Vector3[] = []
  private loadingOverlay: HTMLElement

  constructor() {
    this.scene = new THREE.Scene()

    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    )
    this.camera.position.set(15, 12, 15)

    this.renderer = new THREE.WebGLRenderer({ antialias: true })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.setSize(window.innerWidth, window.innerHeight)
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
    this.renderer.outputColorSpace = THREE.SRGBColorSpace
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.0

    document.getElementById('app')!.appendChild(this.renderer.domElement)

    this.controls = new OrbitControls(this.camera, this.renderer.domElement)
    this.controls.enableDamping = true
    this.controls.dampingFactor = 0.05
    this.controls.maxPolarAngle = Math.PI / 2.1
    this.controls.minDistance = 5
    this.controls.maxDistance = 80

    this.terrainGroup = new THREE.Group()
    this.scene.add(this.terrainGroup)

    this.ambientLight = new THREE.AmbientLight(0x404060, 0.4)
    this.scene.add(this.ambientLight)

    this.directionalLight = new THREE.DirectionalLight(0xffffff, 1.0)
    this.directionalLight.position.set(10, 20, 10)
    this.directionalLight.castShadow = true
    this.directionalLight.shadow.mapSize.width = 2048
    this.directionalLight.shadow.mapSize.height = 2048
    this.directionalLight.shadow.camera.near = 0.5
    this.directionalLight.shadow.camera.far = 100
    this.directionalLight.shadow.camera.left = -30
    this.directionalLight.shadow.camera.right = 30
    this.directionalLight.shadow.camera.top = 30
    this.directionalLight.shadow.camera.bottom = -30
    this.scene.add(this.directionalLight)

    const hemiLight = new THREE.HemisphereLight(0x87ceeb, 0x3d5c3d, 0.3)
    this.scene.add(hemiLight)

    this.statsPanel = new StatsPanel(this.camera)
    this.hoverTooltip = createHoverTooltip()
    this.highlightGrid = createHighlightGrid()
    this.scene.add(this.highlightGrid.mesh)

    this.raycaster = new THREE.Raycaster()
    this.mouse = new THREE.Vector2()

    this.loadingOverlay = document.getElementById('loading-overlay')!

    this.controlParams = {
      terrainWidth: 20,
      terrainDepth: 20,
      terrainSegments: 64,
      noiseFrequency: 1.0,
      heightScale: 4,
      seed: Math.floor(Math.random() * 10000),
      treeDensity: 50,
      houseCount: 4,
      lightIntensity: 1.0,
      lightX: 10,
      lightY: 20,
      lightZ: 10,
      autoTour: false,
      randomSeed: () => this.randomizeSeed()
    }

    this.initGUI()
    this.initEventListeners()
    this.generateAll()
    this.animate()
  }

  private initGUI(): void {
    const container = document.getElementById('controls-container')!
    this.gui = createControls(container, this.controlParams, {
      onTerrainChange: () => this.scheduleUpdate('terrain'),
      onDecorationsChange: () => this.scheduleUpdate('decorations'),
      onLightChange: () => this.updateLight(),
      onAutoTourToggle: (enabled: boolean) => this.toggleTour(enabled),
      onRandomSeed: () => this.randomizeSeed()
    })
  }

  private initEventListeners(): void {
    window.addEventListener('resize', () => this.onWindowResize())
    window.addEventListener('mousemove', (e) => this.onMouseMove(e))
    window.addEventListener('mouseleave', () => this.onMouseLeave())

    const menuToggle = document.getElementById('menu-toggle')!
    const controlsContainer = document.getElementById('controls-container')!
    menuToggle.addEventListener('click', () => {
      controlsContainer.classList.toggle('open')
    })
  }

  private scheduleUpdate(type: 'terrain' | 'decorations'): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer)
    }
    this.showLoading()
    this.debounceTimer = window.setTimeout(() => {
      if (type === 'terrain') {
        this.generateAll()
      } else {
        this.generateDecorations()
      }
      this.hideLoading()
    }, 500)
  }

  private showLoading(): void {
    this.loadingOverlay.classList.add('active')
  }

  private hideLoading(): void {
    this.loadingOverlay.classList.remove('active')
  }

  private randomizeSeed(): void {
    this.controlParams.seed = Math.floor(Math.random() * 10000)
    this.gui?.controllersRecursive().forEach((c) => {
      if (c.property === 'seed') {
        c.updateDisplay()
      }
    })
    this.scheduleUpdate('terrain')
  }

  private generateAll(): void {
    this.disposeTerrain()
    this.disposeDecorations()

    this.terrainData = generateTerrain({
      width: this.controlParams.terrainWidth,
      depth: this.controlParams.terrainDepth,
      segments: this.controlParams.terrainSegments,
      noiseFrequency: this.controlParams.noiseFrequency,
      heightScale: this.controlParams.heightScale,
      seed: this.controlParams.seed
    })

    this.terrainGroup.add(this.terrainData.mesh)

    this.generateDecorations()
    this.generateTourPath()
    this.updateShadowCamera()
  }

  private generateDecorations(): void {
    if (!this.terrainData) return

    this.disposeDecorations()

    this.decorations = decorateTerrain(this.terrainData, {
      treeDensity: this.controlParams.treeDensity,
      houseCount: this.controlParams.houseCount,
      seed: this.controlParams.seed
    })

    this.terrainGroup.add(this.decorations.trees)
    this.terrainGroup.add(this.decorations.houses)
  }

  private disposeTerrain(): void {
    if (this.terrainData) {
      this.terrainGroup.remove(this.terrainData.mesh)
      this.terrainData.geometry.dispose()
      ;(this.terrainData.mesh.material as THREE.Material).dispose()
      this.terrainData = null
    }
  }

  private disposeDecorations(): void {
    if (this.decorations) {
      this.terrainGroup.remove(this.decorations.trees)
      this.terrainGroup.remove(this.decorations.houses)
      disposeDecorations(this.decorations)
      this.decorations = null
    }
  }

  private updateLight(): void {
    this.directionalLight.intensity = this.controlParams.lightIntensity
    this.directionalLight.position.set(
      this.controlParams.lightX,
      this.controlParams.lightY,
      this.controlParams.lightZ
    )
  }

  private updateShadowCamera(): void {
    const size = Math.max(this.controlParams.terrainWidth, this.controlParams.terrainDepth) * 1.2
    this.directionalLight.shadow.camera.left = -size
    this.directionalLight.shadow.camera.right = size
    this.directionalLight.shadow.camera.top = size
    this.directionalLight.shadow.camera.bottom = -size
    this.directionalLight.shadow.camera.far = size * 3
    this.directionalLight.shadow.camera.updateProjectionMatrix()
  }

  private generateTourPath(): void {
    const width = this.controlParams.terrainWidth
    const depth = this.controlParams.terrainDepth
    const halfWidth = width / 2
    const halfDepth = depth / 2

    const points: THREE.Vector3[] = []
    const lookPoints: THREE.Vector3[] = []

    const corners = [
      { x: -halfWidth * 0.8, z: -halfDepth * 0.8 },
      { x: halfWidth * 0.8, z: -halfDepth * 0.8 },
      { x: halfWidth * 0.8, z: halfDepth * 0.8 },
      { x: -halfWidth * 0.8, z: halfDepth * 0.8 }
    ]

    for (let i = 0; i < 4; i++) {
      const corner = corners[i]
      const height = this.terrainData ? getHeightAt(corner.x, corner.z, this.terrainData) : 2
      points.push(new THREE.Vector3(corner.x, height + 6 + Math.random() * 3, corner.z))
      lookPoints.push(new THREE.Vector3(0, height, 0))
    }

    const midPoints = [
      { x: 0, z: -halfDepth * 0.6 },
      { x: halfWidth * 0.6, z: 0 },
      { x: 0, z: halfDepth * 0.6 },
      { x: -halfWidth * 0.6, z: 0 }
    ]

    for (let i = 0; i < 4; i++) {
      const mp = midPoints[i]
      const height = this.terrainData ? getHeightAt(mp.x, mp.z, this.terrainData) : 2
      points.push(new THREE.Vector3(mp.x, height + 8 + Math.random() * 2, mp.z))
      lookPoints.push(new THREE.Vector3(mp.x * 0.3, height * 0.5, mp.z * 0.3))
    }

    const reordered: THREE.Vector3[] = []
    const reorderedLook: THREE.Vector3[] = []
    for (let i = 0; i < 4; i++) {
      reordered.push(points[i])
      reordered.push(points[4 + ((i + 1) % 4)])
      reorderedLook.push(lookPoints[i])
      reorderedLook.push(lookPoints[4 + ((i + 1) % 4)])
    }

    this.tourPath = reordered
    this.tourLookPath = reorderedLook
  }

  private toggleTour(enabled: boolean): void {
    if (enabled) {
      this.startTour()
    } else {
      this.stopTour()
    }
  }

  private startTour(): void {
    if (this.tourPath.length < 2) return

    this.isTourRunning = true
    this.tourStartTime = performance.now()
    this.controls.enabled = false

    if (this.gui) {
      setControlsEnabled(this.gui, false)
    }
  }

  private stopTour(): void {
    this.isTourRunning = false
    this.controlParams.autoTour = false
    this.controls.enabled = true

    if (this.gui) {
      setControlsEnabled(this.gui, true)
      this.gui.controllersRecursive().forEach((c) => {
        if (c.property === 'autoTour') {
          c.updateDisplay()
        }
      })
    }
  }

  private updateTour(elapsed: number): void {
    if (!this.isTourRunning || this.tourPath.length < 2) return

    const t = (elapsed % this.tourDuration) / this.tourDuration
    const segmentCount = this.tourPath.length
    const segmentT = t * segmentCount
    const segmentIndex = Math.floor(segmentT) % segmentCount
    const localT = segmentT - Math.floor(segmentT)

    const easeT = this.easeInOutCubic(localT)

    const nextIndex = (segmentIndex + 1) % segmentCount
    const prevIndex = segmentIndex

    const position = new THREE.Vector3().lerpVectors(
      this.tourPath[prevIndex],
      this.tourPath[nextIndex],
      easeT
    )
    const lookTarget = new THREE.Vector3().lerpVectors(
      this.tourLookPath[prevIndex],
      this.tourLookPath[nextIndex],
      easeT
    )

    this.camera.position.copy(position)
    this.camera.lookAt(lookTarget)

    if (elapsed > this.tourDuration) {
      this.stopTour()
    }
  }

  private easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
  }

  private onWindowResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(window.innerWidth, window.innerHeight)
    this.statsPanel.onResize()
  }

  private onMouseMove(event: MouseEvent): void {
    this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1
    this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1

    if (!this.terrainData) return

    this.raycaster.setFromCamera(this.mouse, this.camera)
    const intersects = this.raycaster.intersectObject(this.terrainData.mesh)

    if (intersects.length > 0) {
      const point = intersects[0].point
      const { width, depth, segments } = this.terrainData
      const cellSize = width / (segments - 1)

      const halfWidth = width / 2
      const halfDepth = depth / 2

      const gridX = Math.floor((point.x + halfWidth) / cellSize)
      const gridZ = Math.floor((point.z + halfDepth) / cellSize)

      const snapX = -halfWidth + (gridX + 0.5) * cellSize
      const snapZ = -halfDepth + (gridZ + 0.5) * cellSize

      const height = getHeightAt(point.x, point.z, this.terrainData)

      this.highlightGrid.updatePosition(snapX, snapZ, height, cellSize)

      this.hoverTooltip.update(event.clientX, event.clientY, height)
    } else {
      this.highlightGrid.mesh.visible = false
      this.hoverTooltip.hide()
    }
  }

  private onMouseLeave(): void {
    this.highlightGrid.mesh.visible = false
    this.hoverTooltip.hide()
  }

  private getVertexCount(): number {
    let count = 0

    if (this.terrainData) {
      count += this.terrainData.geometry.attributes.position.count
    }

    if (this.decorations) {
      const treeVerts = this.decorations.trees.geometry.attributes.position.count
      count += treeVerts * this.decorations.treeCount

      this.decorations.houses.traverse((child) => {
        if (child instanceof THREE.Mesh && child.geometry) {
          count += child.geometry.attributes.position.count
        }
      })
    }

    return count
  }

  private getDrawCalls(): number {
    let count = 1

    if (this.decorations) {
      count += 1
      count += this.decorations.houseCount * 3
    }

    return Math.min(count, 50)
  }

  private animate = (): void => {
    requestAnimationFrame(this.animate)

    const now = performance.now()

    if (this.isTourRunning) {
      const elapsed = now - this.tourStartTime
      this.updateTour(elapsed)
    } else {
      this.controls.update()
    }

    this.renderer.render(this.scene, this.camera)
    this.statsPanel.getRenderer().render(this.scene, this.camera)

    const fps = this.statsPanel.calculateFPS()

    this.statsPanel.update({
      fps,
      vertices: this.getVertexCount(),
      drawCalls: this.getDrawCalls()
    })
  }
}

new TerrainEditor()
