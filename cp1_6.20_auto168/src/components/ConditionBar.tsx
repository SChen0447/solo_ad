import React from 'react';
import { getConditionColor, CONDITION_LABELS } from '@/utils/formatDate';

interface ConditionBarProps {
  score: number;
  showLabel?: boolean;
}

const ConditionBar: React.FC<ConditionBarProps> = ({ score, showLabel = true }) => {
  const percentage = ((score - 1) / 4) * 100;
  const color = getConditionColor(score);

  return (
    <div className="flex items-center gap-2">
      <div
        className="relative bg-gray-200"
        style={{ width: '180px', height: '8px', borderRadius: '4px' }}
      >
        <div
          className="absolute top-0 left-0 h-full"
          style={{
            width: `${percentage}%`,
            background: `linear-gradient(to right, #27ae60, ${color})`,
            borderRadius: '4px',
            transition: 'width 0.3s ease',
          }}
        />
      </div>
      {showLabel && (
        <span className="text-xs text-gray-600">{CONDITION_LABELS[score - 1]}</span>
      )}
    </div>
  );
};

export default ConditionBar;
