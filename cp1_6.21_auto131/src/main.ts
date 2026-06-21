import * as THREE from 'three'
import { PipeNetwork } from './pipeNetwork'
import { FlowParticles } from './flowParticles'
import { DataPanel } from './dataPanel'

class OrbitCamera {
  public camera: THREE.PerspectiveCamera
  public target: THREE.Vector3
  public theta: number = 0
  public phi: number = Math.PI * 0.35
  public radius: number = 16
  private minRadius: number = 3
  private maxRadius: number = 30
  private fixedPhi: boolean = true
  private isDragging: boolean = false
  private lastX: number = 0
  private lastY: number = 0
  private domElement: HTMLElement

  constructor(domElement: HTMLElement, aspect: number) {
    this.camera = new THREE.PerspectiveCamera(50, aspect, 0.1, 200)
    this.target = new THREE.Vector3(0, 0, 0)
    this.domElement = domElement
    this.updatePosition()
    this.bindEvents()
  }

  private updatePosition() {
    const x = this.radius * Math.sin(this.phi) * Math.sin(this.theta)
    const y = this.radius * Math.cos(this.phi)
    const z = this.radius * Math.sin(this.phi) * Math.cos(this.theta)
    this.camera.position.set(
      this.target.x + x,
      this.target.y + y,
      this.target.z + z
    )
    this.camera.lookAt(this.target)
  }

  private bindEvents() {
    this.domElement.addEventListener('mousedown', (e) => {
      if (e.button !== 0 && e.button !== 2) return
      this.isDragging = true
      this.lastX = e.clientX
      this.lastY = e.clientY
    })
    window.addEventListener('mouseup', () => {
      this.isDragging = false
    })
    window.addEventListener('mousemove', (e) => {
      if (!this.isDragging) return
      const dx = e.clientX - this.lastX
      const dy = e.clientY - this.lastY
      this.lastX = e.clientX
      this.lastY = e.clientY
      this.theta -= dx * 0.008
      if (!this.fixedPhi) {
        this.phi -= dy * 0.008
        this.phi = Math.max(0.1, Math.min(Math.PI * 0.48, this.phi))
      }
      this.updatePosition()
    })
    this.domElement.addEventListener('wheel', (e) => {
      e.preventDefault()
      const delta = e.deltaY * 0.01
      this.radius = Math.max(this.minRadius, Math.min(this.maxRadius, this.radius + delta))
      this.updatePosition()
    }, { passive: false })
    this.domElement.addEventListener('contextmenu', (e) => e.preventDefault())
  }

  public resize(aspect: number) {
    this.camera.aspect = aspect
    this.camera.updateProjectionMatrix()
  }
}

class App {
  private renderer: THREE.WebGLRenderer
  private scene: THREE.Scene
  private orbit: OrbitCamera
  private pipeNetwork: PipeNetwork
  private flowParticles: FlowParticles
  private dataPanel: DataPanel
  private raycaster: THREE.Raycaster
  private mouse: THREE.Vector2
  private container: HTMLElement
  private clock: THREE.Clock
  private summaryTimer: number = 0
  private colorUpdateTimer: number = 0
  private selectedPipeId: string | null = null

