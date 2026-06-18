import React from 'react';

interface NavigationPanelProps {
  years: { year: number; count: number }[];
  activeYear: number | null;
  allCollapsed: boolean;
  onYearClick: (year: number) => void;
  onToggleAll: () => void;
}

const NavigationPanel: React.FC<NavigationPanelProps> = ({
  years,
  activeYear,
  allCollapsed,
  onYearClick,
  onToggleAll
}) => {
  const hasNoYears = years.length === 0;

  return (
    <div className="navigation-panel">
      <div className="nav-header">
        <span className="nav-title">年份</span>
        <button
          className={`toggle-all-btn ${allCollapsed ? 'collapsed' : ''}`}
          onClick={onToggleAll}
          disabled={hasNoYears}
          title={allCollapsed ? '展开全部年份' : '折叠全部年份'}
          aria-label={allCollapsed ? '展开全部年份' : '折叠全部年份'}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
          <span className="toggle-all-label">
            {allCollapsed ? '展开全部' : '折叠全部'}
          </span>
        </button>
      </div>
      {years.map(({ year, count }) => (
        <div
          key={year}
          className={`nav-item ${activeYear === year ? 'active' : ''}`}
          onClick={() => onYearClick(year)}
        >
          <span>{year}</span>
          <span className="nav-item-count">{count}</span>
        </div>
      ))}
    </div>
  );
};

export default NavigationPanel;
