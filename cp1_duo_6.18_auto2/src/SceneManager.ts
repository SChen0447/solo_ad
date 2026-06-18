import * as THREE from 'three'

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

const generateWoodAlbedo = (size: number): Uint8Array => {
  const data = new Uint8Array(size * size * 4)
  const center = size / 2
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4
      const dist = Math.sqrt((x - center) ** 2 + (y - center) ** 2)
      const ring = Math.sin(dist * 0.15 + y * 0.05) * 0.5 + 0.5
      const grain = Math.sin(x * 0.3 + y * 0.02) * 0.1
      const base = 0.55 + ring * 0.2 + grain
      data[idx] = Math.floor(Math.min(1, base * 1.2) * 255)
      data[idx + 1] = Math.floor(Math.min(1, base * 0.85) * 255)
      data[idx + 2] = Math.floor(Math.min(1, base * 0.55) * 255)
      data[idx + 3] = 255
    }
  }
  return data
}

const generateMarbleAlbedo = (size: number): Uint8Array => {
  const data = new Uint8Array(size * size * 4)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4
      const noise1 = Math.sin(x * 0.08 + y * 0.06)
      const noise2 = Math.sin(x * 0.15 - y * 0.12 + 1.5)
      const noise3 = Math.sin((x + y) * 0.04)
      const veins = Math.abs(noise1 + noise2 * 0.5 + noise3 * 0.3) * 0.4
      const base = 0.9 - veins
      data[idx] = Math.floor(Math.min(1, base * 1.02) * 255)
      data[idx + 1] = Math.floor(Math.min(1, base * 1.0) * 255)
      data[idx + 2] = Math.floor(Math.min(1, base * 0.98) * 255)
      data[idx + 3] = 255
    }
  }
  return data
}

const generateMetalAlbedo = (size: number): Uint8Array => {
  const data = new Uint8Array(size * size * 4)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4
      const brush = Math.sin(x * 0.4 + Math.random() * 0.05) * 0.08
      const base = 0.75 + brush + (Math.random() - 0.5) * 0.04
      data[idx] = Math.floor(Math.min(1, Math.max(0, base)) * 255)
      data[idx + 1] = Math.floor(Math.min(1, Math.max(0, base * 0.96)) * 255)
      data[idx + 2] = Math.floor(Math.min(1, Math.max(0, base * 0.92)) * 255)
      data[idx + 3] = 255
    }
  }
  return data
}

const generateCarbonAlbedo = (size: number): Uint8Array => {
  const data = new Uint8Array(size * size * 4)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4
      const tileX = Math.floor(x / 16)
      const tileY = Math.floor(y / 16)
      const inTileX = x % 16
      const inTileY = y % 16
      const weave = ((tileX + tileY) % 2 === 0) ? (inTileX / 16) : (inTileY / 16)
      const noise = (Math.random() - 0.5) * 0.03
      const base = 0.15 + weave * 0.08 + noise
      data[idx] = Math.floor(Math.min(1, Math.max(0, base * 1.3)) * 255)
      data[idx + 1] = Math.floor(Math.min(1, Math.max(0, base * 1.25)) * 255)
      data[idx + 2] = Math.floor(Math.min(1, Math.max(0, base * 1.35)) * 255)
      data[idx + 3] = 255
    }
  }
  return data
}

const generateFabricAlbedo = (size: number): Uint8Array => {
  const data = new Uint8Array(size * size * 4)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4
      const threadX = Math.sin(x * 0.5) * 0.06
      const threadY = Math.sin(y * 0.5) * 0.06
      const noise = (Math.random() - 0.5) * 0.04
      const base = 0.75 + threadX + threadY + noise
      data[idx] = Math.floor(Math.min(1, Math.max(0, base * 1.05)) * 255)
      data[idx + 1] = Math.floor(Math.min(1, Math.max(0, base * 0.3)) * 255)
      data[idx + 2] = Math.floor(Math.min(1, Math.max(0, base * 0.35)) * 255)
      data[idx + 3] = 255
    }
  }
  return data
}

const generateNormalMap = (size: number, intensity: number): Uint8Array => {
  const data = new Uint8Array(size * size * 4)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4
      const noiseX = (Math.random() - 0.5) * intensity
      const noiseY = (Math.random() - 0.5) * intensity
      data[idx] = Math.floor((noiseX * 0.5 + 0.5) * 255)
      data[idx + 1] = Math.floor((noiseY * 0.5 + 0.5) * 255)
      data[idx + 2] = Math.floor(0.7 * 255)
      data[idx + 3] = 255
    }
  }
  return data
}

