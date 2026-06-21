import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

export class SceneManager {
  public scene: THREE.Scene
  public camera: THREE.PerspectiveCamera
  public renderer: THREE.WebGLRenderer
  public controls: OrbitControls
  public pointLights: THREE.PointLight[] = []
  public ambientLight: THREE.AmbientLight
  private starField: THREE.Points | null = null
  private reflectionPlane: THREE.Mesh | null = null
  private container: HTMLElement
  private lightBaseIntensities: number[] = [1, 1, 1]

  constructor(container: HTMLElement) {
    this.container = container

    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color(0x0a0a0a)
    this.scene.fog = new THREE.FogExp2(0x0a0a0a, 0.02)

    this.camera = new THREE.PerspectiveCamera(
      60,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    )
    this.camera.position.set(0, 12, 20)
    this.camera.lookAt(0, 0, 0)

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    this.renderer.setSize(container.clientWidth, container.clientHeight)
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.2
    container.appendChild(this.renderer.domElement)

    this.controls = new OrbitControls(this.camera, this.renderer.domElement)
    this.controls.enableDamping = true
    this.controls.dampingFactor = 0.05
    this.controls.minDistance = 8
    this.controls.maxDistance = 50
    this.controls.maxPolarAngle = Math.PI * 0.85
    this.controls.target.set(0, 2, 0)

    this.ambientLight = new THREE.AmbientLight(0x404040, 0.4)
    this.scene.add(this.ambientLight)

    this.createPointLights()
    this.createStarField()
    this.createReflectionPlane()

    window.addEventListener('resize', this.onResize.bind(this))
  }

  private createPointLights(): void {
    const lightConfigs = [
      { color: 0xff6b6b, position: new THREE.Vector3(0, 15, 0) },
      { color: 0x4ecdc4, position: new THREE.Vector3(-12, 8, 8) },
      { color: 0xffe66d, position: new THREE.Vector3(12, 8, 8) },
    ]

    lightConfigs.forEach((config, index) => {
      const light = new THREE.PointLight(config.color, 1, 50, 2)
      light.position.copy(config.position)
      light.castShadow = index === 0
      light.shadow.mapSize.width = 1024
      light.shadow.mapSize.height = 1024
      this.scene.add(light)
      this.pointLights.push(light)

      const helper = new THREE.PointLightHelper(light, 0.3)
      helper.visible = false
      this.scene.add(helper)
    })
  }

  private createStarField(): void {
    const starCount = 1000
    const geometry = new THREE.BufferGeometry()
    const positions = new Float32Array(starCount * 3)
    const sizes = new Float32Array(starCount)

    for (let i = 0; i < starCount; i++) {
      const radius = 50 + Math.random() * 50
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)

      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta)
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta)
      positions[i * 3 + 2] = radius * Math.cos(phi)
      sizes[i] = 0.02 + Math.random() * 0.04
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1))

    const material = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.05,
      transparent: true,
      opacity: 0.8,
      sizeAttenuation: true,
    })

    this.starField = new THREE.Points(geometry, material)
    this.scene.add(this.starField)
  }

  private createReflectionPlane(): void {
    const geometry = new THREE.PlaneGeometry(60, 60)
    const material = new THREE.MeshPhysicalMaterial({
      color: 0x0a0a0a,
      metalness: 0.9,
      roughness: 0.1,
      transparent: true,
      opacity: 0.3,
      side: THREE.DoubleSide,
    })

    this.reflectionPlane = new THREE.Mesh(geometry, material)
    this.reflectionPlane.rotation.x = -Math.PI / 2
    this.reflectionPlane.position.y = -0.1
    this.reflectionPlane.receiveShadow = true
    this.scene.add(this.reflectionPlane)
  }

  public updateLights(audioAmplitude: number): void {
    const pulseRange = 0.5
    this.pointLights.forEach((light, index) => {
      const offset = index * 0.33
      const pulse = 0.5 + 0.5 * Math.sin(Date.now() * 0.003 + offset * Math.PI * 2)
      const intensity = this.lightBaseIntensities[index] * (0.5 + pulseRange * pulse) * (0.5 + audioAmplitude)
      light.intensity = Math.min(2.5, intensity)
    })

    this.ambientLight.intensity = 0.2 + audioAmplitude * 0.3
  }

  public updateStarField(time: number): void {
    if (this.starField) {
      this.starField.rotation.y = time * 0.00005
      this.starField.rotation.x = Math.sin(time * 0.00002) * 0.05
    }
  }

  public render(time: number): void {
    this.controls.update()
    this.updateStarField(time)
    this.renderer.render(this.scene, this.camera)
  }

  private onResize(): void {
    const width = this.container.clientWidth
    const height = this.container.clientHeight

    this.camera.aspect = width / height
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(width, height)
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  }

  public getResponsiveRadius(): number {
    const width = this.container.clientWidth
    if (width < 768) {
      return 5
    } else if (width > 1200) {
      return 7.5
    }
    return 6
  }

  public dispose(): void {
    window.removeEventListener('resize', this.onResize.bind(this))
    this.controls.dispose()
    this.renderer.dispose()

    this.scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose()
        if (Array.isArray(obj.material)) {
          obj.material.forEach((m) => m.dispose())
        } else {
          obj.material.dispose()
        }
      }
    })

    if (this.container.contains(this.renderer.domElement)) {
      this.container.removeChild(this.renderer.domElement)
    }
  }
}
