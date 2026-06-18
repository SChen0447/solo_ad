export interface Rect {
  x: number
  y: number
  width: number
  height: number
}

export const MAP_WIDTH = 900
export const MAP_HEIGHT = 700
export const BG_COLOR = '#2a2a2a'
export const OBSTACLE_COLOR = '#4a4a4a'

function createRect(x: number, y: number, w: number, h: number): Rect {
  return { x, y, width: w, height: h }
}

function createLShapes(): Rect[] {
  const shapes: Rect[] = []

  shapes.push(createRect(80, 80, 120, 25))
  shapes.push(createRect(80, 80, 25, 100))

  shapes.push(createRect(420, 50, 30, 130))
  shapes.push(createRect(420, 50, 100, 30))

  shapes.push(createRect(720, 120, 120, 25))
  shapes.push(createRect(815, 120, 25, 100))

  shapes.push(createRect(60, 320, 25, 140))
  shapes.push(createRect(60, 320, 100, 25))

  shapes.push(createRect(350, 280, 150, 25))
  shapes.push(createRect(475, 280, 25, 120))

  shapes.push(createRect(600, 350, 25, 150))
  shapes.push(createRect(600, 350, 120, 25))

  shapes.push(createRect(180, 520, 100, 25))
  shapes.push(createRect(255, 520, 25, 100))

  shapes.push(createRect(400, 550, 25, 100))
  shapes.push(createRect(400, 550, 110, 25))

  shapes.push(createRect(700, 500, 130, 25))
  shapes.push(createRect(700, 500, 25, 100))

  return shapes
}

export const obstacles: Rect[] = createLShapes()

export function pointInRect(px: number, py: number, rect: Rect): boolean {
  return px >= rect.x && px <= rect.x + rect.width && py >= rect.y && py <= rect.y + rect.height
}

export function circleRectCollision(
  cx: number,
  cy: number,
  radius: number,
  rect: Rect
): boolean {
  const closestX = Math.max(rect.x, Math.min(cx, rect.x + rect.width))
  const closestY = Math.max(rect.y, Math.min(cy, rect.y + rect.height))
  const dx = cx - closestX
  const dy = cy - closestY
  return dx * dx + dy * dy <= radius * radius
}

export function isPositionValid(
  x: number,
  y: number,
  radius: number
): boolean {
  if (x - radius < 0 || x + radius > MAP_WIDTH || y - radius < 0 || y + radius > MAP_HEIGHT) {
    return false
  }
  for (const obs of obstacles) {
    if (circleRectCollision(x, y, radius, obs)) {
      return false
    }
  }
  return true
}

export function lineIntersectsRect(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  rect: Rect
): boolean {
  if (pointInRect(x1, y1, rect) || pointInRect(x2, y2, rect)) {
    return true
  }

  const left = rect.x
  const right = rect.x + rect.width
  const top = rect.y
  const bottom = rect.y + rect.height

  return (
    lineIntersectsLine(x1, y1, x2, y2, left, top, right, top) ||
    lineIntersectsLine(x1, y1, x2, y2, right, top, right, bottom) ||
    lineIntersectsLine(x1, y1, x2, y2, left, bottom, right, bottom) ||
    lineIntersectsLine(x1, y1, x2, y2, left, top, left, bottom)
  )
}

function lineIntersectsLine(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  x3: number,
  y3: number,
  x4: number,
  y4: number
): boolean {
  const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4)
  if (denom === 0) return false

  const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom
  const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom

  return t >= 0 && t <= 1 && u >= 0 && u <= 1
}

export function isLineOfSightClear(
  x1: number,
  y1: number,
  x2: number,
  y2: number
): boolean {
  for (const obs of obstacles) {
    if (lineIntersectsRect(x1, y1, x2, y2, obs)) {
      return false
    }
  }
  return true
}

export function getRayObstacleIntersection(
  x1: number,
  y1: number,
  x2: number,
  y2: number
): { x: number; y: number; obstacle: Rect } | null {
  let closest: { x: number; y: number; obstacle: Rect; dist: number } | null = null

  for (const obs of obstacles) {
    const intersection = getLineRectIntersection(x1, y1, x2, y2, obs)
    if (intersection) {
      const dist = Math.hypot(intersection.x - x1, intersection.y - y1)
      if (!closest || dist < closest.dist) {
        closest = { x: intersection.x, y: intersection.y, obstacle: obs, dist }
      }
    }
  }

  return closest ? { x: closest.x, y: closest.y, obstacle: closest.obstacle } : null
}

function getLineRectIntersection(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  rect: Rect
): { x: number; y: number } | null {
  const left = rect.x
  const right = rect.x + rect.width
  const top = rect.y
  const bottom = rect.y + rect.height

  const edges = [
    [left, top, right, top],
    [right, top, right, bottom],
    [left, bottom, right, bottom],
    [left, top, left, bottom],
  ]

  let closest: { x: number; y: number; dist: number } | null = null

  for (const [ex1, ey1, ex2, ey2] of edges) {
    const point = getLineLineIntersection(x1, y1, x2, y2, ex1, ey1, ex2, ey2)
    if (point) {
      const dist = Math.hypot(point.x - x1, point.y - y1)
      if (!closest || dist < closest.dist) {
        closest = { x: point.x, y: point.y, dist }
      }
    }
  }

  return closest ? { x: closest.x, y: closest.y } : null
}

function getLineLineIntersection(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  x3: number,
  y3: number,
  x4: number,
  y4: number
): { x: number; y: number } | null {
  const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4)
  if (denom === 0) return null

  const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom
  const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom

  if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
    return {
      x: x1 + t * (x2 - x1),
      y: y1 + t * (y2 - y1),
    }
  }
  return null
}

export const playerStartPos = { x: 100, y: 600 }

export const enemyPatrolPaths: { x: number; y: number }[][] = [
  [
    { x: 200, y: 200 },
    { x: 350, y: 200 },
    { x: 350, y: 450 },
    { x: 200, y: 450 },
  ],
  [
    { x: 550, y: 150 },
    { x: 780, y: 150 },
    { x: 780, y: 400 },
    { x: 550, y: 400 },
  ],
  [
    { x: 150, y: 550 },
    { x: 500, y: 620 },
    { x: 780, y: 550 },
  ],
]
