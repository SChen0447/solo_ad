import React, { useState } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { INSTRUMENT_CONFIG, InstrumentType } from '@/core/types';
import styles from './SymbolPalette.module.css';

const instruments: InstrumentType[] = ['piano', 'strings', 'guitar', 'synth'];

function ShapeIcon({ shape, color }: { shape: 'circle' | 'triangle' | 'square' | 'wave'; color: string }) {
  switch (shape) {
    case 'circle':
      return <circle cx="24" cy="24" r="18" fill={color} />;
    case 'triangle':
      return <polygon points="24,6 42,42 6,42" fill={color} />;
    case 'square':
      return <rect x="6" y="6" width="36" height="36" rx="4" fill={color} />;
    case 'wave':
      return (
        <path
          d="M4,24 Q12,8 20,24 Q28,40 36,24 Q40,16 44,24"
          stroke={color}
          strokeWidth="4"
          fill="none"
          strokeLinecap="round"
        />
      );
    default:
      return null;
  }
}

function DraggableSymbol({ instrument }: { instrument: InstrumentType }) {
  const config = INSTRUMENT_CONFIG[instrument];
  const [hovered, setHovered] = useState(false);
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `palette-${instrument}`,
    data: { type: 'palette-symbol', instrument },
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`${styles.symbolItem} ${hovered ? styles.hovered : ''} ${isDragging ? styles.dragging : ''}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div
        className={styles.symbolShape}
        style={{
          transform: hovered ? 'scale(1.15)' : 'scale(1)',
          transition: 'transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}
      >
        <svg width="48" height="48" viewBox="0 0 48 48">
          <ShapeIcon shape={config.shape} color={config.color} />
        </svg>
      </div>
      <span className={styles.symbolLabel} style={{ color: config.color }}>
        {config.label}
      </span>
      {hovered && (
        <div className={styles.tooltip}>
          <div className={styles.tooltipName}>{config.label}</div>
          <div className={styles.tooltipDesc}>{config.description}</div>
        </div>
      )}
    </div>
  );
}

export default function SymbolPalette() {
  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <h2 className={styles.title}>符号面板</h2>
        <span className={styles.subtitle}>拖拽到五线谱</span>
      </div>
      <div className={styles.grid}>
        {instruments.map((inst) => (
          <DraggableSymbol key={inst} instrument={inst} />
        ))}
      </div>
    </div>
  );
}
