import React from 'react';
import { useGameStore } from '../PlayerState';
import { Plant, GRID_COLS, GRID_ROWS, PLANT_LEVELS } from '../types';
import { GameEngine } from '../GameEngine';

interface GameCanvasProps {
  engine: GameEngine | null;
}

const PlantEntity = React.memo(({ plant, cellSize, engine }: { plant: Plant; cellSize: number; engine: GameEngine | null }) => {
  const px = plant.gridX * cellSize + cellSize / 2;
  const py = plant.gridY * cellSize + cellSize / 2;
  const size = cellSize * 0.7;
  const levelSize = size * (0.7 + plant.level * 0.15);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (engine && plant.level < 3) {
      const store = useGameStore.getState();
      const cost = PLANT_LEVELS[(plant.level + 1) as 1 | 2 | 3].cost;
      if (store.sunlight >= cost) {
        if (store.upgradePlant(plant.id)) {
          engine.createUpgradeParticles(plant, cellSize);
        }
      }
    }
  };

  return (
    <div
      className="plant-entity"
      onClick={handleClick}
      style={{
        position: 'absolute',
        left: px,
        top: py,
        width: levelSize,
        height: levelSize,
        transform: 'translate(-50%, -50%)',
        cursor: 'pointer',
        zIndex: 10,
      }}
    >
      <div className={`plant-sprite level-${plant.level}`} style={{
        width: '100%',
        height: '100%',
        position: 'relative',
      }}>
        <div className="plant-stem" />
        <div className="plant-leaf leaf-left" />
        <div className="plant-leaf leaf-right" />
        {plant.level >= 2 && <div className="plant-leaf leaf-top" />}
        {plant.level >= 3 && <div className="plant-glow" />}
        {plant.upgrading && <div className="upgrade-burst" />}
      </div>
    </div>
  );
});
PlantEntity.displayName = 'PlantEntity';

const EnemyEntity = React.memo(({ enemy, cellSize, now }: { enemy: any; cellSize: number; now: number }) => {
  const scale = enemy.variant === 'fast' ? 0.5 : 1;
  const size = cellSize * 0.6 * scale;
  const isFlash = enemy.hitFlashTime > 0 && (now - enemy.hitFlashTime) < 0.1;
  const isFading = enemy.hitFlashTime > 0 && (now - enemy.hitFlashTime) >= 0.1 && (now - enemy.hitFlashTime) < 0.4;

  const hpRatio = enemy.hp / enemy.maxHp;
  const barWidth = cellSize * 0.8 * scale;

  let bodyColor = '#ef4444';
  if (enemy.variant === 'shield') bodyColor = '#3b82f6';
  if (enemy.variant === 'fast') bodyColor = '#fbbf24';

  return (
    <div
      style={{
        position: 'absolute',
        left: enemy.x,
        top: enemy.y,
        transform: 'translate(-50%, -50%)',
        zIndex: 15,
        pointerEvents: 'none',
        opacity: enemy.dead ? 0 : (isFading ? 0.6 : 1),
      }}
    >
      <div style={{
        width: size,
        height: size,
        backgroundColor: isFlash ? '#ffffff' : bodyColor,
        borderRadius: enemy.variant === 'fast' ? '50%' : '4px',
        position: 'relative',
        transition: 'opacity 0.3s ease',
        boxShadow: isFlash ? '0 0 8px #fff' : 'none',
      }}>
        {enemy.shieldActive && enemy.variant === 'shield' && (
          <div style={{
            position: 'absolute',
            inset: -4,
            border: '2px solid #93c5fd',
            borderRadius: '50%',
            opacity: 0.8,
          }} />
        )}
      </div>
      {hpRatio < 1 && !enemy.dead && (
        <div style={{
          position: 'absolute',
          top: -6 * scale,
          left: '50%',
          transform: 'translateX(-50%)',
          width: barWidth,
          height: 3,
          backgroundColor: '#333',
          borderRadius: 2,
          overflow: 'hidden',
        }}>
          <div style={{
            width: `${hpRatio * 100}%`,
            height: '100%',
            background: 'linear-gradient(90deg, #cc0000, #ff3333)',
            transition: 'width 0.2s ease',
          }} />
        </div>
      )}
    </div>
  );
});
EnemyEntity.displayName = 'EnemyEntity';

