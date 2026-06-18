import { useRef, useEffect, useCallback, useState } from 'react';
import { MapRenderer, SelectionBox } from '../modules/gameMap/MapRenderer';
import { gameStore } from '../modules/gameState/GameStore';
import { unitBehavior, UnitCommandData } from '../modules/ai/UnitBehavior';
import { GameState, TILE_SIZE, MAP_WIDTH, MAP_HEIGHT, MIN_ZOOM, MAX_ZOOM, ZOOM_DURATION } from '../modules/gameMap/types';
import { eventBus } from '../eventBus';

export default function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const miniCanvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<MapRenderer | null>(null);
  const stateRef = useRef<GameState>(gameStore.getState());
  const lastTimeRef = useRef<number>(0);
  const animFrameRef = useRef<number>(0);
  const fpsFrames = useRef<number[]>([]);

  const [currentZoom, setCurrentZoom] = useState(1.0);
  const targetZoomRef = useRef(1.0);
  const zoomStartRef = useRef(1.0);
  const zoomAnimStartRef = useRef(0);
  const isZoomAnimating = useRef(false);

  const isDragging = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const selectionBoxRef = useRef<SelectionBox | null>(null);
  const hoverTileRef = useRef<{ x: number; y: number } | null>(null);
  const hasDragged = useRef(false);

  const getCanvasOffset = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return { ox: 0, oy: 0 };
    const totalW = MAP_WIDTH * TILE_SIZE;
    const totalH = MAP_HEIGHT * TILE_SIZE;
    const ox = (canvas.width - totalW * currentZoom) / 2;
    const oy = (canvas.height - totalH * currentZoom) / 2;
    return { ox, oy };
  }, [currentZoom]);

  const screenToGrid = useCallback(
    (screenX: number, screenY: number): { x: number; y: number } | null => {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      const { ox, oy } = getCanvasOffset();
      const mapX = (screenX - ox) / currentZoom;
      const mapY = (screenY - oy) / currentZoom;
      const gx = Math.floor(mapX / TILE_SIZE);
      const gy = Math.floor(mapY / TILE_SIZE);
      if (gx < 0 || gx >= MAP_WIDTH || gy < 0 || gy >= MAP_HEIGHT) return null;
      return { x: gx, y: gy };
    },
    [currentZoom, getCanvasOffset]
  );

  const screenToMap = useCallback(
    (screenX: number, screenY: number): { x: number; y: number } => {
      const { ox, oy } = getCanvasOffset();
      return { x: (screenX - ox) / currentZoom, y: (screenY - oy) / currentZoom };
    },
    [currentZoom, getCanvasOffset]
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    const miniCanvas = miniCanvasRef.current;
    if (!canvas || !miniCanvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeCanvas = () => {
      const container = canvas.parentElement;
      if (!container) return;
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
      rendererRef.current?.resize(canvas.width, canvas.height);
    };

    resizeCanvas();
    rendererRef.current = new MapRenderer(ctx, canvas.width, canvas.height);

    const unsub = gameStore.subscribe((s) => {
      stateRef.current = s;
    });

    const gameLoop = (timestamp: number) => {
      if (lastTimeRef.current === 0) lastTimeRef.current = timestamp;
      const dt = Math.min((timestamp - lastTimeRef.current) / 1000, 0.05);
      lastTimeRef.current = timestamp;

      fpsFrames.current.push(timestamp);
      while (fpsFrames.current.length > 0 && fpsFrames.current[0] < timestamp - 1000) {
        fpsFrames.current.shift();
      }
      const fps = fpsFrames.current.length;
      eventBus.emit('fps:update', { fps });

      if (isZoomAnimating.current) {
        const elapsed = timestamp - zoomAnimStartRef.current;
        const progress = Math.min(elapsed / ZOOM_DURATION, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        const newZoom = zoomStartRef.current + (targetZoomRef.current - zoomStartRef.current) * eased;
        setCurrentZoom(newZoom);
        if (progress >= 1) {
          isZoomAnimating.current = false;
          setCurrentZoom(targetZoomRef.current);
        }
      }

      unitBehavior.update(dt);

      const state = stateRef.current;
      const renderer = rendererRef.current;
      if (renderer && state.tiles.length > 0) {
        renderer.render(state, {
          hoverTile: hoverTileRef.current,
          selectionBox: selectionBoxRef.current
        }, currentZoom);
      }

      const miniCtx = miniCanvas.getContext('2d');
      if (miniCtx && state.tiles.length > 0) {
        renderer?.drawMinimap(miniCtx, 160, 160, state);
      }

      animFrameRef.current = requestAnimationFrame(gameLoop);
    };

    animFrameRef.current = requestAnimationFrame(gameLoop);

    window.addEventListener('resize', resizeCanvas);

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      unsub();
      window.removeEventListener('resize', resizeCanvas);
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleMouseDown = (e: MouseEvent) => {
      if (e.button === 0) {
        isDragging.current = true;
        hasDragged.current = false;
        dragStartRef.current = { x: e.offsetX, y: e.offsetY };
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      const grid = screenToGrid(e.offsetX, e.offsetY);
      hoverTileRef.current = grid;

      if (isDragging.current) {
        const dx = e.offsetX - dragStartRef.current.x;
        const dy = e.offsetY - dragStartRef.current.y;
        if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
          hasDragged.current = true;
        }
        if (hasDragged.current) {
          const start = screenToMap(dragStartRef.current.x, dragStartRef.current.y);
          const end = screenToMap(e.offsetX, e.offsetY);
          selectionBoxRef.current = { x1: start.x, y1: start.y, x2: end.x, y2: end.y };
        }
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (e.button === 0) {
        if (hasDragged.current && selectionBoxRef.current) {
          eventBus.emit('selection:box', selectionBoxRef.current);
        } else {
          const grid = screenToGrid(e.offsetX, e.offsetY);
          if (grid) {
            const state = stateRef.current;
            const mapX = e.offsetX;
            const mapY = e.offsetY;
            const { ox, oy } = getCanvasOffset();
            const px = (mapX - ox) / currentZoom;
            const py = (mapY - oy) / currentZoom;
            const clickedUnit = state.units.find(
              (u) => Math.hypot(u.x - px, u.y - py) <= 15
            );
            if (clickedUnit) {
              eventBus.emit('selection:single', { unitId: clickedUnit.id });
            } else if (state.selectedUnitIds.length > 0) {
              const cmd: UnitCommandData = {
                unitIds: state.selectedUnitIds,
                type: 'move',
                targetGridX: grid.x,
                targetGridY: grid.y
              };
              unitBehavior.handleCommand(cmd);
            } else {
              eventBus.emit('selection:clear', undefined);
            }
          }
        }
        isDragging.current = false;
        selectionBoxRef.current = null;
        hasDragged.current = false;
      } else if (e.button === 2) {
        const grid = screenToGrid(e.offsetX, e.offsetY);
        if (grid) {
          const tile = stateRef.current.tiles[grid.y]?.[grid.x];
          if (tile && tile.walkable && !tile.obstacle) {
            eventBus.emit('obstacle:add', { gridX: grid.x, gridY: grid.y });
          }
        }
      }
    };

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      const newTarget = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, targetZoomRef.current + delta));
      targetZoomRef.current = newTarget;
      zoomStartRef.current = currentZoom;
      zoomAnimStartRef.current = performance.now();
      isZoomAnimating.current = true;
      eventBus.emit('zoom:change', { zoom: newTarget });
    };

    const handleContextMenu = (e: Event) => {
      e.preventDefault();
    };

    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('wheel', handleWheel, { passive: false });
    canvas.addEventListener('contextmenu', handleContextMenu);

    return () => {
      canvas.removeEventListener('mousedown', handleMouseDown);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseup', handleMouseUp);
      canvas.removeEventListener('wheel', handleWheel);
      canvas.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [currentZoom, screenToGrid, screenToMap, getCanvasOffset]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <canvas
        ref={canvasRef}
        style={{ display: 'block', width: '100%', height: '100%', cursor: 'crosshair' }}
      />
      <canvas
        ref={miniCanvasRef}
        width={160}
        height={160}
        style={{
          position: 'absolute',
          right: 12,
          bottom: 12,
          border: '1px solid rgba(255,255,255,0.2)',
          borderRadius: 4,
          pointerEvents: 'none'
        }}
      />
    </div>
  );
}
