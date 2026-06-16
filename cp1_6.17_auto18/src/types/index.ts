export interface StudentScore {
  id: string;
  studentName: string;
  subject: string;
  score: number;
  date: string;
}

export type ChartType = 'histogram' | 'line' | 'bar' | 'radar' | 'scatter';

export interface ChartConfig {
  id: string;
  type: ChartType;
  title: string;
  x: number;
  y: number;
  width: number;
  height: number;
  subject?: string;
}

export interface Annotation {
  id: string;
  chartId: string;
  dataPointKey: string;
  content: string;
  offsetX: number;
  offsetY: number;
}

export interface ParseResult {
  data: StudentScore[];
  errors: string[];
  isLoading: boolean;
}

export interface HistogramData {
  range: string;
  count: number;
  subject?: string;
}

export interface LineData {
  date: string;
  score: number;
  subject?: string;
}

export interface BarData {
  subject: string;
  average: number;
}

export interface RadarData {
  subject: string;
  score: number;
  fullMark: number;
}

export interface ScatterData {
  score: number;
  studentIndex: number;
  subject: string;
  studentName?: string;
}

export const CHART_TYPE_LABELS: Record<ChartType, string> = {
  histogram: '分数分布直方图',
  line: '成绩趋势折线图',
  bar: '平均分对比柱状图',
  radar: '多科能力雷达图',
  scatter: '成绩分布散点图',
};

export const DEFAULT_CHART_WIDTH = 2;
export const DEFAULT_CHART_HEIGHT = 2;
export const GRID_COLUMNS = 12;
export const GRID_ROW_HEIGHT = 180;
export const GRID_GAP = 16;
export const SIDEBAR_WIDTH = 260;
