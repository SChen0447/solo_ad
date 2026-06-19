import { v4 as uuidv4 } from 'uuid'

export type ElementType = 'rectangle' | 'circle' | 'button' | 'text'

export interface RecognizedElement {
  id: string
  type: ElementType
  x: number
  y: number
  width: number
  height: number
  text?: string
  radius?: number
}

interface Stroke {
  points: { x: number; y: number }[]
  color: string
  lineWidth: number
}

interface BoundingBox {
  minX: number
  minY: number
  maxX: number
  maxY: number
  width: number
  height: number
}

function getBoundingBox(strokes: Stroke[]): BoundingBox {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity

  for (const stroke of strokes) {
    for (const point of stroke.points) {
      minX = Math.min(minX, point.x)
      minY = Math.min(minY, point.y)
      maxX = Math.max(maxX, point.x)
      maxY = Math.max(maxY, point.y)
    }
  }

  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX,
    height: maxY - minY,
  }
}

function getBoundingBoxForStroke(stroke: Stroke): BoundingBox {
  return getBoundingBox([stroke])
}

function calculateTotalStrokeLength(stroke: Stroke): number {
  let length = 0
  for (let i = 1; i < stroke.points.length; i++) {
    const dx = stroke.points[i].x - stroke.points[i - 1].x
    const dy = stroke.points[i].y - stroke.points[i - 1].y
    length += Math.sqrt(dx * dx + dy * dy)
  }
  return length
}

function isClosedShape(stroke: Stroke, tolerance: number = 30): boolean {
  if (stroke.points.length < 10) return false
  const start = stroke.points[0]
  const end = stroke.points[stroke.points.length - 1]
  const distance = Math.sqrt(
    Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2)
  )
  return distance < tolerance
}

function detectCorners(stroke: Stroke): { x: number; y: number }[] {
  const corners: { x: number; y: number }[] = []
  const points = stroke.points
  if (points.length < 10) return corners

  const windowSize = Math.max(3, Math.floor(points.length / 20))

  for (let i = windowSize; i < points.length - windowSize; i++) {
    const prev = points[i - windowSize]
    const curr = points[i]
    const next = points[i + windowSize]

    const angle1 = Math.atan2(curr.y - prev.y, curr.x - prev.x)
    const angle2 = Math.atan2(next.y - curr.y, next.x - curr.x)
    let angleDiff = Math.abs(angle2 - angle1)
    if (angleDiff > Math.PI) angleDiff = 2 * Math.PI - angleDiff

    if (angleDiff > Math.PI / 4) {
      const lastCorner = corners[corners.length - 1]
      if (
        !lastCorner ||
        Math.sqrt(
          Math.pow(curr.x - lastCorner.x, 2) + Math.pow(curr.y - lastCorner.y, 2)
        ) > 30
      ) {
        corners.push({ x: curr.x, y: curr.y })
      }
    }
  }

  return corners
}

function isCircular(stroke: Stroke): boolean {
  const bbox = getBoundingBoxForStroke(stroke)
  if (bbox.width < 20 || bbox.height < 20) return false

  const aspectRatio = bbox.width / bbox.height
  if (aspectRatio < 0.6 || aspectRatio > 1.6) return false

  const centerX = (bbox.minX + bbox.maxX) / 2
  const centerY = (bbox.minY + bbox.maxY) / 2
  const avgRadius = (bbox.width + bbox.height) / 4

  let variance = 0
  for (const point of stroke.points) {
    const distance = Math.sqrt(
      Math.pow(point.x - centerX, 2) + Math.pow(point.y - centerY, 2)
    )
    variance += Math.pow(distance - avgRadius, 2)
  }
  variance /= stroke.points.length

  const normalizedVariance = variance / (avgRadius * avgRadius)
  return normalizedVariance < 0.15
}

function isRectangle(stroke: Stroke): boolean {
  if (!isClosedShape(stroke)) return false

  const corners = detectCorners(stroke)
  const bbox = getBoundingBoxForStroke(stroke)

  if (bbox.width < 30 || bbox.height < 20) return false

  const strokeLength = calculateTotalStrokeLength(stroke)
  const bboxPerimeter = 2 * (bbox.width + bbox.height)
  const lengthRatio = strokeLength / bboxPerimeter

  if (lengthRatio < 0.7 || lengthRatio > 1.5) return false

  return corners.length >= 3 && corners.length <= 6
}

