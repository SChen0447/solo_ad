import * as THREE from 'three'

export interface StarData {
  id: number
  position: THREE.Vector3
  basePosition: THREE.Vector3
  size: number
  baseColor: THREE.Color
  temperature: number
  brightness: number
  spectralType: string
  name: string
  distance: number
  twinkleOffset: number
  floatOffset: THREE.Vector3
}

const SPECTRAL_TYPES = ['O', 'B', 'A', 'F', 'G', 'K', 'M']
const SPECTRAL_COLORS: Record<string, [number, number, number]> = {
  O: [0.6, 0.8, 1.0],
  B: [0.7, 0.85, 1.0],
  A: [0.9, 0.95, 1.0],
  F: [1.0, 0.98, 0.95],
  G: [1.0, 0.95, 0.85],
  K: [1.0, 0.85, 0.65],
  M: [1.0, 0.6, 0.4]
}

const STAR_PREFIXES = ['Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon', 'Zeta', 'Eta', 'Theta', 'Nova', 'Proxima', 'HD', 'BD', 'Gliese', 'Kepler', 'TRAPPIST', 'Proxima', 'Sirius', 'Vega', 'Altair', 'Rigel', 'Betelgeuse', 'Antares', 'Arcturus', 'Polaris', 'Deneb', 'Altair', 'Fomalhaut', 'Aldebaran', 'Castor', 'Pollux']
const STAR_SUFFIXES = ['Centauri', 'Cygni', 'Eridani', 'Tauri', 'Orionis', 'Leonis', 'Draconis', 'Ursae', 'Lyrae', 'Aquarii', 'Piscium', 'Arietis', 'Tauri', 'Geminorum', 'Cancri', 'Leonis', 'Virginis', 'Librae', 'Scorpii', 'Sagittarii', 'Capricorni', 'Aquarii', 'Piscium', 'Majoris', 'Minoris', 'Borealis', 'Australis', 'Primus', 'Secundus', 'Tertius']

function generateStarName(): string {
  const prefix = STAR_PREFIXES[Math.floor(Math.random() * STAR_PREFIXES.length)]
  const suffix = STAR_SUFFIXES[Math.floor(Math.random() * STAR_SUFFIXES.length)]
  const number = Math.random() > 0.6 ? ` ${Math.floor(Math.random() * 999)}` : ''
  return `${prefix} ${suffix}${number}`
}

function temperatureToColor(temperature: number): THREE.Color {
  const t = Math.max(3000, Math.min(40000, temperature))
  const normalized = (t - 3000) / (40000 - 3000)
  
  if (normalized < 0.14) return new THREE.Color(1.0, 0.5, 0.3)
  if (normalized < 0.28) return new THREE.Color(1.0, 0.7, 0.45)
  if (normalized < 0.42) return new THREE.Color(1.0, 0.85, 0.65)
  if (normalized < 0.56) return new THREE.Color(1.0, 0.95, 0.85)
  if (normalized < 0.70) return new THREE.Color(0.95, 0.98, 1.0)
  if (normalized < 0.84) return new THREE.Color(0.75, 0.88, 1.0)
  return new THREE.Color(0.55, 0.75, 1.0)
}

export class SpatialGrid {
  cellSize: number
  private grid: Map<string, StarData[]> = new Map()

  constructor(cellSize: number) {
    this.cellSize = cellSize
  }

  private getKey(x: number, y: number, z: number): string {
    const gx = Math.floor(x / this.cellSize)
    const gy = Math.floor(y / this.cellSize)
    const gz = Math.floor(z / this.cellSize)
    return `${gx},${gy},${gz}`
  }

  rebuild(stars: StarData[]): void {
    this.grid.clear()
    for (const star of stars) {
      const key = this.getKey(star.position.x, star.position.y, star.position.z)
      let cell = this.grid.get(key)
      if (!cell) {
        cell = []
        this.grid.set(key, cell)
      }
      cell.push(star)
    }
  }

  queryNearby(position: THREE.Vector3, radius: number): StarData[] {
    const results: StarData[] = []
    const minX = Math.floor((position.x - radius) / this.cellSize)
    const maxX = Math.floor((position.x + radius) / this.cellSize)
    const minY = Math.floor((position.y - radius) / this.cellSize)
    const maxY = Math.floor((position.y + radius) / this.cellSize)
    const minZ = Math.floor((position.z - radius) / this.cellSize)
    const maxZ = Math.floor((position.z + radius) / this.cellSize)
    const radiusSq = radius * radius

    for (let gx = minX; gx <= maxX; gx++) {
      for (let gy = minY; gy <= maxY; gy++) {
        for (let gz = minZ; gz <= maxZ; gz++) {
          const key = `${gx},${gy},${gz}`
          const cell = this.grid.get(key)
          if (cell) {
            for (const star of cell) {
              const dx = star.position.x - position.x
              const dy = star.position.y - position.y
              const dz = star.position.z - position.z
              if (dx * dx + dy * dy + dz * dz <= radiusSq) {
                results.push(star)
              }
            }
          }
        }
      }
    }
    return results
  }
}

