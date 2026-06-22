import * as THREE from 'three'

class PerlinNoise {
  private perm: Uint8Array

  constructor(seed: number) {
    const p = new Uint8Array(512)
    const source = new Uint8Array(256)
    for (let i = 0; i < 256; i++) source[i] = i

    let s = seed | 0
    for (let i = 255; i > 0; i--) {
      s = ((s * 16807) % 2147483647) | 0
      if (s < 0) s += 2147483647
      const j = s % (i + 1)
      const tmp = source[i]
      source[i] = source[j]
      source[j] = tmp
    }

    for (let i = 0; i < 256; i++) {
      p[i] = source[i]
      p[i + 256] = source[i]
    }

    this.perm = p
  }

  private fade(t: number): number {
    return t * t * t * (t * (t * 6 - 15) + 10)
  }

  private lerp(a: number, b: number, t: number): number {
    return a + t * (b - a)
  }

  private grad(hash: number, x: number, y: number): number {
    const h = hash & 7
    const u = h < 4 ? x : y
    const v = h < 4 ? y : x
    return ((h & 1) !== 0 ? -u : u) + ((h & 2) !== 0 ? -v : v)
  }

  noise2D(x: number, y: number): number {
    const X = Math.floor(x) & 255
    const Y = Math.floor(y) & 255

    const xf = x - Math.floor(x)
    const yf = y - Math.floor(y)

    const u = this.fade(xf)
    const v = this.fade(yf)

    const aa = this.perm[this.perm[X] + Y]
    const ab = this.perm[this.perm[X] + Y + 1]
    const ba = this.perm[this.perm[X + 1] + Y]
    const bb = this.perm[this.perm[X + 1] + Y + 1]

    return this.lerp(
      this.lerp(this.grad(aa, xf, yf), this.grad(ba, xf - 1, yf), u),
      this.lerp(this.grad(ab, xf, yf - 1), this.grad(bb, xf - 1, yf - 1), u),
      v
    )
  }

  fbm(x: number, y: number, octaves: number = 6, persistence: number = 0.5, lacunarity: number = 2.0): number {
    let value = 0
    let amplitude = 1
    let frequency = 1
    let maxAmplitude = 0

    for (let i = 0; i < octaves; i++) {
      value += this.noise2D(x * frequency, y * frequency) * amplitude
      maxAmplitude += amplitude
      amplitude *= persistence
      frequency *= lacunarity
    }

    return value / maxAmplitude
  }

  ridged(x: number, y: number, octaves: number = 4, persistence: number = 0.5, lacunarity: number = 2.2): number {
    let value = 0
    let amplitude = 1
    let frequency = 1
    let maxAmplitude = 0
    let weight = 1

    for (let i = 0; i < octaves; i++) {
      let signal = this.noise2D(x * frequency, y * frequency)
      signal = 1.0 - Math.abs(signal)
      signal *= signal
      signal *= weight
      weight = Math.min(1, Math.max(0, signal * 2))

      value += signal * amplitude
      maxAmplitude += amplitude
      amplitude *= persistence
      frequency *= lacunarity
    }

    return value / maxAmplitude
  }

  domainWarp(x: number, y: number, strength: number = 0.5): number {
    const qx = this.fbm(x + 0.0, y + 0.0, 4)
    const qy = this.fbm(x + 5.2, y + 1.3, 4)
    return this.fbm(x + strength * qx, y + strength * qy, 6)
  }
}

export interface TerrainData {
  mesh: THREE.Mesh
  geometry: THREE.PlaneGeometry
  heightMap: number[][]
  width: number
  depth: number
  segments: number
  heightScale: number
}

export interface TerrainParams {
  width: number
  depth: number
  segments: number
  noiseFrequency: number
  heightScale: number
  seed: number
}

