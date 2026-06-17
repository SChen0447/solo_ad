export type HttpMethod = 'GET' | 'POST';

export type ChartType = 'bar' | 'line' | 'pie';

export interface QueryParam {
  key: string;
  value: string;
}

export interface HeaderParam {
  key: string;
  value: string;
}

export interface ApiConfig {
  id: string;
  name: string;
  url: string;
  method: HttpMethod;
  headers: HeaderParam[];
  params: QueryParam[];
}

export interface TableRow {
  [key: string]: string | number | boolean | null;
}

export interface ChartDataPoint {
  label: string;
  value: number;
}

export interface ApiResult {
  configId: string;
  status: 'success' | 'error' | 'loading';
  data?: TableRow[];
  chartData?: ChartDataPoint[];
  error?: string;
  raw?: unknown;
}

export interface AppState {
  configs: ApiConfig[];
  results: ApiResult[];
  isLoading: boolean;
  expandedCards: Set<string>;
  chartTypes: Map<string, ChartType>;
}

export interface AppContextType {
  state: AppState;
  addConfig: () => void;
  updateConfig: (id: string, config: Partial<ApiConfig>) => void;
  removeConfig: (id: string) => void;
  reorderConfigs: (fromIndex: number, toIndex: number) => void;
  toggleCard: (id: string) => void;
  setChartType: (configId: string, type: ChartType) => void;
  executeQueries: () => Promise<void>;
  clearResult: (configId: string) => void;
  exportConfig: () => void;
  importConfig: (file: File) => Promise<void>;
}
