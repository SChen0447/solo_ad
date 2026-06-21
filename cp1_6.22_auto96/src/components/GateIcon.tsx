import type { GateType } from '../types';

interface GateIconProps {
  type: GateType;
  size?: number;
  color?: string;
}

export function GateIcon({ type, size = 40, color = '#f6e05e' }: GateIconProps) {
  const strokeWidth = 2;

  switch (type) {
    case 'AND':
      return (
        <svg width={size} height={size} viewBox="0 0 60 60" fill="none">
          <line x1="5" y1="20" x2="20" y2="20" stroke={color} strokeWidth={strokeWidth} />
          <line x1="5" y1="40" x2="20" y2="40" stroke={color} strokeWidth={strokeWidth} />
          <path
            d="M20 10 L35 10 A20 20 0 0 1 35 50 L20 50 Z"
            stroke={color}
            strokeWidth={strokeWidth}
            fill="none"
          />
          <line x1="55" y1="30" x2="55" y2="30" stroke={color} strokeWidth={strokeWidth} />
          <line x1="45" y1="30" x2="55" y2="30" stroke={color} strokeWidth={strokeWidth} />
        </svg>
      );
    case 'OR':
      return (
        <svg width={size} height={size} viewBox="0 0 60 60" fill="none">
          <line x1="8" y1="20" x2="22" y2="20" stroke={color} strokeWidth={strokeWidth} />
          <line x1="8" y1="40" x2="22" y2="40" stroke={color} strokeWidth={strokeWidth} />
          <path
            d="M15 10 Q25 30 15 50 Q35 50 50 30 Q35 10 15 10 Z"
            stroke={color}
            strokeWidth={strokeWidth}
            fill="none"
          />
          <line x1="50" y1="30" x2="55" y2="30" stroke={color} strokeWidth={strokeWidth} />
        </svg>
      );
    case 'NOT':
      return (
        <svg width={size} height={size} viewBox="0 0 60 60" fill="none">
          <line x1="5" y1="30" x2="20" y2="30" stroke={color} strokeWidth={strokeWidth} />
          <polygon
            points="20,10 45,30 20,50"
            stroke={color}
            strokeWidth={strokeWidth}
            fill="none"
          />
          <circle cx="48" cy="30" r="3" stroke={color} strokeWidth={strokeWidth} fill="none" />
          <line x1="51" y1="30" x2="55" y2="30" stroke={color} strokeWidth={strokeWidth} />
        </svg>
      );
    default:
      return null;
  }
}
