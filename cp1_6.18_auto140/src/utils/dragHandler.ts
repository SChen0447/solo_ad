import type { PuzzlePiece } from './puzzleSplitter'

export const SNAP_DISTANCE = 20
export const SCALE_PULSE_DURATION = 200
export const SCALE_PULSE_AMOUNT = 1.05

export interface DragState {
  isDragging: boolean
  pieceId: string | null
  startX: number
  startY: number
  offsetX: number
  offsetY: number
  currentX: number
  currentY: number
  path: { x: number; y: number }[]
}

export interface CollisionResult {
  collides: boolean
  overlappingPieceId: string | null
}

export const createInitialDragState = (): DragState => ({
  isDragging: false,
  pieceId: null,
  startX: 0,
  startY: 0,
  offsetX: 0,
  offsetY: 0,
  currentX: 0,
  currentY: 0,
  path: []
})

export const checkSnapAlignment = (
  piece: PuzzlePiece,
  targetX: number,
  targetY: number
): { shouldSnap: boolean; snapX: number; snapY: number } => {
  const dx = Math.abs(targetX - piece.targetX)
  const dy = Math.abs(targetY - piece.targetY)
  
  const shouldSnap = dx <= SNAP_DISTANCE && dy <= SNAP_DISTANCE
  
  return {
    shouldSnap,
    snapX: piece.targetX,
    snapY: piece.targetY
  }
}

export const checkCollision = (
  piece: PuzzlePiece,
  newX: number,
  newY: number,
  allPieces: PuzzlePiece[],
  excludeId: string
): CollisionResult => {
  for (const other of allPieces) {
    if (other.id === excludeId || !other.isPlaced) continue
    
    const overlapX = 
      newX < other.x + other.width &&
      newX + piece.width > other.x
    const overlapY = 
      newY < other.y + other.height &&
      newY + piece.height > other.y
    
    if (overlapX && overlapY) {
      return {
        collides: true,
        overlappingPieceId: other.id
      }
    }
  }
  
  return {
    collides: false,
    overlappingPieceId: null
  }
}

export const handleDragStart = (
  e: React.MouseEvent | React.TouchEvent,
  piece: PuzzlePiece,
  containerRect: DOMRect
): DragState => {
  let clientX: number, clientY: number
  
  if ('touches' in e) {
    clientX = e.touches[0].clientX
    clientY = e.touches[0].clientY
  } else {
    clientX = e.clientX
    clientY = e.clientY
  }
  
  const x = clientX - containerRect.left
  const y = clientY - containerRect.top
  
  return {
    isDragging: true,
    pieceId: piece.id,
    startX: x,
    startY: y,
    offsetX: x - piece.x,
    offsetY: y - piece.y,
    currentX: x,
    currentY: y,
    path: [{ x, y }]
  }
}

export const handleDragMove = (
  e: MouseEvent | TouchEvent,
  dragState: DragState,
  piece: PuzzlePiece,
  allPieces: PuzzlePiece[],
  containerRect: DOMRect
): { newX: number; newY: number; isSnapping: boolean } => {
  let clientX: number, clientY: number
  
  if ('touches' in e) {
    clientX = e.touches[0].clientX
    clientY = e.touches[0].clientY
  } else {
    clientX = e.clientX
    clientY = e.clientY
  }
  
  const x = clientX - containerRect.left
  const y = clientY - containerRect.top
  
  let newX = x - dragState.offsetX
  let newY = y - dragState.offsetY
  
  const padding = 10
  newX = Math.max(padding, Math.min(containerRect.width - piece.width - padding, newX))
  newY = Math.max(padding, Math.min(containerRect.height - piece.height - padding, newY))
  
  const { shouldSnap, snapX, snapY } = checkSnapAlignment(piece, newX, newY)
  
  if (shouldSnap) {
    return {
      newX: snapX,
      newY: snapY,
      isSnapping: true
    }
  }
  
  const collision = checkCollision(piece, newX, newY, allPieces, piece.id)
  if (collision.collides) {
    return {
      newX: piece.x,
      newY: piece.y,
      isSnapping: false
    }
  }
  
  return {
    newX,
    newY,
    isSnapping: false
  }
}

export const handleDragEnd = (
  piece: PuzzlePiece,
  finalX: number,
  finalY: number
): { isPlaced: boolean; x: number; y: number } => {
  const { shouldSnap, snapX, snapY } = checkSnapAlignment(piece, finalX, finalY)
  
  if (shouldSnap) {
    return {
      isPlaced: true,
      x: snapX,
      y: snapY
    }
  }
  
  return {
    isPlaced: false,
    x: finalX,
    y: finalY
  }
}

export const triggerScalePulse = (
  element: HTMLElement,
  duration: number = SCALE_PULSE_DURATION
): void => {
  element.style.transition = `transform ${duration}ms ease-in-out`
  element.style.transform = `scale(${SCALE_PULSE_AMOUNT})`
  
  setTimeout(() => {
    element.style.transform = 'scale(1)'
  }, duration)
}

export const getDistance = (x1: number, y1: number, x2: number, y2: number): number => {
  return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2))
}

export const clamp = (value: number, min: number, max: number): number => {
  return Math.max(min, Math.min(max, value))
}
