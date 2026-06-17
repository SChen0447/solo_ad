import React, { useState, useCallback, useRef, useEffect } from 'react';
import type { DataRow, PivotConfig, FilterState, PivotResult } from './types';
import { uploadCsv, computePivot } from './api';
import DataTableModule from './DataTableModule';
import ChartModule from './ChartModule';

const EMPTY_PIVOT: PivotResult = { headers: [], rows: [] };

const DEFAULT_PIVOT_CONFIG: PivotConfig = {
  rowFields: [],
  colFields: [],
  valueFields: [],
};

export default function App() {
  const [data, setData] = useState<DataRow[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [pivotConfig, setPivotConfig] = useState<PivotConfig>(DEFAULT_PIVOT_CONFIG);
  const [pivotResult, setPivotResult] = useState<PivotResult>(EMPTY_PIVOT);
  const [filterState, setFilterState] = useState<FilterState>({
    rangeFilters: [],
    categoryFilters: [],
  });
  const [highlightedRows, setHighlightedRows] = useState<Set<number>>(new Set());
  const [filterPanelOpen, setFilterPanelOpen] = useState(true);
  const [globalFilterOpen, setGlobalFilterOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (file: File) => {
    if (!file.name.endsWith('.csv')) return;
    setLoading(true);
    try {
      const result = await uploadCsv(file);
      setColumns(result.columns);
      setData(result.rows);
      setPivotConfig(DEFAULT_PIVOT_CONFIG);
      setPivotResult(EMPTY_PIVOT);
      setHighlightedRows(new Set());
      setFilterState({ rangeFilters: [], categoryFilters: [] });
    } catch (err) {
      console.error('Upload failed:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const onFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
  }, [handleFile]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }, [handleFile]);

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const onDataChange = useCallback((newData: DataRow[]) => {
    setData(newData);
  }, []);

  const onPivotConfigChange = useCallback(async (config: PivotConfig) => {
    setPivotConfig(config);
    if (config.valueFields.length > 0 && data.length > 0) {
      setLoading(true);
      try {
        const result = await computePivot({ data, config });
        setPivotResult(result);
      } catch (err) {
        console.error('Pivot failed:', err);
      } finally {
        setLoading(false);
      }
    } else {
      setPivotResult(EMPTY_PIVOT);
    }
  }, [data]);

  const onHighlightChange = useCallback((indices: Set<number>) => {
    setHighlightedRows(indices);
  }, []);

  const filteredData = React.useMemo(() => {
    let result = data;
    for (const rf of filterState.rangeFilters) {
      result = result.filter((row) => {
        const v = Number(row[rf.field]);
        return !isNaN(v) && v >= rf.min && v <= rf.max;
      });
    }
    for (const cf of filterState.categoryFilters) {
      if (cf.values.length > 0) {
        result = result.filter((row) => cf.values.includes(String(row[cf.field])));
      }
    }
    return result;
  }, [data, filterState]);

  const addRangeFilter = useCallback(() => {
    if (columns.length === 0) return;
    setFilterState((prev) => ({
      ...prev,
      rangeFilters: [...prev.rangeFilters, { field: columns[0], min: 0, max: 100 }],
    }));
  }, [columns]);

  const addCategoryFilter = useCallback(() => {
    if (columns.length === 0) return;
    setFilterState((prev) => ({
      ...prev,
      categoryFilters: [...prev.categoryFilters, { field: columns[0], values: [] }],
    }));
  }, [columns]);

  const updateRangeFilter = useCallback((idx: number, update: Partial<FilterState['rangeFilters'][0]>) => {
    setFilterState((prev) => {
      const next = { ...prev, rangeFilters: [...prev.rangeFilters] };
      next.rangeFilters[idx] = { ...next.rangeFilters[idx], ...update };
      return next;
    });
  }, []);

  const updateCategoryFilter = useCallback((idx: number, update: Partial<FilterState['categoryFilters'][0]>) => {
    setFilterState((prev) => {
      const next = { ...prev, categoryFilters: [...prev.categoryFilters] };
      next.categoryFilters[idx] = { ...next.categoryFilters[idx], ...update };
      return next;
    });
  }, []);

  const removeRangeFilter = useCallback((idx: number) => {
    setFilterState((prev) => ({
      ...prev,
      rangeFilters: prev.rangeFilters.filter((_, i) => i !== idx),
    }));
  }, []);

  const removeCategoryFilter = useCallback((idx: number) => {
    setFilterState((prev) => ({
      ...prev,
      categoryFilters: prev.categoryFilters.filter((_, i) => i !== idx),
    }));
  }, []);

  const getUniqueValues = useCallback((field: string) => {
    const set = new Set<string>();
    data.forEach((row) => set.add(String(row[field])));
    return Array.from(set);
  }, [data]);

  const exportPng = useCallback(() => {
    const el = document.getElementById('chart-area');
    if (!el) return;
    const canvas = document.createElement('canvas');
    const rect = el.getBoundingClientRect();
    canvas.width = rect.width * 2;
    canvas.height = rect.height * 2;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(2, 2);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, rect.width, rect.height);
    try {
      const svgs = el.querySelectorAll('.recharts-surface');
      const svgArr = Array.from(svgs);
      if (svgArr.length > 0) {
        const a = document.createElement('a');
        const svgEl = svgArr[0] as SVGSVGElement;
        const svgData = new XMLSerializer().serializeToString(svgEl);
        const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
        a.href = URL.createObjectURL(svgBlob);
        a.download = 'pivot-charts.svg';
        a.click();
      }
    } catch {
      alert('导出图片失败，请使用浏览器截图功能');
    }
  }, []);

  const exportCsv = useCallback(() => {
    if (pivotResult.rows.length === 0) return;
    const header = pivotResult.headers.join(',');
    const rows = pivotResult.rows.map((r) => pivotResult.headers.map((h) => JSON.stringify(r[h] ?? '')).join(','));
    const csv = [header, ...rows].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'pivot-table.csv';
    a.click();
  }, [pivotResult]);

  useEffect(() => {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) {
      overlay.classList.toggle('hidden', !loading);
    }
  }, [loading]);

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <nav className="h-14 flex items-center px-4 gap-4 bg-white/70 backdrop-blur-glass shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1),0_0_0_1px_rgba(255,255,255,0.3)] z-30 shrink-0">
        <span className="text-xl font-semibold text-gray-800 select-none" style={{ fontFamily: 'Inter, sans-serif', fontWeight: 600 }}>
          数据透视台
        </span>
        <div className="flex-1" />
        <label
          className="px-4 py-2 rounded-lg text-white text-sm font-medium cursor-pointer transition-all duration-200 hover:brightness-110"
          style={{ background: 'linear-gradient(135deg, #3B82F6, #2563EB)' }}
        >
          上传CSV
          <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={onFileChange} />
        </label>
        <button
          onClick={() => setGlobalFilterOpen(!globalFilterOpen)}
          className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-all duration-200"
          title="全局筛选器"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
          </svg>
        </button>
        <button
          onClick={exportPng}
          className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 transition-all duration-200"
          disabled={pivotResult.rows.length === 0}
        >
          导出PNG
        </button>
        <button
          onClick={exportCsv}
          className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 transition-all duration-200"
          disabled={pivotResult.rows.length === 0}
        >
          导出CSV
        </button>
      </nav>

      <div className="flex flex-1 overflow-hidden">
        <aside
          className="shrink-0 transition-all duration-300 overflow-y-auto bg-white/70 backdrop-blur-glass shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1),0_0_0_1px_rgba(255,255,255,0.3)] z-20"
          style={{ width: filterPanelOpen ? 280 : 0, opacity: filterPanelOpen ? 1 : 0 }}
        >
          <div className="p-4" style={{ width: 280 }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-700">筛选器</h3>
            </div>
            <div className="flex gap-2 mb-4">
              <button
                onClick={addRangeFilter}
                className="flex-1 text-xs px-2 py-1.5 rounded-md bg-primary-50 text-primary-600 hover:bg-primary-100 transition-all duration-200"
              >
                + 数值范围
              </button>
              <button
                onClick={addCategoryFilter}
                className="flex-1 text-xs px-2 py-1.5 rounded-md bg-primary-50 text-primary-600 hover:bg-primary-100 transition-all duration-200"
              >
                + 分类选择
              </button>
            </div>
            {filterState.rangeFilters.map((rf, idx) => (
              <div key={`r-${idx}`} className="mb-3 p-3 rounded-lg bg-gray-50 border border-gray-100">
                <div className="flex items-center justify-between mb-2">
                  <select
                    value={rf.field}
                    onChange={(e) => updateRangeFilter(idx, { field: e.target.value })}
                    className="text-xs border rounded px-1 py-0.5 bg-white"
                  >
                    {columns.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                  <button onClick={() => removeRangeFilter(idx)} className="text-gray-400 hover:text-red-400 text-xs">✕</button>
                </div>
                <div className="flex gap-2 items-center">
                  <input
                    type="number"
                    value={rf.min}
                    onChange={(e) => updateRangeFilter(idx, { min: Number(e.target.value) })}
                    className="w-20 text-xs border rounded px-1 py-0.5"
                    placeholder="最小"
                  />
                  <span className="text-gray-400 text-xs">~</span>
                  <input
                    type="number"
                    value={rf.max}
                    onChange={(e) => updateRangeFilter(idx, { max: Number(e.target.value) })}
                    className="w-20 text-xs border rounded px-1 py-0.5"
                    placeholder="最大"
                  />
                </div>
              </div>
            ))}
            {filterState.categoryFilters.map((cf, idx) => (
              <div key={`c-${idx}`} className="mb-3 p-3 rounded-lg bg-gray-50 border border-gray-100">
                <div className="flex items-center justify-between mb-2">
                  <select
                    value={cf.field}
                    onChange={(e) => updateCategoryFilter(idx, { field: e.target.value, values: [] })}
                    className="text-xs border rounded px-1 py-0.5 bg-white"
                  >
                    {columns.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                  <button onClick={() => removeCategoryFilter(idx)} className="text-gray-400 hover:text-red-400 text-xs">✕</button>
                </div>
                <CategorySelect
                  values={getUniqueValues(cf.field)}
                  selected={cf.values}
                  onChange={(vals) => updateCategoryFilter(idx, { values: vals })}
                />
              </div>
            ))}
          </div>
        </aside>

        <button
          onClick={() => setFilterPanelOpen(!filterPanelOpen)}
          className="shrink-0 w-6 flex items-center justify-center bg-white/50 backdrop-blur-glass hover:bg-white/80 transition-all duration-200 text-gray-400 text-sm z-10"
          style={{ writingMode: 'vertical-lr' }}
        >
          {filterPanelOpen ? '❮' : '❯'}
        </button>

        <main className="flex-1 overflow-y-auto p-4">
          {data.length === 0 ? (
            <div
              className="flex flex-col items-center justify-center h-full border-2 border-dashed border-gray-300 rounded-2xl bg-white/50 backdrop-blur-glass transition-all duration-200 hover:border-primary-400 hover:bg-primary-50/30"
              onDrop={onDrop}
              onDragOver={onDragOver}
            >
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              <p className="mt-4 text-gray-500 text-sm">拖拽CSV文件到此处，或点击上方"上传CSV"按钮</p>
              <p className="mt-1 text-gray-400 text-xs">支持 UTF-8 和 GBK 编码</p>
            </div>
          ) : (
            <>
              <DataTableModule
                data={filteredData}
                columns={columns}
                pivotConfig={pivotConfig}
                pivotResult={pivotResult}
                highlightedRows={highlightedRows}
                onDataChange={onDataChange}
                onPivotConfigChange={onPivotConfigChange}
              />
              {pivotResult.rows.length > 0 && (
                <ChartModule
                  pivotResult={pivotResult}
                  pivotConfig={pivotConfig}
                  originalData={filteredData}
                  highlightedRows={highlightedRows}
                  onHighlightChange={onHighlightChange}
                />
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}

function CategorySelect({ values, selected, onChange }: { values: string[]; selected: string[]; onChange: (v: string[]) => void }) {
  const [search, setSearch] = useState('');
  const filtered = values.filter((v) => v.toLowerCase().includes(search.toLowerCase()));
  const toggle = (v: string) => {
    onChange(selected.includes(v) ? selected.filter((s) => s !== v) : [...selected, v]);
  };
  return (
    <div className="max-h-40 overflow-y-auto">
      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full text-xs border rounded px-2 py-1 mb-1"
        placeholder="搜索..."
      />
      {filtered.slice(0, 50).map((v) => (
        <label key={v} className="flex items-center gap-1 text-xs py-0.5 cursor-pointer hover:bg-gray-100 rounded px-1">
          <input type="checkbox" checked={selected.includes(v)} onChange={() => toggle(v)} className="accent-primary-500" />
          <span className="truncate">{v}</span>
        </label>
      ))}
      {filtered.length > 50 && <p className="text-xs text-gray-400 mt-1">...还有 {filtered.length - 50} 项</p>}
    </div>
  );
}
