import * as THREE from 'three'
import { HandTracker, HandData } from './HandTracker'
import { ParticleSystem, ThemeType } from './ParticleSystem'

interface CaptureConfig {
  showWatermark?: boolean
  watermarkOffsetX?: number
  watermarkOffsetY?: number
  watermarkText?: string
  showTimestamp?: boolean
}

class App {
  private scene: THREE.Scene
  private camera: THREE.PerspectiveCamera
  private renderer: THREE.WebGLRenderer
  private particleSystem: ParticleSystem
  private handTracker: HandTracker | null = null
  private videoElement: HTMLVideoElement
  private handCanvas: HTMLCanvasElement
  private threeCanvas: HTMLCanvasElement
  private clock: THREE.Clock
  private fpsCounter: HTMLElement
  private loadingElement: HTMLElement
  private frameCount: number = 0
  private lastFpsUpdate: number = 0
  private currentHandData: HandData | null = null
  private captureConfig: Required<CaptureConfig> = {
    showWatermark: true,
    watermarkOffsetX: 24,
    watermarkOffsetY: 28,
    watermarkText: 'Gesture Particle Canvas',
    showTimestamp: true
  }

  constructor() {
    this.videoElement = document.getElementById('video') as HTMLVideoElement
    this.handCanvas = document.getElementById('hand-canvas') as HTMLCanvasElement
    this.threeCanvas = document.getElementById('three-canvas') as HTMLCanvasElement
    this.fpsCounter = document.getElementById('fps-counter') as HTMLElement
    this.loadingElement = document.getElementById('loading') as HTMLElement

    this.scene = new THREE.Scene()

    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      2000
    )
    this.camera.position.z = 400

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.threeCanvas,
      alpha: true,
      antialias: true,
      preserveDrawingBuffer: true
    })
    this.renderer.setSize(window.innerWidth, window.innerHeight)
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.setClearColor(0x000000, 0)

    this.particleSystem = new ParticleSystem(this.scene, 5000)
    this.clock = new THREE.Clock()

    this.setupEventListeners()
    this.initHandTracker()
    this.animate()
  }

  private setupEventListeners(): void {
    window.addEventListener('resize', () => this.onWindowResize())

    const themeButtons = document.querySelectorAll('[data-theme]')
    themeButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const target = e.currentTarget as HTMLElement
        const theme = target.dataset.theme as ThemeType
        this.setTheme(theme)
        
        themeButtons.forEach(b => b.classList.remove('active'))
        target.classList.add('active')
      })
    })

    const resetBtn = document.getElementById('reset-btn')
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        this.particleSystem.reset()
      })
    }

    const captureBtn = document.getElementById('capture-btn')
    if (captureBtn) {
      captureBtn.addEventListener('click', () => {
        this.captureImage()
      })
    }
  }

  private setTheme(theme: ThemeType): void {
    this.particleSystem.setTheme(theme)
  }

  private async initHandTracker(): Promise<void> {
    try {
      this.handTracker = new HandTracker(this.videoElement, this.handCanvas)
      this.handTracker.onHandData((data: HandData) => {
        this.currentHandData = data
        this.updateParticleAttraction(data)
      })
      await this.handTracker.init()
      
      setTimeout(() => {
        this.loadingElement.classList.add('hidden')
      }, 500)
    } catch (error) {
      console.error('Failed to initialize hand tracker:', error)
      this.loadingElement.innerHTML = '<div style="color: #ff6b6b;">摄像头加载失败，请检查权限设置</div>'
    }
  }

  private updateParticleAttraction(handData: HandData): void {
    if (handData.isHandPresent && handData.palmPosition) {
      const worldPos = this.screenToWorld(
        handData.palmPosition.x,
        handData.palmPosition.y
      )
      this.particleSystem.setAttractPosition(worldPos)
      this.particleSystem.setFist(handData.gesture === 'fist')
    } else {
      this.particleSystem.setAttractPosition(null)
      this.particleSystem.setFist(false)
    }
  }

  private screenToWorld(screenX: number, screenY: number): THREE.Vector3 {
    const x = (screenX / window.innerWidth) * 2 - 1
    const y = -(screenY / window.innerHeight) * 2 + 1

    const vector = new THREE.Vector3(x, y, 0.5)
    vector.unproject(this.camera)

    const dir = vector.sub(this.camera.position).normalize()
    const distance = -this.camera.position.z / dir.z
    const pos = this.camera.position.clone().add(dir.multiplyScalar(distance))

    return pos
  }

  private onWindowResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(window.innerWidth, window.innerHeight)
  }

  private animate(): void {
    requestAnimationFrame(() => this.animate())

    const deltaTime = this.clock.getDelta()

    this.particleSystem.update(deltaTime)

    this.renderer.render(this.scene, this.camera)

    this.updateFPS()
  }

  private updateFPS(): void {
    this.frameCount++
    const now = performance.now()
    
    if (now - this.lastFpsUpdate >= 1000) {
      const fps = Math.round(this.frameCount * 1000 / (now - this.lastFpsUpdate))
      this.fpsCounter.textContent = `FPS: ${fps}`
      this.frameCount = 0
      this.lastFpsUpdate = now
    }
  }

  setCaptureConfig(config: CaptureConfig): void {
    this.captureConfig = { ...this.captureConfig, ...config }
  }

  private captureImage(): void {
    const compositeCanvas = document.createElement('canvas')
    const width = window.innerWidth
    const height = window.innerHeight
    compositeCanvas.width = width
    compositeCanvas.height = height
    const ctx = compositeCanvas.getContext('2d')!
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'

    const gradient = ctx.createLinearGradient(0, 0, width, height)
    gradient.addColorStop(0, '#0a0a2e')
    gradient.addColorStop(1, '#1a1a3e')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, width, height)

    if (this.videoElement.readyState >= 2 && this.videoElement.videoWidth > 0) {
      const videoW = this.videoElement.videoWidth
      const videoH = this.videoElement.videoHeight
      const videoRatio = videoW / videoH
      const canvasRatio = width / height

      let sx: number, sy: number, sWidth: number, sHeight: number

      if (videoRatio > canvasRatio) {
        sHeight = videoH
        sWidth = videoH * canvasRatio
        sx = (videoW - sWidth) / 2
        sy = 0
      } else {
        sWidth = videoW
        sHeight = videoW / canvasRatio
        sx = 0
        sy = (videoH - sHeight) / 2
      }

      ctx.save()
      ctx.globalAlpha = 0.3
      ctx.translate(width, 0)
      ctx.scale(-1, 1)
      try {
        ctx.drawImage(
          this.videoElement,
          sx, sy, sWidth, sHeight,
          0, 0, width, height
        )
      } catch (e) {
        console.warn('Video frame capture failed:', e)
      }
      ctx.restore()
    }

    ctx.save()
    ctx.translate(width, 0)
    ctx.scale(-1, 1)
    ctx.drawImage(this.handCanvas, 0, 0, width, height)
    ctx.restore()

    ctx.drawImage(this.threeCanvas, 0, 0, width, height)

    if (this.captureConfig.showWatermark) {
      const offsetX = this.captureConfig.watermarkOffsetX
      const offsetY = this.captureConfig.watermarkOffsetY
      let yPos = height - offsetY

      ctx.font = '14px monospace'
      ctx.fillStyle = 'rgba(0, 255, 255, 0.4)'
      ctx.textAlign = 'left'
      ctx.fillText(this.captureConfig.watermarkText, offsetX, yPos)

      if (this.captureConfig.showTimestamp) {
        yPos += 18
        ctx.font = '12px monospace'
        ctx.fillStyle = 'rgba(255, 255, 255, 0.25)'
        ctx.fillText(new Date().toLocaleString(), offsetX, yPos)
      }
    }

    try {
      const link = document.createElement('a')
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      link.download = `gesture-particles-${timestamp}.png`
      const dataUrl = compositeCanvas.toDataURL('image/png', 0.95)
      link.href = dataUrl
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (e) {
      console.error('Failed to save image:', e)
      alert('保存图片失败，请重试')
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new App()
})
