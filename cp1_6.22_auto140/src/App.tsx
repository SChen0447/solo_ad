import React, { useState, useEffect, useCallback, useRef } from 'react';
import { DataRow, FieldMapping, FilterCondition, SortConfig, ChartType, Snapshot, AggregationType, FIELD_META } from './types';
import FieldPanel from './components/FieldPanel';
import PivotTable from './components/PivotTable';
import ChartPanel from './components/ChartPanel';
import SnapshotPanel from './components/SnapshotPanel';

const DEFAULT_FIELD_MAPPING: FieldMapping = {
  row: [],
  col: [],
  value: [],
};

const DEFAULT_SORT_CONFIG: SortConfig = {
  primary: null,
  secondary: null,
};

const App: React.FC = () => {
  const [data, setData] = useState<DataRow[]>([]);
  const [fieldMapping, setFieldMapping] = useState<FieldMapping>(DEFAULT_FIELD_MAPPING);
  const [filters, setFilters] = useState<FilterCondition[]>([]);
  const [sortConfig, setSortConfig] = useState<SortConfig>(DEFAULT_SORT_CONFIG);
  const [chartType, setChartType] = useState<ChartType>('bar');
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [darkMode, setDarkMode] = useState(false);
  const [highlightedRow, setHighlightedRow] = useState<string | null>(null);
  const [highlightedCol, setHighlightedCol] = useState<string | null>(null);
  const [splitRatio, setSplitRatio] = useState(60);
  const [showSnapshotPanel, setShowSnapshotPanel] = useState(false);
  const [loading, setLoading] = useState(true);

  const isDraggingSplit = useRef(false);
  const mainAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/data')
      .then((res) => res.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetch('/api/snapshots')
      .then((res) => res.json())
      .then((s) => setSnapshots(s))
      .catch(() => {});
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  const handleDrop = useCallback(
    (fieldKey: string, zone: 'row' | 'col' | 'value') => {
      setFieldMapping((prev) => {
        const next = { ...prev, row: [...prev.row], col: [...prev.col], value: [...prev.value] };

        next.row = next.row.filter((f) => f !== fieldKey);
        next.col = next.col.filter((f) => f !== fieldKey);
        next.value = next.value.filter((v) => v.field !== fieldKey);

        if (zone === 'row' && !next.row.includes(fieldKey)) {
          next.row.push(fieldKey);
        } else if (zone === 'col' && !next.col.includes(fieldKey)) {
          next.col.push(fieldKey);
        } else if (zone === 'value') {
          const meta = FIELD_META.find((f) => f.key === fieldKey);
          if (meta?.type === 'number') {
            next.value.push({ field: fieldKey, aggregation: 'sum' });
          }
        }
        return next;
      });
    },
    []
  );

  const handleRemoveField = useCallback(
    (fieldKey: string, zone: 'row' | 'col' | 'value') => {
      setFieldMapping((prev) => {
        const next = { ...prev };
        if (zone === 'row') {
          next.row = prev.row.filter((f) => f !== fieldKey);
        } else if (zone === 'col') {
          next.col = prev.col.filter((f) => f !== fieldKey);
        } else if (zone === 'value') {
          next.value = prev.value.filter((v) => v.field !== fieldKey);
        }
        return next;
      });
    },
    []
  );

  const handleAggregationChange = useCallback(
    (fieldKey: string, aggregation: AggregationType) => {
      setFieldMapping((prev) => ({
        ...prev,
        value: prev.value.map((v) =>
          v.field === fieldKey ? { ...v, aggregation } : v
        ),
      }));
    },
    []
  );

  const handleCellClick = useCallback((rowKey: string, colKey: string) => {
    setHighlightedRow(rowKey || null);
    setHighlightedCol(colKey || null);
    setTimeout(() => {
      setHighlightedRow(null);
      setHighlightedCol(null);
    }, 3000);
  }, []);

  const handleSaveSnapshot = useCallback(async () => {
    const name = `快照 ${snapshots.length + 1}`;
    const snapshotData = {
      name,
      fieldMapping,
      filters,
      sortConfig,
      chartType,
    };
    try {
      const res = await fetch('/api/snapshots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(snapshotData),
      });
      const saved = await res.json();
      setSnapshots((prev) => [...prev, saved]);
    } catch (e) {}
  }, [fieldMapping, filters, sortConfig, chartType, snapshots.length]);

  const handleRestoreSnapshot = useCallback(
    (snapshot: Snapshot) => {
      setFieldMapping(snapshot.fieldMapping);
      setFilters(snapshot.filters);
      setSortConfig(snapshot.sortConfig);
      setChartType(snapshot.chartType);
      setShowSnapshotPanel(false);
    },
    []
  );

  const handleDeleteSnapshot = useCallback(async (id: string) => {
    try {
      await fetch(`/api/snapshots/${id}`, { method: 'DELETE' });
      setSnapshots((prev) => prev.filter((s) => s.id !== id));
    } catch (e) {}
  }, []);

  const handleSplitMouseDown = useCallback(() => {
    isDraggingSplit.current = true;
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingSplit.current || !mainAreaRef.current) return;
      const rect = mainAreaRef.current.getBoundingClientRect();
      const ratio = ((e.clientY - rect.top) / rect.height) * 100;
      setSplitRatio(Math.min(80, Math.max(20, ratio)));
    };
    const handleMouseUp = () => {
      isDraggingSplit.current = false;
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, zone: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const target = e.currentTarget as HTMLElement;
    target.classList.add('drop-zone-active');
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    const target = e.currentTarget as HTMLElement;
    target.classList.remove('drop-zone-active');
  }, []);

  const handleDropZone = useCallback(
    (e: React.DragEvent, zone: 'row' | 'col' | 'value') => {
      e.preventDefault();
      const fieldKey = e.dataTransfer.getData('fieldKey');
      if (fieldKey) {
        handleDrop(fieldKey, zone);
      }
      const target = e.currentTarget as HTMLElement;
      target.classList.remove('drop-zone-active');
    },
    [handleDrop]
  );

  const toggleDarkMode = useCallback(() => {
    setDarkMode((prev) => !prev);
  }, []);

  if (loading) {
    return (
      <div className={`app-loading ${darkMode ? 'dark' : ''}`}>
        <div className="loading-spinner" />
        <div>加载中...</div>
      </div>
    );
  }

  return (
    <div className={`app ${darkMode ? 'dark' : ''}`}>
      <nav className={`top-nav ${darkMode ? 'dark' : ''}`}>
        <div className="nav-left">
          <h1 className="nav-title">📊 数据透视看板</h1>
          <button
            className={`nav-btn ${showSnapshotPanel ? 'active' : ''}`}
            onClick={() => setShowSnapshotPanel(!showSnapshotPanel)}
          >
            📸 快照
          </button>
        </div>
        <div className="nav-right">
          <button
            className="dark-mode-toggle"
            onClick={toggleDarkMode}
            title={darkMode ? '切换亮色模式' : '切换暗色模式'}
          >
            <span className={`toggle-icon ${darkMode ? 'sun' : 'moon'}`}>
              {darkMode ? '☀️' : '🌙'}
            </span>
          </button>
        </div>
      </nav>

      <div className="app-body">
        {showSnapshotPanel && (
          <SnapshotPanel
            snapshots={snapshots}
            onRestore={handleRestoreSnapshot}
            onDelete={handleDeleteSnapshot}
            onSave={handleSaveSnapshot}
            darkMode={darkMode}
          />
        )}

        <FieldPanel
          onDrop={handleDrop}
          onFilterChange={setFilters}
          onSortChange={setSortConfig}
          filters={filters}
          sortConfig={sortConfig}
          rowFields={fieldMapping.row}
          colFields={fieldMapping.col}
          valueFields={fieldMapping.value}
          onRemoveField={handleRemoveField}
          onAggregationChange={handleAggregationChange}
          darkMode={darkMode}
        />

        <div className="main-area" ref={mainAreaRef}>
          <div className="drop-zones">
            <div
              className="drop-zone row-zone"
              onDragOver={(e) => handleDragOver(e, 'row')}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDropZone(e, 'row')}
            >
              <span className="drop-zone-label">行区域</span>
              <div className="drop-zone-tags">
                {fieldMapping.row.map((f) => (
                  <span key={f} className="zone-tag row-tag">
                    {FIELD_META.find((m) => m.key === f)?.label || f}
                    <button className="zone-tag-remove" onClick={() => handleRemoveField(f, 'row')}>×</button>
                  </span>
                ))}
              </div>
            </div>
            <div
              className="drop-zone col-zone"
              onDragOver={(e) => handleDragOver(e, 'col')}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDropZone(e, 'col')}
            >
              <span className="drop-zone-label">列区域</span>
              <div className="drop-zone-tags">
                {fieldMapping.col.map((f) => (
                  <span key={f} className="zone-tag col-tag">
                    {FIELD_META.find((m) => m.key === f)?.label || f}
                    <button className="zone-tag-remove" onClick={() => handleRemoveField(f, 'col')}>×</button>
                  </span>
                ))}
              </div>
            </div>
            <div
              className="drop-zone value-zone"
              onDragOver={(e) => handleDragOver(e, 'value')}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDropZone(e, 'value')}
            >
              <span className="drop-zone-label">数值区域</span>
              <div className="drop-zone-tags">
                {fieldMapping.value.map((v) => (
                  <span key={v.field} className="zone-tag value-tag">
                    {FIELD_META.find((m) => m.key === v.field)?.label || v.field}
                    <select
                      className="agg-select"
                      value={v.aggregation}
                      onChange={(e) =>
                        handleAggregationChange(v.field, e.target.value as AggregationType)
                      }
                      onClick={(e) => e.stopPropagation()}
                    >
                      <option value="sum">求和</option>
                      <option value="avg">平均</option>
                      <option value="count">计数</option>
                      <option value="max">最大</option>
                      <option value="min">最小</option>
                    </select>
                    <button className="zone-tag-remove" onClick={() => handleRemoveField(v.field, 'value')}>×</button>
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="content-split" style={{ height: `${splitRatio}%` }}>
            <PivotTable
              data={data}
              fieldMapping={fieldMapping}
              filters={filters}
              sortConfig={sortConfig}
              onCellClick={handleCellClick}
              highlightedRow={highlightedRow}
              highlightedCol={highlightedCol}
              darkMode={darkMode}
            />
          </div>

          <div
            className="split-divider"
            onMouseDown={handleSplitMouseDown}
          />

          <div className="content-split chart-split" style={{ height: `${100 - splitRatio}%` }}>
            <ChartPanel
              data={data}
              fieldMapping={fieldMapping}
              filters={filters}
              sortConfig={sortConfig}
              chartType={chartType}
              onChartTypeChange={setChartType}
              highlightedRow={highlightedRow}
              highlightedCol={highlightedCol}
              darkMode={darkMode}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
