import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import {
  generateProceduralPBR,
  disposeProceduralTextures,
  type PBRTextureSet,
} from './proceduralTextures'
import type { SceneMeshData } from './SceneView'

export type MaterialType = 'wood' | 'marble' | 'brushedMetal' | 'carbonFiber' | 'redFabric'
export type ModelType = 'vase' | 'teapot' | 'torusKnot'

export interface MaterialParams {
  metalness: number
  roughness: number
}

export interface LightParams {
  angleY: number
}

export interface Metrics {
  brightness: number
  glossiness: number
  fps?: number
}

export interface SceneConfig {
  material: MaterialType
  model: ModelType
  materialParams: MaterialParams
  lightParams: LightParams
}

const MODEL_URLS: Record<ModelType, string> = {
  vase: 'https://threejs.org/examples/models/gltf/LittlestTokyo.glb',
  teapot: 'https://threejs.org/examples/models/gltf/SheenChair/SheenChair.glb',
  torusKnot: 'https://threejs.org/examples/models/gltf/DamagedHelmet/glTF/DamagedHelmet.gltf',
}

const createFallbackVase = (): SceneMeshData => {
  const curvePoints: THREE.Vector2[] = []
  const segments = 40
  for (let i = 0; i <= segments; i++) {
    const t = i / segments
    let radius: number
    if (t < 0.05) radius = 0.08 + t * 0.4
    else if (t < 0.3) radius = 0.3 + Math.sin(((t - 0.05) / 0.25) * Math.PI) * 0.5
    else if (t < 0.7) radius = 0.8 - ((t - 0.3) / 0.4) * 0.35
    else if (t < 0.9) radius = 0.45 + Math.sin(((t - 0.7) / 0.2) * Math.PI) * 0.15
    else radius = 0.6 - ((t - 0.9) / 0.1) * 0.3
    curvePoints.push(new THREE.Vector2(radius, t * 2.4 - 1.2))
  }
  return {
    meshes: [{ geometry: new THREE.LatheGeometry(curvePoints, 64), transform: new THREE.Matrix4() }],
    scale: 1,
    positionY: 0,
  }
}

const createFallbackTeapot = (): SceneMeshData => {
  const meshes: Array<{ geometry: THREE.BufferGeometry; transform: THREE.Matrix4 }> = []

  const body = new THREE.SphereGeometry(0.8, 48, 32)
  body.scale(1, 0.85, 1)
  meshes.push({ geometry: body, transform: new THREE.Matrix4() })

  const lid = new THREE.SphereGeometry(0.35, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2)
  const lidMat = new THREE.Matrix4().makeTranslation(0, 0.7, 0)
  meshes.push({ geometry: lid, transform: lidMat })

  const knob = new THREE.SphereGeometry(0.1, 24, 16)
  const knobMat = new THREE.Matrix4().makeTranslation(0, 0.95, 0)
  meshes.push({ geometry: knob, transform: knobMat })

  const spoutCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.7, 0.2, 0),
    new THREE.Vector3(1.0, 0.3, 0),
    new THREE.Vector3(1.2, 0.5, 0),
    new THREE.Vector3(1.3, 0.7, 0),
  ])
  meshes.push({ geometry: new THREE.TubeGeometry(spoutCurve, 20, 0.1, 12, false), transform: new THREE.Matrix4() })

  const handleCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.7, 0.15, 0),
    new THREE.Vector3(-1.1, 0.1, 0),
    new THREE.Vector3(-1.25, 0.4, 0),
    new THREE.Vector3(-1.15, 0.65, 0),
    new THREE.Vector3(-0.7, 0.6, 0),
  ])
  meshes.push({ geometry: new THREE.TubeGeometry(handleCurve, 24, 0.09, 12, false), transform: new THREE.Matrix4() })

  const base = new THREE.CylinderGeometry(0.45, 0.55, 0.1, 48)
  const baseMat = new THREE.Matrix4().makeTranslation(0, -0.72, 0)
  meshes.push({ geometry: base, transform: baseMat })

  return { meshes, scale: 1, positionY: 0 }
}

const createFallbackTorus = (): SceneMeshData => ({
  meshes: [
    {
      geometry: new THREE.TorusKnotGeometry(0.8, 0.28, 200, 32, 2, 3),
      transform: new THREE.Matrix4(),
    },
  ],
  scale: 1,
  positionY: 0,
})

const FALLBACK_FACTORIES: Record<ModelType, () => SceneMeshData> = {
  vase: createFallbackVase,
  teapot: createFallbackTeapot,
  torusKnot: createFallbackTorus,
}

const loadedModels: Map<ModelType, SceneMeshData> = new Map()
const gltfLoader = new GLTFLoader()

