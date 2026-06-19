import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Layout } from 'react-grid-layout';
import DataUpload from './components/DataUpload';
import DataPanel from './components/DataPanel';
import ChartGrid from './components/ChartGrid';
import type { Column, DataRow, FilterConfig, ChartConfig, ChartType } from './types';

let chartIdCounter = 0;

const generateChartsFromFilter = (
  filterConfig: FilterConfig,
  columns: Column[],
): ChartConfig[] => {
  if (!filterConfig.xAxis || filterConfig.yAxis.length === 0) return [];

  const xCol = columns.find((c) => c.name === filterConfig.xAxis);
  const charts: ChartConfig[] = [];

  const xIsNumeric = xCol?.type === 'number';
  const xIsDate = xCol?.type === 'date';

  if (xIsNumeric || xIsDate) {
    charts.push({
      id: `chart-${++chartIdCounter}`,
      type: 'line',
      xAxis: filterConfig.xAxis,
      yAxis: filterConfig.yAxis,
      colorBy: filterConfig.colorBy ?? undefined,
    });
    charts.push({
      id: `chart-${++chartIdCounter}`,
      type: 'bar',
      xAxis: filterConfig.xAxis,
      yAxis: filterConfig.yAxis,
      colorBy: filterConfig.colorBy ?? undefined,
    });
  } else {
    charts.push({
      id: `chart-${++chartIdCounter}`,
      type: 'bar',
      xAxis: filterConfig.xAxis,
      yAxis: filterConfig.yAxis,
      colorBy: filterConfig.colorBy ?? undefined,
    });
    if (filterConfig.yAxis.length === 1) {
      charts.push({
        id: `chart-${++chartIdCounter}`,
        type: 'pie',
        xAxis: filterConfig.xAxis,
        yAxis: filterConfig.yAxis,
        colorBy: filterConfig.colorBy ?? undefined,
      });
    }
  }

  const numericYCols = filterConfig.yAxis.filter((yName) => {
    const col = columns.find((c) => c.name === yName);
    return col?.type === 'number';
  });

  if (numericYCols.length >= 1 && (xIsNumeric || xIsDate)) {
    charts.push({
      id: `chart-${++chartIdCounter}`,
      type: 'scatter',
      xAxis: filterConfig.xAxis,
      yAxis: numericYCols.slice(0, 1),
      colorBy: filterConfig.colorBy ?? undefined,
    });
  }

  if (!charts.find((c) => c.type === 'line') && (xIsNumeric || xIsDate)) {
    charts.push({
      id: `chart-${++chartIdCounter}`,
      type: 'line',
      xAxis: filterConfig.xAxis,
      yAxis: filterConfig.yAxis,
      colorBy: filterConfig.colorBy ?? undefined,
    });
  }

  const seen = new Set<string>();
  return charts.filter((c) => {
    const key = `${c.type}-${c.xAxis}-${c.yAxis.join(',')}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const buildInitialLayouts = (charts: ChartConfig[]): Record<string, Layout[]> => {
  const layout: Layout[] = charts.map((chart, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    return {
      i: chart.id,
      x: col * 6,
      y: row * 7,
      w: 6,
      h: 7,
      minW: 3,
      minH: 5,
    };
  });
  return { lg: layout, md: layout, sm: layout, xs: layout, xxs: layout };
};

const App: React.FC = () => {
  const [columns, setColumns] = useState<Column[]>([]);
  const [data, setData] = useState<DataRow[]>([]);
  const [filterConfig, setFilterConfig] = useState<FilterConfig>({
    xAxis: null,
    yAxis: [],
    colorBy: null,
  });
  const [charts, setCharts] = useState<ChartConfig[]>([]);
  const [layouts, setLayouts] = useState<Record<string, Layout[]>>({});
  const [panelCollapsed, setPanelCollapsed] = useState(false);
  const [hasData, setHasData] = useState(false);

  const handleDataParsed = useCallback((cols: Column[], rows: DataRow[]) => {
    setColumns(cols);
    setData(rows);
    setHasData(true);
    setFilterConfig({ xAxis: null, yAxis: [], colorBy: null });
    setCharts([]);
    setLayouts({});
  }, []);

  const handleFilterChange = useCallback(
    (newConfig: FilterConfig) => {
      setFilterConfig(newConfig);

      if (newConfig.xAxis && newConfig.yAxis.length > 0) {
        const newCharts = generateChartsFromFilter(newConfig, columns);
        setCharts(newCharts);
        setLayouts(buildInitialLayouts(newCharts));
      } else {
        setCharts([]);
        setLayouts({});
      }
    },
    [columns],
  );

  const handleLayoutChange = useCallback(
    (layout: Layout[], allLayouts: Record<string, Layout[]>) => {
      setLayouts(allLayouts);
    },
    [],
  );

  const handleDeleteChart = useCallback((id: string) => {
    setCharts((prev) => prev.filter((c) => c.id !== id));
    setLayouts((prev) => {
      const next: Record<string, Layout[]> = {};
      for (const [bp, ls] of Object.entries(prev)) {
        next[bp] = ls.filter((l) => l.i !== id);
      }
      return next;
    });
  }, []);

  const handleRefreshChart = useCallback((id: string) => {
    setCharts((prev) =>
      prev.map((c) =>
        c.id === id ? { ...c, id: `chart-${++chartIdCounter}` } : c,
      ),
    );
  }, []);

  return (
    <div
      style={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <header
        style={{
          height: '56px',
          background: '#FFFFFF',
          borderBottom: '1px solid #E5E7EB',
          display: 'flex',
          alignItems: 'center',
          padding: '0 20px',
          flexShrink: 0,
        }}
      >
        <div
          style={{
            fontSize: '16px',
            fontWeight: 700,
            color: '#1F2937',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span style={{ fontSize: '20px' }}>📊</span>
          数据可视化仪表盘
        </div>
        {hasData && (
          <button
            onClick={() => setPanelCollapsed(!panelCollapsed)}
            style={{
              marginLeft: 'auto',
              padding: '6px 12px',
              borderRadius: '6px',
              border: '1px solid #E5E7EB',
              background: '#FFFFFF',
              color: '#6B7280',
              fontSize: '12px',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            {panelCollapsed ? '展开面板' : '收起面板'}
          </button>
        )}
      </header>

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {!hasData ? (
          <div
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '40px',
            }}
          >
            <div style={{ width: '100%', maxWidth: '560px' }}>
              <div
                style={{
                  textAlign: 'center',
                  marginBottom: '32px',
                }}
              >
                <h1
                  style={{
                    fontSize: '28px',
                    fontWeight: 700,
                    color: '#1F2937',
                    marginBottom: '8px',
                  }}
                >
                  数据可视化仪表盘
                </h1>
                <p style={{ fontSize: '15px', color: '#6B7280' }}>
                  上传 CSV 或 JSON 数据，自动生成交互式图表
                </p>
              </div>
              <DataUpload onDataParsed={handleDataParsed} />
            </div>
          </div>
        ) : (
          <>
            {!panelCollapsed && (
              <DataPanel
                columns={columns}
                previewData={data}
                filterConfig={filterConfig}
                onFilterChange={handleFilterChange}
              />
            )}
            <ChartGrid
              charts={charts}
              data={data}
              layouts={layouts}
              onLayoutChange={handleLayoutChange}
              onDeleteChart={handleDeleteChart}
              onRefreshChart={handleRefreshChart}
            />
          </>
        )}
      </div>
    </div>
  );
};

export default App;
