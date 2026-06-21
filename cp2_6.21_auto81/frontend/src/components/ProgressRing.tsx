import React, { useMemo } from 'react';

interface ProgressRingProps {
  percent: number;
  size?: number;
  strokeWidth?: number;
  bookId?: string;
}

const ProgressRing: React.FC<ProgressRingProps> = ({ percent, size = 60, strokeWidth = 6, bookId = '' }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clampedPercent = Math.min(Math.max(percent, 0), 100);
  const dashOffset = circumference * (1 - clampedPercent / 100);

  const gradientId = useMemo(() => {
    return `gradientStroke_${bookId || Math.random().toString(36).slice(2, 9)}`;
  }, [bookId]);

  const fallbackColor = '#9CA3AF';

  return (
    <div
      className="progress-ring"
      style={{
        width: size,
        height: size,
        position: 'relative'
      }}
    >
      <svg width={size} height={size}>
        <defs>
          <linearGradient
            id={gradientId}
            x1="0%"
            y1="0%"
            x2="100%"
            y2="100%"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor="#6366F1" />
            <stop offset="100%" stopColor="#C084FC" />
          </linearGradient>
        </defs>
        <circle
          className="circle-bg"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          stroke="#E5E7EB"
          fill="none"
        />
        <circle
          className="circle-fg"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          fill="none"
          stroke={`url(#${gradientId})`}
          style={{
            stroke: `url(#${gradientId})`,
            transition: 'stroke-dashoffset 0.6s ease'
          }}
          onError={(e) => {
            (e.target as SVGCircleElement).setAttribute('stroke', fallbackColor);
          }}
        />
        <text
          x="50%"
          y="50%"
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={16}
          fontWeight={700}
          fill="#1F2937"
        >
          {Math.round(clampedPercent)}%
        </text>
      </svg>
    </div>
  );
};

export default ProgressRing;
