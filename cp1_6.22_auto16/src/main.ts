import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { generateTree, type TreeParams, type GeneratedTree } from './treeGenerator'
import { LeafDensityManager, type SeasonName, SEASON_CONFIGS } from './leafDensityManager'
import { SunLightController, type SunLightState } from './sunLightController'

const SEASON_NAMES: Record<SeasonName, string> = {
  spring: '春季',
  summer: '夏季',
  autumn: '秋季',
  winter: '冬季'
}

const FOG_COLORS: Record<SeasonName, number> = {
  spring: 0xa8d8ea,
  summer: 0x87ceeb,
  autumn: 0xb8a88a,
  winter: 0xc0c8d0
}

const GROUND_COLORS: Record<SeasonName, number> = {
  spring: 0x7ec850,
  summer: 0x3d8b3d,
  autumn: 0xb8860b,
  winter: 0xe8e8e8
}

class Application {
  private scene: THREE.Scene
  private camera: THREE.PerspectiveCamera
  private renderer: THREE.WebGLRenderer
  private controls: OrbitControls

  private directionalLight: THREE.DirectionalLight
  private ambientLight: THREE.AmbientLight
  private hemisphereLight: THREE.HemisphereLight

  private sunLightController: SunLightController
  private leafDensityManager: LeafDensityManager

  private ground: THREE.Mesh | null = null
  private gridHelper: THREE.GridHelper | null = null
  private currentTree: GeneratedTree | null = null

  private treeParams: TreeParams = {
    height: 8,
    crownRadius: 5,
    trunkCurvature: 0.1
  }

  private currentSeason: SeasonName = 'spring'
  private currentSunState: SunLightState | null = null

  private treeTransitioning: boolean = false
  private oldTree: GeneratedTree | null = null
  private treeTransitionStart: number = 0
  private treeTransitionDuration: number = 500

  private keys: Set<string> = new Set()
  private cameraMoveSpeed: number = 0.1

  private clock: THREE.Clock = new THREE.Clock()

  constructor() {
    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color(0x1a1a2e)

    const container = document.getElementById('canvas-container')!
    const width = container.clientWidth
    const height = container.clientHeight

    this.camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 500)
    this.camera.position.set(15, 10, 15)

    this.renderer = new THREE.WebGLRenderer({ antialias: true })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.setSize(width, height)
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.0
    container.appendChild(this.renderer.domElement)

    this.controls = new OrbitControls(this.camera, this.renderer.domElement)
    this.controls.enableDamping = true
    this.controls.dampingFactor = 0.05
    this.controls.minDistance = 5
    this.controls.maxDistance = 80
    this.controls.maxPolarAngle = Math.PI / 2.05
    this.controls.target.set(0, 4, 0)

