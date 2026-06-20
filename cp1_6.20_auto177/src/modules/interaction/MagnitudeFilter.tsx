import React, { useState, useEffect } from 'react';
import './MagnitudeFilter.css';

interface MagnitudeRange {
  min: number;
  max: number;
  label: string;
  colorStart: string;
  colorEnd: string;
}

interface MagnitudeFilterProps {
  onFilterChange: (activeRanges: Array<{ min: number; max: number }>) => void;
}

const magnitudeRanges: MagnitudeRange[] = [
  { min: 3, max: 4, label: '3-4级', colorStart: '#00ccff', colorEnd: '#66ddff' },
  { min: 4, max: 5, label: '4-5级', colorStart: '#66ddff', colorEnd: '#ffcc00' },
  { min: 5, max: 6, label: '5-6级', colorStart: '#ff9900', colorEnd: '#ff6600' },
  { min: 6, max: 7, label: '6-7级', colorStart: '#ff3300', colorEnd: '#cc0000' },
];

export const MagnitudeFilter: React.FC<MagnitudeFilterProps> = ({ onFilterChange }) => {
  const [activeRanges, setActiveRanges] = useState<Set<number>>(new Set([0, 1, 2, 3]));
  const [isExpanded, setIsExpanded] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleCheckboxChange = (index: number) => {
    setActiveRanges(prev => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  useEffect(() => {
    const ranges = Array.from(activeRanges).map(idx => ({
      min: magnitudeRanges[idx].min,
      max: magnitudeRanges[idx].max
    }));
    onFilterChange(ranges);
  }, [activeRanges, onFilterChange]);

  const containerClass = `magnitude-filter ${!isExpanded && isMobile ? 'collapsed' : ''}`;

  return (
    <div className={containerClass}>
      {isMobile && (
        <button 
          className="filter-toggle"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M3 17v-2h18v2H3zm0-4v-2h18v2H3zm0-4V7h18v2H3z"/>
          </svg>
        </button>
      )}
      
      {(isExpanded || !isMobile) && (
        <div className="filter-content">
          <h3 className="filter-title">震级筛选</h3>
          <div className="filter-options">
            {magnitudeRanges.map((range, index) => (
              <label key={index} className="filter-option">
                <div 
                  className="color-box"
                  style={{
                    background: `linear-gradient(135deg, ${range.colorStart}, ${range.colorEnd})`
                  }}
                />
                <input
                  type="checkbox"
                  checked={activeRanges.has(index)}
                  onChange={() => handleCheckboxChange(index)}
                  className="filter-checkbox"
                />
                <span className="filter-label">{range.label}</span>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
