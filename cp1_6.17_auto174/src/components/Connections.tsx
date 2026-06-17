import React, { useMemo } from 'react';
import { MindMapNode, getLevelColor, getLineWidth } from '../types';

interface ConnectionsProps {
  nodes: MindMapNode[];
  nodesMap: Record<string, MindMapNode>;
}

export const Connections: React.FC<ConnectionsProps> = ({ nodes, nodesMap }) => {
  const paths = useMemo(() => {
    const result: { d: string; color: string; width: number; id: string }[] = [];

    nodes.forEach((node) => {
      if (node.parentId && nodesMap[node.parentId]) {
        const parent = nodesMap[node.parentId];

        const startX = parent.x;
        const startY = parent.y + parent.height / 2;
        const endX = node.x;
        const endY = node.y - node.height / 2;

        const controlY1 = startY + Math.abs(endY - startY) * 0.5;
        const controlY2 = endY - Math.abs(endY - startY) * 0.5;

        const d = `M ${startX} ${startY} C ${startX} ${controlY1}, ${endX} ${controlY2}, ${endX} ${endY}`;

        result.push({
          d,
          color: getLevelColor(parent.level),
          width: getLineWidth(parent.level),
          id: `${parent.id}-${node.id}`,
        });
      }
    });

    return result;
  }, [nodes, nodesMap]);

  return (
    <svg
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        overflow: 'visible',
      }}
    >
      <defs>
        <filter id="smooth">
          <feGaussianBlur stdDeviation="0.5" />
        </filter>
      </defs>
      {paths.map((path) => (
        <path
          key={path.id}
          d={path.d}
          stroke={path.color}
          strokeWidth={path.width}
          fill="none"
          strokeLinecap="round"
          filter="url(#smooth)"
          style={{
            transition: 'd 0.2s ease-out',
          }}
        />
      ))}
    </svg>
  );
};