    this.directionalLight = new THREE.DirectionalLight(0xffffff, 1.0)
    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.4)
    this.hemisphereLight = new THREE.HemisphereLight(0x87ceeb, 0x6bbf59, 0.3)

    this.scene.add(this.directionalLight)
    this.scene.add(this.directionalLight.target)
    this.scene.add(this.ambientLight)
    this.scene.add(this.hemisphereLight)

    this.sunLightController = new SunLightController(
      this.directionalLight,
      this.ambientLight,
      this.hemisphereLight
    )

    this.leafDensityManager = new LeafDensityManager()

    this.createGround()
    this.createTree()
    this.setupUI()
    this.setupEventListeners()
    this.updateSeason(this.currentSeason)
    this.updateTime(12)

    this.animate()
  }

  private createGround(): void {
    const groundGeometry = new THREE.PlaneGeometry(100, 100, 50, 50)
    const groundMaterial = new THREE.MeshStandardMaterial({
      color: GROUND_COLORS.spring,
      roughness: 0.95,
      metalness: 0.0
    })
    this.ground = new THREE.Mesh(groundGeometry, groundMaterial)
    this.ground.rotation.x = -Math.PI / 2
    this.ground.receiveShadow = true
    this.scene.add(this.ground)

    this.gridHelper = new THREE.GridHelper(100, 50, 0x444444, 0x333333)
    this.gridHelper.position.y = 0.01
    this.gridHelper.material.transparent = true
    this.gridHelper.material.opacity = 0.4
    this.scene.add(this.gridHelper)
  }

  private createTree(): void {
    const tree = generateTree(this.treeParams)
    this.currentTree = tree
    this.scene.add(tree.group)
    this.leafDensityManager.setTree(tree)
    this.leafDensityManager.setSeason(this.currentSeason)
  }

  private regenerateTree(): void {
    if (this.treeTransitioning) return
    if (!this.currentTree) return

    this.treeTransitioning = true
    this.treeTransitionStart = performance.now()
    this.oldTree = this.currentTree

    const newTree = generateTree(this.treeParams)
    newTree.group.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        const mat = obj.material as THREE.MeshStandardMaterial
        mat.transparent = true
        mat.opacity = 0
      }
    })
    this.scene.add(newTree.group)

    this.currentTree = newTree
    this.leafDensityManager.setTree(newTree)
    this.leafDensityManager.setSeason(this.currentSeason)
  }

  private updateTreeTransition(time: number): void {
    if (!this.treeTransitioning || !this.oldTree || !this.currentTree) return

    const elapsed = time - this.treeTransitionStart
    const t = Math.min(elapsed / this.treeTransitionDuration, 1)
    const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2

    this.oldTree.group.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        const mat = obj.material as THREE.MeshStandardMaterial
        mat.transparent = true
        mat.opacity = 1 - eased
      }
    })

    this.currentTree.group.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        const mat = obj.material as THREE.MeshStandardMaterial
        mat.transparent = true
        mat.opacity = eased
      }
    })

    if (t >= 1) {
      if (this.oldTree) {
        this.scene.remove(this.oldTree.group)
        this.oldTree.group.traverse((obj) => {
          if (obj instanceof THREE.Mesh) {
            obj.geometry.dispose()
            if (Array.isArray(obj.material)) {
              obj.material.forEach((m) => m.dispose())
            } else {
              obj.material.dispose()
            }
          }
        })
        this.oldTree = null
      }

      this.currentTree.group.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          const mat = obj.material as THREE.MeshStandardMaterial
          mat.transparent = false
          mat.opacity = 1
        }
      })

      this.treeTransitioning = false
    }
  }

  private updateSeason(season: SeasonName): void {
    this.currentSeason = season
    this.leafDensityManager.setSeason(season)
    this.sunLightController.updateForSeason(season)

    const fogColor = FOG_COLORS[season]
    this.scene.fog = new THREE.Fog(fogColor, 30, 120)
    this.scene.background = new THREE.Color(fogColor).multiplyScalar(0.6)

    if (this.ground) {
      const groundMat = this.ground.material as THREE.MeshStandardMaterial
      groundMat.color.setHex(GROUND_COLORS[season])
    }

    document.querySelectorAll('.season-btn').forEach((btn) => {
      if (btn.getAttribute('data-season') === season) {
        btn.classList.add('active')
      } else {
        btn.classList.remove('active')
      }
    })
  }

  private updateTime(hour: number): void {
    this.currentSunState = this.sunLightController.setTime(hour)
    this.leafDensityManager.setSunPosition(
      this.currentSunState.sunPosition.azimuth,
      this.currentSunState.sunPosition.elevation
    )
  }

  private setupUI(): void {
    document.querySelectorAll('.season-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const season = btn.getAttribute('data-season') as SeasonName
        if (season) this.updateSeason(season)
      })
    })

    const paramsPanel = document.getElementById('params-panel')!
    const panelHeader = paramsPanel.querySelector('.panel-header')!
    panelHeader.addEventListener('click', () => {
      paramsPanel.classList.toggle('collapsed')
    })

    const heightSlider = document.getElementById('height-slider') as HTMLInputElement
    const heightValue = document.getElementById('height-value')!
    let heightTimeout: ReturnType<typeof setTimeout> | null = null
    heightSlider.addEventListener('input', () => {
      const val = parseFloat(heightSlider.value)
      heightValue.textContent = val.toString()
      this.treeParams.height = val
      if (heightTimeout) clearTimeout(heightTimeout)
      heightTimeout = setTimeout(() => this.regenerateTree(), 150)
    })

    const crownSlider = document.getElementById('crown-slider') as HTMLInputElement
    const crownValue = document.getElementById('crown-value')!
    let crownTimeout: ReturnType<typeof setTimeout> | null = null
    crownSlider.addEventListener('input', () => {
      const val = parseFloat(crownSlider.value)
      crownValue.textContent = val.toString()
      this.treeParams.crownRadius = val / 2
      if (crownTimeout) clearTimeout(crownTimeout)
      crownTimeout = setTimeout(() => this.regenerateTree(), 150)
    })

    const curvatureSlider = document.getElementById('curvature-slider') as HTMLInputElement
    const curvatureValue = document.getElementById('curvature-value')!
    let curvatureTimeout: ReturnType<typeof setTimeout> | null = null
    curvatureSlider.addEventListener('input', () => {
      const val = parseFloat(curvatureSlider.value)
      curvatureValue.textContent = val.toString()
      this.treeParams.trunkCurvature = val
      if (curvatureTimeout) clearTimeout(curvatureTimeout)
      curvatureTimeout = setTimeout(() => this.regenerateTree(), 150)
    })

    const timeline = document.getElementById('timeline')!
    const thumb = document.getElementById('timeline-thumb')!

    const updateTimeFromPosition = (clientX: number) => {
      const rect = timeline.getBoundingClientRect()
      const x = Math.max(0, Math.min(clientX - rect.left, rect.width))
      const ratio = x / rect.width
      const hour = ratio * 24
      thumb.style.left = `${ratio * 100}%`
      this.updateTime(hour)
    }

    let isDragging = false
    timeline.addEventListener('click', (e) => {
      if (!isDragging) updateTimeFromPosition(e.clientX)
    })
    thumb.addEventListener('mousedown', (e) => {
      isDragging = true
      thumb.classList.add('dragging')
      e.preventDefault()
    })
    document.addEventListener('mousemove', (e) => {
      if (isDragging) updateTimeFromPosition(e.clientX)
    })
    document.addEventListener('mouseup', () => {
      if (isDragging) {
        isDragging = false
        thumb.classList.remove('dragging')
      }
    })

    thumb.addEventListener('touchstart', (e) => {
      isDragging = true
      thumb.classList.add('dragging')
      e.preventDefault()
    })
    document.addEventListener('touchmove', (e) => {
      if (isDragging && e.touches.length > 0) {
        updateTimeFromPosition(e.touches[0].clientX)
      }
    })
    document.addEventListener('touchend', () => {
      if (isDragging) {
        isDragging = false
        thumb.classList.remove('dragging')
      }
    })
  }

  private setupEventListeners(): void {
    window.addEventListener('resize', () => {
      const container = document.getElementById('canvas-container')!
      const width = container.clientWidth
      const height = container.clientHeight
      this.camera.aspect = width / height
      this.camera.updateProjectionMatrix()
      this.renderer.setSize(width, height)
    })

    window.addEventListener('keydown', (e) => {
      this.keys.add(e.key.toLowerCase())
    })
    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.key.toLowerCase())
    })
  }

  private handleKeyMovement(): void {
    const forward = new THREE.Vector3()
    this.camera.getWorldDirection(forward)
    forward.y = 0
    forward.normalize()

    const right = new THREE.Vector3()
    right.crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize()

    const moveSpeed = this.cameraMoveSpeed

    if (this.keys.has('w') || this.keys.has('arrowup')) {
      this.camera.position.addScaledVector(forward, moveSpeed)
      this.controls.target.addScaledVector(forward, moveSpeed)
    }
    if (this.keys.has('s') || this.keys.has('arrowdown')) {
      this.camera.position.addScaledVector(forward, -moveSpeed)
      this.controls.target.addScaledVector(forward, -moveSpeed)
    }
    if (this.keys.has('a') || this.keys.has('arrowleft')) {
      this.camera.position.addScaledVector(right, -moveSpeed)
      this.controls.target.addScaledVector(right, -moveSpeed)
    }
    if (this.keys.has('d') || this.keys.has('arrowright')) {
      this.camera.position.addScaledVector(right, moveSpeed)
      this.controls.target.addScaledVector(right, moveSpeed)
    }
  }

  private updateStats(visibleLeaves: number): void {
    const seasonEl = document.getElementById('stat-season')!
    const timeEl = document.getElementById('stat-time')!
    const elevationEl = document.getElementById('stat-elevation')!
    const leavesEl = document.getElementById('stat-leaves')!

    seasonEl.textContent = SEASON_NAMES[this.currentSeason]

    if (this.currentSunState) {
      const hour = this.currentSunState.sunPosition.hour
      const h = Math.floor(hour)
      const m = Math.floor((hour - h) * 60)
      timeEl.textContent = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`

      const elevationDeg = Math.max(0, (this.currentSunState.sunPosition.elevation * 180) / Math.PI)
      elevationEl.textContent = `${elevationDeg.toFixed(1)}°`
    }

    leavesEl.textContent = visibleLeaves.toString()
  }

  private animate = (): void => {
    requestAnimationFrame(this.animate)

    const now = performance.now()
    this.handleKeyMovement()
    this.controls.update()
    this.updateTreeTransition(now)

    const visibleLeaves = this.leafDensityManager.update(now)
    this.updateStats(visibleLeaves)

    this.renderer.render(this.scene, this.camera)
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new Application()
})