export function generateTerrain(params: TerrainParams): TerrainData {
  const { width, depth, segments, noiseFrequency, heightScale, seed } = params

  const noise = new PerlinNoise(seed)
  const geometry = new THREE.PlaneGeometry(width, depth, segments - 1, segments - 1)
  geometry.rotateX(-Math.PI / 2)

  const positions = geometry.attributes.position
  const heightMap: number[][] = []
  const cellSize = width / (segments - 1)

  for (let z = 0; z < segments; z++) {
    heightMap[z] = []
    for (let x = 0; x < segments; x++) {
      const index = z * segments + x

      const nx = (x / segments) * noiseFrequency * 3
      const nz = (z / segments) * noiseFrequency * 3

      let h = noise.domainWarp(nx, nz, 0.6)
      let ridged = noise.ridged(nx * 0.8 + 100, nz * 0.8 + 100, 4, 0.45, 2.2)

      h = h * 0.65 + ridged * 0.35

      h = (h + 1) / 2

      const valley = noise.fbm(nx * 0.5, nz * 0.5, 3, 0.5, 2.0)
      if (valley < -0.1) {
        h *= 0.5 + 0.5 * ((valley + 1) / 0.9)
      }

      h *= heightScale

      positions.setY(index, h)
      heightMap[z][x] = h
    }
  }

  geometry.computeVertexNormals()

  const colors = new Float32Array(positions.count * 3)

  for (let i = 0; i < positions.count; i++) {
    const y = positions.getY(i)
    const heightRatio = y / heightScale

    let r: number, g: number, b: number

    if (heightRatio < 0.2) {
      r = 0.35
      g = 0.55
      b = 0.25
    } else if (heightRatio < 0.4) {
      const t = (heightRatio - 0.2) / 0.2
      r = 0.35 + t * (0.2 - 0.35)
      g = 0.55 + t * (0.7 - 0.55)
      b = 0.25 + t * (0.25 - 0.25)
    } else if (heightRatio < 0.65) {
      const t = (heightRatio - 0.4) / 0.25
      r = 0.2 + t * (0.5 - 0.2)
      g = 0.7 + t * (0.45 - 0.7)
      b = 0.25 + t * (0.3 - 0.25)
    } else if (heightRatio < 0.85) {
      const t = (heightRatio - 0.65) / 0.2
      r = 0.5 + t * (0.6 - 0.5)
      g = 0.45 + t * (0.5 - 0.45)
      b = 0.3 + t * (0.4 - 0.3)
    } else {
      const t = (heightRatio - 0.85) / 0.15
      r = 0.6 + t * (0.95 - 0.6)
      g = 0.5 + t * (0.95 - 0.5)
      b = 0.4 + t * (1.0 - 0.4)
    }

    const slope = computeVertexSlope(i, positions as THREE.BufferAttribute, segments, cellSize)
    if (slope > 0.5) {
      const slopeFactor = Math.min(1, (slope - 0.5) / 1.0)
      r = r * (1 - slopeFactor) + 0.5 * slopeFactor
      g = g * (1 - slopeFactor) + 0.45 * slopeFactor
      b = b * (1 - slopeFactor) + 0.35 * slopeFactor
    }

    colors[i * 3] = r
    colors[i * 3 + 1] = g
    colors[i * 3 + 2] = b
  }

  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))

  const material = new THREE.MeshStandardMaterial({
    vertexColors: true,
    flatShading: false,
    roughness: 0.85,
    metalness: 0.05
  })

  const mesh = new THREE.Mesh(geometry, material)
  mesh.receiveShadow = true
  mesh.castShadow = true

  return { mesh, geometry, heightMap, width, depth, segments, heightScale }
}

function computeVertexSlope(
  index: number,
  positions: THREE.BufferAttribute,
  segments: number,
  cellSize: number
): number {
  const x = index % segments
  const z = Math.floor(index / segments)

  if (x <= 0 || x >= segments - 1 || z <= 0 || z >= segments - 1) {
    return 0
  }

  const hLeft = positions.getY(z * segments + (x - 1))
  const hRight = positions.getY(z * segments + (x + 1))
  const hUp = positions.getY((z - 1) * segments + x)
  const hDown = positions.getY((z + 1) * segments + x)

  const dx = (hRight - hLeft) / (2 * cellSize)
  const dz = (hDown - hUp) / (2 * cellSize)

  return Math.sqrt(dx * dx + dz * dz)
}

export function getHeightAt(x: number, z: number, terrainData: TerrainData): number {
  const { width, depth, segments, heightMap } = terrainData

  const halfWidth = width / 2
  const halfDepth = depth / 2

  const gridX = ((x + halfWidth) / width) * (segments - 1)
  const gridZ = ((z + halfDepth) / depth) * (segments - 1)

  const x0 = Math.max(0, Math.floor(gridX))
  const z0 = Math.max(0, Math.floor(gridZ))
  const x1 = Math.min(x0 + 1, segments - 1)
  const z1 = Math.min(z0 + 1, segments - 1)

  const fx = gridX - x0
  const fz = gridZ - z0

  const cfx = Math.max(0, Math.min(1, fx))
  const cfz = Math.max(0, Math.min(1, fz))

  const h00 = heightMap[z0]?.[x0] ?? 0
  const h10 = heightMap[z0]?.[x1] ?? 0
  const h01 = heightMap[z1]?.[x0] ?? 0
  const h11 = heightMap[z1]?.[x1] ?? 0

  const h0 = h00 * (1 - cfx) + h10 * cfx
  const h1 = h01 * (1 - cfx) + h11 * cfx

  return h0 * (1 - cfz) + h1 * cfz
}

export function getSlopeAt(x: number, z: number, terrainData: TerrainData): number {
  const { width, depth, segments, heightMap } = terrainData

  const halfWidth = width / 2
  const halfDepth = depth / 2

  const gridX = ((x + halfWidth) / width) * (segments - 1)
  const gridZ = ((z + halfDepth) / depth) * (segments - 1)

  const xi = Math.floor(gridX)
  const zi = Math.floor(gridZ)

  if (xi <= 0 || xi >= segments - 2 || zi <= 0 || zi >= segments - 2) {
    return 0
  }

  const cellSize = width / (segments - 1)

  const hL = heightMap[zi][xi - 1]
  const hR = heightMap[zi][xi + 1]
  const hU = heightMap[zi - 1][xi]
  const hD = heightMap[zi + 1][xi]

  const dhdx = (hR - hL) / (2 * cellSize)
  const dhdz = (hD - hU) / (2 * cellSize)

  return Math.sqrt(dhdx * dhdx + dhdz * dhdz)
}
