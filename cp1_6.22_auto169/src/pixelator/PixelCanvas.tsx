import { useEffect, useRef, useState } from 'react'
import { usePixelAvatarStore } from '@/store/usePixelAvatarStore'

export default function PixelCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { pixelGrid, palette } = usePixelAvatarStore()
  const [opacity, setOpacity] = useState(1)
  const prevGridRef = useRef<string>('')

  useEffect(() => {
    if (pixelGrid.length === 0) return

    const gridKey = JSON.stringify(pixelGrid)
    if (gridKey !== prevGridRef.current) {
      prevGridRef.current = gridKey
      setOpacity(0)
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setOpacity(1)
        })
      })
    }
  }, [pixelGrid])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || pixelGrid.length === 0) return

    const ctx = canvas.getContext('2d')!
    const displaySize = 320
    canvas.width = displaySize
    canvas.height = displaySize

    const rows = pixelGrid.length
    const cols = pixelGrid[0]?.length || 0
    if (rows === 0 || cols === 0) return

    const cellW = displaySize / cols
    const cellH = displaySize / rows

    ctx.clearRect(0, 0, displaySize, displaySize)

    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        ctx.fillStyle = pixelGrid[y][x]
        ctx.fillRect(x * cellW, y * cellH, cellW, cellH)
      }
    }

    ctx.strokeStyle = 'rgba(51, 51, 51, 0.6)'
    ctx.lineWidth = 0.5
    for (let y = 0; y <= rows; y++) {
      ctx.beginPath()
      ctx.moveTo(0, y * cellH)
      ctx.lineTo(displaySize, y * cellH)
      ctx.stroke()
    }
    for (let x = 0; x <= cols; x++) {
      ctx.beginPath()
      ctx.moveTo(x * cellW, 0)
      ctx.lineTo(x * cellW, displaySize)
      ctx.stroke()
    }

    void palette
  }, [pixelGrid, palette])

  if (pixelGrid.length === 0) {
    return (
      <div className="flex items-center justify-center w-80 h-80 rounded-2xl bg-white/40 border border-stone-200">
        <p className="text-sm text-stone-400">上传图片后，像素画将在此显示</p>
      </div>
    )
  }

  return (
    <canvas
      ref={canvasRef}
      className="rounded-2xl shadow-lg shadow-stone-200/50 border border-stone-200"
      style={{
        width: 320,
        height: 320,
        imageRendering: 'pixelated',
        opacity,
        transition: 'opacity 0.2s ease-out',
      }}
    />
  )
}
