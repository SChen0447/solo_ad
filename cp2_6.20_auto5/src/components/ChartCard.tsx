import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import {
  LineChart, Line,
  BarChart, Bar,
  PieChart, Pie, Cell,
  ScatterChart, Scatter,
  XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import type { ChartConfig, DataRow } from '../App'

interface ChartCardProps {
  chart: ChartConfig
  data: DataRow[]
  onDelete: () => void
  onRefresh: () => void
}

const COLORS = ['#4a90d9', '#52c41a', '#faad14', '#f5222d', '#722ed1', '#13c2c2', '#eb2f96', '#fa8c16']

const chartIcons: Record<ChartConfig['type'], string> = {
  line: '📈',
  bar: '📊',
  pie: '🥧',
  scatter: '⚬',
}

const chartLabels: Record<ChartConfig['type'], string> = {
  line: '折线图',
  bar: '柱状图',
  pie: '饼图',
  scatter: '散点图',
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div style={{
        background: 'rgba(255, 255, 255, 0.82)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
        borderRadius: '8px',
        padding: '10px 14px',
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08)',
        border: '1px solid rgba(255, 255, 255, 0.6)',
        fontSize: '12px',
        transition: 'opacity 0.1s ease',
        pointerEvents: 'none',
      }}>
        <p style={{ fontWeight: 600, color: '#333', marginBottom: '6px', fontSize: '13px' }}>
          {label !== undefined && label !== null ? String(label) : ''}
        </p>
        {payload.map((entry: any, index: number) => (
          <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '6px', margin: '3px 0' }}>
            <span style={{
              display: 'inline-block',
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: entry.color,
              flexShrink: 0,
            }} />
            <span style={{ color: '#555', flexShrink: 0 }}>{entry.name}:</span>
            <span style={{ color: '#333', fontWeight: 500 }}>
              {typeof entry.value === 'number' ? entry.value.toFixed(2) : String(entry.value)}
            </span>
          </div>
        ))}
      </div>
    )
  }
  return null
}

