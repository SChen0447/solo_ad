import * as THREE from 'three'
import * as dat from 'dat.gui'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { WaterSimulator } from './compute/WaterSimulator'
import { TerrainRenderer } from './renderer/TerrainRenderer'
import { RainSystem } from './renderer/RainSystem'
import cityData from './data/cityData.json'

interface BuildingData {
  x: number
  z: number
  height: number
}

interface DrainData {
  x: number
  z: number
  drainRate: number
}

interface MonitoringPointData {
  x: number
  z: number
}

class App {
  private scene: THREE.Scene
  private camera: THREE.PerspectiveCamera
  private renderer: THREE.WebGLRenderer
  private controls: OrbitControls
  private clock: THREE.Clock

  private waterSimulator: WaterSimulator
  private terrainRenderer: TerrainRenderer
  private rainSystem: RainSystem

  private gui!: dat.GUI
  private params: {
    rainIntensity: number
    drainEfficiency: number
  }

  private isPaused: boolean = false
  private simulationTime: number = 0
  private frameCount: number = 0
  private fps: number = 0
  private lastFpsUpdate: number = 0

  private infoPanel!: HTMLDivElement
  private pauseOverlay!: HTMLDivElement
  private popupContainer!: HTMLDivElement
  private activePopups: Map<number, { element: HTMLDivElement; timer: number }> = new Map()

  private raycaster: THREE.Raycaster
  private mouse: THREE.Vector2

  private heightmap: Float32Array
  private buildings: BuildingData[]
  private drains: DrainData[]
  private monitoringPoints: MonitoringPointData[]

  private gridSize: number = 50
  private cellSize: number = 1

  constructor() {
    this.heightmap = new Float32Array(cityData.heightmap)
    this.buildings = cityData.buildings as BuildingData[]
    this.drains = cityData.drains as DrainData[]
    this.monitoringPoints = cityData.monitoringPoints as MonitoringPointData[]

    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color(0x3a3a3a)
    this.scene.fog = new THREE.Fog(0x3a3a3a, 50, 150)

    const container = document.getElementById('app') || document.body
    const width = window.innerWidth
    const height = window.innerHeight

    this.camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000)
    this.camera.position.set(40, 50, 60)
    this.camera.lookAt(0, 0, 0)

    this.renderer = new THREE.WebGLRenderer({ antialias: true })
    this.renderer.setSize(width, height)
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
    container.appendChild(this.renderer.domElement)

    this.controls = new OrbitControls(this.camera, this.renderer.domElement)
    this.controls.enableDamping = true
    this.controls.dampingFactor = 0.05
    this.controls.maxPolarAngle = Math.PI / 2.1
    this.controls.minDistance = 20
    this.controls.maxDistance = 120

    this.clock = new THREE.Clock()
    this.raycaster = new THREE.Raycaster()
    this.mouse = new THREE.Vector2()

    this.setupLighting()

    this.waterSimulator = new WaterSimulator(this.heightmap, this.drains, this.gridSize)

    this.terrainRenderer = new TerrainRenderer(
      this.scene,
      this.heightmap,
      this.buildings,
      this.drains,
      this.monitoringPoints,
      this.gridSize,
      this.cellSize
    )
    this.terrainRenderer.onMonitorClick = (index: number) => this.showMonitorPopup(index)

    const halfSize = (this.gridSize - 1) * this.cellSize / 2
    this.rainSystem = new RainSystem(this.scene, 5000, {
      minX: -halfSize,
      maxX: halfSize,
      minZ: -halfSize,
      maxZ: halfSize,
      height: 40
    })

    this.params = {
      rainIntensity: 0,
      drainEfficiency: 1.0
    }

    this.setupGUI()
    this.setupUI()
    this.setupEventListeners()

