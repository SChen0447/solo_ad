import { TileType, Position, QuantumState, Direction, LevelData } from '@/types'

export const createInitialQuantumState = (
  startPos: Position,
  gridWidth: number,
  gridHeight: number
): QuantumState => {
  const probabilityGrid: number[][] = Array(gridHeight)
    .fill(null)
    .map(() => Array(gridWidth).fill(0))

  const radius = 1
  let total = 0

  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      const nx = startPos.x + dx
      const ny = startPos.y + dy
      if (nx >= 0 && nx < gridWidth && ny >= 0 && ny < gridHeight) {
        const dist = Math.abs(dx) + Math.abs(dy)
        const prob = dist === 0 ? 0.4 : dist === 1 ? 0.15 : 0
        probabilityGrid[ny][nx] = prob
        total += prob
      }
    }
  }

  for (let y = 0; y < gridHeight; y++) {
    for (let x = 0; x < gridWidth; x++) {
      if (total > 0) {
        probabilityGrid[y][x] /= total
      }
    }
  }

  return {
    collapsed: false,
    collapsedPosition: null,
    probabilityGrid,
    spreadRadius: 1,
  }
}

export const findStartPosition = (grid: TileType[][]): Position | null => {
  for (let y = 0; y < grid.length; y++) {
    for (let x = 0; x < grid[y].length; x++) {
      if (grid[y][x] === 'start') {
        return { x, y }
      }
    }
  }
  return null
}

export const findExitPosition = (grid: TileType[][]): Position | null => {
  for (let y = 0; y < grid.length; y++) {
    for (let x = 0; x < grid[y].length; x++) {
      if (grid[y][x] === 'exit') {
        return { x, y }
      }
    }
  }
  return null
}

export const findEntangledPairs = (grid: TileType[][]): Array<{ a: Position; b: Position }> => {
  const entangledTiles: Position[] = []
  for (let y = 0; y < grid.length; y++) {
    for (let x = 0; x < grid[y].length; x++) {
      if (grid[y][x] === 'entangled') {
        entangledTiles.push({ x, y })
      }
    }
  }
  const pairs: Array<{ a: Position; b: Position }> = []
  for (let i = 0; i < entangledTiles.length - 1; i += 2) {
    pairs.push({ a: entangledTiles[i], b: entangledTiles[i + 1] })
  }
  return pairs
}

const isWalkable = (tile: TileType): boolean => {
  return tile !== 'wall'
}

export const moveProbabilityWave = (
  state: QuantumState,
  direction: Direction,
  grid: TileType[][]
): QuantumState => {
  const height = grid.length
  const width = grid[0].length
  const newGrid: number[][] = Array(height)
    .fill(null)
    .map(() => Array(width).fill(0))

  const dx = direction === 'left' ? -1 : direction === 'right' ? 1 : 0
  const dy = direction === 'up' ? -1 : direction === 'down' ? 1 : 0

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (state.probabilityGrid[y][x] > 0) {
        const nx = x + dx
        const ny = y + dy

        if (nx >= 0 && nx < width && ny >= 0 && ny < height && isWalkable(grid[ny][nx])) {
          newGrid[ny][nx] += state.probabilityGrid[y][x] * 0.7
          newGrid[y][x] += state.probabilityGrid[y][x] * 0.3
        } else {
          newGrid[y][x] += state.probabilityGrid[y][x]
        }
      }
    }
  }

  let total = 0
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      total += newGrid[y][x]
    }
  }
  if (total > 0) {
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        newGrid[y][x] /= total
      }
    }
  }

  return {
    ...state,
    probabilityGrid: newGrid,
    collapsed: false,
    collapsedPosition: null,
  }
}

