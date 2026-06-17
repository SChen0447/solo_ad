import { TableRow, ChartDataPoint } from '../types';

export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isArray(value: unknown): value is unknown[] {
  return Array.isArray(value);
}

export function flattenObject(
  obj: Record<string, unknown>,
  prefix = ''
): Record<string, string | number | boolean | null> {
  const result: Record<string, string | number | boolean | null> = {};
  
  for (const key in obj) {
    const value = obj[key];
    const newKey = prefix ? `${prefix}.${key}` : key;
    
    if (isObject(value)) {
      Object.assign(result, flattenObject(value, newKey));
    } else if (isArray(value)) {
      result[newKey] = JSON.stringify(value);
    } else {
      result[newKey] = value as string | number | boolean | null;
    }
  }
  
  return result;
}

export function extractArrayData(data: unknown): TableRow[] {
  if (isArray(data)) {
    if (data.length === 0) {
      return [];
    }
    
    const firstItem = data[0];
    
    if (isObject(firstItem)) {
      return data.map((item) => {
        if (isObject(item)) {
          return flattenObject(item);
        }
        return { value: String(item) };
      });
    }
    
    return data.map((item, index) => ({
      index: index + 1,
      value: String(item)
    }));
  }
  
  if (isObject(data)) {
    const keys = Object.keys(data);
    if (keys.length === 1 && isArray(data[keys[0]])) {
      return extractArrayData(data[keys[0]]);
    }
    return [flattenObject(data)];
  }
  
  return [{ value: String(data) }];
}

export function findNumericFields(rows: TableRow[]): string[] {
  if (rows.length === 0) return [];
  
  const firstRow = rows[0];
  return Object.keys(firstRow).filter(key => {
    const value = firstRow[key];
    return typeof value === 'number' && !isNaN(value);
  });
}

export function findLabelFields(rows: TableRow[]): string[] {
  if (rows.length === 0) return [];
  
  const firstRow = rows[0];
  return Object.keys(firstRow).filter(key => {
    const value = firstRow[key];
    return typeof value === 'string';
  });
}

export function convertToChartData(
  rows: TableRow[],
  maxPoints = 10
): ChartDataPoint[] {
  if (rows.length === 0) return [];
  
  const numericFields = findNumericFields(rows);
  const labelFields = findLabelFields(rows);
  
  if (numericFields.length === 0) {
    return rows.slice(0, maxPoints).map((row, index) => ({
      label: labelFields.length > 0 ? String(row[labelFields[0]]) : `项 ${index + 1}`,
      value: 1
    }));
  }
  
  const valueField = numericFields[0];
  const labelField = labelFields.length > 0 ? labelFields[0] : null;
  
  return rows.slice(0, maxPoints).map((row, index) => ({
    label: labelField ? String(row[labelField]) : `项 ${index + 1}`,
    value: Number(row[valueField]) || 0
  }));
}

export function transformApiResponse(rawData: unknown): {
  tableData: TableRow[];
  chartData: ChartDataPoint[];
} {
  const tableData = extractArrayData(rawData);
  const chartData = convertToChartData(tableData);
  return { tableData, chartData };
}

export function formatValue(value: string | number | boolean | null): string {
  if (value === null || value === undefined) return '-';
  if (typeof value === 'boolean') return value ? '是' : '否';
  if (typeof value === 'number') return value.toLocaleString();
  return String(value);
}
