import React, { useState } from 'react';

interface StarRatingProps {
  value: number;
  onChange: (value: number) => void;
  max?: number;
  size?: number;
  readOnly?: boolean;
}

const StarRating: React.FC<StarRatingProps> = ({
  value,
  onChange,
  max = 10,
  size = 24,
  readOnly = false,
}) => {
  const [hoverValue, setHoverValue] = useState<number | null>(null);
  const [bouncingStar, setBouncingStar] = useState<number | null>(null);

  const getStarColor = (index: number) => {
    const displayValue = hoverValue !== null ? hoverValue : value;
    if (index < displayValue) {
      const ratio = index / max;
      const r = Math.round(255 - ratio * 55);
      const g = Math.round(80 + ratio * 150);
      const b = Math.round(80 + ratio * 40);
      return `rgb(${r}, ${g}, ${b})`;
    }
    return '#E0D5C7';
  };

  const handleClick = (index: number) => {
    if (readOnly) return;
    const newValue = index + 1;
    onChange(newValue);
    setBouncingStar(index);
    setTimeout(() => setBouncingStar(null), 300);
  };

  return (
    <div
      style={{
        display: 'flex',
        gap: '4px',
        cursor: readOnly ? 'default' : 'pointer',
      }}
      onMouseLeave={() => setHoverValue(null)}
    >
      {Array.from({ length: max }).map((_, i) => (
        <span
          key={i}
          onClick={() => handleClick(i)}
          onMouseEnter={() => !readOnly && setHoverValue(i + 1)}
          style={{
            display: 'inline-block',
            fontSize: `${size}px`,
            lineHeight: 1,
            transition: 'transform 0.15s ease-out',
            transform: bouncingStar === i ? 'scale(1.3) translateY(-4px)' : 'scale(1)',
            userSelect: 'none',
            animation: bouncingStar === i ? 'starBounce 0.3s ease-out' : 'none',
          }}
        >
          <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill={getStarColor(i)}
            style={{
              filter: i < (hoverValue !== null ? hoverValue : value) ? 'drop-shadow(0 1px 2px rgba(0,0,0,0.2))' : 'none',
              transition: 'fill 0.2s ease',
            }}
          >
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
        </span>
      ))}
      <style>{`
        @keyframes starBounce {
          0% { transform: scale(1); }
          50% { transform: scale(1.4) translateY(-6px); }
          100% { transform: scale(1.3) translateY(-4px); }
        }
      `}</style>
    </div>
  );
};

export default StarRating;
