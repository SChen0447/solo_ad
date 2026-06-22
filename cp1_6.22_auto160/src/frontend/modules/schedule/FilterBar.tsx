import { useState, useEffect } from 'react';
import './FilterBar.css';

interface FilterBarProps {
  onFilterChange: (filters: FilterValues) => void;
}

export interface FilterValues {
  date: string;
  type: string;
  difficulty: string;
}

const DATES = [
  { value: '', label: '全部日期' },
  { value: '2026-06-23', label: '6月23日 (第一天)' },
  { value: '2026-06-24', label: '6月24日 (第二天)' },
  { value: '2026-06-25', label: '6月25日 (第三天)' }
];

const TYPES = [
  { value: '', label: '全部类型' },
  { value: 'talk', label: '演讲' },
  { value: 'workshop', label: '工作坊' },
  { value: 'social', label: '社交活动' }
];

const DIFFICULTIES = [
  { value: '', label: '全部难度' },
  { value: 'beginner', label: '初级' },
  { value: 'intermediate', label: '中级' },
  { value: 'advanced', label: '高级' }
];

export default function FilterBar({ onFilterChange }: FilterBarProps) {
  const [filters, setFilters] = useState<FilterValues>({
    date: '',
    type: '',
    difficulty: ''
  });

  useEffect(() => {
    onFilterChange(filters);
  }, [filters, onFilterChange]);

  const handleChange = (key: keyof FilterValues, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleReset = () => {
    setFilters({ date: '', type: '', difficulty: '' });
  };

  return (
    <div className="activity-filters">
      <div className="filter-group">
        <label>日期</label>
        <select
          value={filters.date}
          onChange={(e) => handleChange('date', e.target.value)}
        >
          {DATES.map(d => (
            <option key={d.value} value={d.value}>{d.label}</option>
          ))}
        </select>
      </div>

      <div className="filter-group">
        <label>活动类型</label>
        <select
          value={filters.type}
          onChange={(e) => handleChange('type', e.target.value)}
        >
          {TYPES.map(t => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
      </div>

      <div className="filter-group">
        <label>难度级别</label>
        <select
          value={filters.difficulty}
          onChange={(e) => handleChange('difficulty', e.target.value)}
        >
          {DIFFICULTIES.map(d => (
            <option key={d.value} value={d.value}>{d.label}</option>
          ))}
        </select>
      </div>

      <div className="filter-buttons">
        <button className="filter-btn" onClick={handleReset}>
          重置筛选
        </button>
      </div>
    </div>
  );
}
