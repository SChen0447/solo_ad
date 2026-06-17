import * as THREE from 'three'
import { v4 as uuidv4 } from 'uuid'
import {
  WindVector,
  Particle,
  Building,
  HeatPoint,
  PollutantSample,
  SimulationConfig,
  SimulationData,
  GRID_SIZE,
  CELL_SIZE,
  MAX_HEIGHT,
  PARTICLE_COUNT,
  HEAT_GRID_RESOLUTION,
  BuildingInfo,
} from './types'

const seededRandom = (seed: number) => {
  let s = seed
  return () => {
    s = (s * 9301 + 49297) % 233280
    return s / 233280
  }
}

const rand = seededRandom(42)

export class DataSimulator {
  private buildings: Building[] = []
  private particles: Particle[] = []
  private heatPoints: HeatPoint[] = []
  private pollutantSamples: PollutantSample[] = []
  private windField: WindVector[][][] = []
  private config: SimulationConfig
  private pollutionSources: THREE.Vector3[] = []
  private lastHeatUpdate: number = 0
  private baseTime: number = 0

  constructor(config: SimulationConfig) {
    this.config = config
    this.initializeWindField()
    this.generateBuildings()
    this.initializeParticles()
    this.generatePollutionSources()
    this.baseTime = Date.now()
  }

  private initializeWindField() {
    const layers = 5
    this.windField = []
    for (let l = 0; l < layers; l++) {
      this.windField[l] = []
      for (let i = 0; i <= GRID_SIZE; i++) {
        this.windField[l][i] = []
        for (let j = 0; j <= GRID_SIZE; j++) {
          const baseAngle = Math.PI * 0.25 + Math.sin(i * 0.3) * 0.3 + Math.cos(j * 0.25) * 0.2
          const heightFactor = 1 + l * 0.3
          this.windField[l][i][j] = {
            x: Math.cos(baseAngle) * heightFactor,
            y: 0.1 + Math.sin(i * 0.5 + j * 0.4) * 0.05,
            z: Math.sin(baseAngle) * heightFactor,
            magnitude: heightFactor,
            direction: baseAngle,
          }
        }
      }
    }
  }

  private generateBuildings() {
    this.buildings = []
    const halfGrid = (GRID_SIZE * CELL_SIZE) / 2

    for (let i = 0; i < GRID_SIZE; i++) {
      for (let j = 0; j < GRID_SIZE; j++) {
        if (rand() < 0.35) continue

        const height = 5 + rand() * (MAX_HEIGHT - 5)
        const width = CELL_SIZE * (0.6 + rand() * 0.3)
        const depth = CELL_SIZE * (0.6 + rand() * 0.3)

        const x = i * CELL_SIZE - halfGrid + CELL_SIZE / 2
        const z = j * CELL_SIZE - halfGrid + CELL_SIZE / 2

        const heightRatio = height / MAX_HEIGHT
        const colorHue = 0.55 + (1 - heightRatio) * 0.1
        const colorSat = 0.3 + heightRatio * 0.2
        const colorLight = 0.25 + heightRatio * 0.2

        const color = new THREE.Color().setHSL(colorHue, colorSat, colorLight)

        this.buildings.push({
          id: uuidv4(),
          position: new THREE.Vector3(x, height / 2, z),
          width,
          depth,
          height,
          color,
          gridX: i,
          gridZ: j,
        })
      }
    }
  }

  private generatePollutionSources() {
    this.pollutionSources = []
    const halfGrid = (GRID_SIZE * CELL_SIZE) / 2
    for (let i = 0; i < 3; i++) {
      const idx = Math.floor(rand() * this.buildings.length)
      const b = this.buildings[idx]
      if (b) {
        this.pollutionSources.push(new THREE.Vector3(b.position.x, b.height, b.position.z))
      }
    }
    if (this.pollutionSources.length === 0) {
      this.pollutionSources.push(new THREE.Vector3(0, 10, 0))
      this.pollutionSources.push(new THREE.Vector3(-halfGrid * 0.5, 15, halfGrid * 0.3))
      this.pollutionSources.push(new THREE.Vector3(halfGrid * 0.4, 20, -halfGrid * 0.5))
    }
  }