  constructor() {
    this.container = document.getElementById('canvas-container')!
    this.raycaster = new THREE.Raycaster()
    this.mouse = new THREE.Vector2()
    this.clock = new THREE.Clock()

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true
    })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.setSize(window.innerWidth, window.innerHeight)
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
    this.renderer.outputColorSpace = THREE.SRGBColorSpace
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.15
    this.container.appendChild(this.renderer.domElement)

    this.scene = new THREE.Scene()
    this.scene.fog = new THREE.FogExp2(0x121218, 0.015)

    this.orbit = new OrbitCamera(this.renderer.domElement, window.innerWidth / window.innerHeight)

    this.setupLights()
    this.setupGround()
    this.setupSkybox()

    this.pipeNetwork = new PipeNetwork()
    this.flowParticles = new FlowParticles(this.pipeNetwork)
    this.dataPanel = new DataPanel()

    this.pipeNetwork.buildMeshes()
    this.scene.add(this.pipeNetwork.group)

    this.flowParticles.buildParticles()
    this.scene.add(this.flowParticles.group)

    this.dataPanel.updateSummary(this.pipeNetwork.getSummaryStats())
    this.dataPanel.updateCompass(0)

    this.bindEvents()
    this.animate()
  }

  private setupLights() {
    const ambient = new THREE.AmbientLight(0x404050, 0.6)
    this.scene.add(ambient)

    const hemi = new THREE.HemisphereLight(0x88aaff, 0x223322, 0.5)
    this.scene.add(hemi)

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.1)
    dirLight.position.set(8, 15, 10)
    dirLight.castShadow = true
    dirLight.shadow.mapSize.set(2048, 2048)
    dirLight.shadow.camera.near = 0.5
    dirLight.shadow.camera.far = 60
    dirLight.shadow.camera.left = -18
    dirLight.shadow.camera.right = 18
    dirLight.shadow.camera.top = 18
    dirLight.shadow.camera.bottom = -18
    dirLight.shadow.bias = -0.0005
    this.scene.add(dirLight)

    const rimLight = new THREE.DirectionalLight(0x66aaff, 0.4)
    rimLight.position.set(-10, 8, -8)
    this.scene.add(rimLight)

    const pointLight1 = new THREE.PointLight(0xff8866, 0.6, 25)
    pointLight1.position.set(-6, 4, 5)
    this.scene.add(pointLight1)

    const pointLight2 = new THREE.PointLight(0x66ffaa, 0.5, 25)
    pointLight2.position.set(7, 2, -6)
    this.scene.add(pointLight2)
  }

  private setupGround() {
    const gridHelper = new THREE.GridHelper(40, 40, 0xffffff, 0xffffff)
    const gridMat = gridHelper.material as THREE.Material
    gridMat.opacity = 0.05
    gridMat.transparent = true
    gridHelper.position.y = -3
    this.scene.add(gridHelper)

    const planeGeo = new THREE.PlaneGeometry(80, 80)
    const planeMat = new THREE.MeshBasicMaterial({
      color: 0x0a1010,
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide
    })
    const plane = new THREE.Mesh(planeGeo, planeMat)
    plane.rotation.x = -Math.PI / 2
    plane.position.y = -3.01
    this.scene.add(plane)
  }

  private setupSkybox() {
    const canvas = document.createElement('canvas')
    canvas.width = 512
    canvas.height = 512
    const ctx = canvas.getContext('2d')!
    const gradient = ctx.createRadialGradient(256, 256, 50, 256, 256, 380)
    gradient.addColorStop(0, '#1a2a1a')
    gradient.addColorStop(0.5, '#141816')
    gradient.addColorStop(1, '#0d0d0d')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, 512, 512)
    const texture = new THREE.CanvasTexture(canvas)
    texture.colorSpace = THREE.SRGBColorSpace
    this.scene.background = texture
  }

  private bindEvents() {
    window.addEventListener('resize', () => {
      this.renderer.setSize(window.innerWidth, window.innerHeight)
      this.orbit.resize(window.innerWidth / window.innerHeight)
    })

    this.renderer.domElement.addEventListener('click', (e) => {
      const rect = this.renderer.domElement.getBoundingClientRect()
      this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
      this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1
      this.raycaster.setFromCamera(this.mouse, this.orbit.camera)

      const pipeMeshes = Array.from(this.pipeNetwork.pipeMeshes.values())
      const intersects = this.raycaster.intersectObjects(pipeMeshes, false)

      if (intersects.length > 0) {
        const hit = intersects[0].object
        const pipeId = hit.userData.pipeId
        if (pipeId) {
          this.selectedPipeId = pipeId
          this.pipeNetwork.highlightPipe(pipeId)
          const pipe = this.pipeNetwork.getPipeById(pipeId)
          if (pipe) {
            this.dataPanel.showPipeData(pipe)
          }
        }
      }
    })

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.dataPanel.hideDataPanel()
        this.selectedPipeId = null
      }
    })
  }

  private animate = () => {
    requestAnimationFrame(this.animate)
    const delta = Math.min(this.clock.getDelta(), 0.1)
    const elapsed = this.clock.getElapsedTime()

    this.pipeNetwork.simulateDataUpdate(delta)
    this.colorUpdateTimer += delta
    if (this.colorUpdateTimer > 0.08) {
      this.colorUpdateTimer = 0
      this.pipeNetwork.updateColors()
    }

    this.pipeNetwork.updateHighlights(delta)
    this.flowParticles.update(delta, this.orbit.camera)
    this.pipeNetwork.applyLOD(this.orbit.camera)

    this.summaryTimer += delta
    if (this.summaryTimer >= 1.0) {
      this.summaryTimer = 0
      this.dataPanel.updateSummary(this.pipeNetwork.getSummaryStats())
      if (this.selectedPipeId) {
        const pipe = this.pipeNetwork.getPipeById(this.selectedPipeId)
        if (pipe) this.dataPanel.showPipeData(pipe)
      }
    }

    this.dataPanel.updateCompass(this.orbit.theta)

    this.pipeNetwork.nodeMeshes.forEach((mesh) => {
      const mat = mesh.material as THREE.MeshPhongMaterial
      const pulse = 1 + Math.sin(elapsed * 2 + mesh.userData.nodeId) * 0.05
      mesh.scale.set(pulse, pulse, pulse)
    })

    this.renderer.render(this.scene, this.orbit.camera)
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new App()
})
