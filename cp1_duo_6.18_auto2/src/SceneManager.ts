import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

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
}

export interface SceneConfig {
  material: MaterialType
  model: ModelType
  materialParams: MaterialParams
  lightParams: LightParams
}

export interface PBRTextureSet {
  albedo: THREE.Texture | null
  roughness: THREE.Texture | null
  normal: THREE.Texture | null
}

const TEXTURE_BASE_URLS: Record<MaterialType, { albedo: string; roughness: string; normal: string }> = {
  wood: {
    albedo: 'https://threejs.org/examples/textures/hardwood2_diffuse.jpg',
    roughness: 'https://threejs.org/examples/textures/hardwood2_roughness.jpg',
    normal: 'https://threejs.org/examples/textures/hardwood2_normal.jpg',
  },
  marble: {
    albedo: 'https://threejs.org/examples/textures/brick_diffuse.jpg',
    roughness: 'https://threejs.org/examples/textures/brick_roughness.jpg',
    normal: 'https://threejs.org/examples/textures/brick_normal.jpg',
  },
  brushedMetal: {
    albedo: 'https://threejs.org/examples/textures/metalness.jpg',
    roughness: 'https://threejs.org/examples/textures/roughness_map.jpg',
    normal: 'https://threejs.org/examples/textures/normal_map.jpg',
  },
  carbonFiber: {
    albedo: 'https://threejs.org/examples/textures/compressed/weave_iu2_dxt1_basis.ktx2',
    roughness: 'https://threejs.org/examples/textures/roughness_map.jpg',
    normal: 'https://threejs.org/examples/textures/normal_map.jpg',
  },
  redFabric: {
    albedo: 'https://threejs.org/examples/textures/terrain/grasslight-big.jpg',
    roughness: 'https://threejs.org/examples/textures/terrain/grasslight-big-nm.jpg',
    normal: 'https://threejs.org/examples/textures/terrain/grasslight-big-nm.jpg',
  },
}

const MODEL_URLS: Record<ModelType, string> = {
  vase: 'https://threejs.org/examples/models/gltf/LittlestTokyo.glb',
  teapot: 'https://threejs.org/examples/models/gltf/SheenChair/SheenChair.glb',
  torusKnot: 'https://threejs.org/examples/models/gltf/DamagedHelmet/glTF/DamagedHelmet.gltf',
}

const FALLBACK_MODEL_PARAMS: Record<ModelType, {
  create: () => THREE.BufferGeometry
  scale?: number
  positionY?: number
}> = {
  vase: {
    create: () => {
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
      return new THREE.LatheGeometry(curvePoints, 64)
    },
    scale: 1,
    positionY: 0,
  },
  teapot: {
    create: () => {
      const merged = new THREE.BufferGeometry()
      const positions: number[] = []
      const normals: number[] = []
      const uvs: number[] = []
      const indices: number[] = []
      let indexOffset = 0

      const addGeometry = (geo: THREE.BufferGeometry) => {
        const pos = geo.attributes.position.array as Float32Array
        const nor = geo.attributes.normal.array as Float32Array
        const uvAttr = geo.attributes.uv
        const uv = uvAttr ? (uvAttr.array as Float32Array) : null
        const ind = geo.index ? (geo.index.array as Uint16Array) : null

        for (let i = 0; i < pos.length; i++) positions.push(pos[i])
        for (let i = 0; i < nor.length; i++) normals.push(nor[i])
        if (uv) for (let i = 0; i < uv.length; i++) uvs.push(uv[i])
        else for (let i = 0; i < pos.length / 3; i++) { uvs.push(0, 0) }
        if (ind) for (let i = 0; i < ind.length; i++) indices.push(ind[i] + indexOffset)
        else for (let i = 0; i < pos.length / 3; i++) indices.push(i + indexOffset)
        indexOffset += pos.length / 3
      }

      const body = new THREE.SphereGeometry(0.8, 48, 32)
      body.scale(1, 0.85, 1)
      addGeometry(body)
      const lid = new THREE.SphereGeometry(0.35, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2)
      lid.translate(0, 0.7, 0)
      addGeometry(lid)
      const knob = new THREE.SphereGeometry(0.1, 24, 16)
      knob.translate(0, 0.95, 0)
      addGeometry(knob)
      const spoutCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(0.7, 0.2, 0),
        new THREE.Vector3(1.0, 0.3, 0),
        new THREE.Vector3(1.2, 0.5, 0),
        new THREE.Vector3(1.3, 0.7, 0),
      ])
      addGeometry(new THREE.TubeGeometry(spoutCurve, 20, 0.1, 12, false))
      const handleCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(-0.7, 0.15, 0),
        new THREE.Vector3(-1.1, 0.1, 0),
        new THREE.Vector3(-1.25, 0.4, 0),
        new THREE.Vector3(-1.15, 0.65, 0),
        new THREE.Vector3(-0.7, 0.6, 0),
      ])
      addGeometry(new THREE.TubeGeometry(handleCurve, 24, 0.09, 12, false))
      const base = new THREE.CylinderGeometry(0.45, 0.55, 0.1, 48)
      base.translate(0, -0.72, 0)
      addGeometry(base)

      merged.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
      merged.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3))
      merged.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
      merged.setIndex(indices)
      merged.computeVertexNormals()
      return merged
    },
    scale: 1,
    positionY: 0,
  },
  torusKnot: {
    create: () => new THREE.TorusKnotGeometry(0.8, 0.28, 200, 32, 2, 3),
    scale: 1,
    positionY: 0,
  },
}