const applyTrapEffect = (state: QuantumState, grid: TileType[][]): number[][] => {
  const height = grid.length
  const width = grid[0].length
  const tempGrid = state.probabilityGrid.map(row => [...row])

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (grid[y][x] === 'trap' && state.probabilityGrid[y][x] > 0) {
        const spreadAmount = state.probabilityGrid[y][x] * 0.5
        tempGrid[y][x] -= spreadAmount

        const directions = [
          { dx: -1, dy: 0 },
          { dx: 1, dy: 0 },
          { dx: 0, dy: -1 },
          { dx: 0, dy: 1 },
        ]
        const validDirs = directions.filter(
          d =>
            x + d.dx >= 0 &&
            x + d.dx < width &&
            y + d.dy >= 0 &&
            y + d.dy < height &&
            grid[y + d.dy][x + d.dx] !== 'wall'
        )
        if (validDirs.length > 0) {
          const perDir = spreadAmount / validDirs.length
          for (const d of validDirs) {
            tempGrid[y + d.dy][x + d.dx] += perDir
          }
        } else {
          tempGrid[y][x] += spreadAmount
        }
      }
    }
  }

  return tempGrid
}

const applyEntanglement = (
  grid: number[][],
  entangledPairs: Array<{ a: Position; b: Position }>
): number[][] => {
  const newGrid = grid.map(row => [...row])

  for (const pair of entangledPairs) {
    const probA = newGrid[pair.a.y][pair.a.x]
    const probB = newGrid[pair.b.y][pair.b.x]
    const total = probA + probB
    if (total > 0) {
      const avg = total / 2
      newGrid[pair.a.y][pair.a.x] = avg
      newGrid[pair.b.y][pair.b.x] = avg
    }
  }

  return newGrid
}

export const applyTerrainEffects = (
  state: QuantumState,
  grid: TileType[][],
  entangledPairs: Array<{ a: Position; b: Position }>
): QuantumState => {
  let newGrid = applyTrapEffect(state, grid)
  newGrid = applyEntanglement(newGrid, entangledPairs)

  let total = 0
  for (let y = 0; y < grid.length; y++) {
    for (let x = 0; x < grid[0].length; x++) {
      total += newGrid[y][x]
    }
  }
  if (total > 0) {
    for (let y = 0; y < grid.length; y++) {
      for (let x = 0; x < grid[0].length; x++) {
        newGrid[y][x] /= total
      }
    }
  }

  return {
    ...state,
    probabilityGrid: newGrid,
  }
}

export const collapseWaveFunction = (
  state: QuantumState
): { state: QuantumState; position: Position } => {
  let maxProb = 0
  let maxPos: Position = { x: 0, y: 0 }

  for (let y = 0; y < state.probabilityGrid.length; y++) {
    for (let x = 0; x < state.probabilityGrid[y].length; x++) {
      if (state.probabilityGrid[y][x] > maxProb) {
        maxProb = state.probabilityGrid[y][x]
        maxPos = { x, y }
      }
    }
  }

  const newGrid = state.probabilityGrid.map(row => row.map(() => 0))
  newGrid[maxPos.y][maxPos.x] = 1

  return {
    state: {
      ...state,
      collapsed: true,
      collapsedPosition: maxPos,
      probabilityGrid: newGrid,
    },
    position: maxPos,
  }
}

export const checkWinCondition = (position: Position, grid: TileType[][]): boolean => {
  return grid[position.y][position.x] === 'exit'
}

export const isOnObserver = (position: Position, grid: TileType[][]): boolean => {
  return grid[position.y][position.x] === 'observer'
}

export const getProbabilityInRadius = (
  state: QuantumState,
  center: Position,
  radius: number
): number[][] => {
  const result: number[][] = []
  for (let dy = -radius; dy <= radius; dy++) {
    const row: number[] = []
    for (let dx = -radius; dx <= radius; dx++) {
      const nx = center.x + dx
      const ny = center.y + dy
      if (
        ny >= 0 &&
        ny < state.probabilityGrid.length &&
        nx >= 0 &&
        nx < state.probabilityGrid[0].length
      ) {
        row.push(state.probabilityGrid[ny][nx])
      } else {
        row.push(0)
      }
    }
    result.push(row)
  }
  return result
}
