import React from 'react';
import { PlantType } from '@/types';

interface PlantIconProps {
  type: PlantType;
  size?: number;
  color?: string;
}

export const PlantIcon: React.FC<PlantIconProps> = ({ type, size = 24, color = '#22C55E' }) => {
  const icons: Record<PlantType, React.ReactNode> = {
    succulent: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22v-7" />
        <path d="M7 15v-3a5 5 0 0 1 10 0v3" />
        <path d="M8 10V7a4 4 0 0 1 8 0v3" />
        <path d="M9 7V4a3 3 0 0 1 6 0v3" />
      </svg>
    ),
    flower: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 12V22" />
        <path d="M12 12c-2-2-3-4-2-6 1-2 4-1 4 2 0 2-2 4-2 4z" />
        <path d="M12 12c2-2 3-4 2-6-1-2-4-1-4 2 0 2 2 4 2 4z" />
        <path d="M12 12c-2 2-4 3-6 2-2-1-1-4 2-4 2 0 4 2 4 2z" />
        <path d="M12 12c2 2 4 3 6 2 2-1 1-4-2-4-2 0-4 2-4 2z" />
        <circle cx="12" cy="12" r="2" fill={color} />
      </svg>
    ),
    foliage: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22V12" />
        <path d="M12 12c0-4 3-8 8-8 0 5-4 8-8 8z" />
        <path d="M12 12c0-4-3-8-8-8 0 5 4 8 8 8z" />
        <path d="M12 18c2 0 4-1 5-3 1 2 1 3 1 3-2 2-4 3-6 3z" />
        <path d="M12 18c-2 0-4-1-5-3-1 2-1 3-1 3 2 2 4 3 6 3z" />
      </svg>
    ),
    herb: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22V8" />
        <path d="M12 8c-3 0-6-2-6-6 3 0 6 2 6 6z" />
        <path d="M12 8c3 0 6-2 6-6-3 0-6 2-6 6z" />
        <path d="M12 15c-3 0-6-2-6-6 3 0 6 2 6 6z" />
        <path d="M12 15c3 0 6-2 6-6-3 0-6 2-6 6z" />
        <ellipse cx="12" cy="20" rx="3" ry="1.5" />
      </svg>
    ),
  };

  return <>{icons[type]}</>;
};
