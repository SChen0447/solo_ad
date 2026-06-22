import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import {
  Enemy,
  Bullet,
  EnemyConfig,
  PathPoint,
  updateAll,
  renderAll,
  generatePathSamples,
  getPathPosition,
} from './EnemyEngine';

interface EditorCanvasProps {
  enemyConfigs: EnemyConfig[];
  selectedEnemyId: string | null;
  selectedPointIndex: number | null;
  onSelectEnemy: (id: string | null) => void;
  onSelectPoint: (enemyId: string, pointIndex: number | null) => void;
  onMovePoint: (enemyId: string, pointIndex: number, x: number, y: number) => void;
  onAddPoint: (enemyId: string, x: number, y: number) => void;
  isPlaying: boolean;
  onPlayingChange?: (playing: boolean) => void;
}

const EditorCanvas: React.FC<EditorCanvasProps> = ({
  enemyConfigs,
  selectedEnemyId,
  selectedPointIndex,
  onSelectEnemy,
  onSelectPoint,
  onMovePoint,
  onAddPoint,
  isPlaying,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const enemiesRef = useRef<Map<string, Enemy>>(new Map());
  const bulletsRef = useRef<Bullet[]>([]);
  const animationRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const [fps, setFps] = useState<number>(60);
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragEnemyId, setDragEnemyId] = useState<string | null>(null);
  const [dragPointIndex, setDragPointIndex] = useState<number | null>(null);

  const fpsRef = useRef(0);
  const frameCountRef = useRef(0);
  const fpsTimeRef = useRef(0);
  const timeRef = useRef(0);

  const previewProgressRef = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    for (const config of enemyConfigs) {
      const existing = enemiesRef.current.get(config.id);
      if (existing) {
        existing.updateConfig(config);
      } else {
        const enemy = new Enemy(config);
        enemiesRef.current.set(config.id, enemy);
      }
      if (!previewProgressRef.current.has(config.id)) {
        previewProgressRef.current.set(config.id, 0);
      }
    }

    const currentIds = new Set(enemyConfigs.map(c => c.id));
    for (const id of enemiesRef.current.keys()) {
      if (!currentIds.has(id)) {
        enemiesRef.current.delete(id);
        previewProgressRef.current.delete(id);
      }
    }
  }, [enemyConfigs]);

  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setCanvasSize({ width: rect.width, height: rect.height });
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const pathSamplesMap = useMemo(() => {
    const map = new Map<string, { x: number; y: number }[]>();
    for (const config of enemyConfigs) {
      if (config.active || config.id === selectedEnemyId) {
        map.set(config.id, generatePathSamples(config.pathPoints, 80));
      }
    }
    return map;
  }, [enemyConfigs, selectedEnemyId]);

  const drawFrame = useCallback((ctx: CanvasRenderingContext2D, time: number) => {
    const { width, height } = canvasSize;

    ctx.fillStyle = '#0d1117';
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = 'rgba(88, 166, 255, 0.08)';
    ctx.lineWidth = 1;
    const gridSize = 40;
    for (let x = 0; x < width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    const enemies: Enemy[] = [];
    for (const config of enemyConfigs) {
      const enemy = enemiesRef.current.get(config.id);
      if (enemy) {
        enemies.push(enemy);
      }
    }

    if (isPlaying) {
      const result = updateAll(enemies, bulletsRef.current, 1 / 60, width, height, 500);
      bulletsRef.current = result.bullets;
    }

    renderAll(ctx, enemies, bulletsRef.current, selectedEnemyId, time, pathSamplesMap);

    if (!isPlaying) {
      for (const config of enemyConfigs) {
        if (!config.active && config.id !== selectedEnemyId) continue;
        const samples = pathSamplesMap.get(config.id);
        if (!samples || samples.length < 2) continue;

        let progress = previewProgressRef.current.get(config.id) || 0;
        progress += 0.005;
        if (progress > 1) progress = 0;
        previewProgressRef.current.set(config.id, progress);

        const pos = getPathPosition(config.pathPoints, progress);
        ctx.save();
        ctx.fillStyle = '#58a6ff';
        ctx.shadowColor = '#58a6ff';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    if (selectedEnemyId) {
      const config = enemyConfigs.find(c => c.id === selectedEnemyId);
      if (config) {
        for (let i = 0; i < config.pathPoints.length; i++) {
          const point = config.pathPoints[i];
          const isSelected = i === selectedPointIndex;

          ctx.save();
          ctx.fillStyle = isSelected ? 'rgba(88, 166, 255, 0.7)' : 'rgba(88, 166, 255, 0.3)';
          ctx.strokeStyle = isSelected ? '#ffffff' : '#58a6ff';
          ctx.lineWidth = isSelected ? 3 : 2;
          ctx.beginPath();
          ctx.arc(point.x, point.y, 8, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          ctx.restore();

          if (isSelected) {
            ctx.save();
            ctx.fillStyle = '#ffffff';
            ctx.font = '10px sans-serif';
            ctx.fillText(`#${i + 1}`, point.x + 12, point.y - 8);
            ctx.restore();
          }
        }
      }
    }

    let fpsColor = '#00ff00';
    if (fps < 30) fpsColor = '#ff0000';
    else if (fps < 55) fpsColor = '#ffff00';

    ctx.save();
    ctx.fillStyle = fpsColor;
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`${Math.round(fps)} FPS`, width - 12, height - 12);
    ctx.restore();

    ctx.save();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.font = '11px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`子弹: ${bulletsRef.current.length}/500`, width - 12, height - 30);
    ctx.restore();
  }, [canvasSize, enemyConfigs, selectedEnemyId, selectedPointIndex, isPlaying, pathSamplesMap, fps]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const animate = (time: number) => {
      timeRef.current = time / 1000;

      frameCountRef.current++;
      if (time - fpsTimeRef.current >= 1000) {
        fpsRef.current = frameCountRef.current;
        setFps(fpsRef.current);
        frameCountRef.current = 0;
        fpsTimeRef.current = time;
      }

      drawFrame(ctx, timeRef.current);
      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationRef.current);
    };
  }, [drawFrame]);

  const getMousePos = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const pos = getMousePos(e);

    if (selectedEnemyId && selectedPointIndex !== null) {
      setIsDragging(true);
      setDragEnemyId(selectedEnemyId);
      setDragPointIndex(selectedPointIndex);
      return;
    }

    if (selectedEnemyId) {
      const config = enemyConfigs.find(c => c.id === selectedEnemyId);
      if (config) {
        for (let i = 0; i < config.pathPoints.length; i++) {
          const point = config.pathPoints[i];
          const dist = Math.sqrt((pos.x - point.x) ** 2 + (pos.y - point.y) ** 2);
          if (dist < 12) {
            onSelectPoint(selectedEnemyId, i);
            setIsDragging(true);
            setDragEnemyId(selectedEnemyId);
            setDragPointIndex(i);
            return;
          }
        }
      }
    }

    let foundEnemy: string | null = null;
    for (const config of enemyConfigs) {
      if (!config.active) continue;
      const enemy = enemiesRef.current.get(config.id);
      if (!enemy) continue;
      const dist = Math.sqrt((pos.x - enemy.x) ** 2 + (pos.y - enemy.y) ** 2);
      if (dist < 20) {
        foundEnemy = config.id;
        break;
      }
    }

    if (foundEnemy) {
      onSelectEnemy(foundEnemy);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging || !dragEnemyId || dragPointIndex === null) return;

    const pos = getMousePos(e);
    onMovePoint(dragEnemyId, dragPointIndex, pos.x, pos.y);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setDragEnemyId(null);
    setDragPointIndex(null);
  };

  const handleDoubleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!selectedEnemyId) return;

    const config = enemyConfigs.find(c => c.id === selectedEnemyId);
    if (!config || config.pathPoints.length >= 20) return;

    const pos = getMousePos(e);
    onAddPoint(selectedEnemyId, pos.x, pos.y);
  };

  return (
    <div ref={containerRef} style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
      <canvas
        ref={canvasRef}
        width={canvasSize.width}
        height={canvasSize.height}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onDoubleClick={handleDoubleClick}
        style={{
          display: 'block',
          width: '100%',
          height: '100%',
          cursor: isDragging ? 'grabbing' : 'crosshair',
        }}
      />
    </div>
  );
};

export default EditorCanvas;
