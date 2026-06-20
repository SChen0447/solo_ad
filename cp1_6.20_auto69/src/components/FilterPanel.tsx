import React from 'react';
import type { FilterConfig } from '../utils/MockDataProvider';

interface FilterPanelProps {
  filters: FilterConfig;
  onFilterChange: (filters: FilterConfig) => void;
}

const FilterPanel: React.FC<FilterPanelProps> = ({ filters, onFilterChange }) => {
  const handleKeywordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFilterChange({ ...filters, keyword: e.target.value });
  };

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onFilterChange({ ...filters, status: e.target.value as FilterConfig['status'] });
  };

  const handleDateStartChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFilterChange({ ...filters, dateStart: e.target.value });
  };

  const handleDateEndChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFilterChange({ ...filters, dateEnd: e.target.value });
  };

  return (
    <div className="filter-panel">
      <div className="filter-item">
        <label htmlFor="keyword" className="filter-label">关键词搜索</label>
        <input
          type="text"
          id="keyword"
          className="filter-input"
          placeholder="输入姓名或邮箱搜索..."
          value={filters.keyword}
          onChange={handleKeywordChange}
        />
      </div>

      <div className="filter-item">
        <label htmlFor="status" className="filter-label">状态筛选</label>
        <select
          id="status"
          className="filter-select"
          value={filters.status}
          onChange={handleStatusChange}
        >
          <option value="all">全部</option>
          <option value="active">活跃</option>
          <option value="inactive">非活跃</option>
        </select>
      </div>

      <div className="filter-item">
        <label htmlFor="dateStart" className="filter-label">开始日期</label>
        <input
          type="date"
          id="dateStart"
          className="filter-input"
          value={filters.dateStart}
          onChange={handleDateStartChange}
        />
      </div>

      <div className="filter-item">
        <label htmlFor="dateEnd" className="filter-label">结束日期</label>
        <input
          type="date"
          id="dateEnd"
          className="filter-input"
          value={filters.dateEnd}
          onChange={handleDateEndChange}
        />
      </div>
    </div>
  );
};

export default FilterPanel;
