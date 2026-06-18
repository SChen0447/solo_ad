import { useEffect, useRef, useCallback } from 'react';
import { useGameStore } from '../state/gameStore';
import { GameMap, MAP_WIDTH, MAP_HEIGHT } from '../game/Map';
import { Player } from '../game/Player';
import { Lava } from '../game/Lava';
import { GameLoop } from '../game/GameLoop';

const CANVAS_W = 800;
const CANVAS_H = 600;
const BG_GRADIENT_INNER = '#1a1a1a';
const BG_GRADIENT_OUTER = '#0d0d0d';

let globalTime = 0;

export default function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const keysRef = useRef<Set<string>>(new Set());
  const mapRef = useRef<GameMap | null>(null);
  const playerRef = useRef<Player | null>(null);
  const lavaRef = useRef<Lava | null>(null);
  const loopRef = useRef<GameLoop | null>(null);
  const rafRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const initRef = useRef<() => void>(() => {});

  const initGame = useCallback(() => {
    const map = new GameMap();
    map.generate();
    mapRef.current = map;

    const player = new Player(map.startX, map.startY);
    playerRef.current = player;

    const lava = new Lava();
    lavaRef.current = lava;

    const loop = new GameLoop();
    loopRef.current = loop;

    const store = useGameStore.getState();
    store.resetGame(map.crystals, map.portalX, map.portalY);
    globalTime = 0;
  }, []);

  initRef.current = initGame;

  useEffect(() => {
    initGame();

    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      keysRef.current.add(key);
      if (key === 'r') {
        const store = useGameStore.getState();
        if (store.gameState === 'won' || store.gameState === 'lost') {
          initRef.current();
        }
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current.delete(e.key.toLowerCase());
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    lastTimeRef.current = performance.now();

    const render = (now: number) => {
      const rawDt = (now - lastTimeRef.current) / 1000;
      const dt = Math.min(rawDt, 0.05);
      lastTimeRef.current = now;
      globalTime += dt;

      const loop = loopRef.current;
      if (loop) loop.updateFps(dt);

      const store = useGameStore.getState();
      const map = mapRef.current!;
      const player = playerRef.current!;
      const lava = lavaRef.current!;

      if (store.gameState === 'playing') {
        store.addElapsed(dt);
        player.update(dt, keysRef.current, map);
        lava.update(dt, loop?.getFps() ?? 60);
        store.updateParticles(dt);

        const crystals = store.crystals.map((c) =>
          c.collectAnim > 0 ? { ...c, collectAnim: c.collectAnim - dt } : c
        );
        useGameStore.setState({ crystals });

        if (store.portalActive) {
          store.setPortalRotation(store.portalRotation + dt * 4);
        } else {
          store.setPortalRotation(store.portalRotation + dt * 0.5);
        }

        if (store.flashTimer > 0) {
          store.setFlashTimer(store.flashTimer - dt);
        }
      }

      if (store.gameState === 'won') {
        store.setWinAnimTimer(Math.min(1, store.winAnimTimer + dt));
      }
      if (store.gameState === 'lost') {
        store.setLoseAnimTimer(Math.min(1.5, store.loseAnimTimer + dt));
      }

      const camX = Math.max(
        0,
        Math.min(MAP_WIDTH - CANVAS_W, player.x - CANVAS_W / 2)
      );
      const camY = Math.max(
        0,
        Math.min(MAP_HEIGHT - CANVAS_H, player.y - CANVAS_H / 2)
      );

      const bgGrad = ctx.createRadialGradient(
        CANVAS_W / 2,
        CANVAS_H / 2,
        0,
        CANVAS_W / 2,
        CANVAS_H / 2,
        CANVAS_W * 0.7
      );
      bgGrad.addColorStop(0, BG_GRADIENT_INNER);
      bgGrad.addColorStop(1, BG_GRADIENT_OUTER);
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

      map.render(ctx, camX, camY, CANVAS_W, CANVAS_H);

      renderCrystals(ctx, store, camX, camY);
      renderPortal(ctx, store, camX, camY);

      player.render(ctx, camX, camY);

      lava.render(ctx, camX, camY, CANVAS_W, CANVAS_H);

      renderParticles(ctx, store, camX, camY);

      if (store.flashTimer > 0) {
        const flashAlpha = (store.flashTimer / 0.1) * 0.5;
        ctx.fillStyle = `rgba(255, 255, 255, ${flashAlpha})`;
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
      }

      renderHUD(ctx, store);

      if (store.lowFps) {
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillRect(CANVAS_W / 2 - 80, 4, 160, 24);
        ctx.fillStyle = '#ff4444';
        ctx.font = '14px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('低帧率模式', CANVAS_W / 2, 20);
        ctx.textAlign = 'left';
      }

      if (store.gameState === 'won') {
        renderWinScreen(ctx, store);
      }
      if (store.gameState === 'lost') {
        renderLoseScreen(ctx, store);
      }

      rafRef.current = requestAnimationFrame(render);
    };

    rafRef.current = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [initGame]);

  return (
    <canvas
      ref={canvasRef}
      width={CANVAS_W}
      height={CANVAS_H}
      style={{ display: 'block', border: '2px solid #333' }}
    />
  );
}

function renderCrystals(
  ctx: CanvasRenderingContext2D,
  store: ReturnType<typeof useGameStore.getState>,
  camX: number,
  camY: number
) {
  for (const crystal of store.crystals) {
    const sx = crystal.x - camX;
    const sy = crystal.y - camY;
    if (sx < -30 || sx > CANVAS_W + 30 || sy < -30 || sy > CANVAS_H + 30)
      continue;

    if (crystal.collected && crystal.collectAnim <= 0) continue;

    let scale = 1;
    let alpha = 1;
    if (crystal.collected && crystal.collectAnim > 0) {
      scale = crystal.collectAnim / 0.3;
      alpha = crystal.collectAnim / 0.3;
      const flash = Math.sin(crystal.collectAnim * 30) > 0;
      if (flash) alpha *= 0.5;
    }

    ctx.save();
    ctx.translate(sx, sy);
    ctx.scale(scale, scale);
    ctx.globalAlpha = alpha;

    const shimmer = Math.sin(globalTime * 4 + crystal.x * 0.1) * 2;
    const size = 8 + shimmer;

    ctx.fillStyle = '#00bfff';
    ctx.beginPath();
    ctx.moveTo(0, -size);
    ctx.lineTo(size * 0.6, 0);
    ctx.lineTo(0, size);
    ctx.lineTo(-size * 0.6, 0);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = 'rgba(100, 200, 255, 0.5)';
    ctx.beginPath();
    ctx.moveTo(0, -size * 0.5);
    ctx.lineTo(size * 0.3, 0);
    ctx.lineTo(0, size * 0.5);
    ctx.lineTo(-size * 0.3, 0);
    ctx.closePath();
    ctx.fill();

    ctx.globalAlpha = 1;
    ctx.restore();
  }
}

function renderPortal(
  ctx: CanvasRenderingContext2D,
  store: ReturnType<typeof useGameStore.getState>,
  camX: number,
  camY: number
) {
  const sx = store.portalX - camX;
  const sy = store.portalY - camY;
  if (sx < -40 || sx > CANVAS_W + 40 || sy < -40 || sy > CANVAS_H + 40)
    return;

  ctx.save();
  ctx.translate(sx, sy);
  ctx.rotate(store.portalRotation);

  const active = store.portalActive;
  const baseColor = active ? '#aa00ff' : '#800080';
  const glowColor = active
    ? 'rgba(170, 0, 255, 0.4)'
    : 'rgba(128, 0, 128, 0.2)';
  const radius = active ? 20 : 16;

  const glow = ctx.createRadialGradient(0, 0, radius * 0.5, 0, 0, radius * 2);
  glow.addColorStop(0, glowColor);
  glow.addColorStop(1, 'rgba(128, 0, 128, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(0, 0, radius * 2, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = baseColor;
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI * 2 * i) / 6;
    const r = radius - i * 0.5;
    const px = Math.cos(angle) * r;
    const py = Math.sin(angle) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();

  if (active) {
    ctx.strokeStyle = 'rgba(200, 100, 255, 0.6)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI * 2 * i) / 6 + 0.3;
      const r = radius + 4;
      const px = Math.cos(angle) * r;
      const py = Math.sin(angle) * r;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.stroke();
  }

  ctx.restore();
}

function renderParticles(
  ctx: CanvasRenderingContext2D,
  store: ReturnType<typeof useGameStore.getState>,
  camX: number,
  camY: number
) {
  for (const p of store.particles) {
    const sx = p.x - camX;
    const sy = p.y - camY;
    const alpha = p.life / p.maxLife;
    ctx.fillStyle = `rgba(255, 215, 0, ${alpha})`;
    ctx.beginPath();
    ctx.arc(sx, sy, 3 * alpha, 0, Math.PI * 2);
    ctx.fill();
  }
}

function renderHUD(
  ctx: CanvasRenderingContext2D,
  store: ReturnType<typeof useGameStore.getState>
) {
  ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
  ctx.fillRect(10, 10, 200, 12);
  ctx.fillStyle = '#ff9800';
  ctx.fillRect(10, 10, (store.stamina / 100) * 200, 12);

  const collected = store.crystals.filter((c) => c.collected).length;
  const total = store.crystals.length;
  ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
  ctx.fillRect(8, CANVAS_H - 36, 160, 28);
  ctx.fillStyle = '#ffffff';
  ctx.font = '18px monospace';
  ctx.textAlign = 'left';
  ctx.fillText(`水晶: ${collected}/${total}`, 14, CANVAS_H - 14);

  const lavaH = Math.round(store.lavaHeight);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
  ctx.fillRect(CANVAS_W - 130, 10, 122, 24);
  ctx.fillStyle = '#ffffff';
  ctx.font = '16px monospace';
  ctx.textAlign = 'right';
  ctx.fillText(`熔岩: ${lavaH}px`, CANVAS_W - 14, 28);
  ctx.textAlign = 'left';
}

function renderWinScreen(
  ctx: CanvasRenderingContext2D,
  store: ReturnType<typeof useGameStore.getState>
) {
  const t = store.winAnimTimer;

  const borderSize = t * 200;
  ctx.fillStyle = `rgba(255, 215, 0, ${t * 0.5})`;
  ctx.fillRect(0, 0, borderSize, CANVAS_H);
  ctx.fillRect(CANVAS_W - borderSize, 0, borderSize, CANVAS_H);
  ctx.fillRect(0, 0, CANVAS_W, borderSize);
  ctx.fillRect(0, CANVAS_H - borderSize, CANVAS_W, borderSize);

  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  const boxW = 320;
  const boxH = 160;
  const boxX = (CANVAS_W - boxW) / 2;
  const boxY = (CANVAS_H - boxH) / 2;
  ctx.fillRect(boxX, boxY, boxW, boxH);

  ctx.strokeStyle = '#ffd700';
  ctx.lineWidth = 2;
  ctx.strokeRect(boxX, boxY, boxW, boxH);

  ctx.fillStyle = '#ffd700';
  ctx.font = 'bold 28px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('胜利逃生!', CANVAS_W / 2, boxY + 50);

  ctx.fillStyle = '#ffffff';
  ctx.font = '20px monospace';
  ctx.fillText(`得分: ${store.score}`, CANVAS_W / 2, boxY + 90);

  ctx.fillStyle = '#aaaaaa';
  ctx.font = '14px monospace';
  ctx.fillText('按 R 重新开始', CANVAS_W / 2, boxY + 130);
  ctx.textAlign = 'left';
}

function renderLoseScreen(
  ctx: CanvasRenderingContext2D,
  store: ReturnType<typeof useGameStore.getState>
) {
  const t = store.loseAnimTimer;

  if (t < 0.5) {
    const flashAlpha = (1 - t / 0.5) * 0.6;
    ctx.fillStyle = `rgba(255, 0, 0, ${flashAlpha})`;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  }

  const blackAlpha = Math.max(0, (t - 0.5) / 1.0) * 0.8;
  ctx.fillStyle = `rgba(0, 0, 0, ${blackAlpha})`;
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  if (t > 0.8) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    const boxW = 320;
    const boxH = 160;
    const boxX = (CANVAS_W - boxW) / 2;
    const boxY = (CANVAS_H - boxH) / 2;
    ctx.fillRect(boxX, boxY, boxW, boxH);

    ctx.strokeStyle = '#ff3333';
    ctx.lineWidth = 2;
    ctx.strokeRect(boxX, boxY, boxW, boxH);

    ctx.fillStyle = '#ff3333';
    ctx.font = 'bold 28px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('熔岩吞噬!', CANVAS_W / 2, boxY + 50);

    ctx.fillStyle = '#ffffff';
    ctx.font = '18px monospace';
    const collected = store.crystals.filter((c) => c.collected).length;
    ctx.fillText(
      `已收集水晶: ${collected}/${store.crystals.length}`,
      CANVAS_W / 2,
      boxY + 90
    );

    ctx.fillStyle = '#aaaaaa';
    ctx.font = '14px monospace';
    ctx.fillText('按 R 重新开始', CANVAS_W / 2, boxY + 130);
    ctx.textAlign = 'left';
  }
}
