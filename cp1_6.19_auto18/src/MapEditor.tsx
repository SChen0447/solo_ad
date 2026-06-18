import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useGameStore, TRAP_CONFIG } from './store';
import type { Trap, TrapType } from './types';

const GRID_SIZE = 16;
const TILE_SIZE = 40;
const CANVAS_SIZE = GRID_SIZE * TILE_SIZE;

const TrapParamPanel: React.FC<{ trap: Trap; onClose: () => void }> = ({ trap, onClose }) => {
  const [triggerDelay, setTriggerDelay] = useState(trap.triggerDelay);
  const [duration, setDuration] = useState(trap.duration);
  const updateTrapParams = useGameStore((s) => s.updateTrapParams);

  const handleConfirm = () => {
    updateTrapParams(trap.id, triggerDelay, duration);
    onClose();
  };

  const panelLeft = trap.x * TILE_SIZE;
  const panelTop = Math.max(0, trap.y * TILE_SIZE - 88);

  return (
    <div
      className="trap-param-panel"
      style={{
        position: 'absolute',
        left: `${panelLeft}px`,
        top: `${panelTop}px`,
        width: `${TILE_SIZE * 3}px`,
        height: '80px',
        background: '#1a1a2ecc',
        border: '1px solid #4a4a8a',
        borderRadius: '6px',
        padding: '8px 10px',
        zIndex: 100,
        backdropFilter: 'blur(4px)',
      }}
    >
      <div style={{ fontSize: '11px', color: '#ccc', marginBottom: '4px' }}>
        触发延迟: <span style={{ color: TRAP_CONFIG[trap.type].color }}>{triggerDelay.toFixed(1)}</span> 回合
      </div>
      <input
        type="range"
        min="0"
        max="3"
        step="0.5"
        value={triggerDelay}
        onChange={(e) => setTriggerDelay(parseFloat(e.target.value))}
        style={{ width: '100%', marginBottom: '6px', accentColor: TRAP_CONFIG[trap.type].color }}
      />
      <div style={{ fontSize: '11px', color: '#ccc', marginBottom: '4px' }}>
        持续时间: <span style={{ color: TRAP_CONFIG[trap.type].color }}>{duration}</span> 回合
      </div>
      <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
        <input
          type="range"
          min="1"
          max="5"
          step="1"
          value={duration}
          onChange={(e) => setDuration(parseInt(e.target.value))}
          style={{ flex: 1, accentColor: TRAP_CONFIG[trap.type].color }}
        />
        <button
          onClick={handleConfirm}
          style={{
            padding: '3px 8px',
            fontSize: '11px',
            background: '#8b5cf6',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => ((e.target as HTMLButtonElement).style.background = '#22d3ee')}
          onMouseLeave={(e) => ((e.target as HTMLButtonElement).style.background = '#8b5cf6')}
        >
          确认
        </button>
      </div>
    </div>
  );
};

export const MapEditor: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hoverTile, setHoverTile] = useState<{ x: number; y: number } | null>(null);

  const phase = useGameStore((s) => s.phase);
  const selectedTool = useGameStore((s) => s.selectedTool);
  const selectedTrapType = useGameStore((s) => s.selectedTrapType);
  const traps = useGameStore((s) => s.traps);
  const enemies = useGameStore((s) => s.enemies);
  const path = useGameStore((s) => s.path);
  const editingTrapId = useGameStore((s) => s.editingTrapId);
  const activeEffects = useGameStore((s) => s.activeEffects);
  const placeTrap = useGameStore((s) => s.placeTrap);
  const removeTrap = useGameStore((s) => s.removeTrap);
  const togglePathPoint = useGameStore((s) => s.togglePathPoint);
  const setEditingTrapId = useGameStore((s) => s.setEditingTrapId);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#0a0a1a';
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    ctx.strokeStyle = '#1e3a5f';
    ctx.lineWidth = 1;
    for (let i = 0; i <= GRID_SIZE; i++) {
      ctx.beginPath();
      ctx.moveTo(i * TILE_SIZE, 0);
      ctx.lineTo(i * TILE_SIZE, CANVAS_SIZE);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i * TILE_SIZE);
      ctx.lineTo(CANVAS_SIZE, i * TILE_SIZE);
      ctx.stroke();
    }

    if (path.length > 1) {
      ctx.strokeStyle = '#00ff00';
      ctx.lineWidth = 3;
      ctx.setLineDash([6, 4]);
      ctx.globalAlpha = 0.7;
      ctx.beginPath();
      ctx.moveTo(path[0].x * TILE_SIZE + TILE_SIZE / 2, path[0].y * TILE_SIZE + TILE_SIZE / 2);
      for (let i = 1; i < path.length; i++) {
        ctx.lineTo(path[i].x * TILE_SIZE + TILE_SIZE / 2, path[i].y * TILE_SIZE + TILE_SIZE / 2);
      }
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;

      path.forEach((p, idx) => {
        ctx.fillStyle = idx === 0 ? '#00ff88' : idx === path.length - 1 ? '#ff4444' : '#00ff00';
        ctx.beginPath();
        ctx.arc(p.x * TILE_SIZE + TILE_SIZE / 2, p.y * TILE_SIZE + TILE_SIZE / 2, 4, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    const now = Date.now();
    traps.forEach((trap) => {
      const config = TRAP_CONFIG[trap.type];
      const cx = trap.x * TILE_SIZE + TILE_SIZE / 2;
      const cy = trap.y * TILE_SIZE + TILE_SIZE / 2;

      const pulsePhase = (now / 1000) % 2;
      const pulseScale = 1 + Math.sin(pulsePhase * Math.PI) * 0.08;

      ctx.save();
      ctx.globalAlpha = 0.3;
      ctx.fillStyle = config.color;
      ctx.fillRect(
        trap.x * TILE_SIZE + 2,
        trap.y * TILE_SIZE + 2,
        TILE_SIZE - 4,
        TILE_SIZE - 4
      );
      ctx.restore();

      if (trap.isTriggered && trap.remainingDuration > 0) {
        ctx.save();
        ctx.globalAlpha = 0.15 + Math.sin(now / 150) * 0.1;
        ctx.fillStyle = config.color;
        ctx.beginPath();
        ctx.arc(cx, cy, (TILE_SIZE / 2) * pulseScale, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      ctx.font = 'bold 18px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#fff';
      ctx.fillText(config.icon, cx, cy - 4);

      ctx.font = 'bold 11px monospace';
      ctx.fillStyle = '#fff';
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 2;
      const remainingText = trap.isTriggered
        ? trap.remainingDuration.toFixed(1)
        : trap.triggerDelay > 0
        ? `D${trap.triggerDelay}`
        : 'R';
      ctx.strokeText(remainingText, cx, cy + 13);
      ctx.fillText(remainingText, cx, cy + 13);

      if (editingTrapId === trap.id) {
        ctx.strokeStyle = '#22d3ee';
        ctx.lineWidth = 2;
        ctx.strokeRect(
          trap.x * TILE_SIZE + 1,
          trap.y * TILE_SIZE + 1,
          TILE_SIZE - 2,
          TILE_SIZE - 2
        );
      }
    });

    activeEffects.forEach((effect) => {
      const cx = effect.x * TILE_SIZE + TILE_SIZE / 2;
      const cy = effect.y * TILE_SIZE + TILE_SIZE / 2;
      const elapsed = (now - effect.startTime) / 1000;
      const progress = Math.min(1, elapsed / effect.duration);
      const config = TRAP_CONFIG[effect.type];

      ctx.save();
      switch (effect.type) {
        case 'electric': {
          const flash = Math.sin(elapsed * 40) > 0 ? 1 : 0.2;
          ctx.globalAlpha = (1 - progress) * flash;
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(effect.x * TILE_SIZE, effect.y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
          ctx.strokeStyle = config.color;
          ctx.lineWidth = 3;
          for (let i = 0; i < 4; i++) {
            ctx.beginPath();
            const sx = cx + (Math.random() - 0.5) * 20;
            const sy = cy + (Math.random() - 0.5) * 20;
            ctx.moveTo(sx, sy);
            ctx.lineTo(sx + (Math.random() - 0.5) * 30, sy + (Math.random() - 0.5) * 30);
            ctx.stroke();
          }
          break;
        }
        case 'poison': {
          for (let i = 0; i < 12; i++) {
            const angle = (i / 12) * Math.PI * 2 + elapsed * 2;
            const radius = 5 + progress * 25;
            const px = cx + Math.cos(angle) * radius;
            const py = cy + Math.sin(angle) * radius - progress * 10;
            ctx.globalAlpha = (1 - progress) * 0.6;
            ctx.fillStyle = config.color;
            ctx.beginPath();
            ctx.arc(px, py, 6 + progress * 4, 0, Math.PI * 2);
            ctx.fill();
          }
          break;
        }
        case 'fire': {
          for (let i = 0; i < 8; i++) {
            const fx = cx + (Math.random() - 0.5) * 20;
            const fy = cy - progress * 20 + Math.random() * 10;
            const size = 8 - progress * 5;
            const grd = ctx.createRadialGradient(fx, fy, 0, fx, fy, size);
            grd.addColorStop(0, '#ffffff');
            grd.addColorStop(0.3, '#ffaa00');
            grd.addColorStop(1, 'rgba(239,68,68,0)');
            ctx.globalAlpha = 1 - progress;
            ctx.fillStyle = grd;
            ctx.beginPath();
            ctx.arc(fx, fy, Math.max(0.1, size), 0, Math.PI * 2);
            ctx.fill();
          }
          break;
        }
        case 'ice': {
          ctx.globalAlpha = 1 - progress;
          for (let i = 0; i < 6; i++) {
            const angle = (i / 6) * Math.PI * 2 + elapsed * 5;
            const radius = 14;
            const ix = cx + Math.cos(angle) * radius;
            const iy = cy + Math.sin(angle) * radius;
            ctx.fillStyle = config.color;
            ctx.beginPath();
            for (let j = 0; j < 6; j++) {
              const a = (j / 6) * Math.PI * 2;
              const r = j % 2 === 0 ? 5 : 2;
              const x = ix + Math.cos(a) * r;
              const y = iy + Math.sin(a) * r;
              if (j === 0) ctx.moveTo(x, y);
              else ctx.lineTo(x, y);
            }
            ctx.closePath();
            ctx.fill();
          }
          break;
        }
      }
      ctx.restore();
    });

    enemies.forEach((enemy) => {
      if (enemy.isDead) return;
      const ex = enemy.displayX * TILE_SIZE + TILE_SIZE / 2;
      const ey = enemy.displayY * TILE_SIZE + TILE_SIZE / 2;
      const radius = 12;

      const isFlashing = enemy.isStunned && Math.floor(now / 80) % 2 === 0;

      ctx.save();
      if (!isFlashing) {
        ctx.fillStyle = '#ef4444';
      } else {
        ctx.fillStyle = '#ffffff';
      }
      ctx.beginPath();
      ctx.arc(ex, ey, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#880000';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();

      const healthPct = enemy.health / enemy.maxHealth;
      const arcRadius = radius + 6;
      const startAngle = -Math.PI / 2 - Math.PI * 0.8;
      const endAngle = -Math.PI / 2 + Math.PI * 0.8;
      const totalAngle = endAngle - startAngle;

      ctx.strokeStyle = 'rgba(0,0,0,0.5)';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(ex, ey, arcRadius, startAngle, endAngle);
      ctx.stroke();

      const hue = healthPct * 120;
      ctx.strokeStyle = `hsl(${hue}, 80%, 50%)`;
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(ex, ey, arcRadius, startAngle, startAngle + totalAngle * healthPct);
      ctx.stroke();
    });

    if (hoverTile && phase === 'editing') {
      if (selectedTool === 'trap' && selectedTrapType) {
        const config = TRAP_CONFIG[selectedTrapType];
        ctx.save();
        ctx.globalAlpha = 0.4;
        ctx.fillStyle = config.color;
        ctx.fillRect(
          hoverTile.x * TILE_SIZE + 2,
          hoverTile.y * TILE_SIZE + 2,
          TILE_SIZE - 4,
          TILE_SIZE - 4
        );
        ctx.restore();
        ctx.font = 'bold 18px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.fillText(
          config.icon,
          hoverTile.x * TILE_SIZE + TILE_SIZE / 2,
          hoverTile.y * TILE_SIZE + TILE_SIZE / 2
        );
      } else if (selectedTool === 'path') {
        ctx.save();
        ctx.globalAlpha = 0.5;
        ctx.fillStyle = '#00ff00';
        ctx.fillRect(
          hoverTile.x * TILE_SIZE + 2,
          hoverTile.y * TILE_SIZE + 2,
          TILE_SIZE - 4,
          TILE_SIZE - 4
        );
        ctx.restore();
      }
    }
  }, [traps, enemies, path, hoverTile, selectedTool, selectedTrapType, phase, editingTrapId, activeEffects]);

  useEffect(() => {
    let animationId: number;
    let lastTime = 0;
    const loop = (time: number) => {
      if (time - lastTime >= 33) {
        draw();
        lastTime = time;
      }
      animationId = requestAnimationFrame(loop);
    };
    animationId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animationId);
  }, [draw]);

  const getTileFromEvent = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = Math.floor(((e.clientX - rect.left) * scaleX) / TILE_SIZE);
    const y = Math.floor(((e.clientY - rect.top) * scaleY) / TILE_SIZE);
    if (x < 0 || x >= GRID_SIZE || y < 0 || y >= GRID_SIZE) return null;
    return { x, y };
  };

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const tile = getTileFromEvent(e);
    if (!tile || phase !== 'editing') return;

    if (selectedTool === 'trap') {
      const existingTrap = traps.find((t) => t.x === tile.x && t.y === tile.y);
      if (existingTrap) {
        setEditingTrapId(existingTrap.id);
      } else if (selectedTrapType) {
        placeTrap(tile.x, tile.y);
      }
    } else if (selectedTool === 'path') {
      togglePathPoint(tile.x, tile.y);
    }
  };

  const handleContextMenu = (e: React.MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (phase !== 'editing') return;
    const tile = getTileFromEvent(e);
    if (!tile) return;
    const existingTrap = traps.find((t) => t.x === tile.x && t.y === tile.y);
    if (existingTrap) {
      removeTrap(existingTrap.id);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const tile = getTileFromEvent(e);
    setHoverTile(tile);
  };

  const handleMouseLeave = () => {
    setHoverTile(null);
  };

  const editingTrap = traps.find((t) => t.id === editingTrapId);

  return (
    <div style={{ position: 'relative' }}>
      <canvas
        ref={canvasRef}
        width={CANVAS_SIZE}
        height={CANVAS_SIZE}
        onClick={handleClick}
        onContextMenu={handleContextMenu}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{
          display: 'block',
          border: '2px solid #4a4a8a',
          borderRadius: '8px',
          cursor: phase === 'editing' ? 'crosshair' : 'default',
          imageRendering: 'pixelated',
        }}
      />
      {editingTrap && phase === 'editing' && (
        <TrapParamPanel trap={editingTrap} onClose={() => setEditingTrapId(null)} />
      )}
    </div>
  );
};

export { TRAP_CONFIG };
export type { TrapType };
