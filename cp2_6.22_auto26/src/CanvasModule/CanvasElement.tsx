import React, { useCallback, useRef, useEffect, useState } from 'react';
import { X } from 'lucide-react';
import type { CanvasElement } from '@/types';

interface CanvasElementProps {
  element: CanvasElement;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onTextChange: (id: string, text: string) => void;
  zoom: number;
}

function buildSmoothPath(points: { x: number; y: number }[]): string {
  if (points.length < 2) return '';
  if (points.length === 2) {
    return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`;
  }
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length - 1; i++) {
    const cp1x = points[i].x;
    const cp1y = points[i].y;
    const cp2x = (points[i].x + points[i + 1].x) / 2;
    const cp2y = (points[i].y + points[i + 1].y) / 2;
    d += ` Q ${cp1x} ${cp1y} ${cp2x} ${cp2y}`;
  }
  const last = points[points.length - 1];
  d += ` L ${last.x} ${last.y}`;
  return d;
}

const CanvasElementComponent: React.FC<CanvasElementProps> = ({
  element,
  isSelected,
  onSelect,
  onDelete,
  onTextChange,
  zoom,
}) => {
  const [editing, setEditing] = useState(false);
  const textRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (editing && textRef.current) {
      textRef.current.focus();
      textRef.current.select();
    }
  }, [editing]);

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onSelect(element.id);
    },
    [element.id, onSelect]
  );

  const handleDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (element.type === 'sticky') {
        setEditing(true);
      }
    },
    [element.type]
  );

  const handleTextBlur = useCallback(() => {
    setEditing(false);
    if (textRef.current) {
      onTextChange(element.id, textRef.current.value);
    }
  }, [element.id, onTextChange]);

  const handleTextKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        setEditing(false);
      }
      e.stopPropagation();
    },
    []
  );

  const handleDeleteClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onDelete(element.id);
    },
    [element.id, onDelete]
  );

  if (element.type === 'path') {
    return (
      <g
        onClick={handleClick}
        style={{ cursor: 'pointer' }}
      >
        <path
          d={buildSmoothPath(element.points)}
          transform={`translate(${element.x}, ${element.y})`}
          fill="none"
          stroke={element.stroke}
          strokeWidth={element.strokeWidth}
          opacity={element.opacity}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {isSelected && (
          <path
            d={buildSmoothPath(element.points)}
            transform={`translate(${element.x}, ${element.y})`}
            fill="none"
            stroke={element.stroke}
            strokeWidth={element.strokeWidth + 4 / zoom}
            opacity={0.2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
      </g>
    );
  }

  if (element.type === 'sticky') {
    return (
      <g
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        style={{ cursor: editing ? 'text' : 'move' }}
      >
        <rect
          x={element.x}
          y={element.y}
          width={element.width}
          height={element.height}
          rx={8}
          ry={8}
          fill={element.fill}
          stroke={element.stroke}
          strokeWidth={element.strokeWidth}
          filter={isSelected ? 'url(#dropShadow)' : undefined}
        />
        {isSelected && (
          <rect
            x={element.x}
            y={element.y}
            width={element.width}
            height={element.height}
            rx={8}
            ry={8}
            fill="none"
            stroke="#6366F1"
            strokeWidth={2 / zoom}
            strokeDasharray="4 2"
          />
        )}
        {editing ? (
          <foreignObject
            x={element.x + 12}
            y={element.y + 12}
            width={element.width - 24}
            height={element.height - 24}
          >
            <textarea
              ref={textRef}
              defaultValue={element.text}
              onBlur={handleTextBlur}
              onKeyDown={handleTextKeyDown}
              style={{
                width: '100%',
                height: '100%',
                border: 'none',
                background: 'transparent',
                resize: 'none',
                outline: 'none',
                fontSize: 14,
                fontFamily: 'inherit',
                color: '#1E293B',
                lineHeight: 1.5,
              }}
            />
          </foreignObject>
        ) : (
          <foreignObject
            x={element.x + 12}
            y={element.y + 12}
            width={element.width - 24}
            height={element.height - 24}
          >
            <div
              style={{
                fontSize: 14,
                color: '#1E293B',
                lineHeight: 1.5,
                overflow: 'hidden',
                wordBreak: 'break-word',
                userSelect: 'none',
              }}
            >
              {element.text}
            </div>
          </foreignObject>
        )}
        {isSelected && (
          <g onClick={handleDeleteClick} style={{ cursor: 'pointer' }}>
            <circle
              cx={element.x + element.width - 4}
              cy={element.y + 4}
              r={9 / zoom}
              fill="#EF4444"
              opacity={0.9}
            />
            <line
              x1={element.x + element.width - 7 / zoom}
              y1={element.y + 1 / zoom}
              x2={element.x + element.width - 1 / zoom}
              y2={element.y + 7 / zoom}
              stroke="white"
              strokeWidth={1.5 / zoom}
              strokeLinecap="round"
            />
            <line
              x1={element.x + element.width - 1 / zoom}
              y1={element.y + 1 / zoom}
              x2={element.x + element.width - 7 / zoom}
              y2={element.y + 7 / zoom}
              stroke="white"
              strokeWidth={1.5 / zoom}
              strokeLinecap="round"
            />
          </g>
        )}
      </g>
    );
  }

  if (element.type === 'rectangle') {
    return (
      <g
        onClick={handleClick}
        style={{ cursor: 'move' }}
      >
        <rect
          x={element.x}
          y={element.y}
          width={element.width}
          height={element.height}
          rx={4}
          ry={4}
          fill={element.fill}
          stroke={element.stroke}
          strokeWidth={element.strokeWidth}
          filter={isSelected ? 'url(#dropShadow)' : undefined}
        />
        {isSelected && (
          <rect
            x={element.x}
            y={element.y}
            width={element.width}
            height={element.height}
            rx={4}
            ry={4}
            fill="none"
            stroke="#3B82F6"
            strokeWidth={2 / zoom}
            strokeDasharray="4 2"
          />
        )}
        {isSelected && (
          <g onClick={handleDeleteClick} style={{ cursor: 'pointer' }}>
            <circle
              cx={element.x + element.width - 4}
              cy={element.y + 4}
              r={9 / zoom}
              fill="#EF4444"
              opacity={0.9}
            />
            <line
              x1={element.x + element.width - 7 / zoom}
              y1={element.y + 1 / zoom}
              x2={element.x + element.width - 1 / zoom}
              y2={element.y + 7 / zoom}
              stroke="white"
              strokeWidth={1.5 / zoom}
              strokeLinecap="round"
            />
            <line
              x1={element.x + element.width - 1 / zoom}
              y1={element.y + 1 / zoom}
              x2={element.x + element.width - 7 / zoom}
              y2={element.y + 7 / zoom}
              stroke="white"
              strokeWidth={1.5 / zoom}
              strokeLinecap="round"
            />
          </g>
        )}
      </g>
    );
  }

  return null;
};

export default React.memo(CanvasElementComponent);