const generateRoughnessMap = (size: number, baseRough: number, variance: number): Uint8Array => {
  const data = new Uint8Array(size * size * 4)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4
      const noise = (Math.random() - 0.5) * variance
      const val = Math.min(1, Math.max(0, baseRough + noise))
      const byte = Math.floor(val * 255)
      data[idx] = byte
      data[idx + 1] = byte
      data[idx + 2] = byte
      data[idx + 3] = 255
    }
  }
  return data
}

const createTextureFromData = (
  data: Uint8Array,
  size: number
): THREE.DataTexture => {
  const texture = new THREE.DataTexture(
    data as unknown as BufferSource,
    size,
    size,
    THREE.RGBAFormat
  )
  texture.needsUpdate = true
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.anisotropy = 8
  return texture
}

const TEX_SIZE = 512

export class SceneManager {
  private materialCache: Map<MaterialType, THREE.MeshStandardMaterial> = new Map()
  private currentMaterial: THREE.MeshStandardMaterial | null = null
  private directionalLight: THREE.DirectionalLight | null = null
  private ambientLight: THREE.AmbientLight | null = null
  private metricsCallback: ((metrics: Metrics) => void) | null = null

  constructor() {
    this.initMaterials()
  }

  private initMaterials(): void {
    const woodMat = new THREE.MeshStandardMaterial({
      map: createTextureFromData(generateWoodAlbedo(TEX_SIZE), TEX_SIZE),
      normalMap: createTextureFromData(generateNormalMap(TEX_SIZE, 0.3), TEX_SIZE),
      roughnessMap: createTextureFromData(generateRoughnessMap(TEX_SIZE, 0.65, 0.15), TEX_SIZE),
      metalness: 0.0,
      roughness: 0.65,
      normalScale: new THREE.Vector2(0.5, 0.5),
    })

    const marbleMat = new THREE.MeshStandardMaterial({
      map: createTextureFromData(generateMarbleAlbedo(TEX_SIZE), TEX_SIZE),
      normalMap: createTextureFromData(generateNormalMap(TEX_SIZE, 0.15), TEX_SIZE),
      roughnessMap: createTextureFromData(generateRoughnessMap(TEX_SIZE, 0.25, 0.1), TEX_SIZE),
      metalness: 0.05,
      roughness: 0.25,
      normalScale: new THREE.Vector2(0.3, 0.3),
    })

    const metalMat = new THREE.MeshStandardMaterial({
      map: createTextureFromData(generateMetalAlbedo(TEX_SIZE), TEX_SIZE),
      normalMap: createTextureFromData(generateNormalMap(TEX_SIZE, 0.5), TEX_SIZE),
      roughnessMap: createTextureFromData(generateRoughnessMap(TEX_SIZE, 0.35, 0.1), TEX_SIZE),
      metalness: 0.95,
      roughness: 0.35,
      normalScale: new THREE.Vector2(0.8, 0.8),
    })

    const carbonMat = new THREE.MeshStandardMaterial({
      map: createTextureFromData(generateCarbonAlbedo(TEX_SIZE), TEX_SIZE),
      normalMap: createTextureFromData(generateNormalMap(TEX_SIZE, 0.4), TEX_SIZE),
      roughnessMap: createTextureFromData(generateRoughnessMap(TEX_SIZE, 0.45, 0.1), TEX_SIZE),
      metalness: 0.6,
      roughness: 0.45,
      normalScale: new THREE.Vector2(0.6, 0.6),
    })

    const fabricMat = new THREE.MeshStandardMaterial({
      map: createTextureFromData(generateFabricAlbedo(TEX_SIZE), TEX_SIZE),
      normalMap: createTextureFromData(generateNormalMap(TEX_SIZE, 0.6), TEX_SIZE),
      roughnessMap: createTextureFromData(generateRoughnessMap(TEX_SIZE, 0.9, 0.05), TEX_SIZE),
      metalness: 0.0,
      roughness: 0.9,
      normalScale: new THREE.Vector2(1.0, 1.0),
    })

    this.materialCache.set('wood', woodMat)
    this.materialCache.set('marble', marbleMat)
    this.materialCache.set('brushedMetal', metalMat)
    this.materialCache.set('carbonFiber', carbonMat)
    this.materialCache.set('redFabric', fabricMat)

    this.currentMaterial = woodMat.clone()
  }

  setMetricsCallback(callback: (metrics: Metrics) => void): void {
    this.metricsCallback = callback
  }

  createModel(modelType: ModelType): THREE.BufferGeometry {
    switch (modelType) {
      case 'vase':
        return this.createVaseGeometry()
      case 'teapot':
        return this.createTeapotGeometry()
      case 'torusKnot':
        return new THREE.TorusKnotGeometry(0.8, 0.28, 200, 32, 2, 3)
      default:
        return this.createVaseGeometry()
    }
  }

