import * as THREE from 'three'
import { CSS2DRenderer, CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import { Molecule, type Atom, type Bond, type BondAngle } from './Molecule'
import type { RenderSettings } from '../ui/Settings'

export interface RendererOptions {
  container: HTMLElement
  settings: RenderSettings
}

interface AtomMeshData {
  mesh: THREE.InstancedMesh
  material: THREE.MeshStandardMaterial
  dummy: THREE.Object3D
  indices: Map<number, number>
}

interface BondMeshData {
  mesh: THREE.InstancedMesh
  material: THREE.MeshStandardMaterial
  dummy: THREE.Object3D
}

export class MoleculeRenderer {
  private container: HTMLElement
  private scene: THREE.Scene
  private camera: THREE.PerspectiveCamera
  private renderer: THREE.WebGLRenderer
  private labelRenderer: CSS2DRenderer
  private composer: EffectComposer
  private bloomPass: UnrealBloomPass
  private moleculeGroup: THREE.Group
  private labelsGroup: THREE.Group
  private anglesGroup: THREE.Group
  private atomMeshes: Map<string, AtomMeshData> = new Map()
  private bondMeshes: Map<string, BondMeshData> = new Map()
  private labelObjects: CSS2DObject[] = []
  private angleObjects: THREE.Object3D[] = []
  private raycaster: THREE.Raycaster
  private mouse: THREE.Vector2
  private hoveredAtomIndex: number | null = null
  private allAtomMeshes: THREE.Mesh[] = []
  private molecule: Molecule | null = null
  private settings: RenderSettings
  private isTransitioning: boolean = false
  private atomGeometry: THREE.SphereGeometry
  private bondGeometry: THREE.CylinderGeometry
  private hoverGlow: THREE.Mesh

  constructor(options: RendererOptions) {
    this.container = options.container
    this.settings = options.settings

    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color(0x1a1a2e)

    this.camera = new THREE.PerspectiveCamera(
      60,
      this.container.clientWidth / this.container.clientHeight,
      0.1,
      1000
    )
    this.camera.position.set(0, 0, 5)

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true
    })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight)
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.2
    this.container.appendChild(this.renderer.domElement)

    this.labelRenderer = new CSS2DRenderer()
    this.labelRenderer.setSize(this.container.clientWidth, this.container.clientHeight)
    this.labelRenderer.domElement.style.position = 'absolute'
    this.labelRenderer.domElement.style.top = '0'
    this.labelRenderer.domElement.style.left = '0'
    this.labelRenderer.domElement.style.pointerEvents = 'none'
    this.container.appendChild(this.labelRenderer.domElement)

    const renderPass = new RenderPass(this.scene, this.camera)
    this.bloomPass = new UnrealBloomPass(
      new THREE.Vector2(this.container.clientWidth, this.container.clientHeight),
      this.settings.bloomIntensity,
      this.settings.bloomRadius,
      this.settings.bloomThreshold
    )
    this.composer = new EffectComposer(this.renderer)
    this.composer.addPass(renderPass)
    this.composer.addPass(this.bloomPass)

    this.moleculeGroup = new THREE.Group()
    this.labelsGroup = new THREE.Group()
    this.anglesGroup = new THREE.Group()
    this.scene.add(this.moleculeGroup)
    this.scene.add(this.labelsGroup)
    this.scene.add(this.anglesGroup)

    this.setupLighting()

    const glowGeometry = new THREE.SphereGeometry(1, 16, 16)
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: 0x4fc3f7,
      transparent: true,
      opacity: 0,
      side: THREE.BackSide
    })
    this.hoverGlow = new THREE.Mesh(glowGeometry, glowMaterial)
    this.hoverGlow.visible = false
    this.scene.add(this.hoverGlow)

    this.raycaster = new THREE.Raycaster()
    this.mouse = new THREE.Vector2()

    this.atomGeometry = new THREE.SphereGeometry(1, 16, 16)
    this.bondGeometry = new THREE.CylinderGeometry(0.1, 0.1, 1, 8)

    window.addEventListener('resize', this.onWindowResize.bind(this))
  }

  private setupLighting(): void {
    const ambientLight = new THREE.AmbientLight(0xadd8e6, 0.5)
    this.scene.add(ambientLight)

    const hemisphereLight = new THREE.HemisphereLight(0xadd8e6, 0x1a1a2e, 0.6)
    this.scene.add(hemisphereLight)

    const directionalLight1 = new THREE.DirectionalLight(0xffffff, 1)
    directionalLight1.position.set(5, 5, 5)
    this.scene.add(directionalLight1)

    const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.5)
    directionalLight2.position.set(-5, -5, -5)
    this.scene.add(directionalLight2)

    const pointLight = new THREE.PointLight(0x4fc3f7, 0.8, 20)
    pointLight.position.set(0, 3, 3)
    this.scene.add(pointLight)
  }

  getCamera(): THREE.PerspectiveCamera {
    return this.camera
  }

  getRenderer(): THREE.WebGLRenderer {
    return this.renderer
  }

  getScene(): THREE.Scene {
    return this.scene
  }

  updateSettings(settings: RenderSettings): void {
    this.settings = settings
    this.bloomPass.strength = settings.bloomIntensity
    this.bloomPass.radius = settings.bloomRadius
    this.bloomPass.threshold = settings.bloomThreshold
  }

  async setMolecule(molecule: Molecule): Promise<void> {
    if (this.isTransitioning) return

    this.isTransitioning = true

    if (this.molecule) {
      await this.fadeOutCurrent()
    }

    this.clearMolecule()
    this.molecule = molecule
    this.createMoleculeMeshes(molecule)
    this.createLabels(molecule)
    this.createAngleAnnotations(molecule)
    this.updateLabelsVisibility(this.settings.showLabels)
    this.updateAnglesVisibility(this.settings.showAngles)
    this.setAllOpacity(0)

    await this.fadeInNew()
    this.isTransitioning = false
  }

  private async fadeOutCurrent(): Promise<void> {
    const duration = 500
    const startTime = performance.now()

    return new Promise((resolve) => {
      const animate = () => {
        const elapsed = performance.now() - startTime
        const progress = Math.min(elapsed / duration, 1)
        const easeProgress = this.easeInOutCubic(progress)
        const opacity = 1 - easeProgress

        this.setAllOpacity(opacity)

        if (progress < 1) {
          requestAnimationFrame(animate)
        } else {
          resolve()
        }
      }
      animate()
    })
  }

  private async fadeInNew(): Promise<void> {
    const duration = 500
    const startTime = performance.now()

    return new Promise((resolve) => {
      const animate = () => {
        const elapsed = performance.now() - startTime
        const progress = Math.min(elapsed / duration, 1)
        const easeProgress = this.easeInOutCubic(progress)

        this.setAllOpacity(easeProgress)

        if (progress < 1) {
          requestAnimationFrame(animate)
        } else {
          this.resetGlowOpacity()
          resolve()
        }
      }
      animate()
    })
  }

  private easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
  }

  private setAllOpacity(opacity: number): void {
    this.atomMeshes.forEach((data) => {
      data.material.opacity = opacity
      data.material.transparent = opacity < 1
      data.glowMaterial.opacity = opacity * 0.5
      data.glowMaterial.transparent = true
    })

    this.bondMeshes.forEach((data) => {
      data.material.opacity = opacity
      data.material.transparent = opacity < 1
    })

    this.labelObjects.forEach((label) => {
      const element = label.element as HTMLElement
      element.style.opacity = String(opacity)
    })

    this.angleObjects.forEach((obj) => {
      if (obj instanceof THREE.Line) {
        const material = obj.material as THREE.LineDashedMaterial
        material.opacity = opacity * 0.8
        material.transparent = true
      } else if (obj instanceof CSS2DObject) {
        const element = obj.element as HTMLElement
        element.style.opacity = String(opacity)
      }
    })
  }

  private resetGlowOpacity(): void {
    this.atomMeshes.forEach((data) => {
      data.glowMaterial.opacity = 0
    })
  }

  private clearMolecule(): void {
    this.atomMeshes.forEach((data) => {
      data.mesh.geometry.dispose()
      data.material.dispose()
      this.moleculeGroup.remove(data.mesh)
    })
    this.atomMeshes.clear()

    this.bondMeshes.forEach((data) => {
      data.mesh.geometry.dispose()
      data.material.dispose()
      this.moleculeGroup.remove(data.mesh)
    })
    this.bondMeshes.clear()

    this.labelObjects.forEach((label) => {
      this.labelsGroup.remove(label)
    })
    this.labelObjects = []

    this.angleObjects.forEach((obj) => {
      this.anglesGroup.remove(obj)
      if (obj instanceof THREE.Line) {
        obj.geometry.dispose()
        const material = obj.material as THREE.Material
        material.dispose()
      }
    })
    this.angleObjects = []

    this.allAtomMeshes = []
    this.molecule = null
  }

  private createMoleculeMeshes(molecule: Molecule): void {
    const atomsByElement = new Map<string, { atom: Atom; originalIndex: number }[]>()

    molecule.atoms.forEach((atom, index) => {
      if (!atomsByElement.has(atom.element)) {
        atomsByElement.set(atom.element, [])
      }
      atomsByElement.get(atom.element)!.push({ atom, originalIndex: index })
    })

    atomsByElement.forEach((atomsData, element) => {
      const firstAtom = atomsData[0].atom
      const material = new THREE.MeshStandardMaterial({
        color: firstAtom.color,
        roughness: 0.3,
        metalness: 0.1,
        transparent: true,
        opacity: 0
      })

      const instancedMesh = new THREE.InstancedMesh(
        this.atomGeometry,
        material,
        atomsData.length
      )
      instancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage)

      const dummy = new THREE.Object3D()
      const indices = new Map<number, number>()

      atomsData.forEach(({ atom, originalIndex }, i) => {
        dummy.position.copy(atom.position)
        dummy.scale.setScalar(atom.radius)
        dummy.updateMatrix()
        instancedMesh.setMatrixAt(i, dummy.matrix)
        indices.set(originalIndex, i)
        ;(instancedMesh as any).atomIndex = originalIndex
      })

      instancedMesh.instanceMatrix.needsUpdate = true

      this.moleculeGroup.add(instancedMesh)
      this.allAtomMeshes.push(instancedMesh as any)

      this.atomMeshes.set(element, {
        mesh: instancedMesh,
        material,
        dummy,
        indices
      })
    })

    const bondsByType = new Map<string, Bond[]>()
    molecule.bonds.forEach((bond) => {
      if (!bondsByType.has(bond.type)) {
        bondsByType.set(bond.type, [])
      }
      bondsByType.get(bond.type)!.push(bond)
    })

    bondsByType.forEach((bonds, type) => {
      const bondRadius = type === 'double' ? 0.12 : type === 'triple' ? 0.14 : 0.1
      const material = new THREE.MeshStandardMaterial({
        color: 0x888888,
        roughness: 0.5,
        metalness: 0.3,
        transparent: true,
        opacity: 0
      })

      const geometry = new THREE.CylinderGeometry(bondRadius, bondRadius, 1, 8)
      const instancedMesh = new THREE.InstancedMesh(geometry, material, bonds.length)
      instancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage)

      const dummy = new THREE.Object3D()

      bonds.forEach((bond, i) => {
        const atom1 = molecule.atoms[bond.atomIndex1]
        const atom2 = molecule.atoms[bond.atomIndex2]
        this.setupBondTransform(
          dummy,
          atom1.position,
          atom2.position,
          atom1.radius,
          atom2.radius
        )
        instancedMesh.setMatrixAt(i, dummy.matrix)
      })

      instancedMesh.instanceMatrix.needsUpdate = true
      this.moleculeGroup.add(instancedMesh)

      this.bondMeshes.set(type, {
        mesh: instancedMesh,
        material,
        dummy
      })
    })
  }

  private setupBondTransform(
    dummy: THREE.Object3D,
    from: THREE.Vector3,
    to: THREE.Vector3,
    radiusFrom: number,
    radiusTo: number
  ): void {
    const direction = to.clone().sub(from)
    const totalLength = direction.length()
    const normalizedDir = direction.clone().normalize()

    const startPoint = from.clone().add(normalizedDir.clone().multiplyScalar(radiusFrom))
    const endPoint = to.clone().add(normalizedDir.clone().multiplyScalar(-radiusTo))
    const bondLength = endPoint.distanceTo(startPoint)

    dummy.position.copy(startPoint.clone().add(endPoint).multiplyScalar(0.5))
    dummy.scale.set(1, bondLength, 1)
    dummy.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      normalizedDir
    )
    dummy.updateMatrix()
  }

  private createLabels(molecule: Molecule): void {
    molecule.atoms.forEach((atom) => {
      const div = document.createElement('div')
      div.className = 'atom-label'
      div.textContent = atom.element
      div.style.color = '#ffffff'
      div.style.fontSize = '15px'
      div.style.fontFamily = 'sans-serif'
      div.style.fontWeight = 'bold'
      div.style.textShadow = '2px 2px 4px #000000, -1px -1px 2px #000000'
      div.style.pointerEvents = 'none'
      div.style.userSelect = 'none'

      const label = new CSS2DObject(div)
      label.position.copy(atom.position)
      label.position.y += atom.radius + 0.2
      this.labelsGroup.add(label)
      this.labelObjects.push(label)
    })
  }

  private createAngleAnnotations(molecule: Molecule): void {
    const angles = molecule.getBondAngles()

    angles.forEach((angleData) => {
      const centerAtom = molecule.atoms[angleData.centerIndex]
      const atom1 = molecule.atoms[angleData.atomIndex1]
      const atom2 = molecule.atoms[angleData.atomIndex2]

      const v1 = atom1.position.clone().sub(centerAtom.position).normalize()
      const v2 = atom2.position.clone().sub(centerAtom.position).normalize()

      const arcRadius = Math.min(centerAtom.radius * 2, 0.8)
      const segments = 20
      const points: THREE.Vector3[] = []

      for (let i = 0; i <= segments; i++) {
        const t = i / segments
        const interpolated = v1.clone().lerp(v2, t).normalize()
        points.push(
          centerAtom.position.clone().add(interpolated.multiplyScalar(arcRadius))
        )
      }

      const geometry = new THREE.BufferGeometry().setFromPoints(points)
      const material = new THREE.LineDashedMaterial({
        color: 0x888888,
        dashSize: 0.1,
        gapSize: 0.05,
        transparent: true,
        opacity: 0.8
      })

      const line = new THREE.Line(geometry, material)
      line.computeLineDistances()
      this.anglesGroup.add(line)
      this.angleObjects.push(line)

      const midVector = v1.clone().add(v2).normalize()
      const labelPos = centerAtom.position.clone().add(midVector.multiplyScalar(arcRadius + 0.3))

      const div = document.createElement('div')
      div.className = 'angle-label'
      div.textContent = `${angleData.angle.toFixed(1)}°`
      div.style.color = '#aaaaaa'
      div.style.fontSize = '12px'
      div.style.fontFamily = 'sans-serif'
      div.style.textShadow = '1px 1px 2px #000000'
      div.style.pointerEvents = 'none'
      div.style.userSelect = 'none'

      const label = new CSS2DObject(div)
      label.position.copy(labelPos)
      this.anglesGroup.add(label)
      this.angleObjects.push(label)
    })
  }

  updateLabelsVisibility(show: boolean): void {
    this.labelObjects.forEach((label) => {
      label.visible = show
    })
  }

  updateAnglesVisibility(show: boolean): void {
    this.angleObjects.forEach((obj) => {
      obj.visible = show
    })
  }

  updateMousePosition(clientX: number, clientY: number): void {
    const rect = this.container.getBoundingClientRect()
    this.mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1
    this.mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1
  }

  checkHover(): boolean {
    this.raycaster.setFromCamera(this.mouse, this.camera)
    const intersects = this.raycaster.intersectObjects(this.allAtomMeshes, false)

    if (intersects.length > 0) {
      const hit = intersects[0]
      const instanceId = hit.instanceId

      if (instanceId !== undefined) {
        const mesh = hit.object as THREE.InstancedMesh
        let atomIndex = -1

        this.atomMeshes.forEach((data) => {
          if (data.mesh === mesh) {
            data.indices.forEach((instIdx, originalIdx) => {
              if (instIdx === instanceId) {
                atomIndex = originalIdx
              }
            })
          }
        })

        if (atomIndex !== this.hoveredAtomIndex) {
          this.clearHover()
          this.hoveredAtomIndex = atomIndex
          this.setAtomHighlight(atomIndex, true)
        }
        return true
      }
    } else if (this.hoveredAtomIndex !== null) {
      this.clearHover()
    }
    return false
  }

  private setAtomHighlight(atomIndex: number, highlight: boolean): void {
    if (!this.molecule) return

    const atom = this.molecule.atoms[atomIndex]

    if (highlight) {
      this.hoverGlow.position.copy(atom.position)
      this.hoverGlow.scale.setScalar(atom.radius * 1.4)
      const material = this.hoverGlow.material as THREE.MeshBasicMaterial
      material.opacity = 0.4
      material.color.setHex(atom.color)
      this.hoverGlow.visible = true
    } else {
      this.hoverGlow.visible = false
      const material = this.hoverGlow.material as THREE.MeshBasicMaterial
      material.opacity = 0
    }
  }

  private clearHover(): void {
    if (this.hoveredAtomIndex !== null) {
      this.setAtomHighlight(this.hoveredAtomIndex, false)
      this.hoveredAtomIndex = null
    }
  }

  resetCamera(): void {
    this.camera.position.set(0, 0, 5)
    this.camera.lookAt(0, 0, 0)
  }

  private onWindowResize(): void {
    const width = this.container.clientWidth
    const height = this.container.clientHeight

    this.camera.aspect = width / height
    this.camera.updateProjectionMatrix()

    this.renderer.setSize(width, height)
    this.labelRenderer.setSize(width, height)
    this.composer.setSize(width, height)
  }

  render(): void {
    this.composer.render()
    this.labelRenderer.render(this.scene, this.camera)
  }

  dispose(): void {
    window.removeEventListener('resize', this.onWindowResize.bind(this))
    this.clearMolecule()
    this.atomGeometry.dispose()
    this.bondGeometry.dispose()
    this.renderer.dispose()
    this.composer.dispose()
    this.container.removeChild(this.renderer.domElement)
    this.container.removeChild(this.labelRenderer.domElement)
  }
}
