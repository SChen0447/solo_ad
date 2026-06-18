import type { GridCell, TimeSeriesData, ProcessedCell } from '../types'

function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000
  return x - Math.floor(x)
}

export function generateMockData(): TimeSeriesData {
  const gridSizeX = 20
  const gridSizeY = 20
  const timePoints = 12
  const grid: GridCell[] = []
  const densities: number[][] = []

  for (let y = 0; y < gridSizeY; y++) {
    for (let x = 0; x < gridSizeX; x++) {
      const seed = x * 100 + y
      const buildingHeight = seededRandom(seed) * 3
      grid.push({ x, y, buildingHeight })
    }
  }

  const centerX = gridSizeX / 2
  const centerY = gridSizeY / 2

  for (let t = 0; t < timePoints; t++) {
    densities[t] = []
    for (let i = 0; i < grid.length; i++) {
      const cell = grid[i]
      const dx = cell.x - centerX
      const dy = cell.y - centerY
      const dist = Math.sqrt(dx * dx + dy * dy)

      let baseDensity = Math.max(0, 100 - dist * 4)

      const timePhase = (t / timePoints) * Math.PI * 2
      const waveX = Math.sin(timePhase + cell.x * 0.5) * 15
      const waveY = Math.cos(timePhase + cell.y * 0.5) * 15
      const noise = seededRandom(t * 1000 + cell.x * 50 + cell.y * 10) * 20 - 10

      let density = baseDensity + waveX + waveY + noise

      if (t >= 4 && t <= 8) {
        const centerDist = Math.sqrt((cell.x - centerX) ** 2 + (cell.y - centerY) ** 2)
        if (centerDist < 5) {
          density += 40
        }
      }

      density = Math.max(0, Math.min(100, density))
      densities[t][i] = Math.round(density)
    }
  }

  return { grid, timePoints, densities }
}

export function densityToColor(density: number): [number, number, number] {
  const d = Math.max(0, Math.min(100, density))

  if (d <= 50) {
    const t = d / 50
    const r = Math.round(255 * t)
    const g = 0
    const b = Math.round(255 * (1 - t))
    return [r, g, b]
  } else {
    const t = (d - 50) / 50
    const r = 255
    const g = Math.round(255 * t)
    const b = Math.round(255 * t)
    return [r, g, b]
  }
}

export function densityToHeightScale(density: number, buildingHeight: number): number {
  const d = Math.max(0, Math.min(100, density))
  const baseHeight = 0.5 + (d / 100) * 7.5
  return baseHeight + buildingHeight
}

export function initProcessedCells(data: TimeSeriesData, timeIndex: number): ProcessedCell[] {
  const result: ProcessedCell[] = []

  for (let i = 0; i < data.grid.length; i++) {
    const cell = data.grid[i]
    const density = data.densities[timeIndex][i]
    const history: number[] = []
    for (let t = 0; t < data.timePoints; t++) {
      history.push(data.densities[t][i])
    }

    const color = densityToColor(density)
    const heightScale = densityToHeightScale(density, cell.buildingHeight)

    result.push({
      ...cell,
      index: i,
      currentDensity: density,
      targetDensity: density,
      color,
      targetColor: [...color] as [number, number, number],
      heightScale,
      targetHeightScale: heightScale,
      history
    })
  }

  return result
}

export function prepareTransition(cells: ProcessedCell[], data: TimeSeriesData, targetTimeIndex: number): ProcessedCell[] {
  return cells.map((cell, i) => {
    const targetDensity = data.densities[targetTimeIndex][i]
    const targetColor = densityToColor(targetDensity)
    const targetHeightScale = densityToHeightScale(targetDensity, cell.buildingHeight)
    return {
      ...cell,
      targetDensity,
      targetColor,
      targetHeightScale,
      color: [...cell.targetColor] as [number, number, number],
      currentDensity: cell.targetDensity,
      heightScale: cell.targetHeightScale
    }
  })
}

export function interpolateCells(cells: ProcessedCell[], progress: number): ProcessedCell[] {
  const p = Math.max(0, Math.min(1, progress))
  return cells.map((cell) => {
    const r = Math.round(cell.color[0] + (cell.targetColor[0] - cell.color[0]) * p)
    const g = Math.round(cell.color[1] + (cell.targetColor[1] - cell.color[1]) * p)
    const b = Math.round(cell.color[2] + (cell.targetColor[2] - cell.color[2]) * p)
    const density = cell.currentDensity + (cell.targetDensity - cell.currentDensity) * p
    const heightScale = cell.heightScale + (cell.targetHeightScale - cell.heightScale) * p

    return {
      ...cell,
      currentDensity: density,
      color: [r, g, b] as [number, number, number],
      heightScale
    }
  })
}
