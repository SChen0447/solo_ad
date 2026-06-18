import { useRef, useState, useCallback, useEffect } from 'react'
import { useAnimationStore } from './store'

export default function CubicBezierEditor() {
  const { params, setCubicBezier } = useAnimationStore()
  const svgRef = useRef<SVGSVGElement>(null)
  const [dragging, setDragging] = useState<'p1' | 'p2' | null>(null)

  const { cubicBezier } = params

  const svgSize = 200
  const padding = 20
  const graphSize = svgSize - padding * 2

  const toSvgX = (x: number) => padding + x * graphSize
  const toSvgY = (y: number) => padding + (1 - y) * graphSize

  const fromSvgX = (svgX: number) => (svgX - padding) / graphSize
  const fromSvgY = (svgY: number) => 1 - (svgY - padding) / graphSize

  const handleMouseDown = useCallback((point: 'p1' | 'p2') => {
    setDragging(point)
  }, [])

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!dragging || !svgRef.current) return

      const svg = svgRef.current
      const rect = svg.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top

      let newX = Math.max(0, Math.min(1, fromSvgX(x)))
      let newY = Math.max(0, Math.min(1, fromSvgY(y)))

      if (dragging === 'p1') {
        setCubicBezier({
          ...cubicBezier,
          x1: parseFloat(newX.toFixed(2)),
          y1: parseFloat(newY.toFixed(2))
        })
      } else if (dragging === 'p2') {
        setCubicBezier({
          ...cubicBezier,
          x2: parseFloat(newX.toFixed(2)),
          y2: parseFloat(newY.toFixed(2))
        })
      }
    },
    [dragging, cubicBezier, setCubicBezier]
  )

  const handleMouseUp = useCallback(() => {
    setDragging(null)
  }, [])

  useEffect(() => {
    if (dragging) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
      return () => {
        window.removeEventListener('mousemove', handleMouseMove)
        window.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [dragging, handleMouseMove, handleMouseUp])

  const p1x = toSvgX(cubicBezier.x1)
  const p1y = toSvgY(cubicBezier.y1)
  const p2x = toSvgX(cubicBezier.x2)
  const p2y = toSvgY(cubicBezier.y2)

  return (
    <div style={styles.container}>
      <div style={styles.label}>贝塞尔曲线编辑器</div>
      <svg
        ref={svgRef}
        width={svgSize}
        height={svgSize}
        style={styles.svg}
      >
        <rect
          x={padding}
          y={padding}
          width={graphSize}
          height={graphSize}
          fill="rgba(0, 0, 0, 0.3)"
          stroke="rgba(255, 255, 255, 0.2)"
          strokeWidth="1"
        />

        <line
          x1={padding}
          y1={padding + graphSize}
          x2={p1x}
          y2={p1y}
          stroke="#7c3aed"
          strokeWidth="2"
          strokeDasharray="4,4"
          opacity="0.6"
        />
        <line
          x1={padding + graphSize}
          y1={padding}
          x2={p2x}
          y2={p2y}
          stroke="#7c3aed"
          strokeWidth="2"
          strokeDasharray="4,4"
          opacity="0.6"
        />

        <path
          d={`M ${padding} ${padding + graphSize} C ${p1x} ${p1y}, ${p2x} ${p2y}, ${padding + graphSize} ${padding}`}
          fill="none"
          stroke="#7c3aed"
          strokeWidth="3"
        />

        <circle
          cx={p1x}
          cy={p1y}
          r="8"
          fill="#ffffff"
          stroke="#7c3aed"
          strokeWidth="2"
          style={{ cursor: 'grab' }}
          onMouseDown={() => handleMouseDown('p1')}
        />

        <circle
          cx={p2x}
          cy={p2y}
          r="8"
          fill="#ffffff"
          stroke="#7c3aed"
          strokeWidth="2"
          style={{ cursor: 'grab' }}
          onMouseDown={() => handleMouseDown('p2')}
        />
      </svg>

      <div style={styles.values}>
        <span style={styles.valueText}>
          cubic-bezier({cubicBezier.x1.toFixed(2)}, {cubicBezier.y1.toFixed(2)}, {cubicBezier.x2.toFixed(2)}, {cubicBezier.y2.toFixed(2)})
        </span>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '10px',
    padding: '12px',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: '8px'
  },
  label: {
    fontSize: '13px',
    color: '#e0e0e0',
    alignSelf: 'flex-start'
  },
  svg: {
    backgroundColor: 'transparent',
    borderRadius: '4px'
  },
  values: {
    display: 'flex',
    justifyContent: 'center',
    width: '100%'
  },
  valueText: {
    fontSize: '12px',
    fontFamily: "'Fira Code', monospace",
    color: '#c4b5fd',
    backgroundColor: 'rgba(124, 58, 237, 0.2)',
    padding: '6px 10px',
    borderRadius: '6px'
  }
}
