import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  FIELD_META,
  FilterCondition,
  SortConfig,
  AggregationType,
} from '../types';

interface FieldPanelProps {
  onDrop: (fieldKey: string, zone: 'row' | 'col' | 'value') => void;
  onFilterChange: (filters: FilterCondition[]) => void;
  onSortChange: (sortConfig: SortConfig) => void;
  filters: FilterCondition[];
  sortConfig: SortConfig;
  rowFields: string[];
  colFields: string[];
  valueFields: { field: string; aggregation: AggregationType }[];
  onRemoveField: (fieldKey: string, zone: 'row' | 'col' | 'value') => void;
  onAggregationChange: (fieldKey: string, aggregation: AggregationType) => void;
  darkMode: boolean;
}

const FieldPanel: React.FC<FieldPanelProps> = ({
  onDrop,
  onFilterChange,
  onSortChange,
  filters,
  sortConfig,
  rowFields,
  colFields,
  valueFields,
  onRemoveField,
  onAggregationChange,
  darkMode,
}) => {
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [filterForm, setFilterForm] = useState<FilterCondition | null>(null);
  const [dragGhost, setDragGhost] = useState<{ key: string; x: number; y: number } | null>(null);
  const filterRef = useRef<HTMLDivElement>(null);

  const usedFields = new Set([
    ...rowFields,
    ...colFields,
    ...valueFields.map((v) => v.field),
  ]);

  const handleDragStart = useCallback(
    (e: React.DragEvent, fieldKey: string) => {
      e.dataTransfer.setData('fieldKey', fieldKey);
      e.dataTransfer.effectAllowed = 'move';
      const ghost = document.createElement('div');
      ghost.textContent = FIELD_META.find((f) => f.key === fieldKey)?.label || fieldKey;
      ghost.style.cssText =
        'position:absolute;top:-1000px;left:-1000px;padding:6px 12px;background:#3b82f6;color:#fff;border-radius:4px;font-size:13px;opacity:0.85;pointer-events:none;';
      document.body.appendChild(ghost);
      e.dataTransfer.setDragImage(ghost, 0, 0);
      setTimeout(() => document.body.removeChild(ghost), 0);
    },
    []
  );

  const handleDrag = useCallback(
    (e: React.DragEvent, fieldKey: string) => {
      if (e.clientX !== 0 || e.clientY !== 0) {
        setDragGhost({ key: fieldKey, x: e.clientX, y: e.clientY });
      }
    },
    []
  );

  const handleDragEnd = useCallback(() => {
    setDragGhost(null);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setActiveFilter(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const openFilter = (fieldKey: string) => {
    const meta = FIELD_META.find((f) => f.key === fieldKey)!;
    const existing = filters.find((f) => f.field === fieldKey);
    if (existing) {
      setFilterForm({ ...existing });
    } else {
      const base: FilterCondition = { field: fieldKey, type: 'text' };
      if (meta.type === 'number') {
        base.type = 'range';
        base.valueRange = [0, 100000];
      } else if (meta.type === 'date') {
        base.type = 'dateRange';
        base.dateRange = ['2023-01-01', '2025-12-31'];
      } else {
        base.type = 'text';
        base.textContains = '';
      }
      setFilterForm(base);
    }
    setActiveFilter(fieldKey);
  };

  const applyFilter = () => {
    if (!filterForm) return;
    const existing = filters.findIndex((f) => f.field === filterForm.field);
    const newFilters = [...filters];
    if (existing >= 0) {
      newFilters[existing] = filterForm;
    } else {
      newFilters.push(filterForm);
    }
    onFilterChange(newFilters);
    setActiveFilter(null);
  };

  const removeFilter = (fieldKey: string) => {
    onFilterChange(filters.filter((f) => f.field !== fieldKey));
  };

  return (
    <div className={`field-panel ${darkMode ? 'dark' : ''}`}>
      <div className="field-panel-title">字段列表</div>

      <div className="field-section">
        <div className="field-section-label">维度字段</div>
        {FIELD_META.filter((f) => f.type === 'text' || f.type === 'date').map((field) => {
          const isUsed = usedFields.has(field.key);
          const hasFilter = filters.some((f) => f.field === field.key);
          return (
            <div
              key={field.key}
              className={`field-item ${isUsed ? 'used' : ''}`}
              draggable={!isUsed}
              onDragStart={(e) => handleDragStart(e, field.key)}
              onDrag={(e) => handleDrag(e, field.key)}
              onDragEnd={handleDragEnd}
            >
              <span className="field-item-icon">📐</span>
              <span className="field-item-label">{field.label}</span>
              <button
                className={`field-filter-btn ${hasFilter ? 'active' : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  openFilter(field.key);
                }}
              >
                ▾
              </button>
            </div>
          );
        })}
      </div>

      <div className="field-section">
        <div className="field-section-label">度量字段</div>
        {FIELD_META.filter((f) => f.type === 'number').map((field) => {
          const isUsed = usedFields.has(field.key);
          const hasFilter = filters.some((f) => f.field === field.key);
          return (
            <div
              key={field.key}
              className={`field-item ${isUsed ? 'used' : ''}`}
              draggable={!isUsed}
              onDragStart={(e) => handleDragStart(e, field.key)}
              onDrag={(e) => handleDrag(e, field.key)}
              onDragEnd={handleDragEnd}
            >
              <span className="field-item-icon">#</span>
              <span className="field-item-label">{field.label}</span>
              <button
                className={`field-filter-btn ${hasFilter ? 'active' : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  openFilter(field.key);
                }}
              >
                ▾
              </button>
            </div>
          );
        })}
      </div>

      <div className="field-section">
        <div className="field-section-label">排序设置</div>
        <div className="sort-config">
          <div className="sort-row">
            <label>主排序:</label>
            <select
              value={sortConfig.primary?.field || ''}
              onChange={(e) =>
                onSortChange({
                  ...sortConfig,
                  primary: e.target.value
                    ? { field: e.target.value, direction: sortConfig.primary?.direction || 'asc' }
                    : null,
                })
              }
            >
              <option value="">无</option>
              {FIELD_META.map((f) => (
                <option key={f.key} value={f.key}>
                  {f.label}
                </option>
              ))}
            </select>
            <select
              value={sortConfig.primary?.direction || 'asc'}
              onChange={(e) =>
                onSortChange({
                  ...sortConfig,
                  primary: sortConfig.primary
                    ? { ...sortConfig.primary, direction: e.target.value as 'asc' | 'desc' }
                    : null,
                })
              }
            >
              <option value="asc">升序</option>
              <option value="desc">降序</option>
            </select>
          </div>
          <div className="sort-row">
            <label>次排序:</label>
            <select
              value={sortConfig.secondary?.field || ''}
              onChange={(e) =>
                onSortChange({
                  ...sortConfig,
                  secondary: e.target.value
                    ? { field: e.target.value, direction: sortConfig.secondary?.direction || 'asc' }
                    : null,
                })
              }
            >
              <option value="">无</option>
              {FIELD_META.map((f) => (
                <option key={f.key} value={f.key}>
                  {f.label}
                </option>
              ))}
            </select>
            <select
              value={sortConfig.secondary?.direction || 'asc'}
              onChange={(e) =>
                onSortChange({
                  ...sortConfig,
                  secondary: sortConfig.secondary
                    ? { ...sortConfig.secondary, direction: e.target.value as 'asc' | 'desc' }
                    : null,
                })
              }
            >
              <option value="asc">升序</option>
              <option value="desc">降序</option>
            </select>
          </div>
        </div>
      </div>

      <div className="field-section">
        <div className="field-section-label">已激活筛选</div>
        {filters.length === 0 && (
          <div className="no-filters">暂无筛选条件</div>
        )}
        {filters.map((filter) => {
          const meta = FIELD_META.find((f) => f.key === filter.field);
          return (
            <div key={filter.field} className="active-filter-item">
              <span>{meta?.label || filter.field}</span>
              <button
                className="filter-remove-btn"
                onClick={() => removeFilter(filter.field)}
              >
                ×
              </button>
            </div>
          );
        })}
      </div>

      {activeFilter && filterForm && (
        <div className="filter-popup" ref={filterRef}>
          <div className="filter-popup-title">
            筛选: {FIELD_META.find((f) => f.key === filterForm.field)?.label}
          </div>
          {filterForm.type === 'range' && (
            <div className="filter-popup-body">
              <label>最小值:</label>
              <input
                type="number"
                value={filterForm.valueRange?.[0] ?? 0}
                onChange={(e) =>
                  setFilterForm({
                    ...filterForm,
                    valueRange: [Number(e.target.value), filterForm.valueRange?.[1] ?? 100000],
                  })
                }
              />
              <label>最大值:</label>
              <input
                type="number"
                value={filterForm.valueRange?.[1] ?? 100000}
                onChange={(e) =>
                  setFilterForm({
                    ...filterForm,
                    valueRange: [filterForm.valueRange?.[0] ?? 0, Number(e.target.value)],
                  })
                }
              />
            </div>
          )}
          {filterForm.type === 'text' && (
            <div className="filter-popup-body">
              <label>文本包含:</label>
              <input
                type="text"
                value={filterForm.textContains || ''}
                onChange={(e) =>
                  setFilterForm({ ...filterForm, textContains: e.target.value })
                }
              />
            </div>
          )}
          {filterForm.type === 'dateRange' && (
            <div className="filter-popup-body">
              <label>开始日期:</label>
              <input
                type="date"
                value={filterForm.dateRange?.[0] || ''}
                onChange={(e) =>
                  setFilterForm({
                    ...filterForm,
                    dateRange: [e.target.value, filterForm.dateRange?.[1] || ''],
                  })
                }
              />
              <label>结束日期:</label>
              <input
                type="date"
                value={filterForm.dateRange?.[1] || ''}
                onChange={(e) =>
                  setFilterForm({
                    ...filterForm,
                    dateRange: [filterForm.dateRange?.[0] || '', e.target.value],
                  })
                }
              />
            </div>
          )}
          <div className="filter-popup-actions">
            <button className="filter-apply-btn" onClick={applyFilter}>
              应用
            </button>
            <button
              className="filter-cancel-btn"
              onClick={() => setActiveFilter(null)}
            >
              取消
            </button>
          </div>
        </div>
      )}

      {dragGhost && (
        <div
          className="drag-ghost"
          style={{
            left: dragGhost.x + 12,
            top: dragGhost.y + 12,
          }}
        >
          {FIELD_META.find((f) => f.key === dragGhost.key)?.label}
        </div>
      )}
    </div>
  );
};

export default FieldPanel;
