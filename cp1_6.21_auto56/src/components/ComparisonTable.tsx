import { useMemo } from 'react'
import type { Property, Weights, WeightKey } from '../types'

interface ComparisonTableProps {
  properties: Property[]
  weights: Weights
  scores: Record<string, number>
  fadingIds: Set<string>
  weightLabels: Record<WeightKey, string>
  onDelete: (id: string) => void
  onImageClick: (url: string) => void
}

const ROW_LABELS: { key: keyof Property | 'score'; label: string; numeric: boolean; higherBetter: boolean }[] = [
  { key: 'images', label: '房源图片', numeric: false, higherBetter: false },
  { key: 'rent', label: '月租金（元）', numeric: true, higherBetter: false },
  { key: 'area', label: '面积（㎡）', numeric: true, higherBetter: true },
  { key: 'layout', label: '户型', numeric: false, higherBetter: false },
  { key: 'floor', label: '楼层', numeric: false, higherBetter: false },
  { key: 'orientation', label: '朝向', numeric: false, higherBetter: false },
  { key: 'decoration', label: '装修情况', numeric: false, higherBetter: false },
  { key: 'metroWalkTime', label: '地铁步行（分钟）', numeric: true, higherBetter: false },
  { key: 'score', label: '综合得分', numeric: true, higherBetter: true },
]

