import React, { useMemo } from 'react';
import { GraphEdge as GraphEdgeType, GraphNode as GraphNodeType } from '../types';

interface GraphEdgeProps {
  edge: GraphEdgeType;
  sourceNode: GraphNodeType;
  targetNode: GraphNodeType;
  isHighlighted?: boolean;
}

const GraphEdge: React.FC<GraphEdgeProps> = ({
  edge,
  sourceNode,
  targetNode,
  isHighlighted = false,
}) => {
  const pathData = useMemo(() => {
    const x1 = sourceNode.x || 0;
    const y1 = sourceNode.y || 0;
    const x2 = targetNode.x || 0;
    const y2 = targetNode.y || 0;

    const dx = x2 - x1;
    const dy = y2 - y1;
    const distance = Math.sqrt(dx * dx + dy * dy);

    const sourceRadius = sourceNode.size || 30;
    const targetRadius = targetNode.size || 30;

    if (distance === 0) return '';

    const sx = x1 + (dx / distance) * sourceRadius;
    const sy = y1 + (dy / distance) * sourceRadius;
    const tx = x2 - (dx / distance) * targetRadius;
    const ty = y2 - (dy / distance) * targetRadius;

    const midX = (sx + tx) / 2;
    const midY = (sy + ty) / 2;

    const perpX = -dy / distance * 30;
    const perpY = dx / distance * 30;

    const ctrlX = midX + perpX;
    const ctrlY = midY + perpY;

    return `M ${sx} ${sy} Q ${ctrlX} ${ctrlY} ${tx} ${ty}`;
  }, [sourceNode, targetNode]);

  const opacity = useMemo(() => {
    const x1 = sourceNode.x || 0;
    const y1 = sourceNode.y || 0;
    const x2 = targetNode.x || 0;
    const y2 = targetNode.y || 0;
    const dx = x2 - x1;
    const dy = y2 - y1;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const baseOpacity = edge.type === 'manual' ? 0.7 : 0.4;
    const distanceFactor = Math.max(0.2, 1 - distance / 800);
    return baseOpacity * distanceFactor;
  }, [sourceNode, targetNode, edge.type]);

  const strokeColor = edge.type === 'manual' ? '#f59e0b' : '#60a5fa';
  const strokeWidth = isHighlighted ? 2.5 : 1.5;
  const strokeDasharray = edge.type === 'manual' ? '6,4' : 'none';

  if (!pathData) return null;

  return (
    <path
      d={pathData}
      fill="none"
      stroke={strokeColor}
      strokeWidth={strokeWidth}
      opacity={opacity}
      strokeDasharray={strokeDasharray}
      style={{
        transition: 'opacity 0.3s ease, stroke-width 0.2s ease',
        pointerEvents: 'none',
      }}
    />
  );
};

export default GraphEdge;
