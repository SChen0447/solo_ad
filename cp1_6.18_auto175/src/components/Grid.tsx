import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Coordinate,
  ObstacleType,
  CharacterColor,
  Obstacle,
  Character,
  GRID_WIDTH,
  GRID_HEIGHT,
  BallisticResult,
} from '../types';
import { useDataStore } from '../dataStore';
import { calculateBallistic, playBounceSound } from '../ballisticEngine';

interface GridProps {
  onShoot: () => void;
}

const OBSTACLE_COLORS: Record<ObstacleType, string> = {
  rock: '#8B6914',
  low_wall: '#808080',
  high_wall: '#404040',
};

const CHARACTER_COLORS: Record<CharacterColor, string> = {
  red: '#ef4444',
  blue: '#3b82f6',
  yellow: '#eab308',
};

export const Grid: React.FC<GridProps> = ({ onShoot }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [cellSize, setCellSize] = useState(40);
  const [hoveredCell, setHoveredCell] = useState<Coordinate | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [ballisticResult, setBallisticResult] = useState<BallisticResult | null>(null);
  const [showTrajectory, setShowTrajectory] = useState(false);
  const [hitEffects, setHitEffects] = useState<Map<string, number>>(new Map());

  const obstacles = useDataStore((s) => s.obstacles);
  const characters = useDataStore((s) => s.characters);
  const selectedTool = useDataStore((s) => s.selectedTool);
  const activeCharacterId = useDataStore((s) => s.activeCharacterId);
  const addObstacle = useDataStore((s) => s.addObstacle);
  const addCharacter = useDataStore((s) => s.addCharacter);
  const setActiveCharacter = useDataStore((s) => s.setActiveCharacter);
  const damageObstacle = useDataStore((s) => s.damageObstacle);
  const setCharacterHit = useDataStore((s) => s.setCharacterHit);
  const addShootLog = useDataStore((s) => s.addShootLog);
  const clearObstacleFlags = useDataStore((s) => s.clearObstacleFlags);
  const clearCharacterFlags = useDataStore((s) => s.clearCharacterFlags);
  const getCharacterAt = useDataStore((s) => s.getCharacterAt);
  const isPositionOccupied = useDataStore((s) => s.isPositionOccupied);

  const activeCharacter = characters.find((c) => c.id === activeCharacterId) || null;

  useEffect(() => {
    const handleResize = () => {
      if (!containerRef.current) return;
      const container = containerRef.current;
      const padding = 40;
      const maxWidth = container.clientWidth - padding;
      const maxHeight = container.clientHeight - padding;
      const size = Math.min(
        Math.floor(maxWidth / GRID_WIDTH),
        Math.floor(maxHeight / GRID_HEIGHT)
      );
      setCellSize(Math.max(20, size));
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const t1 = setTimeout(() => clearObstacleFlags(), 350);
    const t2 = setTimeout(() => clearCharacterFlags(), 350);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [obstacles.length, characters.length, clearObstacleFlags, clearCharacterFlags]);

  const getCellFromEvent = useCallback(
    (e: React.MouseEvent): Coordinate | null => {
      if (!containerRef.current) return null;
      const rect = containerRef.current.getBoundingClientRect();
      const gridWidth = GRID_WIDTH * cellSize;
      const gridHeight = GRID_HEIGHT * cellSize;
      const offsetX = (rect.width - gridWidth) / 2;
      const offsetY = (rect.height - gridHeight) / 2;
      const x = Math.floor((e.clientX - rect.left - offsetX) / cellSize);
      const y = Math.floor((e.clientY - rect.top - offsetY) / cellSize);
      if (x < 0 || x >= GRID_WIDTH || y < 0 || y >= GRID_HEIGHT) return null;
      return { x, y };
    },
    [cellSize]
  );

  const placeItemAt = useCallback(
    (pos: Coordinate) => {
      if (!selectedTool) return;
      if (isPositionOccupied(pos)) return;

      if (selectedTool === 'rock' || selectedTool === 'low_wall' || selectedTool === 'high_wall') {
        addObstacle(selectedTool as ObstacleType, pos);
      } else if (selectedTool === 'red' || selectedTool === 'blue' || selectedTool === 'yellow') {
        addCharacter(selectedTool as CharacterColor, pos);
      }
    },
    [selectedTool, addObstacle, addCharacter, isPositionOccupied]
  );

  const handleMouseDown = (e: React.MouseEvent) => {
    const pos = getCellFromEvent(e);
    if (!pos) return;

    if (activeCharacter) {
      return;
    }

    const charAtPos = getCharacterAt(pos);
    if (charAtPos && !selectedTool) {
      setActiveCharacter(charAtPos.id);
      return;
    }

    if (selectedTool) {
      setIsDragging(true);
      placeItemAt(pos);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const pos = getCellFromEvent(e);
    setHoveredCell(pos);

    if (isDragging && pos && selectedTool) {
      placeItemAt(pos);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleClick = (e: React.MouseEvent) => {
    if (!activeCharacter) return;

    const pos = getCellFromEvent(e);
    if (!pos) return;

    const charAtPos = getCharacterAt(pos);
    if (charAtPos && charAtPos.id === activeCharacterId) {
      setActiveCharacter(null);
      return;
    }

    const startTime = performance.now();
    const result = calculateBallistic({
      start: activeCharacter.position,
      target: pos,
      obstacles,
      characters,
      shooterId: activeCharacter.id,
      maxBounces: activeCharacter.bounceCount,
    });
    const calcTime = performance.now() - startTime;
    console.log(`Ballistic calculation took ${calcTime.toFixed(2)}ms`);

    setBallisticResult(result);
    setShowTrajectory(true);
    onShoot();

    result.bouncePoints.forEach((_, idx) => {
      setTimeout(() => playBounceSound(), idx * 80);
    });

    if (result.hitObstacle && result.hitObstacle.type === 'high_wall') {
      damageObstacle(result.hitObstacle.id);
    }

    if (result.hitTarget) {
      setCharacterHit(result.hitTarget.id, true);
      setHitEffects((prev) => {
        const next = new Map(prev);
        next.set(result.hitTarget!.id, Date.now());
        return next;
      });
      setTimeout(() => {
        setCharacterHit(result.hitTarget!.id, false);
      }, 600);
      setTimeout(() => {
        setHitEffects((prev) => {
          const next = new Map(prev);
          next.delete(result.hitTarget!.id);
          return next;
        });
      }, 1000);
    }

    const reasonMap: Record<string, string> = {
      target_hit: `命中目标 (${result.hitTarget?.color})`,
      obstacle_blocked: '被障碍物阻挡',
      out_of_bounds: '超出地图边界',
      no_bounce_left: '反弹次数耗尽',
      reached_end: '到达轨迹终点',
    };

    const endPoint =
      result.path.length > 0
        ? result.path[result.path.length - 1]
        : activeCharacter.position;

    addShootLog({
      startPoint: activeCharacter.position,
      endPoint,
      obstaclesPassed: result.obstaclesPassed.map((o) => ({
        type: o.type,
        position: o.position,
      })),
      hitResult: reasonMap[result.reason] || result.reason,
      bounceUsed: result.bouncePoints.length,
      bouncePoints: result.bouncePoints,
    });

    setTimeout(() => setShowTrajectory(false), 2000);
  };

  const gridWidth = GRID_WIDTH * cellSize;
  const gridHeight = GRID_HEIGHT * cellSize;

  const renderObstacle = (obstacle: Obstacle) => {
    const baseColor = OBSTACLE_COLORS[obstacle.type];
    const displayColor = obstacle.isDamaged ? '#2a2a2a' : baseColor;
    return (
      <div
        key={obstacle.id}
        className={`absolute flex items-center justify-center ${
          obstacle.isNew ? 'animate-pop' : ''
        }`}
        style={{
          left: obstacle.position.x * cellSize + 2,
          top: obstacle.position.y * cellSize + 2,
          width: cellSize - 4,
          height: cellSize - 4,
          backgroundColor: displayColor,
          borderRadius: obstacle.type === 'rock' ? '4px' : '2px',
          boxShadow: '2px 2px 6px rgba(0,0,0,0.5), inset 1px 1px