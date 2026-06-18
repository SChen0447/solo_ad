import { useEffect, useRef, useCallback } from 'react';
import { useGameStore } from '@/store/useGameStore';
import {
  movePlayer,
  checkCrystalCollection,
  isNearAlchemistTable,
  getTileAt,
} from '@/game/player';
import {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  TILE_SIZE,
  TILE_COLORS,
  ELEMENT_COLORS,
  ALCHEMIST_TABLE_RADIUS,
  Crystal,
  ElementType,
} from '@/types';

const CRYSTAL_SHAPES: Record<ElementType, (ctx: CanvasRenderingContext2D, x: number, y: number) => void> = {
  fire: (ctx, x, y) => {
    ctx.beginPath();
    ctx.moveTo(x, y - 6);
    ctx.lineTo(x - 5, y + 4);
    ctx.lineTo(x + 5, y + 4);
    ctx.closePath();
    ctx.fill();
  },
  water: (ctx, x, y) => {
    ctx.beginPath();
    ctx.arc(x, y, 5, 0, Math.PI * 2);
    ctx.fill();
  },
  earth: (ctx, x, y) => {
    ctx.fillRect(x - 4, y - 4, 8, 8);
  },
  wind: (ctx, x, y) => {
    ctx.beginPath();
    ctx.moveTo(x, y - 5);
    ctx.lineTo(x + 5, y);
    ctx.lineTo(x, y + 5);
    ctx.lineTo(x - 5, y);
    ctx.closePath();
    ctx.fill();
  },
};

