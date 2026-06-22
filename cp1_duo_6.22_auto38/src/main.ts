import * as THREE from 'three'
import { OrbitControls } from 'three-stdlib'
import { Simulator } from './Simulator'

class GalaxyApp {
  private scene: THREE.Scene
  private camera: THREE.PerspectiveCamera
  private renderer: THREE.WebGLRenderer
  private controls: OrbitControls
  private simulator: Simulator
  private clock: THREE.Clock
  private container: HTMLElement

  private pauseBtn: HTMLButtonElement
  private gSlider: HTMLInputElement
  private distSlider: HTMLInputElement
  private gValue: HTMLElement
  private distValue: HTMLElement
  private densityLabel: HTMLElement
  private densityValue: HTMLElement

  private mouseNDC: THREE.Vector2 = new THREE.Vector2()
  private isMouseOver: boolean = false

  constructor() {
    this.container = document.getElementById('app')!
    this.pauseBtn = document.getElementById('pause-btn') as HTMLButtonElement
    this.gSlider = document.getElementById('g-slider') as HTMLInputElement
    this.distSlider = document.getElementById('dist-slider') as HTMLInputElement
    this.gValue = document.getElementById('g-value') as HTMLElement
    this.distValue = document.getElementById('dist-value') as HTMLElement
    this.densityLabel = document.getElementById('density-label') as HTMLElement
    this.densityValue = document.getElementById('density-value') as HTMLElement

    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color(0x0a0a2e)
    this.scene.fog = new THREE.Fog(0x0a0a2e, 30, 80)

    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    )
    this.camera.position.set(0, 8, 20)

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5))
    this.renderer.setSize(window.innerWidth, window.innerHeight)
    this.container.appendChild(this.renderer.domElement)

    this.controls = new OrbitControls(this.camera, this.renderer.domElement)
    this.controls.enableDamping = true
    this.controls.dampingFactor = 0.08
    this.controls.target.set(0, 0, 0)
    this.controls.mouseButtons = {
      LEFT: THREE.MOUSE.ROTATE,
      MIDDLE: THREE.MOUSE.DOLLY,
      RIGHT: THREE.MOUSE.PAN
    }
    this.controls.minDistance = 3
    this.controls.maxDistance = 60

    this.addStars()
    this.addAmbientPoints()

    this.simulator = new Simulator(this.scene)
    this.simulator.onPauseChange = (paused: boolean) => this.onPauseStateChange(paused)

    this.clock = new THREE.Clock()

    this.bindEvents()
    this.updateGuiLabels()

    this.animate()
  }

  private addStars(): void {
    const starCount = 2000
    const positions = new Float32Array(starCount * 3)
    const colors = new Float32Array(starCount * 3)
    const sizes = new Float32Array(starCount)

    for (let i = 0; i < starCount; i++) {
      const i3 = i * 3
      const radius = 40 + Math.random() * 60
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)

      positions[i3] = radius * Math.sin(phi) * Math.cos(theta)
      positions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta)
      positions[i3 + 2] = radius * Math.cos(phi)

      const brightness = 0.4 + Math.random() * 0.6
      const hueBias = Math.random()
      const col = new THREE.Color()
      if (hueBias < 0.5) {
        col.setHSL(0.6 + Math.random() * 0.15, 0.5, brightness)
      } else {
        col.setHSL(0.1 + Math.random() * 0.05, 0.2, brightness)
      }
      colors[i3] = col.r
      colors[i3 + 1] = col.g
      colors[i3 + 2] = col.b

      sizes[i] = 0.02 + Math.random() * 0.06
    }

    const geom = new THREE.BufferGeometry()
    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geom.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    geom.setAttribute('size', new THREE.BufferAttribute(sizes, 1))

    const mat = new THREE.PointsMaterial({
      size: 0.08,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
      depthWrite: false
    })

    const stars = new THREE.Points(geom, mat)
    this.scene.add(stars)
  }

  private addAmbientPoints(): void {
    const ambientCount = 800
    const positions = new Float32Array(ambientCount * 3)
    const colors = new Float32Array(ambientCount * 3)

    for (let i = 0; i < ambientCount; i++) {
      const i3 = i * 3
      positions[i3] = (Math.random() - 0.5) * 60
      positions[i3 + 1] = (Math.random() - 0.5) * 30
      positions[i3 + 2] = (Math.random() - 0.5) * 60

      const col = new THREE.Color()
      col.setHSL(0.7 + Math.random() * 0.15, 0.8, 0.5 + Math.random() * 0.2)
      colors[i3] = col.r * 0.4
      colors[i3 + 1] = col.g * 0.4
      colors[i3 + 2] = col.b * 0.4
    }

    const geom = new THREE.BufferGeometry()
    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geom.setAttribute('color', new THREE.BufferAttribute(colors, 3))

    const mat = new THREE.PointsMaterial({
      size: 0.03,
      vertexColors: true,
      transparent: true,
      opacity: 0.5,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
      depthWrite: false
    })

    const ambient = new THREE.Points(geom, mat)
    this.scene.add(ambient)
  }

  private bindEvents(): void {
    window.addEventListener('resize', () => this.onResize())

    this.pauseBtn.addEventListener('click', () => this.simulator.togglePause())

    this.gSlider.addEventListener('input', () => {
      const val = parseFloat(this.gSlider.value)
      this.simulator.setGravityConstant(val)
      this.updateGuiLabels()
    })

    this.distSlider.addEventListener('input', () => {
      this.updateGuiLabels()
    })

    this.distSlider.addEventListener('change', () => {
      const val = parseFloat(this.distSlider.value)
      this.simulator.initGalaxies(val)
      if (this.simulator.isPaused) {
        this.simulator.pause()
      }
    })

    window.addEventListener('keydown', (e) => {
      if (e.code === 'Space') {
        e.preventDefault()
        this.simulator.togglePause()
      }
    })

    const canvas = this.renderer.domElement
    canvas.addEventListener('mousemove', (e) => this.onMouseMove(e))
    canvas.addEventListener('mouseenter', () => { this.isMouseOver = true })
    canvas.addEventListener('mouseleave', () => {
      this.isMouseOver = false
      this.simulator.removeHeatmap()
      this.densityLabel.style.display = 'none'
    })
  }

  private onMouseMove(e: MouseEvent): void {
    const rect = this.renderer.domElement.getBoundingClientRect()
    this.mouseNDC.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
    this.mouseNDC.y = -((e.clientY - rect.top) / rect.height) * 2 + 1
  }

  private onResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(window.innerWidth, window.innerHeight)
  }

  private onPauseStateChange(paused: boolean): void {
    if (paused) {
      this.pauseBtn.textContent = '▶ 恢复模拟'
      this.pauseBtn.classList.add('paused')
    } else {
      this.pauseBtn.textContent = '⏸ 暂停模拟'
      this.pauseBtn.classList.remove('paused')
    }
  }

  private updateGuiLabels(): void {
    const g = parseFloat(this.gSlider.value)
    const d = parseFloat(this.distSlider.value)
    this.gValue.textContent = g.toFixed(2)
    this.distValue.textContent = d.toFixed(1)
  }

  private animate = (): void => {
    requestAnimationFrame(this.animate)

    const delta = this.clock.getDelta()
    this.controls.update()

    this.simulator.update(delta)

    if (this.isMouseOver) {
      const density = this.simulator.updateHeatmap(
        this.camera,
        this.mouseNDC.x,
        this.mouseNDC.y
      )
      this.densityValue.textContent = density.toString()
      this.densityLabel.style.display = 'block'
    }

    this.renderer.render(this.scene, this.camera)
  }
}

new GalaxyApp()
