import axios from 'axios'

export interface SonarPoint {
  x: number
  y: number
  z: number
  depth: number
}

export interface Target {
  id: string
  name: string
  type: 'shipwreck' | 'coral' | 'unidentified'
  x: number
  y: number
  z: number
  createdAt: number
}

export interface SonarResponse {
  points: SonarPoint[]
  targets: Target[]
  waterTemperature: number
  currentDepth: number
  timestamp: number
}

const api = axios.create({
  baseURL: '/api',
  timeout: 200,
})

export const sonarApi = {
  async simulateSonar(
    shipX: number,
    shipZ: number,
    radius: number = 20,
    angle: number = 0,
    coneAngle: number = 45
  ): Promise<SonarResponse> {
    try {
      const response = await api.get('/simulate-sonar', {
        params: {
          x: shipX,
          z: shipZ,
          radius,
          angle,
          coneAngle,
        },
      })
      return response.data
    } catch (error) {
      console.warn('[sonarApi] Using local fallback for simulate-sonar')
      return generateLocalSonarData(shipX, shipZ, radius, angle, coneAngle)
    }
  },

  async getTargets(): Promise<Target[]> {
    try {
      const response = await api.get('/targets')
      return response.data
    } catch (error) {
      console.warn('[sonarApi] Using local fallback for getTargets')
      return []
    }
  },

  async createTarget(target: Omit<Target, 'id' | 'createdAt'>): Promise<Target> {
    try {
      const response = await api.post('/targets', target)
      return response.data
    } catch (error) {
      console.warn('[sonarApi] Using local fallback for createTarget')
      return {
        ...target,
        id: String(Date.now()),
        createdAt: Date.now() / 1000,
      }
    }
  },

  async deleteTarget(id: string): Promise<boolean> {
    try {
      await api.delete(`/targets/${id}`)
      return true
    } catch (error) {
      console.warn('[sonarApi] Using local fallback for deleteTarget')
      return true
    }
  },

  async exportTerrain(): Promise<string> {
    try {
      const response = await api.get('/export-terrain', {
        responseType: 'text',
      })
      return response.data
    } catch (error) {
      console.warn('[sonarApi] Using local fallback for export-terrain')
      return generateLocalObj()
    }
  },
}

function generateLocalSonarData(
  shipX: number,
  shipZ: number,
  radius: number,
  angle: number,
  coneAngle: number
): SonarResponse {
  const points: SonarPoint[] = []
  const step = 1.0
  const coneRad = (coneAngle * Math.PI) / 180
  const scanRad = (angle * Math.PI) / 180

  for (let d = 1; d <= radius; d += step) {
    for (let a = -coneAngle / 2; a <= coneAngle / 2; a += 5) {
      const aRad = (a * Math.PI) / 180
      const x = shipX + d * Math.sin(scanRad + aRad)
      const z = shipZ + d * Math.cos(scanRad + aRad)
      const height = generateHeight(x, z)
      points.push({
        x: Math.round(x * 100) / 100,
        y: height,
        z: Math.round(z * 100) / 100,
        depth: Math.abs(height),
      })
    }
  }

  return {
    points,
    targets: [],
    waterTemperature: parseFloat((4 + Math.random() * 8).toFixed(1)),
    currentDepth: Math.abs(generateHeight(shipX, shipZ)),
    timestamp: Date.now() / 1000,
  }
}

function generateHeight(x: number, z: number): number {
  let h = 0
  h += Math.sin(x * 0.3) * Math.cos(z * 0.3) * 5
  h += Math.sin(x * 0.1 + 1.5) * Math.cos(z * 0.15) * 8
  h += (Math.random() - 0.5) * 2
  h -= 15
  return Math.round(h * 100) / 100
}

function generateLocalObj(): string {
  const size = 100
  const step = 2
  const vertices: string[] = []
  const faces: string[] = []

  for (let i = 0; i <= size; i += step) {
    for (let j = 0; j <= size; j += step) {
      const x = i - size / 2
      const z = j - size / 2
      const y = generateHeight(x, z)
      vertices.push(`v ${x} ${y} ${z}`)
    }
  }

  const gridSize = Math.floor(size / step) + 1
  for (let i = 0; i < gridSize - 1; i++) {
    for (let j = 0; j < gridSize - 1; j++) {
      const a = i * gridSize + j + 1
      const b = i * gridSize + (j + 1) + 1
      const c = (i + 1) * gridSize + (j + 1) + 1
      const d = (i + 1) * gridSize + j + 1
      faces.push(`f ${a} ${b} ${c}`)
      faces.push(`f ${a} ${c} ${d}`)
    }
  }

  return `# Deep Sea Echo Sounder - Terrain Export\n${vertices.join('\n')}\n\n${faces.join('\n')}`
}
