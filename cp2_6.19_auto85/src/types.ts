export interface Column {
  name: string;
  type: 'number' | 'string' | 'date';
  uniqueValues?: number;
  min?: number;
  max?: number;
  sample?: string[];
}

export type DataRow = Record<string, unknown>;

export interface ChartConfig {
  id: string;
  type: 'line' | 'bar' | 'pie' | 'scatter';
  xAxis: string;
  yAxis: string[];
  colorBy?: string;
}

export interface FilterConfig {
  xAxis: string | null;
  yAxis: string[];
  colorBy: string | null;
}

export type ChartType = 'line' | 'bar' | 'pie' | 'scatter';

export const CHART_COLORS = [
  '#3B82F6',
  '#10B981',
  '#F59E0B',
  '#8B5CF6',
  '#EF4444',
  '#EC4899',
  '#14B8A6',
  '#F97316',
];
