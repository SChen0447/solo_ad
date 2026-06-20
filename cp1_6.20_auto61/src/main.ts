import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { DataService } from './services/DataService'
import { BuildingModel } from './models/BuildingModel'
import { ParticleSystem } from './effects/ParticleSystem'
import { MainController } from './controllers/MainController'

class App {
  private readonly container: HTMLElement
  private scene!: THREE.Scene
  private camera!: THREE.PerspectiveCamera
  private renderer!: THREE.WebGLRenderer
  private controls!: OrbitControls

  private dataService!: DataService
  private buildingModel!: BuildingModel
  private particleSystem!: ParticleSystem
  private mainController!: MainController

  private readonly clock: THREE.Clock = new THREE.Clock()
  private animationFrameId: number | null = null

  private readonly defaultCameraPosition: THREE.Vector3 = new THREE.Vector3(12, 12, 12)
  private readonly defaultCameraTarget: THREE.Vector3 = new THREE.Vector3(0, 0, 0)

  private toastEl!: HTMLElement
  private toastTimerId: ReturnType<typeof setTimeout> | null = null

  constructor(containerId: string) {
    const container = document.getElementById(containerId)
    if (!container) {
      throw new Error(`找不到容器元素: #${containerId}`)
    }
    this.container = container

    this.initThree()
    this.initServices()
    this.initUI()
    this.start()

    window.addEventListener('resize', this.handleResize.bind(this))
  }

  private initThree(): void {
    this.scene = new THREE.Scene()
    this.scene.background = this.createGradientBackground()

    this.camera = new THREE.PerspectiveCamera(
      50,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    )
    this.camera.position.copy(this.defaultCameraPosition)
    this.camera.lookAt(this.defaultCameraTarget)

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.setSize(window.innerWidth, window.innerHeight)
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.1
    this.container.appendChild(this.renderer.domElement)

    this.controls = new OrbitControls(this.camera, this.renderer.domElement)
    this.controls.enableDamping = true
    this.controls.dampingFactor = 0.08
    this.controls.minDistance = 5
    this.controls.maxDistance = 60
    this.controls.maxPolarAngle = Math.PI / 2.1
    this.controls.target.copy(this.defaultCameraTarget)
    this.controls.update()

    this.setupLights()
    this.setupGround()
  }

