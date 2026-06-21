import { useEffect, useRef } from 'react'

interface RadarSeries {
  name: string
  color: string
  values: number[]
}

interface RadarChartProps {
  dimensions: string[]
  series: RadarSeries[]
}

export default function RadarChart({ dimensions, series }: RadarChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const size = 320
    canvas.width = size * dpr
    canvas.height = size * dpr
    canvas.style.width = `${size}px`
    canvas.style.height = `${size}px`
    ctx.scale(dpr, dpr)

    const centerX = size / 2
    const centerY = size / 2
    const radius = size / 2 - 40
    const levels = 5
    const angleStep = (Math.PI * 2) / dimensions.length

    ctx.clearRect(0, 0, size, size)

    for (let i = levels; i >= 1; i--) {
      const r = (radius * i) / levels
      ctx.beginPath()
      for (let j = 0; j < dimensions.length; j++) {
        const angle = j * angleStep - Math.PI / 2
        const x = centerX + Math.cos(angle) * r
        const y = centerY + Math.sin(angle) * r
        if (j === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      }
      ctx.closePath()
      ctx.strokeStyle = 'rgba(74, 144, 217, 0.08)'
      ctx.lineWidth = 1
      ctx.stroke()
    }

    for (let i = 0; i < dimensions.length; i++) {
      const angle = i * angleStep - Math.PI / 2
      const x = centerX + Math.cos(angle) * radius
      const y = centerY + Math.sin(angle) * radius

      ctx.beginPath()
      ctx.moveTo(centerX, centerY)
      ctx.lineTo(x, y)
      const axisGradient = ctx.createLinearGradient(centerX, centerY, x, y)
      axisGradient.addColorStop(0, 'rgba(74, 144, 217, 0.1)')
      axisGradient.addColorStop(1, 'rgba(74, 144, 217, 0.4)')
      ctx.strokeStyle = axisGradient
      ctx.lineWidth = 1.5
      ctx.stroke()

      const labelX = centerX + Math.cos(angle) * (radius + 24)
      const labelY = centerY + Math.sin(angle) * (radius + 24)
      ctx.fillStyle = '#6B7C8E'
      ctx.font = '12px -apple-system, sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(dimensions[i], labelX, labelY)
    }

    for (let i = 1; i <= levels; i++) {
      const r = (radius * i) / levels
      const y = centerY - r + 2
      ctx.fillStyle = 'rgba(107, 124, 142, 0.4)'
      ctx.font = '10px -apple-system, sans-serif'
      ctx.textAlign = 'right'
      ctx.textBaseline = 'middle'
      ctx.fillText(`${(i / levels) * 100}`, centerX - 6, y)
    }

    series.forEach((s) => {
      ctx.beginPath()
      s.values.forEach((v, i) => {
        const angle = i * angleStep - Math.PI / 2
        const r = radius * Math.max(0, Math.min(1, v))
        const x = centerX + Math.cos(angle) * r
        const y = centerY + Math.sin(angle) * r
        if (i === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      })
      ctx.closePath()

      const fillGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius)
      fillGradient.addColorStop(0, s.color + '40')
      fillGradient.addColorStop(1, s.color + '10')
      ctx.fillStyle = fillGradient
      ctx.fill()

      ctx.strokeStyle = s.color
      ctx.lineWidth = 2
      ctx.stroke()

      s.values.forEach((v, i) => {
        const angle = i * angleStep - Math.PI / 2
        const r = radius * Math.max(0, Math.min(1, v))
        const x = centerX + Math.cos(angle) * r
        const y = centerY + Math.sin(angle) * r
        ctx.beginPath()
        ctx.arc(x, y, 4, 0, Math.PI * 2)
        ctx.fillStyle = s.color
        ctx.fill()
        ctx.strokeStyle = '#fff'
        ctx.lineWidth = 2
        ctx.stroke()
      })
    })
  }, [dimensions, series])

  return (
    <div style={{ display: 'flex', justifyContent: 'center' }}>
      <canvas ref={canvasRef} />
    </div>
  )
}
