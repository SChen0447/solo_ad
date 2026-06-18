import { v4 as uuidv4 } from 'uuid'
import { Star } from '../module2/store'

let starCounter = 0

const defaultColors = [
  '#ff6b6b',
  '#4ecdc4',
  '#ffe66d',
  '#95e1d3',
  '#f38181',
  '#aa96da',
  '#fcbad3',
  '#a8d8ea',
]

export const generateStarName = (): string => {
  starCounter++
  return `Star-${String(starCounter).padStart(2, '0')}`
}

export const getDefaultColor = (): string => {
  return defaultColors[starCounter % defaultColors.length]
}

export const createStar = (options?: Partial<Star>): Star => {
  const name = options?.name || generateStarName()
  const color = options?.color || getDefaultColor()
  const position = options?.position || {
    x: (Math.random() - 0.5) * 40,
    y: (Math.random() - 0.5) * 40,
    z: (Math.random() - 0.5) * 40,
  }
  const velocity = options?.velocity || {
    x: (Math.random() - 0.5) * 2,
    y: (Math.random() - 0.5) * 2,
    z: (Math.random() - 0.5) * 2,
  }

  return {
    id: options?.id || uuidv4(),
    name,
    mass: options?.mass ?? 1,
    position,
    velocity,
    color,
    trail: [],
    initialState: {
      position: { ...position },
      velocity: { ...velocity },
    },
  }
}

export const cloneStar = (star: Star): Star => ({
  ...star,
  position: { ...star.position },
  velocity: { ...star.velocity },
  trail: star.trail.map((t) => ({ ...t })),
  initialState: {
    position: { ...star.initialState.position },
    velocity: { ...star.initialState.velocity },
  },
})

export const getStarRadius = (mass: number): number => {
  return mass * 0.1
}

export const getVelocityMagnitude = (
  velocity: { x: number; y: number; z: number }
): number => {
  return Math.sqrt(
    velocity.x * velocity.x + velocity.y * velocity.y + velocity.z * velocity.z
  )
}

export const validateStarParams = (params: {
  mass?: number
  position?: { x: number; y: number; z: number }
  velocity?: { x: number; y: number; z: number }
}): { valid: boolean; errors: string[] } => {
  const errors: string[] = []

  if (params.mass !== undefined) {
    if (params.mass < 0.1 || params.mass > 100) {
      errors.push('质量必须在 0.1 到 100 太阳质量之间')
    }
  }

  if (params.position) {
    const { x, y, z } = params.position
    if (x < -50 || x > 50 || y < -50 || y > 50 || z < -50 || z > 50) {
      errors.push('位置坐标必须在 -50 到 50 之间')
    }
  }

  if (params.velocity) {
    const { x, y, z } = params.velocity
    if (x < -10 || x > 10 || y < -10 || y > 10 || z < -10 || z > 10) {
      errors.push('速度分量必须在 -10 到 10 之间')
    }
  }

  return { valid: errors.length === 0, errors }
}

export const resetCounter = () => {
  starCounter = 0
}
