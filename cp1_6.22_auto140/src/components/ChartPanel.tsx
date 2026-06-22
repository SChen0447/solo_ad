import React, { useRef, useEffect, useMemo } from 'react';
import * as echarts from 'echarts';
import { DataRow, FieldMapping, FilterCondition, SortConfig, ChartType, AggregationType, FIELD_META } from '../types';

interface ChartPanelProps {
  data: DataRow[];
  fieldMapping: FieldMapping;
  filters: FilterCondition[];
  sortConfig: SortConfig;
  chartType: ChartType;
  onChartTypeChange: (type: ChartType) => void;
  highlightedRow: string | null;
  highlightedCol: string | null;
  darkMode: boolean;
}

function applyFilters(data: DataRow[], filters: FilterCondition[]): DataRow[] {
  return data.filter((row) => {
    return filters.every((filter) => {
      const val = row[filter.field as keyof DataRow];
      if (filter.type === 'range' && filter.valueRange) {
        const num = Number(val);
        return num >= filter.valueRange[0] && num <= filter.valueRange[1];
      }
      if (filter.type === 'text' && filter.textContains !== undefined) {
        return String(val).includes(filter.textContains);
      }
      if (filter.type === 'dateRange' && filter.dateRange) {
        const d = String(val);
        return d >= filter.dateRange[0] && d <= filter.dateRange[1];
      }
      return true;
    });
  });
}

function aggregate(values: number[], type: AggregationType): number {
  if (values.length === 0) return 0;
  switch (type) {
    case 'sum': return values.reduce((a, b) => a + b, 0);
    case 'avg': return values.reduce((a, b) => a + b, 0) / values.length;
    case 'count': return values.length;
    case 'max': return Math.max(...values);
    case 'min': return Math.min(...values);
    default: return values.reduce((a, b) => a + b, 0);
  }
}