const loadingManager = new THREE.LoadingManager()
const textureLoader = new THREE.TextureLoader(loadingManager)
const gltfLoader = new GLTFLoader(loadingManager)

const loadedTextures: Map<string, PBRTextureSet> = new Map()
const loadedGeometries: Map<string, THREE.BufferGeometry> = new Map()

export const loadPBRTextures = async (type: MaterialType): Promise<PBRTextureSet> => {
  if (loadedTextures.has(type)) {
    return loadedTextures.get(type)!
  }
  const urls = TEXTURE_BASE_URLS[type]
  try {
    const [albedo, roughness, normal] = await Promise.all([
      new Promise<THREE.Texture | null>((resolve) => {
        textureLoader.load(
          urls.albedo,
          (tex) => {
            tex.wrapS = THREE.RepeatWrapping
            tex.wrapT = THREE.RepeatWrapping
            tex.anisotropy = 8
            tex.colorSpace = THREE.SRGBColorSpace
            resolve(tex)
          },
          undefined,
          () => resolve(null)
        )
      }),
      new Promise<THREE.Texture | null>((resolve) => {
        textureLoader.load(
          urls.roughness,
          (tex) => {
            tex.wrapS = THREE.RepeatWrapping
            tex.wrapT = THREE.RepeatWrapping
            tex.anisotropy = 8
            resolve(tex)
          },
          undefined,
          () => resolve(null)
        )
      }),
      new Promise<THREE.Texture | null>((resolve) => {
        textureLoader.load(
          urls.normal,
          (tex) => {
            tex.wrapS = THREE.RepeatWrapping
            tex.wrapT = THREE.RepeatWrapping
            tex.anisotropy = 8
            resolve(tex)
          },
          undefined,
          () => resolve(null)
        )
      }),
    ])
    const set: PBRTextureSet = { albedo, roughness, normal }
    loadedTextures.set(type, set)
    return set
  } catch {
    const set: PBRTextureSet = { albedo: null, roughness: null, normal: null }
    loadedTextures.set(type, set)
    return set
  }
}

