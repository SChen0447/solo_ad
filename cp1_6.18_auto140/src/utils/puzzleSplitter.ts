import cuid from 'cuid'

export interface PuzzlePiece {
  id: string
  row: number
  col: number
  x: number
  y: number
  targetX: number
  targetY: number
  rotation: number
  isPlaced: boolean
  placedBy?: string
  imageDataUrl: string
  width: number
  height: number
}

export interface SplitResult {
  pieces: PuzzlePiece[]
  imageWidth: number
  imageHeight: number
  pieceWidth: number
  pieceHeight: number
}

const loadImage = (dataUrl: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = dataUrl
  })
}

const easeOutBounce = (t: number): number => {
  const n1 = 7.5625
  const d1 = 2.75

  if (t < 1 / d1) {
    return n1 * t * t
  } else if (t < 2 / d1) {
    return n1 * (t -= 1.5 / d1) * t + 0.75
  } else if (t < 2.5 / d1) {
    return n1 * (t -= 2.25 / d1) * t + 0.9375
  } else {
    return n1 * (t -= 2.625 / d1) * t + 0.984375
  }
}

const calculateScatterPosition = (
  centerX: number,
  centerY: number,
  pieceWidth: number,
  pieceHeight: number,
  canvasWidth: number,
  canvasHeight: number,
  index: number,
  total: number
): { x: number; y: number } => {
  const angle = (index / total) * Math.PI * 2 + Math.random() * 0.5
  const minDistance = Math.max(pieceWidth, pieceHeight) * 0.8
  const maxDistance = Math.min(canvasWidth, canvasHeight) * 0.4
  const distance = minDistance + Math.random() * (maxDistance - minDistance)
  
  const progress = easeOutBounce(Math.min(1, distance / maxDistance))
  const actualDistance = minDistance + (maxDistance - minDistance) * progress
  
  let x = centerX + Math.cos(angle) * actualDistance - pieceWidth / 2
  let y = centerY + Math.sin(angle) * actualDistance - pieceHeight / 2
  
  const padding = 20
  x = Math.max(padding, Math.min(canvasWidth - pieceWidth - padding, x))
  y = Math.max(padding, Math.min(canvasHeight - pieceHeight - padding, y))
  
  return { x, y }
}

export const splitImage = async (
  imageDataUrl: string,
  gridSize: number,
  canvasWidth: number,
  canvasHeight: number
): Promise<SplitResult> => {
  const img = await loadImage(imageDataUrl)
  
  const maxWidth = canvasWidth * 0.6
  const maxHeight = canvasHeight * 0.6
  let displayWidth = img.width
  let displayHeight = img.height
  
  if (displayWidth > maxWidth) {
    displayHeight = (maxWidth / displayWidth) * displayHeight
    displayWidth = maxWidth
  }
  if (displayHeight > maxHeight) {
    displayWidth = (maxHeight / displayHeight) * displayWidth
    displayHeight = maxHeight
  }
  
  const pieceWidth = displayWidth / gridSize
  const pieceHeight = displayHeight / gridSize
  
  const offsetX = (canvasWidth - displayWidth) / 2
  const offsetY = (canvasHeight - displayHeight) / 2
  
  const pieces: PuzzlePiece[] = []
  const total = gridSize * gridSize
  
  for (let row = 0; row < gridSize; row++) {
    for (let col = 0; col < gridSize; col++) {
      const canvas = document.createElement('canvas')
      canvas.width = pieceWidth
      canvas.height = pieceHeight
      const ctx = canvas.getContext('2d')!
      
      const sourceX = (col / gridSize) * img.width
      const sourceY = (row / gridSize) * img.height
      const sourceWidth = img.width / gridSize
      const sourceHeight = img.height / gridSize
      
      ctx.drawImage(
        img,
        sourceX, sourceY, sourceWidth, sourceHeight,
        0, 0, pieceWidth, pieceHeight
      )
      
      const index = row * gridSize + col
      const targetX = offsetX + col * pieceWidth
      const targetY = offsetY + row * pieceHeight
      
      const scatterPos = calculateScatterPosition(
        canvasWidth / 2,
        canvasHeight / 2,
        pieceWidth,
        pieceHeight,
        canvasWidth,
        canvasHeight,
        index,
        total
      )
      
      const piece: PuzzlePiece = {
        id: cuid(),
        row,
        col,
        x: scatterPos.x,
        y: scatterPos.y,
        targetX,
        targetY,
        rotation: (Math.random() - 0.5) * 20,
        isPlaced: false,
        imageDataUrl: canvas.toDataURL(),
        width: pieceWidth,
        height: pieceHeight
      }
      
      pieces.push(piece)
    }
  }
  
  return {
    pieces,
    imageWidth: displayWidth,
    imageHeight: displayHeight,
    pieceWidth,
    pieceHeight
  }
}

export const shufflePieces = (
  pieces: PuzzlePiece[],
  canvasWidth: number,
  canvasHeight: number
): PuzzlePiece[] => {
  const total = pieces.length
  return pieces.map((piece, index) => {
    const scatterPos = calculateScatterPosition(
      canvasWidth / 2,
      canvasHeight / 2,
      piece.width,
      piece.height,
      canvasWidth,
      canvasHeight,
      index,
      total
    )
    return {
      ...piece,
      x: scatterPos.x,
      y: scatterPos.y,
      rotation: (Math.random() - 0.5) * 20,
      isPlaced: false,
      placedBy: undefined
    }
  })
}