export class ParticleSystem {
  stars: StarData[] = []
  points: THREE.Points
  geometry: THREE.BufferGeometry
  material: THREE.PointsMaterial
  spatialGrid: SpatialGrid
  bounds: number
  colorMode: 'temperature' | 'random' = 'temperature'
  
  private positions: Float32Array
  private colors: Float32Array
  private sizes: Float32Array
  private maxCount: number
  private backgroundStars: THREE.Points

  constructor(count: number, bounds: number) {
    this.bounds = bounds
    this.maxCount = Math.max(count, 3000)
    this.spatialGrid = new SpatialGrid(5)

    this.positions = new Float32Array(this.maxCount * 3)
    this.colors = new Float32Array(this.maxCount * 3)
    this.sizes = new Float32Array(this.maxCount)

    this.geometry = new THREE.BufferGeometry()
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3))
    this.geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3))
    this.geometry.setAttribute('size', new THREE.BufferAttribute(this.sizes, 1))

    const canvas = document.createElement('canvas')
    canvas.width = 64
    canvas.height = 64
    const ctx = canvas.getContext('2d')!
    const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32)
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)')
    gradient.addColorStop(0.2, 'rgba(255, 255, 255, 0.9)')
    gradient.addColorStop(0.4, 'rgba(255, 255, 255, 0.5)')
    gradient.addColorStop(0.65, 'rgba(255, 255, 255, 0.2)')
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, 64, 64)
    const starTexture = new THREE.CanvasTexture(canvas)

    this.material = new THREE.PointsMaterial({
      size: 0.5,
      sizeAttenuation: true,
      vertexColors: true,
      transparent: true,
      opacity: 0.95,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      map: starTexture
    })

    this.points = new THREE.Points(this.geometry, this.material)
    this.points.frustumCulled = false

    this.generateStars(count)
    this.backgroundStars = this.createBackgroundStars()
  }

  private createBackgroundStars(): THREE.Points {
    const bgCount = 500
    const bgPositions = new Float32Array(bgCount * 3)
    const bgColors = new Float32Array(bgCount * 3)
    
    for (let i = 0; i < bgCount; i++) {
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      const r = this.bounds * 1.5 + Math.random() * 20
      
      bgPositions[i * 3] = r * Math.sin(phi) * Math.cos(theta)
      bgPositions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta)
      bgPositions[i * 3 + 2] = r * Math.cos(phi)
      
      const brightness = 0.3 + Math.random() * 0.4
      bgColors[i * 3] = brightness
      bgColors[i * 3 + 1] = brightness
      bgColors[i * 3 + 2] = brightness * (0.9 + Math.random() * 0.2)
    }
    
    const bgGeometry = new THREE.BufferGeometry()
    bgGeometry.setAttribute('position', new THREE.BufferAttribute(bgPositions, 3))
    bgGeometry.setAttribute('color', new THREE.BufferAttribute(bgColors, 3))
    
    const bgMaterial = new THREE.PointsMaterial({
      size: 0.15,
      sizeAttenuation: false,
      vertexColors: true,
      transparent: true,
      opacity: 0.7,
      depthWrite: false
    })
    
    return new THREE.Points(bgGeometry, bgMaterial)
  }

  getBackgroundStars(): THREE.Points {
    return this.backgroundStars
  }

  private generateStars(count: number): void {
    this.stars = []
    
    for (let i = 0; i < count; i++) {
      const u = Math.random()
      const v = Math.random()
      const theta = 2 * Math.PI * u
      const phi = Math.acos(2 * v - 1)
      const r = Math.pow(Math.random(), 0.6) * this.bounds * 0.85
      
      const x = r * Math.sin(phi) * Math.cos(theta)
      const y = r * Math.sin(phi) * Math.sin(theta)
      const z = r * Math.cos(phi)

      const spectralType = SPECTRAL_TYPES[Math.floor(Math.pow(Math.random(), 1.5) * SPECTRAL_TYPES.length)]
      const baseTemp: Record<string, number> = { O: 35000, B: 25000, A: 9500, F: 7200, G: 5800, K: 4400, M: 3200 }
      const temperature = baseTemp[spectralType] + (Math.random() - 0.5) * 3000
      
      const sizeMultiplier: Record<string, number> = { O: 2.0, B: 1.6, A: 1.3, F: 1.1, G: 1.0, K: 0.85, M: 0.7 }
      const baseSize = sizeMultiplier[spectralType] * (0.3 + Math.random() * 0.4)

      const star: StarData = {
        id: i,
        position: new THREE.Vector3(x, y, z),
        basePosition: new THREE.Vector3(x, y, z),
        size: baseSize,
        baseColor: this.colorMode === 'temperature' 
          ? temperatureToColor(temperature)
          : new THREE.Color().setHSL(Math.random(), 0.7, 0.6 + Math.random() * 0.3),
        temperature: Math.round(temperature),
        brightness: 0.7 + Math.random() * 0.5,
        spectralType,
        name: generateStarName(),
        distance: Math.round(r * 12.5),
        twinkleOffset: Math.random() * Math.PI * 2,
        floatOffset: new THREE.Vector3(
          Math.random() * Math.PI * 2,
          Math.random() * Math.PI * 2,
          Math.random() * Math.PI * 2
        )
      }

      this.stars.push(star)
      this.updateStarBuffers(i, star, 0)
    }

    this.geometry.setDrawRange(0, count)
    this.geometry.attributes.position.needsUpdate = true
    this.geometry.attributes.color.needsUpdate = true
    this.geometry.attributes.size.needsUpdate = true
    
    this.spatialGrid.rebuild(this.stars)
  }

  private updateStarBuffers(index: number, star: StarData, time: number, selected: boolean = false): void {
    const twinkle = 0.8 + Math.sin(time * 2 + star.twinkleOffset) * 0.2
    
    this.positions[index * 3] = star.position.x
    this.positions[index * 3 + 1] = star.position.y
    this.positions[index * 3 + 2] = star.position.z

    const color = star.baseColor.clone()
    if (selected) {
      const pulse = 1.5 + Math.sin(time * 4) * 0.5
      color.multiplyScalar(pulse)
      this.sizes[index] = star.size * (1.8 + Math.sin(time * 3) * 0.3)
    } else {
      color.multiplyScalar(star.brightness * twinkle)
      this.sizes[index] = star.size
    }

    this.colors[index * 3] = Math.min(color.r, 1.0)
    this.colors[index * 3 + 1] = Math.min(color.g, 1.0)
    this.colors[index * 3 + 2] = Math.min(color.b, 1.0)
  }

  update(deltaTime: number, time: number, selectedId: number | null): void {
    const floatAmplitude = 0.15
    const floatSpeed = 0.3

    for (let i = 0; i < this.stars.length; i++) {
      const star = this.stars[i]
      
      star.position.x = star.basePosition.x + Math.sin(time * floatSpeed + star.floatOffset.x) * floatAmplitude
      star.position.y = star.basePosition.y + Math.sin(time * floatSpeed + star.floatOffset.y) * floatAmplitude
      star.position.z = star.basePosition.z + Math.sin(time * floatSpeed + star.floatOffset.z) * floatAmplitude

      this.updateStarBuffers(i, star, time, selectedId === star.id)
    }

    this.geometry.attributes.position.needsUpdate = true
    this.geometry.attributes.color.needsUpdate = true
    this.geometry.attributes.size.needsUpdate = true

    if (Math.floor(time * 10) % 3 === 0) {
      this.spatialGrid.rebuild(this.stars)
    }
  }

  queryNearby(position: THREE.Vector3, radius: number): StarData[] {
    return this.spatialGrid.queryNearby(position, radius)
  }

  getStarById(id: number): StarData | undefined {
    return this.stars.find(s => s.id === id)
  }

  resize(count: number): void {
    if (count > this.maxCount) {
      this.maxCount = Math.max(count, this.maxCount * 2)
      this.positions = new Float32Array(this.maxCount * 3)
      this.colors = new Float32Array(this.maxCount * 3)
      this.sizes = new Float32Array(this.maxCount)
      this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3))
      this.geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3))
      this.geometry.setAttribute('size', new THREE.BufferAttribute(this.sizes, 1))
    }
    
    this.generateStars(count)
  }

  setColorMode(mode: 'temperature' | 'random'): void {
    if (this.colorMode === mode) return
    this.colorMode = mode
    
    for (const star of this.stars) {
      star.baseColor = mode === 'temperature'
        ? temperatureToColor(star.temperature)
        : new THREE.Color().setHSL(Math.random(), 0.7, 0.6 + Math.random() * 0.3)
    }
  }

  getCount(): number {
    return this.stars.length
  }
}
