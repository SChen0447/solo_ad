import { useCallback } from 'react'
import { Responsive, WidthProvider } from 'react-grid-layout'
import 'react-grid-layout/css/styles.css'
import 'react-resizable/css/styles.css'
import ChartCard from './ChartCard'
import type { ChartConfig, DataRow } from '../App'
import type { Layout } from 'react-grid-layout'

const ResponsiveGridLayout = WidthProvider(Responsive)

interface ChartGridProps {
  charts: ChartConfig[]
  data: DataRow[]
  layout: Layout[]
  onLayoutChange: (layout: Layout[]) => void
  onDeleteChart: (chartId: string) => void
  onRefreshChart: (chartId: string) => void
}

export default function ChartGrid({
  charts,
  data,
  layout,
  onLayoutChange,
  onDeleteChart,
  onRefreshChart,
}: ChartGridProps) {
  const handleLayoutChange = useCallback((currentLayout: Layout[]) => {
    onLayoutChange(currentLayout)
  }, [onLayoutChange])

  if (charts.length === 0) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        color: '#999',
      }}>
        <div style={{ fontSize: '64px', marginBottom: '16px' }}>📊</div>
        <p style={{ fontSize: '16px', marginBottom: '8px' }}>还没有图表</p>
        <p style={{ fontSize: '13px' }}>从左侧面板选择数据并添加图表开始吧</p>
      </div>
    )
  }

  return (
    <div style={{ width: '100%' }}>
      <ResponsiveGridLayout
        className="layout"
        layouts={{ lg: layout }}
        breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
        cols={{ lg: 12, md: 12, sm: 6, xs: 2, xxs: 1 }}
        rowHeight={120}
        margin={[16, 16]}
        containerPadding={[0, 0]}
        isDraggable={true}
        isResizable={true}
        onLayoutChange={handleLayoutChange}
        draggableHandle=".drag-handle"
      >
        {charts.map((chart) => (
          <div key={chart.id} data-grid={layout.find(l => l.i === chart.id) || { x: 0, y: 0, w: 6, h: 2 }}>
            <div className="drag-handle" style={{ height: '100%', cursor: 'move' }}>
              <ChartCard
                chart={chart}
                data={data}
                onDelete={() => onDeleteChart(chart.id)}
                onRefresh={() => onRefreshChart(chart.id)}
              />
            </div>
          </div>
        ))}
      </ResponsiveGridLayout>
    </div>
  )
}