  private initializeParticles() {
    this.particles = []
    const halfGrid = (GRID_SIZE * CELL_SIZE) / 2
    const particleLayer = PARTICLE_COUNT

    for (let i = 0; i < particleLayer; i++) {
      const pos = new THREE.Vector3(
        (rand() - 0.5) * GRID_SIZE * CELL_SIZE,
        1 + rand() * MAX_HEIGHT * 1.2,
        (rand() - 0.5) * GRID_SIZE * CELL_SIZE
      )
      this.particles.push(this.createParticle(pos))
    }
  }

  private createParticle(pos: THREE.Vector3): Particle {
    return {
      id: uuidv4(),
      position: pos.clone(),
      velocity: new THREE.Vector3(0, 0, 0),
      age: rand() * 200,
      maxAge: 200 + rand() * 200,
      color: new THREE.Color(),
    }
  }

  public getWindAt(pos: THREE.Vector3): WindVector {
    const layers = this.windField.length
    const halfGrid = (GRID_SIZE * CELL_SIZE) / 2

    let l = Math.floor((pos.y / (MAX_HEIGHT * 1.2)) * (layers - 1))
    l = Math.max(0, Math.min(layers - 1, l))

    const gx = ((pos.x + halfGrid) / CELL_SIZE)
    const gz = ((pos.z + halfGrid) / CELL_SIZE)

    const ix = Math.max(0, Math.min(GRID_SIZE - 1, Math.floor(gx)))
    const iz = Math.max(0, Math.min(GRID_SIZE - 1, Math.floor(gz)))

    const fx = gx - ix
    const fz = gz - iz

    const w00 = this.windField[l][ix][iz]
    const w10 = this.windField[l][Math.min(GRID_SIZE, ix + 1)][iz]
    const w01 = this.windField[l][ix][Math.min(GRID_SIZE, iz + 1)]
    const w11 = this.windField[l][Math.min(GRID_SIZE, ix + 1)][Math.min(GRID_SIZE, iz + 1)]

    const bilinear = (a: number, b: number, c: number, d: number) =>
      a * (1 - fx) * (1 - fz) + b * fx * (1 - fz) + c * (1 - fx) * fz + d * fx * fz

    return {
      x: bilinear(w00.x, w10.x, w01.x, w11.x),
      y: bilinear(w00.y, w10.y, w01.y, w11.y),
      z: bilinear(w00.z, w10.z, w01.z, w11.z),
      magnitude: bilinear(w00.magnitude, w10.magnitude, w01.magnitude, w11.magnitude),
      direction: bilinear(w00.direction, w10.direction, w01.direction, w11.direction),
    }
  }

  private getPollutionAt(pos: THREE.Vector3, time: number): number {
    let concentration = 0
    for (const source of this.pollutionSources) {
      const dist = pos.distanceTo(source)
      const wind = this.getWindAt(pos)
      const windEffect = (wind.x + wind.z) * 0.5
      const offset = windEffect * time * 0.01
      const dx = pos.x - source.x + offset
      const dy = pos.y - source.y
      const dz = pos.z - source.z + offset * 0.5
      const adjustedDist = Math.sqrt(dx * dx + dy * dy + dz * dz)
      const decay = Math.exp(-adjustedDist * this.config.diffusionRate * 0.5)
      const wobble = 0.8 + Math.sin(time * 0.002 + dist * 0.1) * 0.2
      concentration += decay * wobble * 0.8
    }
    return Math.min(1, concentration)
  }

