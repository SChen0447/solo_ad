import React, { useState, useMemo, useRef, useEffect } from 'react';
import type { DataType, FilterConfig, SortConfig } from '../utils/MockDataProvider';

interface DataTableProps {
  data: DataType[];
  filters: FilterConfig;
  onCellEdit: (id: number, field: keyof DataType, value: string) => void;
}

interface EditingCell {
  rowId: number | null;
  field: keyof DataType | null;
}

const DataTable: React.FC<DataTableProps> = ({ data, filters, onCellEdit }) => {
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: null, direction: 'asc' });
  const [editingCell, setEditingCell] = useState<EditingCell>({ rowId: null, field: null });
  const [editValue, setEditValue] = useState<string>('');
  const [flashRowId, setFlashRowId] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (inputRef.current && editingCell.rowId !== null && editingCell.field !== null) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingCell]);

  const processedData = useMemo(() => {
    const startTime = performance.now();

    let result = [...data];

    if (filters.keyword) {
      const keyword = filters.keyword.toLowerCase();
      result = result.filter(
        item => item.name.toLowerCase().includes(keyword) || item.email.toLowerCase().includes(keyword)
      );
    }

    if (filters.status !== 'all') {
      result = result.filter(item => item.status === filters.status);
    }

    if (filters.dateStart) {
      result = result.filter(item => item.createdAt >= filters.dateStart);
    }

    if (filters.dateEnd) {
      result = result.filter(item => item.createdAt <= filters.dateEnd);
    }

    if (sortConfig.key) {
      result.sort((a, b) => {
        const aVal = a[sortConfig.key!];
        const bVal = b[sortConfig.key!];

        if (typeof aVal === 'string' && typeof bVal === 'string') {
          return sortConfig.direction === 'asc'
            ? aVal.localeCompare(bVal, 'zh-CN')
            : bVal.localeCompare(aVal, 'zh-CN');
        }

        if (typeof aVal === 'number' && typeof bVal === 'number') {
          return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
        }

        return 0;
      });
    }

    const endTime = performance.now();
    if (endTime - startTime > 10) {
      console.warn(`筛选排序耗时: ${(endTime - startTime).toFixed(2)}ms`);
    }

    return result;
  }, [data, filters, sortConfig]);

  const handleSort = (key: keyof DataType) => {
    setSortConfig(prev => {
      if (prev.key === key) {
        return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
      }
      return { key, direction: 'asc' };
    });
  };

  const handleDoubleClick = (rowId: number, field: keyof DataType, currentValue: string) => {
    if (editingCell.rowId === rowId && editingCell.field === field) return;
    setEditingCell({ rowId, field });
    setEditValue(currentValue);
  };

  const handleSave = () => {
    if (editingCell.rowId !== null && editingCell.field !== null) {
      const field = editingCell.field;
      let value = editValue;

      if (field === 'status') {
        value = value === 'active' ? 'active' : 'inactive';
      }

      onCellEdit(editingCell.rowId, field, value);

      setFlashRowId(editingCell.rowId);
      setTimeout(() => setFlashRowId(null), 300);

      setEditingCell({ rowId: null, field: null });
    }
  };

  const handleBlur = () => {
    handleSave();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      setEditingCell({ rowId: null, field: null });
    }
  };

  const renderSortIcon = (key: keyof DataType) => {
    if (sortConfig.key !== key) {
      return <span className="sort-arrow" style={{ color: '#9ca3af' }}>↕</span>;
    }
    return (
      <span className="sort-arrow" style={{ color: '#3b82f6' }}>
        {sortConfig.direction === 'asc' ? '▲' : '▼'}
      </span>
    );
  };

  const renderCellContent = (row: DataType, field: keyof DataType) => {
    const isEditing = editingCell.rowId === row.id && editingCell.field === field;
    const value = row[field];

    if (isEditing) {
      return (
        <input
          ref={inputRef}
          type="text"
          className="cell-input"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
        />
      );
    }

    let displayValue: string = value as string;
    if (field === 'status') {
      displayValue = value === 'active' ? '活跃' : '非活跃';
    }

    return <span>{displayValue}</span>;
  };

  const headers: { key: keyof DataType; label: string }[] = [
    { key: 'name', label: '姓名' },
    { key: 'email', label: '邮箱' },
    { key: 'status', label: '状态' },
    { key: 'createdAt', label: '创建日期' }
  ];

  return (
    <div className="table-wrapper">
      <table className="data-table">
        <thead>
          <tr>
            <th
              className={`table-header ${sortConfig.key === 'name' ? 'sorted' : ''}`}
              onClick={() => handleSort('name')}
            >
              姓名 {renderSortIcon('name')}
            </th>
            <th
              className={`table-header ${sortConfig.key === 'email' ? 'sorted' : ''}`}
              onClick={() => handleSort('email')}
            >
              邮箱 {renderSortIcon('email')}
            </th>
            <th
              className={`table-header ${sortConfig.key === 'status' ? 'sorted' : ''}`}
              onClick={() => handleSort('status')}
            >
              状态 {renderSortIcon('status')}
            </th>
            <th
              className={`table-header ${sortConfig.key === 'createdAt' ? 'sorted' : ''}`}
              onClick={() => handleSort('createdAt')}
            >
              创建日期 {renderSortIcon('createdAt')}
            </th>
          </tr>
        </thead>
        <tbody>
          {processedData.map((row, index) => (
            <tr
              key={row.id}
              className={`table-row ${index % 2 === 0 ? 'row-even' : 'row-odd'} ${flashRowId === row.id ? 'row-flash' : ''}`}
              data-label="行"
            >
              {headers.map(header => (
                <td
                  key={header.key}
                  className="table-cell"
                  data-label={header.label}
                  onDoubleClick={() => handleDoubleClick(row.id, header.key, String(row[header.key]))}
                >
                  {renderCellContent(row, header.key)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      {processedData.length === 0 && (
        <div className="empty-state">
          <p>暂无匹配的数据</p>
        </div>
      )}

      <div className="table-footer">
        共 {processedData.length} 条记录
      </div>
    </div>
  );
};

export default DataTable;
