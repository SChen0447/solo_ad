import { useRef, useEffect, useState, useCallback } from 'react';
import { useAppStore } from '../../store/gameStore';
import { CLASS_COLORS } from '../../data/heroes';
import { GridPosition, Hero, PlacedHero } from '../../types';
import './GridCanvas.css';

const GRID_SIZE = 8;

interface GridCanvasProps {
  onHeroDrop?: (hero: Hero, position: GridPosition) => void;
  onRightClick?: (heroId: string, position: GridPosition, x: number, y: number) => void;
  cellSize?: number;
  readOnly?: boolean;
}

interface DragState {
  heroId: string;
  startPos: GridPosition;
  currentPos: GridPosition;
  offsetX: number;
  offsetY: number;
  isNew: boolean;
  animProgress: number;
}

interface ContextMenuState {
  x: number;
  y: number;
  gridX: number;
  gridY: number;
  heroId: string | null;
}

export default function GridCanvas({ onHeroDrop, onRightClick, cellSize: propCellSize, readOnly = false }: GridCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { state, placeOnGrid, removeFromGrid, getPlacedHeroes } = useAppStore();

  const [hoveredCell, setHoveredCell] = useState<GridPosition | null>(null);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [cellSize, setCellSize] = useState(60);
  const [snapping, setSnapping] = useState<{ heroId: string; from: GridPosition; to: GridPosition; progress: number } | null>(null);

  const placedHeroes = getPlacedHeroes();

  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const w = containerRef.current.clientWidth - 40;
        const h = containerRef.current.clientHeight - 40;
        const size = Math.floor(Math.min(w, h) / GRID_SIZE);
        const clamped = Math.max(50, Math.min(70, size));
        setCellSize(clamped);
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  const gridWidth = cellSize * GRID_SIZE;
  const gridHeight = cellSize * GRID_SIZE;

  const getGridPos = (clientX: number, clientY: number): GridPosition | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const x = Math.floor((clientX - rect.left) / cellSize);
    const y = Math.floor((clientY - rect.top) / cellSize);
    if (x < 0 || x >= GRID_SIZE || y < 0 || y >= GRID_SIZE) return null;
    return { x, y };
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    const pos = getGridPos(e.clientX, e.clientY);
    setHoveredCell(pos);
  };

  const handleDragLeave = () => {
    setHoveredCell(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setHoveredCell(null);
    const pos = getGridPos(e.clientX, e.clientY);
    if (!pos || readOnly) return;

    const heroData = e.dataTransfer.getData('hero');
    if (heroData) {
      const hero = JSON.parse(heroData) as Hero;
      placeOnGrid(hero.id, pos);
      if (onHeroDrop) onHeroDrop(hero, pos);
      setSnapping({ heroId: hero.id, from: pos, to: pos, progress: 0 });
      requestAnimationFrame(animateSnap);
    }
  };

  const animateSnap = useCallback(() => {
    setSnapping((prev) => {
      if (!prev) return null;
      const next = prev.progress + 0.12;
      if (next >= 1) return null;
      return { ...prev, progress: next };
    });
  }, []);

  useEffect(() => {
    if (snapping && snapping.progress < 1) {
      const id = requestAnimationFrame(animateSnap);
      return () => cancelAnimationFrame(id);
    }
  }, [snapping, animateSnap]);

  const handleMouseMove = (e: React.MouseEvent) => {
    const pos = getGridPos(e.clientX, e.clientY);
    setHoveredCell(pos);

    if (dragState) {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const offsetX = e.clientX - rect.left - dragState.offsetX;
      const offsetY = e.clientY - rect.top - dragState.offsetY;
      const gridX = Math.floor((e.clientX - rect.left) / cellSize);
      const gridY = Math.floor((e.clientY - rect.top) / cellSize);
      setDragState({
        ...dragState,
        currentPos: {
          x: Math.max(0, Math.min(GRID_SIZE - 1, gridX)),
          y: Math.max(0, Math.min(GRID_SIZE - 1, gridY)),
        },
      });
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (readOnly) return;
    if (e.button !== 0) return;
    const pos = getGridPos(e.clientX, e.clientY);
    if (!pos) return;

    const hero = placedHeroes.find((h) => h.position.x === pos.x && h.position.y === pos.y);
    if (hero) {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const offsetX = e.clientX - rect.left - pos.x * cellSize;
      const offsetY = e.clientY - rect.top - pos.y * cellSize;
      setDragState({
        heroId: hero.id,
        startPos: { ...pos },
        currentPos: { ...pos },
        offsetX,
        offsetY,
        isNew: false,
        animProgress: 0,
      });
    }
    setContextMenu(null);
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (dragState) {
      const pos = getGridPos(e.clientX, e.clientY);
      if (pos && (pos.x !== dragState.startPos.x || pos.y !== dragState.startPos.y)) {
        const occupied = placedHeroes.find(
          (h) => h.position.x === pos.x && h.position.y === pos.y && h.id !== dragState.heroId
        );
        if (!occupied) {
          placeOnGrid(dragState.heroId, pos);
          setSnapping({ heroId: dragState.heroId, from: dragState.startPos, to: pos, progress: 0 });
          requestAnimationFrame(animateSnap);
        } else {
          placeOnGrid(dragState.heroId, dragState.startPos);
        }
      }
      setDragState(null);
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    if (readOnly) return;
    const pos = getGridPos(e.clientX, e.clientY);
    if (!pos) {
      setContextMenu(null);
      return;
    }
    const hero = placedHeroes.find((h) => h.position.x === pos.x && h.position.y === pos.y);
    if (hero) {
      setContextMenu({
        x: e.clientX,
        y: e.clientY,
        gridX: pos.x,
        gridY: pos.y,
        heroId: hero.id,
      });
    } else {
      setContextMenu(null);
    }
  };

  const handleRemoveHero = () => {
    if (contextMenu?.heroId) {
      removeFromGrid(contextMenu.heroId);
    }
    setContextMenu(null);
  };

  const handleViewStats = () => {
    setContextMenu(null);
  };

  useEffect(() => {
    const handleClickOutside = () => setContextMenu(null);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        const isLight = (x + y) % 2 === 0;
        ctx.fillStyle = isLight ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.01)';
        ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
      }
    }

    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 0.3;
    for (let i = 0; i <= GRID_SIZE; i++) {
      ctx.beginPath();
      ctx.moveTo(i * cellSize, 0);
      ctx.lineTo(i * cellSize, gridHeight);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i * cellSize);
      ctx.lineTo(gridWidth, i * cellSize);
      ctx.stroke();
    }

    if (hoveredCell && !dragState) {
      ctx.strokeStyle = 'rgba(96, 165, 250, 0.6)';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(
        hoveredCell.x * cellSize + 0.75,
        hoveredCell.y * cellSize + 0.75,
        cellSize - 1.5,
        cellSize - 1.5
      );
    }

    const drawHero = (hero: PlacedHero, x: number, y: number, scale: number = 1, opacity: number = 1) => {
      const color = CLASS_COLORS[hero.heroClass];
      const cx = x + cellSize / 2;
      const cy = y + cellSize / 2;
      const radius = (cellSize * 0.38) * scale;

      ctx.save();
      ctx.globalAlpha = opacity;

      const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius * 1.6);
      gradient.addColorStop(0, color + '50');
      gradient.addColorStop(1, color + '00');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(cx, cy, radius * 1.6, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#2a2a3a';
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.font = `${Math.floor(cellSize * 0.35 * scale)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(hero.avatar, cx, cy);

      const hpPct = hero.hp / hero.maxHp;
      const barW = radius * 1.6;
      const barH = 4;
      const barX = cx - barW / 2;
      const barY = cy + radius + 6;

      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(barX, barY, barW, barH);

      const hpColor = hpPct > 0.5 ? '#22c55e' : hpPct > 0.25 ? '#eab308' : '#ef4444';
      ctx.fillStyle = hpColor;
      ctx.fillRect(barX, barY, barW * hpPct, barH);

      ctx.restore();
    };

    for (const hero of placedHeroes) {
      if (dragState && dragState.heroId === hero.id) {
        const ghostX = hero.position.x * cellSize;
        const ghostY = hero.position.y * cellSize;
        drawHero(hero, ghostX, ghostY, 0.85, 0.3);

        if (snapping && snapping.heroId === hero.id) {
          const ease = 1 - Math.pow(1 - snapping.progress, 3);
          const sx = snapping.from.x * cellSize;
          const sy = snapping.from.y * cellSize;
          const tx = snapping.to.x * cellSize;
          const ty = snapping.to.y * cellSize;
          const cx = sx + (tx - sx) * ease;
          const cy = sy + (ty - sy) * ease;
          const bounce = Math.sin(snapping.progress * Math.PI) * 6;
          drawHero(hero, cx, cy - bounce, 1, 1);
        } else {
          drawHero(hero, dragState.currentPos.x * cellSize, dragState.currentPos.y * cellSize, 1.1, 0.9);
        }
      } else {
        drawHero(hero, hero.position.x * cellSize, hero.position.y * cellSize);
      }
    }
  }, [placedHeroes, hoveredCell, dragState, cellSize, gridWidth, gridHeight, snapping]);

  return (
    <div className="grid-canvas-container" ref={containerRef}>
      <canvas
        ref={canvasRef}
        width={gridWidth}
        height={gridHeight}
        className="grid-canvas"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => setHoveredCell(null)}
        onContextMenu={handleContextMenu}
      />
      {contextMenu && (
        <div
          className="grid-context-menu"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="context-menu-item" onClick={handleViewStats}>查看属性</div>
          <div className="context-menu-item danger" onClick={handleRemoveHero}>移除</div>
        </div>
      )}
    </div>
  );
}
