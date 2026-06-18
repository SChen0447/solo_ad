import React from 'react'
import { saveAs } from 'file-saver'
import { useEditorStore, renderShapesToSvg, Shape } from './store'

function Thumbnail({ shapes }: { shapes: Shape[] }) {
  if (shapes.length === 0) {
    return (
      <div
        style={{
          width: 80,
          height: 80,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#666',
          fontSize: 12,
        }}
      >
        空
      </div>
    )
  }

  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity
  shapes.forEach((s) => {
    if (s.x < minX) minX = s.x
    if (s.y < minY) minY = s.y
    if (s.x + s.width > maxX) maxX = s.x + s.width
    if (s.y + s.height > maxY) maxY = s.y + s.height
  })
  const w = Math.max(1, maxX - minX)
  const h = Math.max(1, maxY - minY)
  const scale = Math.min(72 / w, 72 / h)
  const offsetX = (80 - w * scale) / 2 - minX * scale
  const offsetY = (80 - h * scale) / 2 - minY * scale

  const renderShape = (s: Shape) => {
    const common = {
      fill: s.fill,
      stroke: s.stroke,
      strokeWidth: Math.max(0.5, s.strokeWidth * scale),
      opacity: s.opacity / 100,
    }
    const transform = s.rotation
      ? `rotate(${s.rotation} ${(s.x + s.width / 2) * scale + offsetX} ${(s.y + s.height / 2) * scale + offsetY})`
      : ''
    switch (s.type) {
      case 'rect':
        return (
          <rect
            x={s.x * scale + offsetX}
            y={s.y * scale + offsetY}
            width={s.width * scale}
            height={s.height * scale}
            transform={transform}
            {...common}
          />
        )
      case 'circle':
        return (
          <circle
            cx={(s.cx ?? 0) * scale + offsetX}
            cy={(s.cy ?? 0) * scale + offsetY}
            r={(s.r ?? 0) * scale}
            transform={transform}
            {...common}
          />
        )
      case 'ellipse':
        return (
          <ellipse
            cx={(s.cx ?? 0) * scale + offsetX}
            cy={(s.cy ?? 0) * scale + offsetY}
            rx={(s.rx ?? 0) * scale}
            ry={(s.ry ?? 0) * scale}
            transform={transform}
            {...common}
          />
        )
      case 'polygon': {
        const pts = s.points
          ?.trim()
          .split(/\s+/)
          .map((p) => p.split(',').map(Number))
          .map(([px, py]) => `${px * scale + offsetX},${py * scale + offsetY}`)
          .join(' ')
        return <polygon points={pts} transform={transform} {...common} />
      }
      case 'line':
        return (
          <line
            x1={(s.x1 ?? 0) * scale + offsetX}
            y1={(s.y1 ?? 0) * scale + offsetY}
            x2={(s.x2 ?? 0) * scale + offsetX}
            y2={(s.y2 ?? 0) * scale + offsetY}
            transform={transform}
            {...common}
          />
        )
      case 'path': {
        const d = s.d?.replace(/([ML])\s*(-?\d*\.?\d+)\s+(-?\d*\.?\d+)/g, (_m, cmd, px, py) => {
          return `${cmd} ${parseFloat(px) * scale + offsetX} ${parseFloat(py) * scale + offsetY}`
        })
        return <path d={d} transform={transform} {...common} />
      }
      default:
        return null
    }
  }

  return (
    <svg width={80} height={80} viewBox="0 0 80 80" style={{ background: '#fff', borderRadius: 4 }}>
      {shapes.map((s, i) => (
        <g key={i}>{renderShape(s)}</g>
      ))}
    </svg>
  )
}

export default function Library() {
  const library = useEditorStore((s) => s.library)
  const loadFromLibrary = useEditorStore((s) => s.loadFromLibrary)
  const currentEditingIconId = useEditorStore((s) => s.currentEditingIconId)

  const handleExport = (e: React.MouseEvent, _iconId: string, name: string, shapes: Shape[]) => {
    e.stopPropagation()
    const svgString = renderShapesToSvg(shapes, 800, 600)
    const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' })
    saveAs(blob, `${name}.svg`)
  }

  return (
    <div
      style={{
        width: 220,
        background: '#2a2a3e',
        borderLeft: '1px solid #33334a',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          padding: '16px 12px 12px',
          borderBottom: '1px solid #33334a',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <span className="material-icons" style={{ fontSize: 20, color: '#c0c0d8' }}>
          collections
        </span>
        <span style={{ fontWeight: 600, fontSize: 14, color: '#e0e0e0' }}>图标库</span>
        <span
          style={{
            marginLeft: 'auto',
            fontSize: 11,
            color: '#888',
            background: '#3a3a4e',
            padding: '2px 8px',
            borderRadius: 10,
          }}
        >
          {library.length}
        </span>
      </div>

      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: 12,
        }}
      >
        {library.length === 0 ? (
          <div
            style={{
              color: '#666',
              fontSize: 12,
              textAlign: 'center',
              padding: '40px 12px',
              lineHeight: 1.6,
            }}
          >
            <span className="material-icons" style={{ fontSize: 32, display: 'block', marginBottom: 8, opacity: 0.4 }}>
              library_add
            </span>
            图标库为空
            <br />
            点击"保存到图标库"添加图标
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {library.map((icon) => (
              <div
                key={icon.id}
                onClick={() => loadFromLibrary(icon.id)}
                style={{
                  background: currentEditingIconId === icon.id ? '#3a3a55' : '#1e1e2e',
                  borderRadius: 8,
                  padding: 8,
                  cursor: 'pointer',
                  border: `1px solid ${currentEditingIconId === icon.id ? '#6c6cff' : '#33334a'}`,
                  transition: 'background 0.15s ease, border 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  if (currentEditingIconId !== icon.id) (e.currentTarget as HTMLDivElement).style.background = '#2a2a40'
                }}
                onMouseLeave={(e) => {
                  if (currentEditingIconId !== icon.id) (e.currentTarget as HTMLDivElement).style.background = '#1e1e2e'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 6 }}>
                  <Thumbnail shapes={icon.shapes} />
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: '#e0e0e0',
                    textAlign: 'center',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    marginBottom: 6,
                  }}
                  title={icon.name}
                >
                  {icon.name}
                </div>
                <button
                  onClick={(e) => handleExport(e, icon.id, icon.name, icon.shapes)}
                  style={{
                    width: '100%',
                    padding: '4px 8px',
                    fontSize: 11,
                    borderRadius: 4,
                    border: '1px solid #3a3a4e',
                    background: 'transparent',
                    color: '#a0a0b8',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 4,
                  }}
                >
                  <span className="material-icons" style={{ fontSize: 14 }}>
                    download
                  </span>
                  导出 SVG
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
