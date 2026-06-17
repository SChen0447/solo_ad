export type DataRow = Record<string, string | number>;

export type AggMethod = 'sum' | 'avg' | 'count' | 'max' | 'min' | 'std';

export interface PivotConfig {
  rowFields: string[];
  colFields: string[];
  valueFields: { field: string; agg: AggMethod }[];
}

export interface FilterState {
  rangeFilters: { field: string; min: number; max: number }[];
  categoryFilters: { field: string; values: string[] }[];
}

export interface PivotResult {
  headers: string[];
  rows: DataRow[];
}

export interface UploadResponse {
  columns: string[];
  rows: DataRow[];
  totalRows: number;
}

export interface PivotRequest {
  data: DataRow[];
  config: PivotConfig;
}

export interface ChartDataPoint {
  [key: string]: string | number;
}

export const CHART_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'] as const;

export const AGG_LABELS: Record<AggMethod, string> = {
  sum: '求和',
  avg: '平均值',
  count: '计数',
  max: '最大值',
  min: '最小值',
  std: '标准差',
};
