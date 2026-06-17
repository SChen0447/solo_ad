import React from 'react';
import { Connection, ConnectionTypeConfig } from '@/model/CardModel';
import type { InspirationCard } from '@/model/CardModel';
import { useMindStore } from '@/store/useMindStore';

interface ConnectionLineProps {
  connection: Connection;
  cards: InspirationCard[];
}

function ConnectionLine({ connection, cards }: ConnectionLineProps) {
  const setEditingConnectionId = useMindStore((s) => s.setEditingConnectionId);

  const source = cards.find((c) => c.id === connection.sourceId);
  const target = cards.find((c) => c.id === connection.targetId);

  if (!source || !target) return null;

  const sourcePoint = { x: source.x + 110, y: source.y + 50 };
  const targetPoint = { x: target.x + 110, y: target.y + 50 };

  const dx = targetPoint.x - sourcePoint.x;
  const offset = Math.abs(dx) * 0.5;

  const cp1 = { x: sourcePoint.x + offset, y: sourcePoint.y };
  const cp2 = { x: targetPoint.x - offset, y: targetPoint.y };

  const pathD = `M ${sourcePoint.x} ${sourcePoint.y} C ${cp1.x} ${cp1.y} ${cp2.x} ${cp2.y} ${targetPoint.x} ${targetPoint.y}`;

  const color = ConnectionTypeConfig[connection.type].color;

  const midX = (sourcePoint.x + 3 * cp1.x + 3 * cp2.x + targetPoint.x) / 8;
  const midY = (sourcePoint.y + 3 * cp1.y + 3 * cp2.y + targetPoint.y) / 8;

  const arrowSize = 8;
  const angle = Math.atan2(targetPoint.y - cp2.y, targetPoint.x - cp2.x);
  const arrowP1 = {
    x: targetPoint.x - arrowSize * Math.cos(angle - Math.PI / 6),
    y: targetPoint.y - arrowSize * Math.sin(angle - Math.PI / 6),
  };
  const arrowP2 = {
    x: targetPoint.x - arrowSize * Math.cos(angle + Math.PI / 6),
    y: targetPoint.y - arrowSize * Math.sin(angle + Math.PI / 6),
  };

  return (
    <g>
      <defs>
        <filter id={`glow-${connection.id}`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation={3} result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <path
        d={pathD}
        stroke={color}
        strokeWidth={2}
        fill="none"
        strokeDasharray="8 4"
        className="animate-flow-dash"
        filter={`url(#glow-${connection.id})`}
        pointerEvents="stroke"
        onDoubleClick={() => setEditingConnectionId(connection.id)}
      />

      <polygon
        points={`${targetPoint.x},${targetPoint.y} ${arrowP1.x},${arrowP1.y} ${arrowP2.x},${arrowP2.y}`}
        fill={color}
      />

      {connection.label && (
        <g>
          <rect
            x={midX - connection.label.length * 4 - 4}
            y={midY - 8}
            width={connection.label.length * 8 + 8}
            height={16}
            rx={4}
            fill={color}
            opacity={0.2}
          />
          <text
            x={midX}
            y={midY + 1}
            textAnchor="middle"
            dominantBaseline="middle"
            className="text-xs"
            fill="white"
            opacity={0.8}
          >
            {connection.label}
          </text>
        </g>
      )}
    </g>
  );
}

export default React.memo(ConnectionLine);
