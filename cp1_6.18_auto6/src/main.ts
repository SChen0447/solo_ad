import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'
import { ParticleSystem } from './particleSystem'
import { ConstellationLines } from './constellationLines'
import { UIPanel } from './uiPanel'

const BOUNDS = 25
const INITIAL_PARTICLE_COUNT = 2000
const INITIAL_LINE_THRESHOLD = 4.5

class NebulaVisualizer {
  private scene: THREE.Scene
  private camera: THREE.PerspectiveCamera
  private renderer: THREE.WebGLRenderer
  private controls: OrbitControls
  private composer: EffectComposer
  private bloomPass: UnrealBloomPass
  private particleSystem: ParticleSystem
  private constellationLines: ConstellationLines
  private uiPanel: UIPanel
  
  private clock: THREE.Clock
  private selectedStarId: number | null = null
  private raycaster: THREE.Raycaster
  private mouse: THREE.Vector2
  
  private frameCount: number = 0
  private fpsTime: number = 0
  private currentFPS: number = 60
  
  private isDragging: boolean = false
  private mouseDownPos: THREE.Vector2 = new THREE.Vector2()

  constructor() {
    this.clock = new THREE.Clock()
    this.raycaster = new THREE.Raycaster()
    this.mouse = new THREE.Vector2()

    this.scene = this.createScene()
    this.camera = this.createCamera()
    this.renderer = this.createRenderer()
    this.controls = this.createControls()
    this.composer = this.createComposer()
    this.bloomPass = this.createBloomPass()
    
    this.particleSystem = new ParticleSystem(INITIAL_PARTICLE_COUNT, BOUNDS)
    this.constellationLines = new ConstellationLines(this.particleSystem, INITIAL_LINE_THRESHOLD)
    this.uiPanel = new UIPanel()

    this.setupScene()
    this.setupEvents()
    this.setupUICallbacks()

    this.animate = this.animate.bind(this)
    this.animate()
  }

  private createScene(): THREE.Scene {
    const scene = new THREE.Scene()
    scene.background = this.createGradientBackground()
    scene.fog = new THREE.FogExp2(0x0a0e27, 0.015)
    return scene
  }

  private createGradientBackground(): THREE.Color {
    return new THREE.Color(0x0a0e27)
  }