  private createGradientBackground(): THREE.Texture {
    const canvas = document.createElement('canvas')
    canvas.width = 2
    canvas.height = 512
    const ctx = canvas.getContext('2d')!
    const gradient = ctx.createLinearGradient(0, 0, 0, 512)
    gradient.addColorStop(0, '#0a0a1a')
    gradient.addColorStop(1, '#1a1a3a')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, 2, 512)
    const texture = new THREE.CanvasTexture(canvas)
    texture.needsUpdate = true
    return texture
  }

  private setupLights(): void {
    const ambientLight = new THREE.AmbientLight(0x404060, 0.6)
    this.scene.add(ambientLight)

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.9)
    directionalLight.position.set(10, 15, 10)
    directionalLight.castShadow = true
    directionalLight.shadow.mapSize.set(2048, 2048)
    directionalLight.shadow.camera.near = 0.5
    directionalLight.shadow.camera.far = 50
    directionalLight.shadow.camera.left = -20
    directionalLight.shadow.camera.right = 20
    directionalLight.shadow.camera.top = 20
    directionalLight.shadow.camera.bottom = -20
    directionalLight.shadow.bias = -0.0005
    this.scene.add(directionalLight)

    const fillLight = new THREE.DirectionalLight(0x6688ff, 0.3)
    fillLight.position.set(-8, 5, -8)
    this.scene.add(fillLight)

    const hemiLight = new THREE.HemisphereLight(0x8899ff, 0x223355, 0.4)
    this.scene.add(hemiLight)
  }

  private setupGround(): void {
    const groundGeometry = new THREE.PlaneGeometry(80, 80)
    const groundMaterial = new THREE.MeshStandardMaterial({
      color: 0x1a1a2e,
      roughness: 0.85,
      metalness: 0.15,
      transparent: true,
      opacity: 0.95
    })
    const ground = new THREE.Mesh(groundGeometry, groundMaterial)
    ground.rotation.x = -Math.PI / 2
    ground.position.y = -7
    ground.receiveShadow = true
    this.scene.add(ground)

    const gridHelper = new THREE.GridHelper(80, 40, 0x00aaff, 0x2a3a5a)
    gridHelper.position.y = -6.99
    gridHelper.material.transparent = true
    gridHelper.material.opacity = 0.35
    this.scene.add(gridHelper)
  }

  private initServices(): void {
    this.dataService = new DataService()
    this.buildingModel = new BuildingModel(this.scene)
    this.particleSystem = new ParticleSystem(this.scene, this.buildingModel)
    this.mainController = new MainController(
      this.dataService,
      this.buildingModel,
      this.particleSystem,
      {
        onDataUpdate: () => this.showToast('数据已更新')
      }
    )
  }

  private initUI(): void {
    this.toastEl = document.getElementById('toast')!

    const btnTogglePolling = document.getElementById('btn-toggle-polling') as HTMLButtonElement
    const btnResetCamera = document.getElementById('btn-reset-camera') as HTMLButtonElement
    const btnToggleParticles = document.getElementById('btn-toggle-particles') as HTMLButtonElement

    btnTogglePolling.addEventListener('click', () => {
      const isPolling = this.mainController.toggleDataPolling()
      if (isPolling) {
        btnTogglePolling.textContent = '暂停数据更新'
        btnTogglePolling.classList.add('active')
        this.showToast('数据更新已恢复')
      } else {
        btnTogglePolling.textContent = '继续数据更新'
        btnTogglePolling.classList.remove('active')
        this.showToast('数据更新已暂停')
      }
    })

    btnResetCamera.addEventListener('click', () => {
      this.animateCameraReset()
      this.showToast('视角已重置')
    })

    btnToggleParticles.addEventListener('click', () => {
      const enabled = this.mainController.toggleParticles()
      if (enabled) {
        btnToggleParticles.textContent = '粒子系统：开'
        btnToggleParticles.classList.add('active')
        this.showToast('粒子系统已开启')
      } else {
        btnToggleParticles.textContent = '粒子系统：关'
        btnToggleParticles.classList.remove('active')
        this.showToast('粒子系统已关闭')
      }
    })
  }

  private animateCameraReset(): void {
    const startPos = this.camera.position.clone()
    const startTarget = this.controls.target.clone()
    const duration = 800
    const startTime = performance.now()

    const animateStep = () => {
      const elapsed = performance.now() - startTime
      const t = Math.min(elapsed / duration, 1)
      const ease = this.easeInOutCubic(t)

      this.camera.position.lerpVectors(startPos, this.defaultCameraPosition, ease)
      this.controls.target.lerpVectors(startTarget, this.defaultCameraTarget, ease)
      this.controls.update()

      if (t < 1) {
        requestAnimationFrame(animateStep)
      }
    }
    animateStep()
  }

  private easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
  }

  private showToast(message: string): void {
    if (this.toastTimerId !== null) {
      clearTimeout(this.toastTimerId)
    }

    this.toastEl.textContent = message
    this.toastEl.classList.add('show')

    this.toastTimerId = setTimeout(() => {
      this.toastEl.classList.remove('show')
      this.toastTimerId = null
    }, 1500)
  }

  private start(): void {
    this.mainController.start()
    this.animate()
    console.log('[App] 建筑能耗3D可视化应用启动成功')
  }

  private animate(): void {
    this.animationFrameId = requestAnimationFrame(() => this.animate())

    const deltaTime = Math.min(this.clock.getDelta(), 0.1)

    this.controls.update()
    this.mainController.update(deltaTime)
    this.renderer.render(this.scene, this.camera)
  }

  private handleResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(window.innerWidth, window.innerHeight)
  }

  public dispose(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId)
    }
    window.removeEventListener('resize', this.handleResize.bind(this))
    this.mainController.dispose()
    this.buildingModel.dispose()
    this.particleSystem.dispose()
    this.controls.dispose()
    this.renderer.dispose()
    if (this.toastTimerId !== null) {
      clearTimeout(this.toastTimerId)
    }
  }
}

let appInstance: App | null = null

document.addEventListener('DOMContentLoaded', () => {
  try {
    appInstance = new App('app')
  } catch (error) {
    console.error('应用初始化失败:', error)
  }
})

window.addEventListener('beforeunload', () => {
  if (appInstance) {
    appInstance.dispose()
    appInstance = null
  }
})

export { App }