  private createVaseGeometry(): THREE.BufferGeometry {
    const curvePoints: THREE.Vector2[] = []
    const segments = 40
    for (let i = 0; i <= segments; i++) {
      const t = i / segments
      let radius: number
      if (t < 0.05) {
        radius = 0.08 + t * 0.4
      } else if (t < 0.3) {
        radius = 0.3 + Math.sin((t - 0.05) / 0.25 * Math.PI) * 0.5
      } else if (t < 0.7) {
        radius = 0.8 - ((t - 0.3) / 0.4) * 0.35
      } else if (t < 0.9) {
        radius = 0.45 + Math.sin((t - 0.7) / 0.2 * Math.PI) * 0.15
      } else {
        radius = 0.6 - ((t - 0.9) / 0.1) * 0.3
      }
      curvePoints.push(new THREE.Vector2(radius, t * 2.4 - 1.2))
    }
    const curve = new THREE.CatmullRomCurve3(
      curvePoints.map((p) => new THREE.Vector3(p.x, p.y, 0))
    )
    return new THREE.LatheGeometry(curvePoints, 64)
  }

  private createTeapotGeometry(): THREE.BufferGeometry {
    const merged = new THREE.BufferGeometry()
    const positions: number[] = []
    const normals: number[] = []
    const uvs: number[] = []
    const indices: number[] = []
    let indexOffset = 0

    const addGeometry = (geo: THREE.BufferGeometry) => {
      const pos = geo.attributes.position.array as Float32Array
      const nor = geo.attributes.normal.array as Float32Array
      const uv = geo.attributes.uv ? (geo.attributes.uv.array as Float32Array) : null
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
    body.translate(0, 0, 0)
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
    const spout = new THREE.TubeGeometry(spoutCurve, 20, 0.1, 12, false)
    addGeometry(spout)

    const handleCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.7, 0.15, 0),
      new THREE.Vector3(-1.1, 0.1, 0),
      new THREE.Vector3(-1.25, 0.4, 0),
      new THREE.Vector3(-1.15, 0.65, 0),
      new THREE.Vector3(-0.7, 0.6, 0),
    ])
    const handle = new THREE.TubeGeometry(handleCurve, 24, 0.09, 12, false)
    addGeometry(handle)

    const base = new THREE.CylinderGeometry(0.45, 0.55, 0.1, 48)
    base.translate(0, -0.72, 0)
    addGeometry(base)

    merged.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    merged.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3))
    merged.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
    merged.setIndex(indices)
    merged.computeVertexNormals()
    return merged
  }

  getMaterial(type: MaterialType): THREE.MeshStandardMaterial {
    if (this.currentMaterial) {
      this.currentMaterial.dispose()
    }
    const sourceMat = this.materialCache.get(type)!
    this.currentMaterial = sourceMat.clone()
    this.currentMaterial.needsUpdate = true
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

  updateLightAngle(angleDeg: number): void {
    if (!this.directionalLight) return
    const angleRad = (angleDeg * Math.PI) / 180
    const radius = 6
    this.directionalLight.position.set(
      Math.sin(angleRad) * radius,
      4,
      Math.cos(angleRad) * radius
    )
    this.directionalLight.target.position.set(0, 0, 0)
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

  computeMetrics(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera): Metrics {
    const rtWidth = 128
    const rtHeight = 128
    const renderTarget = new THREE.WebGLRenderTarget(rtWidth, rtHeight, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      type: THREE.UnsignedByteType,
    })

    renderer.setRenderTarget(renderTarget)
    renderer.render(scene, camera)

    const pixelBuffer = new Uint8Array(rtWidth * rtHeight * 4)
    renderer.readRenderTargetPixels(renderTarget, 0, 0, rtWidth, rtHeight, pixelBuffer)
    renderer.setRenderTarget(null)

    let totalBrightness = 0
    let totalReflect = 0
    let validPixels = 0

    for (let i = 0; i < pixelBuffer.length; i += 4) {
      const a = pixelBuffer[i + 3]
      if (a < 10) continue

      const r = pixelBuffer[i]
      const g = pixelBuffer[i + 1]
      const b = pixelBuffer[i + 2]

      const lum = 0.299 * r + 0.587 * g + 0.114 * b
      totalBrightness += lum

      const maxC = Math.max(r, g, b)
      const minC = Math.min(r, g, b)
      const range = maxC > 0 ? (maxC - minC) / maxC : 0
      totalReflect += range * lum

      validPixels++
    }

    renderTarget.dispose()

    if (validPixels === 0) {
      return { brightness: 0, glossiness: 0 }
    }

    const avgBrightness = Math.round(totalBrightness / validPixels)
    const avgReflect = totalReflect / validPixels
    const glossiness = Math.min(100, Math.round(avgReflect * 120))

    const metrics: Metrics = {
      brightness: Math.max(0, Math.min(255, avgBrightness)),
      glossiness: Math.max(0, glossiness),
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
