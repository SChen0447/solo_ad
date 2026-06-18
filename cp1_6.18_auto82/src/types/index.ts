export type FieldType = 'dimension' | 'measure';

export interface FieldDef {
  key: string;
  label: string;
  type: FieldType;
}

export interface RawDataRow {
  region: string;
  year: string;
  category: string;
  sales: number;
  profit: number;
  quantity: number;
}

export interface PivotConfig {
  rowFields: string[];
  colFields: string[];
  valFields: string[];
}

export type ActiveFilters = Record<string, string[]>;

export type ChartType = 'bar' | 'line' | 'pie';
export type SortOrder = 'asc' | 'desc' | 'none';

export interface ChartState {
  chartType: ChartType;
  sortOrder: SortOrder;
  highlightedKeys: string[];
}

export interface AggregatedCell {
  rowKey: string;
  colKey: string;
  value: number;
  rowLabel: string;
  colLabel: string;
}

export interface AggregatedResult {
  rowKeys: string[];
  colKeys: string[];
  rowLabels: string[];
  colLabels: string[];
  cells: AggregatedCell[][];
}

export interface ChartDataPoint {
  key: string;
  label: string;
  value: number;
  highlighted: boolean;
}

export type DropZone = 'row' | 'col' | 'val';

export interface FilterEvent {
  dimension: string;
  values: string[];
}
