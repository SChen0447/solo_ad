import express, { Request, Response } from 'express'

const app = express()
const PORT = 3001

app.use(express.json())

export type TileType = 'path' | 'wall' | 'entangled' | 'trap' | 'observer' | 'start' | 'exit'

export interface LevelData {
  id: string
  name: string
  width: number
  height: number
  grid: TileType[][]
  entangledPairs?: Array<{ a: { x: number; y: number }; b: { x: number; y: number } }>
  difficulty: number
}

const generateSimplePath = (width: number, height: number, difficulty: number): TileType[][] => {
  const grid: TileType[][] = Array(height).fill(null).map(() => Array(width).fill('wall' as TileType))
  
  const startX = 1
  const startY = Math.floor(height / 2)
  const endX = width - 2
  const endY = Math.floor(height / 2)
  
  grid[startY][startX] = 'start'
  grid[endY][endX] = 'exit'
  
  let x = startX
  let y = startY
  
  while (x < endX || y !== endY) {
    if (x < endX && Math.random() > 0.3) {
      x++
    } else if (y < endY && Math.random() > 0.5) {
      y++
    } else if (y > endY && Math.random() > 0.5) {
      y--
    } else if (x < endX) {
      x++
    }
    if (grid[y][x] === 'wall') {
      grid[y][x] = 'path'
    }
  }
  
  const pathCount = Math.floor(width * height * 0.3)
  for (let i = 0; i < pathCount; i++) {
    const rx = Math.floor(Math.random() * (width - 2)) + 1
    const ry = Math.floor(Math.random() * (height - 2)) + 1
    if (grid[ry][rx] === 'wall') {
      grid[ry][rx] = 'path'
    }
  }
  
  if (difficulty >= 2) {
    const trapCount = Math.min(difficulty, 5)
    let placed = 0
    while (placed < trapCount) {
      const rx = Math.floor(Math.random() * (width - 2)) + 1
      const ry = Math.floor(Math.random() * (height - 2)) + 1
      if (grid[ry][rx] === 'path') {
        grid[ry][rx] = 'trap'
        placed++
      }
    }
  }
  
  if (difficulty >= 3) {
    let placed = false
    while (!placed) {
      const rx1 = Math.floor(Math.random() * (width - 4)) + 2
      const ry1 = Math.floor(Math.random() * (height - 4)) + 2
      const rx2 = Math.floor(Math.random() * (width - 4)) + 2
      const ry2 = Math.floor(Math.random() * (height - 4)) + 2
      if (grid[ry1][rx1] === 'path' && grid[ry2][rx2] === 'path' && (rx1 !== rx2 || ry1 !== ry2)) {
        grid[ry1][rx1] = 'entangled'
        grid[ry2][rx2] = 'entangled'
        placed = true
      }
    }
  }
  
  if (difficulty >= 4) {
    let placed = 0
    while (placed < 2) {
      const rx = Math.floor(Math.random() * (width - 2)) + 1
      const ry = Math.floor(Math.random() * (height - 2)) + 1
      if (grid[ry][rx] === 'path') {
        grid[ry][rx] = 'observer'
        placed++
      }
    }
  }
  
  return grid
}

const defaultLevels: LevelData[] = [
  {
    id: 'level-1',
    name: '第一关：初识量子',
    width: 15,
    height: 15,
    grid: generateSimplePath(15, 15, 1),
    difficulty: 1,
  },
  {
    id: 'level-2',
    name: '第二关：概率扩散',
    width: 15,
    height: 15,
    grid: generateSimplePath(15, 15, 2),
    difficulty: 2,
  },
  {
    id: 'level-3',
    name: '第三关：量子纠缠',
    width: 15,
    height: 15,
    grid: generateSimplePath(15, 15, 3),
    difficulty: 3,
  },
  {
    id: 'level-4',
    name: '第四关：观测站',
    width: 15,
    height: 15,
    grid: generateSimplePath(15, 15, 4),
    difficulty: 4,
  },
  {
    id: 'level-5',
    name: '第五关：量子迷宫',
    width: 15,
    height: 15,
    grid: generateSimplePath(15, 15, 5),
    difficulty: 5,
  },
]

let levels: LevelData[] = [...defaultLevels]
let customLevels: LevelData[] = []

app.get('/api/levels', (_req: Request, res: Response) => {
  res.json([...levels, ...customLevels])
})

app.get('/api/levels/:id', (req: Request, res: Response) => {
  const { id } = req.params
  const level = [...levels, ...customLevels].find(l => l.id === id)
  if (level) {
    res.json(level)
  } else {
    res.status(404).json({ error: '关卡不存在' })
  }
})

app.post('/api/levels', (req: Request, res: Response) => {
  const levelData: LevelData = req.body
  const newLevel: LevelData = {
    ...levelData,
    id: `custom-${Date.now()}`,
  }
  customLevels.push(newLevel)
  res.status(201).json(newLevel)
})

app.listen(PORT, () => {
  console.log(`Quantum Maze Server running on http://localhost:${PORT}`)
})
