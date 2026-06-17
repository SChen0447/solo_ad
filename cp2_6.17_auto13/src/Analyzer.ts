export interface StrokePoint {
  x: number
  y: number
  timestamp: number
  pressure: number
}

export interface Stroke {
  points: StrokePoint[]
}

export interface Features {
  avgSlope: number
  avgSpeed: number
  totalLength: number
  spacingCV: number
  avgPressure: number
  pressureCV: number
}

function distance(p1: StrokePoint, p2: StrokePoint): number {
  return Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2)
}

function mean(arr: number[]): number {
  if (arr.length === 0) return 0
  return arr.reduce((s, v) => s + v, 0) / arr.length
}

function stddev(arr: number[]): number {
  if (arr.length < 2) return 0
  const m = mean(arr)
  return Math.sqrt(arr.reduce((s, v) => s + (v - m) ** 2, 0) / (arr.length - 1))
}

export function analyzeStrokes(strokes: Stroke[]): Features {
  if (strokes.length === 0 || strokes.every(s => s.points.length < 2)) {
    return {
      avgSlope: 0,
      avgSpeed: 0,
      totalLength: 0,
      spacingCV: 0,
      avgPressure: 0,
      pressureCV: 0
    }
  }

  const slopes: number[] = []
  const speeds: number[] = []
  const lengths: number[] = []
  const spacings: number[] = []
  const pressures: number[] = []

  for (const stroke of strokes) {
    if (stroke.points.length < 2) continue

    const first = stroke.points[0]
    const last = stroke.points[stroke.points.length - 1]

    const dx = last.x - first.x
    const dy = last.y - first.y
    const slope = dx === 0 ? (dy > 0 ? 90 : -90) : (Math.atan2(dy, dx) * 180) / Math.PI
    slopes.push(slope)

    let strokeLength = 0
    for (let i = 1; i < stroke.points.length; i++) {
      const p1 = stroke.points[i - 1]
      const p2 = stroke.points[i]
      const segLen = distance(p1, p2)
      strokeLength += segLen

      const dt = p2.timestamp - p1.timestamp
      if (dt > 0) {
        speeds.push(segLen / dt)
      }
    }
    lengths.push(strokeLength)

    for (let i = 0; i < stroke.points.length; i++) {
      pressures.push(stroke.points[i].pressure)
    }
  }

  for (let i = 1; i < strokes.length; i++) {
    const prevStroke = strokes[i - 1]
    const currStroke = strokes[i]
    if (prevStroke.points.length > 0 && currStroke.points.length > 0) {
      const prevEnd = prevStroke.points[prevStroke.points.length - 1]
      const currStart = currStroke.points[0]
      spacings.push(distance(prevEnd, currStart))
    }
  }

  const totalLength = lengths.reduce((s, v) => s + v, 0)
  const spacingMean = mean(spacings)
  const spacingStd = stddev(spacings)
  const spacingCV = spacingMean > 0 ? spacingStd / spacingMean : 0
  const pressureMean = mean(pressures)
  const pressureStd = stddev(pressures)
  const pressureCV = pressureMean > 0 ? pressureStd / pressureMean : 0

  return {
    avgSlope: mean(slopes),
    avgSpeed: mean(speeds),
    totalLength,
    spacingCV,
    avgPressure: pressureMean,
    pressureCV
  }
}
