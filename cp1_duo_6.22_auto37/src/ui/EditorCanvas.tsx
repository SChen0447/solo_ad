import React, { useRef, useEffect, useCallback, useState } from 'react';
import { eventBus, EditorEvent } from '../core/eventSystem';
import {
  MapData,
  MapEntity,
  PathData,
  GridCell,
  EventBinding,
  CustomUnitType,
  GRID_COLS,
  GRID_ROWS,
  CELL_SIZE,
  TERRAIN_COLORS,
} from '../core/mapData';

interface CanvasProps {
  activeEntityType: string | null;
  activeEntityColor?: string;
  activeEntityName?: string;
  activeTerrain: 'grass' | 'wall' | 'water' | null;
  pathMode: boolean;
  pathEntityId: string | null;
  customUnitTypes: CustomUnitType[];
  onSelectEntity: (id: string | null) => void;
  selectedEntityId: string | null;
  onPreviewEvent: (entityId: string) => void;
}

interface DragState {
  type: 'entity' | 'pathPoint' | null;
  id: string;
  pathId?: string;
  pointOrder?: number;
  originGridX: number;
  originGridY: number;
  currentPixelX: number;
  currentPixelY: number;
}

const CANVAS_W = GRID_COLS * CELL_SIZE;
const CANVAS_H = GRID_ROWS * CELL_SIZE;

const ENTITY_COLORS: Record<string, string> = {
  player: '#4fc3f7',
  monster: '#ef5350',
  chest: '#ffd54f',
};

const FLASH_DURATION = 300;