  private createCamera(): THREE.PerspectiveCamera {
    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    )
    camera.position.set(0, 0, 30)
    return camera
  }

  private createRenderer(): THREE.WebGLRenderer {
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    })
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.2
    document.getElementById('app')!.appendChild(renderer.domElement)
    return renderer
  }

  private createControls(): OrbitControls {
    const controls = new OrbitControls(this.camera, this.renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.05
    controls.enablePan = false
    controls.minDistance = 10
    controls.maxDistance = 60
    controls.autoRotate = false
    controls.autoRotateSpeed = 0.5
    return controls
  }

  private createComposer(): EffectComposer {
    const composer = new EffectComposer(this.renderer)
    const renderPass = new RenderPass(this.scene, this.camera)
    composer.addPass(renderPass)
    return composer
  }

  private createBloomPass(): UnrealBloomPass {
    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      0.8,
      0.5,
      0.1
    )
    this.composer.addPass(bloomPass)
    return bloomPass
  }

  private setupScene(): void {
    const ambientLight = new THREE.AmbientLight(0x404080, 0.3)
    this.scene.add(ambientLight)

    const pointLight = new THREE.PointLight(0x8ab4ff, 0.8, 100)
    pointLight.position.copy(this.camera.position)
    this.scene.add(pointLight)

    this.scene.add(this.particleSystem.getBackgroundStars())
    this.scene.add(this.constellationLines.lines)
    this.scene.add(this.particleSystem.points)

    this.createNebulaClouds()
  }

  private createNebulaClouds(): void {
    const cloudGeometry = new THREE.SphereGeometry(BOUNDS * 0.9, 64, 64)
    const cloudMaterial = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        color1: { value: new THREE.Color(0x1a1040) },
        color2: { value: new THREE.Color(0x0a0e27) },
        color3: { value: new THREE.Color(0x2a1a60) }
      },
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vPosition;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vPosition = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float time;
        uniform vec3 color1;
        uniform vec3 color2;
        uniform vec3 color3;
        varying vec3 vNormal;
        varying vec3 vPosition;
        
        float noise(vec3 p) {
          return fract(sin(dot(p, vec3(12.9898, 78.233, 45.543))) * 43758.5453);
        }
        
        void main() {
          float intensity = pow(0.7 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.0);
          float n = noise(vPosition * 0.1 + time * 0.05);
          vec3 color = mix(color2, color1, intensity * (0.8 + n * 0.4));
          color = mix(color, color3, n * intensity * 0.3);
          float alpha = intensity * 0.15 * (0.7 + n * 0.3);
          gl_FragColor = vec4(color, alpha);
        }
      `,
      side: THREE.BackSide,
      transparent: true,
      depthWrite: false
    })
    
    const nebulaCloud = new THREE.Mesh(cloudGeometry, cloudMaterial)
    nebulaCloud.userData.material = cloudMaterial
    this.scene.add(nebulaCloud)
  }

  private setupEvents(): void {
    window.addEventListener('resize', () => this.onWindowResize())
    
    this.renderer.domElement.addEventListener('mousedown', (e) => {
      this.isDragging = false
      this.mouseDownPos.set(e.clientX, e.clientY)
    })
    
    this.renderer.domElement.addEventListener('mousemove', (e) => {
      const dx = Math.abs(e.clientX - this.mouseDownPos.x)
      const dy = Math.abs(e.clientY - this.mouseDownPos.y)
      if (dx > 5 || dy > 5) {
        this.isDragging = true
      }
    })
    
    this.renderer.domElement.addEventListener('click', (e) => {
      if (this.isDragging) return
      this.onCanvasClick(e)
    })
    
    this.renderer.domElement.addEventListener('touchstart', (e) => {
      this.isDragging = false
      const touch = e.touches[0]
      this.mouseDownPos.set(touch.clientX, touch.clientY)
    })
    
    this.renderer.domElement.addEventListener('touchmove', (e) => {
      const touch = e.touches[0]
      const dx = Math.abs(touch.clientX - this.mouseDownPos.x)
      const dy = Math.abs(touch.clientY - this.mouseDownPos.y)
      if (dx > 10 || dy > 10) {
        this.isDragging = true
      }
    })
    
    this.renderer.domElement.addEventListener('touchend', (e) => {
      if (this.isDragging) return
      const touch = e.changedTouches[0]
      this.onCanvasClick({ clientX: touch.clientX, clientY: touch.clientY } as MouseEvent)
    })

    document.addEventListener('click', (e) => {
      const target = e.target as HTMLElement
      if (!target.closest('#star-detail-popup') && 
          !target.closest('canvas')) {
        this.selectedStarId = null
        this.uiPanel.hideStarDetail()
      }
    })
  }

  private onCanvasClick(event: { clientX: number; clientY: number }): void {
    const rect = this.renderer.domElement.getBoundingClientRect()
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1

    this.raycaster.setFromCamera(this.mouse, this.camera)
    const intersects = this.raycaster.intersectObject(this.particleSystem.points)

    if (intersects.length > 0) {
      const index = intersects[0].index
      if (index !== undefined) {
        const star = this.particleSystem.getStarById(index)
        if (star) {
          this.selectedStarId = star.id
          this.uiPanel.showStarDetail(star, event.clientX, event.clientY)
          return
        }
      }
    }

    this.selectedStarId = null
    this.uiPanel.hideStarDetail()
  }

  private setupUICallbacks(): void {
    this.uiPanel.onParticleCountChange = (count: number) => {
      this.particleSystem.resize(count)
      this.constellationLines.rebuild()
    }

    this.uiPanel.onThresholdChange = (threshold: number) => {
      this.constellationLines.setThreshold(threshold)
    }

    this.uiPanel.onRotationSpeedChange = (speed: number) => {
      this.controls.autoRotateSpeed = speed * 3
    }

    this.uiPanel.onColorModeChange = (mode: 'temperature' | 'random') => {
      this.particleSystem.setColorMode(mode)
    }

    this.uiPanel.onAutoRotateChange = (enabled: boolean) => {
      this.controls.autoRotate = enabled
    }

    this.uiPanel.onBloomChange = (enabled: boolean) => {
      this.bloomPass.enabled = enabled
    }

    this.uiPanel.onReset = () => {
      this.uiPanel.resetControls()
      this.particleSystem.resize(2000)
      this.particleSystem.setColorMode('temperature')
      this.constellationLines.setThreshold(4.5)
      this.controls.autoRotate = false
      this.controls.autoRotateSpeed = 0.5 * 3
      this.bloomPass.enabled = true
      this.selectedStarId = null
      this.uiPanel.hideStarDetail()
    }
  }

  private onWindowResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(window.innerWidth, window.innerHeight)
    this.composer.setSize(window.innerWidth, window.innerHeight)
    this.bloomPass.setSize(window.innerWidth, window.innerHeight)
  }

  private updateFPS(deltaTime: number): void {
    this.frameCount++
    this.fpsTime += deltaTime
    
    if (this.fpsTime >= 0.5) {
      this.currentFPS = this.frameCount / this.fpsTime
      this.frameCount = 0
      this.fpsTime = 0
      
      this.uiPanel.updateFPS(
        this.currentFPS,
        this.particleSystem.getCount(),
        this.constellationLines.getLineCount()
      )
    }
  }

  private animate(): void {
    requestAnimationFrame(this.animate)

    const deltaTime = this.clock.getDelta()
    const elapsedTime = this.clock.getElapsedTime()

    this.particleSystem.update(deltaTime, elapsedTime, this.selectedStarId)
    this.constellationLines.update(elapsedTime, this.selectedStarId)
    
    this.scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh && obj.userData.material) {
        obj.userData.material.uniforms.time.value = elapsedTime
      }
    })

    this.controls.update()
    this.updateFPS(deltaTime)
    this.composer.render()
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new NebulaVisualizer()
})
