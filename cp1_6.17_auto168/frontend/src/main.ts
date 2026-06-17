import * as THREE from 'three'
import { Ecosystem, ClickableObject } from './ecosystem'
import { Submersible, SubmersibleData, CruiseConfig } from './submersible'
import { UI } from './ui'

class App {
  container: HTMLElement
  renderer: THREE.WebGLRenderer
  scene: THREE.Scene
  camera: THREE.PerspectiveCamera
  clock: THREE.Clock

  ecosystem!: Ecosystem
  submersible!: Submersible
  ui!: UI

  raycaster: THREE.Raycaster
  mouse: THREE.Vector2

  speciesData: Record<string, any> | null
  plumeConfig: any | null
  cruiseConfig: CruiseConfig | null

  loadedCount: number
  totalToLoad: number

  constructor() {
    this.container = document.getElementById('app')!
    this.clock = new THREE.Clock()
    this.raycaster = new THREE.Raycaster()
    this.mouse = new THREE.Vector2()

    this.speciesData = null
    this.plumeConfig = null
    this.cruiseConfig = null
    this.loadedCount = 0
    this.totalToLoad = 3

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.setSize(window.innerWidth, window.innerHeight)
    this.renderer.setClearColor(0x0D1B2A, 1)
    this.renderer.outputColorSpace = THREE.SRGBColorSpace
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.1
    this.container.appendChild(this.renderer.domElement)

    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color(0x0D1B2A)
    this.scene.fog = new THREE.FogExp2(0x0D1B2A, 0.028)

    this.camera = new THREE.PerspectiveCamera(
      65,
      window.innerWidth / window.innerHeight,
      0.1,
      500
    )
    this.camera.position.set(30, 20, 30)

    this.setupLighting()
    this.createSeafloor()
    this.createCaustics()

    this.ui = new UI(this.container)

    this.loadAPI()

    window.addEventListener('resize', this.onResize.bind(this))
    this.renderer.domElement.addEventListener('click', this.onClick.bind(this))
  }

  setupLighting() {
    const ambient = new THREE.AmbientLight(0x1a2a3a, 0.35)
    this.scene.add(ambient)

    const hemisphere = new THREE.HemisphereLight(0x2a4060, 0x0a0f18, 0.25)
    this.scene.add(hemisphere)

    const fillLight = new THREE.DirectionalLight(0x88aadd, 0.4)
    fillLight.position.set(-20, 40, -15)
    this.scene.add(fillLight)

    const rimLight = new THREE.DirectionalLight(0x6688ff, 0.25)
    rimLight.position.set(25, 30, 25)
    this.scene.add(rimLight)

    const ventGlow = new THREE.PointLight(0xff5522, 3, 30, 1.5)
    ventGlow.position.set(0, 8, 0)
    this.scene.add(ventGlow)

    const innerGlow = new THREE.PointLight(0xffaa66, 2, 12, 1.5)
    innerGlow.position.set(0, 10, 0)
    this.scene.add(innerGlow)
  }

