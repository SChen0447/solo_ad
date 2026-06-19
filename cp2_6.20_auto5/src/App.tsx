import { useState, useCallback, useMemo } from 'react'
import DataUpload from './components/DataUpload'
import DataPanel from './components/DataPanel'
import ChartGrid from './components/ChartGrid'
import type { Layout } from 'react-grid-layout'

export interface ColumnInfo {
  name: string
  type: 'number' | 'string' | 'date'
}

export interface DataRow {
  [key: string]: string | number
}

export interface ChartConfig {
  id: string
  type: 'line' | 'bar' | 'pie' | 'scatter'
  xAxis: string
  yAxes: string[]
  colorBy?: string
}

const generateId = () => Math.random().toString(36).substr(2, 9)

const sampleColumns: ColumnInfo[] = [
  { name: '月份', type: 'string' },
  { name: '销售额', type: 'number' },
  { name: '利润', type: 'number' },
  { name: '成本', type: 'number' },
  { name: '地区', type: 'string' },
]

const sampleData: DataRow[] = [
  { 月份: '一月', 销售额: 4000, 利润: 2400, 成本: 1600, 地区: '华东' },
  { 月份: '二月', 销售额: 3000, 利润: 1398, 成本: 1602, 地区: '华北' },
  { 月份: '三月', 销售额: 2000, 利润: 9800, 成本: -7800, 地区: '华南' },
  { 月份: '四月', 销售额: 2780, 利润: 3908, 成本: -1128, 地区: '华东' },
  { 月份: '五月', 销售额: 1890, 利润: 4800, 成本: -2910, 地区: '华北' },
  { 月份: '六月', 销售额: 2390, 利润: 3800, 成本: -1410, 地区: '华南' },
  { 月份: '七月', 销售额: 3490, 利润: 4300, 成本: -810, 地区: '华东' },
  { 月份: '八月', 销售额: 4200, 利润: 5100, 成本: -900, 地区: '华北' },
]

function App() {
  const [columns, setColumns] = useState<ColumnInfo[]>(sampleColumns)
  const [data, setData] = useState<DataRow[]>(sampleData)
  const [charts, setCharts] = useState<ChartConfig[]>([
    { id: 'chart1', type: 'line', xAxis: '月份', yAxes: ['销售额', '利润'], colorBy: undefined },
    { id: 'chart2', type: 'bar', xAxis: '月份', yAxes: ['销售额', '成本'], colorBy: undefined },
  ])
  const [layout, setLayout] = useState<Layout[]>([
    { i: 'chart1', x: 0, y: 0, w: 6, h: 2 },
    { i: 'chart2', x: 6, y: 0, w: 6, h: 2 },
  ])
  const [selectedX, setSelectedX] = useState<string>('月份')
  const [selectedY, setSelectedY] = useState<string[]>(['销售额'])
  const [selectedColor, setSelectedColor] = useState<string | undefined>(undefined)

  const previewData = useMemo(() => data.slice(0, 5), [data])

  const handleDataParsed = useCallback((newColumns: ColumnInfo[], newData: DataRow[]) => {
    setColumns(newColumns)
    setData(newData)
    if (newColumns.length > 0) {
      setSelectedX(newColumns[0].name)
      const numCols = newColumns.filter(c => c.type === 'number')
      if (numCols.length > 0) {
        setSelectedY([numCols[0].name])
      }
    }
  }, [])

  const addChart = useCallback((type: ChartConfig['type']) => {
    const newChart: ChartConfig = {
      id: generateId(),
      type,
      xAxis: selectedX,
      yAxes: selectedY,
      colorBy: selectedColor,
    }
    setCharts(prev => [...prev, newChart])
    setLayout(prev => {
      const maxY = prev.reduce((max, item) => Math.max(max, item.y + item.h), 0)
      return [...prev, { i: newChart.id, x: 0, y: maxY, w: 6, h: 2 }]
    })
  }, [selectedX, selectedY, selectedColor])

  const deleteChart = useCallback((chartId: string) => {
    setCharts(prev => prev.filter(c => c.id !== chartId))
    setLayout(prev => prev.filter(l => l.i !== chartId))
  }, [])

  const refreshChart = useCallback((chartId: string) => {
    setCharts(prev => {
      const chart = prev.find(c => c.id === chartId)
      if (!chart) return prev
      return prev.map(c => c.id === chartId ? { ...c, xAxis: chart.xAxis } : c)
    })
  }, [])

  const handleLayoutChange = useCallback((newLayout: Layout[]) => {
    setLayout(newLayout)
  }, [])

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <div style={{
        width: '320px',
        background: '#fff',
        borderRight: '1px solid #e8e8e8',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        <div style={{ padding: '20px', borderBottom: '1px solid #f0f0f0' }}>
          <h1 style={{ fontSize: '18px', fontWeight: 600, color: '#1a1a2e' }}>
            数据可视化仪表盘
          </h1>
          <p style={{ fontSize: '12px', color: '#888', marginTop: '4px' }}>
            拖拽数据文件开始分析
          </p>
        </div>
        <DataUpload onDataParsed={handleDataParsed} />
        {columns.length > 0 && (
          <DataPanel
            columns={columns}
            data={data}
            previewData={previewData}
            selectedX={selectedX}
            selectedY={selectedY}
            selectedColor={selectedColor}
            onSelectX={setSelectedX}
            onSelectY={setSelectedY}
            onSelectColor={setSelectedColor}
            onAddChart={addChart}
          />
        )}
      </div>
      <div style={{ flex: 1, overflow: 'auto', padding: '20px' }}>
        <ChartGrid
          charts={charts}
          data={data}
          layout={layout}
          onLayoutChange={handleLayoutChange}
          onDeleteChart={deleteChart}
          onRefreshChart={refreshChart}
        />
      </div>
    </div>
  )
}

export default App
