import * as THREE from 'three'
import { NebulaSystem } from './nebula'
import { ControlPanel } from './controls'
import {
  createRaycaster,
  getMousePosition,
  findNearestParticle
} from './utils'

class App {
  private container: HTMLElement
  private scene: THREE.Scene
  private camera: THREE.PerspectiveCamera
  private renderer: THREE.WebGLRenderer
  private nebula: NebulaSystem
  private controls: ControlPanel

  private raycaster: THREE.Raycaster
  private mouse: THREE.Vector2

  private isDragging: boolean = false
  private previousMouse: { x: number; y: number } = { x: 0, y: 0 }
  private cameraDistance: number = 12
  private cameraTheta: number = 0
  private cameraPhi: number = Math.PI / 2
  private targetTheta: number = 0
  private targetPhi: number = Math.PI / 2

  private clock: THREE.Clock
  private frameCount: number = 0
  private fpsTimer: number = 0
  private currentFPS: number = 60

  private animationId: number = 0

  constructor() {
    this.container = document.getElementById('canvas-container')!

    this.scene = new THREE.Scene()

    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    )
    this.updateCameraPosition()

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true
    })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.setSize(window.innerWidth, window.innerHeight)
    this.container.appendChild(this.renderer.domElement)

    this.raycaster = createRaycaster()
    this.mouse = new THREE.Vector2()

    this.nebula = new NebulaSystem(2500, 5)
    this.scene.add(this.nebula.points)

    this.controls = new ControlPanel(this.container, {
      onRotationSpeedChange: (value: number) => {
        this.nebula.setRotationSpeed(value)
      },
      onSizeScaleChange: (value: number) => {
        this.nebula.setSizeScale(value)
      },
      onColorMixChange: (value: number) => {
        this.nebula.setColorMix(value)
      }
    })

    this.controls.updateParticleCount(this.nebula.particleCount)

    this.clock = new THREE.Clock()

    this.bindEvents()
    this.animate()
  }

  private updateCameraPosition(): void {
    const x = this.cameraDistance * Math.sin(this.cameraPhi) * Math.cos(this.cameraTheta)
    const y = this.cameraDistance * Math.cos(this.cameraPhi)
    const z = this.cameraDistance * Math.sin(this.cameraPhi) * Math.sin(this.cameraTheta)

    this.camera.position.set(x, y, z)
    this.camera.lookAt(0, 0, 0)
  }

  private bindEvents(): void {
    window.addEventListener('resize', this.onWindowResize.bind(this))

    const canvas = this.renderer.domElement

    canvas.addEventListener('mousedown', this.onMouseDown.bind(this))
    window.addEventListener('mousemove', this.onMouseMove.bind(this))
    window.addEventListener('mouseup', this.onMouseUp.bind(this))

    canvas.addEventListener('wheel', this.onWheel.bind(this), { passive: false })

    canvas.addEventListener('click', this.onClick.bind(this))
  }

  private onWindowResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(window.innerWidth, window.innerHeight)
    this.nebula.onWindowResize()
  }

  private onMouseDown(event: MouseEvent): void {
    this.isDragging = true
    this.previousMouse = { x: event.clientX, y: event.clientY }
    this.targetTheta = this.cameraTheta
    this.targetPhi = this.cameraPhi
  }

  private onMouseMove(event: MouseEvent): void {
    if (!this.isDragging) return

    const deltaX = event.clientX - this.previousMouse.x
    const deltaY = event.clientY - this.previousMouse.y

    this.targetTheta -= deltaX * 0.005
    this.targetPhi -= deltaY * 0.005

    this.targetPhi = Math.max(0.1, Math.min(Math.PI - 0.1, this.targetPhi))

    this.previousMouse = { x: event.clientX, y: event.clientY }
  }

  private onMouseUp(): void {
    this.isDragging = false
  }

  private onWheel(event: WheelEvent): void {
    event.preventDefault()

    const zoomSpeed = 0.001
    this.cameraDistance += event.deltaY * zoomSpeed * this.cameraDistance
    this.cameraDistance = Math.max(3, Math.min(30, this.cameraDistance))
  }

  private onClick(event: MouseEvent): void {
    if (this.isDragging) return

    this.mouse = getMousePosition(event, this.container)
    const nearestIndex = findNearestParticle(
      this.raycaster,
      this.camera,
      this.mouse,
      this.nebula.points,
      0.15
    )

    if (nearestIndex >= 0) {
      this.nebula.highlightParticle(nearestIndex)
      const pos = this.nebula.getParticlePosition(nearestIndex)
      this.controls.showParticleInfo(nearestIndex, {
        x: pos.x,
        y: pos.y,
        z: pos.z
      })
    } else {
      this.controls.hideParticleInfo()
    }
  }

  private animate(): void {
    this.animationId = requestAnimationFrame(this.animate.bind(this))

    const delta = this.clock.getDelta()

    this.cameraTheta += (this.targetTheta - this.cameraTheta) * 0.1
    this.cameraPhi += (this.targetPhi - this.cameraPhi) * 0.1
    this.updateCameraPosition()

    this.nebula.update(delta)

    this.renderer.render(this.scene, this.camera)

    this.frameCount++
    this.fpsTimer += delta
    if (this.fpsTimer >= 0.5) {
      this.currentFPS = this.frameCount / this.fpsTimer
      this.controls.updateFPS(this.currentFPS)
      this.frameCount = 0
      this.fpsTimer = 0
    }
  }

  public dispose(): void {
    cancelAnimationFrame(this.animationId)
    this.nebula.dispose()
    this.controls.dispose()
    this.renderer.dispose()
  }
}

const app = new App()

export default app
