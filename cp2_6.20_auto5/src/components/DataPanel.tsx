import { useMemo } from 'react'
import type { ColumnInfo, DataRow, ChartConfig } from '../App'

interface DataPanelProps {
  columns: ColumnInfo[]
  data: DataRow[]
  previewData: DataRow[]
  selectedX: string
  selectedY: string[]
  selectedColor: string | undefined
  onSelectX: (col: string) => void
  onSelectY: (cols: string[]) => void
  onSelectColor: (col: string | undefined) => void
  onAddChart: (type: ChartConfig['type']) => void
}

const getColumnStats = (column: ColumnInfo, data: DataRow[]) => {
  const values = data.map(row => row[column.name])
  if (column.type === 'number') {
    const nums = values.filter(v => typeof v === 'number') as number[]
    if (nums.length === 0) return { count: 0 }
    return {
      count: nums.length,
      min: Math.min(...nums).toFixed(2),
      max: Math.max(...nums).toFixed(2),
      avg: (nums.reduce((a, b) => a + b, 0) / nums.length).toFixed(2),
    }
  }
  const unique = new Set(values.filter(v => v !== '' && v !== null && v !== undefined))
  return {
    count: values.length,
    unique: unique.size,
  }
}

export default function DataPanel({
  columns,
  data,
  previewData,
  selectedX,
  selectedY,
  selectedColor,
  onSelectX,
  onSelectY,
  onSelectColor,
  onAddChart,
}: DataPanelProps) {
  const numericColumns = useMemo(() => columns.filter(c => c.type === 'number'), [columns])

  const toggleYAxis = (colName: string) => {
    if (selectedY.includes(colName)) {
      onSelectY(selectedY.filter(y => y !== colName))
    } else {
      onSelectY([...selectedY, colName])
    }
  }

  const chartTypes: { type: ChartConfig['type']; icon: string; label: string }[] = [
    { type: 'line', icon: '📈', label: '折线图' },
    { type: 'bar', icon: '📊', label: '柱状图' },
    { type: 'pie', icon: '🥧', label: '饼图' },
    { type: 'scatter', icon: '⚬', label: '散点图' },
  ]

  return (
    <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '16px', borderBottom: '1px solid #f0f0f0' }}>
        <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#333', marginBottom: '12px' }}>
          📋 数据概览
        </h3>
        <div style={{ display: 'flex', gap: '12px', fontSize: '12px' }}>
          <div style={{ background: '#f0f7ff', padding: '8px 12px', borderRadius: '8px' }}>
            <div style={{ color: '#4a90d9', fontWeight: 600, fontSize: '16px' }}>{data.length}</div>
            <div style={{ color: '#666' }}>行数据</div>
          </div>
          <div style={{ background: '#f0fff4', padding: '8px 12px', borderRadius: '8px' }}>
            <div style={{ color: '#52c41a', fontWeight: 600, fontSize: '16px' }}>{columns.length}</div>
            <div style={{ color: '#666' }}>列字段</div>
          </div>
        </div>
      </div>

      <div style={{ padding: '16px', borderBottom: '1px solid #f0f0f0' }}>
        <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#333', marginBottom: '12px' }}>
          🔧 坐标轴配置
        </h3>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ fontSize: '12px', color: '#666', display: 'block', marginBottom: '6px' }}>
            X轴（分类）
          </label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {columns.map(col => (
              <button
                key={col.name}
                onClick={() => onSelectX(col.name)}
                style={{
                  padding: '4px 10px',
                  fontSize: '11px',
                  border: '1px solid',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  background: selectedX === col.name ? '#4a90d9' : '#fff',
                  color: selectedX === col.name ? '#fff' : '#666',
                  borderColor: selectedX === col.name ? '#4a90d9' : '#d9d9d9',
                  transition: 'all 0.2s',
                }}
              >
                {col.name}
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ fontSize: '12px', color: '#666', display: 'block', marginBottom: '6px' }}>
            Y轴（数值） - 可多选
          </label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {numericColumns.map(col => (
              <button
                key={col.name}
                onClick={() => toggleYAxis(col.name)}
                style={{
                  padding: '4px 10px',
                  fontSize: '11px',
                  border: '1px solid',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  background: selectedY.includes(col.name) ? '#52c41a' : '#fff',
                  color: selectedY.includes(col.name) ? '#fff' : '#666',
                  borderColor: selectedY.includes(col.name) ? '#52c41a' : '#d9d9d9',
                  transition: 'all 0.2s',
                }}
              >
                ✓ {col.name}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label style={{ fontSize: '12px', color: '#666', display: 'block', marginBottom: '6px' }}>
            颜色分组（可选）
          </label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            <button
              onClick={() => onSelectColor(undefined)}
              style={{
                padding: '4px 10px',
                fontSize: '11px',
                border: '1px solid',
                borderRadius: '6px',
                cursor: 'pointer',
                background: !selectedColor ? '#722ed1' : '#fff',
                color: !selectedColor ? '#fff' : '#666',
                borderColor: !selectedColor ? '#722ed1' : '#d9d9d9',
                transition: 'all 0.2s',
              }}
            >
              无
            </button>
            {columns.filter(c => c.type === 'string').map(col => (
              <button
                key={col.name}
                onClick={() => onSelectColor(col.name)}
                style={{
                  padding: '4px 10px',
                  fontSize: '11px',
                  border: '1px solid',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  background: selectedColor === col.name ? '#722ed1' : '#fff',
                  color: selectedColor === col.name ? '#fff' : '#666',
                  borderColor: selectedColor === col.name ? '#722ed1' : '#d9d9d9',
                  transition: 'all 0.2s',
                }}
              >
                🎨 {col.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ padding: '16px', borderBottom: '1px solid #f0f0f0' }}>
        <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#333', marginBottom: '12px' }}>
          ➕ 添加图表
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          {chartTypes.map(({ type, icon, label }) => (
            <button
              key={type}
              onClick={() => onAddChart(type)}
              disabled={selectedY.length === 0}
              style={{
                padding: '10px',
                fontSize: '12px',
                border: '1px solid #d9d9d9',
                borderRadius: '8px',
                cursor: selectedY.length === 0 ? 'not-allowed' : 'pointer',
                background: '#fff',
                opacity: selectedY.length === 0 ? 0.5 : 1,
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
              }}
              onMouseEnter={(e) => {
                if (selectedY.length > 0) {
                  e.currentTarget.style.background = '#f0f7ff'
                  e.currentTarget.style.borderColor = '#4a90d9'
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#fff'
                e.currentTarget.style.borderColor = '#d9d9d9'
              }}
            >
              <span style={{ fontSize: '16px' }}>{icon}</span>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: '16px', flex: 1 }}>
        <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#333', marginBottom: '12px' }}>
          🔍 列统计
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {columns.map(col => {
            const stats = getColumnStats(col, data)
            return (
              <div
                key={col.name}
                style={{
                  padding: '10px',
                  background: '#fafafa',
                  borderRadius: '8px',
                  fontSize: '11px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <span style={{ fontWeight: 500, color: '#333' }}>{col.name}</span>
                  <span style={{
                    padding: '2px 6px',
                    borderRadius: '4px',
                    fontSize: '10px',
                    background: col.type === 'number' ? '#e6f7ff' : col.type === 'date' ? '#fff7e6' : '#f6ffed',
                    color: col.type === 'number' ? '#1890ff' : col.type === 'date' ? '#fa8c16' : '#52c41a',
                  }}>
                    {col.type === 'number' ? '数值' : col.type === 'date' ? '日期' : '分类'}
                  </span>
                </div>
                <div style={{ color: '#888', fontSize: '10px' }}>
                  {col.type === 'number' ? (
                    <>最小值: {stats.min} | 最大值: {stats.max} | 平均: {stats.avg}</>
                  ) : (
                    <>唯一值: {stats.unique} 个</>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div style={{ padding: '16px', borderTop: '1px solid #f0f0f0' }}>
        <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#333', marginBottom: '12px' }}>
          👁️ 数据预览 (前5行)
        </h3>
        <div style={{ overflowX: 'auto', fontSize: '10px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {columns.map(col => (
                  <th key={col.name} style={{
                    padding: '6px',
                    background: '#f5f5f5',
                    border: '1px solid #e8e8e8',
                    textAlign: 'left',
                    fontWeight: 500,
                    whiteSpace: 'nowrap',
                  }}>
                    {col.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {previewData.map((row, idx) => (
                <tr key={idx}>
                  {columns.map(col => (
                    <td key={col.name} style={{
                      padding: '6px',
                      border: '1px solid #e8e8e8',
                      whiteSpace: 'nowrap',
                      color: '#666',
                    }}>
                      {String(row[col.name])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
