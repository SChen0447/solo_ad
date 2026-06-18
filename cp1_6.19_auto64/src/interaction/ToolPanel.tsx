import React from 'react';
import {
  Sun,
  Mountain,
  Building2,
  TreeDeciduous,
  Trash2,
  Move,
  Eye,
  CloudSun,
  Sunset,
  RotateCcw,
} from 'lucide-react';
import { useSandboxStore } from '../store';
import { getElementTypeName } from './PlacementLogic';
import type { ElementType, WeatherMode, ToolMode } from '../types';

interface ElementButtonProps {
  type: ElementType;
  icon: React.ReactNode;
  isSelected: boolean;
  onClick: () => void;
}

const ElementButton: React.FC<ElementButtonProps> = ({
  type,
  icon,
  isSelected,
  onClick,
}) => {
  const bgColors: Record<ElementType, string> = {
    terrain: '#4a7c59',
    building: '#a0a0a0',
    tree: '#2d5a27',
  };

  return (
    <button
      onClick={onClick}
      className="element-button"
      style={{
        position: 'relative',
        width: '60px',
        height: '60px',
        borderRadius: '50%',
        border: isSelected ? '2px solid #4a9eff' : '1px solid #444',
        backgroundColor: isSelected ? '#3a3a3a' : '#2a2a2a',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = '#3a3a3a';
        e.currentTarget.style.transform = 'scale(1.05)';
      }}
      onMouseLeave={(e) => {
        if (!isSelected) {
          e.currentTarget.style.backgroundColor = '#2a2a2a';
        }
        e.currentTarget.style.transform = 'scale(1)';
      }}
      onMouseDown={(e) => {
        e.currentTarget.style.transform = 'scale(0.95)';
      }}
      onMouseUp={(e) => {
        e.currentTarget.style.transform = 'scale(1.05)';
      }}
    >
      <div
        style={{
          width: '40px',
          height: '40px',
          borderRadius: '50%',
          backgroundColor: bgColors[type],
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {icon}
      </div>
      {isSelected && (
        <div
          style={{
            position: 'absolute',
            bottom: '-4px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '30px',
            height: '3px',
            borderRadius: '2px',
            backgroundColor: '#4a9eff',
            boxShadow: '0 0 8px #4a9eff',
          }}
        />
      )}
    </button>
  );
};

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit?: string;
  onChange: (value: number) => void;
  trackColor?: string;
  thumbColor?: string;
}

const Slider: React.FC<SliderProps> = ({
  label,
  value,
  min,
  max,
  step,
  unit = '',
  onChange,
  trackColor = '#555',
  thumbColor = '#ffaa00',
}) => {
  const percentage = ((value - min) / (max - min)) * 100;

  return (
    <div style={{ marginBottom: '16px' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginBottom: '8px',
        }}
      >
        <span style={{ color: '#ccc', fontSize: '13px' }}>{label}</span>
        <span style={{ color: thumbColor, fontSize: '13px', fontWeight: 600 }}>
          {value.toFixed(1)}
          {unit}
        </span>
      </div>
      <div
        style={{
          position: 'relative',
          height: '6px',
          backgroundColor: trackColor,
          borderRadius: '3px',
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            height: '100%',
            width: `${percentage}%`,
            backgroundColor: thumbColor,
            borderRadius: '3px',
            transition: 'width 0.1s ease',
          }}
        />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          style={{
            position: 'absolute',
            width: '100%',
            height: '100%',
            opacity: 0,
            cursor: 'pointer',
            margin: 0,
            padding: 0,
            top: 0,
            left: 0,
          }}
        />
        <div
          style={{
            position: 'absolute',
            left: `calc(${percentage}% - 10px)`,
            top: '50%',
            transform: 'translateY(-50%)',
            width: '20px',
            height: '20px',
            borderRadius: '50%',
            backgroundColor: thumbColor,
            boxShadow: `0 0 8px ${thumbColor}`,
            pointerEvents: 'none',
            transition: 'left 0.1s ease',
          }}
        />
      </div>
    </div>
  );
};

interface ActionButtonProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  isActive?: boolean;
  variant?: 'primary' | 'secondary' | 'danger';
}

const ActionButton: React.FC<ActionButtonProps> = ({
  icon,
  label,
  onClick,
  isActive = false,
  variant = 'secondary',
}) => {
  const variantStyles = {
    primary: {
      bg: isActive ? '#4a9eff' : '#3a6ea5',
      hoverBg: '#4a9eff',
      border: '#4a9eff',
    },
    secondary: {
      bg: isActive ? '#4a9eff' : '#3a3a3a',
      hoverBg: '#454545',
      border: '#444',
    },
    danger: {
      bg: isActive ? '#ff4444' : '#5a3a3a',
      hoverBg: '#ff4444',
      border: '#ff4444',
    },
  };

  const styles = variantStyles[variant];

  return (
    <button
      onClick={onClick}
      style={{
        width: '100%',
        padding: '12px 16px',
        backgroundColor: styles.bg,
        border: `1px solid ${styles.border}`,
        borderRadius: '6px',
        color: '#fff',
        fontSize: '14px',
        fontWeight: 500,
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        marginBottom: '8px',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = styles.hoverBg;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = styles.bg;
      }}
      onMouseDown={(e) => {
        e.currentTarget.style.transform = 'scale(0.98)';
      }}
      onMouseUp={(e) => {
        e.currentTarget.style.transform = 'scale(1)';
      }}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
};

export const LeftPanel: React.FC = () => {
  const placingElementType = useSandboxStore(
    (state) => state.placingElementType
  );
  const setPlacingElementType = useSandboxStore(
    (state) => state.setPlacingElementType
  );
  const selectedElementId = useSandboxStore(
    (state) => state.selectedElementId
  );
  const removeElement = useSandboxStore((state) => state.removeElement);
  const clearAll = useSandboxStore((state) => state.clearAll);
  const placingHeight = useSandboxStore((state) => state.placingHeight);
  const setPlacingHeight = useSandboxStore(
    (state) => state.setPlacingHeight
  );
  const updateElement = useSandboxStore((state) => state