const ProjectileEntity = React.memo(({ proj, now }: { proj: any; now: number }) => {
  const elapsed = now - proj.startTime;
  const t = Math.min(elapsed / proj.duration, 1);
  const x = proj.startX + (proj.targetX - proj.startX) * t;
  const y = proj.startY + (proj.targetY - proj.startY) * t;

  if (t >= 1) return null;

  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width: 8,
        height: 8,
        backgroundColor: '#4ade80',
        borderRadius: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 20,
        pointerEvents: 'none',
        boxShadow: '0 0 4px #4ade80',
      }}
    />
  );
});
ProjectileEntity.displayName = 'ProjectileEntity';

export const GameCanvas: React.FC<GameCanvasProps> = React.memo(({ engine }) => {
  const cellSize = useGameStore(s => s.cellSize);
  const plants = useGameStore(s => s.plants);
  const enemies = useGameStore(s => s.enemies);
  const projectiles = useGameStore(s => s.projectiles);
  const particles = useGameStore(s => s.particles);
  const upgradeParticles = useGameStore(s => s.upgradeParticles);
  const selectedCard = useGameStore(s => s.selectedCard);
  const phase = useGameStore(s => s.phase);
  const [, forceUpdate] = React.useReducer(x => x + 1, 0);
  const nowRef = React.useRef(performance.now() / 1000);

  React.useEffect(() => {
    const interval = setInterval(() => {
      nowRef.current = performance.now() / 1000;
      if (phase === 'playing' || phase === 'waveTransition') {
        forceUpdate();
      }
    }, 1000 / 60);
    return () => clearInterval(interval);
  }, [phase]);

  const canvasWidth = GRID_COLS * cellSize;
  const canvasHeight = GRID_ROWS * cellSize;
  const now = nowRef.current;

  const handleGridClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!selectedCard || phase !== 'playing') return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const gridX = Math.floor(x / cellSize);
    const gridY = Math.floor(y / cellSize);
    useGameStore.getState().placePlant(gridX, gridY);
  };

  const gridCells = React.useMemo(() => {
    const cells = [];
    for (let row = 0; row < GRID_ROWS; row++) {
      for (let col = 0; col < GRID_COLS; col++) {
        cells.push(
          <div
            key={`${col}-${row}`}
            className="grid-cell"
            style={{
              width: cellSize,
              height: cellSize,
            }}
          />
        );
      }
    }
    return cells;
  }, [cellSize]);

  return (
    <div
      className="game-canvas"
      style={{
        width: canvasWidth,
        height: canvasHeight,
        position: 'relative',
        overflow: 'hidden',
      }}
      onClick={handleGridClick}
    >
      <div className="grid-background" style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${GRID_COLS}, ${cellSize}px)`,
        gridTemplateRows: `repeat(${GRID_ROWS}, ${cellSize}px)`,
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
      }}>
        {gridCells}
      </div>

      {plants.map(plant => (
        <PlantEntity key={plant.id} plant={plant} cellSize={cellSize} engine={engine} />
      ))}

      {enemies.map(enemy => (
        <EnemyEntity key={enemy.id} enemy={enemy} cellSize={cellSize} now={now} />
      ))}

      {projectiles.map(proj => (
        <ProjectileEntity key={proj.id} proj={proj} now={now} />
      ))}

      {particles.map(p => {
        const elapsed = now - p.createdAt;
        const t = Math.min(elapsed / p.duration, 1);
        if (t >= 1) return null;
        const px = p.x + p.vx * elapsed;
        const py = p.y + p.vy * elapsed;
        return (
          <div key={p.id} style={{
            position: 'absolute',
            left: px,
            top: py,
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            transform: 'translate(-50%, -50%)',
            opacity: 1 - t,
            zIndex: 25,
            pointerEvents: 'none',
          }} />
        );
      })}

      {upgradeParticles.map(p => {
        const elapsed = now - p.createdAt;
        const t = Math.min(elapsed / p.duration, 1);
        if (t >= 1) return null;
        const px = p.x + p.vx * elapsed;
        const py = p.y + p.vy * elapsed;
        return (
          <div key={p.id} style={{
            position: 'absolute',
            left: px,
            top: py,
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            borderRadius: '50%',
            transform: `translate(-50%, -50%) scale(${1 + t * 0.5})`,
            opacity: 1 - t,
            zIndex: 25,
            pointerEvents: 'none',
          }} />
        );
      })}
    </div>
  );
});
GameCanvas.displayName = 'GameCanvas';
