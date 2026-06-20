import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Tile, HexCoord, Unit, DamagePopup } from '../types';
import {
  hexToPixel,
  hexCorners,
  HEX_SIZE,
  HEX_SIZE_SMALL,
  GRID_WIDTH,
  GRID_HEIGHT,
} from '../utils/hexUtils';
import { UnitManager } from '../units/UnitManager';

interface GameMapProps {
  tiles: Tile[];
  units: Unit[];
  selectedUnitId: string | null;
  moveRange: HexCoord[];
  attackRange: HexCoord[];
  pathPreview: HexCoord[];
  damagePopups: DamagePopup[];
  onTileClick: (coord: HexCoord) => void;
  onUnitClick: (unit: Unit) => void;
  isSmallScreen?: boolean;
  attackingTarget?: HexCoord | null;
}

const terrainColors: Record<string, string> = {
  grass: '#3a5a3a',
  rock: '#5d5d5d',
  tree: '#2d5a2d',
  base_player: '#3498db',
  base_ai: '#e74c3c',
};

const terrainIcons: Record<string, string> = {
  rock: '🪨',
  tree: '🌲',
  base_player: '🏰',
  base_ai: '🏰',
};

export const GameMap: React.FC<GameMapProps> = ({
  tiles,
  units,
  selectedUnitId,
  moveRange,
  attackRange,
  pathPreview,
  damagePopups,
  onTileClick,
  onUnitClick,
  isSmallScreen = false,
  attackingTarget,
}) => {
  const hexSize = isSmallScreen ? HEX_SIZE_SMALL : HEX_SIZE;

  const mapDimensions = useMemo(() => {
    const lastTile = tiles[tiles.length - 1];
    const pixel = hexToPixel(lastTile.coord, hexSize);
    return {
      width: pixel.x + hexSize * 2,
      height: pixel.y + hexSize * 2,
    };
  }, [tiles, hexSize]);

  const moveRangeSet = useMemo(() => {
    const set = new Set<string>();
    moveRange.forEach(c => set.add(`${c.q},${c.r}`));
    return set;
  }, [moveRange]);

  const attackRangeSet = useMemo(() => {
    const set = new Set<string>();
    attackRange.forEach(c => set.add(`${c.q},${c.r}`));
    return set;
  }, [attackRange]);

  const offsetX = hexSize * 1.5;
  const offsetY = hexSize * 1.5;

  return (
    <svg
      width="100%"
      height="100%"
      viewBox={`0 0 ${mapDimensions.width} ${mapDimensions.height}`}
      style={{ backgroundColor: '#1a1a2e' }}
    >
      <defs>
        <filter id="glow">
          <feGaussianBlur stdDeviation="3" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <pattern id="greenDashed" patternUnits="userSpaceOnUse" width="6" height="6">
          <circle cx="3" cy="3" r="2" fill="#2ecc71" />
        </pattern>
      </defs>

      <g transform={`translate(${offsetX}, ${offsetY})`}>
        {tiles.map((tile) => {
          const pixel = hexToPixel(tile.coord, hexSize);
          const key = `${tile.coord.q},${tile.coord.r}`;
          const inMoveRange = moveRangeSet.has(key);
          const inAttackRange = attackRangeSet.has(key);
          const isAttacking = attackingTarget && 
            attackingTarget.q === tile.coord.q && 
            attackingTarget.r === tile.coord.r;

          return (
            <g
              key={key}
              transform={`translate(${pixel.x}, ${pixel.y})`}
              onClick={() => onTileClick(tile.coord)}
              style={{ cursor: 'pointer' }}
            >
              <motion.polygon
                points={hexCorners({ x: 0, y: 0 }, hexSize * 0.95)}
                fill={terrainColors[tile.terrain]}
                stroke="#2a4a2a"
                strokeWidth={1}
                whileHover={{ scale: 1.02 }}
                transition={{ duration: 0.1 }}
              />

              {inMoveRange && !inAttackRange && (
                <motion.polygon
                  points={hexCorners({ x: 0, y: 0 }, hexSize * 0.9)}
                  fill="#4a9eff"
                  fillOpacity={0.3}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                />
              )}

              {inAttackRange && (
                <motion.polygon
                  points={hexCorners({ x: 0, y: 0 }, hexSize * 0.9)}
                  fill="#e74c3c"
                  fillOpacity={0.4}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                />
              )}

              {isAttacking && (
                <motion.polygon
                  points={hexCorners({ x: 0, y: 0 }, hexSize * 0.9)}
                  fill="#e74c3c"
                  fillOpacity={0.8}
                  animate={{
                    opacity: [0.4, 0.8, 0.4],
                    scale: [1, 1.1, 1],
                  }}
                  transition={{
                    duration: 0.3,
                    repeat: Infinity,
                  }}
                  filter="url(#glow)"
                />
              )}

              {terrainIcons[tile.terrain] && (
                <text
                  x={0}
                  y={hexSize * 0.15}
                  textAnchor="middle"
                  fontSize={hexSize * 0.4}
                  style={{ pointerEvents: 'none', userSelect: 'none' }}
                >
                  {terrainIcons[tile.terrain]}
                </text>
              )}
            </g>
          );
        })}

        {pathPreview.length > 1 && (
          <g>
            {pathPreview.slice(1).map((coord, index) => {
              const prev = pathPreview[index];
              const from = hexToPixel(prev, hexSize);
              const to = hexToPixel(coord, hexSize);
              return (
                <line
                  key={`path-${index}`}
                  x1={from.x}
                  y1={from.y}
                  x2={to.x}
                  y2={to.y}
                  stroke="#2ecc71"
                  strokeWidth={3}
                  strokeDasharray="6 3"
                  strokeLinecap="round"
                />
              );
            })}
          </g>
        )}

        <UnitManager
          units={units}
          selectedUnitId={selectedUnitId}
          onUnitClick={onUnitClick}
          hexSize={hexSize}
          offsetX={0}
          offsetY={0}
        />

        <AnimatePresence>
          {damagePopups.map((popup) => {
            const pixel = hexToPixel(popup.position, hexSize);
            return (
              <motion.g
                key={popup.id}
                transform={`translate(${pixel.x}, ${pixel.y})`}
                initial={{ opacity: 1, y: 0 }}
                animate={{ opacity: 0, y: -40 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5 }}
              >
                <text
                  x={0}
                  y={0}
                  textAnchor="middle"
                  fontSize={24}
                  fontWeight="bold"
                  fill="#e74c3c"
                  stroke="#000"
                  strokeWidth={2}
                  style={{ userSelect: 'none' }}
                >
                  -{popup.damage}
                </text>
              </motion.g>
            );
          })}
        </AnimatePresence>
      </g>
    </svg>
  );
};