function isButtonShape(strokes: Stroke[], bbox: BoundingBox): boolean {
  if (bbox.width < 50 || bbox.height < 25) return false
  if (bbox.width > 300 || bbox.height > 100) return false

  const aspectRatio = bbox.width / bbox.height
  return aspectRatio >= 1.5 && aspectRatio <= 8
}

function estimateText(strokes: Stroke[]): string {
  const bbox = getBoundingBox(strokes)
  const numStrokes = strokes.length

  if (numStrokes <= 1) return '文本'
  if (numStrokes <= 3) return '按钮'
  if (numStrokes <= 5) return '标题'
  return '文本内容'
}

function groupStrokesByProximity(strokes: Stroke[]): Stroke[][] {
  if (strokes.length === 0) return []

  const groups: Stroke[][] = []
  const visited = new Set<number>()

  const strokeBboxes = strokes.map((s) => getBoundingBoxForStroke(s))

  const strokesOverlap = (i: number, j: number): boolean => {
    const a = strokeBboxes[i]
    const b = strokeBboxes[j]
    const gap = 20
    return !(
      a.maxX + gap < b.minX ||
      b.maxX + gap < a.minX ||
      a.maxY + gap < b.minY ||
      b.maxY + gap < a.minY
    )
  }

  for (let i = 0; i < strokes.length; i++) {
    if (visited.has(i)) continue

    const group: Stroke[] = [strokes[i]]
    visited.add(i)

    let added = true
    while (added) {
      added = false
      for (let j = 0; j < strokes.length; j++) {
        if (visited.has(j)) continue
        for (let k = 0; k < group.length; k++) {
          const idx = strokes.indexOf(group[k])
          if (strokesOverlap(idx, j)) {
            group.push(strokes[j])
            visited.add(j)
            added = true
            break
          }
        }
      }
    }

    groups.push(group)
  }

  return groups
}

export function recognizeShapes(canvas: HTMLCanvasElement): RecognizedElement[] {
  const ctx = canvas.getContext('2d')
  if (!ctx) return []

  const elements: RecognizedElement[] = []
  const strokes = extractStrokesFromCanvas(canvas)

  if (strokes.length === 0) return []

  const groups = groupStrokesByProximity(strokes)

  for (const group of groups) {
    const bbox = getBoundingBox(group)

    if (bbox.width < 15 || bbox.height < 15) continue

    if (group.length === 1 && isCircular(group[0])) {
      const radius = Math.max(bbox.width, bbox.height) / 2
      elements.push({
        id: uuidv4(),
        type: 'circle',
        x: Math.round(bbox.minX),
        y: Math.round(bbox.minY),
        width: Math.round(bbox.width),
        height: Math.round(bbox.height),
        radius: Math.round(radius),
      })
    } else if (group.length === 1 && isRectangle(group[0])) {
      if (isButtonShape(group, bbox)) {
        elements.push({
          id: uuidv4(),
          type: 'button',
          x: Math.round(bbox.minX),
          y: Math.round(bbox.minY),
          width: Math.round(bbox.width),
          height: Math.round(bbox.height),
          text: '按钮',
        })
      } else {
        elements.push({
          id: uuidv4(),
          type: 'rectangle',
          x: Math.round(bbox.minX),
          y: Math.round(bbox.minY),
          width: Math.round(bbox.width),
          height: Math.round(bbox.height),
        })
      }
    } else if (group.length >= 2) {
      if (isButtonShape(group, bbox)) {
        elements.push({
          id: uuidv4(),
          type: 'button',
          x: Math.round(bbox.minX),
          y: Math.round(bbox.minY),
          width: Math.round(bbox.width),
          height: Math.round(bbox.height),
          text: estimateText(group),
        })
      } else if (isTextLike(group, bbox)) {
        elements.push({
          id: uuidv4(),
          type: 'text',
          x: Math.round(bbox.minX),
          y: Math.round(bbox.minY),
          width: Math.round(bbox.width),
          height: Math.round(bbox.height),
          text: estimateText(group),
        })
      } else {
        elements.push({
          id: uuidv4(),
          type: 'rectangle',
          x: Math.round(bbox.minX),
          y: Math.round(bbox.minY),
          width: Math.round(bbox.width),
          height: Math.round(bbox.height),
        })
      }
    }
  }

  return elements.sort((a, b) => a.y - b.y || a.x - b.x)
}