const EditorCanvas: React.FC<CanvasProps> = ({
  activeEntityType,
  activeEntityColor,
  activeEntityName,
  activeTerrain,
  pathMode,
  pathEntityId,
  customUnitTypes,
  onSelectEntity,
  selectedEntityId,
  onPreviewEvent,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const dataRef = useRef<MapData | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const panRef = useRef({ x: 0, y: 0, dragging: false, startX: 0, startY: 0 });
  const mouseRef = useRef({ x: -1, y: -1 });
  const flashRef = useRef<Map<string, { start: number; type: 'green' | 'red' }>>(new Map());
  const selectedCellRef = useRef<{ x: number; y: number } | null>(null);
  const animFrameRef = useRef<number>(0);
  const [, forceUpdate] = useState(0);
  const terrainAnimRef = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    const handler = (data: unknown) => {
      dataRef.current = data as MapData;
      forceUpdate((n) => n + 1);
    };
    const unsub = eventBus.on(EditorEvent.MAP_UPDATED, handler);
    return unsub;
  }, []);

  const screenToGrid = useCallback(
    (sx: number, sy: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return { gx: -1, gy: -1 };
      const rect = canvas.getBoundingClientRect();
      const cx = (sx - rect.left) * (canvas.width / rect.width) - panRef.current.x;
      const cy = (sy - rect.top) * (canvas.height / rect.height) - panRef.current.y;
      return { gx: Math.floor(cx / CELL_SIZE), gy: Math.floor(cy / CELL_SIZE) };
    },
    []
  );

  const screenToCanvasPixel = useCallback(
    (sx: number, sy: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return { px: 0, py: 0 };
      const rect = canvas.getBoundingClientRect();
      return {
        px: (sx - rect.left) * (canvas.width / rect.width) - panRef.current.x,
        py: (sy - rect.top) * (canvas.height / rect.height) - panRef.current.y,
      };
    },
    []
  );

  const drawGrid = useCallback(
    (ctx: CanvasRenderingContext2D, data: MapData) => {
      ctx.save();
      ctx.translate(panRef.current.x, panRef.current.y);

      for (let y = 0; y < GRID_ROWS; y++) {
        for (let x = 0; x < GRID_COLS; x++) {
          const cell = data.grid[y][x];
          const px = x * CELL_SIZE;
          const py = y * CELL_SIZE;

          const key = `${x},${y}`;
          const now = performance.now();
          const animStart = terrainAnimRef.current.get(key);
          let alpha = 1;
          if (animStart) {
            const elapsed = now - animStart;
            alpha = Math.min(1, elapsed / 200);
            if (alpha >= 1) terrainAnimRef.current.delete(key);
          }

          ctx.fillStyle = '#1a1a2e';
          ctx.fillRect(px, py, CELL_SIZE, CELL_SIZE);

          if (cell.terrain !== 'grass' || (animStart && alpha < 1)) {
            ctx.globalAlpha = alpha * (cell.terrain === 'grass' ? 0 : 1);
            ctx.fillStyle = TERRAIN_COLORS[cell.terrain];
            ctx.fillRect(px, py, CELL_SIZE, CELL_SIZE);
            ctx.globalAlpha = 1;
          } else {
            ctx.fillStyle = TERRAIN_COLORS.grass;
            ctx.fillRect(px, py, CELL_SIZE, CELL_SIZE);
          }

          ctx.strokeStyle = 'rgba(255,255,255,0.08)';
          ctx.lineWidth = 1;
          ctx.strokeRect(px + 0.5, py + 0.5, CELL_SIZE - 1, CELL_SIZE - 1);
        }
      }

      if (selectedCellRef.current) {
        const sc = selectedCellRef.current;
        ctx.strokeStyle = '#ffd700';
        ctx.lineWidth = 2;
        ctx.strokeRect(
          sc.x * CELL_SIZE + 1,
          sc.y * CELL_SIZE + 1,
          CELL_SIZE - 2,
          CELL_SIZE - 2
        );
      }

      ctx.restore();
    },
    []
  );

  const drawPaths = useCallback(
    (ctx: CanvasRenderingContext2D, data: MapData) => {
      ctx.save();
      ctx.translate(panRef.current.x, panRef.current.y);

      data.paths.forEach((path: PathData) => {
        if (path.points.length < 1) return;

        ctx.strokeStyle = '#42a5f5';
        ctx.lineWidth = 2;
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.moveTo(
          path.points[0].x * CELL_SIZE + CELL_SIZE / 2,
          path.points[0].y * CELL_SIZE + CELL_SIZE / 2
        );
        for (let i = 1; i < path.points.length; i++) {
          ctx.lineTo(
            path.points[i].x * CELL_SIZE + CELL_SIZE / 2,
            path.points[i].y * CELL_SIZE + CELL_SIZE / 2
          );
        }
        ctx.stroke();

        const entity = data.entities.find((e) => e.id === path.entityId);
        if (entity && path.points.length > 1) {
          const dx = path.points[1].x - path.points[0].x;
          const dy = path.points[1].y - path.points[0].y;
          const angle = Math.atan2(dy, dx);
          const cx = entity.gridX * CELL_SIZE + CELL_SIZE / 2;
          const cy = entity.gridY * CELL_SIZE + CELL_SIZE / 2 + 18;
          ctx.fillStyle = '#42a5f5';
          ctx.beginPath();
          ctx.moveTo(cx + Math.cos(angle) * 6, cy + Math.sin(angle) * 6);
          ctx.lineTo(
            cx + Math.cos(angle + 2.5) * 5,
            cy + Math.sin(angle + 2.5) * 5
          );
          ctx.lineTo(
            cx + Math.cos(angle - 2.5) * 5,
            cy + Math.sin(angle - 2.5) * 5
          );
          ctx.closePath();
          ctx.fill();
        }

        path.points.forEach((pt) => {
          const cx = pt.x * CELL_SIZE + CELL_SIZE / 2;
          const cy = pt.y * CELL_SIZE + CELL_SIZE / 2;

          ctx.fillStyle = 'rgba(255,255,255,0.6)';
          ctx.beginPath();
          ctx.arc(cx, cy, 8, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#42a5f5';
          ctx.beginPath();
          ctx.arc(cx, cy, 7, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#fff';
          ctx.font = 'bold 10px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(String(pt.order), cx, cy);
        });
      });

      ctx.restore();
    },
    []
  );

  const drawPathPreview = useCallback(
    (ctx: CanvasRenderingContext2D, data: MapData) => {
      if (!pathMode || !pathEntityId) return;
      const path = data.paths.find((p) => p.entityId === pathEntityId);
      if (!path || path.points.length === 0) return;
      if (mouseRef.current.x < 0) return;

      const lastPt = path.points[path.points.length - 1];
      const { px, py } = screenToCanvasPixel(mouseRef.current.x, mouseRef.current.y);

      ctx.save();
      ctx.translate(panRef.current.x, panRef.current.y);
      ctx.strokeStyle = 'rgba(255, 235, 59, 0.6)';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.moveTo(
        lastPt.x * CELL_SIZE + CELL_SIZE / 2,
        lastPt.y * CELL_SIZE + CELL_SIZE / 2
      );
      ctx.lineTo(px, py);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    },
    [pathMode, pathEntityId, screenToCanvasPixel]
  );

  const drawEntities = useCallback(
    (ctx: CanvasRenderingContext2D, data: MapData) => {
      ctx.save();
      ctx.translate(panRef.current.x, panRef.current.y);

      const now = performance.now();

      data.entities.forEach((entity: MapEntity) => {
        let px = entity.gridX * CELL_SIZE;
        let py = entity.gridY * CELL_SIZE;

        if (
          dragRef.current &&
          dragRef.current.type === 'entity' &&
          dragRef.current.id === entity.id
        ) {
          px = dragRef.current.currentPixelX - CELL_SIZE / 2 - panRef.current.x;
          py = dragRef.current.currentPixelY - CELL_SIZE / 2 - panRef.current.y;
        }

        const cx = px + CELL_SIZE / 2;
        const cy = py + CELL_SIZE / 2;
        const flash = flashRef.current.get(entity.id);
        let flashColor: string | null = null;
        if (flash) {
          const elapsed = now - flash.start;
          if (elapsed < FLASH_DURATION) {
            flashColor = flash.type === 'green' ? 'rgba(76,175,80,0.5)' : 'rgba(244,67,54,0.6)';
          } else {
            flashRef.current.delete(entity.id);
          }
        }

        if (flashColor) {
          ctx.fillStyle = flashColor;
          ctx.fillRect(px, py, CELL_SIZE, CELL_SIZE);
        }

        const color =
          entity.type === 'custom' && entity.color
            ? entity.color
            : ENTITY_COLORS[entity.type] || '#aaa';

        if (entity.type === 'custom') {
          ctx.fillStyle = color;
          ctx.fillRect(cx - 14, cy - 14, 28, 28);
          ctx.strokeStyle = 'rgba(255,255,255,0.3)';
          ctx.lineWidth = 1;
          ctx.strokeRect(cx - 14, cy - 14, 28, 28);
        } else if (entity.type === 'player') {
          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.arc(cx, cy, 14, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = 'rgba(255,255,255,0.3)';
          ctx.lineWidth = 1;
          ctx.stroke();
        } else if (entity.type === 'monster') {
          ctx.fillStyle = color;
          ctx.fillRect(cx - 14, cy - 14, 28, 28);
          ctx.strokeStyle = 'rgba(255,255,255,0.3)';
          ctx.lineWidth = 1;
          ctx.strokeRect(cx - 14, cy - 14, 28, 28);
        } else if (entity.type === 'chest') {
          ctx.fillStyle = color;
          ctx.save();
          ctx.translate(cx, cy);
          ctx.rotate(Math.PI / 4);
          ctx.fillRect(-10, -10, 20, 20);
          ctx.strokeStyle = 'rgba(255,255,255,0.3)';
          ctx.lineWidth = 1;
          ctx.strokeRect(-10, -10, 20, 20);
          ctx.restore();
        }

        if (entity.id === selectedEntityId) {
          ctx.strokeStyle = '#ffd700';
          ctx.lineWidth = 2;
          ctx.strokeRect(px + 2, py + 2, CELL_SIZE - 4, CELL_SIZE - 4);
        }

        const ev = data.events.find((e) => e.entityId === entity.id);
        if (ev) {
          ctx.fillStyle = '#ffd600';
          const lx = px + CELL_SIZE - 10;
          const ly = py + CELL_SIZE - 10;
          ctx.beginPath();
          ctx.moveTo(lx + 5, ly);
          ctx.lineTo(lx + 8, ly + 4);
          ctx.lineTo(lx + 6, ly + 4);
          ctx.lineTo(lx + 7, ly + 9);
          ctx.lineTo(lx + 4, ly + 6);
          ctx.lineTo(lx + 2, ly + 9);
          ctx.lineTo(lx + 3, ly + 4);
          ctx.lineTo(lx + 1, ly + 4);
          ctx.closePath();
          ctx.fill();
        }

        if (entity.type === 'custom' && entity.name) {
          ctx.fillStyle = 'rgba(255,255,255,0.85)';
          ctx.font = '9px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'top';
          ctx.fillText(entity.name, cx, py + CELL_SIZE + 2);
        }
      });

      ctx.restore();
    },
    [selectedEntityId]
  );

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx || !dataRef.current) {
      animFrameRef.current = requestAnimationFrame(render);
      return;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const data = dataRef.current;

    drawGrid(ctx, data);
    drawPathPreview(ctx, data);
    drawPaths(ctx, data);
    drawEntities(ctx, data);

    const needsAnim =
      flashRef.current.size > 0 || terrainAnimRef.current.size > 0 || dragRef.current !== null;
    if (needsAnim) {
      animFrameRef.current = requestAnimationFrame(render);
    } else {
      animFrameRef.current = 0;
    }
  }, [drawGrid, drawPathPreview, drawPaths, drawEntities]);

  const scheduleRender = useCallback(() => {
    if (!animFrameRef.current) {
      animFrameRef.current = requestAnimationFrame(render);
    }
  }, [render]);

  useEffect(() => {
    scheduleRender();
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [scheduleRender]);

  useEffect(() => {
    scheduleRender();
  }, [selectedEntityId, pathMode, pathEntityId, scheduleRender]);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button === 2) {
        panRef.current = {
          ...panRef.current,
          dragging: true,
          startX: e.clientX - panRef.current.x,
          startY: e.clientY - panRef.current.y,
        };
        return;
      }

      if (e.button !== 0) return;
      const { gx, gy } = screenToGrid(e.clientX, e.clientY);
      const data = dataRef.current;
      if (!data) return;

      if (pathMode && pathEntityId) {
        if (gx >= 0 && gx < GRID_COLS && gy >= 0 && gy < GRID_ROWS) {
          const path = data.paths.find((p) => p.entityId === pathEntityId);
          if (path) {
            const pt = path.points.find(
              (p) => p.x === gx && p.y === gy
            );
            if (pt) {
              dragRef.current = {
                type: 'pathPoint',
                id: String(pt.order),
                pathId: path.id,
                pointOrder: pt.order,
                originGridX: gx,
                originGridY: gy,
                currentPixelX: e.clientX,
                currentPixelY: e.clientY,
              };
              return;
            }
          }
          eventBus.emit(EditorEvent.ADD_PATH_POINT, {
            entityId: pathEntityId,
            x: gx,
            y: gy,
          });
        }
        return;
      }

      if (activeTerrain) {
        if (gx >= 0 && gx < GRID_COLS && gy >= 0 && gy < GRID_ROWS) {
          const key = `${gx},${gy}`;
          terrainAnimRef.current.set(key, performance.now());
          selectedCellRef.current = { x: gx, y: gy };
          eventBus.emit(EditorEvent.SET_TERRAIN, { x: gx, y: gy, terrain: activeTerrain });
          scheduleRender();
        }
        return;
      }

      const clickedEntity = data.entities.find(
        (en) => en.gridX === gx && en.gridY === gy
      );

      if (clickedEntity) {
        const ev = data.events.find((ev2) => ev2.entityId === clickedEntity.id);
        if (ev) {
          const { px, py } = screenToCanvasPixel(e.clientX, e.clientY);
          const epx = clickedEntity.gridX * CELL_SIZE + CELL_SIZE - 10 + panRef.current.x;
          const epy = clickedEntity.gridY * CELL_SIZE + CELL_SIZE - 10 + panRef.current.y;
          if (px >= epx - 2 && px <= epx + 12 && py >= epy - 2 && py <= epy + 12) {
            onPreviewEvent(clickedEntity.id);
            return;
          }
        }

        onSelectEntity(clickedEntity.id);
        dragRef.current = {
          type: 'entity',
          id: clickedEntity.id,
          originGridX: clickedEntity.gridX,
          originGridY: clickedEntity.gridY,
          currentPixelX: e.clientX,
          currentPixelY: e.clientY,
        };
        scheduleRender();
        return;
      }

      if (activeEntityType) {
        if (gx >= 0 && gx < GRID_COLS && gy >= 0 && gy < GRID_ROWS) {
          eventBus.emit(EditorEvent.ADD_ENTITY, {
            type: activeEntityType,
            gridX: gx,
            gridY: gy,
            name: activeEntityName,
            color: activeEntityColor,
          });
          flashRef.current.set(`place_${gx}_${gy}`, {
            start: performance.now(),
            type: 'green',
          });
          scheduleRender();
        }
        return;
      }

      selectedCellRef.current =
        gx >= 0 && gx < GRID_COLS && gy >= 0 && gy < GRID_ROWS
          ? { x: gx, y: gy }
          : null;
      onSelectEntity(null);
      scheduleRender();
    },
    [
      activeEntityType,
      activeEntityColor,
      activeEntityName,
      activeTerrain,
      pathMode,
      pathEntityId,
      screenToGrid,
      screenToCanvasPixel,
      onSelectEntity,
      onPreviewEvent,
      scheduleRender,
    ]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };

      if (panRef.current.dragging) {
        panRef.current.x = e.clientX - panRef.current.startX;
        panRef.current.y = e.clientY - panRef.current.startY;
        scheduleRender();
        return;
      }

      if (dragRef.current) {
        dragRef.current.currentPixelX = e.clientX;
        dragRef.current.currentPixelY = e.clientY;
        scheduleRender();
        return;
      }

      if (pathMode && pathEntityId) {
        scheduleRender();
      }
    },
    [pathMode, pathEntityId, scheduleRender]
  );

  const handleMouseUp = useCallback(
    (e: React.MouseEvent) => {
      if (panRef.current.dragging) {
        panRef.current.dragging = false;
        return;
      }

      if (!dragRef.current) return;
      const drag = dragRef.current;
      const { gx, gy } = screenToGrid(e.clientX, e.clientY);

      if (drag.type === 'entity') {
        const data = dataRef.current;
        if (data) {
          const entity = data.entities.find((en) => en.id === drag.id);
          if (entity) {
            const validTarget =
              gx >= 0 &&
              gx < GRID_COLS &&
              gy >= 0 &&
              gy < GRID_ROWS &&
              !data.entities.some(
                (en) => en.id !== drag.id && en.gridX === gx && en.gridY === gy
              ) &&
              data.grid[gy]?.[gx]?.terrain !== 'wall' &&
              data.grid[gy]?.[gx]?.terrain !== 'water';

            if (validTarget) {
              eventBus.emit(EditorEvent.MOVE_ENTITY, {
                id: drag.id,
                toX: gx,
                toY: gy,
              });
            } else {
              flashRef.current.set(drag.id, {
                start: performance.now(),
                type: 'red',
              });
              scheduleRender();
            }
          }
        }
      } else if (drag.type === 'pathPoint' && drag.pathId && drag.pointOrder !== undefined) {
        if (gx >= 0 && gx < GRID_COLS && gy >= 0 && gy < GRID_ROWS) {
          eventBus.emit(EditorEvent.MOVE_PATH_POINT, {
            pathId: drag.pathId,
            pointOrder: drag.pointOrder,
            newX: gx,
            newY: gy,
          });
        }
      }

      dragRef.current = null;
      scheduleRender();
    },
    [screenToGrid, scheduleRender]
  );

  const handleMouseLeave = useCallback(() => {
    mouseRef.current = { x: -1, y: -1 };
    if (pathMode) scheduleRender();
  }, [pathMode, scheduleRender]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const data = dataRef.current;
        if (!data) return;

        if (selectedEntityId) {
          flashRef.current.set(selectedEntityId, {
            start: performance.now(),
            type: 'red',
          });
          scheduleRender();
          setTimeout(() => {
            eventBus.emit(EditorEvent.DELETE_ENTITY, { id: selectedEntityId });
            onSelectEntity(null);
          }, FLASH_DURATION);
          return;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedEntityId, onSelectEntity, scheduleRender]);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        position: 'relative',
        background:
          'radial-gradient(ellipse at center, #1e1e3a 0%, #1a1a2e 70%)',
      }}
    >
      <canvas
        ref={canvasRef}
        width={CANVAS_W}
        height={CANVAS_H}
        style={{
          boxShadow: '0 0 60px rgba(0,0,0,0.6), 0 0 120px rgba(0,0,0,0.3)',
          cursor: pathMode ? 'crosshair' : activeEntityType ? 'pointer' : 'default',
          borderRadius: 4,
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onContextMenu={handleContextMenu}
      />
    </div>
  );
};

export default EditorCanvas;
