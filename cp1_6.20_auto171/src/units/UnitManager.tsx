import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Unit, HexCoord } from '../types';
import { hexToPixel, HEX_SIZE } from '../utils/hexUtils';

interface UnitManagerProps {
  units: Unit[];
  selectedUnitId: string | null;
  onUnitClick: (unit: Unit) => void;
  hexSize?: number;
  offsetX?: number;
  offsetY?: number;
}

const unitIcons: Record<string, string> = {
  infantry: '⚔️',
  archer: '🏹',
  knight: '🐴',
};

export const UnitManager: React.FC<UnitManagerProps> = ({
  units,
  selectedUnitId,
  onUnitClick,
  hexSize = HEX_SIZE,
  offsetX = 0,
  offsetY = 0,
}) => {
  const [hoveredUnit, setHoveredUnit] = useState<string | null>(null);

  return (
    <>
      {units.map((unit) => {
        const pixel = hexToPixel(unit.position, hexSize);
        const isSelected = unit.id === selectedUnitId;
        const isHovered = hoveredUnit === unit.id;
        const healthPercent = (unit.currentHealth / unit.maxHealth) * 100;
        const canAct = !unit.hasMoved || !unit.hasAttacked;

        return (
          <g
            key={unit.id}
            transform={`translate(${pixel.x + offsetX}, ${pixel.y + offsetY})`}
            onClick={(e) => {
              e.stopPropagation();
              onUnitClick(unit);
            }}
            onMouseEnter={() => setHoveredUnit(unit.id)}
            onMouseLeave={() => setHoveredUnit(null)}
            style={{ cursor: 'pointer' }}
          >
            <motion.rect
              x={-24}
              y={-24}
              width={48}
              height={48}
              rx={8}
              ry={8}
              fill={isSelected ? '#f1c40f' : unit.color}
              opacity={canAct ? 1 : 0.5}
              initial={{ scale: 0, y: -50 }}
              animate={{
                scale: isSelected ? 1.1 : 1,
                y: 0,
                fill: isSelected ? '#f1c40f' : unit.color,
              }}
              transition={{
                type: 'spring',
                stiffness: 300,
                damping: 20,
                duration: 0.2,
              }}
              whileHover={{ scale: 1.05 }}
            />
            
            <text
              x={0}
              y={4}
              textAnchor="middle"
              fontSize={20}
              style={{ pointerEvents: 'none', userSelect: 'none' }}
            >
              {unitIcons[unit.type]}
            </text>

            <rect
              x={-20}
              y={-30}
              width={40}
              height={4}
              rx={2}
              fill="#333"
            />
            <motion.rect
              x={-20}
              y={-30}
              width={40 * (healthPercent / 100)}
              height={4}
              rx={2}
              fill={healthPercent > 50 ? '#2ecc71' : healthPercent > 25 ? '#f39c12' : '#e74c3c'}
              initial={false}
              animate={{ width: 40 * (healthPercent / 100) }}
              transition={{ duration: 0.3 }}
            />

            <circle
              cx={20}
              cy={-20}
              r={6}
              fill={unit.team === 'player' ? '#3498db' : '#e74c3c'}
              stroke="#fff"
              strokeWidth={1}
            />

            <AnimatePresence>
              {isHovered && (
                <motion.g
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  <rect
                    x={-60}
                    y={-90}
                    width={120}
                    height={55}
                    rx={6}
                    fill="#16213e"
                    stroke="#0f3460"
                    strokeWidth={1}
                  />
                  <text x={0} y={-72} textAnchor="middle" fill="#e0e0e0" fontSize={11} fontWeight="bold">
                    {unit.name}
                  </text>
                  <text x={-50} y={-55} fill="#e0e0e0" fontSize={9}>
                    攻击: {unit.attack}
                  </text>
                  <text x={-50} y={-43} fill="#e0e0e0" fontSize={9}>
                    防御: {unit.defense}
                  </text>
                  <text x={10} y={-55} fill="#e0e0e0" fontSize={9}>
                    移动: {unit.movement}
                  </text>
                  <text x={10} y={-43} fill="#e0e0e0" fontSize={9}>
                    射程: {unit.range}
                  </text>
                </motion.g>
              )}
            </AnimatePresence>
          </g>
        );
      })}
    </>
  );
};
