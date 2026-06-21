import React, { memo } from 'react';
import { Relationship, StoryNode } from '@/types';

interface RelationshipLineProps {
  relationship: Relationship;
  nodes: StoryNode[];
  onClick: () => void;
}

const RelationshipLine: React.FC<RelationshipLineProps> = memo(
  ({ relationship, nodes, onClick }) => {
    const fromNode = nodes.find((n) => n.id === relationship.fromNodeId);
    const toNode = nodes.find((n) => n.id === relationship.toNodeId);

    if (!fromNode || !toNode) return null;

    const strokeColor = relationship.type === 'causal' ? '#E53E3E' : '#3182CE';
    const x1 = fromNode.positionX;
    const y1 = fromNode.positionY;
    const x2 = toNode.positionX;
    const y2 = toNode.positionY;

    const midX = (x1 + x2) / 2;
    const midY = Math.min(y1, y2) - 40;

    const pathD = `M ${x1} ${y1} Q ${midX} ${midY} ${x2} ${y2}`;

    return (
      <g onClick={onClick} style={{ cursor: 'pointer' }}>
        <path
          d={pathD}
          fill="none"
          stroke={strokeColor}
          strokeWidth="2"
          strokeOpacity="0.8"
          strokeDasharray={relationship.type === 'parallel' ? '5,5' : 'none'}
        />
        <circle cx={x2} cy={y2} r="4" fill={strokeColor} opacity="0.6" />
      </g>
    );
  }
);

RelationshipLine.displayName = 'RelationshipLine';

export default RelationshipLine;