  public update(deltaTime: number): SimulationData {
    const halfGrid = (GRID_SIZE * CELL_SIZE) / 2
    const time = Date.now() - this.baseTime

    for (const particle of this.particles) {
      const wind = this.getWindAt(particle.position)
      const speed = this.config.windSpeed * wind.magnitude

      particle.velocity.set(wind.x * speed, wind.y * speed * 0.5, wind.z * speed)

      particle.position.x += particle.velocity.x * deltaTime * 60
      particle.position.y += particle.velocity.y * deltaTime * 60
      particle.position.z += particle.velocity.z * deltaTime * 60

      for (const building of this.buildings) {
        const bx = building.position.x
        const by = building.position.y
        const bz = building.position.z
        const hw = building.width / 2 + 0.5
        const hd = building.depth / 2 + 0.5
        const hh = building.height / 2 + 0.5

        if (
          particle.position.x > bx - hw && particle.position.x < bx + hw &&
          particle.position.z > bz - hd && particle.position.z < bz + hd &&
          particle.position.y < by + hh
        ) {
          particle.position.y = by + hh + 0.5
          particle.position.x += (rand() - 0.5) * 2
          particle.position.z += (rand() - 0.5) * 2
        }
      }

      particle.age += deltaTime * 60

      const boundary = halfGrid * 1.2
      if (
        particle.position.x < -boundary || particle.position.x > boundary ||
        particle.position.z < -boundary || particle.position.z > boundary ||
        particle.position.y < 0 || particle.position.y > MAX_HEIGHT * 1.5 ||
        particle.age > particle.maxAge
      ) {
        particle.position.set(
          (rand() - 0.5) * GRID_SIZE * CELL_SIZE,
          1 + rand() * MAX_HEIGHT * 0.5,
          (rand() - 0.5) * GRID_SIZE * CELL_SIZE
        )
        const edge = Math.floor(rand() * 4)
        if (edge === 0) particle.position.x = -halfGrid
        if (edge === 1) particle.position.x = halfGrid
        if (edge === 2) particle.position.z = -halfGrid
        if (edge === 3) particle.position.z = halfGrid
        particle.age = 0
      }

      const pollution = this.getPollutionAt(particle.position, time)
      const windSpeed = wind.magnitude
      const tHue = 0.55 - windSpeed * 0.1 - pollution * 0.35
      particle.color.setHSL(
        Math.max(0, Math.min(0.6, tHue)),
        0.8 + pollution * 0.2,
        0.5 + windSpeed * 0.1
      )
    }

    if (time - this.lastHeatUpdate > 200) {
      this.updateHeatData(time)
      this.lastHeatUpdate = time
    }

    return {
      particles: this.particles,
      buildings: this.buildings,
      heatPoints: this.heatPoints,
      pollutantSamples: this.pollutantSamples,
      windField: this.windField,
      timestamp: time,
      selectedBuilding: null,
    }
  }

  private updateHeatData(time: number) {
    this.heatPoints = []
    this.pollutantSamples = []
    const halfGrid = (GRID_SIZE * CELL_SIZE) / 2
    const step = (GRID_SIZE * CELL_SIZE) / HEAT_GRID_RESOLUTION

    for (let i = 0; i <= HEAT_GRID_RESOLUTION; i++) {
      for (let j = 0; j <= HEAT_GRID_RESOLUTION; j++) {
        const x = i * step - halfGrid
        const z = j * step - halfGrid

        for (let h = 0; h < 3; h++) {
          const y = h * (MAX_HEIGHT / 3) + 0.5
          const pos = new THREE.Vector3(x, y, z)
          const concentration = this.getPollutionAt(pos, time)

          if (h === 0) {
            this.heatPoints.push({
              position: pos,
              concentration,
              timestamp: time,
            })
          }

          this.pollutantSamples.push({
            gridX: i,
            gridZ: j,
            height: y,
            concentration,
            timestamp: time,
          })
        }
      }
    }
  }

  public getBuildingInfo(building: Building): BuildingInfo {
    const time = Date.now() - this.baseTime
    let totalWindDir = 0
    let totalWindSpeed = 0
    let totalPollution = 0
    let sampleCount = 0

    for (let dx = -2; dx <= 2; dx++) {
      for (let dz = -2; dz <= 2; dz++) {
        const pos = new THREE.Vector3(
          building.position.x + dx * 2,
          building.height / 2,
          building.position.z + dz * 2
        )
        const wind = this.getWindAt(pos)
        const pollution = this.getPollutionAt(pos, time)
        totalWindDir += wind.direction
        totalWindSpeed += wind.magnitude * this.config.windSpeed
        totalPollution += pollution
        sampleCount++
      }
    }

    return {
      building,
      avgWindDirection: totalWindDir / sampleCount,
      avgWindSpeed: totalWindSpeed / sampleCount,
      avgPollution: totalPollution / sampleCount,
    }
  }

  public setConfig(config: Partial<SimulationConfig>) {
    this.config = { ...this.config, ...config }
  }

  public getBuildings(): Building[] {
    return this.buildings
  }

  public getPollutionSources(): THREE.Vector3[] {
    return this.pollutionSources
  }
}

export const createDefaultConfig = (): SimulationConfig => ({
  windSpeed: 1.5,
  diffusionRate: 0.08,
  particleSize: 4,
  particleCount: PARTICLE_COUNT,
})