function isTextLike(strokes: Stroke[], bbox: BoundingBox): boolean {
  if (strokes.length < 2) return false

  const avgStrokeHeight = bbox.height
  const avgStrokeWidth = bbox.width / strokes.length

  if (avgStrokeHeight < 15) return false
  if (bbox.height > bbox.width * 0.8) return false

  return strokes.length >= 2 && strokes.length <= 15
}

function extractStrokesFromCanvas(canvas: HTMLCanvasElement): Stroke[] {
  const ctx = canvas.getContext('2d')
  if (!ctx) return []

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const data = imageData.data
  const strokes: Stroke[] = []
  const visited = new Set<string>()

  const isDarkPixel = (x: number, y: number): boolean => {
    if (x < 0 || x >= canvas.width || y < 0 || y >= canvas.height) return false
    const idx = (y * canvas.width + x) * 4
    const r = data[idx]
    const g = data[idx + 1]
    const b = data[idx + 2]
    const a = data[idx + 3]
    return a > 50 && (r + g + b) / 3 < 200
  }

  const getPixelColor = (x: number, y: number): string => {
    const idx = (y * canvas.width + x) * 4
    const r = data[idx]
    const g = data[idx + 1]
    const b = data[idx + 2]
    if (b > 100 && r < 150 && g < 150) return '#4A90D9'
    if (r > 150 && g < 150 && b < 150) return '#FF6B6B'
    if (g > 100 && r < 150 && b < 150) return '#4CAF50'
    return '#000000'
  }

  const traceStroke = (startX: number, startY: number): Stroke | null => {
    const points: { x: number; y: number }[] = []
    let x = startX
    let y = startY
    let color = '#000000'
    let firstColorSet = false

    while (true) {
      const key = `${x},${y}`
      if (visited.has(key)) break

      visited.add(key)
      points.push({ x: x + 0.5, y: y + 0.5 })

      if (!firstColorSet && isDarkPixel(x, y)) {
        color = getPixelColor(x, y)
        firstColorSet = true
      }

      const neighbors = [
        { dx: 1, dy: 0 },
        { dx: 1, dy: 1 },
        { dx: 0, dy: 1 },
        { dx: -1, dy: 1 },
        { dx: -1, dy: 0 },
        { dx: -1, dy: -1 },
        { dx: 0, dy: -1 },
        { dx: 1, dy: -1 },
      ]

      let found = false
      for (const n of neighbors) {
        const nx = x + n.dx
        const ny = y + n.dy
        const nkey = `${nx},${ny}`
        if (!visited.has(nkey) && isDarkPixel(nx, ny)) {
          x = nx
          y = ny
          found = true
          break
        }
      }

      if (!found) break
    }

    if (points.length < 5) return null

    return {
      points: simplifyPoints(points, 2),
      color,
      lineWidth: 2,
    }
  }

  for (let y = 0; y < canvas.height; y++) {
    for (let x = 0; x < canvas.width; x++) {
      const key = `${x},${y}`
      if (!visited.has(key) && isDarkPixel(x, y)) {
        const stroke = traceStroke(x, y)
        if (stroke) {
          strokes.push(stroke)
        }
      }
    }
  }

  return strokes
}

function simplifyPoints(
  points: { x: number; y: number }[],
  tolerance: number
): { x: number; y: number }[] {
  if (points.length <= 2) return points

  const result: { x: number; y: number }[] = [points[0]]
  let lastPoint = points[0]

  for (let i = 1; i < points.length - 1; i++) {
    const dist = Math.sqrt(
      Math.pow(points[i].x - lastPoint.x, 2) +
        Math.pow(points[i].y - lastPoint.y, 2)
    )
    if (dist >= tolerance) {
      result.push(points[i])
      lastPoint = points[i]
    }
  }

  result.push(points[points.length - 1])
  return result
}