export const loadModelGeometry = async (
  type: ModelType
): Promise<{ geometry: THREE.BufferGeometry; scale: number; positionY: number }> => {
  if (loadedGeometries.has(type)) {
    const fallback = FALLBACK_MODEL_PARAMS[type]
    return {
      geometry: loadedGeometries.get(type)!,
      scale: fallback.scale ?? 1,
      positionY: fallback.positionY ?? 0,
    }
  }
  const fallback = FALLBACK_MODEL_PARAMS[type]
  try {
    const gltf = await new Promise<any>((resolve, reject) => {
      gltfLoader.load(MODEL_URLS[type], resolve, undefined, reject)
    })
    let targetGeometry: THREE.BufferGeometry | null = null
    gltf.scene.traverse((child: any) => {
      if (child.isMesh && child.geometry) {
        const geo = child.geometry.clone()
        geo.computeVertexNormals()
        if (!targetGeometry) targetGeometry = geo
      }
    })
    if (targetGeometry) {
      loadedGeometries.set(type, targetGeometry)
      return { geometry: targetGeometry, scale: 1.5, positionY: 0 }
    }
    return {
      geometry: fallback.create(),
      scale: fallback.scale ?? 1,
      positionY: fallback.positionY ?? 0,
    }
  } catch {
    const geo = fallback.create()
    loadedGeometries.set(type, geo)
    return {
      geometry: geo,
      scale: fallback.scale ?? 1,
      positionY: fallback.positionY ?? 0,
    }
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

  constructor() {
    this.initRenderTarget()
    this.initPlaceholderMaterials()
    this.preloadAllAssets()
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

  private initPlaceholderMaterials(): void {
    const types: MaterialType[] = ['wood', 'marble', 'brushedMetal', 'carbonFiber', 'redFabric']
    types.forEach((t) => {
      const defaults = this.getMaterialDefaults(t)
      const mat = new THREE.MeshStandardMaterial({
        color: this.getMaterialFallbackColor(t),
        metalness: defaults.metalness,
        roughness: defaults.roughness,
      })
      this.materialCache.set(t, mat)
    })
    this.currentMaterial = this.materialCache.get('wood')!.clone()
  }

  private getMaterialFallbackColor(type: MaterialType): THREE.ColorRepresentation {
    switch (type) {
      case 'wood': return 0x8b5a2b
      case 'marble': return 0xe8e4d8
      case 'brushedMetal': return 0xa8a8a8
      case 'carbonFiber': return 0x1a1a1a
      case 'redFabric': return 0xb33a3a
    }
  }

  private async preloadAllAssets(): Promise<void> {
    const types: MaterialType[] = ['wood', 'marble', 'brushedMetal', 'carbonFiber', 'redFabric']
    const models: ModelType[] = ['vase', 'teapot', 'torusKnot']
    try {
      await Promise.all([
        ...types.map((t) => this.loadAndApplyMaterial(t)),
        ...models.map((m) => loadModelGeometry(m)),
      ])
    } catch {
      // silent: fallbacks in place
    }
  }

  private async loadAndApplyMaterial(type: MaterialType): Promise<void> {
    const textures = await loadPBRTextures(type)
    const defaults = this.getMaterialDefaults(type)
    const existing = this.materialCache.get(type)
    if (existing) {
      if (textures.albedo) existing.map = textures.albedo
      if (textures.roughness) existing.roughnessMap = textures.roughness
      if (textures.normal) {
        existing.normalMap = textures.normal
        existing.normalScale = new THREE.Vector2(0.8, 0.8)
      }
      existing.metalness = defaults.metalness
      existing.roughness = defaults.roughness
      existing.color.set(0xffffff)
      existing.needsUpdate = true
    }
    this.readyMaterials.add(type)
  }

  isMaterialReady(type: MaterialType): boolean {
    return this.readyMaterials.has(type)
  }

  setMetricsCallback(callback: (metrics: Metrics) => void): void {
    this.metricsCallback = callback
  }

  async createModel(
    modelType: ModelType
  ): Promise<{ geometry: THREE.BufferGeometry; scale: number; positionY: number }> {
    return loadModelGeometry(modelType)
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

    if (this.renderTarget && this.pixelBuffer && renderer) {
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
        const step = 4 * 4
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

    const glossiness = Math.round((1 - materialParams.roughness) * 100)

    const metrics: Metrics = {
      brightness,
      glossiness: Math.max(0, Math.min(100, glossiness)),
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
      mat.map?.dispose()
      mat.normalMap?.dispose()
      mat.roughnessMap?.dispose()
      mat.dispose()
    })
    if (this.currentMaterial) {
      this.currentMaterial.dispose()
    }
    if (this.renderTarget) {
      this.renderTarget.dispose()
    }
    loadedTextures.forEach((set) => {
      set.albedo?.dispose()
      set.roughness?.dispose()
      set.normal?.dispose()
    })
    loadedGeometries.forEach((geo) => geo.dispose())
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
