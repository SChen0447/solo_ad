export type HttpMethod = 'GET' | 'POST';

export type ChartType = 'bar' | 'line' | 'pie';

export type CacheDuration = 'none' | '1min' | '5min' | '15min' | '30min';

export const CACHE_DURATION_OPTIONS: { value: CacheDuration; label: string; minutes: number }[] = [
  { value: 'none', label: '不缓存', minutes: 0 },
  { value: '1min', label: '1分钟', minutes: 1 },
  { value: '5min', label: '5分钟', minutes: 5 },
  { value: '15min', label: '15分钟', minutes: 15 },
  { value: '30min', label: '30分钟', minutes: 30 }
];

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
  cacheDuration: CacheDuration;
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
  fromCache?: boolean;
  cachedAt?: number;
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
