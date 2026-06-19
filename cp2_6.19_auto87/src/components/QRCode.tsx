import { useEffect, useRef } from 'react'

interface QRCodeProps {
  value: string
  size?: number
}

export default function QRCode({ value, size = 150 }: QRCodeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = size
    canvas.height = size
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, size, size)

    const generateQR = (text: string): boolean[][] => {
      const len = text.length
      const gridSize = Math.min(25 + Math.floor(len / 10), 41)
      const grid: boolean[][] = []

      for (let i = 0; i < gridSize; i++) {
        grid[i] = []
        for (let j = 0; j < gridSize; j++) {
          grid[i][j] = false
        }
      }

      for (let i = 0; i < 7; i++) {
        for (let j = 0; j < 7; j++) {
          const isBorder = i === 0 || i === 6 || j === 0 || j === 6
          const isInner = i >= 2 && i <= 4 && j >= 2 && j <= 4
          grid[i][j] = isBorder || isInner
          grid[gridSize - 1 - i][j] = isBorder || isInner
          grid[i][gridSize - 1 - j] = isBorder || isInner
        }
      }

      let hash = 0
      for (let i = 0; i < text.length; i++) {
        hash = ((hash << 5) - hash) + text.charCodeAt(i)
        hash = hash & hash
      }

      const padding = 8
      for (let i = padding; i < gridSize - padding; i++) {
        for (let j = padding; j < gridSize - padding; j++) {
          if (
            (i < 7 && j < 7) ||
            (i >= gridSize - 7 && j < 7) ||
            (i < 7 && j >= gridSize - 7)
          ) {
            continue
          }

          const pseudoRandom = ((i * 7 + j * 13 + hash) % 11) < 5
          if (pseudoRandom) {
            grid[i][j] = true
          }

          const charIndex = (i * gridSize + j + hash) % text.length
          const charCode = text.charCodeAt(charIndex)
          if ((charCode + i + j) % 3 === 0) {
            grid[i][j] = !grid[i][j]
          }
        }
      }

      const timingStart = 7
      const timingEnd = gridSize - 7
      for (let i = timingStart; i < timingEnd; i++) {
        if (i % 2 === 0) {
          grid[6][i] = true
          grid[i][6] = true
        }
      }

      return grid
    }

    const grid = generateQR(value)
    const cellSize = size / grid.length

    ctx.fillStyle = '#1a237e'
    for (let i = 0; i < grid.length; i++) {
      for (let j = 0; j < grid[i].length; j++) {
        if (grid[i][j]) {
          ctx.fillRect(j * cellSize, i * cellSize, cellSize + 0.5, cellSize + 0.5)
        }
      }
    }

    const logoSize = size * 0.15
    const logoX = (size - logoSize) / 2
    const logoY = (size - logoSize) / 2

    ctx.fillStyle = '#ffffff'
    ctx.fillRect(logoX - 2, logoY - 2, logoSize + 4, logoSize + 4)

    ctx.fillStyle = '#1a237e'
    ctx.beginPath()
    ctx.arc(logoX + logoSize / 2, logoY + logoSize / 2, logoSize / 2, 0, Math.PI * 2)
    ctx.fill()

    ctx.fillStyle = '#ffffff'
    ctx.font = `bold ${logoSize * 0.6}px Arial`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('V', logoX + logoSize / 2, logoY + logoSize / 2)
  }, [value, size])

  return <canvas ref={canvasRef} className="border-2 border-gray-200 rounded-lg" />
}
