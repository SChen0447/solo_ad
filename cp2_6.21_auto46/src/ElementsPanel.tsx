import React from 'react';
import { ElementType, PRESET_COLORS, DEFAULT_SIZES } from './store';

interface ElementItemProps {
  type: ElementType;
  colorIndex: number;
  onDragStart: (e: React.DragEvent, type: ElementType, colorIndex: number) => void;
}

const typeLabels: Record<ElementType, string> = {
  rectangle: '矩形',
  circle: '圆形',
  triangle: '三角形',
  speechBubble: '对话气泡',
  dialogBox: '对话框',
};

function ShapePreview({ type, fill, stroke }: { type: ElementType; fill: string; stroke: string }) {
  const size = DEFAULT_SIZES[type];
  const sw = Math.min(36, (size.width / size.height) * 24);
  const sh = 24;
  const strokeW = 2;

  switch (type) {
    case 'rectangle':
      return (
        <svg width={sw} height={sh} viewBox={`0 0 ${sw} ${sh}`}>
          <rect
            x={strokeW}
            y={strokeW}
            width={sw - strokeW * 2}
            height={sh - strokeW * 2}
            rx={2}
            fill={fill}
            stroke={stroke}
            strokeWidth={strokeW}
          />
        </svg>
      );
    case 'circle':
      return (
        <svg width={sw} height={sh} viewBox={`0 0 ${sw} ${sh}`}>
          <ellipse
            cx={sw / 2}
            cy={sh / 2}
            rx={sw / 2 - strokeW}
            ry={sh / 2 - strokeW}
            fill={fill}
            stroke={stroke}
            strokeWidth={strokeW}
          />
        </svg>
      );
    case 'triangle':
      return (
        <svg width={sw} height={sh} viewBox={`0 0 ${sw} ${sh}`}>
          <polygon
            points={`${sw / 2},${strokeW} ${sw - strokeW},${sh - strokeW} ${strokeW},${sh - strokeW}`}
            fill={fill}
            stroke={stroke}
            strokeWidth={strokeW}
          />
        </svg>
      );
    case 'speechBubble':
      return (
        <svg width={sw} height={sh} viewBox={`0 0 ${sw} ${sh}`}>
          <path
            d={`M${strokeW},${strokeW + 3} 
                Q${strokeW},${strokeW} ${strokeW + 3},${strokeW}
                L${sw - strokeW - 3},${strokeW}
                Q${sw - strokeW},${strokeW} ${sw - strokeW},${strokeW + 3}
                L${sw - strokeW},${sh - 8}
                Q${sw - strokeW},${sh - 5} ${sw - strokeW - 3},${sh - 5}
                L${sw / 2 + 4},${sh - 5}
                L${sw / 2 - 2},${sh - strokeW}
                L${sw / 2 - 6},${sh - 5}
                L${strokeW + 3},${sh - 5}
                Q${strokeW},${sh - 5} ${strokeW},${sh - 8}
                Z`}
            fill={fill}
            stroke={stroke}
            strokeWidth={strokeW}
          />
        </svg>
      );
    case 'dialogBox':
      return (
        <svg width={sw} height={sh} viewBox={`0 0 ${sw} ${sh}`}>
          <rect
            x={strokeW}
            y={strokeW}
            width={sw - strokeW * 2}
            height={sh - strokeW * 2}
            fill={fill}
            stroke={stroke}
            strokeWidth={strokeW}
          />
        </svg>
      );
  }
}

function ElementItem({ type, colorIndex, onDragStart }: ElementItemProps) {
  const colors = PRESET_COLORS[type][colorIndex];
  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, type, colorIndex)}
      style={{
        width: 72,
        height: 60,
        borderRadius: 6,
        backgroundColor: '#1F2937',
        border: '1px solid #374151',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        cursor: 'grab',
        transition: 'all 0.3s ease-in-out',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.borderColor = '#F59E0B';
        (e.currentTarget as HTMLDivElement).style.transform = 'scale(1.05)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.borderColor = '#374151';
        (e.currentTarget as HTMLDivElement).style.transform = 'scale(1)';
      }}
    >
      <ShapePreview type={type} fill={colors.fill} stroke={colors.stroke} />
      <span style={{ fontSize: 10, color: '#9CA3AF' }}>色{colorIndex + 1}</span>
    </div>
  );
}

interface ElementsPanelProps {
  onDragStart: (e: React.DragEvent, type: ElementType, colorIndex: number) => void;
  isMobileDrawer?: boolean;
  onClose?: () => void;
}

export default function ElementsPanel({ onDragStart, isMobileDrawer, onClose }: ElementsPanelProps) {
  const types: ElementType[] = ['rectangle', 'circle', 'triangle', 'speechBubble', 'dialogBox'];

  const content = (
    <div
      style={{
        width: 200,
        backgroundColor: '#2D2D44',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        borderLeft: '1px solid #1F2937',
      }}
    >
      <div
        style={{
          padding: 12,
          borderBottom: '1px solid #1F2937',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <h3 style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>元素面板</h3>
        {isMobileDrawer && onClose && (
          <button
            onClick={onClose}
            style={{
              width: 24,
              height: 24,
              borderRadius: 4,
              backgroundColor: '#4B5563',
              color: '#fff',
              fontSize: 14,
              padding: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            ×
          </button>
        )}
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: 12 }}>
        {types.map((type) => (
          <div key={type} style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 8, fontWeight: 500 }}>
              {typeLabels[type]}
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: 8,
              }}
            >
              {[0, 1, 2, 3, 4].map((ci) => (
                <ElementItem key={ci} type={type} colorIndex={ci} onDragStart={onDragStart} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  if (isMobileDrawer) {
    return content;
  }

  return content;
}
