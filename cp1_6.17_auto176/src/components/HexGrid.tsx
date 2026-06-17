import React, { useMemo, useRef, useEffect, useState } from 'react';
import {
  TerrainHex,
  Unit,
  HexCoord,
  MovePath,
  TERRAIN_COLORS,
  FACTION_COLORS,
  UNIT_COLORS,
  AttackEvent,
} from '../types';
import { hexToPixel, getHexCorners, pixelToHex, coordKey, hexDistance } from '../utils/hexUtils';

interface HexGridProps {
  terrainData: TerrainHex[];
  unitData: Unit[];
  hexSize: number;
  mapWidth: number;
  mapHeight: number;
  selectedUnitId: string | null;
  movePaths: MovePath[];
  pathWaypoints: HexCoord[];
  isSimulating: boolean;
  currentTurnAttacks: AttackEvent[];
  highlightedUnitId: string | null;
  destroyedUnits: Unit[];
  onHexClick: (q: number, r: number) => void;
  onHexRightClick: (q: number, r: number) => void;
  onUnitClick: (unitId: string) => void;
}

const HexGrid: React.FC<HexGridProps> = ({
  terrainData,
  unitData,
  hexSize,
  mapWidth,
  mapHeight,
  selectedUnitId,
  movePaths,
  pathWaypoints,
  isSimulating,
  currentTurnAttacks,
  highlightedUnitId,
  destroyedUnits,
  onHexClick,
  onHexRightClick,
  onUnitClick,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [shakeOffset, setShakeOffset] = useState(0);
  const [flashAttacks, setFlashAttacks] = useState<Set<string>>(new Set());

  const gridOffset = useMemo(() => {
    const leftMost = Math.min(...terrainData.map((h) => hexToPixel(h.q, h.r, hexSize).x));
    const topMost = Math.min(...terrainData.map((h) => hexToPixel(h.q, h.r, hexSize).y));
    const rightMost = Math.max(...terrainData.map((h) => hexToPixel(h.q, h.r, hexSize).x));
    const bottomMost = Math.max(...terrainData.map((h) => hexToPixel(h.q, h.r, hexSize).y));

    const width = rightMost - leftMost + hexSize * 2;
    const height = bottomMost - topMost + hexSize * 2;

    return {
      offsetX: -leftMost + hexSize,
      offsetY: -topMost + hexSize,
      width,
      height,
    };
  }, [terrainData, hexSize]);

  useEffect(() => {
    if (currentTurnAttacks.length > 0) {
      const attackKeys = new Set(currentTurnAttacks.map((a) => `${a.attackerId}-${a.targetId}`));
      setFlashAttacks(attackKeys);
      setShakeOffset(2);

      const shakeTimer = setTimeout(() => setShakeOffset(0), 100);
      const flashTimer = setTimeout(() => setFlashAttacks(new Set()), 300);

      return () => {
        clearTimeout(shakeTimer);
        clearTimeout(flashTimer);
      };
    }
  }, [currentTurnAttacks]);

  const handleSvgClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (isSimulating) return;
    if (!svgRef.current) return;

    const rect = svgRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left - gridOffset.offsetX;
    const y = e.clientY - rect.top - gridOffset.offsetY;

    const { q, r } = pixelToHex(x, y, hexSize);
    const key = coordKey(q, r);

    const hexExists = terrainData.some((h) => coordKey(h.q, h.r) === key);
    if (hexExists) {
      onHexClick(q, r);
    }
  };

  const handleSvgRightClick = (e: React.MouseEvent<SVGSVGElement>) => {
    e.preventDefault();
    if (isSimulating) return;
    if (!svgRef.current) return;

    const rect = svgRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left - gridOffset.offsetX;
    const y = e.clientY - rect.top - gridOffset.offsetY;

    const { q, r } = pixelToHex(x, y, hexSize);
    const key = coordKey(q, r);

    const hexExists = terrainData.some((h) => coordKey(h.q, h.r) === key);
    if (hexExists) {
      onHexRightClick(q, r);
    }
  };

  const handleUnitClick = (e: React.MouseEvent, unitId: string) => {
    e.stopPropagation();
    if (isSimulating) return;
    onUnitClick(unitId);
  };

  const renderUnitShape = (unit: Unit, cx: number, cy: number, isDestroyed: boolean = false) => {
    const color = isDestroyed ? '#666666' : UNIT_COLORS[unit.type];
    const opacity = isDestroyed ? 0.4 : 1;
    const isSelected = unit.id === selectedUnitId;
    const isHighlighted = unit.id === highlightedUnitId;
    const factionColor = FACTION_COLORS[unit.faction];

    let shape = null;
    const size = unit.type === 'infantry' ? 12 : unit.type === 'tank' ? 16 : 18;

    if (unit.type === 'infantry') {
      shape = <circle cx={cx} cy={cy} r={size} fill={color} stroke={factionColor} strokeWidth={2} opacity={opacity} />;
    } else if (unit.type === 'tank') {
      shape = (
        <rect
          x={cx - size}
          y={cy - size}
          width={size * 2}
          height={size * 2}
          fill={color}
          stroke={factionColor}
          strokeWidth={2}
          opacity={opacity}
        />
      );
    } else {
      const h = size * 1.2;
      shape = (
        <polygon
          points={`${cx},${cy - h} ${cx - size},${cy + size * 0.7} ${cx + size},${cy + size * 0.7}`}
          fill={color}
          stroke={factionColor}
          strokeWidth={2}
          opacity={opacity}
        />
      );
    }

    const hpPercent = unit.hp / unit.maxHp;
    const hpBarWidth = 24;
    const hpBarHeight = 4;
    const hpBarY = cy - size - 8;

    return (
      <g
        key={unit.id}
        onClick={(e) => handleUnitClick(e, unit.id)}
        style={{ cursor: isSimulating ? 'default' : 'pointer' }}
        className={isHighlighted ? 'unit-highlight' : ''}
      >
        {isSelected && (
          <circle
            cx={cx}
            cy={cy}
            r={size + 6}
            fill="none"
            stroke="#FFD600"
            strokeWidth={2}
            strokeDasharray="4,4"
          />
        )}
        {shape}
        {!isDestroyed && (
          <>
            <rect
              x={cx - hpBarWidth / 2}
              y={hpBarY}
              width={hpBarWidth}
              height={hpBarHeight}
              fill="#333"
              rx={1}
            />
            <rect
              x={cx - hpBarWidth / 2}
              y={hpBarY}
              width={hpBarWidth * hpPercent}
              height={hpBarHeight}
              fill={hpPercent > 0.5 ? '#4CAF50' : hpPercent > 0.25 ? '#FF9800' : '#F44336'}
              rx={1}
            />
          </>
        )}
      </g>
    );
  };

  const renderPaths = () => {
    const paths: JSX.Element[] = [];

    for (const path of movePaths) {
      const unit = unitData.find((u) => u.id === path.unitId);
      if (!unit || path.waypoints.length === 0) continue;

      const factionColor = FACTION_COLORS[unit.faction];
      const points: { x: number; y: number }[] = [];

      const startPixel = hexToPixel(unit.q, unit.r, hexSize);
      points.push({ x: startPixel.x, y: startPixel.y });

      for (const wp of path.waypoints) {
        const pixel = hexToPixel(wp.q, wp.r, hexSize);
        points.push({ x: pixel.x, y: pixel.y });
      }

      const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

      paths.push(
        <path
          key={`path-${path.unitId}`}
          d={pathD}
          fill="none"
          stroke={factionColor}
          strokeWidth={2}
          strokeDasharray="6,4"
          opacity={0.8}
        />
      );

      for (let i = 0; i < path.waypoints.length; i++) {
        const wp = path.waypoints[i];
        const pixel = hexToPixel(wp.q, wp.r, hexSize);
        paths.push(
          <circle
            key={`wp-${path.unitId}-${i}`}
            cx={pixel.x}
            cy={pixel.y}
            r={4}
            fill={factionColor}
          />
        );
      }
    }

    if (pathWaypoints.length > 0 && selectedUnitId) {
      const selectedUnit = unitData.find((u) => u.id === selectedUnitId);
      if (selectedUnit) {
        const factionColor = FACTION_COLORS[selectedUnit.faction];
        const points: { x: number; y: number }[] = [];

        const startPixel = hexToPixel(selectedUnit.q, selectedUnit.r, hexSize);
        points.push({ x: startPixel.x, y: startPixel.y });

        for (const wp of pathWaypoints) {
          const pixel = hexToPixel(wp.q, wp.r, hexSize);
          points.push({ x: pixel.x, y: pixel.y });
        }

        const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

        paths.push(
          <path
            key="current-path"
            d={pathD}
            fill="none"
            stroke={factionColor}
            strokeWidth={3}
            strokeDasharray="8,4"
            opacity={0.9}
          />
        );

        for (let i = 0; i < pathWaypoints.length; i++) {
          const wp = pathWaypoints[i];
          const pixel = hexToPixel(wp.q, wp.r, hexSize);
          paths.push(
            <circle
              key={`current-wp-${i}`}
              cx={pixel.x}
              cy={pixel.y}
              r={5}
              fill="#FFD600"
              stroke={factionColor}
              strokeWidth={2}
            />
          );
        }
      }
    }

    return paths;
  };

  const renderAttackFlashes = () => {
    const flashes: JSX.Element[] = [];

    for (const attack of currentTurnAttacks) {
      const key = `${attack.attackerId}-${attack.targetId}`;
      if (!flashAttacks.has(key)) continue;

      const attacker = unitData.find((u) => u.id === attack.attackerId);
      const target = unitData.find((u) => u.id === attack.targetId);
      if (!attacker || !target) continue;

      const attackerPixel = hexToPixel(attacker.q, attacker.r, hexSize);
      const targetPixel = hexToPixel(target.q, target.r, hexSize);

      flashes.push(
        <line
          key={`flash-${key}`}
          x1={attackerPixel.x}
          y1={attackerPixel.y}
          x2={targetPixel.x}
          y2={targetPixel.y}
          stroke="#FFFFFF"
          strokeWidth={3}
          opacity={0.9}
        />
      );

      flashes.push(
        <circle
          key={`flash-target-${key}`}
          cx={targetPixel.x}
          cy={targetPixel.y}
          r={15}
          fill="none"
          stroke="#FFFFFF"
          strokeWidth={2}
          opacity={0.8}
        />
      );
    }

    return flashes;
  };

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        width: '100%',
        height: '100%',
        overflow: 'auto',
        transform: `translateX(${shakeOffset}px)`,
        transition: 'transform 0.05s ease-out',
      }}
    >
      <svg
        ref={svgRef}
        width={gridOffset.width + hexSize * 2}
        height={gridOffset.height + hexSize * 2}
        onClick={handleSvgClick}
        onContextMenu={handleSvgRightClick}
        style={{
          transform: `translate(${gridOffset.offsetX}px, ${gridOffset.offsetY}px)`,
          transformOrigin: '0 0',
        }}
      >
        <defs>
          <filter id="glow">
            <feGaussianBlur stdDeviation="2" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {terrainData.map((hex) => {
          const { x, y } = hexToPixel(hex.q, hex.r, hexSize);
          const corners = getHexCorners(x, y, hexSize);
          const isPathWaypoint = pathWaypoints.some((wp) => wp.q === hex.q && wp.r === hex.r);

          return (
            <polygon
              key={`hex-${hex.q}-${hex.r}`}
              points={corners}
              fill={TERRAIN_COLORS[hex.terrain]}
              stroke={isPathWaypoint ? '#FFD600' : '#1A2A1A'}
              strokeWidth={isPathWaypoint ? 3 : 1}
              style={{ cursor: isSimulating ? 'default' : 'pointer' }}
            />
          );
        })}

        {renderPaths()}

        {destroyedUnits.map((unit) => {
          const { x, y } = hexToPixel(unit.q, unit.r, hexSize);
          return <React.Fragment key={`destroyed-${unit.id}`}>{renderUnitShape(unit, x, y, true)}</React.Fragment>;
        })}

        {unitData
          .filter((u) => !u.isDestroyed)
          .map((unit) => {
            const { x, y } = hexToPixel(unit.q, unit.r, hexSize);
            return <React.Fragment key={`unit-${unit.id}`}>{renderUnitShape(unit, x, y)}</React.Fragment>;
          })}

        {renderAttackFlashes()}
      </svg>
    </div>
  );
};

export default HexGrid;
