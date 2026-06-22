export interface DataRow {
  id: number;
  date: string;
  region: string;
  product: string;
  category: string;
  channel: string;
  status: string;
  sales: number;
  quantity: number;
  unitPrice: number;
  profit: number;
  discount: number;
  cost: number;
  customerAge: number;
  customerGender: string;
  orderCount: number;
  returnRate: number;
  satisfaction: number;
  deliveryDays: number;
  isRepeat: boolean;
}

export type FieldType = 'row' | 'col' | 'value' | null;

export type AggregationType = 'sum' | 'avg' | 'count' | 'max' | 'min';

export type ChartType = 'bar' | 'line' | 'stackedArea' | 'scatter' | 'heatmap';

export interface FieldMapping {
  row: string[];
  col: string[];
  value: { field: string; aggregation: AggregationType }[];
}

export interface FilterCondition {
  field: string;
  type: 'range' | 'text' | 'dateRange';
  valueRange?: [number, number];
  textContains?: string;
  dateRange?: [string, string];
}

export interface SortConfig {
  primary: { field: string; direction: 'asc' | 'desc' } | null;
  secondary: { field: string; direction: 'asc' | 'desc' } | null;
}

export interface Snapshot {
  id: string;
  name: string;
  fieldMapping: FieldMapping;
  filters: FilterCondition[];
  sortConfig: SortConfig;
  chartType: ChartType;
  createdAt: string;
}

export const FIELD_META: { key: string; label: string; type: 'text' | 'number' | 'date' }[] = [
  { key: 'date', label: '日期', type: 'date' },
  { key: 'region', label: '区域', type: 'text' },
  { key: 'product', label: '产品', type: 'text' },
  { key: 'category', label: '类别', type: 'text' },
  { key: 'channel', label: '渠道', type: 'text' },
  { key: 'status', label: '状态', type: 'text' },
  { key: 'customerGender', label: '客户性别', type: 'text' },
  { key: 'isRepeat', label: '是否复购', type: 'text' },
  { key: 'sales', label: '销售额', type: 'number' },
  { key: 'quantity', label: '数量', type: 'number' },
  { key: 'unitPrice', label: '单价', type: 'number' },
  { key: 'profit', label: '利润', type: 'number' },
  { key: 'discount', label: '折扣率', type: 'number' },
  { key: 'cost', label: '成本', type: 'number' },
  { key: 'customerAge', label: '客户年龄', type: 'number' },
  { key: 'orderCount', label: '订单数', type: 'number' },
  { key: 'returnRate', label: '退货率', type: 'number' },
  { key: 'satisfaction', label: '满意度', type: 'number' },
  { key: 'deliveryDays', label: '配送天数', type: 'number' },
];
