export interface StrokePoint {
  x: number
  y: number
}

export interface Stroke {
  points: StrokePoint[]
  color: string
  lineWidth: number
}

export interface CanvasDrawerState {
  strokes: Stroke[]
  redoStack: Stroke[]
}

export function createCanvasDrawer(): CanvasDrawerState {
  return {
    strokes: [],
    redoStack: [],
  }
}

export function drawStroke(
  state: CanvasDrawerState,
  stroke: Stroke
): CanvasDrawerState {
  return {
    ...state,
    strokes: [...state.strokes, stroke],
    redoStack: [],
  }
}

export function undoStroke(state: CanvasDrawerState): CanvasDrawerState {
  if (state.strokes.length === 0) return state
  const newStrokes = [...state.strokes]
  const lastStroke = newStrokes.pop()!
  return {
    ...state,
    strokes: newStrokes,
    redoStack: [...state.redoStack, lastStroke],
  }
}

export function redoStroke(state: CanvasDrawerState): CanvasDrawerState {
  if (state.redoStack.length === 0) return state
  const newRedoStack = [...state.redoStack]
  const stroke = newRedoStack.pop()!
  return {
    ...state,
    strokes: [...state.strokes, stroke],
    redoStack: newRedoStack,
  }
}

export function clearCanvas(state: CanvasDrawerState): CanvasDrawerState {
  return {
    strokes: [],
    redoStack: [],
  }
}

export function renderStrokes(
  ctx: CanvasRenderingContext2D,
  strokes: Stroke[],
  canvasWidth: number,
  canvasHeight: number,
  gridSize: number = 20,
  gridColor: string = '#ddd'
): void {
  ctx.clearRect(0, 0, canvasWidth, canvasHeight)

  ctx.fillStyle = '#f5f5f5'
  ctx.fillRect(0, 0, canvasWidth, canvasHeight)

  ctx.strokeStyle = gridColor
  ctx.lineWidth = 1
  for (let x = 0; x <= canvasWidth; x += gridSize) {
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x, canvasHeight)
    ctx.stroke()
  }
  for (let y = 0; y <= canvasHeight; y += gridSize) {
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(canvasWidth, y)
    ctx.stroke()
  }

  for (const stroke of strokes) {
    if (stroke.points.length < 2) continue
    ctx.strokeStyle = stroke.color
    ctx.lineWidth = stroke.lineWidth
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.beginPath()
    ctx.moveTo(stroke.points[0].x, stroke.points[0].y)
    for (let i = 1; i < stroke.points.length; i++) {
      ctx.lineTo(stroke.points[i].x, stroke.points[i].y)
    }
    ctx.stroke()
  }
}
