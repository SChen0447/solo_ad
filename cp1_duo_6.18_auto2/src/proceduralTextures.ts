import * as THREE from 'three'

export interface PBRTextureSet {
  albedo: THREE.DataTexture | null
  roughness: THREE.DataTexture | null
  normal: THREE.DataTexture | null
}

const TEX_SIZE = 512

const mulberry32 = (seed: number): (() => number) => {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const fbm = (
  x: number,
  y: number,
  octaves: number,
  rand: (x: number, y: number) => number
): number => {
  let value = 0
  let amplitude = 0.5
  let frequency = 1
  for (let i = 0; i < octaves; i++) {
    value += amplitude * rand(x * frequency, y * frequency)
    amplitude *= 0.5
    frequency *= 2
  }
  return value
}

const smoothNoise = (rand: () => number): ((x: number, y: number) => number) => {
  const cache = new Map<string, number>()
  const get = (ix: number, iy: number): number => {
    const key = `${ix},${iy}`
    if (!cache.has(key)) cache.set(key, rand())
    return cache.get(key)!
  }
  return (x: number, y: number) => {
    const ix = Math.floor(x)
    const iy = Math.floor(y)
    const fx = x - ix
    const fy = y - iy
    const u = fx * fx * (3 - 2 * fx)
    const v = fy * fy * (3 - 2 * fy)
    const a = get(ix, iy)
    const b = get(ix + 1, iy)
    const c = get(ix, iy + 1)
    const d = get(ix + 1, iy + 1)
    return (
      a * (1 - u) * (1 - v) +
      b * u * (1 - v) +
      c * (1 - u) * v +
      d * u * v
    )
  }
}

const generateWoodTextures = (): PBRTextureSet => {
  const size = TEX_SIZE
  const albedoData = new Uint8Array(size * size * 4)
  const normalData = new Uint8Array(size * size * 4)
  const roughData = new Uint8Array(size * size * 4)
  const rand = mulberry32(42)
  const noise = smoothNoise(rand)

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4
      const nx = x / size
      const ny = y / size

      const ring = Math.sin(ny * 12 + fbm(nx * 2, ny * 2, 3, noise) * 1.2) * 0.5 + 0.5
      const grain = fbm(nx * 30, ny * 2, 2, noise) * 0.15
      const base = 0.55 + ring * 0.25 + grain

      albedoData[idx] = Math.min(255, Math.floor(base * 210))
      albedoData[idx + 1] = Math.min(255, Math.floor(base * 140))
      albedoData[idx + 2] = Math.min(255, Math.floor(base * 80))
      albedoData[idx + 3] = 255

      const dx = (noise((x + 1) / 8, y / 8) - noise(x / 8, y / 8)) * 0.5
      const dy = (noise(x / 8, (y + 1) / 8) - noise(x / 8, y / 8)) * 0.5
      normalData[idx] = Math.floor(Math.min(1, Math.max(0, 0.5 + dx)) * 255)
      normalData[idx + 1] = Math.floor(Math.min(1, Math.max(0, 0.5 + dy)) * 255)
      normalData[idx + 2] = Math.floor(0.75 * 255)
      normalData[idx + 3] = 255

      const rough = Math.min(1, Math.max(0, 0.6 + ring * 0.1 + (rand() - 0.5) * 0.1))
      const rb = Math.floor(rough * 255)
      roughData[idx] = rb
      roughData[idx + 1] = rb
      roughData[idx + 2] = rb
      roughData[idx + 3] = 255
    }
  }

  return {
    albedo: createDataTexture(albedoData, size, true),
    normal: createDataTexture(normalData, size, false),
    roughness: createDataTexture(roughData, size, false),
  }
}