const ChartPanel: React.FC<ChartPanelProps> = ({
  data,
  fieldMapping,
  filters,
  sortConfig,
  chartType,
  onChartTypeChange,
  highlightedRow,
  highlightedCol,
  darkMode,
}) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);

  const chartData = useMemo(() => {
    const filtered = applyFilters(data, filters);
    const { row, col, value } = fieldMapping;
    if (value.length === 0) return { categories: [], series: [] };

    const groups: Record<string, Record<string, number[]>> = {};
    const categoriesSet = new Set<string>();

    for (const item of filtered) {
      const rowKey = row.length > 0 ? row.map((f) => String(item[f as keyof DataRow])).join(' | ') : '(总计)';
      const colKey = col.length > 0 ? col.map((f) => String(item[f as keyof DataRow])).join(' | ') : '(默认)';
      categoriesSet.add(rowKey);

      if (!groups[colKey]) groups[colKey] = {};
      if (!groups[colKey][rowKey]) groups[colKey][rowKey] = [];

      const v = value[0];
      const numVal = Number(item[v.field as keyof DataRow]);
      if (!isNaN(numVal)) {
        groups[colKey][rowKey].push(numVal);
      }
    }

    const categories = Array.from(categoriesSet);
    const colKeys = Object.keys(groups);

    const series = colKeys.map((ck) => ({
      name: ck,
      data: categories.map((cat) => {
        const vals = groups[ck]?.[cat] || [];
        return aggregate(vals, value[0].aggregation);
      }),
    }));

    return { categories, series };
  }, [data, fieldMapping, filters]);

  useEffect(() => {
    if (!chartRef.current) return;

    if (!chartInstance.current) {
      chartInstance.current = echarts.init(chartRef.current);
    }

    const { categories, series } = chartData;
    if (categories.length === 0) {
      chartInstance.current.setOption({
        title: {
          text: '请添加数值字段以显示图表',
          left: 'center',
          top: 'center',
          textStyle: { color: darkMode ? '#94a3b8' : '#64748b', fontSize: 14 },
        },
        xAxis: { show: false },
        yAxis: { show: false },
        series: [],
      }, true);
      return;
    }

    const highlightedCategories = highlightedRow
      ? [highlightedRow]
      : [];
    const highlightedSeries = highlightedCol
      ? [highlightedCol]
      : [];

    let option: echarts.EChartsOption = {};

    const textColor = darkMode ? '#e2e8f0' : '#334155';
    const axisLineColor = darkMode ? '#334155' : '#e2e8f0';
    const splitLineColor = darkMode ? '#1e293b' : '#f1f5f9';

    if (chartType === 'bar') {
      option = {
        backgroundColor: 'transparent',
        tooltip: { trigger: 'axis' },
        legend: { textStyle: { color: textColor } },
        grid: { left: 60, right: 20, top: 40, bottom: 40 },
        xAxis: {
          type: 'category',
          data: categories,
          axisLabel: { color: textColor, rotate: categories.length > 8 ? 30 : 0 },
          axisLine: { lineStyle: { color: axisLineColor } },
        },
        yAxis: {
          type: 'value',
          axisLabel: { color: textColor },
          axisLine: { lineStyle: { color: axisLineColor } },
          splitLine: { lineStyle: { color: splitLineColor } },
        },
        series: series.map((s, idx) => ({
          name: s.name,
          type: 'bar',
          data: s.data.map((val, i) => ({
            value: val,
            itemStyle: {
              color: (highlightedCategories.includes(categories[i]) || highlightedSeries.includes(s.name))
                ? '#3b82f6'
                : undefined,
            },
            offset: (highlightedCategories.includes(categories[i]) || highlightedSeries.includes(s.name)) ? 20 : 0,
          })),
          itemStyle: { borderRadius: [4, 4, 0, 0] },
          animationDuration: 500,
          animationEasing: 'cubicOut',
        })),
      };
    } else if (chartType === 'line') {
      option = {
        backgroundColor: 'transparent',
        tooltip: { trigger: 'axis' },
        legend: { textStyle: { color: textColor } },
        grid: { left: 60, right: 20, top: 40, bottom: 40 },
        xAxis: {
          type: 'category',
          data: categories,
          axisLabel: { color: textColor, rotate: categories.length > 8 ? 30 : 0 },
          axisLine: { lineStyle: { color: axisLineColor } },
        },
        yAxis: {
          type: 'value',
          axisLabel: { color: textColor },
          axisLine: { lineStyle: { color: axisLineColor } },
          splitLine: { lineStyle: { color: splitLineColor } },
        },
        series: series.map((s) => ({
          name: s.name,
          type: 'line',
          data: s.data.map((val, i) => ({
            value: val,
            symbolSize: (highlightedCategories.includes(categories[i]) || highlightedSeries.includes(s.name)) ? 10 : 4,
            symbolOffset: (highlightedCategories.includes(categories[i]) || highlightedSeries.includes(s.name)) ? [20, 0] : [0, 0],
          })),
          smooth: true,
          animationDuration: 500,
          animationEasing: 'cubicOut',
        })),
      };
    } else if (chartType === 'stackedArea') {
      option = {
        backgroundColor: 'transparent',
        tooltip: { trigger: 'axis' },
        legend: { textStyle: { color: textColor } },
        grid: { left: 60, right: 20, top: 40, bottom: 40 },
        xAxis: {
          type: 'category',
          data: categories,
          boundaryGap: false,
          axisLabel: { color: textColor, rotate: categories.length > 8 ? 30 : 0 },
          axisLine: { lineStyle: { color: axisLineColor } },
        },
        yAxis: {
          type: 'value',
          axisLabel: { color: textColor },
          axisLine: { lineStyle: { color: axisLineColor } },
          splitLine: { lineStyle: { color: splitLineColor } },
        },
        series: series.map((s, idx) => ({
          name: s.name,
          type: 'line',
          stack: 'total',
          areaStyle: { opacity: 0.5 },
          data: s.data,
          animationDuration: 500,
          animationEasing: 'cubicOut',
        })),
      };
    } else if (chartType === 'scatter') {
      const v1 = fieldMapping.value[0];
      const v2 = fieldMapping.value[1] || fieldMapping.value[0];
      const scatterData = applyFilters(data, filters).map((item) => ({
        value: [
          Number(item[v1.field as keyof DataRow]),
          Number(item[v2.field as keyof DataRow]),
        ],
      }));
      option = {
        backgroundColor: 'transparent',
        tooltip: {},
        grid: { left: 60, right: 20, top: 40, bottom: 40 },
        xAxis: {
          type: 'value',
          name: FIELD_META.find((f) => f.key === v1.field)?.label || v1.field,
          axisLabel: { color: textColor },
          axisLine: { lineStyle: { color: axisLineColor } },
          splitLine: { lineStyle: { color: splitLineColor } },
        },
        yAxis: {
          type: 'value',
          name: FIELD_META.find((f) => f.key === v2.field)?.label || v2.field,
          axisLabel: { color: textColor },
          axisLine: { lineStyle: { color: axisLineColor } },
          splitLine: { lineStyle: { color: splitLineColor } },
        },
        series: [{
          type: 'scatter',
          data: scatterData,
          symbolSize: 6,
          itemStyle: { color: '#3b82f6', opacity: 0.7 },
          animationDuration: 500,
        }],
      };
    } else if (chartType === 'heatmap') {
      if (series.length > 0 && categories.length > 0) {
        const heatData: [number, number, number][] = [];
        series.forEach((s, yIdx) => {
          s.data.forEach((val, xIdx) => {
            heatData.push([xIdx, yIdx, val]);
          });
        });
        const allVals = heatData.map((d) => d[2]);
        const minVal = Math.min(...allVals);
        const maxVal = Math.max(...allVals);
        option = {
          backgroundColor: 'transparent',
          tooltip: {
            formatter: (p: any) => `${categories[p.data[0]]} / ${series[p.data[1]].name}: ${p.data[2].toLocaleString()}`,
          },
          grid: { left: 120, right: 60, top: 20, bottom: 80 },
          xAxis: {
            type: 'category',
            data: categories,
            axisLabel: { color: textColor, rotate: categories.length > 8 ? 30 : 0 },
            axisLine: { lineStyle: { color: axisLineColor } },
          },
          yAxis: {
            type: 'category',
            data: series.map((s) => s.name),
            axisLabel: { color: textColor },
            axisLine: { lineStyle: { color: axisLineColor } },
          },
          visualMap: {
            min: minVal,
            max: maxVal,
            calculable: true,
            orient: 'vertical',
            right: 10,
            top: 'center',
            textStyle: { color: textColor },
            inRange: { color: ['#e0f2fe', '#3b82f6', '#1e40af'] },
          },
          series: [{
            type: 'heatmap',
            data: heatData,
            label: { show: categories.length < 20, color: textColor, fontSize: 10 },
            animationDuration: 500,
          }],
        };
      }
    }

    chartInstance.current.setOption(option, true);
  }, [chartData, chartType, darkMode, highlightedRow, highlightedCol]);

  useEffect(() => {
    const handleResize = () => {
      chartInstance.current?.resize();
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    return () => {
      chartInstance.current?.dispose();
    };
  }, []);

  const chartTypes: { key: ChartType; label: string }[] = [
    { key: 'bar', label: '柱状图' },
    { key: 'line', label: '折线图' },
    { key: 'stackedArea', label: '堆叠面积图' },
    { key: 'scatter', label: '散点图' },
    { key: 'heatmap', label: '热力图' },
  ];

  return (
    <div className={`chart-panel ${darkMode ? 'dark' : ''}`}>
      <div className="chart-toolbar">
        <span className="chart-toolbar-label">图表类型:</span>
        {chartTypes.map((ct) => (
          <button
            key={ct.key}
            className={`chart-type-btn ${chartType === ct.key ? 'active' : ''}`}
            onClick={() => onChartTypeChange(ct.key)}
          >
            {ct.label}
          </button>
        ))}
      </div>
      <div className="chart-area">
        <div ref={chartRef} className="chart-instance" />
      </div>
    </div>
  );
};

export default ChartPanel;
