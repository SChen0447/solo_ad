import React, { useCallback, useMemo } from 'react';
import { Responsive, WidthProvider, Layout } from 'react-grid-layout';
import ChartCard from './ChartCard';
import type { ChartConfig, DataRow } from '../types';

import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

const ResponsiveGridLayout = WidthProvider(Responsive);

interface ChartGridProps {
  charts: ChartConfig[];
  data: DataRow[];
  layouts: Record<string, Layout[]>;
  onLayoutChange: (layout: Layout[], layouts: Record<string, Layout[]>) => void;
  onDeleteChart: (id: string) => void;
  onRefreshChart: (id: string) => void;
}

const ChartGrid: React.FC<ChartGridProps> = ({
  charts,
  data,
  layouts,
  onLayoutChange,
  onDeleteChart,
  onRefreshChart,
}) => {
  const cols = useMemo(() => ({ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }), []);
  const breakpoints = useMemo(() => ({ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }), []);

  const handleDelete = useCallback(
    (id: string) => () => onDeleteChart(id),
    [onDeleteChart],
  );

  const handleRefresh = useCallback(
    (id: string) => () => onRefreshChart(id),
    [onRefreshChart],
  );

  if (charts.length === 0) {
    return (
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#9CA3AF',
          fontSize: '15px',
          textAlign: 'center',
          padding: '40px',
        }}
      >
        <div>
          <div style={{ fontSize: '48px', marginBottom: '12px', opacity: 0.4 }}>📊</div>
          <div style={{ fontWeight: 500 }}>上传数据并选择轴配置后</div>
          <div style={{ fontWeight: 500, marginTop: '4px' }}>图表将自动渲染在此处</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, overflow: 'auto', padding: '16px' }}>
      <ResponsiveGridLayout
        className="layout"
        layouts={layouts}
        breakpoints={breakpoints}
        cols={cols}
        rowHeight={40}
        isDraggable={true}
        isResizable={true}
        onLayoutChange={onLayoutChange}
        draggableHandle=".chart-card-enter"
        compactType="vertical"
        margin={[12, 12]}
      >
        {charts.map((chart) => (
          <div key={chart.id}>
            <ChartCard
              config={chart}
              data={data}
              onDelete={handleDelete(chart.id)}
              onRefresh={handleRefresh(chart.id)}
            />
          </div>
        ))}
      </ResponsiveGridLayout>
    </div>
  );
};

export default React.memo(ChartGrid);
