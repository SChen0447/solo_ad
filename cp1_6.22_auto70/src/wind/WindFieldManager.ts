export type AltitudeLevel = 'surface' | '500hPa' | '250hPa'

export interface WindParticle {
  position: { x: number; y: number; z: number }
  velocity: { x: number; y: number; z: number }
  speed: number
  life: number
  maxLife: number
  size: number
}

export interface WindFieldData {
  particles: WindParticle[]
  altitudeLevel: AltitudeLevel
}

class PerlinNoise3D {
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
    return [...p, ...p]
  }

  private fade(t: number): number {
    return t * t * t * (t * (t * 6 - 15) + 10)
  }

  private lerp(a: number, b: number, t: number): number {
    return a + t * (b - a)
  }

  private grad(hash: number, x: number, y: number, z: number): number {
    const h = hash & 15
    const u = h < 8 ? x : y
    const v = h < 4 ? y : h === 12 || h === 14 ? x : z
    return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v)
  }

  noise(x: number, y: number, z: number): number {
    const X = Math.floor(x) & 255
    const Y = Math.floor(y) & 255
    const Z = Math.floor(z) & 255

    x -= Math.floor(x)
    y -= Math.floor(y)
    z -= Math.floor(z)

    const u = this.fade(x)
    const v = this.fade(y)
    const w = this.fade(z)

    const p = this.permutation
    const A = p[X] + Y
    const AA = p[A] + Z
    const AB = p[A + 1] + Z
    const B = p[X + 1] + Y
    const BA = p[B] + Z
    const BB = p[B + 1] + Z

    return this.lerp(
      this.lerp(
        this.lerp(this.grad(p[AA], x, y, z), this.grad(p[BA], x - 1, y, z), u),
        this.lerp(this.grad(p[AB], x, y - 1, z), this.grad(p[BB], x - 1, y - 1, z), u),
        v
      ),
      this.lerp(
        this.lerp(this.grad(p[AA + 1], x, y, z - 1), this.grad(p[BA + 1], x - 1, y, z - 1), u),
        this.lerp(this.grad(p[AB + 1], x, y - 1, z - 1), this.grad(p[BB + 1], x - 1, y - 1, z - 1), u),
        v
      ),
      w
    )
  }
}

const EARTH_RADIUS = 1

export class WindFieldManager {
  private noise3D: PerlinNoise3D
  private particles: WindParticle[] = []
  private currentLevel: AltitudeLevel = 'surface'
  private particleCount: number = 5000
  private time: number = 0
  private lastUpdateTime: number = 0

  private altitudeConfigs: Record<AltitudeLevel, { radius: number; speedScale: number; noiseScale: number }> = {
    surface: { radius: 1.02, speedScale: 0.003, noiseScale: 2 },
    '500hPa': { radius: 1.08, speedScale: 0.006, noiseScale: 2.5 },
    '250hPa': { radius: 1.15, speedScale: 0.01, noiseScale: 3 }
  }

  constructor(particleCount: number = 5000) {
    this.noise3D = new PerlinNoise3D(42)
    this.particleCount = particleCount
    this.initParticles()
  }

  private initParticles(): void {
    this.particles = []
    const config = this.altitudeConfigs[this.currentLevel]

    for (let i = 0; i < this.particleCount; i++) {
      const particle = this.createParticle(config.radius)
      particle.life = Math.random() * particle.maxLife
      this.particles.push(particle)
    }
  }

  private createParticle(radius: number): WindParticle {
    const theta = Math.random() * Math.PI * 2
    const phi = Math.acos(2 * Math.random() - 1)

    const x = radius * Math.sin(phi) * Math.cos(theta)
    const y = radius * Math.sin(phi) * Math.sin(theta)
    const z = radius * Math.cos(phi)

    return {
      position: { x, y, z },
      velocity: { x: 0, y: 0, z: 0 },
      speed: 0,
      life: 0,
      maxLife: 600,
      size: 0.03 + Math.random() * 0.07
    }
  }

  getWindVelocity(x: number, y: number, z: number, level: AltitudeLevel): { x: number; y: number; z: number; speed: number } {
    const config = this.altitudeConfigs[level]
    const scale = config.noiseScale

    const noiseX = this.noise3D.noise(x * scale + this.time, y * scale, z * scale)
    const noiseY = this.noise3D.noise(x * scale, y * scale + this.time, z * scale)
    const noiseZ = this.noise3D.noise(x * scale, y * scale, z * scale + this.time)

    const pos = { x, y, z }
    const len = Math.sqrt(pos.x * pos.x + pos.y * pos.y + pos.z * pos.z)
    const nx = pos.x / len
    const ny = pos.y / len
    const nz = pos.z / len

    const tangent1 = { x: -ny, y: nx, z: 0 }
    const t1Len = Math.sqrt(tangent1.x * tangent1.x + tangent1.y * tangent1.y + tangent1.z * tangent1.z)
    if (t1Len > 0.001) {
      tangent1.x /= t1Len
      tangent1.y /= t1Len
      tangent1.z /= t1Len
    } else {
      tangent1.x = 1
      tangent1.y = 0
      tangent1.z = 0
    }

    const tangent2 = {
      x: ny * tangent1.z - nz * tangent1.y,
      y: nz * tangent1.x - nx * tangent1.z,
      z: nx * tangent1.y - ny * tangent1.x
    }

    const speedScale = config.speedScale
    const vx = (tangent1.x * noiseX + tangent2.x * noiseY) * speedScale
    const vy = (tangent1.y * noiseX + tangent2.y * noiseY) * speedScale
    const vz = (tangent1.z * noiseX + tangent2.z * noiseY) * speedScale + noiseZ * speedScale * 0.3

    const speed = Math.sqrt(vx * vx + vy * vy + vz * vz) / speedScale * 30

    return { x: vx, y: vy, z: vz, speed }
  }

