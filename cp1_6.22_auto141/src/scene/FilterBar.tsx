import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { FILTERS } from '../data/celestialBodies';
import type { FilterType } from '../types';

interface FilterBarProps {
  selectedFilter: FilterType;
  onFilterChange: (filter: FilterType) => void;
}

export default function FilterBar({ selectedFilter, onFilterChange }: FilterBarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="filter-bar">
      <button
        className="filter-menu-toggle"
        onClick={() => setMobileOpen(!mobileOpen)}
        aria-label="切换滤镜菜单"
      >
        {mobileOpen ? <X size={20} /> : <Menu size={20} />}
      </button>
      <div className={`filter-buttons ${mobileOpen ? 'mobile-open' : ''}`}>
        {FILTERS.map((filter) => (
          <button
            key={filter.key}
            className={`filter-button ${selectedFilter === filter.key ? 'active' : ''}`}
            style={{ backgroundColor: filter.color }}
            onClick={() => {
              onFilterChange(filter.key);
              setMobileOpen(false);
            }}
            title={filter.label}
            aria-label={filter.label}
          >
            <span className="filter-label">{filter.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
