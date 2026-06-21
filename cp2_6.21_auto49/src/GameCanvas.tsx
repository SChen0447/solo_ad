import { useEffect, useRef, useCallback } from 'react';
import type { GameState } from './gameLogic';

interface HighlightCell {
  x: number;
  y: number;
  startTime: number;
  duration: number;
}

interface TriggerAnimation {
  type: 'door' | 'key';
  position: { x: number; y: number };
  startTime: number;
  duration: number;
  color: string;
}

interface MapReadyNotice {
  startTime: number;
  duration: number;
}

interface GameCanvasProps {
  gameState: GameState;
  canvasSize?: number;
  onAnimationFrame?: () => void;
  mapReadyKey?: number;
}

const BG_COLOR = '#1E1E2E';
const GRID_COLOR = '#313244';
const WALL_COLOR = '#45475A';
const FLOOR_COLOR = '#313244';
const EXIT_COLOR = '#10B981';
const PLAYER_COLOR = '#10B981';
const HIGHLIGHT_COLOR = '#FDE68A';
const PLAYER_SIZE = 32;

export default function GameCanvas({ gameState, canvasSize = 480, onAnimationFrame, mapReadyKey }: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const highlightsRef = useRef<HighlightCell[]>([]);
  const triggersRef = useRef<TriggerAnimation[]>([]);
  const mapReadyRef = useRef<MapReadyNotice | null>(null);
  const lastPlayerPosRef = useRef({ ...gameState.playerPos });
  const lastCollectedKeysRef = useRef([...gameState.collectedKeys]);
  const lastOpenedDoorsRef = useRef([...gameState.openedDoors]);
  const lastMapReadyKeyRef = useRef(mapReadyKey);

  const cellSize = canvasSize / Math.max(gameState.map.width, gameState.map.height);

  const draw = useCallback((ctx: CanvasRenderingContext2D, time: number) => {
    const { map, playerPos, collectedKeys, openedDoors } = gameState;
    const cs = cellSize;

    ctx.fillStyle = BG_COLOR;
    ctx.fillRect(0, 0, canvasSize, canvasSize);

    const offsetX = (canvasSize - map.width * cs) / 2;
    const offsetY = (canvasSize - map.height * cs) / 2;

    for (let y = 0; y < map.height; y++) {
      for (let x = 0; x < map.width; x++) {
        const px = offsetX + x * cs;
        const py = offsetY + y * cs;

        if (map.cells[y][x] === 'wall') {
          ctx.fillStyle = WALL_COLOR;
          ctx.fillRect(px, py, cs, cs);
        } else if (map.cells[y][x] === 'exit') {
          ctx.fillStyle = EXIT_COLOR;
          ctx.globalAlpha = 0.3 + Math.sin(time / 500) * 0.2;
          ctx.fillRect(px, py, cs, cs);
          ctx.globalAlpha = 1;
        } else {
          ctx.fillStyle = FLOOR_COLOR;
          ctx.fillRect(px, py, cs, cs);
        }

        ctx.strokeStyle = GRID_COLOR;
        ctx.lineWidth = 0.5;
        ctx.strokeRect(px, py, cs, cs);
      }
    }

    highlightsRef.current = highlightsRef.current.filter(h => {
      const elapsed = time - h.startTime;
      if (elapsed >= h.duration) return false;

      const progress = elapsed / h.duration;
      const alpha = progress < 0.25
        ? progress / 0.25
        : progress > 0.75
          ? (1 - progress) / 0.25
          : 1;

      ctx.fillStyle = HIGHLIGHT_COLOR;
      ctx.globalAlpha = Math.max(0, Math.min(1, alpha)) * 0.6;
      ctx.fillRect(offsetX + h.x * cs, offsetY + h.y * cs, cs, cs);
      ctx.globalAlpha = 1;
      return true;
    });

    const pulseAlpha = 0.6 + Math.sin(time / 750) * 0.4;
    ctx.fillStyle = PLAYER_COLOR;
    ctx.globalAlpha = pulseAlpha * 0.3;
    ctx.fillRect(offsetX + playerPos.x * cs, offsetY + playerPos.y * cs, cs, cs);
    ctx.globalAlpha = 1;

    for (const door of map.doors) {
      const isOpen = openedDoors.includes(door.id);
      const px = offsetX + door.position.x * cs;
      const py = offsetY + door.position.y * cs;

      if (isOpen) {
        ctx.fillStyle = door.color;
        ctx.globalAlpha = 0.2;
        ctx.fillRect(px, py, cs, cs);
        ctx.globalAlpha = 1;
      } else {
        ctx.fillStyle = door.color;
        ctx.fillRect(px, py, cs, cs);

        ctx.fillStyle = '#1E1E2E';
        ctx.fillRect(px + cs * 0.2, py + cs * 0.4, cs * 0.6, cs * 0.2);
      }
    }

    for (const key of map.keys) {
      if (collectedKeys.includes(key.id)) continue;

      const px = offsetX + key.position.x * cs;
      const py = offsetY + key.position.y * cs;
      const cx = px + cs / 2;
      const cy = py + cs / 2;
      const keySize = cs * 0.3;

      ctx.fillStyle = key.color;
      ctx.beginPath();
      ctx.arc(cx, cy - keySize * 0.3, keySize * 0.6, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillRect(cx - keySize * 0.15, cy - keySize * 0.3, keySize * 0.3, keySize * 0.8);
      ctx.fillRect(cx, cy + keySize * 0.2, keySize * 0.4, keySize * 0.15);
    }

    const playerPx = offsetX + playerPos.x * cs + cs / 2;
    const playerPy = offsetY + playerPos.y * cs + cs / 2;
    const playerRenderSize = Math.min(PLAYER_SIZE, cs * 0.8);

    ctx.fillStyle = PLAYER_COLOR;
    const halfSize = playerRenderSize / 2;
    ctx.fillRect(
      playerPx - halfSize,
      playerPy - halfSize,
      playerRenderSize,
      playerRenderSize
    );

    triggersRef.current = triggersRef.current.filter(t => {
      const elapsed = time - t.startTime;
      if (elapsed >= t.duration) return false;

      const progress = elapsed / t.duration;
      let alpha: number;
      let scale: number;

      if (progress < 0.15) {
        const fadeInProgress = progress / 0.15;
        alpha = fadeInProgress;
        scale = 0.8 + fadeInProgress * 0.4;
      } else if (progress < 0.6) {
        alpha = 1;
        scale = 1.2;
      } else {
        const fadeOutProgress = (progress - 0.6) / 0.4;
        alpha = 1 - fadeOutProgress;
        scale = 1.2 + fadeOutProgress * 0.3;
      }

      const px = offsetX + t.position.x * cs + cs / 2;
      const py = offsetY + t.position.y * cs + cs / 2;

      ctx.strokeStyle = t.color;
      ctx.globalAlpha = Math.max(0, alpha);
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(px, py, cs * 0.4 * scale, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = t.color;
      ctx.globalAlpha = Math.max(0, alpha) * 0.15;
      ctx.beginPath();
      ctx.arc(px, py, cs * 0.4 * scale, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;

      return true;
    });

    if (mapReadyRef.current) {
      const notice = mapReadyRef.current;
      const elapsed = time - notice.startTime;
      if (elapsed >= notice.duration) {
        mapReadyRef.current = null;
      } else {
        const progress = elapsed / notice.duration;
        let alpha: number;
        let translateY: number;

        if (progress < 0.25) {
          const fadeInProgress = progress / 0.25;
          alpha = fadeInProgress;
          translateY = 10 * (1 - fadeInProgress);
        } else if (progress < 0.6) {
          alpha = 1;
          translateY = 0;
        } else {
          const fadeOutProgress = (progress - 0.6) / 0.4;
          alpha = 1 - fadeOutProgress;
          translateY = -10 * fadeOutProgress;
        }

        ctx.save();
        ctx.globalAlpha = Math.max(0, alpha);
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '16px system-ui, -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(
          '地图已生成',
          canvasSize / 2,
          canvasSize / 2 + translateY
        );
        ctx.restore();
      }
    }
  }, [gameState, cellSize, canvasSize]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = canvasSize * dpr;
    canvas.height = canvasSize * dpr;
    canvas.style.width = `${canvasSize}px`;
    canvas.style.height = `${canvasSize}px`;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(dpr, dpr);

    const animate = (time: number) => {
      draw(ctx, time);
      if (onAnimationFrame) {
        onAnimationFrame();
      }
      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationRef.current);
    };
  }, [draw, canvasSize, onAnimationFrame]);

  useEffect(() => {
    const prevPos = lastPlayerPosRef.current;
    if (prevPos.x !== gameState.playerPos.x || prevPos.y !== gameState.playerPos.y) {
      highlightsRef.current.push({
        x: prevPos.x,
        y: prevPos.y,
        startTime: performance.now(),
        duration: 200,
      });
      lastPlayerPosRef.current = { ...gameState.playerPos };
    }

    const newKeys = gameState.collectedKeys.filter(k => !lastCollectedKeysRef.current.includes(k));
    for (const keyId of newKeys) {
      const key = gameState.map.keys.find(k => k.id === keyId);
      if (key) {
        triggersRef.current.push({
          type: 'key',
          position: { ...key.position },
          startTime: performance.now(),
          duration: 1500,
          color: key.color,
        });
      }
    }
    lastCollectedKeysRef.current = [...gameState.collectedKeys];

    const newDoors = gameState.openedDoors.filter(d => !lastOpenedDoorsRef.current.includes(d));
    for (const doorId of newDoors) {
      const door = gameState.map.doors.find(d => d.id === doorId);
      if (door) {
        triggersRef.current.push({
          type: 'door',
          position: { ...door.position },
          startTime: performance.now(),
          duration: 1500,
          color: door.color,
        });
      }
    }
    lastOpenedDoorsRef.current = [...gameState.openedDoors];
  }, [gameState]);

  useEffect(() => {
    if (mapReadyKey !== undefined && mapReadyKey !== lastMapReadyKeyRef.current) {
      mapReadyRef.current = {
        startTime: performance.now(),
        duration: 800,
      };
      lastMapReadyKeyRef.current = mapReadyKey;
    }
  }, [mapReadyKey]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        display: 'block',
        imageRendering: 'pixelated',
      }}
    />
  );
}
