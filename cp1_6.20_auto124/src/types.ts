export type ChartType = "line" | "bar" | "pie" | "area";
export type CardSize = "small" | "medium" | "large";
export type DataSourceType = "json" | "api" | "csv";

export interface Dashboard {
  id: string;
  name: string;
}

export interface ChartCardData {
  id: string;
  dashboardId: string;
  chartType: ChartType;
  size: CardSize;
  order: number;
  dataSourceId: string;
  fieldMapping: { x?: string; y?: string; label?: string; value?: string };
}

export interface ParsedData {
  columns: string[];
  rows: Record<string, string | number>[];
  columnTypes: Record<string, string>;
}

export interface DataSource {
  id: string;
  name: string;
  type: DataSourceType;
  jsonContent?: string;
  apiUrl?: string;
  pollInterval?: number;
  csvData?: string;
  parsedData?: ParsedData;
  lastUpdated: string;
}
