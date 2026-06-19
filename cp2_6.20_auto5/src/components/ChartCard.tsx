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
        background: 'rgba(255, 255, 255, 0.95)',
        borderRadius: '8px',
        padding: '8px 12px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
        border: '1px solid #f0f0f0',
        fontSize: '12px',
        transition: 'opacity 0.1s ease',
      }}>
        <p style={{ fontWeight: 600, color: '#333', marginBottom: '4px' }}>{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} style={{ color: entry.color, margin: '2px 0' }}>
            {entry.name}: {typeof entry.value === 'number' ? entry.value.toLocaleString() : entry.value}
          </p>
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
        transform: isVisible ? 'translateY(0)' : 'translateY(20px)',
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
