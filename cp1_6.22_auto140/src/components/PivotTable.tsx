import React, { useMemo } from 'react';
import { DataRow, FieldMapping, FilterCondition, SortConfig, AggregationType, FIELD_META } from '../types';

interface PivotTableProps {
  data: DataRow[];
  fieldMapping: FieldMapping;
  filters: FilterCondition[];
  sortConfig: SortConfig;
  onCellClick: (rowKey: string, colKey: string) => void;
  highlightedRow: string | null;
  highlightedCol: string | null;
  darkMode: boolean;
}

function applyFilters(data: DataRow[], filters: FilterCondition[]): DataRow[] {
  return data.filter((row) => {
    return filters.every((filter) => {
      const val = row[filter.field as keyof DataRow];
      if (filter.type === 'range' && filter.valueRange) {
        const num = Number(val);
        return num >= filter.valueRange[0] && num <= filter.valueRange[1];
      }
      if (filter.type === 'text' && filter.textContains !== undefined) {
        return String(val).includes(filter.textContains);
      }
      if (filter.type === 'dateRange' && filter.dateRange) {
        const d = String(val);
        return d >= filter.dateRange[0] && d <= filter.dateRange[1];
      }
      return true;
    });
  });
}

function applySorting(data: DataRow[], sortConfig: SortConfig): DataRow[] {
  const sorted = [...data];
  sorted.sort((a, b) => {
    if (sortConfig.primary) {
      const { field, direction } = sortConfig.primary;
      const va = a[field as keyof DataRow];
      const vb = b[field as keyof DataRow];
      const cmp = va < vb ? -1 : va > vb ? 1 : 0;
      if (cmp !== 0) return direction === 'asc' ? cmp : -cmp;
    }
    if (sortConfig.secondary) {
      const { field, direction } = sortConfig.secondary;
      const va = a[field as keyof DataRow];
      const vb = b[field as keyof DataRow];
      const cmp = va < vb ? -1 : va > vb ? 1 : 0;
      if (cmp !== 0) return direction === 'asc' ? cmp : -cmp;
    }
    return 0;
  });
  return sorted;
}

function aggregate(values: number[], type: AggregationType): number {
  if (values.length === 0) return 0;
  switch (type) {
    case 'sum':
      return values.reduce((a, b) => a + b, 0);
    case 'avg':
      return values.reduce((a, b) => a + b, 0) / values.length;
    case 'count':
      return values.length;
    case 'max':
      return Math.max(...values);
    case 'min':
      return Math.min(...values);
    default:
      return values.reduce((a, b) => a + b, 0);
  }
}

function getRowKey(row: DataRow, rowFields: string[]): string {
  return rowFields.map((f) => String(row[f as keyof DataRow])).join(' | ');
}

function getColKey(row: DataRow, colFields: string[]): string {
  return colFields.map((f) => String(row[f as keyof DataRow])).join(' | ');
}

