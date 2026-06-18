import React, { useState, useMemo } from 'react';
import { useGameStore, GRID_SIZE } from '../state/gameStore';
import { generatePath, type Point } from '../battle/EnemyManager';

interface GridProps {
  cellSize: number;
  offsetX: number;
  offsetY: number;
}

export const Grid: React.FC<GridProps> = ({ cellSize, offsetX, offsetY }) => {
  const { placingTower, towers, placeTower, selectTower } = useGameStore();
  const [hoverCell, setHoverCell] = useState<{ x: number; y: number } | null>(null);

  const width = GRID_SIZE * cellSize;
  const height = GRID_SIZE * cellSize;

  const path: Point[] = useMemo(
    () => generatePath(offsetX, offsetY, cellSize),
    [offsetX, offsetY, cellSize]
  );

  const pathGridKeys = useMemo(() => {
    const set = new Set<string>();
    for (const p of path) {
      const gx = Math.floor((p.x - offsetX) / cellSize);
      const gy = Math.floor((p.y - offsetY) / cellSize);
      set.add(`${gx},${gy}`);
    }
    return set;
  }, [path, offsetX, offsetY, cellSize]);

  const handleCellClick = (e: React.MouseEvent<SVGRectElement>, gx: number, gy: number) => {
    e.stopPropagation();
    if (placingTower) {
      placeTower(gx, gy, cellSize, offsetX, offsetY);
    } else {
      const existing = towers.find(t => t.gridX === gx && t.gridY === gy);
      if (existing) {
        selectTower(existing.id);
      } else {
        selectTower(null);
      }
    }
  };

  const handleMouseEnter = (gx: number, gy: number) => {
    setHoverCell({ x: gx, y: gy });
  };

  const handleMouseLeave = () => {
    setHoverCell(null);
  };

  const cells: React.ReactElement[] = [];
  for (let gy = 0; gy < GRID_SIZE; gy++) {
    for (let gx = 0; gx < GRID_SIZE; gx++) {
      const isPath = pathGridKeys.has(`${gx},${gy}`);
      const occupied = towers.some(t => t.gridX === gx && t.gridY === gy);
      const isHovered = hoverCell && hoverCell.x === gx && hoverCell.y === gy;
      const canPlace = placingTower && !isPath && !occupied;

      cells.push(
        <rect
          key={`cell-${gx}-${gy}`}
          x={offsetX + gx * cellSize}
          y={offsetY + gy * cellSize}
          width={cellSize}
          height={cellSize}
          fill={isPath ? '#4a5568' : '#34495e'}
          stroke="#bdc3c7"
          strokeWidth={1}
          style={{ cursor: placingTower ? (canPlace ? 'pointer' : 'not-allowed') : 'pointer' }}
          onClick={(e) => handleCellClick(e, gx, gy)}
          onMouseEnter={() => handleMouseEnter(gx, gy)}
          onMouseLeave={handleMouseLeave}
        />
      );

      if (isHovered && canPlace) {
        cells.push(
          <rect
            key={`hover-${gx}-${gy}`}
            x={offsetX + gx * cellSize}
            y={offsetY + gy * cellSize}
            width={cellSize}
            height={cellSize}
            fill="#3498db"
            fillOpacity={0.3}
            pointerEvents="none"
          />
        );
      }
    }
  }

  const pathD = useMemo(() => {
    if (path.length < 2) return '';
    let d = `M ${path[0].x} ${path[0].y}`;
    for (let i = 1; i < path.length; i++) {
      d += ` L ${path[i].x} ${path[i].y}`;
    }
    return d;
  }, [path]);

  return (
    <g>
      {cells}
      <path
        d={pathD}
        fill="none"
        stroke="#718096"
        strokeWidth={cellSize * 0.6}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.4}
        pointerEvents="none"
      />
      <circle cx={path[0].x} cy={path[0].y} r={12} fill="#27ae60" opacity={0.9} pointerEvents="none" />
      <text x={path[0].x} y={path[0].y + 4} textAnchor="middle" fill="#fff" fontSize={10} fontWeight="bold" pointerEvents="none">入</text>
      <circle cx={path[path.length - 1].x} cy={path[path.length - 1].y} r={12} fill="#e74c3c" opacity={0.9} pointerEvents="none" />
      <text x={path[path.length - 1].x} y={path[path.length - 1].y + 4} textAnchor="middle" fill="#fff" fontSize={10} fontWeight="bold" pointerEvents="none">出</text>
    </g>
  );
};