export const loadMeshes = async (type: ModelType): Promise<SceneMeshData> => {
  if (loadedModels.has(type)) return loadedModels.get(type)!
  try {
    const gltf = await new Promise<any>((resolve, reject) => {
      gltfLoader.load(MODEL_URLS[type], resolve, undefined, reject)
    })
    const meshes: Array<{ geometry: THREE.BufferGeometry; transform: THREE.Matrix4 }> = []
    let hasMesh = false
    gltf.scene.traverse((child: any) => {
      if (child.isMesh && child.geometry) {
        child.updateWorldMatrix(true, false)
        const geo = child.geometry.clone()
        geo.computeVertexNormals()
        const matrix = child.matrixWorld.clone()
        meshes.push({ geometry: geo, transform: matrix })
        hasMesh = true
      }
    })
    if (!hasMesh) throw new Error('No mesh found in glTF')
    const data: SceneMeshData = { meshes, scale: 1.0, positionY: 0 }
    loadedModels.set(type, data)
    return data
  } catch {
    const fallback = FALLBACK_FACTORIES[type]()
    loadedModels.set(type, fallback)
    return fallback
  }
}

export class SceneManager {
  private materialCache: Map<MaterialType, THREE.MeshStandardMaterial> = new Map()
  private currentMaterial: THREE.MeshStandardMaterial | null = null
  private currentMaterialType: MaterialType = 'wood'
  private directionalLight: THREE.DirectionalLight | null = null
  private ambientLight: THREE.AmbientLight | null = null
  private metricsCallback: ((metrics: Metrics) => void) | null = null
  private readyMaterials: Set<MaterialType> = new Set()
  private renderTarget: THREE.WebGLRenderTarget | null = null
  private pixelBuffer: Uint8Array | null = null
  private lastBrightness: number = 128
  private lastMetricsTime: number = 0

  constructor() {
    this.initRenderTarget()
    this.initAllMaterials()
  }