const generateMarbleTextures = (): PBRTextureSet => {
  const size = TEX_SIZE
  const albedoData = new Uint8Array(size * size * 4)
  const normalData = new Uint8Array(size * size * 4)
  const roughData = new Uint8Array(size * size * 4)
  const rand = mulberry32(123)
  const noise = smoothNoise(rand)

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4
      const nx = x / size
      const ny = y / size

      const n1 = fbm(nx * 3, ny * 3, 4, noise)
      const n2 = fbm((nx + 5) * 4, (ny + 1) * 4, 3, noise)
      const veins = Math.abs(Math.sin((n1 * 4 + n2 * 3) * Math.PI))
      const base = 0.95 - veins * 0.45

      const veinTint = veins > 0.5 ? (veins - 0.5) * 0.4 : 0
      albedoData[idx] = Math.min(255, Math.floor(base * 245 - veinTint * 60))
      albedoData[idx + 1] = Math.min(255, Math.floor(base * 240 - veinTint * 80))
      albedoData[idx + 2] = Math.min(255, Math.floor(base * 230 - veinTint * 100))
      albedoData[idx + 3] = 255

      const dx = (noise((x + 2) / 16, y / 16) - noise(x / 16, y / 16)) * 0.3
      const dy = (noise(x / 16, (y + 2) / 16) - noise(x / 16, y / 16)) * 0.3
      normalData[idx] = Math.floor(Math.min(1, Math.max(0, 0.5 + dx)) * 255)
      normalData[idx + 1] = Math.floor(Math.min(1, Math.max(0, 0.5 + dy)) * 255)
      normalData[idx + 2] = Math.floor(0.85 * 255)
      normalData[idx + 3] = 255

      const rough = Math.min(1, Math.max(0, 0.2 + veins * 0.15 + (rand() - 0.5) * 0.05))
      const rb = Math.floor(rough * 255)
      roughData[idx] = rb
      roughData[idx + 1] = rb
      roughData[idx + 2] = rb
      roughData[idx + 3] = 255
    }
  }

  return {
    albedo: createDataTexture(albedoData, size, true),
    normal: createDataTexture(normalData, size, false),
    roughness: createDataTexture(roughData, size, false),
  }
}

const generateBrushedMetalTextures = (): PBRTextureSet => {
  const size = TEX_SIZE
  const albedoData = new Uint8Array(size * size * 4)
  const normalData = new Uint8Array(size * size * 4)
  const roughData = new Uint8Array(size * size * 4)
  const rand = mulberry32(777)
  const noise = smoothNoise(rand)

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4
      const nx = x / size

      const brush = Math.sin(nx * 200 + noise(x / 4, y / 20) * 20) * 0.08
      const micro = (rand() - 0.5) * 0.06
      const base = 0.78 + brush + micro

      albedoData[idx] = Math.min(255, Math.max(0, Math.floor(base * 220)))
      albedoData[idx + 1] = Math.min(255, Math.max(0, Math.floor(base * 215)))
      albedoData[idx + 2] = Math.min(255, Math.max(0, Math.floor(base * 210)))
      albedoData[idx + 3] = 255

      const dx = (noise((x + 1) / 2, y / 20) - noise(x / 2, y / 20)) * 0.7
      const dy = (noise(x / 2, (y + 1) / 20) - noise(x / 2, y / 20)) * 0.2
      normalData[idx] = Math.floor(Math.min(1, Math.max(0, 0.5 + dx)) * 255)
      normalData[idx + 1] = Math.floor(Math.min(1, Math.max(0, 0.5 + dy)) * 255)
      normalData[idx + 2] = Math.floor(0.7 * 255)
      normalData[idx + 3] = 255

      const rough = Math.min(1, Math.max(0, 0.35 + Math.abs(brush) * 0.3 + (rand() - 0.5) * 0.05))
      const rb = Math.floor(rough * 255)
      roughData[idx] = rb
      roughData[idx + 1] = rb
      roughData[idx + 2] = rb
      roughData[idx + 3] = 255
    }
  }

  return {
    albedo: createDataTexture(albedoData, size, true),
    normal: createDataTexture(normalData, size, false),
    roughness: createDataTexture(roughData, size, false),
  }
}

const generateCarbonFiberTextures = (): PBRTextureSet => {
  const size = TEX_SIZE
  const albedoData = new Uint8Array(size * size * 4)
  const normalData = new Uint8Array(size * size * 4)
  const roughData = new Uint8Array(size * size * 4)
  const rand = mulberry32(999)
  const tileSize = 16

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4
      const tx = Math.floor(x / tileSize)
      const ty = Math.floor(y / tileSize)
      const lx = x % tileSize
      const ly = y % tileSize
      const isDiag = (tx + ty) % 2 === 0

      let fiberVal: number
      if (isDiag) {
        const d = lx - ly + (rand() - 0.5) * 1.5
        fiberVal = Math.exp(-(d * d) / 8) * 0.15
      } else {
        const d = lx + ly - tileSize + (rand() - 0.5) * 1.5
        fiberVal = Math.exp(-(d * d) / 8) * 0.15
      }

      const speckle = (rand() - 0.5) * 0.04
      const base = 0.18 + fiberVal + speckle

      albedoData[idx] = Math.min(255, Math.max(0, Math.floor(base * 260)))
      albedoData[idx + 1] = Math.min(255, Math.max(0, Math.floor(base * 250)))
      albedoData[idx + 2] = Math.min(255, Math.max(0, Math.floor(base * 270)))
      albedoData[idx + 3] = 255

      const dx = isDiag ? -0.3 : 0.3
      const dy = isDiag ? 0.3 : 0.3
      normalData[idx] = Math.floor(Math.min(1, Math.max(0, 0.5 + dx + (rand() - 0.5) * 0.1)) * 255)
      normalData[idx + 1] = Math.floor(Math.min(1, Math.max(0, 0.5 + dy + (rand() - 0.5) * 0.1)) * 255)
      normalData[idx + 2] = Math.floor(0.75 * 255)
      normalData[idx + 3] = 255

      const rough = Math.min(1, Math.max(0, 0.42 + (rand() - 0.5) * 0.08))
      const rb = Math.floor(rough * 255)
      roughData[idx] = rb
      roughData[idx + 1] = rb
      roughData[idx + 2] = rb
      roughData[idx + 3] = 255
    }
  }

  return {
    albedo: createDataTexture(albedoData, size, true),
    normal: createDataTexture(normalData, size, false),
    roughness: createDataTexture(roughData, size, false),
  }
}