  createSeafloor() {
    const floorGeo = new THREE.PlaneGeometry(180, 180, 60, 60)
    const positions = floorGeo.attributes.position.array as Float32Array
    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i]
      const z = positions[i + 1]
      const distFromCenter = Math.sqrt(x * x + z * z)
      let noise = 0
      noise += Math.sin(x * 0.1) * Math.cos(z * 0.1) * 0.6
      noise += Math.sin(x * 0.25 + 1.2) * 0.4
      noise += Math.cos(z * 0.2 + 0.5) * 0.3
      if (distFromCenter < 18) {
        noise += (1 - distFromCenter / 18) * 2.5
      }
      positions[i + 2] = noise * 0.7
    }
    floorGeo.computeVertexNormals()

    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x0f1a22,
      roughness: 0.95,
      metalness: 0.05,
      flatShading: true
    })
    const floor = new THREE.Mesh(floorGeo, floorMat)
    floor.rotation.x = -Math.PI / 2
    floor.position.y = -0.3
    this.scene.add(floor)

    const sedimentCount = 800
    const sedimentGeo = new THREE.BufferGeometry()
    const sedPositions = new Float32Array(sedimentCount * 3)
    const sedSizes = new Float32Array(sedimentCount)
    for (let i = 0; i < sedimentCount; i++) {
      const a = Math.random() * Math.PI * 2
      const r = 30 + Math.random() * 60
      sedPositions[i * 3] = Math.cos(a) * r
      sedPositions[i * 3 + 1] = 0.05 + Math.random() * 0.15
      sedPositions[i * 3 + 2] = Math.sin(a) * r
      sedSizes[i] = 0.1 + Math.random() * 0.25
    }
    sedimentGeo.setAttribute('position', new THREE.BufferAttribute(sedPositions, 3))
    sedimentGeo.setAttribute('size', new THREE.BufferAttribute(sedSizes, 1))
    const sedimentMat = new THREE.PointsMaterial({
      color: 0x5a6a7a,
      size: 0.2,
      transparent: true,
      opacity: 0.5,
      sizeAttenuation: true
    })
    const sediment = new THREE.Points(sedimentGeo, sedimentMat)
    this.scene.add(sediment)
  }

  createCaustics() {
    const canvas = document.createElement('canvas')
    canvas.width = 512
    canvas.height = 512
    const ctx = canvas.getContext('2d')!

    const texture = new THREE.CanvasTexture(canvas)
    texture.wrapS = THREE.RepeatWrapping
    texture.wrapT = THREE.RepeatWrapping
    texture.repeat.set(4, 4)

    const light = new THREE.PointLight(0x88aaff, 0, 80)
    light.position.set(0, 55, 0)
    this.scene.add(light)
    ;(light as any)._causticTexture = texture

    let t = 0
    const updateCaustics = () => {
      t += 0.016
      ctx.clearRect(0, 0, 512, 512)
      const grad = ctx.createRadialGradient(256, 256, 0, 256, 256, 256)
      grad.addColorStop(0, `rgba(120, 170, 255, ${0.08 + Math.sin(t * 0.5) * 0.03})`)
      grad.addColorStop(1, 'rgba(40, 80, 140, 0)')
      ctx.fillStyle = grad
      ctx.fillRect(0, 0, 512, 512)
      for (let i = 0; i < 12; i++) {
        const cx = 256 + Math.sin(t * 0.8 + i * 1.5) * 120
        const cy = 256 + Math.cos(t * 0.6 + i * 2.1) * 120
        const r = 40 + Math.sin(t * 1.2 + i) * 20
        const g2 = ctx.createRadialGradient(cx, cy, 0, cx, cy, r)
        g2.addColorStop(0, `rgba(180, 220, 255, ${0.06 + Math.sin(t + i) * 0.02})`)
        g2.addColorStop(1, 'rgba(0,0,0,0)')
        ctx.fillStyle = g2
        ctx.fillRect(0, 0, 512, 512)
      }
      texture.needsUpdate = true
      light.intensity = 0.12 + Math.sin(t * 0.7) * 0.04
      requestAnimationFrame(updateCaustics)
    }
    updateCaustics()
  }

  async loadAPI() {
    try {
      const [speciesRes, plumeRes, scenarioRes] = await Promise.all([
        fetch('/api/species').catch(() => null),
        fetch('/api/plume').catch(() => null),
        fetch('/api/scenario').catch(() => null)
      ])

      if (speciesRes && speciesRes.ok) {
        const list = await speciesRes.json()
        this.speciesData = {}
        for (const s of list) {
          this.speciesData[s.id] = s
        }
      }
      if (plumeRes && plumeRes.ok) {
        this.plumeConfig = await plumeRes.json()
      }
      if (scenarioRes && scenarioRes.ok) {
        this.cruiseConfig = await scenarioRes.json()
      }
    } catch (e) {
      console.warn('部分API加载失败，使用内置默认数据', e)
    }

    this.initModules()
  }

  initModules() {
    this.ecosystem = new Ecosystem(this.scene, this.plumeConfig)

    if (this.speciesData) {
      this.ui.setSpeciesData(this.speciesData as any)
    }

    this.submersible = new Submersible(
      this.scene,
      this.camera,
      this.renderer.domElement
    )
    this.submersible.setEnvironmentDataProvider(
      this.ecosystem.getEnvironmentData.bind(this.ecosystem)
    )

    if (this.cruiseConfig) {
      this.submersible.setCruiseConfig(this.cruiseConfig)
    }

    this.submersible.onDataUpdate = (data: SubmersibleData) => {
      this.ecosystem.setSubmersiblePosition(data.position)
      this.ui.updateData(data)
      this.ui.setMode(data.mode)
    }

    this.animate()
  }

  onResize() {
    const w = window.innerWidth
    const h = window.innerHeight
    this.camera.aspect = w / h
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(w, h)
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  }

  onClick(event: MouseEvent) {
    const rect = this.renderer.domElement.getBoundingClientRect()
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1

    this.raycaster.setFromCamera(this.mouse, this.camera)
    const targets = this.ecosystem.getClickableObjects()
    const intersects = this.raycaster.intersectObjects(targets, true)

    if (intersects.length > 0) {
      const hit = this.ecosystem.handleClick(intersects)
      if (hit) {
        this.ui.showInfoPanel(hit as ClickableObject)
      }
    }
  }

  animate() {
    requestAnimationFrame(this.animate.bind(this))
    const dt = Math.min(this.clock.getDelta(), 0.05)

    this.ecosystem.update(dt)
    this.submersible.update(dt)

    this.renderer.render(this.scene, this.camera)
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new App()
})
