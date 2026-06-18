import * as THREE from 'three'
import { OrnamentManager } from './OrnamentManager'
import { SnowParticleSystem } from './SnowParticleSystem'
import type { Ornament, OrnamentType, BallColor } from '../store/useAppStore'

export class SceneManager {
  private scene: THREE.Scene | null = null
  private camera: THREE.PerspectiveCamera | null = null
  private renderer: THREE.WebGLRenderer | null = null
  private treeGroup: THREE.Group | null = null
  private ornamentGroup: THREE.Group | null = null
  private snowSystem: SnowParticleSystem | null = null
  private ornamentManager: OrnamentManager
  private treeMeshes: THREE.Mesh[] = []
  private ornamentMeshes: Map<string, THREE.Mesh> = new Map()
  private raycaster: THREE.Raycaster
  private mouse: THREE.Vector2
  private animationId: number | null = null
  private clock: THREE.Clock
  private blessingTextMesh: THREE.Mesh | null = null
  private blessingText: string = ''
  private treeRotation: { target: number; current: number; damping: number } = {
    target: 0,
    current: 0,
    damping: 0.05
  }

  private isDraggingRotation: boolean = false
  private lastMouseX: number = 0

  constructor() {
    this.ornamentManager = new OrnamentManager()
    this.raycaster = new THREE.Raycaster()
    this.mouse = new THREE.Vector2()
    this.clock = new THREE.Clock()
  }