const generateRedFabricTextures = (): PBRTextureSet => {
  const size = TEX_SIZE
  const albedoData = new Uint8Array(size * size * 4)
  const normalData = new Uint8Array(size * size * 4)
  const roughData = new Uint8Array(size * size * 4)
  const rand = mulberry32(2024)
  const noise = smoothNoise(rand)

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4

      const threadX = Math.sin(x * 1.5) * 0.06
      const threadY = Math.sin(y * 1.5) * 0.06
      const weave = (noise(x / 6, y / 6) - 0.5) * 0.1
      const micro = (rand() - 0.5) * 0.05
      const base = 0.72 + threadX + threadY + weave + micro

      albedoData[idx] = Math.min(255, Math.max(0, Math.floor(base * 255)))
      albedoData[idx + 1] = Math.min(255, Math.max(0, Math.floor(base * 70)))
      albedoData[idx + 2] = Math.min(255, Math.max(0, Math.floor(base * 75)))
      albedoData[idx + 3] = 255

      const dx = (noise((x + 1) / 3, y / 3) - noise(x / 3, y / 3)) * 0.6
      const dy = (noise(x / 3, (y + 1) / 3) - noise(x / 3, y / 3)) * 0.6
      normalData[idx] = Math.floor(Math.min(1, Math.max(0, 0.5 + dx)) * 255)
      normalData[idx + 1] = Math.floor(Math.min(1, Math.max(0, 0.5 + dy)) * 255)
      normalData[idx + 2] = Math.floor(0.65 * 255)
      normalData[idx + 3] = 255

      const rough = Math.min(1, Math.max(0, 0.88 + (rand() - 0.5) * 0.06))
      const rb = Math.floor(rough * 255)
      roughData[idx] = rb
      roughData[idx + 1] = rb
      roughData[idx + 2] = rb
      roughData[idx + 3] = 255
    }
  }

  return {
    albedo: createDataTexture(albedoData, size, true),
    normal: createDataTexture(normalData, size, false),
    roughness: createDataTexture(roughData, size, false),
  }
}

const createDataTexture = (
  data: Uint8Array,
  size: number,
  srgb: boolean
): THREE.DataTexture => {
  const texture = new THREE.DataTexture(
    data as unknown as BufferSource,
    size,
    size,
    THREE.RGBAFormat
  )
  if (srgb) texture.colorSpace = THREE.SRGBColorSpace
  texture.needsUpdate = true
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.anisotropy = 8
  texture.magFilter = THREE.LinearFilter
  texture.minFilter = THREE.LinearMipmapLinearFilter
  texture.generateMipmaps = true
  return texture
}

export type ProceduralMaterialType =
  | 'wood'
  | 'marble'
  | 'brushedMetal'
  | 'carbonFiber'
  | 'redFabric'

const textureCache: Map<ProceduralMaterialType, PBRTextureSet> = new Map()

export const generateProceduralPBR = (type: ProceduralMaterialType): PBRTextureSet => {
  if (textureCache.has(type)) return textureCache.get(type)!
  let set: PBRTextureSet
  switch (type) {
    case 'wood':
      set = generateWoodTextures()
      break
    case 'marble':
      set = generateMarbleTextures()
      break
    case 'brushedMetal':
      set = generateBrushedMetalTextures()
      break
    case 'carbonFiber':
      set = generateCarbonFiberTextures()
      break
    case 'redFabric':
      set = generateRedFabricTextures()
      break
  }
  textureCache.set(type, set)
  return set
}

export const disposeProceduralTextures = (): void => {
  textureCache.forEach((set) => {
    set.albedo?.dispose()
    set.normal?.dispose()
    set.roughness?.dispose()
  })
  textureCache.clear()
}
