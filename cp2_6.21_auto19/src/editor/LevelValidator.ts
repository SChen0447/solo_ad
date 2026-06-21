import { TileType, Position } from '@/types'

export interface ValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
}

const isWalkable = (tile: TileType): boolean => {
  return tile !== 'wall'
}

export const validateLevel = (grid: TileType[][]): ValidationResult => {
  const errors: string[] = []
  const warnings: string[] = []

  if (!grid || grid.length === 0) {
    errors.push('关卡网格为空')
    return { valid: false, errors, warnings }
  }

  const height = grid.length
  const width = grid[0].length

  for (let y = 0; y < height; y++) {
    if (grid[y].length !== width) {
      errors.push('网格宽度不一致')
      break
    }
  }

  let startCount = 0
  let exitCount = 0
  let startPos: Position | null = null
  let exitPos: Position | null = null
  const entangledTiles: Position[] = []

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const tile = grid[y][x]
      if (tile === 'start') {
        startCount++
        startPos = { x, y }
      } else if (tile === 'exit') {
        exitCount++
        exitPos = { x, y }
      } else if (tile === 'entangled') {
        entangledTiles.push({ x, y })
      }
    }
  }

  if (startCount === 0) {
    errors.push('缺少入口（start）')
  } else if (startCount > 1) {
    errors.push(`有 ${startCount} 个入口，只能有 1 个`)
  }

  if (exitCount === 0) {
    errors.push('缺少出口（exit）')
  } else if (exitCount > 1) {
    errors.push(`有 ${exitCount} 个出口，只能有 1 个`)
  }

  if (entangledTiles.length > 0 && entangledTiles.length % 2 !== 0) {
    warnings.push(`量子纠缠门数量为 ${entangledTiles.length}，建议成对出现`)
  }

  if (startPos && exitPos) {
    const reachable = checkReachability(grid, startPos, exitPos, entangledTiles)
    if (!reachable) {
      errors.push('从入口无法到达出口')
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  }
}

const checkReachability = (
  grid: TileType[][],
  start: Position,
  end: Position,
  entangledTiles: Position[]
): boolean => {
  const height = grid.length
  const width = grid[0].length

  const visited: boolean[][] = Array(height)
    .fill(null)
    .map(() => Array(width).fill(false))

  const queue: Position[] = [start]
  visited[start.y][start.x] = true

  const directions = [
    { dx: 0, dy: -1 },
    { dx: 0, dy: 1 },
    { dx: -1, dy: 0 },
    { dx: 1, dy: 0 },
  ]

  const getEntangledPair = (pos: Position): Position | null => {
    const idx = entangledTiles.findIndex(t => t.x === pos.x && t.y === pos.y)
    if (idx === -1) return null
    if (idx % 2 === 0 && idx + 1 < entangledTiles.length) {
      return entangledTiles[idx + 1]
    }
    if (idx % 2 === 1) {
      return entangledTiles[idx - 1]
    }
    return null
  }

  while (queue.length > 0) {
    const current = queue.shift()!

    if (current.x === end.x && current.y === end.y) {
      return true
    }

    if (grid[current.y][current.x] === 'entangled') {
      const pair = getEntangledPair(current)
      if (pair && !visited[pair.y][pair.x]) {
        visited[pair.y][pair.x] = true
        queue.push(pair)
      }
    }

    for (const dir of directions) {
      const nx = current.x + dir.dx
      const ny = current.y + dir.dy

      if (
        nx >= 0 &&
        nx < width &&
        ny >= 0 &&
        ny < height &&
        !visited[ny][nx] &&
        isWalkable(grid[ny][nx])
      ) {
        visited[ny][nx] = true
        queue.push({ x: nx, y: ny })
      }
    }
  }

  return false
}
