import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { GUI } from 'dat.gui'
import { Flame, DEFAULT_FLAME_PARAMS } from './flame'
import { ColorGradient } from './utils'

let scene: THREE.Scene
let camera: THREE.PerspectiveCamera
let renderer: THREE.WebGLRenderer
let controls: OrbitControls
let flame: Flame
let gui: GUI
let raycaster: THREE.Raycaster
let mouse: THREE.Vector2
let mouseWorldPos: THREE.Vector3 | null = null

const clock = new THREE.Clock()

const guiParams = {
  particleCount: DEFAULT_FLAME_PARAMS.particleCount,
  particleSize: DEFAULT_FLAME_PARAMS.particleSize,
  riseSpeed: DEFAULT_FLAME_PARAMS.riseSpeed,
  driftAmount: DEFAULT_FLAME_PARAMS.driftAmount,
  colorGradient: DEFAULT_FLAME_PARAMS.colorGradient,
  emissionInterval: DEFAULT_FLAME_PARAMS.emissionInterval,
  flameWidth: DEFAULT_FLAME_PARAMS.flameWidth,
  reset: () => {
    guiParams.particleCount = DEFAULT_FLAME_PARAMS.particleCount
    guiParams.particleSize = DEFAULT_FLAME_PARAMS.particleSize
    guiParams.riseSpeed = DEFAULT_FLAME_PARAMS.riseSpeed
    guiParams.driftAmount = DEFAULT_FLAME_PARAMS.driftAmount
    guiParams.colorGradient = DEFAULT_FLAME_PARAMS.colorGradient
    guiParams.emissionInterval = DEFAULT_FLAME_PARAMS.emissionInterval
    guiParams.flameWidth = DEFAULT_FLAME_PARAMS.flameWidth
    flame.resetParams()
    updateGuiDisplay()
  }
}

function init(): void {
  scene = new THREE.Scene()
  scene.background = new THREE.Color(0x000000)

  camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  )
  camera.position.set(0, 2, 5)
  camera.lookAt(0, 1, 0)

  renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true
  })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.setSize(window.innerWidth, window.innerHeight)
  renderer.setClearColor(0x000000, 1)
  document.body.appendChild(renderer.domElement)

  controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.dampingFactor = 0.05
  controls.target.set(0, 1, 0)
  controls.minDistance = 2
  controls.maxDistance = 15
  controls.update()

  raycaster = new THREE.Raycaster()
  mouse = new THREE.Vector2()

  flame = new Flame(scene)

  initGUI()
  initEventListeners()
  animate()
}

function initGUI(): void {
  gui = new GUI()

  const style = document.createElement('style')
  style.textContent = `
    .dg.main {
      background: rgba(30, 30, 30, 0.7) !important;
      backdrop-filter: blur(10px) !important;
      -webkit-backdrop-filter: blur(10px) !important;
      border-radius: 8px !important;
      overflow: hidden !important;
    }
    .dg .c .slider {
      background: rgba(60, 60, 60, 0.8) !important;
    }
    .dg .c .slider-fg {
      background: #ff6600 !important;
    }
    .dg .c input[type=text] {
      background: rgba(40, 40, 40, 0.8) !important;
      color: #ffffff !important;
    }
    .dg .title {
      background: rgba(50, 50, 50, 0.9) !important;
      color: #ffffff !important;
      font-weight: 600 !important;
    }
    .dg li:not(.folder) {
      background: rgba(30, 30, 30, 0.6) !important;
      border-bottom: 1px solid rgba(255, 255, 255, 0.05) !important;
    }
    .dg .cr.function {
      background: rgba(50, 50, 50, 0.7) !important;
    }
    .dg .cr.function .property-name {
      width: 100% !important;
    }
  `
  document.head.appendChild(style)

  const particleFolder = gui.addFolder('粒子参数')
  particleFolder.add(guiParams, 'particleCount', 500, 3000, 100)
    .name('粒子数量')
    .onChange((value: number) => {
      flame.setParticleCount(value)
    })

  particleFolder.add(guiParams, 'particleSize', 0.05, 0.3, 0.01)
    .name('粒子大小')
    .onChange((value: number) => {
      flame.setParticleSize(value)
    })

  const motionFolder = gui.addFolder('运动参数')
  motionFolder.add(guiParams, 'riseSpeed', 0.2, 5.0, 0.1)
    .name('上浮速度')
    .onChange((value: number) => {
      flame.setRiseSpeed(value)
    })

  motionFolder.add(guiParams, 'driftAmount', 0.0, 1.0, 0.05)
    .name('水平漂移幅度')
    .onChange((value: number) => {
      flame.setDriftAmount(value)
    })

  motionFolder.add(guiParams, 'flameWidth', 1.0, 3.0, 0.1)
    .name('火焰宽度')
    .onChange((value: number) => {
      flame.setFlameWidth(value)
    })

  motionFolder.add(guiParams, 'emissionInterval', 0.1, 2.0, 0.1)
    .name('发射频率(秒)')
    .onChange((value: number) => {
      flame.setEmissionInterval(value)
    })

  const colorFolder = gui.addFolder('颜色设置')
  colorFolder.add(guiParams, 'colorGradient', {
    '橙黄渐变': 'orange-yellow',
    '蓝紫渐变': 'blue-purple',
    '红绿渐变': 'red-green'
  } as Record<string, ColorGradient>)
    .name('颜色基色')
    .onChange((value: ColorGradient) => {
      flame.setColorGradient(value)
    })

  gui.add(guiParams, 'reset').name('重置所有参数')
}

function updateGuiDisplay(): void {
  const folders = Object.values((gui as unknown as { __folders: Record<string, GUI> }).__folders)
  for (const folder of folders) {
    const folderControllers = (folder as unknown as { controllers: Array<{ updateDisplay: () => void }> }).controllers
    for (const controller of folderControllers) {
      controller.updateDisplay()
    }
  }
  const controllers = (gui as unknown as { controllers: Array<{ updateDisplay: () => void }> }).controllers
  for (const controller of controllers) {
    controller.updateDisplay()
  }
}

function initEventListeners(): void {
  window.addEventListener('resize', onWindowResize)
  renderer.domElement.addEventListener('mousemove', onMouseMove)
  renderer.domElement.addEventListener('mouseleave', onMouseLeave)
}

function onWindowResize(): void {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
}

function onMouseMove(event: MouseEvent): void {
  const rect = renderer.domElement.getBoundingClientRect()
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1

  raycaster.setFromCamera(mouse, camera)
  const intersects = raycaster.intersectObject(flame.getPoints())

  if (intersects.length > 0) {
    const point = intersects[0].point
    mouseWorldPos = new THREE.Vector3(point.x, point.y, point.z)
    flame.setMouseWorldPosition(mouseWorldPos)
  } else {
    mouseWorldPos = null
    flame.setMouseWorldPosition(null)
  }
}

function onMouseLeave(): void {
  mouseWorldPos = null
  flame.setMouseWorldPosition(null)
}

function animate(): void {
  requestAnimationFrame(animate)

  const deltaTime = Math.min(clock.getDelta(), 0.1)

  flame.update(deltaTime)
  controls.update()

  renderer.render(scene, camera)
}

init()