  init(canvas: HTMLCanvasElement): void {
    this.scene = new THREE.Scene()

    this.camera = new THREE.PerspectiveCamera(
      60,
      canvas.clientWidth / canvas.clientHeight,
      0.1,
      1000
    )
    this.camera.position.set(0, 2, 6)
    this.camera.lookAt(0, 2, 0)

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true
    })
    this.renderer.setSize(canvas.clientWidth, canvas.clientHeight)
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
    this.renderer.setClearColor(0x000000, 0)

    this.setupLights()
    this.createTree()
    this.createSnow()
    this.setupOrnaments()

    this.animate()

    window.addEventListener('resize', this.handleResize)
  }

  private setupLights(): void {
    if (!this.scene) return

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6)
    this.scene.add(ambientLight)

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8)
    directionalLight.position.set(5, 10, 5)
    directionalLight.castShadow = true
    directionalLight.shadow.mapSize.width = 2048
    directionalLight.shadow.mapSize.height = 2048
    directionalLight.shadow.camera.near = 0.5
    directionalLight.shadow.camera.far = 50
    directionalLight.shadow.camera.left = -10
    directionalLight.shadow.camera.right = 10
    directionalLight.shadow.camera.top = 10
    directionalLight.shadow.camera.bottom = -10
    this.scene.add(directionalLight)

    const pointLight = new THREE.PointLight(0xffd700, 0.5, 10)
    pointLight.position.set(0, 6, 0)
    this.scene.add(pointLight)
  }

  private createTree(): void {
    if (!this.scene) return

    this.treeGroup = new THREE.Group()
    this.treeMeshes = []

    const trunkGeometry = new THREE.CylinderGeometry(0.15, 0.2, 0.8, 8)
    const trunkMaterial = new THREE.MeshStandardMaterial({
      color: 0x8b4513,
      roughness: 0.9
    })
    const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial)
    trunk.position.y = 0.4
    trunk.castShadow = true
    trunk.receiveShadow = true
    this.treeGroup.add(trunk)
    this.treeMeshes.push(trunk)

    const layers = 4
    const baseRadius = 1.8
    const baseHeight = 1.2
    const colorStart = new THREE.Color(0x1a5f1a)
    const colorEnd = new THREE.Color(0x3cb371)

    for (let i = 0; i < layers; i++) {
      const radius = baseRadius * (1 - i * 0.22)
      const height = baseHeight * (1 - i * 0.1)
      const y = 0.8 + i * baseHeight * 0.75

      const geometry = new THREE.ConeGeometry(radius, height, 16)
      
      const colors = []
      const positions = geometry.attributes.position
      for (let j = 0; j < positions.count; j++) {
        const yPos = positions.getY(j)
        const t = (yPos + height / 2) / height
        const color = colorStart.clone().lerp(colorEnd, t)
        colors.push(color.r, color.g, color.b)
      }
      geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))

      const material = new THREE.MeshStandardMaterial({
        vertexColors: true,
        roughness: 0.8,
        metalness: 0.1
      })

      const cone = new THREE.Mesh(geometry, material)
      cone.position.y = y + height / 2
      cone.castShadow = true
      cone.receiveShadow = true
      this.treeGroup.add(cone)
      this.treeMeshes.push(cone)
    }

    const starShape = new THREE.Shape()
    const outerRadius = 0.35
    const innerRadius = 0.15
    const points = 5

    for (let i = 0; i < points * 2; i++) {
      const radius = i % 2 === 0 ? outerRadius : innerRadius
      const angle = (i * Math.PI) / points - Math.PI / 2
      const x = Math.cos(angle) * radius
      const y = Math.sin(angle) * radius
      if (i === 0) {
        starShape.moveTo(x, y)
      } else {
        starShape.lineTo(x, y)
      }
    }
    starShape.closePath()

    const starExtrudeSettings = {
      depth: 0.1,
      bevelEnabled: true,
      bevelThickness: 0.02,
      bevelSize: 0.02,
      bevelSegments: 2
    }

    const starGeometry = new THREE.ExtrudeGeometry(starShape, starExtrudeSettings)
    starGeometry.center()

    const starMaterial = new THREE.MeshStandardMaterial({
      color: 0xffd700,
      emissive: 0xffd700,
      emissiveIntensity: 0.5,
      metalness: 0.9,
      roughness: 0.1
    })

    const topStar = new THREE.Mesh(starGeometry, starMaterial)
    topStar.position.y = 0.8 + (layers - 1) * baseHeight * 0.75 + baseHeight * 0.9 + 0.3
    topStar.rotation.x = 0
    this.treeGroup.add(topStar)

    this.scene.add(this.treeGroup)
    this.ornamentManager.setTreeMeshes(this.treeMeshes)
  }

  private createSnow(): void {
    if (!this.scene) return

    this.snowSystem = new SnowParticleSystem(200)
    this.scene.add(this.snowSystem.getPoints())
  }

  private setupOrnaments(): void {
    if (!this.scene) return

    this.ornamentGroup = new THREE.Group()
    this.scene.add(this.ornamentGroup)
  }

  addOrnament(ornament: Ornament): void {
    if (!this.ornamentGroup) return

    const mesh = this.ornamentManager.createOrnamentMesh(
      ornament.type,
      ornament.size,
      ornament.color
    )
    mesh.position.set(...ornament.position)
    mesh.userData = { id: ornament.id, isOrnament: true }

    if (ornament.isNew) {
      mesh.scale.set(0, 0, 0)
      this.animateOrnamentDrop(mesh)
    }

    this.ornamentGroup.add(mesh)
    this.ornamentMeshes.set(ornament.id, mesh)
  }

  private animateOrnamentDrop(mesh: THREE.Mesh): void {
    const startTime = Date.now()
    const duration = 300
    const startY = mesh.position.y + 0.5

    const animate = () => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / duration, 1)
      
      const elasticProgress = this.elasticOut(progress)
      const scale = 0.5 + elasticProgress * 0.5
      mesh.scale.set(scale, scale, scale)
      mesh.position.y = startY - 0.5 * elasticProgress

      if (progress < 1) {
        requestAnimationFrame(animate)
      } else {
        mesh.scale.set(1, 1, 1)
        mesh.position.y = startY - 0.5
      }
    }
    animate()
  }

  private elasticOut(t: number): number {
    if (t === 0) return 0
    if (t === 1) return 1
    const p = 0.3
    return Math.pow(2, -10 * t) * Math.sin((t - p / 4) * (2 * Math.PI) / p) + 1
  }

  removeOrnament(id: string): void {
    const mesh = this.ornamentMeshes.get(id)
    if (mesh) {
      this.animateOrnamentRemove(mesh, () => {
        this.ornamentGroup?.remove(mesh)
        mesh.geometry.dispose()
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach(m => m.dispose())
        } else {
          mesh.material.dispose()
        }
        this.ornamentMeshes.delete(id)
      })
    }
  }

  private animateOrnamentRemove(mesh: THREE.Mesh, callback: () => void): void {
    const startTime = Date.now()
    const duration = 200
    const startScale = 1

    const animate = () => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / duration, 1)
      
      const scale = startScale * (1 - progress)
      mesh.scale.set(scale, scale, scale)

      if (progress < 1) {
        requestAnimationFrame(animate)
      } else {
        callback()
      }
    }
    animate()
  }

  updateOrnamentPosition(id: string, position: [number, number, number]): void {
    const mesh = this.ornamentMeshes.get(id)
    if (mesh) {
      mesh.position.set(...position)
    }
  }

  setOrnaments(ornaments: Ornament[]): void {
    this.clearOrnaments()
    ornaments.forEach((ornament, index) => {
      setTimeout(() => {
        this.addOrnament(ornament)
      }, index * 100)
    })
  }

  private clearOrnaments(): void {
    if (!this.ornamentGroup) return

    this.ornamentMeshes.forEach((mesh) => {
      this.ornamentGroup?.remove(mesh)
      mesh.geometry.dispose()
      if (Array.isArray(mesh.material)) {
        mesh.material.forEach(m => m.dispose())
      } else {
        mesh.material.dispose()
      }
    })
    this.ornamentMeshes.clear()
  }

  raycastTree(clientX: number, clientY: number, canvas: HTMLCanvasElement): {
    point: THREE.Vector3
    normal: THREE.Vector3
  } | null {
    if (!this.camera || !this.scene) return null

    const rect = canvas.getBoundingClientRect()
    this.mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1
    this.mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1

    return this.ornamentManager.raycastTree(
      this.raycaster,
      this.camera,
      this.mouse,
      this.scene
    )
  }

  raycastOrnament(clientX: number, clientY: number, canvas: HTMLCanvasElement): string | null {
    if (!this.camera || !this.scene || !this.ornamentGroup) return null

    const rect = canvas.getBoundingClientRect()
    this.mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1
    this.mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1

    this.raycaster.setFromCamera(this.mouse, this.camera)
    const intersects = this.raycaster.intersectObjects(this.ornamentGroup.children, true)

    if (intersects.length > 0) {
      let obj = intersects[0].object as THREE.Mesh
      while (obj.parent && !obj.userData.isOrnament) {
        obj = obj.parent as THREE.Mesh
      }
      if (obj.userData.isOrnament) {
        return obj.userData.id
      }
    }
    return null
  }

  startRotationDrag(clientX: number): void {
    this.isDraggingRotation = true
    this.lastMouseX = clientX
  }

  updateRotationDrag(clientX: number): void {
    if (!this.isDraggingRotation) return

    const deltaX = clientX - this.lastMouseX
    this.treeRotation.target += deltaX * 0.01
    this.lastMouseX = clientX
  }

  endRotationDrag(): void {
    this.isDraggingRotation = false
  }

  resetCamera(): void {
    this.treeRotation.target = 0
    if (this.camera) {
      this.camera.position.set(0, 2, 6)
      this.camera.lookAt(0, 2, 0)
    }
  }

  setBlessingText(text: string): void {
    this.blessingText = text
    this.updateBlessingTextMesh()
  }

  private updateBlessingTextMesh(): void {
    if (!this.scene) return

    if (this.blessingTextMesh) {
      this.scene.remove(this.blessingTextMesh)
      this.blessingTextMesh.geometry.dispose()
      if (Array.isArray(this.blessingTextMesh.material)) {
        this.blessingTextMesh.material.forEach(m => m.dispose())
      } else {
        this.blessingTextMesh.material.dispose()
      }
      this.blessingTextMesh = null
    }

    if (!this.blessingText) return

    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')!
    canvas.width = 1024
    canvas.height = 128

    ctx.fillStyle = 'transparent'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    ctx.font = 'bold 64px Arial'
    ctx.fillStyle = '#ffd700'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.shadowColor = '#ffd700'
    ctx.shadowBlur = 20
    ctx.fillText(this.blessingText, canvas.width / 2, canvas.height / 2)

    const texture = new THREE.CanvasTexture(canvas)
    texture.wrapS = THREE.RepeatWrapping
    texture.wrapT = THREE.ClampToEdgeWrapping

    const material = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      side: THREE.DoubleSide
    })

    const radius = 2.5
    const height = 0.5
    const geometry = new THREE.CylinderGeometry(radius, radius, height, 64, 1, true)

    const uvs = geometry.attributes.uv
    for (let i = 0; i < uvs.count; i++) {
      const x = uvs.getX(i)
      uvs.setX(i, x * 2)
    }
    uvs.needsUpdate = true

    this.blessingTextMesh = new THREE.Mesh(geometry, material)
    this.blessingTextMesh.position.y = -0.2
    this.scene.add(this.blessingTextMesh)
  }

  captureScreenshot(): string {
    if (!this.renderer || !this.scene || !this.camera) return ''

    this.renderer.render(this.scene, this.camera)
    return this.renderer.domElement.toDataURL('image/png')
  }

  downloadScreenshot(filename: string): void {
    const dataUrl = this.captureScreenshot()
    const link = document.createElement('a')
    link.download = filename
    link.href = dataUrl
    link.click()
  }

  private handleResize = (): void => {
    if (!this.camera || !this.renderer) return

    const canvas = this.renderer.domElement
    this.camera.aspect = canvas.clientWidth / canvas.clientHeight
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(canvas.clientWidth, canvas.clientHeight)
  }

  private animate = (): void => {
    this.animationId = requestAnimationFrame(this.animate)

    const delta = this.clock.getDelta()

    if (this.treeGroup) {
      this.treeRotation.current += (this.treeRotation.target - this.treeRotation.current) * this.treeRotation.damping
      this.treeGroup.rotation.y = this.treeRotation.current
    }

    if (this.snowSystem) {
      this.snowSystem.update(delta)
    }

    if (this.blessingTextMesh) {
      this.blessingTextMesh.rotation.y += (2 * Math.PI * delta) / 3
    }

    if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera)
    }
  }

  setOrnamentsOpacity(opacity: number): void {
    this.ornamentMeshes.forEach((mesh, id) => {
      if (Array.isArray(mesh.material)) {
        mesh.material.forEach(m => {
          m.transparent = true
          m.opacity = opacity
        })
      } else {
        mesh.material.transparent = true
        mesh.material.opacity = opacity
      }
    })
  }

  setOrnamentOpacity(id: string, opacity: number): void {
    const mesh = this.ornamentMeshes.get(id)
    if (mesh) {
      if (Array.isArray(mesh.material)) {
        mesh.material.forEach(m => {
          m.transparent = true
          m.opacity = opacity
        })
      } else {
        mesh.material.transparent = true
        mesh.material.opacity = opacity
      }
    }
  }

  dispose(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId)
    }

    window.removeEventListener('resize', this.handleResize)

    this.clearOrnaments()
    this.snowSystem?.dispose()
    this.ornamentManager.dispose()

    if (this.renderer) {
      this.renderer.dispose()
    }

    this.scene = null
    this.camera = null
    this.renderer = null
    this.treeGroup = null
    this.ornamentGroup = null
    this.snowSystem = null
  }
}
