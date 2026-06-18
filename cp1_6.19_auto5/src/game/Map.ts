import { v4 as uuidv4 } from 'uuid'
import type { Crystal, Portal } from '../state/gameStore'

export const GRID_WIDTH = 60
export const GRID_HEIGHT = 60
export const CELL_SIZE = 20
export const WALL_THICKNESS = 3

export class GameMap {
  private grid: boolean[][] = []
  private crystalPositions: Crystal[] = []
  private portal: Portal = { x: 0, y: 0, active: false, rotation: 0 }
  private startX: number = 0
  private startY: number = 0
  private wallRects: { x: number; y: number; w: number; h: number }[] = []

  getStartPosition(): { x: number; y: number } {
    return { x: this.startX, y: this.startY }
  }

  getCrystals(): Crystal[] {
    return this.crystalPositions
  }

  getPortal(): Portal {
    return this.portal
  }

  getWallRects(): { x: number; y: number; w: number; h: number }[] {
    return this.wallRects
  }

  generate(): void {
    this.generateCave()
    this.ensureConnectivity()
    this.findStartPosition()
    this.placePortal()
    this.placeCrystals()
    this.buildWallRects()
  }

  private generateCave(): void {
    this.grid = []
    const fillProb = 0.45

    for (let y = 0; y < GRID_HEIGHT; y++) {
      this.grid[y] = []
      for (let x = 0; x < GRID_WIDTH; x++) {
        if (x === 0 || x === GRID_WIDTH - 1 || y === 0 || y === GRID_HEIGHT - 1) {
          this.grid[y][x] = true
        } else {
          this.grid[y][x] = Math.random() < fillProb
        }
      }
    }

    for (let i = 0; i < 5; i++) {
      this.smoothStep()
    }
  }

  private smoothStep(): void {
    const newGrid: boolean[][] = []

    for (let y = 0; y < GRID_HEIGHT; y++) {
      newGrid[y] = []
      for (let x = 0; x < GRID_WIDTH; x++) {
        const neighbors = this.countWallNeighbors(x, y)
        if (this.grid[y][x]) {
          newGrid[y][x] = neighbors >= 4
        } else {
          newGrid[y][x] = neighbors >= 5
        }
      }
    }

    this.grid = newGrid
  }

