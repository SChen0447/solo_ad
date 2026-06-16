import React, { useMemo } from 'react';
import { GraphNode as GraphNodeType } from '../types';

interface GraphNodeProps {
  node: GraphNodeType;
  isSelected: boolean;
  isHovered: boolean;
  onMouseEnter: (id: string) => void;
  onMouseLeave: (id: string) => void;
  onClick: (id: string) => void;
  onDoubleClick: (id: string) => void;
  onDragStart: (id: string, event: React.MouseEvent) => void;
}

const getNodeColor = (depth: number): string => {
  const colors = [
    '#60a5fa',
    '#3b82f6',
    '#2563eb',
    '#1d4ed8',
    '#1e40af',
    '#1e3a8a',
    '#172554',
  ];
  return colors[Math.min(depth, colors.length - 1)];
};

const getTextColor = (depth: number): string => {
  return depth <= 2 ? '#1e1e2e' : '#ffffff';
};

const GraphNode: React.FC<GraphNodeProps> = ({
  node,
  isSelected,
  isHovered,
  onMouseEnter,
  onMouseLeave,
  onClick,
  onDoubleClick,
  onDragStart,
}) => {
  const radius = node.size || 30;
  const color = getNodeColor(node.depth);
  const textColor = getTextColor(node.depth);
  const scale = isHovered ? 1.1 : 1;
  const glowColor = color;

  const displayLabel = useMemo(() => {
    const maxChars = Math.max(6, Math.floor(radius / 4));
    if (node.label.length <= maxChars) return node.label;
    return node.label.slice(0, maxChars - 1) + '…';
  }, [node.label, radius]);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDragStart(node.id, e);
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClick(node.id);
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDoubleClick(node.id);
  };

  const handleMouseEnter = () => {
    onMouseEnter(node.id);
  };

  const handleMouseLeave = () => {
    onMouseLeave(node.id);
  };

  const childCount = node.childIds.length;
  const hasChildren = childCount > 0;
  const isCollapsed = node.collapsed;

  return (
    <g
      transform={`translate(${node.x}, ${node.y}) scale(${scale})`}
      style={{
        cursor: 'pointer',
        transition: 'transform 0.2s ease-out',
      }}
      onMouseDown={handleMouseDown}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {isHovered && (
        <circle
          r={radius + 8}
          fill="none"
          stroke={glowColor}
          strokeWidth={3}
          opacity={0.5}
          style={{
            filter: `drop-shadow(0 0 8px ${glowColor})`,
          }}
        />
      )}
      {isSelected && (
        <circle
          r={radius + 5}
          fill="none"
          stroke="#fbbf24"
          strokeWidth={2}
          strokeDasharray="5,3"
        />
      )}
      <circle
        r={radius}
        fill={color}
        stroke={isSelected ? '#fbbf24' : 'rgba(255,255,255,0.2)'}
        strokeWidth={2}
      />
      {node.type === 'code-block' && (
        <text
          y={-radius / 4}
          textAnchor="middle"
          fill={textColor}
          fontSize={radius * 0.6}
          fontWeight="bold"
        >
          {'</>'}
        </text>
      )}
      <text
        y={node.type === 'code-block' ? radius / 3 : radius / 6}
        textAnchor="middle"
        fill={textColor}
        fontSize={radius * 0.35}
        fontWeight={500}
        style={{
          pointerEvents: 'none',
          userSelect: 'none',
        }}
      >
        {displayLabel}
      </text>
      {hasChildren && (
        <g transform={`translate(${radius * 0.7}, ${-radius * 0.7})`}>
          <circle
            r={10}
            fill={isCollapsed ? '#f59e0b' : '#10b981'}
            stroke="#fff"
            strokeWidth={1.5}
          />
          <text
            y={3.5}
            textAnchor="middle"
            fill="#fff"
            fontSize={9}
            fontWeight="bold"
          >
            {isCollapsed ? '+' : childCount}
          </text>
        </g>
      )}
      {node.tags && node.tags.length > 0 && (
        <g transform={`translate(${-radius * 0.7}, ${-radius * 0.7})`}>
          {node.tags.slice(0, 3).map((tag, index) => (
            <circle
              key={index}
              cx={index * 7}
              cy={0}
              r={5}
              fill={getTagColor(tag)}
              stroke="#fff"
              strokeWidth={1}
            />
          ))}
        </g>
      )}
    </g>
  );
};

function getTagColor(tag: string): string {
  const colors = [
    '#ef4444',
    '#f59e0b',
    '#10b981',
    '#3b82f6',
    '#8b5cf6',
    '#ec4899',
    '#06b6d4',
    '#84cc16',
  ];
  let hash = 0;
  for (let i = 0; i < tag.length; i++) {
    hash = tag.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

export default GraphNode;
