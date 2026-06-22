import * as THREE from 'three'

class PerlinNoise {
  private permutation: number[]

  constructor(seed: number = Math.random() * 10000) {
    this.permutation = this.generatePermutation(seed)
  }

  private generatePermutation(seed: number): number[] {
    const p: number[] = []
    for (let i = 0; i < 256; i++) {
      p[i] = i
    }

    let n: number
    let q: number
    for (let i = 255; i > 0; i--) {
      seed = (seed * 16807) % 2147483647
      n = seed % (i + 1)
      q = p[i]
      p[i] = p[n]
      p[n] = q
    }

    for (let i = 0; i < 256; i++) {
      p[256 + i] = p[i]
    }

    return p
  }

  private fade(t: number): number {
    return t * t * t * (t * (t * 6 - 15) + 10)
  }

  private lerp(a: number, b: number, t: number): number {
    return a + t * (b - a)
  }

  private grad(hash: number, x: number, y: number): number {
    const h = hash & 3
    const u = h < 2 ? x : y
    const v = h < 2 ? y : x
    return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v)
  }

  noise2D(x: number, y: number): number {
    const X = Math.floor(x) & 255
    const Y = Math.floor(y) & 255

    x -= Math.floor(x)
    y -= Math.floor(y)

    const u = this.fade(x)
    const v = this.fade(y)

    const A = this.permutation[X] + Y
    const B = this.permutation[X + 1] + Y

    return this.lerp(
      this.lerp(this.grad(this.permutation[A], x, y), this.grad(this.permutation[B], x - 1, y), u),
      this.lerp(this.grad(this.permutation[A + 1], x, y - 1), this.grad(this.permutation[B + 1], x - 1, y - 1), u),
      v
    )
  }

  fbm(x: number, y: number, octaves: number = 4, persistence: number = 0.5, lacunarity: number = 2.0): number {
    let value = 0
    let amplitude = 1
    let frequency = 1
    let maxValue = 0

    for (let i = 0; i < octaves; i++) {
      value += this.noise2D(x * frequency, y * frequency) * amplitude
      maxValue += amplitude
      amplitude *= persistence
      frequency *= lacunarity
    }

    return value / maxValue
  }
}

export interface TerrainData {
  mesh: THREE.Mesh
  geometry: THREE.PlaneGeometry
  heightMap: number[][]
  width: number
  depth: number
  segments: number
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

  for (let z = 0; z < segments; z++) {
    heightMap[z] = []
    for (let x = 0; x < segments; x++) {
      const index = z * segments + x

      const nx = x / segments * noiseFrequency
      const nz = z / segments * noiseFrequency

      let height = noise.fbm(nx, nz, 4, 0.5, 2.0)
      height = (height + 1) / 2
      height *= heightScale

      positions.setY(index, height)
      heightMap[z][x] = height
    }
  }

  geometry.computeVertexNormals()

  const colors = new Float32Array(positions.count * 3)

  for (let i = 0; i < positions.count; i++) {
    const y = positions.getY(i)
    const heightRatio = y / heightScale

    let r: number, g: number, b: number

    if (heightRatio < 0.3) {
      r = 0.4
      g = 0.6
      b = 0.3
    } else if (heightRatio < 0.6) {
      r = 0.3
      g = 0.7
      b = 0.3
    } else if (heightRatio < 0.8) {
      r = 0.5
      g = 0.45
      b = 0.35
    } else {
      r = 0.9
      g = 0.9
      b = 0.95
    }

    colors[i * 3] = r
    colors[i * 3 + 1] = g
    colors[i * 3 + 2] = b
  }

  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))

  const material = new THREE.MeshStandardMaterial({
    vertexColors: true,
    flatShading: false,
    roughness: 0.8,
    metalness: 0.1
  })

  const mesh = new THREE.Mesh(geometry, material)
  mesh.receiveShadow = true
  mesh.castShadow = true

  return { mesh, geometry, heightMap, width, depth, segments }
}

export function getHeightAt(x: number, z: number, terrainData: TerrainData): number {
  const { width, depth, segments, heightMap } = terrainData

  const halfWidth = width / 2
  const halfDepth = depth / 2

  const gridX = ((x + halfWidth) / width) * (segments - 1)
  const gridZ = ((z + halfDepth) / depth) * (segments - 1)

  const x0 = Math.floor(gridX)
  const z0 = Math.floor(gridZ)
  const x1 = Math.min(x0 + 1, segments - 1)
  const z1 = Math.min(z0 + 1, segments - 1)

  const fx = gridX - x0
  const fz = gridZ - z0

  const h00 = heightMap[z0]?.[x0] ?? 0
  const h10 = heightMap[z0]?.[x1] ?? 0
  const h01 = heightMap[z1]?.[x0] ?? 0
  const h11 = heightMap[z1]?.[x1] ?? 0

  const h0 = h00 * (1 - fx) + h10 * fx
  const h1 = h01 * (1 - fx) + h11 * fx

  return h0 * (1 - fz) + h1 * fz
}

export function getSlopeAt(x: number, z: number, terrainData: TerrainData): number {
  const { width, depth, segments, heightMap } = terrainData

  const halfWidth = width / 2
  const halfDepth = depth / 2

  const gridX = ((x + halfWidth) / width) * (segments - 1)
  const gridZ = ((z + halfDepth) / depth) * (segments - 1)

  const xi = Math.floor(gridX)
  const zi = Math.floor(gridZ)

  if (xi <= 0 || xi >= segments - 1 || zi <= 0 || zi >= segments - 1) {
    return 0
  }

  const dx = (heightMap[zi][xi + 1] - heightMap[zi][xi - 1]) / 2
  const dz = (heightMap[zi + 1][xi] - heightMap[zi - 1][xi]) / 2

  const cellSize = width / segments
  const slope = Math.sqrt(dx * dx + dz * dz) / cellSize

  return slope
}
