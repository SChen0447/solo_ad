import React, { useRef, useEffect, useCallback } from 'react';
import {
  BOARD_SIZE,
  BoardState,
  StoneColor,
  AIRecommendation,
  STAR_POINTS,
  COL_LABELS,
  BLACK,
  WHITE,
  idx,
} from './types';

interface BoardCanvasProps {
  board: BoardState;
  lastMove: { x: number; y: number } | null;
  aiRecommendations: AIRecommendation[];
  aiEnabled: boolean;
  capturedPositions: { x: number; y: number }[];
  onBoardClick: (x: number, y: number) => void;
  lastPlacedAnim: { x: number; y: number; startTime: number } | null;
  captureAnims: { x: number; y: number; startTime: number; color: StoneColor }[];
}

const AI_COLORS = ['#FFD700', '#FF8C00', '#90EE90'];

const BoardCanvas: React.FC<BoardCanvasProps> = ({
  board,
  lastMove,
  aiRecommendations,
  aiEnabled,
  capturedPositions,
  onBoardClick,
  lastPlacedAnim,
  captureAnims,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const sizeRef = useRef<number>(600);

  const computeLayout = useCallback((canvasSize: number) => {
    const padding = 28;
    const boardArea = canvasSize - padding * 2;
    const cellSize = boardArea / (BOARD_SIZE - 1);
    const offsetX = padding;
    const offsetY = padding;
    return { padding, boardArea, cellSize, offsetX, offsetY };
  }, []);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const canvasSize = sizeRef.current;
    canvas.width = canvasSize * window.devicePixelRatio;
    canvas.height = canvasSize * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    const { padding, cellSize, offsetX, offsetY } = computeLayout(canvasSize);

    const grad = ctx.createLinearGradient(0, 0, canvasSize, canvasSize);
    grad.addColorStop(0, '#FAEBD7');
    grad.addColorStop(0.5, '#F5DEB3');
    grad.addColorStop(1, '#FFE4B5');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvasSize, canvasSize);

    ctx.strokeStyle = '#5C3A1E';
    ctx.lineWidth = 0.5;

    for (let i = 0; i < BOARD_SIZE; i++) {
      const x = offsetX + i * cellSize;
      const yStart = offsetY;
      const yEnd = offsetY + (BOARD_SIZE - 1) * cellSize;
      ctx.beginPath();
      ctx.moveTo(x, yStart);
      ctx.lineTo(x, yEnd);
      ctx.stroke();

      const y = offsetY + i * cellSize;
      const xStart = offsetX;
      const xEnd = offsetX + (BOARD_SIZE - 1) * cellSize;
      ctx.beginPath();
      ctx.moveTo(xStart, y);
      ctx.lineTo(xEnd, y);
      ctx.stroke();
    }

    ctx.fillStyle = '#5C3A1E';
    for (const sp of STAR_POINTS) {
      const cx = offsetX + sp.x * cellSize;
      const cy = offsetY + sp.y * cellSize;
      ctx.beginPath();
      ctx.arc(cx, cy, cellSize * 0.12, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = '#8B6914';
    ctx.font = `${Math.max(9, cellSize * 0.42)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (let i = 0; i < BOARD_SIZE; i++) {
      const label = COL_LABELS[i];
      const x = offsetX + i * cellSize;
      ctx.fillText(label, x, offsetY - padding * 0.55);
      ctx.fillText(label, x, offsetY + (BOARD_SIZE - 1) * cellSize + padding * 0.6);

      const rowLabel = String(BOARD_SIZE - i);
      const y = offsetY + i * cellSize;
      ctx.fillText(rowLabel, offsetX - padding * 0.6, y);
      ctx.fillText(rowLabel, offsetX + (BOARD_SIZE - 1) * cellSize + padding * 0.65, y);
    }

    const now = performance.now();

    for (let y = 0; y < BOARD_SIZE; y++) {
      for (let x = 0; x < BOARD_SIZE; x++) {
        const i = idx(x, y);
        const stone = board[i];
        if (stone === 0) continue;

        const cx = offsetX + x * cellSize;
        const cy = offsetY + y * cellSize;
        const r = cellSize * 0.44;

        let scale = 1;
        if (lastPlacedAnim && lastPlacedAnim.x === x && lastPlacedAnim.y === y) {
          const elapsed = now - lastPlacedAnim.startTime;
          if (elapsed < 500) {
            const t = elapsed / 500;
            scale = 1 + 0.15 * Math.sin(t * Math.PI);
          }
        }

        const sr = r * scale;

        ctx.save();
        ctx.shadowColor = 'rgba(0,0,0,0.35)';
        ctx.shadowBlur = cellSize * 0.2;
        ctx.shadowOffsetX = cellSize * 0.04;
        ctx.shadowOffsetY = cellSize * 0.06;

        if (stone === BLACK) {
          const stoneGrad = ctx.createRadialGradient(
            cx - sr * 0.25, cy - sr * 0.25, sr * 0.1,
            cx, cy, sr
          );
          stoneGrad.addColorStop(0, '#555555');
          stoneGrad.addColorStop(0.6, '#222222');
          stoneGrad.addColorStop(1, '#000000');
          ctx.fillStyle = stoneGrad;
        } else {
          const stoneGrad = ctx.createRadialGradient(
            cx - sr * 0.25, cy - sr * 0.25, sr * 0.1,
            cx, cy, sr
          );
          stoneGrad.addColorStop(0, '#FFFFFF');
          stoneGrad.addColorStop(0.7, '#F0F0F0');
          stoneGrad.addColorStop(1, '#D8D8D8');
          ctx.fillStyle = stoneGrad;
        }

        ctx.beginPath();
        ctx.arc(cx, cy, sr, 0, Math.PI * 2);
        ctx.fill();

        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;

        if (stone === WHITE) {
          ctx.strokeStyle = '#AAAAAA';
          ctx.lineWidth = 0.5;
          ctx.beginPath();
          ctx.arc(cx, cy, sr, 0, Math.PI * 2);
          ctx.stroke();
        }

        const haloGrad = ctx.createRadialGradient(cx, cy, sr * 0.7, cx, cy, sr * 1.15);
        haloGrad.addColorStop(0, 'rgba(255,255,255,0)');
        haloGrad.addColorStop(0.5, stone === BLACK ? 'rgba(100,100,100,0.08)' : 'rgba(255,255,255,0.15)');
        haloGrad.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = haloGrad;
        ctx.beginPath();
        ctx.arc(cx, cy, sr * 1.15, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      }
    }

    for (const cap of captureAnims) {
      const elapsed = now - cap.startTime;
      if (elapsed > 300) continue;
      const t = elapsed / 300;
      const cx = offsetX + cap.x * cellSize;
      const cy = offsetY + cap.y * cellSize;
      const r = cellSize * 0.44;
      const alpha = 1 - t;
      const scale = 1 + t * 0.3;

      ctx.save();
      ctx.globalAlpha = alpha;
      if (cap.color === BLACK) {
        ctx.fillStyle = '#000000';
      } else {
        ctx.fillStyle = '#EEEEEE';
      }
      ctx.beginPath();
      ctx.arc(cx, cy, r * scale, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    if (lastMove) {
      const cx = offsetX + lastMove.x * cellSize;
      const cy = offsetY + lastMove.y * cellSize;
      const stone = board[idx(lastMove.x, lastMove.y)];
      ctx.fillStyle = stone === BLACK ? '#FF4444' : '#FF4444';
      ctx.beginPath();
      ctx.arc(cx, cy, cellSize * 0.12, 0, Math.PI * 2);
      ctx.fill();
    }

    if (aiEnabled && aiRecommendations.length > 0) {
      for (let i = 0; i < aiRecommendations.length; i++) {
        const rec = aiRecommendations[i];
        const cx = offsetX + rec.x * cellSize;
        const cy = offsetY + rec.y * cellSize;
        const baseSize = cellSize * 0.18;
        const maxSize = cellSize * 0.35;
        const scoreRatio = rec.score / 1000;
        const dotR = baseSize + (maxSize - baseSize) * scoreRatio;

        ctx.save();
        ctx.globalAlpha = 0.6;
        ctx.fillStyle = AI_COLORS[i];
        ctx.beginPath();
        ctx.arc(cx, cy, dotR, 0, Math.PI * 2);
        ctx.fill();

        ctx.globalAlpha = 0.9;
        ctx.strokeStyle = AI_COLORS[i];
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(cx, cy, dotR + 2, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
    }
  }, [board, lastMove, aiRecommendations, aiEnabled, capturedPositions, computeLayout, lastPlacedAnim, captureAnims]);

  const animate = useCallback(() => {
    draw();
    animFrameRef.current = requestAnimationFrame(animate);
  }, [draw]);

  useEffect(() => {
    animFrameRef.current = requestAnimationFrame(animate);
    return () => {
      cancelAnimationFrame(animFrameRef.current);
    };
  }, [animate]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const width = entry.contentRect.width;
        const height = entry.contentRect.height;
        sizeRef.current = Math.min(width, height, 600);
        draw();
      }
    });

    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, [draw]);

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const scaleX = sizeRef.current / rect.width;
      const scaleY = sizeRef.current / rect.height;
      const mx = (e.clientX - rect.left) * scaleX;
      const my = (e.clientY - rect.top) * scaleY;

      const { cellSize, offsetX, offsetY } = computeLayout(sizeRef.current);

      const bx = Math.round((mx - offsetX) / cellSize);
      const by = Math.round((my - offsetY) / cellSize);

      if (bx >= 0 && bx < BOARD_SIZE && by >= 0 && by < BOARD_SIZE) {
        const dx = mx - (offsetX + bx * cellSize);
        const dy = my - (offsetY + by * cellSize);
        if (Math.sqrt(dx * dx + dy * dy) < cellSize * 0.5) {
          onBoardClick(bx, by);
        }
      }
    },
    [computeLayout, onBoardClick]
  );

  return (
    <div
      ref={containerRef}
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        width: '100%',
        height: '100%',
        maxWidth: 600,
        maxHeight: 600,
      }}
    >
      <canvas
        ref={canvasRef}
        onClick={handleClick}
        style={{
          width: sizeRef.current,
          height: sizeRef.current,
          cursor: 'crosshair',
        }}
      />
    </div>
  );
};

export default BoardCanvas;