function drawPlayer(ctx: CanvasRenderingContext2D, screenX: number, screenY: number, pulse: number) {
  ctx.save();

  ctx.beginPath();
  ctx.ellipse(screenX, screenY, 40, 25, 0, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(0, 255, 0, ${pulse})`;
  ctx.fill();
  ctx.strokeStyle = `rgba(0, 255, 0, ${pulse + 0.1})`;
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillStyle = '#8B4513';
  ctx.fillRect(screenX - 5, screenY - 2, 10, 10);

  ctx.fillStyle = '#D2B48C';
  ctx.fillRect(screenX - 4, screenY - 6, 8, 6);

  ctx.fillStyle = '#4169E1';
  ctx.fillRect(screenX - 5, screenY - 10, 10, 5);
  ctx.fillRect(screenX - 3, screenY - 13, 6, 3);

  ctx.restore();
}

function drawAlchemistTable(
  ctx: CanvasRenderingContext2D,
  screenX: number,
  screenY: number,
  isNear: boolean
) {
  ctx.save();

  const gradient = ctx.createRadialGradient(screenX, screenY, 10, screenX, screenY, ALCHEMIST_TABLE_RADIUS);
  gradient.addColorStop(0, '#9e9e9e');
  gradient.addColorStop(0.5, '#757575');
  gradient.addColorStop(1, '#616161');
  ctx.beginPath();
  ctx.arc(screenX, screenY, ALCHEMIST_TABLE_RADIUS, 0, Math.PI * 2);
  ctx.fillStyle = gradient;
  ctx.fill();

  ctx.beginPath();
  ctx.arc(screenX, screenY, ALCHEMIST_TABLE_RADIUS - 8, 0, Math.PI * 2);
  ctx.strokeStyle = '#4a4a4a';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(screenX, screenY, ALCHEMIST_TABLE_RADIUS - 20, 0, Math.PI * 2);
  ctx.strokeStyle = '#3a3a3a';
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.fillStyle = '#e0e0e0';
  ctx.font = '8px "Press Start 2P", monospace';
  ctx.textAlign = 'center';
  ctx.fillText('ALCHEMY', screenX, screenY + 3);

  if (isNear) {
    ctx.beginPath();
    ctx.arc(screenX, screenY, ALCHEMIST_TABLE_RADIUS + 5, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255, 200, 0, 0.5)';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  ctx.restore();
}

function drawParticles(
  ctx: CanvasRenderingContext2D,
  particles: { x: number; y: number; color: string; size: number; life: number; maxLife: number }[]
) {
  for (const p of particles) {
    const alpha = p.life / p.maxLife;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

export default function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const keysRef = useRef<Set<string>>(new Set());
  const lastTimeRef = useRef<number>(0);
  const respawnTimerRef = useRef<number>(0);
  const animFrameRef = useRef<number>(0);
  const pulseRef = useRef<number>(0.45);

  const store = useGameStore;

  const gameLoop = useCallback(() => {
    const state = store.getState();
    if (!state.tiles.length) {
      animFrameRef.current = requestAnimationFrame(gameLoop);
      return;
    }

    const now = performance.now();
    const dt = lastTimeRef.current ? (now - lastTimeRef.current) / 1000 : 1 / 60;
    lastTimeRef.current = now;

    const keys = keysRef.current;
    let dx = 0;
    let dy = 0;
    if (keys.has('w') || keys.has('W') || keys.has('ArrowUp')) dy -= 1;
    if (keys.has('s') || keys.has('S') || keys.has('ArrowDown')) dy += 1;
    if (keys.has('a') || keys.has('A') || keys.has('ArrowLeft')) dx -= 1;
    if (keys.has('d') || keys.has('D') || keys.has('ArrowRight')) dx += 1;

    if (dx !== 0 && dy !== 0) {
      const len = Math.sqrt(dx * dx + dy * dy);
      dx /= len;
      dy /= len;
    }

    let { x: newX, y: newY, speed } = movePlayer(
      { x: state.playerX, y: state.playerY, speed: state.playerSpeed, inventory: state.inventory },
      dx,
      dy,
      state.tiles
    );

    const currentTile = getTileAt(newX, newY, state.tiles);
    if (currentTile === 'water') {
      speed = 2;
    }

    const cameraX = newX - CANVAS_WIDTH / 2;
    const cameraY = newY - CANVAS_HEIGHT / 2;

    const collectedIds = checkCrystalCollection(newX, newY, state.crystals);
    if (collectedIds.length > 0) {
      state.collectCrystals(collectedIds);
    }

    const nearTable = isNearAlchemistTable(
      newX,
      newY,
      state.alchemistTableX,
      state.alchemistTableY
    );
    if (nearTable !== state.isNearTable) {
      state.setNearTable(nearTable);
    }

    state.setPlayerPosition(newX, newY, speed);
    state.setCamera(cameraX, cameraY);

    state.updateParticles(dt);

    respawnTimerRef.current += dt;
    if (respawnTimerRef.current >= 5) {
      respawnTimerRef.current = 0;
      state.respawnCrystal();
    }

    pulseRef.current = 0.3 + 0.15 * Math.sin(now / 1000 * Math.PI);
    state.setInteractionPulse(pulseRef.current);

    const canvas = canvasRef.current;
    if (!canvas) {
      animFrameRef.current = requestAnimationFrame(gameLoop);
      return;
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      animFrameRef.current = requestAnimationFrame(gameLoop);
      return;
    }

    ctx.fillStyle = '#2d4a22';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    const startCol = Math.max(0, Math.floor(cameraX / TILE_SIZE));
    const endCol = Math.min(state.tiles[0].length - 1, Math.ceil((cameraX + CANVAS_WIDTH) / TILE_SIZE));
    const startRow = Math.max(0, Math.floor(cameraY / TILE_SIZE));
    const endRow = Math.min(state.tiles.length - 1, Math.ceil((cameraY + CANVAS_HEIGHT) / TILE_SIZE));

    for (let row = startRow; row <= endRow; row++) {
      for (let col = startCol; col <= endCol; col++) {
        const tile = state.tiles[row][col];
        const sx = col * TILE_SIZE - cameraX;
        const sy = row * TILE_SIZE - cameraY;
        ctx.fillStyle = TILE_COLORS[tile];
        ctx.fillRect(sx, sy, TILE_SIZE, TILE_SIZE);

        if (tile === 'grass') {
          ctx.fillStyle = 'rgba(0,0,0,0.05)';
          if ((row + col) % 3 === 0) {
            ctx.fillRect(sx + 8, sy + 12, 2, 2);
            ctx.fillRect(sx + 20, sy + 6, 2, 2);
          }
        } else if (tile === 'water') {
          ctx.fillStyle = 'rgba(255,255,255,0.1)';
          const waveOffset = Math.sin(now / 800 + row + col) * 2;
          ctx.fillRect(sx + 4 + waveOffset, sy + 8, 12, 2);
          ctx.fillRect(sx + 16 - waveOffset, sy + 20, 10, 2);
        } else if (tile === 'rock') {
          ctx.fillStyle = 'rgba(0,0,0,0.15)';
          ctx.fillRect(sx + 4, sy + 4, 8, 6);
          ctx.fillRect(sx + 18, sy + 16, 10, 8);
        }

        ctx.strokeStyle = 'rgba(0,0,0,0.08)';
        ctx.strokeRect(sx, sy, TILE_SIZE, TILE_SIZE);
      }
    }

    const tableSX = state.alchemistTableX - cameraX;
    const tableSY = state.alchemistTableY - cameraY;
    drawAlchemistTable(ctx, tableSX, tableSY, state.isNearTable);

    for (const crystal of state.crystals) {
      if (crystal.collected) continue;
      const cx = crystal.x - cameraX;
      const cy = crystal.y - cameraY;
      if (cx < -20 || cx > CANVAS_WIDTH + 20 || cy < -20 || cy > CANVAS_HEIGHT + 20) continue;

      const bobOffset = Math.sin(now / 500 + crystal.x) * 2;
      ctx.fillStyle = ELEMENT_COLORS[crystal.element];
      ctx.globalAlpha = 0.3;
      ctx.beginPath();
      ctx.arc(cx, cy + bobOffset, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      CRYSTAL_SHAPES[crystal.element](ctx, cx, cy + bobOffset);
    }

    const playerSX = newX - cameraX;
    const playerSY = newY - cameraY;
    drawPlayer(ctx, playerSX, playerSY, pulseRef.current);

    drawParticles(ctx, state.particles);

    animFrameRef.current = requestAnimationFrame(gameLoop);
  }, [store]);

  useEffect(() => {
    const state = store.getState();
    if (!state.tiles.length) {
      state.initGame();
    }

    animFrameRef.current = requestAnimationFrame(gameLoop);

    return () => {
      cancelAnimationFrame(animFrameRef.current);
    };
  }, [gameLoop, store]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysRef.current = new Set([...keysRef.current, e.key]);
      if (e.key === 'i' || e.key === 'I') {
        useGameStore.getState().toggleInventory();
      }
      if (['w', 'a', 's', 'd', 'W', 'A', 'S', 'D', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const newKeys = new Set(keysRef.current);
      newKeys.delete(e.key);
      keysRef.current = newKeys;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      width={CANVAS_WIDTH}
      height={CANVAS_HEIGHT}
      style={{
        display: 'block',
        imageRendering: 'pixelated',
        border: '2px solid #1a1a2e',
      }}
    />
  );
}