export default function ChartCard({ chart, data, onDelete, onRefresh }: ChartCardProps) {
  const [hiddenSeries, setHiddenSeries] = useState<Set<string>>(new Set())
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isShaking, setIsShaking] = useState(false)
  const [isVisible, setIsVisible] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 50)
    return () => clearTimeout(timer)
  }, [])

  const handleRefresh = useCallback(() => {
    setIsShaking(true)
    onRefresh()
    setTimeout(() => setIsShaking(false), 500)
  }, [onRefresh])

  const toggleSeries = useCallback((dataKey: string) => {
    setHiddenSeries(prev => {
      const newSet = new Set(prev)
      if (newSet.has(dataKey)) {
        newSet.delete(dataKey)
      } else {
        newSet.add(dataKey)
      }
      return newSet
    })
  }, [])

  const fullscreenRef = useRef<HTMLDivElement>(null)

  const handleExportPNG = useCallback(() => {
    const container = fullscreenRef.current
    if (!container) return

    const svgElement = container.querySelector('.recharts-wrapper svg')
    if (!svgElement) return

    const svgData = new XMLSerializer().serializeToString(svgElement)
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const svgRect = svgElement.getBoundingClientRect()
    const scale = 2
    canvas.width = svgRect.width * scale
    canvas.height = svgRect.height * scale
    ctx.scale(scale, scale)

    const img = new Image()
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' })
    const url = URL.createObjectURL(svgBlob)

    img.onload = () => {
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(img, 0, 0, svgRect.width, svgRect.height)
      URL.revokeObjectURL(url)

      const link = document.createElement('a')
      link.download = `${chartLabels[chart.type]}_${chart.xAxis}_${chart.yAxes.join('_')}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
    }
    img.src = url
  }, [chart.type, chart.xAxis, chart.yAxes])

  const handleDoubleClick = useCallback(() => {
    setIsFullscreen(true)
  }, [])

  const closeFullscreen = useCallback(() => {
    setIsFullscreen(false)
  }, [])

  const pieData = useMemo(() => {
    if (chart.type !== 'pie' || chart.yAxes.length === 0) return []
    const valueKey = chart.yAxes[0]
    const nameKey = chart.xAxis
    return data.map(row => ({
      name: String(row[nameKey]),
      value: Number(row[valueKey]) || 0,
    }))
  }, [chart.type, chart.xAxis, chart.yAxes, data])

  const renderChart = (height: number = 220) => {
    switch (chart.type) {
      case 'line':
        return (
          <ResponsiveContainer width="100%" height={height}>
            <LineChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey={chart.xAxis} tick={{ fontSize: 11, fill: '#888' }} />
              <YAxis tick={{ fontSize: 11, fill: '#888' }} />
              <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#e8e8e8' }} />
              <Legend
                onClick={(e) => {
                  if (e.dataKey) toggleSeries(String(e.dataKey))
                }}
                formatter={(value) => (
                  <span style={{
                    color: hiddenSeries.has(value) ? '#ccc' : '#666',
                    cursor: 'pointer',
                    fontSize: '11px',
                    textDecoration: hiddenSeries.has(value) ? 'line-through' : 'none',
                  }}>
                    {value}
                  </span>
                )}
                wrapperStyle={{ fontSize: '11px' }}
              />
              {chart.yAxes.map((yAxis, idx) => (
                <Line
                  key={yAxis}
                  type="monotone"
                  dataKey={yAxis}
                  stroke={COLORS[idx % COLORS.length]}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                  hide={hiddenSeries.has(yAxis)}
                  animationDuration={300}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )

      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={height}>
            <BarChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey={chart.xAxis} tick={{ fontSize: 11, fill: '#888' }} />
              <YAxis tick={{ fontSize: 11, fill: '#888' }} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f5f5f5' }} />
              <Legend
                onClick={(e) => {
                  if (e.dataKey) toggleSeries(String(e.dataKey))
                }}
                formatter={(value) => (
                  <span style={{
                    color: hiddenSeries.has(value) ? '#ccc' : '#666',
                    cursor: 'pointer',
                    fontSize: '11px',
                    textDecoration: hiddenSeries.has(value) ? 'line-through' : 'none',
                  }}>
                    {value}
                  </span>
                )}
                wrapperStyle={{ fontSize: '11px' }}
              />
              {chart.yAxes.map((yAxis, idx) => (
                <Bar
                  key={yAxis}
                  dataKey={yAxis}
                  fill={COLORS[idx % COLORS.length]}
                  hide={hiddenSeries.has(yAxis)}
                  animationDuration={300}
                  radius={[4, 4, 0, 0]}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        )

      case 'pie':
        return (
          <ResponsiveContainer width="100%" height={height}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                outerRadius={height * 0.35}
                innerRadius={height * 0.15}
                dataKey="value"
                nameKey="name"
                animationDuration={300}
                label={{ fontSize: 10, fill: '#666' }}
              >
                {pieData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend
                formatter={(value) => (
                  <span style={{ fontSize: '11px', color: '#666' }}>{value}</span>
                )}
                wrapperStyle={{ fontSize: '11px' }}
              />
            </PieChart>
          </ResponsiveContainer>
        )

      case 'scatter':
        return (
          <ResponsiveContainer width="100%" height={height}>
            <ScatterChart margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey={chart.xAxis} name={chart.xAxis} tick={{ fontSize: 11, fill: '#888' }} />
              <YAxis dataKey={chart.yAxes[0]} name={chart.yAxes[0]} tick={{ fontSize: 11, fill: '#888' }} />
              <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3' }} />
              <Legend
                onClick={(e) => {
                  if (e.dataKey) toggleSeries(String(e.dataKey))
                }}
                formatter={(value) => (
                  <span style={{
                    color: hiddenSeries.has(value) ? '#ccc' : '#666',
                    cursor: 'pointer',
                    fontSize: '11px',
                    textDecoration: hiddenSeries.has(value) ? 'line-through' : 'none',
                  }}>
                    {value}
                  </span>
                )}
                wrapperStyle={{ fontSize: '11px' }}
              />
              <Scatter
                name={chart.yAxes[0]}
                data={data}
                fill={COLORS[0]}
                hide={hiddenSeries.has(chart.yAxes[0])}
                animationDuration={300}
              />
            </ScatterChart>
          </ResponsiveContainer>
        )

      default:
        return null
    }
  }

  const cardContent = (
    <div
      ref={cardRef}
      onDoubleClick={handleDoubleClick}
      style={{
        height: '100%',
        background: '#fff',
        borderRadius: '12px',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateY(0) scale(1)' : 'translateY(20px) scale(0.95)',
        transition: 'opacity 0.4s ease, transform 0.4s ease',
        animation: isShaking ? 'shake 0.5s ease-in-out' : 'none',
        cursor: 'pointer',
      }}
    >
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '10px 14px',
        borderBottom: '1px solid #f5f5f5',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '16px' }}>{chartIcons[chart.type]}</span>
          <span style={{ fontSize: '13px', fontWeight: 500, color: '#333' }}>
            {chartLabels[chart.type]}
          </span>
          <span style={{ fontSize: '11px', color: '#999' }}>
            {chart.xAxis} × {chart.yAxes.join(', ')}
          </span>
        </div>
        <div style={{ display: 'flex', gap: '4px' }}>
          <button
            onClick={(e) => { e.stopPropagation(); handleRefresh() }}
            title="刷新"
            style={{
              width: '24px',
              height: '24px',
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              borderRadius: '6px',
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#999',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#f0f7ff'
              e.currentTarget.style.color = '#4a90d9'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent'
              e.currentTarget.style.color = '#999'
            }}
          >
            🔄
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete() }}
            title="删除"
            style={{
              width: '24px',
              height: '24px',
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              borderRadius: '6px',
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#999',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#fff1f0'
              e.currentTarget.style.color = '#f5222d'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent'
              e.currentTarget.style.color = '#999'
            }}
          >
            ✕
          </button>
        </div>
      </div>
      <div style={{ flex: 1, padding: '8px' }}>
        {renderChart()}
      </div>
    </div>
  )

  return (
    <>
      {cardContent}

      {isFullscreen && (
        <div
          onClick={closeFullscreen}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            animation: 'fadeIn 0.3s ease',
          }}
        >
          <div
            ref={fullscreenRef}
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '90%',
              height: '85%',
              background: '#fff',
              borderRadius: '16px',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              animation: 'scaleIn 0.3s ease',
            }}
          >
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '16px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '24px' }}>{chartIcons[chart.type]}</span>
                <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#333' }}>
                  {chartLabels[chart.type]}
                </h2>
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button
                  onClick={(e) => { e.stopPropagation(); handleExportPNG() }}
                  style={{
                    padding: '6px 14px',
                    border: '1px solid #d9d9d9',
                    background: '#fff',
                    cursor: 'pointer',
                    borderRadius: '8px',
                    fontSize: '13px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    color: '#555',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#f0f7ff'
                    e.currentTarget.style.borderColor = '#4a90d9'
                    e.currentTarget.style.color = '#4a90d9'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#fff'
                    e.currentTarget.style.borderColor = '#d9d9d9'
                    e.currentTarget.style.color = '#555'
                  }}
                >
                  📥 导出为图片
                </button>
                <button
                onClick={closeFullscreen}
                style={{
                  width: '32px',
                  height: '32px',
                  border: 'none',
                  background: '#f5f5f5',
                  cursor: 'pointer',
                  borderRadius: '8px',
                  fontSize: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#fff1f0'
                  e.currentTarget.style.color = '#f5222d'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#f5f5f5'
                  e.currentTarget.style.color = '#333'
                }}
                >
                  ✕
                </button>
              </div>
            </div>
            <div style={{ flex: 1 }}>
              {renderChart(500)}
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.9); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </>
  )
}
