import React from 'react';
import { getCreditScoreColor } from '@/utils/formatDate';

interface CreditBadgeProps {
  score: number;
  size?: 'sm' | 'md';
}

const CreditBadge: React.FC<CreditBadgeProps> = ({ score, size = 'md' }) => {
  const color = getCreditScoreColor(score);
  const diameter = size === 'sm' ? '24px' : '28px';
  const fontSize = size === 'sm' ? '11px' : '12px';

  return (
    <div
      className="inline-flex items-center justify-center text-white font-bold rounded-full"
      style={{
        width: diameter,
        height: diameter,
        backgroundColor: color,
        fontSize,
      }}
      title={`信用分: ${score}`}
    >
      {score}
    </div>
  );
};

export default CreditBadge;
