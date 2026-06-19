import React from 'react';
import { KEYWORDS } from '@/utils/paletteGenerator';

interface KeywordGridProps {
  selected: string | null;
  onSelect: (keyword: string) => void;
  bgColor: string;
}

const KeywordGrid: React.FC<KeywordGridProps> = ({ selected, onSelect, bgColor }) => {
  return (
    <div
      className="glass"
      style={{
        transition: 'background-color 0.6s cubic-bezier(0.25, 0.1, 0.25, 1)',
        backgroundColor: bgColor,
        overflowY: 'auto',
      }}
    >
      <div className="keyword-grid">
        {KEYWORDS.map((kw) => {
          const isSelected = selected === kw.label;
          return (
            <div
              key={kw.label}
              className={`keyword-card glass ${isSelected ? 'selected bounce-up glow-pulse' : ''}`}
              onClick={() => onSelect(kw.label)}
              style={{
                backgroundColor: isSelected
                  ? 'rgba(255, 255, 255, 0.18)'
                  : 'rgba(255, 255, 255, 0.06)',
              }}
            >
              <span className="emoji">{kw.emoji}</span>
              <span className="label">{kw.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default KeywordGrid;