export default function ComparisonTable({
  properties,
  scores,
  fadingIds,
  weightLabels,
  onDelete,
  onImageClick,
}: ComparisonTableProps) {
  const avgValues = useMemo(() => {
    const result: Record<string, number> = {}
    ROW_LABELS.forEach((row) => {
      if (!row.numeric || row.key === 'score') return
      const values = properties.map((p) => p[row.key] as number)
      result[row.key] = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0
    })
    return result
  }, [properties])

  const maxScore = useMemo(() => {
    const vals = Object.values(scores)
    return vals.length > 0 ? Math.max(...vals) : 10
  }, [scores])

  if (properties.length === 0) {
    return (
      <div
        style={{
          background: '#fff',
          borderRadius: 'var(--radius)',
          boxShadow: 'var(--shadow)',
          padding: '80px 24px',
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: '64px', marginBottom: '16px' }}>🏠</div>
        <p style={{ fontSize: '18px', color: 'var(--text-primary)', fontWeight: 600, marginBottom: '8px' }}>
          还没有添加房源
        </p>
        <p style={{ color: 'var(--text-secondary)' }}>
          点击右上角"添加房源"按钮开始对比
        </p>
      </div>
    )
  }

  return (
    <div
      style={{
        background: '#fff',
        borderRadius: 'var(--radius)',
        boxShadow: 'var(--shadow)',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          overflowX: 'auto',
          maxHeight: '80vh',
        }}
      >
        <table
          style={{
            width: '100%',
            borderCollapse: 'separate',
            borderSpacing: 0,
            minWidth: `${Math.max(properties.length * 200 + 180, 100)}%`,
          }}
        >
          <thead>
            <tr style={{ position: 'sticky', top: 0, zIndex: 10 }}>
              <th
                style={{
                  ...thStyle,
                  background: 'var(--bg-gray)',
                  position: 'sticky',
                  left: 0,
                  zIndex: 11,
                  minWidth: '180px',
                }}
              >
                属性 / 房源
              </th>
              {properties.map((p) => (
                <th
                  key={p.id}
                  style={{
                    ...thStyle,
                    background: 'var(--bg-gray)',
                    opacity: fadingIds.has(p.id) ? 0 : 1,
                    transition: 'opacity 300ms ease',
                    minWidth: '200px',
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{p.name}</span>
                    <button
                      onClick={() => onDelete(p.id)}
                      style={{
                        fontSize: '12px',
                        color: '#E74C3C',
                        padding: '2px 10px',
                        borderRadius: '4px',
                        transition: 'background 200ms',
                      }}
                      onMouseOver={(e) => (e.currentTarget.style.background = '#FDECEA')}
                      onMouseOut={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      删除
                    </button>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ROW_LABELS.map((row, rowIdx) => (
              <tr key={row.key as string} style={{ background: rowIdx % 2 === 0 ? '#fff' : 'var(--bg-gray)' }}>
                <td
                  style={{
                    ...tdStyle,
                    fontWeight: 600,
                    color: 'var(--text-secondary)',
                    background: rowIdx % 2 === 0 ? '#fff' : 'var(--bg-gray)',
                    position: 'sticky',
                    left: 0,
                    zIndex: 5,
                    borderRight: '1px solid var(--border)',
                  }}
                >
                  {row.label}
                </td>
                {properties.map((p) => {
                  const value = row.key === 'score' ? scores[p.id] : p[row.key as keyof Property]
                  const cellStyle = { ...tdStyle }
                  if (row.numeric && row.key !== 'score') {
                    const avg = avgValues[row.key] || 0
                    const numValue = value as number
                    if (numValue > avg) {
                      cellStyle.background = row.higherBetter ? 'var(--highlight-cool)' : 'var(--highlight-warm)'
                      cellStyle.color = row.higherBetter ? 'var(--highlight-cool-text)' : 'var(--highlight-warm-text)'
                    } else if (numValue < avg) {
                      cellStyle.background = row.higherBetter ? 'var(--highlight-warm)' : 'var(--highlight-cool)'
                      cellStyle.color = row.higherBetter ? 'var(--highlight-warm-text)' : 'var(--highlight-cool-text)'
                    }
                  }

                  return (
                    <td
                      key={p.id}
                      style={{
                        ...cellStyle,
                        opacity: fadingIds.has(p.id) ? 0 : 1,
                        transition: 'opacity 300ms ease, background 200ms',
                      }}
                      className="fade-in"
                    >
                      {renderCellValue(row, value, p, onImageClick, maxScore, weightLabels)}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function renderCellValue(
  row: { key: keyof Property | 'score'; label: string; numeric: boolean; higherBetter: boolean },
  value: unknown,
  property: Property,
  onImageClick: (url: string) => void,
  maxScore: number,
  weightLabels: Record<WeightKey, string>,
) {
  if (row.key === 'images') {
    const images = property.images || []
    if (images.length === 0) {
      return <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>暂无图片</span>
    }
    return (
      <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', flexWrap: 'wrap' }} className="hide-mobile">
        {images.slice(0, 3).map((img, i) => (
          <img
            key={i}
            src={img}
            alt=""
            onClick={() => onImageClick(img)}
            style={{
              width: '56px',
              height: '56px',
              objectFit: 'cover',
              borderRadius: '6px',
              cursor: 'pointer',
              border: '1px solid var(--border)',
              transition: 'transform 200ms',
            }}
            onMouseOver={(e) => (e.currentTarget.style.transform = 'scale(1.08)')}
            onMouseOut={(e) => (e.currentTarget.style.transform = 'scale(1)')}
          />
        ))}
      </div>
    )
  }

  if (row.key === 'score') {
    const score = (value as number) || 0
    const pct = Math.min(100, (score / 10) * 100)
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', minWidth: '140px' }}>
        <div style={{ fontWeight: 700, fontSize: '18px', color: 'var(--primary)' }}>{score.toFixed(1)} 分</div>
        <div
          style={{
            width: '100%',
            height: '10px',
            background: 'var(--border)',
            borderRadius: '5px',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${pct}%`,
              background: `linear-gradient(90deg, var(--primary-light), var(--primary))`,
              borderRadius: '5px',
              transition: 'width 200ms ease',
            }}
          />
        </div>
        <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{pct.toFixed(0)}%</span>
      </div>
    )
  }

  if (row.key === 'rent') {
    return <span style={{ fontWeight: 600 }}>¥{(value as number).toLocaleString()}</span>
  }

  if (row.key === 'metroWalkTime') {
    return <span>{value} 分钟</span>
  }

  if (row.key === 'area') {
    return <span>{value} ㎡</span>
  }

  return <span>{value as string | number}</span>
}

const thStyle: React.CSSProperties = {
  padding: '16px 20px',
  textAlign: 'center',
  fontSize: '14px',
  fontWeight: 600,
  borderBottom: '2px solid var(--border)',
  whiteSpace: 'nowrap',
}

const tdStyle: React.CSSProperties = {
  padding: '16px 20px',
  textAlign: 'center',
  fontSize: '14px',
  borderBottom: '1px solid var(--border)',
  verticalAlign: 'middle',
}