    this.animate()
  }

  private setupLighting(): void {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5)
    this.scene.add(ambientLight)

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0)
    directionalLight.position.set(50, 80, 50)
    directionalLight.castShadow = true
    directionalLight.shadow.mapSize.width = 2048
    directionalLight.shadow.mapSize.height = 2048
    directionalLight.shadow.camera.near = 0.5
    directionalLight.shadow.camera.far = 200
    directionalLight.shadow.camera.left = -60
    directionalLight.shadow.camera.right = 60
    directionalLight.shadow.camera.top = 60
    directionalLight.shadow.camera.bottom = -60
    this.scene.add(directionalLight)

    const hemisphereLight = new THREE.HemisphereLight(0x87ceeb, 0x556b2f, 0.3)
    this.scene.add(hemisphereLight)
  }

  private setupGUI(): void {
    this.gui = new dat.GUI({ autoPlace: false, closed: true })
    this.gui.domElement.style.position = 'fixed'
    this.gui.domElement.style.bottom = '20px'
    this.gui.domElement.style.right = '-300px'
    this.gui.domElement.style.transition = 'right 0.3s ease-out'
    this.gui.domElement.style.zIndex = '1000'

    const folder = this.gui.addFolder('模拟参数')
    folder.open()

    folder.add(this.params, 'rainIntensity', 0, 200, 1)
      .name('降雨强度 (mm/h)')
      .onChange((value: number) => {
        this.waterSimulator.rainIntensity = value
        this.rainSystem.setIntensity(value)
      })

    folder.add(this.params, 'drainEfficiency', 0.5, 2.0, 0.1)
      .name('排水效率 (倍速)')
      .onChange((value: number) => {
        this.waterSimulator.drainEfficiency = value
      })

    const toggleBtn = document.createElement('button')
    toggleBtn.textContent = '⚙️ 控制面板'
    toggleBtn.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      padding: 10px 16px;
      background: rgba(0, 0, 0, 0.7);
      color: white;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      font-size: 14px;
      z-index: 1001;
      transition: background 0.2s;
    `
    toggleBtn.onmouseenter = () => toggleBtn.style.background = 'rgba(0, 0, 0, 0.9)'
    toggleBtn.onmouseleave = () => toggleBtn.style.background = 'rgba(0, 0, 0, 0.7)'
    toggleBtn.onclick = () => {
      if (this.gui.closed) {
        this.gui.open()
        this.gui.domElement.style.right = '20px'
      } else {
        this.gui.close()
        this.gui.domElement.style.right = '-300px'
      }
    }

    document.body.appendChild(toggleBtn)
    document.body.appendChild(this.gui.domElement)
  }

  private setupUI(): void {
    this.infoPanel = document.createElement('div')
    this.infoPanel.style.cssText = `
      position: fixed;
      top: 80px;
      left: 20px;
      background: rgba(0, 0, 0, 0.6);
      color: white;
      padding: 16px 20px;
      border-radius: 12px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      z-index: 100;
      min-width: 200px;
      backdrop-filter: blur(10px);
    `
    this.updateInfoPanel()
    document.body.appendChild(this.infoPanel)

    this.pauseOverlay = document.createElement('div')
    this.pauseOverlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.5);
      display: none;
      align-items: center;
      justify-content: center;
      z-index: 500;
      pointer-events: none;
    `
    const pauseText = document.createElement('div')
    pauseText.textContent = '⏸️ 暂停'
    pauseText.style.cssText = `
      color: white;
      font-size: 48px;
      font-weight: bold;
      text-shadow: 0 2px 10px rgba(0, 0, 0, 0.5);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `
    this.pauseOverlay.appendChild(pauseText)
    document.body.appendChild(this.pauseOverlay)

    this.popupContainer = document.createElement('div')
    this.popupContainer.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 200;
    `
    document.body.appendChild(this.popupContainer)
  }

  private setupEventListeners(): void {
    window.addEventListener('resize', () => this.onWindowResize())
    window.addEventListener('keydown', (e) => this.onKeyDown(e))
    window.addEventListener('click', (e) => this.onMouseClick(e))
  }

  private onWindowResize(): void {
    const width = window.innerWidth
    const height = window.innerHeight
    this.camera.aspect = width / height
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(width, height)
  }

  private onKeyDown(e: KeyboardEvent): void {
    if (e.key.toLowerCase() === 'r') {
      this.resetSimulation()
    } else if (e.code === 'Space') {
      e.preventDefault()
      this.togglePause()
    }
  }

  private onMouseClick(event: MouseEvent): void {
    const rect = this.renderer.domElement.getBoundingClientRect()
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1

    this.raycaster.setFromCamera(this.mouse, this.camera)
    const intersects = this.raycaster.intersectObjects(this.terrainRenderer.monitorMeshes)

    if (intersects.length > 0) {
      const mesh = intersects[0].object as THREE.Mesh
      if (mesh.userData.isMonitor && mesh.userData.index !== undefined) {
        this.showMonitorPopup(mesh.userData.index)
      }
    }
  }

  private showMonitorPopup(index: number): void {
    if (this.activePopups.has(index)) {
      const existing = this.activePopups.get(index)!
      clearTimeout(existing.timer)
      existing.element.remove()
    }

    const point = this.monitoringPoints[index]
    const waterLevel = this.waterSimulator.getWaterLevelAt(point.x, point.z)
    const trend = this.waterSimulator.getWaterLevelTrend()

    const worldPos = this.terrainRenderer.getWorldPosition(point.x, point.z)
    const screenPos = worldPos.clone().project(this.camera)
    const x = (screenPos.x + 1) / 2 * window.innerWidth
    const y = (-screenPos.y + 1) / 2 * window.innerHeight - 60

    const popup = document.createElement('div')
    popup.style.cssText = `
      position: fixed;
      left: ${x}px;
      top: ${y}px;
      transform: translate(-50%, 20px);
      background: rgba(0, 0, 0, 0.85);
      color: white;
      padding: 12px 16px;
      border-radius: 8px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 13px;
      min-width: 140px;
      opacity: 0;
      transition: all 0.3s ease-out;
      pointer-events: none;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    `

    const trendIcon = trend === 'rising' ? '📈' : trend === 'falling' ? '📉' : '➡️'
    const trendText = trend === 'rising' ? '上升' : trend === 'falling' ? '下降' : '稳定'

    popup.innerHTML = `
      <div style="font-weight: bold; margin-bottom: 6px; font-size: 14px;">监测点 #${index + 1}</div>
      <div style="margin-bottom: 4px;">水位: <span style="color: #4fc3f7; font-weight: bold;">${(waterLevel * 100).toFixed(1)} cm</span></div>
      <div>趋势: ${trendIcon} <span style="color: ${trend === 'rising' ? '#ef5350' : trend === 'falling' ? '#66bb6a' : '#bdbdbd'};">${trendText}</span></div>
    `

    this.popupContainer.appendChild(popup)

    requestAnimationFrame(() => {
      popup.style.opacity = '1'
      popup.style.transform = 'translate(-50%, 0)'
    })

    const timer = window.setTimeout(() => {
      popup.style.opacity = '0'
      popup.style.transform = 'translate(-50%, -20px)'
      setTimeout(() => {
        popup.remove()
        this.activePopups.delete(index)
      }, 300)
    }, 3000)

    this.activePopups.set(index, { element: popup, timer })
  }

  private togglePause(): void {
    this.isPaused = !this.isPaused
    if (this.isPaused) {
      this.pauseOverlay.style.display = 'flex'
    } else {
      this.pauseOverlay.style.display = 'none'
      this.clock.getDelta()
    }
  }

  private resetSimulation(): void {
    this.waterSimulator.reset()
    this.terrainRenderer.reset()
    this.rainSystem.reset()
    this.simulationTime = 0
    this.params.rainIntensity = 0
    this.waterSimulator.rainIntensity = 0
    const folders = (this.gui as any).__folders
    if (folders) {
      for (const folderName in folders) {
        const folder = folders[folderName]
        if (folder.__controllers) {
          for (const controller of folder.__controllers) {
            if (controller.property === 'rainIntensity') {
              controller.setValue(0)
            }
          }
        }
      }
    }

    this.activePopups.forEach(({ element, timer }) => {
      clearTimeout(timer)
      element.remove()
    })
    this.activePopups.clear()

    this.updateInfoPanel()
  }

  private updateInfoPanel(): void {
    const avgWaterLevel = this.waterSimulator.getAverageWaterLevel()
    const minutes = Math.floor(this.simulationTime / 60)
    const seconds = Math.floor(this.simulationTime % 60)
    const timeStr = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`

    this.infoPanel.innerHTML = `
      <div style="font-weight: bold; font-size: 15px; margin-bottom: 10px;">📊 模拟信息</div>
      <div style="padding: 6px 0; border-bottom: 1px solid rgba(255,255,255,0.1);">
        🌧️ 降雨强度: <span style="color: #4fc3f7; font-weight: bold;">${this.params.rainIntensity} mm/h</span>
      </div>
      <div style="padding: 6px 0; border-bottom: 1px solid rgba(255,255,255,0.1);">
        ⏱️ 模拟时长: <span style="color: #fff176; font-weight: bold;">${timeStr}</span>
      </div>
      <div style="padding: 6px 0; border-bottom: 1px solid rgba(255,255,255,0.1);">
        📍 监测点: <span style="color: #ef5350; font-weight: bold;">${this.monitoringPoints.length} 个</span>
      </div>
      <div style="padding: 6px 0;">
        💧 平均水位: <span style="color: #66bb6a; font-weight: bold;">${(avgWaterLevel * 100).toFixed(1)} cm</span>
      </div>
      <div style="padding-top: 8px; opacity: 0.7; font-size: 12px;">
        FPS: ${this.fps} | 快捷键: R重置, 空格暂停
      </div>
    `
  }

  private updateHeaderInfo(): void {
    const avgWaterLevel = this.waterSimulator.getAverageWaterLevel()
    const minutes = Math.floor(this.simulationTime / 60)
    const seconds = Math.floor(this.simulationTime % 60)
    const timeStr = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`

    const waterLevelEl = document.getElementById('water-level')
    const rainIntensityEl = document.getElementById('rain-intensity')
    const simulationTimeEl = document.getElementById('simulation-time')
    const fpsEl = document.getElementById('fps')

    if (waterLevelEl) waterLevelEl.textContent = `水位: ${(avgWaterLevel * 100).toFixed(1)}cm`
    if (rainIntensityEl) rainIntensityEl.textContent = `降雨强度: ${this.params.rainIntensity}mm/h`
    if (simulationTimeEl) simulationTimeEl.textContent = `模拟时间: ${timeStr}`
    if (fpsEl) fpsEl.textContent = `FPS: ${this.fps}`
  }

  private animate(): void {
    requestAnimationFrame(() => this.animate())

    const deltaTime = Math.min(this.clock.getDelta(), 0.1)

    if (!this.isPaused) {
      this.simulationTime += deltaTime
      this.waterSimulator.update(deltaTime)
      this.rainSystem.update(deltaTime)

      this.terrainRenderer.updateWaterLevels(this.waterSimulator.waterLevel, deltaTime)
      this.terrainRenderer.updateDrains(this.waterSimulator.waterLevel, deltaTime)
      this.terrainRenderer.updateMonitors(deltaTime)

      const avgLevel = this.waterSimulator.getAverageWaterLevel()
      this.terrainRenderer.updateWaterColor(avgLevel)
    }

    this.controls.update()
    this.renderer.render(this.scene, this.camera)

    this.frameCount++
    const now = performance.now()
    if (now - this.lastFpsUpdate >= 1000) {
      this.fps = this.frameCount
      this.frameCount = 0
      this.lastFpsUpdate = now
    }

    if (Math.floor(this.simulationTime * 10) % 2 === 0) {
      this.updateInfoPanel()
      this.updateHeaderInfo()
    }
  }
}

new App()
