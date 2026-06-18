import {
  GeoDataPoint,
  StreamLine,
  DataSourceType,
  GRID_WIDTH,
  GRID_HEIGHT,
  MAX_STREAMLINES,
  STREAMLINE_POINTS,
  EARTH_RADIUS,
  TOTAL_TIME_FRAMES
} from './types'

function latLonToXYZ(lat: number, lon: number, radius: number): { x: number; y: number; z: number } {
  const phi = (90 - lat) * (Math.PI / 180)
  const theta = (lon + 180) * (Math.PI / 180)
  return {
    x: -radius * Math.sin(phi) * Math.cos(theta),
    y: radius * Math.cos(phi),
    z: radius * Math.sin(phi) * Math.sin(theta)
  }
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

function temperatureToColor(temp: number): [number, number, number] {
  const t = Math.max(0, Math.min(1, (temp + 40) / 80))
  if (t < 0.25) {
    const nt = t / 0.25
    return [0, lerp(0.3, 0.6, nt), lerp(1, 1, nt)]
  } else if (t < 0.5) {
    const nt = (t - 0.25) / 0.25
    return [0, lerp(0.6, 1, nt), lerp(1, 0.8, nt)]
  } else if (t < 0.75) {
    const nt = (t - 0.5) / 0.25
    return [lerp(0, 1, nt), 1, lerp(0.8, 0, nt)]
  } else {
    const nt = (t - 0.75) / 0.25
    return [1, lerp(1, 0, nt), 0]
  }
}

function windSpeedToColor(speed: number): [number, number, number] {
  const t = Math.max(0, Math.min(1, speed / 30))
  if (t < 0.5) {
    const nt = t / 0.5
    return [lerp(0.2, 1, nt), lerp(0.8, 1, nt), lerp(0.2, 0, nt)]
  } else {
    const nt = (t - 0.5) / 0.5
    return [1, lerp(1, 0, nt), 0]
  }
}

function pressureToColor(pressure: number): [number, number, number] {
  const t = Math.max(0, Math.min(1, (pressure - 980) / 60))
  if (t < 0.33) {
    const nt = t / 0.33
    return [lerp(0.5, 0.3, nt), lerp(0, 0.5, nt), lerp(0.8, 1, nt)]
  } else if (t < 0.66) {
    const nt = (t - 0.33) / 0.33
    return [lerp(0.3, 0.2, nt), lerp(0.5, 1, nt), 1]
  } else {
    const nt = (t - 0.66) / 0.34
    return [lerp(0.2, 1, nt), lerp(1, 1, nt), lerp(1, 0, nt)]
  }
}

function seededRandom(seed: number): () => number {
  let s = seed
  return () => {
    s = (s * 9301 + 49297) % 233280
    return s / 233280
  }
}

function generateBaseGrid(
  source: DataSourceType,
  timeFrame: number
): { temperature: number[][]; windSpeed: number[][]; windDir: number[][]; pressure: number[][] } {
  const temperature: number[][] = []
  const windSpeed: number[][] = []
  const windDir: number[][] = []
  const pressure: number[][] = []
  const rand = seededRandom(source.charCodeAt(0) * 1000 + timeFrame)

  const timePhase = (timeFrame / TOTAL_TIME_FRAMES) * Math.PI * 2

  for (let j = 0; j < GRID_HEIGHT; j++) {
    temperature[j] = []
    windSpeed[j] = []
    windDir[j] = []
    pressure[j] = []

    const lat = 90 - (j / (GRID_HEIGHT - 1)) * 180
    const latRad = (lat * Math.PI) / 180

    for (let i = 0; i < GRID_WIDTH; i++) {
      const lon = -180 + (i / (GRID_WIDTH - 1)) * 360
      const lonRad = (lon * Math.PI) / 180

      let baseTemp = 30 - Math.abs(lat) * 0.6
      let baseWindSpeed = 5 + Math.abs(lat) * 0.15
      let baseWindDir = 90 + Math.sin(latRad * 3) * 30
      let basePressure = 1013 - Math.sin(latRad * 2) * 15

      if (source === 'summerMonsoon') {
        const monsoonEffect = Math.max(0, Math.sin(latRad)) * Math.sin(lonRad + timePhase) * 15
        baseTemp += monsoonEffect * 0.5
        baseWindSpeed += monsoonEffect * 0.8
        baseWindDir += Math.sin(lonRad * 2 + timePhase) * 40
        basePressure -= monsoonEffect * 0.3
      } else if (source === 'winterCold') {
        const coldEffect = Math.max(0, -Math.sin(latRad)) * 12
        baseTemp -= coldEffect
        baseWindSpeed += coldEffect * 0.6
        baseWindDir += Math.cos(lonRad * 1.5 + timePhase) * 30
        basePressure += coldEffect * 0.5
      } else {
        baseTemp += Math.sin(latRad * 2 + timePhase * 0.5) * 3
        baseWindSpeed += Math.sin(latRad * 3) * 2
        baseWindDir += Math.sin(lonRad + timePhase) * 20
      }

      const noise = (rand() - 0.5) * 4
      temperature[j][i] = baseTemp + noise + Math.sin(lonRad * 3 + timePhase) * 2

      const windNoise = (rand() - 0.5) * 3
      windSpeed[j][i] = Math.max(0.5, baseWindSpeed + windNoise)

      const dirNoise = (rand() - 0.5) * 20
      windDir[j][i] = baseWindDir + dirNoise

      const pressNoise = (rand() - 0.5) * 8
      pressure[j][i] = basePressure + pressNoise + Math.sin(lonRad * 2) * 5
    }
  }

  return { temperature, windSpeed, windDir, pressure }
}

export function generateWeatherData(
  source: DataSourceType,
  timeFrame: number
): {
  windData: GeoDataPoint[]
  temperatureGrid: number[][]
  pressureGrid: number[][]
  windSpeedGrid: number[][]
  windDirGrid: number[][]
} {
  const { temperature, windSpeed, windDir, pressure } = generateBaseGrid(source, timeFrame)

  const windData: GeoDataPoint[] = []
  for (let j = 0; j < GRID_HEIGHT; j++) {
    for (let i = 0; i < GRID_WIDTH; i++) {
      const lat = 90 - (j / (GRID_HEIGHT - 1)) * 180
      const lon = -180 + (i / (GRID_WIDTH - 1)) * 360
      windData.push({
        lat,
        lon,
        temperature: temperature[j][i],
        windSpeed: windSpeed[j][i],
        windDirection: windDir[j][i],
        pressure: pressure[j][i]
      })
    }
  }

  return {
    windData,
    temperatureGrid: temperature,
    pressureGrid: pressure,
    windSpeedGrid: windSpeed,
    windDirGrid: windDir
  }
}

export function generateStreamLines(
  windSpeedGrid: number[][],
  windDirGrid: number[][],
  count: number = 800
): StreamLine[] {
  const lines: StreamLine[] = []
  const rand = seededRandom(42)
  const actualCount = Math.min(count, MAX_STREAMLINES)

  for (let idx = 0; idx < actualCount; idx++) {
    const startI = Math.floor(rand() * (GRID_WIDTH - 1))
    const startJ = Math.floor(rand() * (GRID_HEIGHT - 1))

    const points: Array<{ x: number; y: number; z: number }> = []
    let ci = startI
    let cj = startJ

    const baseSpeed = windSpeedGrid[startJ]?.[startI] || 5

    for (let p = 0; p < STREAMLINE_POINTS; p++) {
      const clampedI = Math.max(0, Math.min(GRID_WIDTH - 1, Math.floor(ci)))
      const clampedJ = Math.max(0, Math.min(GRID_HEIGHT - 1, Math.floor(cj)))

      const lat = 90 - (clampedJ / (GRID_HEIGHT - 1)) * 180
      const lon = -180 + (clampedI / (GRID_WIDTH - 1)) * 360

      const heightOffset = 0.02 + p * 0.003
      const pos = latLonToXYZ(lat, lon, EARTH_RADIUS + heightOffset)
      points.push(pos)

      const speed = windSpeedGrid[clampedJ]?.[clampedI] || baseSpeed
      const dir = windDirGrid[clampedJ]?.[clampedI] || 90

      const stepSize = 0.8 + speed * 0.05
      const dirRad = (dir * Math.PI) / 180

      const latStep = Math.cos(dirRad) * stepSize * 0.3
      const lonStep = Math.sin(dirRad) * stepSize * 0.5

      cj -= latStep * 0.5
      ci += lonStep * 0.3

      if (ci < 0) ci += GRID_WIDTH
      if (ci >= GRID_WIDTH) ci -= GRID_WIDTH
      if (cj < 0 || cj >= GRID_HEIGHT - 1) break
    }

    const colorArr = windSpeedToColor(baseSpeed)
    const color = `rgb(${Math.round(colorArr[0] * 255)}, ${Math.round(colorArr[1] * 255)}, ${Math.round(colorArr[2] * 255)})`

    lines.push({
      id: idx,
      points,
      speed: baseSpeed,
      color
    })
  }

  return lines
}

export function getTemperatureColorAt(
  lat: number,
  lon: number,
  temperatureGrid: number[][]
): [number, number, number] {
  const i = ((lon + 180) / 360) * (GRID_WIDTH - 1)
  const j = ((90 - lat) / 180) * (GRID_HEIGHT - 1)

  const i0 = Math.floor(Math.max(0, Math.min(GRID_WIDTH - 2, i)))
  const j0 = Math.floor(Math.max(0, Math.min(GRID_HEIGHT - 2, j)))
  const fi = i - i0
  const fj = j - j0

  const t00 = temperatureGrid[j0]?.[i0] || 0
  const t10 = temperatureGrid[j0]?.[i0 + 1] || 0
  const t01 = temperatureGrid[j0 + 1]?.[i0] || 0
  const t11 = temperatureGrid[j0 + 1]?.[i0 + 1] || 0

  const temp = lerp(lerp(t00, t10, fi), lerp(t01, t11, fi), fj)
  return temperatureToColor(temp)
}

export function getDataAtLatLon(
  lat: number,
  lon: number,
  temperatureGrid: number[][],
  pressureGrid: number[][],
  windSpeedGrid: number[][]
): { temperature: number; pressure: number; windSpeed: number } {
  const i = ((lon + 180) / 360) * (GRID_WIDTH - 1)
  const j = ((90 - lat) / 180) * (GRID_HEIGHT - 1)

  const i0 = Math.floor(Math.max(0, Math.min(GRID_WIDTH - 2, i)))
  const j0 = Math.floor(Math.max(0, Math.min(GRID_HEIGHT - 2, j)))
  const fi = i - i0
  const fj = j - j0

  const bilerp = (grid: number[][]) => {
    const v00 = grid[j0]?.[i0] || 0
    const v10 = grid[j0]?.[i0 + 1] || 0
    const v01 = grid[j0 + 1]?.[i0] || 0
    const v11 = grid[j0 + 1]?.[i0 + 1] || 0
    return lerp(lerp(v00, v10, fi), lerp(v01, v11, fi), fj)
  }

  return {
    temperature: bilerp(temperatureGrid),
    pressure: bilerp(pressureGrid),
    windSpeed: bilerp(windSpeedGrid)
  }
}

export function generateIsosurfaceVertices(
  pressureGrid: number[][],
  isovalue: number
): { vertices: number[]; colors: number[] } {
  const vertices: number[] = []
  const colors: number[] = []

  for (let j = 0; j < GRID_HEIGHT - 1; j++) {
    for (let i = 0; i < GRID_WIDTH - 1; i++) {
      const lat = 90 - (j / (GRID_HEIGHT - 1)) * 180
      const lon = -180 + (i / (GRID_WIDTH - 1)) * 360

      const p00 = pressureGrid[j][i]
      const p10 = pressureGrid[j][i + 1]
      const p01 = pressureGrid[j + 1][i]
      const p11 = pressureGrid[j + 1][i + 1]

      const avgP = (p00 + p10 + p01 + p11) / 4
      const deviation = Math.abs(avgP - isovalue)

      if (deviation < 5) {
        const height = 0.05 + (1 - deviation / 5) * 0.08
        const pos = latLonToXYZ(lat, lon, EARTH_RADIUS + height)
        const color = pressureToColor(avgP)

        vertices.push(pos.x, pos.y, pos.z)
        colors.push(color[0], color[1], color[2])
      }
    }
  }

  return { vertices, colors }
}

export function lerpData(
  dataA: number[][],
  dataB: number[][],
  t: number
): number[][] {
  const result: number[][] = []
  for (let j = 0; j < GRID_HEIGHT; j++) {
    result[j] = []
    for (let i = 0; i < GRID_WIDTH; i++) {
      result[j][i] = lerp(dataA[j][i], dataB[j][i], t)
    }
  }
  return result
}

export { latLonToXYZ, temperatureToColor, windSpeedToColor, pressureToColor, lerp }
