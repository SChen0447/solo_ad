import type { RawDataRow, PivotConfig, ActiveFilters, AggregatedResult, AggregatedCell } from '@/types';

const REGIONS = ['华东', '华南', '华北', '西南', '华中'];
const YEARS = ['2021', '2022', '2023', '2024'];
const CATEGORIES = ['电子产品', '服装', '食品', '家居', '运动'];

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

export function generateSampleData(): RawDataRow[] {
  const rng = seededRandom(42);
  const data: RawDataRow[] = [];
  for (const region of REGIONS) {
    for (const year of YEARS) {
      for (const category of CATEGORIES) {
        data.push({
          region,
          year,
          category,
          sales: Math.round(rng() * 9000 + 1000),
          profit: Math.round(rng() * 3000 + 200),
          quantity: Math.round(rng() * 500 + 50),
        });
      }
    }
  }
  return data;
}

function getFieldValue(row: RawDataRow, field: string): string {
  return String((row as Record<string, unknown>)[field] ?? '');
}

function getRowKey(row: RawDataRow, rowFields: string[]): string {
  return rowFields.map(f => getFieldValue(row, f)).join('|');
}

function getColKey(row: RawDataRow, colFields: string[]): string {
  return colFields.map(f => getFieldValue(row, f)).join('|');
}

export function filterData(data: RawDataRow[], filters: ActiveFilters): RawDataRow[] {
  let result = data;
  for (const [dimension, values] of Object.entries(filters)) {
    if (values.length > 0) {
      result = result.filter(row => values.includes(getFieldValue(row, dimension)));
    }
  }
  return result;
}

export function aggregateData(
  data: RawDataRow[],
  config: PivotConfig,
  filters: ActiveFilters
): AggregatedResult {
  const filtered = filterData(data, filters);

  if (config.rowFields.length === 0 && config.colFields.length === 0) {
    return { rowKeys: ['总计'], colKeys: config.valFields, rowLabels: ['总计'], colLabels: config.valFields, cells: [] };
  }

  const rowKeySet = new Map<string, string>();
  const colKeySet = new Map<string, string>();

  for (const row of filtered) {
    const rk = config.rowFields.length > 0 ? getRowKey(row, config.rowFields) : '总计';
    const ck = config.colFields.length > 0 ? getColKey(row, config.colFields) : '总计';
    if (!rowKeySet.has(rk)) rowKeySet.set(rk, rk.replace(/\|/g, ' / '));
    if (!colKeySet.has(ck)) colKeySet.set(ck, ck.replace(/\|/g, ' / '));
  }

  const rowKeys = Array.from(rowKeySet.keys());
  const rowLabels = Array.from(rowKeySet.values());
  const colKeys = Array.from(colKeySet.keys());
  const colLabels = Array.from(colKeySet.values());

  const cells: AggregatedCell[][] = [];

  for (let ri = 0; ri < rowKeys.length; ri++) {
    const rowCells: AggregatedCell[] = [];
    for (let ci = 0; ci < colKeys.length; ci++) {
      const matchedRows = filtered.filter(row => {
        const rk = config.rowFields.length > 0 ? getRowKey(row, config.rowFields) : '总计';
        const ck = config.colFields.length > 0 ? getColKey(row, config.colFields) : '总计';
        return rk === rowKeys[ri] && ck === colKeys[ci];
      });

      let value = 0;
      if (config.valFields.length > 0) {
        for (const vf of config.valFields) {
          for (const mr of matchedRows) {
            value += Number((mr as Record<string, unknown>)[vf]) || 0;
          }
        }
      }

      rowCells.push({
        rowKey: rowKeys[ri],
        colKey: colKeys[ci],
        value,
        rowLabel: rowLabels[ri],
        colLabel: colLabels[ci],
      });
    }
    cells.push(rowCells);
  }

  return { rowKeys, colKeys, rowLabels, colLabels, cells };
}

export function extractChartData(
  result: AggregatedResult,
  chartType: string,
  highlightedKeys: string[]
): { key: string; label: string; value: number; highlighted: boolean }[] {
  const points: { key: string; label: string; value: number; highlighted: boolean }[] = [];

  for (let ri = 0; ri < result.cells.length; ri++) {
    for (let ci = 0; ci < result.cells[ri].length; ci++) {
      const cell = result.cells[ri][ci];
      const key = `${cell.rowKey}::${cell.colKey}`;
      const label = result.colKeys.length > 1
        ? `${cell.rowLabel} - ${cell.colLabel}`
        : cell.rowLabel;
      points.push({
        key,
        label,
        value: cell.value,
        highlighted: highlightedKeys.length === 0 || highlightedKeys.includes(key),
      });
    }
  }

  return points;
}
