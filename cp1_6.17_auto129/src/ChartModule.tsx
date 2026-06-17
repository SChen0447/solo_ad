import React, { useState, useCallback, useRef, useMemo } from 'react';
import {
  LineChart, Line, BarChart, Bar, AreaChart, Area, ScatterChart, Scatter,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell,
} from 'recharts';
import type { PivotResult, PivotConfig, DataRow, ChartDataPoint } from './types';
import { CHART_COLORS } from './types';

interface Props {
  pivotResult: PivotResult;
  pivotConfig: PivotConfig;
  originalData: DataRow[];
  highlightedRows: Set<number>;
  onHighlightChange: (indices: Set<number>) => void;
}

interface SelectionBox {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

export default function ChartModule({
  pivotResult,
  pivotConfig,
  originalData,
  highlightedRows,
  onHighlightChange,
}: Props) {
  const [chartSizes, setChartSizes] = useState([
    { width: 0, height: 300 },
    { width: 0, height: 300 },
    { width: 0, height: 300 },
    { width: 0, height: 300 },
  ]);
  const [resizing, setResizing] = useState<number | null>(null);
  const [selectionBox, setSelectionBox] = useState<SelectionBox | null>(null);
  const [activeChart, setActiveChart] = useState<number | null>(null);
  const chartRefs = useRef<(HTMLDivElement | null)[]>([null, null, null, null]);
  const resizeStart = useRef({ x: 0, y: 0, w: 0, h: 0 });

  const chartData = useMemo((): ChartDataPoint[] => {
    if (pivotResult.rows.length === 0) return [];
    const rowField = pivotConfig.rowFields[0];
    const valueFields = pivotConfig.valueFields;
    if (!rowField || valueFields.length === 0) return pivotResult.rows;
    return pivotResult.rows.map((row) => {
      const point: ChartDataPoint = { name: String(row[rowField] ?? row[pivotResult.headers[0]] ?? '') };
      pivotResult.headers.forEach((h) => {
        if (h !== rowField) {
          point[h] = Number(row[h]) || 0;
        }
      });
      return point;
    });
  }, [pivotResult, pivotConfig]);

  const dataKeys = useMemo(() => {
    const rowField = pivotConfig.rowFields[0];
    return pivotResult.headers.filter((h) => h !== rowField);
  }, [pivotResult.headers, pivotConfig.rowFields]);

  const xKey = useMemo(() => {
    return 'name';
  }, []);

  const handleMouseDown = useCallback((chartIdx: number, e: React.MouseEvent) => {
    if (e.button !== 0) return;
    const rect = chartRefs.current[chartIdx]?.getBoundingClientRect();
    if (!rect) return;
    setActiveChart(chartIdx);
    setSelectionBox({
      startX: e.clientX - rect.left,
      startY: e.clientY - rect.top,
      endX: e.clientX - rect.left,
      endY: e.clientY - rect.top,
    });
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (activeChart === null || !selectionBox) return;
    const rect = chartRefs.current[activeChart]?.getBoundingClientRect();
    if (!rect) return;
    setSelectionBox((prev) => prev ? {
      ...prev,
      endX: e.clientX - rect.left,
      endY: e.clientY - rect.top,
    } : null);
  }, [activeChart, selectionBox]);

  const handleMouseUp = useCallback(() => {
    if (activeChart === null || !selectionBox) return;
    const x1 = Math.min(selectionBox.startX, selectionBox.endX);
    const x2 = Math.max(selectionBox.startX, selectionBox.endX);
    const y1 = Math.min(selectionBox.startY, selectionBox.endY);
    const y2 = Math.max(selectionBox.startY, selectionBox.endY);
    if (Math.abs(x2 - x1) < 5 && Math.abs(y2 - y1) < 5) {
      setSelectionBox(null);
      setActiveChart(null);
      return;
    }
    const matched = new Set<number>();
    chartData.forEach((point, idx) => {
      const el = document.querySelector(`[data-chart="${activeChart}"][data-idx="${idx}"]`);
      if (el) {
        const r = el.getBoundingClientRect();
        const containerRect = chartRefs.current[activeChart]?.getBoundingClientRect();
        if (containerRect) {
          const px = r.left + r.width / 2 - containerRect.left;
          const py = r.top + r.height / 2 - containerRect.top;
          if (px >= x1 && px <= x2 && py >= y1 && py <= y2) {
            matched.add(idx);
          }
        }
      }
    });
    if (matched.size === 0) {
      const ratio1 = x1 / (chartRefs.current[activeChart]?.clientWidth || 1);
      const ratio2 = x2 / (chartRefs.current[activeChart]?.clientWidth || 1);
      const idx1 = Math.floor(ratio1 * chartData.length);
      const idx2 = Math.ceil(ratio2 * chartData.length);
      for (let i = Math.max(0, idx1); i < Math.min(chartData.length, idx2); i++) {
        matched.add(i);
      }
    }
    onHighlightChange(matched);
    setSelectionBox(null);
    setActiveChart(null);
  }, [activeChart, selectionBox, chartData, onHighlightChange]);

  const clearHighlight = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).tagName === 'svg' || (e.target as HTMLElement).tagName === 'path') {
      onHighlightChange(new Set());
    }
  }, [onHighlightChange]);

  const startResize = useCallback((chartIdx: number, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setResizing(chartIdx);
    resizeStart.current = {
      x: e.clientX,
      y: e.clientY,
      w: chartRefs.current[chartIdx]?.clientWidth || 600,
      h: chartSizes[chartIdx].height,
    };
    const onMove = (ev: MouseEvent) => {
      const dx = ev.clientX - resizeStart.current.x;
      const dy = ev.clientY - resizeStart.current.y;
      setChartSizes((prev) => {
        const next = [...prev];
        next[chartIdx] = {
          width: Math.max(0, resizeStart.current.w + dx),
          height: Math.max(200, resizeStart.current.h + dy),
        };
        return next;
      });
    };
    const onUp = () => {
      setResizing(null);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [chartSizes]);

  const charts = [
    { title: '折线图', type: 'line' as const },
    { title: '柱状图', type: 'bar' as const },
    { title: '堆叠面积图', type: 'area' as const },
    { title: '散点图', type: 'scatter' as const },
  ];

  const isHighlighted = useCallback((idx: number) => {
    return highlightedRows.has(idx);
  }, [highlightedRows]);

  return (
    <div id="chart-area" className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4" onMouseMove={handleMouseMove} onMouseUp={handleMouseUp}>
      {charts.map((chart, chartIdx) => (
        <div
          key={chart.type}
          ref={(el) => { chartRefs.current[chartIdx] = el; }}
          className="relative bg-white/70 backdrop-blur-glass rounded-xl shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1),0_0_0_1px_rgba(255,255,255,0.3)] overflow-hidden"
          style={{ minHeight: chartSizes[chartIdx].height }}
          data-chart-container={chartIdx}
        >
          <div
            className="absolute top-0 left-0 w-5 h-5 cursor-nwse-resize z-10 flex items-center justify-center"
            onMouseDown={(e) => startResize(chartIdx, e)}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="#9CA3AF">
              <circle cx="2" cy="2" r="1.5" />
              <circle cx="6" cy="2" r="1.5" />
              <circle cx="10" cy="2" r="1.5" />
              <circle cx="2" cy="6" r="1.5" />
              <circle cx="6" cy="6" r="1.5" />
              <circle cx="10" cy="6" r="1.5" />
              <circle cx="2" cy="10" r="1.5" />
              <circle cx="6" cy="10" r="1.5" />
              <circle cx="10" cy="10" r="1.5" />
            </svg>
          </div>
          <h4 className="text-xs font-semibold text-gray-600 px-4 pt-3 pb-1">{chart.title}</h4>
          <div
            className="px-2 pb-2"
            style={{ height: chartSizes[chartIdx].height - 30 }}
            onMouseDown={(e) => handleMouseDown(chartIdx, e)}
            onClick={clearHighlight}
          >
            <ResponsiveContainer width="100%" height="100%">
              {renderChart(chart.type, chartData, dataKeys, xKey, isHighlighted) ?? <div />}
            </ResponsiveContainer>
          </div>
          {selectionBox && activeChart === chartIdx && (
            <div
              className="absolute pointer-events-none border-2 border-blue-400 bg-blue-200/20"
              style={{
                left: Math.min(selectionBox.startX, selectionBox.endX),
                top: Math.min(selectionBox.startY, selectionBox.endY),
                width: Math.abs(selectionBox.endX - selectionBox.startX),
                height: Math.abs(selectionBox.endY - selectionBox.startY),
              }}
            />
          )}
          {resizing === chartIdx && (
            <div className="absolute inset-0 bg-blue-100/20 pointer-events-none transition-opacity duration-200" />
          )}
        </div>
      ))}
    </div>
  );
}

function renderChart(
  type: 'line' | 'bar' | 'area' | 'scatter',
  data: ChartDataPoint[],
  dataKeys: string[],
  xKey: string,
  isHighlighted: (idx: number) => boolean,
) {
  if (data.length === 0 || dataKeys.length === 0) {
    return <div className="flex items-center justify-center h-full text-gray-400 text-xs">暂无数据</div>;
  }

  const commonProps = {
    data,
    margin: { top: 5, right: 10, left: 0, bottom: 5 },
  };

  const commonAxisProps = {
    tick: { fontSize: 10, fill: '#9CA3AF' },
    axisLine: { stroke: '#E5E7EB' },
    tickLine: false,
  };

  switch (type) {
    case 'line':
      return (
        <LineChart {...commonProps}>
          <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
          <XAxis dataKey={xKey} {...commonAxisProps} />
          <YAxis {...commonAxisProps} />
          <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          {dataKeys.map((key, i) => (
            <Line
              key={key}
              type="monotone"
              dataKey={key}
              stroke={CHART_COLORS[i % CHART_COLORS.length]}
              strokeWidth={2}
              dot={(props: any) => {
                const { cx, cy, index } = props;
                const active = isHighlighted(index);
                return (
                  <circle
                    key={index}
                    cx={cx}
                    cy={cy}
                    r={active ? 5 : 3}
                    fill={CHART_COLORS[i % CHART_COLORS.length]}
                    opacity={active ? 1 : 0.5}
                    stroke={active ? '#fff' : 'none'}
                    strokeWidth={2}
                  />
                );
              }}
            />
          ))}
        </LineChart>
      );

    case 'bar':
      return (
        <BarChart {...commonProps}>
          <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
          <XAxis dataKey={xKey} {...commonAxisProps} />
          <YAxis {...commonAxisProps} />
          <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          {dataKeys.map((key, i) => (
            <Bar key={key} dataKey={key} fill={CHART_COLORS[i % CHART_COLORS.length]} radius={[2, 2, 0, 0]}>
              {data.map((_, idx) => (
                <Cell
                  key={idx}
                  opacity={isHighlighted(idx) ? 1 : 0.5}
                  fill={CHART_COLORS[i % CHART_COLORS.length]}
                />
              ))}
            </Bar>
          ))}
        </BarChart>
      );

    case 'area':
      return (
        <AreaChart {...commonProps}>
          <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
          <XAxis dataKey={xKey} {...commonAxisProps} />
          <YAxis {...commonAxisProps} />
          <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          {dataKeys.map((key, i) => (
            <Area
              key={key}
              type="monotone"
              dataKey={key}
              stackId="1"
              stroke={CHART_COLORS[i % CHART_COLORS.length]}
              fill={CHART_COLORS[i % CHART_COLORS.length]}
              fillOpacity={0.6}
            />
          ))}
        </AreaChart>
      );

    case 'scatter':
      if (dataKeys.length < 2) {
        return (
          <ScatterChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
            <XAxis dataKey={dataKeys[0] || 'x'} name={dataKeys[0] || 'x'} {...commonAxisProps} />
            <YAxis dataKey={dataKeys[0] || 'y'} name={dataKeys[0] || 'y'} {...commonAxisProps} />
            <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
            <Scatter
              data={data}
              fill={CHART_COLORS[0]}
            >
              {data.map((_, idx) => (
                <Cell
                  key={idx}
                  opacity={isHighlighted(idx) ? 1 : 0.4}
                  r={isHighlighted(idx) ? 6 : 4}
                />
              ))}
            </Scatter>
          </ScatterChart>
        );
      }
      return (
        <ScatterChart {...commonProps}>
          <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
          <XAxis dataKey={dataKeys[0]} name={dataKeys[0]} type="number" {...commonAxisProps} />
          <YAxis dataKey={dataKeys.length > 1 ? dataKeys[1] : dataKeys[0]} name={dataKeys.length > 1 ? dataKeys[1] : dataKeys[0]} type="number" {...commonAxisProps} />
          <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Scatter
            data={data}
            fill={CHART_COLORS[0]}
            name={`${dataKeys[0]} vs ${dataKeys.length > 1 ? dataKeys[1] : dataKeys[0]}`}
          >
            {data.map((_, idx) => (
              <Cell
                key={idx}
                opacity={isHighlighted(idx) ? 1 : 0.4}
                r={isHighlighted(idx) ? 6 : 4}
              />
            ))}
          </Scatter>
        </ScatterChart>
      );

    default:
      return null;
  }
}