  update(deltaTime: number): void {
    this.time += deltaTime * 0.1

    const config = this.altitudeConfigs[this.currentLevel]

    for (let i = 0; i < this.particles.length; i++) {
      const particle = this.particles[i]

      const vel = this.getWindVelocity(
        particle.position.x,
        particle.position.y,
        particle.position.z,
        this.currentLevel
      )

      particle.velocity = { x: vel.x, y: vel.y, z: vel.z }
      particle.speed = vel.speed

      particle.position.x += vel.x
      particle.position.y += vel.y
      particle.position.z += vel.z

      const pos = particle.position
      const dist = Math.sqrt(pos.x * pos.x + pos.y * pos.y + pos.z * pos.z)
      const targetRadius = config.radius
      if (dist > 0) {
        const scale = targetRadius / dist
        particle.position.x *= scale
        particle.position.y *= scale
        particle.position.z *= scale
      }

      particle.life += 1

      if (particle.life >= particle.maxLife) {
        const newParticle = this.createParticle(config.radius)
        particle.position = newParticle.position
        particle.velocity = newParticle.velocity
        particle.speed = newParticle.speed
        particle.life = 0
        particle.maxLife = newParticle.maxLife
        particle.size = newParticle.size
      }
    }
  }

  getParticles(): WindParticle[] {
    return this.particles
  }

  getAltitudeLevel(): AltitudeLevel {
    return this.currentLevel
  }

  setAltitudeLevel(level: AltitudeLevel): void {
    if (this.currentLevel !== level) {
      this.currentLevel = level
      this.initParticles()
    }
  }

  setParticleCount(count: number): void {
    if (this.particleCount !== count) {
      this.particleCount = count
      this.initParticles()
    }
  }

  getParticleCount(): number {
    return this.particleCount
  }

  getAltitudeConfig(level: AltitudeLevel): { radius: number; speedScale: number; noiseScale: number } {
    return this.altitudeConfigs[level]
  }

  getWindAtLatLon(lat: number, lon: number, level: AltitudeLevel): { speed: number; direction: number } {
    const config = this.altitudeConfigs[level]
    const radius = config.radius

    const phi = (90 - lat) * (Math.PI / 180)
    const theta = (lon + 180) * (Math.PI / 180)

    const x = radius * Math.sin(phi) * Math.cos(theta)
    const y = radius * Math.cos(phi)
    const z = radius * Math.sin(phi) * Math.sin(theta)

    const vel = this.getWindVelocity(x, y, z, level)

    const east = -vel.z
    const north = vel.y

    const speed = Math.sqrt(east * east + north * north) / config.speedScale * 30
    const direction = (Math.atan2(east, north) * (180 / Math.PI) + 360) % 360

    return { speed, direction }
  }
}

export function getAltitudeLevelName(level: AltitudeLevel): string {
  const names: Record<AltitudeLevel, string> = {
    surface: '近地面',
    '500hPa': '500hPa',
    '250hPa': '250hPa'
  }
  return names[level]
}

export function speedToColor(speed: number): { r: number; g: number; b: number } {
  const normalizedSpeed = Math.min(Math.max(speed / 80, 0), 1)

  const lowColor = { r: 72 / 255, g: 187 / 255, b: 120 / 255 }
  const midColor = { r: 237 / 255, g: 137 / 255, b: 54 / 255 }
  const highColor = { r: 229 / 255, g: 62 / 255, b: 62 / 255 }

  let r: number, g: number, b: number

  if (normalizedSpeed < 0.5) {
    const t = normalizedSpeed / 0.5
    r = lowColor.r + (midColor.r - lowColor.r) * t
    g = lowColor.g + (midColor.g - lowColor.g) * t
    b = lowColor.b + (midColor.b - lowColor.b) * t
  } else {
    const t = (normalizedSpeed - 0.5) / 0.5
    r = midColor.r + (highColor.r - midColor.r) * t
    g = midColor.g + (highColor.g - midColor.g) * t
    b = midColor.b + (highColor.b - midColor.b) * t
  }

  return { r, g, b }
}