  private countWallNeighbors(gridX: number, gridY: number): number {
    let count = 0
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue
        const nx = gridX + dx
        const ny = gridY + dy
        if (nx < 0 || nx >= GRID_WIDTH || ny < 0 || ny >= GRID_HEIGHT) {
          count++
        } else if (this.grid[ny][nx]) {
          count++
        }
      }
    }
    return count
  }

  private ensureConnectivity(): void {
    const regions = this.findRegions()
    if (regions.length <= 1) return

    let largestIdx = 0
    let largestSize = 0
    regions.forEach((r, i) => {
      if (r.length > largestSize) {
        largestSize = r.length
        largestIdx = i
      }
    })

    for (let i = 0; i < regions.length; i++) {
      if (i === largestIdx) continue
      const region = regions[i]
      let closest: { x: number; y: number; dist: number } | null = null

      for (const cell of region) {
        for (let dy = -3; dy <= 3; dy++) {
          for (let dx = -3; dx <= 3; dx++) {
            const nx = cell.x + dx
            const ny = cell.y + dy
            if (nx < 0 || nx >= GRID_WIDTH || ny < 0 || ny >= GRID_HEIGHT) continue
            if (!this.grid[ny][nx]) {
              const inSameRegion = region.some((c) => c.x === nx && c.y === ny)
              if (!inSameRegion) {
                const dist = Math.abs(dx) + Math.abs(dy)
                if (!closest || dist < closest.dist) {
                  closest = { x: nx, y: ny, dist }
                }
              }
            }
          }
        }
      }

      if (closest) {
        const start = region[Math.floor(region.length / 2)]
        this.carveCorridor(start.x, start.y, closest.x, closest.y)
      }
    }

    for (let i = 0; i < 2; i++) {
      this.smoothStep()
    }
  }

  private findRegions(): { x: number; y: number }[][] {
    const visited: boolean[][] = []
    for (let y = 0; y < GRID_HEIGHT; y++) {
      visited[y] = []
      for (let x = 0; x < GRID_WIDTH; x++) {
        visited[y][x] = false
      }
    }

    const regions: { x: number; y: number }[][] = []

    for (let y = 1; y < GRID_HEIGHT - 1; y++) {
      for (let x = 1; x < GRID_WIDTH - 1; x++) {
        if (!this.grid[y][x] && !visited[y][x]) {
          const region = this.floodFill(x, y, visited)
          if (region.length > 0) {
            regions.push(region)
          }
        }
      }
    }

    return regions
  }

  private floodFill(
    startX: number,
    startY: number,
    visited: boolean[][]
  ): { x: number; y: number }[] {
    const region: { x: number; y: number }[] = []
    const queue: { x: number; y: number }[] = [{ x: startX, y: startY }]
    visited[startY][startX] = true

    while (queue.length > 0) {
      const cell = queue.shift()!
      region.push(cell)

      const dirs = [
        { dx: 1, dy: 0 },
        { dx: -1, dy: 0 },
        { dx: 0, dy: 1 },
        { dx: 0, dy: -1 },
      ]

      for (const dir of dirs) {
        const nx = cell.x + dir.dx
        const ny = cell.y + dir.dy
        if (
          nx > 0 &&
          nx < GRID_WIDTH - 1 &&
          ny > 0 &&
          ny < GRID_HEIGHT - 1 &&
          !this.grid[ny][nx] &&
          !visited[ny][nx]
        ) {
          visited[ny][nx] = true
          queue.push({ x: nx, y: ny })
        }
      }
    }

    return region
  }

  private carveCorridor(x1: number, y1: number, x2: number, y2: number): void {
    let x = x1
    let y = y1

    while (x !== x2 || y !== y2) {
      if (x !== x2 && (y === y2 || Math.random() < 0.5)) {
        x += x < x2 ? 1 : -1
      } else if (y !== y2) {
        y += y < y2 ? 1 : -1
      }

      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx
          const ny = y + dy
          if (nx > 0 && nx < GRID_WIDTH - 1 && ny > 0 && ny < GRID_HEIGHT - 1) {
            this.grid[ny][nx] = false
          }
        }
      }
    }
  }

  private findStartPosition(): void {
    for (let y = 2; y < GRID_HEIGHT - 2; y++) {
      for (let x = 2; x < GRID_WIDTH - 2; x++) {
        if (!this.grid[y][x]) {
          this.startX = x * CELL_SIZE + CELL_SIZE / 2
          this.startY = y * CELL_SIZE + CELL_SIZE / 2
          return
        }
      }
    }
    this.startX = GRID_WIDTH * CELL_SIZE / 2
    this.startY = GRID_HEIGHT * CELL_SIZE / 2
  }

  private placePortal(): void {
    let maxDist = 0
    let portalGridX = GRID_WIDTH - 5
    let portalGridY = GRID_HEIGHT - 5

    const startGridX = Math.floor(this.startX / CELL_SIZE)
    const startGridY = Math.floor(this.startY / CELL_SIZE)

    for (let y = GRID_HEIGHT / 2; y < GRID_HEIGHT - 2; y++) {
      for (let x = GRID_WIDTH / 2; x < GRID_WIDTH - 2; x++) {
        const gx = Math.floor(x)
        const gy = Math.floor(y)
        if (gy < 0 || gy >= GRID_HEIGHT || gx < 0 || gx >= GRID_WIDTH) continue
        if (!this.grid[gy][gx]) {
          const dist = Math.abs(gx - startGridX) + Math.abs(gy - startGridY)
          if (dist > maxDist && dist >= 30) {
            maxDist = dist
            portalGridX = gx
            portalGridY = gy
          }
        }
      }
    }

    if (maxDist < 30) {
      for (let y = 2; y < GRID_HEIGHT - 2; y++) {
        for (let x = 2; x < GRID_WIDTH - 2; x++) {
          if (!this.grid[y][x]) {
            const dist = Math.abs(x - startGridX) + Math.abs(y - startGridY)
            if (dist > maxDist) {
              maxDist = dist
              portalGridX = x
              portalGridY = y
            }
          }
        }
      }
    }

    this.portal = {
      x: portalGridX * CELL_SIZE + CELL_SIZE / 2,
      y: portalGridY * CELL_SIZE + CELL_SIZE / 2,
      active: false,
      rotation: 0,
    }
  }

  private placeCrystals(): void {
    this.crystalPositions = []
    const numCrystals = Math.floor(Math.random() * 6) + 10
    const candidates: { x: number; y: number; type: 'junction' | 'deadend' }[] = []

    for (let y = 2; y < GRID_HEIGHT - 2; y++) {
      for (let x = 2; x < GRID_WIDTH - 2; x++) {
        if (this.grid[y][x]) continue

        const wallCount = this.countWallNeighbors(x, y)

        if (wallCount <= 2) {
          candidates.push({ x, y, type: 'junction' })
        } else if (wallCount >= 6) {
          candidates.push({ x, y, type: 'deadend' })
        }
      }
    }

    const shuffled = candidates.sort(() => Math.random() - 0.5)
    const portalGridX = Math.floor(this.portal.x / CELL_SIZE)
    const portalGridY = Math.floor(this.portal.y / CELL_SIZE)
    const startGridX = Math.floor(this.startX / CELL_SIZE)
    const startGridY = Math.floor(this.startY / CELL_SIZE)

    let placed = 0
    for (const candidate of shuffled) {
      if (placed >= numCrystals) break

      const distToPortal =
        Math.abs(candidate.x - portalGridX) + Math.abs(candidate.y - portalGridY)
      const distToStart =
        Math.abs(candidate.x - startGridX) + Math.abs(candidate.y - startGridY)

      if (distToPortal < 5 || distToStart < 3) continue

      const tooClose = this.crystalPositions.some((c) => {
        const cx = Math.floor(c.x / CELL_SIZE)
        const cy = Math.floor(c.y / CELL_SIZE)
        return Math.abs(cx - candidate.x) + Math.abs(cy - candidate.y) < 5
      })

      if (tooClose) continue

      this.crystalPositions.push({
        id: uuidv4(),
        x: candidate.x * CELL_SIZE + CELL_SIZE / 2,
        y: candidate.y * CELL_SIZE + CELL_SIZE / 2,
        collected: false,
        collectProgress: 0,
      })
      placed++
    }

    if (placed < numCrystals) {
      const allFloors: { x: number; y: number }[] = []
      for (let y = 2; y < GRID_HEIGHT - 2; y++) {
        for (let x = 2; x < GRID_WIDTH - 2; x++) {
          if (!this.grid[y][x]) {
            allFloors.push({ x, y })
          }
        }
      }

      const shuffledFloors = allFloors.sort(() => Math.random() - 0.5)
      for (const floor of shuffledFloors) {
        if (placed >= numCrystals) break

        const exists = this.crystalPositions.some((c) => {
          const cx = Math.floor(c.x / CELL_SIZE)
          const cy = Math.floor(c.y / CELL_SIZE)
          return cx === floor.x && cy === floor.y
        })

        if (!exists) {
          this.crystalPositions.push({
            id: uuidv4(),
            x: floor.x * CELL_SIZE + CELL_SIZE / 2,
            y: floor.y * CELL_SIZE + CELL_SIZE / 2,
            collected: false,
            collectProgress: 0,
          })
          placed++
        }
      }
    }
  }

  private buildWallRects(): void {
    this.wallRects = []
    const visited: boolean[][] = []

    for (let y = 0; y < GRID_HEIGHT; y++) {
      visited[y] = []
      for (let x = 0; x < GRID_WIDTH; x++) {
        visited[y][x] = false
      }
    }

    for (let y = 0; y < GRID_HEIGHT; y++) {
      for (let x = 0; x < GRID_WIDTH; x++) {
        if (this.grid[y][x] && !visited[y][x]) {
          let width = 1
          while (x + width < GRID_WIDTH && this.grid[y][x + width] && !visited[y][x + width]) {
            width++
          }

          let height = 1
          let canExtend = true
          while (canExtend && y + height < GRID_HEIGHT) {
            for (let wx = 0; wx < width; wx++) {
              if (!this.grid[y + height][x + wx] || visited[y + height][x + wx]) {
                canExtend = false
                break
              }
            }
            if (canExtend) {
              height++
            }
          }

          for (let hy = 0; hy < height; hy++) {
            for (let wx = 0; wx < width; wx++) {
              visited[y + hy][x + wx] = true
            }
          }

          this.wallRects.push({
            x: x * CELL_SIZE,
            y: y * CELL_SIZE,
            w: width * CELL_SIZE,
            h: height * CELL_SIZE,
          })
        }
      }
    }
  }

  isWall(worldX: number, worldY: number): boolean {
    const gridX = Math.floor(worldX / CELL_SIZE)
    const gridY = Math.floor(worldY / CELL_SIZE)

    if (gridX < 0 || gridX >= GRID_WIDTH || gridY < 0 || gridY >= GRID_HEIGHT) {
      return true
    }

    return this.grid[gridY][gridX]
  }

  checkCollision(x: number, y: number, radius: number): boolean {
    const checks = [
      { dx: -radius, dy: -radius },
      { dx: radius, dy: -radius },
      { dx: -radius, dy: radius },
      { dx: radius, dy: radius },
      { dx: 0, dy: -radius },
      { dx: 0, dy: radius },
      { dx: -radius, dy: 0 },
      { dx: radius, dy: 0 },
    ]

    for (const check of checks) {
      if (this.isWall(x + check.dx, y + check.dy)) {
        return true
      }
    }

    return false
  }

  getGrid(): boolean[][] {
    return this.grid
  }
}
