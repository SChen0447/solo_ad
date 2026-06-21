import { useState, useMemo } from 'react'

export interface WheelScent {
  id: string
  name: string
  noteType: 'top' | 'middle' | 'base'
  ratio: number
}

interface ScentWheelProps {
  scents: WheelScent[]
  size?: number
  interactive?: boolean
}

const NOTE_COLORS: Record<string, string> = {
  top: '#FFCC80',
  middle: '#F48FB1',
  base: '#BCAAA4',
}

function getNoteColor(noteType: string): string {
  switch (noteType) {
    case 'top': return '#FFCC80'
    case 'middle': return '#F48FB1'
    case 'base': return '#BCAAA4'
    default: return '#BDBDBD'
  }
}

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const angleRad = ((angleDeg - 90) * Math.PI) / 180
  return {
    x: cx + r * Math.cos(angleRad),
    y: cy + r * Math.sin(angleRad),
  }
}

function describeArc(
  cx: number,
  cy: number,
  r: number,
  startAngle: number,
  endAngle: number,
  expand: number = 0
) {
  const start = polarToCartesian(cx, cy, r + expand, endAngle)
  const end = polarToCartesian(cx, cy, r + expand, startAngle)
  const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1'
  return [
    'M',
    cx,
    cy,
    'L',
    start.x,
    start.y,
    'A',
    r + expand,
    r + expand,
    0,
    largeArcFlag,
    0,
    end.x,
    end.y,
    'Z',
  ].join(' ')
}

export default function ScentWheel({ scents, size = 260, interactive = true }: ScentWheelProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [hoverPos, setHoverPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 })

  const total = useMemo(() => scents.reduce((sum, s) => sum + s.ratio, 0), [scents])
  const cx = size / 2
  const cy = size / 2
  const outerR = size / 2 - 15
  const innerR = outerR * 0.45

  const segments = useMemo(() => {
    if (total === 0) return []
    let currentAngle = 0
    return scents.map((scent) => {
      const angle = (scent.ratio / total) * 360
      const startAngle = currentAngle
      const endAngle = currentAngle + angle
      currentAngle = endAngle
      return {
        ...scent,
        startAngle,
        endAngle,
        midAngle: (startAngle + endAngle) / 2,
        percentage: ((scent.ratio / total) * 100).toFixed(1),
      }
    })
  }, [scents, total])

  if (scents.length === 0 || total === 0) {
    return (
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={cx}
          cy={cy}
          r={outerR}
          fill="none"
          stroke="#D7CCC8"
          strokeWidth="2"
          strokeDasharray="6 4"
        />
        <circle
          cx={cx}
          cy={cy}
          r={innerR}
          fill="#FFF8F0"
          stroke="#D7CCC8"
          strokeWidth="1"
        />
        <text
          x={cx}
          y={cy}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="#8D6E63"
          fontSize="14"
          fontFamily="Noto Sans SC"
        >
          添加香料开始调香
        </text>
      </svg>
    )
  }

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        style={{ overflow: 'visible' }}
      >
        <defs>
          {segments.map((s) => (
            <filter key={`shadow-${s.id}`} id={`shadow-${s.id}`}>
              <feDropShadow dx="0" dy="0" stdDeviation="3" floodOpacity="0.25" />
            </filter>
          ))}
        </defs>

        {segments.map((s) => {
          const isHovered = hoveredId === s.id && interactive
          const expand = isHovered ? 5 : 0
          const pathD = describeArc(cx, cy, outerR, s.startAngle, s.endAngle, expand)
          const color = getNoteColor(s.noteType)

          return (
            <path
              key={s.id}
              d={pathD}
              fill={color}
              fillOpacity={0.7}
              stroke="#FFFFFF"
              strokeWidth="2"
              style={{
                transition: 'd 0.4s cubic-bezier(0.4, 0, 0.2, 1), filter 0.2s ease-out',
                transformOrigin: `${cx}px ${cy}px`,
                cursor: interactive ? 'pointer' : 'default',
                filter: isHovered ? `url(#shadow-${s.id}) drop-shadow(0 0 6px ${color})` : undefined,
                animation: interactive ? 'wheel-spin 0.4s ease-out' : undefined,
              }}
              onMouseEnter={(e) => {
                if (!interactive) return
                setHoveredId(s.id)
                const rect = (e.currentTarget.ownerSVGElement as SVGSVGElement).getBoundingClientRect()
                setHoverPos({
                  x: e.clientX - rect.left,
                  y: e.clientY - rect.top,
                })
              }}
              onMouseMove={(e) => {
                if (!interactive) return
                const rect = (e.currentTarget.ownerSVGElement as SVGSVGElement).getBoundingClientRect()
                setHoverPos({
                  x: e.clientX - rect.left,
                  y: e.clientY - rect.top,
                })
              }}
              onMouseLeave={() => interactive && setHoveredId(null)}
            />
          )
        })}

        <circle
          cx={cx}
          cy={cy}
          r={innerR}
          fill="#FFFFFF"
          stroke="#D7CCC8"
          strokeWidth="1.5"
        />

        <text
          x={cx}
          y={cy - 8}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="#5D4037"
          fontSize="13"
          fontWeight="600"
          fontFamily="Noto Sans SC"
        >
          共 {scents.length} 种
        </text>
        <text
          x={cx}
          y={cy + 12}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="#8D6E63"
          fontSize="11"
          fontFamily="Noto Sans SC"
        >
          {total} 份比例
        </text>
      </svg>

      {hoveredId && interactive && (() => {
        const hovered = segments.find((s) => s.id === hoveredId)
        if (!hovered) return null
        return (
          <div
            style={{
              position: 'absolute',
              left: hoverPos.x + 12,
              top: hoverPos.y - 10,
              background: 'rgba(62, 39, 35, 0.92)',
              color: '#FFFFFF',
              padding: '8px 12px',
              borderRadius: '8px',
              fontSize: '13px',
              fontFamily: 'Noto Sans SC',
              pointerEvents: 'none',
              boxShadow: '0 6px 16px rgba(0,0,0,0.3), 0 2px 4px rgba(0,0,0,0.15)',
              whiteSpace: 'nowrap',
              zIndex: 10,
              transform: 'translateY(-50%)',
            }}
          >
            <div style={{ fontWeight: 600, marginBottom: 2 }}>{hovered.name}</div>
            <div style={{ opacity: 0.85, fontSize: 12 }}>{hovered.percentage}%</div>
          </div>
        )
      })()}

      <style>{`
        @keyframes wheel-spin {
          from {
            opacity: 0;
            transform: rotate(-30deg) scale(0.85);
          }
          to {
            opacity: 1;
            transform: rotate(0deg) scale(1);
          }
        }
      `}</style>
    </div>
  )
}
