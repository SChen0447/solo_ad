import Papa from 'papaparse';

export type ColumnType = 'number' | 'string' | 'date' | 'boolean' | 'mixed';

export interface ColumnMeta {
  name: string;
  type: ColumnType;
  uniqueCount: number;
  nullCount: number;
  sampleValues: unknown[];
}

export interface DataSummary {
  totalRows: number;
  totalColumns: number;
  nullRatio: number;
  columns: ColumnMeta[];
}

export interface ParsedData {
  rows: Record<string, unknown>[];
  headers: string[];
  summary: DataSummary;
}

const MAX_ROWS_PREVIEW = 20;
const CHUNK_SIZE = 10000;

function detectValueType(value: unknown): ColumnType {
  if (value === null || value === undefined || value === '') return 'mixed';
  if (typeof value === 'number') return 'number';
  if (typeof value === 'boolean') return 'boolean';
  if (value instanceof Date && !isNaN(value.getTime())) return 'date';
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed === '') return 'mixed';
    if (!isNaN(Number(trimmed)) && trimmed !== '') return 'number';
    const dateParsed = new Date(trimmed);
    if (!isNaN(dateParsed.getTime()) && /\d/.test(trimmed)) return 'date';
    if (trimmed.toLowerCase() === 'true' || trimmed.toLowerCase() === 'false') return 'boolean';
    return 'string';
  }
  return 'mixed';
}

function reconcileTypes(types: ColumnType[]): ColumnType {
  const unique = [...new Set(types.filter(t => t !== 'mixed'))];
  if (unique.length === 0) return 'mixed';
  if (unique.length === 1) return unique[0];
  if (unique.every(t => t === 'number' || t === 'string')) return 'mixed';
  return 'mixed';
}

function convertValue(value: unknown, targetType: ColumnType): unknown {
  if (value === null || value === undefined || value === '') return null;
  if (targetType === 'number') {
    if (typeof value === 'number') return value;
    const n = Number(String(value).trim());
    return isNaN(n) ? null : n;
  }
  if (targetType === 'date') {
    if (value instanceof Date) return value;
    const d = new Date(String(value).trim());
    return isNaN(d.getTime()) ? null : d;
  }
  if (targetType === 'boolean') {
    if (typeof value === 'boolean') return value;
    const s = String(value).trim().toLowerCase();
    if (s === 'true') return true;
    if (s === 'false') return false;
    return null;
  }
  return String(value).trim();
}

export function parseCSV(content: string): ParsedData {
  const result = Papa.parse<Record<string, string>>(content, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: false
  });

  if (result.errors.length > 0 && result.data.length === 0) {
    throw new Error('CSV 解析失败：' + result.errors[0].message);
  }

  const rawRows = result.data;
  const headers = result.meta.fields || [];

  return buildParsedData(rawRows, headers);
}

export function parseJSON(content: string): ParsedData {
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch (e) {
    throw new Error('JSON 解析失败：' + (e as Error).message);
  }

  let rows: Record<string, unknown>[] = [];
  let headers: string[] = [];

  if (Array.isArray(parsed)) {
    if (parsed.length === 0) {
      return { rows: [], headers: [], summary: { totalRows: 0, totalColumns: 0, nullRatio: 0, columns: [] } };
    }
    const first = parsed[0];
    if (typeof first === 'object' && first !== null && !Array.isArray(first)) {
      headers = Object.keys(first);
      rows = parsed.map(item => {
        const obj: Record<string, unknown> = {};
        headers.forEach(h => {
          obj[h] = (item as Record<string, unknown>)[h];
        });
        return obj;
      });
    } else {
      headers = ['value'];
      rows = parsed.map(item => ({ value: item }));
    }
  } else if (typeof parsed === 'object' && parsed !== null) {
    headers = Object.keys(parsed as Record<string, unknown>);
    rows = [parsed as Record<string, unknown>];
  } else {
    headers = ['value'];
    rows = [{ value: parsed }];
  }

  return buildParsedData(rows, headers);
}

function buildParsedData(rawRows: Record<string, unknown>[], headers: string[]): ParsedData {
  const totalRows = rawRows.length;
  const totalColumns = headers.length;

  const columnTypeMap: Map<string, ColumnType[]> = new Map();
  const columnValueMap: Map<string, Set<unknown>> = new Map();
  const columnNullMap: Map<string, number> = new Map();
  const columnSampleMap: Map<string, unknown[]> = new Map();

  headers.forEach(h => {
    columnTypeMap.set(h, []);
    columnValueMap.set(h, new Set());
    columnNullMap.set(h, 0);
    columnSampleMap.set(h, []);
  });

  const sampleLimit = 5;
  const processChunk = (start: number, end: number) => {
    const stop = Math.min(end, totalRows);
    for (let i = start; i < stop; i++) {
      const row = rawRows[i];
      headers.forEach(h => {
        const val = row[h];
        const types = columnTypeMap.get(h)!;
        const values = columnValueMap.get(h)!;
        const samples = columnSampleMap.get(h)!;
        if (val === null || val === undefined || val === '') {
          columnNullMap.set(h, (columnNullMap.get(h) || 0) + 1);
        } else {
          types.push(detectValueType(val));
          const strVal = typeof val === 'object' ? JSON.stringify(val) : val;
          values.add(strVal);
          if (samples.length < sampleLimit) samples.push(val);
        }
      });
    }
  };

  if (totalRows <= 10000) {
    processChunk(0, totalRows);
  } else {
    const firstChunk = Math.min(5000, totalRows);
    processChunk(0, firstChunk);
    const sampleStep = Math.floor((totalRows - firstChunk) / 5000);
    for (let i = firstChunk; i < totalRows; i += Math.max(1, sampleStep)) {
      processChunk(i, i + 1);
    }
  }

  const columns: ColumnMeta[] = headers.map(h => {
    const types = columnTypeMap.get(h)!;
    const finalType = reconcileTypes(types);
    const uniqueCount = columnValueMap.get(h)!.size;
    const nullCount = columnNullMap.get(h)!;
    const sampleValues = columnSampleMap.get(h)!.map(v => convertValue(v, finalType));
    return { name: h, type: finalType, uniqueCount, nullCount, sampleValues };
  });

  const typedRows: Record<string, unknown>[] = rawRows.map(row => {
    const obj: Record<string, unknown> = {};
    columns.forEach(col => {
      obj[col.name] = convertValue(row[col.name], col.type);
    });
    return obj;
  });

  let totalNulls = 0;
  const totalCells = totalRows * totalColumns;
  columns.forEach(c => { totalNulls += c.nullCount; });
  const nullRatio = totalCells === 0 ? 0 : totalNulls / totalCells;

  const summary: DataSummary = {
    totalRows,
    totalColumns,
    nullRatio,
    columns
  };

  return {
    rows: typedRows,
    headers,
    summary
  };
}

export function getPreviewRows(rows: Record<string, unknown>[]): Record<string, unknown>[] {
  return rows.slice(0, MAX_ROWS_PREVIEW);
}

export function parseFile(file: File): Promise<ParsedData> {
  return new Promise((resolve, reject) => {
    const isCSV = file.name.toLowerCase().endsWith('.csv');
    const isJSON = file.name.toLowerCase().endsWith('.json');
    if (!isCSV && !isJSON) {
      reject(new Error('仅支持 CSV 或 JSON 格式的文件'));
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      reject(new Error('文件大小不能超过 5MB'));
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        if (isCSV) {
          resolve(parseCSV(content));
        } else {
          resolve(parseJSON(content));
        }
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('文件读取失败'));
    reader.readAsText(file, 'UTF-8');
  });
}
