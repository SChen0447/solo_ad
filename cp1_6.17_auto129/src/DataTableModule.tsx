import React, { useState, useCallback, useRef } from 'react';
import type { DataRow, PivotConfig, PivotResult, AggMethod } from './types';
import { AGG_LABELS } from './types';

interface Props {
  data: DataRow[];
  columns: string[];
  pivotConfig: PivotConfig;
  pivotResult: PivotResult;
  highlightedRows: Set<number>;
  onDataChange: (data: DataRow[]) => void;
  onPivotConfigChange: (config: PivotConfig) => void;
}

const PAGE_SIZE = 20;

export default function DataTableModule({
  data,
  columns,
  pivotConfig,
  pivotResult,
  highlightedRows,
  onDataChange,
  onPivotConfigChange,
}: Props) {
  const [page, setPage] = useState(0);
  const [editingCell, setEditingCell] = useState<{ row: number; col: string } | null>(null);
  const [editValue, setEditValue] = useState('');
  const [dragOverZone, setDragOverZone] = useState<string | null>(null);
  const [draggedField, setDraggedField] = useState<string | null>(null);

  const totalPages = Math.max(1, Math.ceil(data.length / PAGE_SIZE));
  const pageData = data.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const startEdit = useCallback((rowIdx: number, col: string) => {
    setEditingCell({ row: rowIdx, col });
    setEditValue(String(data[rowIdx][col] ?? ''));
  }, [data]);

  const saveEdit = useCallback(() => {
    if (!editingCell) return;
    const newData = [...data];
    newData[editingCell.row] = { ...newData[editingCell.row], [editingCell.col]: editValue };
    onDataChange(newData);
    setEditingCell(null);
  }, [editingCell, editValue, data, onDataChange]);

  const cancelEdit = useCallback(() => {
    setEditingCell(null);
  }, []);

  const onKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') saveEdit();
    if (e.key === 'Escape') cancelEdit();
  }, [saveEdit, cancelEdit]);

  const onDragStart = useCallback((field: string) => {
    setDraggedField(field);
  }, []);

  const onDragEnd = useCallback(() => {
    setDraggedField(null);
    setDragOverZone(null);
  }, []);

  const addFieldToZone = useCallback((zone: 'rowFields' | 'colFields' | 'valueFields', field: string) => {
    const newConfig: PivotConfig = {
      rowFields: [...pivotConfig.rowFields],
      colFields: [...pivotConfig.colFields],
      valueFields: [...pivotConfig.valueFields],
    };
    if (zone === 'rowFields') {
      if (newConfig.rowFields.includes(field)) return;
      newConfig.rowFields.push(field);
    } else if (zone === 'colFields') {
      if (newConfig.colFields.includes(field)) return;
      newConfig.colFields.push(field);
    } else {
      if (newConfig.valueFields.find((v) => v.field === field)) return;
      newConfig.valueFields = [{ field, agg: 'sum' as AggMethod }];
    }
    onPivotConfigChange(newConfig);
  }, [pivotConfig, onPivotConfigChange]);

  const onZoneDrop = useCallback((zone: 'rowFields' | 'colFields' | 'valueFields') => {
    if (!draggedField) return;
    addFieldToZone(zone, draggedField);
    setDragOverZone(null);
  }, [draggedField, addFieldToZone]);

  const removeFieldFromZone = useCallback((zone: 'rowFields' | 'colFields' | 'valueFields', field: string) => {
    const newConfig: PivotConfig = {
      rowFields: [...pivotConfig.rowFields],
      colFields: [...pivotConfig.colFields],
      valueFields: [...pivotConfig.valueFields],
    };
    if (zone === 'valueFields') {
      newConfig.valueFields = newConfig.valueFields.filter((v) => v.field !== field);
    } else if (zone === 'rowFields') {
      newConfig.rowFields = newConfig.rowFields.filter((f) => f !== field);
    } else {
      newConfig.colFields = newConfig.colFields.filter((f) => f !== field);
    }
    onPivotConfigChange(newConfig);
  }, [pivotConfig, onPivotConfigChange]);

  const updateAggMethod = useCallback((field: string, agg: AggMethod) => {
    const newConfig: PivotConfig = {
      rowFields: [...pivotConfig.rowFields],
      colFields: [...pivotConfig.colFields],
      valueFields: pivotConfig.valueFields.map((v) =>
        v.field === field ? { ...v, agg } : v
      ),
    };
    onPivotConfigChange(newConfig);
  }, [pivotConfig, onPivotConfigChange]);

  const allUsedFields = new Set([
    ...pivotConfig.rowFields,
    ...pivotConfig.colFields,
    ...pivotConfig.valueFields.map((v) => v.field),
  ]);

  const availableColumns = columns.filter((c) => !allUsedFields.has(c));

  return (
    <div className="space-y-4">
      <div className="bg-white/70 backdrop-blur-glass rounded-xl p-4 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1),0_0_0_1px_rgba(255,255,255,0.3)]">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">透视配置</h3>
        <div className="flex flex-wrap gap-2 mb-3">
          {availableColumns.map((col) => (
            <div
              key={col}
              draggable
              onDragStart={() => onDragStart(col)}
              onDragEnd={onDragEnd}
              className="px-3 py-1 rounded-lg bg-primary-50 text-primary-600 text-xs font-medium cursor-grab hover:bg-primary-100 transition-all duration-200 active:cursor-grabbing select-none"
            >
              {col}
            </div>
          ))}
          {availableColumns.length === 0 && (
            <span className="text-xs text-gray-400">所有列已分配到区域</span>
          )}
        </div>
        <div className="grid grid-cols-3 gap-3">
          <DropZone
            label="行标签"
            items={pivotConfig.rowFields}
            dragOver={dragOverZone === 'rowFields'}
            onDragOver={() => setDragOverZone('rowFields')}
            onDragLeave={() => setDragOverZone(null)}
            onDrop={() => onZoneDrop('rowFields')}
            onRemove={(f) => removeFieldFromZone('rowFields', f)}
          />
          <DropZone
            label="列标签"
            items={pivotConfig.colFields}
            dragOver={dragOverZone === 'colFields'}
            onDragOver={() => setDragOverZone('colFields')}
            onDragLeave={() => setDragOverZone(null)}
            onDrop={() => onZoneDrop('colFields')}
            onRemove={(f) => removeFieldFromZone('colFields', f)}
          />
          <ValueDropZone
            items={pivotConfig.valueFields}
            dragOver={dragOverZone === 'valueFields'}
            onDragOver={() => setDragOverZone('valueFields')}
            onDragLeave={() => setDragOverZone(null)}
            onDrop={() => onZoneDrop('valueFields')}
            onRemove={(f) => removeFieldFromZone('valueFields', f)}
            onAggChange={updateAggMethod}
          />
        </div>
      </div>

      <div className="bg-white/70 backdrop-blur-glass rounded-xl shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1),0_0_0_1px_rgba(255,255,255,0.3)] overflow-hidden">
        <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
          <table className="w-full text-sm border-collapse">
            <thead className="sticky top-0 z-10">
              <tr className="bg-gray-50">
                <th className="w-10 px-2 py-2 text-left text-xs font-semibold text-gray-500 border-b border-r">#</th>
                {columns.map((col) => (
                  <th
                    key={col}
                    className="px-3 py-2 text-left text-xs font-semibold text-gray-500 border-b whitespace-nowrap min-w-[100px]"
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pageData.map((row, i) => {
                const globalIdx = page * PAGE_SIZE + i;
                const isHighlighted = highlightedRows.has(globalIdx);
                return (
                  <tr
                    key={globalIdx}
                    className={`border-b transition-all duration-200 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'} ${
                      isHighlighted ? 'bg-yellow-50 !bg-[#FEF3C7]' : ''
                    } ${highlightedRows.size > 0 && !isHighlighted ? 'opacity-30' : ''}`}
                    style={{ height: 40 }}
                  >
                    <td className="px-2 py-1 text-xs text-gray-400 border-r text-center">{globalIdx + 1}</td>
                    {columns.map((col) => {
                      const isEditing = editingCell?.row === globalIdx && editingCell?.col === col;
                      return (
                        <td
                          key={col}
                          className={`px-3 py-1 text-xs text-gray-700 whitespace-nowrap ${isEditing ? 'bg-primary-50 ring-2 ring-primary-300' : 'hover:bg-gray-50 cursor-pointer'}`}
                          onDoubleClick={() => startEdit(globalIdx, col)}
                        >
                          {isEditing ? (
                            <input
                              autoFocus
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onKeyDown={onKeyDown}
                              onBlur={saveEdit}
                              className="w-full bg-transparent outline-none text-xs"
                            />
                          ) : (
                            String(row[col] ?? '')
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between px-4 py-2 border-t bg-gray-50/50">
          <span className="text-xs text-gray-500">
            共 {data.length} 行，第 {page + 1}/{totalPages} 页
          </span>
          <div className="flex gap-1">
            <button
              onClick={() => setPage(0)}
              disabled={page === 0}
              className="px-2 py-1 text-xs rounded hover:bg-gray-200 disabled:opacity-30 transition-all duration-200"
            >
              首页
            </button>
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="px-2 py-1 text-xs rounded hover:bg-gray-200 disabled:opacity-30 transition-all duration-200"
            >
              上一页
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="px-2 py-1 text-xs rounded hover:bg-gray-200 disabled:opacity-30 transition-all duration-200"
            >
              下一页
            </button>
            <button
              onClick={() => setPage(totalPages - 1)}
              disabled={page >= totalPages - 1}
              className="px-2 py-1 text-xs rounded hover:bg-gray-200 disabled:opacity-30 transition-all duration-200"
            >
              末页
            </button>
          </div>
        </div>
      </div>

      {pivotResult.rows.length > 0 && (
        <div className="bg-white/70 backdrop-blur-glass rounded-xl shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1),0_0_0_1px_rgba(255,255,255,0.3)] overflow-hidden">
          <h3 className="text-sm font-semibold text-gray-700 px-4 pt-3 pb-2">透视结果</h3>
          <div className="overflow-x-auto max-h-[300px] overflow-y-auto">
            <table className="w-full text-sm border-collapse">
              <thead className="sticky top-0 z-10">
                <tr className="bg-primary-50">
                  {pivotResult.headers.map((h) => (
                    <th key={h} className="px-3 py-2 text-left text-xs font-semibold text-primary-700 border-b whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pivotResult.rows.map((row, i) => (
                  <tr key={i} className={`border-b ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                    {pivotResult.headers.map((h) => (
                      <td key={h} className="px-3 py-1.5 text-xs text-gray-700 whitespace-nowrap">
                        {row[h] ?? ''}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function DropZone({
  label,
  items,
  dragOver,
  onDragOver,
  onDragLeave,
  onDrop,
  onRemove,
}: {
  label: string;
  items: string[];
  dragOver: boolean;
  onDragOver: () => void;
  onDragLeave: () => void;
  onDrop: () => void;
  onRemove: (field: string) => void;
}) {
  return (
    <div
      onDragOver={(e) => { e.preventDefault(); onDragOver(); }}
      onDragLeave={onDragLeave}
      onDrop={(e) => { e.preventDefault(); onDrop(); }}
      className={`min-h-[60px] p-2 rounded-lg border-2 border-dashed transition-all duration-200 ${
        dragOver ? 'border-primary-400 bg-primary-50/50' : 'border-gray-200 bg-gray-50/30'
      }`}
    >
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      <div className="flex flex-wrap gap-1">
        {items.map((f) => (
          <span key={f} className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-primary-100 text-primary-700 text-xs">
            {f}
            <button onClick={() => onRemove(f)} className="hover:text-red-500">✕</button>
          </span>
        ))}
        {items.length === 0 && <span className="text-xs text-gray-300 italic">拖拽至此</span>}
      </div>
    </div>
  );
}

function ValueDropZone({
  items,
  dragOver,
  onDragOver,
  onDragLeave,
  onDrop,
  onRemove,
  onAggChange,
}: {
  items: { field: string; agg: AggMethod }[];
  dragOver: boolean;
  onDragOver: () => void;
  onDragLeave: () => void;
  onDrop: () => void;
  onRemove: (field: string) => void;
  onAggChange: (field: string, agg: AggMethod) => void;
}) {
  return (
    <div
      onDragOver={(e) => { e.preventDefault(); onDragOver(); }}
      onDragLeave={onDragLeave}
      onDrop={(e) => { e.preventDefault(); onDrop(); }}
      className={`min-h-[60px] p-2 rounded-lg border-2 border-dashed transition-all duration-200 ${
        dragOver ? 'border-primary-400 bg-primary-50/50' : 'border-gray-200 bg-gray-50/30'
      }`}
    >
      <p className="text-xs text-gray-400 mb-1">值（聚合）</p>
      <div className="flex flex-wrap gap-1">
        {items.map((v) => (
          <span key={v.field} className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-accent-orange/20 text-amber-700 text-xs">
            {v.field}
            <select
              value={v.agg}
              onChange={(e) => onAggChange(v.field, e.target.value as AggMethod)}
              className="text-xs bg-transparent border-none outline-none cursor-pointer"
            >
              {Object.entries(AGG_LABELS).map(([k, label]) => (
                <option key={k} value={k}>{label}</option>
              ))}
            </select>
            <button onClick={() => onRemove(v.field)} className="hover:text-red-500">✕</button>
          </span>
        ))}
        {items.length === 0 && <span className="text-xs text-gray-300 italic">拖拽至此</span>}
      </div>
    </div>
  );
}