  private initRenderTarget(): void {
    this.renderTarget = new THREE.WebGLRenderTarget(128, 128, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      type: THREE.UnsignedByteType,
    })
    this.pixelBuffer = new Uint8Array(128 * 128 * 4)
  }

  private initAllMaterials(): void {
    const types: MaterialType[] = ['wood', 'marble', 'brushedMetal', 'carbonFiber', 'redFabric']
    types.forEach((t) => {
      const textures = generateProceduralPBR(t)
      const defaults = this.getMaterialDefaults(t)
      const mat = this.buildMaterialFromTextures(textures, defaults)
      this.materialCache.set(t, mat)
      this.readyMaterials.add(t)
    })
    this.currentMaterial = this.materialCache.get('wood')!.clone()
  }

  private buildMaterialFromTextures(
    textures: PBRTextureSet,
    defaults: MaterialParams
  ): THREE.MeshStandardMaterial {
    const mat = new THREE.MeshStandardMaterial({
      metalness: defaults.metalness,
      roughness: defaults.roughness,
    })
    if (textures.albedo) mat.map = textures.albedo
    if (textures.roughness) mat.roughnessMap = textures.roughness
    if (textures.normal) {
      mat.normalMap = textures.normal
      mat.normalScale = new THREE.Vector2(0.8, 0.8)
    }
    mat.needsUpdate = true
    return mat
  }

  isMaterialReady(type: MaterialType): boolean {
    return this.readyMaterials.has(type)
  }

  setMetricsCallback(callback: (metrics: Metrics) => void): void {
    this.metricsCallback = callback
  }

  async loadMeshes(modelType: ModelType): Promise<SceneMeshData> {
    return loadMeshes(modelType)
  }

  getMaterial(type: MaterialType): THREE.MeshStandardMaterial {
    if (this.currentMaterial) {
      this.currentMaterial.dispose()
    }
    const sourceMat = this.materialCache.get(type)!
    this.currentMaterial = sourceMat.clone()
    this.currentMaterial.needsUpdate = true
    this.currentMaterialType = type
    return this.currentMaterial
  }

  getCurrentMaterialType(): MaterialType {
    return this.currentMaterialType
  }

  getCurrentMaterial(): THREE.MeshStandardMaterial | null {
    return this.currentMaterial
  }

  updateMaterial(
    mesh: THREE.Mesh | null,
    type: MaterialType,
    params: MaterialParams
  ): void {
    if (!mesh) return
    const mat = this.getMaterial(type)
    mat.metalness = params.metalness
    mat.roughness = params.roughness
    mat.needsUpdate = true
    mesh.material = mat
  }

  updateMaterialParams(
    mesh: THREE.Mesh | null,
    params: MaterialParams
  ): void {
    if (!mesh || !this.currentMaterial) return
    this.currentMaterial.metalness = params.metalness
    this.currentMaterial.roughness = params.roughness
    this.currentMaterial.needsUpdate = true
  }

  createAmbientLight(): THREE.AmbientLight {
    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.4)
    return this.ambientLight
  }

  createDirectionalLight(): THREE.DirectionalLight {
    this.directionalLight = new THREE.DirectionalLight(0xffffff, 0.8)
    this.directionalLight.castShadow = true
    this.directionalLight.shadow.mapSize.set(2048, 2048)
    this.directionalLight.shadow.camera.near = 0.5
    this.directionalLight.shadow.camera.far = 20
    this.directionalLight.shadow.camera.left = -5
    this.directionalLight.shadow.camera.right = 5
    this.directionalLight.shadow.camera.top = 5
    this.directionalLight.shadow.camera.bottom = -5
    this.directionalLight.shadow.bias = -0.0001
    this.updateLightAngle(45)
    return this.directionalLight
  }

  static getLightPosition(angleDeg: number): THREE.Vector3 {
    const angleRad = (angleDeg * Math.PI) / 180
    const radius = 6
    return new THREE.Vector3(
      Math.sin(angleRad) * radius,
      4,
      Math.cos(angleRad) * radius
    )
  }

  updateLightAngle(angleDeg: number): void {
    if (!this.directionalLight) return
    const pos = SceneManager.getLightPosition(angleDeg)
    this.directionalLight.position.copy(pos)
    if (this.directionalLight.target) {
      this.directionalLight.target.position.set(0, 0, 0)
    }
  }

  createGround(): THREE.Mesh {
    const geometry = new THREE.PlaneGeometry(20, 20)
    const material = new THREE.ShadowMaterial({ opacity: 0.35 })
    const mesh = new THREE.Mesh(geometry, material)
    mesh.rotation.x = -Math.PI / 2
    mesh.position.y = -1.3
    mesh.receiveShadow = true
    return mesh
  }

  computeMetricsPerFrame(
    renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    camera: THREE.Camera,
    materialParams: MaterialParams
  ): Metrics {
    let brightness = this.lastBrightness
    let fps = 0

    if (this.renderTarget && this.pixelBuffer && renderer) {
      const now = performance.now()
      if (now - this.lastMetricsTime > 450) {
        this.lastMetricsTime = now
        try {
          renderer.setRenderTarget(this.renderTarget)
          renderer.render(scene, camera)
          renderer.readRenderTargetPixels(
            this.renderTarget,
            0,
            0,
            128,
            128,
            this.pixelBuffer
          )
          renderer.setRenderTarget(null)

          let totalLum = 0
          let count = 0
          const buf = this.pixelBuffer
          const step = 4 * 8
          for (let i = 0; i < buf.length; i += step) {
            const a = buf[i + 3]
            if (a < 8) continue
            const r = buf[i]
            const g = buf[i + 1]
            const b = buf[i + 2]
            totalLum += 0.299 * r + 0.587 * g + 0.114 * b
            count++
          }
          if (count > 0) {
            brightness = Math.round(totalLum / count)
            brightness = Math.max(0, Math.min(255, brightness))
            this.lastBrightness = brightness
          }
        } catch {
          renderer.setRenderTarget(null)
        }
      }
    }

    const glossiness = Math.round((1 - materialParams.roughness) * 100)

    const metrics: Metrics = {
      brightness,
      glossiness: Math.max(0, Math.min(100, glossiness)),
      fps,
    }

    if (this.metricsCallback) {
      this.metricsCallback(metrics)
    }

    return metrics
  }

  getMaterialDefaults(type: MaterialType): MaterialParams {
    const defaults: Record<MaterialType, MaterialParams> = {
      wood: { metalness: 0.0, roughness: 0.65 },
      marble: { metalness: 0.05, roughness: 0.25 },
      brushedMetal: { metalness: 0.95, roughness: 0.35 },
      carbonFiber: { metalness: 0.6, roughness: 0.45 },
      redFabric: { metalness: 0.0, roughness: 0.9 },
    }
    return { ...defaults[type] }
  }

  cloneMaterial(type: MaterialType): THREE.MeshStandardMaterial {
    const source = this.materialCache.get(type)
    return source ? source.clone() : new THREE.MeshStandardMaterial()
  }

  dispose(): void {
    this.materialCache.forEach((mat) => {
      mat.dispose()
    })
    if (this.currentMaterial) {
      this.currentMaterial.dispose()
    }
    if (this.renderTarget) {
      this.renderTarget.dispose()
    }
    loadedModels.forEach((data) => {
      data.meshes.forEach((m) => m.geometry.dispose())
    })
    loadedModels.clear()
    disposeProceduralTextures()
  }
}

export const materialLabels: Record<MaterialType, string> = {
  wood: '木纹材质',
  marble: '大理石',
  brushedMetal: '拉丝金属',
  carbonFiber: '碳纤维',
  redFabric: '红色布料',
}

export const modelLabels: Record<ModelType, string> = {
  vase: '古典花瓶',
  teapot: '茶壶',
  torusKnot: '圆环纽结',
}