const PivotTable: React.FC<PivotTableProps> = ({
  data,
  fieldMapping,
  filters,
  sortConfig,
  onCellClick,
  highlightedRow,
  highlightedCol,
  darkMode,
}) => {
  const pivotData = useMemo(() => {
    const filtered = applyFilters(data, filters);
    const sorted = applySorting(filtered, sortConfig);

    const { row, col, value } = fieldMapping;

    if (row.length === 0 && col.length === 0 && value.length === 0) {
      return { rowHeaders: [], colHeaders: [], matrix: {}, rowKeys: [], colKeys: [] };
    }

    const rowKeysSet = new Set<string>();
    const colKeysSet = new Set<string>();
    const matrix: Record<string, Record<string, Record<string, number[]>>> = {};

    for (const item of sorted) {
      const rk = row.length > 0 ? getRowKey(item, row) : '(总计)';
      const ck = col.length > 0 ? getColKey(item, col) : '(总计)';
      rowKeysSet.add(rk);
      colKeysSet.add(ck);

      if (!matrix[rk]) matrix[rk] = {};
      if (!matrix[rk][ck]) matrix[rk][ck] = {};

      for (const v of value) {
        if (!matrix[rk][ck][v.field]) matrix[rk][ck][v.field] = [];
        const numVal = Number(item[v.field as keyof DataRow]);
        if (!isNaN(numVal)) {
          matrix[rk][ck][v.field].push(numVal);
        }
      }
    }

    const rowKeys = Array.from(rowKeysSet);
    const colKeys = Array.from(colKeysSet);

    return { rowKeys, colKeys, matrix, rowHeaders: row, colHeaders: col };
  }, [data, fieldMapping, filters, sortConfig]);

  const { rowKeys, colKeys, matrix, rowHeaders, colHeaders } = pivotData;

  const hasData = rowKeys.length > 0 || colKeys.length > 0;

  const getCellValue = (rk: string, ck: string, vIdx: number): string => {
    const v = fieldMapping.value[vIdx];
    if (!v) return '-';
    const vals = matrix[rk]?.[ck]?.[v.field];
    if (!vals || vals.length === 0) return '-';
    const result = aggregate(vals, v.aggregation);
    return result >= 1000 ? result.toLocaleString('zh-CN', { maximumFractionDigits: 2 }) : result.toFixed(2);
  };

  const isRowHighlighted = (rk: string) => highlightedRow === rk;
  const isColHighlighted = (ck: string) => highlightedCol === ck;

  return (
    <div className={`pivot-table-container ${darkMode ? 'dark' : ''}`}>
      {!hasData ? (
        <div className="pivot-table-empty">
          将字段拖拽到行、列或数值区域以生成透视表
        </div>
      ) : (
        <div className="pivot-table-scroll">
          <table className="pivot-table">
            <thead>
              {colHeaders.length > 0 && (
                <tr>
                  {rowHeaders.map((h) => (
                    <th key={h} className="pivot-header-row">
                      {FIELD_META.find((f) => f.key === h)?.label || h}
                    </th>
                  ))}
                  {colKeys.map((ck) => (
                    <th
                      key={ck}
                      className={`pivot-header-col ${isColHighlighted(ck) ? 'highlighted' : ''}`}
                      onClick={() => onCellClick('', ck)}
                    >
                      {ck}
                    </th>
                  ))}
                </tr>
              )}
              {colHeaders.length === 0 && (
                <tr>
                  {rowHeaders.map((h) => (
                    <th key={h} className="pivot-header-row">
                      {FIELD_META.find((f) => f.key === h)?.label || h}
                    </th>
                  ))}
                  {fieldMapping.value.map((v, i) => (
                    <th key={i} className="pivot-header-val">
                      {FIELD_META.find((f) => f.key === v.field)?.label || v.field} ({v.aggregation})
                    </th>
                  ))}
                </tr>
              )}
            </thead>
            <tbody>
              {rowKeys.map((rk, rIdx) => (
                <tr
                  key={rk}
                  className={`pivot-row ${rIdx % 2 === 0 ? 'even' : 'odd'} ${isRowHighlighted(rk) ? 'highlighted' : ''}`}
                  onClick={() => onCellClick(rk, '')}
                >
                  {rowHeaders.map((h) => {
                    const parts = rk.split(' | ');
                    const idx = rowHeaders.indexOf(h);
                    return <td key={h} className="pivot-cell-row">{parts[idx] || rk}</td>;
                  })}
                  {colHeaders.length > 0 ? (
                    colKeys.map((ck) => (
                      <td
                        key={ck}
                        className={`pivot-cell-val ${isColHighlighted(ck) ? 'highlighted' : ''}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          onCellClick(rk, ck);
                        }}
                      >
                        {fieldMapping.value.map((v, vi) => (
                          <div key={vi} className="pivot-cell-multi">
                            {getCellValue(rk, ck, vi)}
                          </div>
                        ))}
                      </td>
                    ))
                  ) : (
                    fieldMapping.value.map((v, vi) => (
                      <td key={vi} className="pivot-cell-val">
                        {getCellValue(rk, '(总计)', vi)}
                      </td>
                    ))
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default PivotTable;
