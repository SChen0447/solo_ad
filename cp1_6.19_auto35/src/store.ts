import { create } from 'zustand'

export const GRID_SIZE = 32
export const WAVE_RADIUS = 5
export const WAVE_DECAY_MS = 1500
export const PROPAGATION_SCALE_MS = 300
export const TOGGLE_FADE_MS = 200
export const CLEAR_ANIMATION_MS = 800
export const RANDOM_FILL_DELAY = 50
export const LONG_PRESS_MS = 500

export type CellBase = 0 | 1

export interface PropagationInfo {
  startTime: number
}

export interface ClearInfo {
  startTime: number
  centerX: number
  centerY: number
}

export interface RandomFillInfo {
  startTime: number
  seed: number
}

interface GridStore {
  baseGrid: CellBase[][]
  mouseGridX: number
  mouseGridY: number
  waveActive: boolean
  waveStartTime: number
  propagationCells: Map<string, PropagationInfo>
  clearInfo: ClearInfo | null
  randomFillInfo: RandomFillInfo | null
  toggleCell: (x: number, y: number) => void
  clearGrid: () => void
  randomFill: () => void
  updateMousePosition: (x: number, y: number) => void
  startWave: () => void
  endWave: () => void
  propagateFrom: (x: number, y: number) => void
}

function createEmptyGrid(): CellBase[][] {
  const grid: CellBase[][] = []
  for (let y = 0; y < GRID_SIZE; y++) {
    const row: CellBase[] = []
    for (let x = 0; x < GRID_SIZE; x++) {
      row.push(0)
    }
    grid.push(row)
  }
  return grid
}

export const useGridStore = create<GridStore>((set, get) => ({
  baseGrid: createEmptyGrid(),
  mouseGridX: -1,
  mouseGridY: -1,
  waveActive: false,
  waveStartTime: 0,
  propagationCells: new Map(),
  clearInfo: null,
  randomFillInfo: null,

  toggleCell: (x: number, y: number) => {
    if (x < 0 || x >= GRID_SIZE || y < 0 || y >= GRID_SIZE) return
    set((state) => {
      const newGrid = state.baseGrid.map((row) => [...row])
      newGrid[y][x] = state.baseGrid[y][x] === 0 ? 1 : 0
      return { baseGrid: newGrid }
    })
  },

  clearGrid: () => {
    set({
      clearInfo: {
        startTime: performance.now(),
        centerX: Math.floor(GRID_SIZE / 2),
        centerY: Math.floor(GRID_SIZE / 2),
      },
    })
    setTimeout(() => {
      set({ baseGrid: createEmptyGrid(), clearInfo: null })
    }, CLEAR_ANIMATION_MS)
  },

  randomFill: () => {
    const seed = Math.random()
    set({
      randomFillInfo: {
        startTime: performance.now(),
        seed,
      },
    })
    const newGrid = createEmptyGrid()
    const totalCells = GRID_SIZE * GRID_SIZE
    const fillCount = Math.floor(totalCells * 0.3)
    const positions: [number, number][] = []
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        positions.push([x, y])
      }
    }
    for (let i = positions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[positions[i], positions[j]] = [positions[j], positions[i]]
    }
    for (let i = 0; i < fillCount; i++) {
      const [x, y] = positions[i]
      newGrid[y][x] = 1
    }
    const maxDelay = (fillCount - 1) * RANDOM_FILL_DELAY
    setTimeout(() => {
      set({ baseGrid: newGrid, randomFillInfo: null })
    }, maxDelay + 200)
  },

  updateMousePosition: (x: number, y: number) => {
    set({ mouseGridX: x, mouseGridY: y })
  },

  startWave: () => {
    const state = get()
    if (!state.waveActive) {
      set({ waveActive: true, waveStartTime: performance.now() })
    } else {
      set({ waveStartTime: performance.now() })
    }
  },

  endWave: () => {
    set({ waveActive: false })
  },

  propagateFrom: (x: number, y: number) => {
    const state = get()
    if (x < 0 || x >= GRID_SIZE || y < 0 || y >= GRID_SIZE) return
    if (state.baseGrid[y][x] !== 1) return

    const directions = [
      [-1, -1], [0, -1], [1, -1],
      [-1, 0],          [1, 0],
      [-1, 1],  [0, 1], [1, 1],
    ]

    const visited = new Set<string>()
    const frontier: [number, number, number][] = [[x, y, 0]]
    visited.add(`${x},${y}`)

    const newPropagation = new Map(state.propagationCells)
    const newGrid = state.baseGrid.map((row) => [...row])
    const now = performance.now()

    let step = 0
    const maxSteps = GRID_SIZE
    const cellsByStep: [number, number][][] = []

    while (frontier.length > 0 && step < maxSteps) {
      const stepCells: [number, number][] = []
      const nextFrontier: [number, number, number][] = []

      for (const [cx, cy, d] of frontier) {
        for (const [dx, dy] of directions) {
          const nx = cx + dx
          const ny = cy + dy
          const key = `${nx},${ny}`
          if (
            nx >= 0 && nx < GRID_SIZE &&
            ny >= 0 && ny < GRID_SIZE &&
            !visited.has(key) &&
            newGrid[ny][nx] === 0
          ) {
            visited.add(key)
            newGrid[ny][nx] = 1
            stepCells.push([nx, ny])
            nextFrontier.push([nx, ny, d + 1])
          }
        }
      }

      if (stepCells.length > 0) {
        cellsByStep.push(stepCells)
      }
      frontier.length = 0
      frontier.push(...nextFrontier)
      step++
    }

    cellsByStep.forEach((cells, stepIndex) => {
      const delay = (stepIndex + 1) * 16
      setTimeout(() => {
        const s = get()
        const updated = new Map(s.propagationCells)
        const updatedGrid = s.baseGrid.map((row) => [...row])
        const t = performance.now()
        for (const [cx, cy] of cells) {
          const key = `${cx},${cy}`
          if (!updated.has(key)) {
            updated.set(key, { startTime: t })
            updatedGrid[cy][cx] = 1
          }
        }
        set({ propagationCells: updated, baseGrid: updatedGrid })
      }, delay)
    })

    for (let i = 0; i < cellsByStep.length && i < 5; i++) {
      for (const [cx, cy] of cellsByStep[i]) {
        newPropagation.set(`${cx},${cy}`, { startTime: now + (i + 1) * 16 })
      }
    }

    set({ propagationCells: newPropagation, baseGrid: newGrid })
  },
}))
