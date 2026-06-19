import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import type { NoteCard, Connection } from './types';
import { GraphEngine } from './GraphEngine';
import NoteCardComponent from './NoteCard';

interface ConnectionCanvasProps {
  cards: NoteCard[];
  connections: Connection[];
  zoom: number;
  onZoomChange: (z: number) => void;
  onBlankClick: (worldX: number, worldY: number) => void;
  engine: GraphEngine;
  newlyCreatedId: string | null;
}

interface Viewport {
  x: number;
  y: number;
  zoom: number;
}

interface DragState {
  type: 'pan' | 'card' | 'connection' | 'selection' | 'minimap';
  startScreenX: number;
  startScreenY: number;
  startWorldX?: number;
  startWorldY?: number;
  cardId?: string;
  cardOffsetX?: number;
  cardOffsetY?: number;
  connectionSourceId?: string;
  currentScreenX?: number;
  currentScreenY?: number;
  selectionStartWorldX?: number;
  selectionStartWorldY?: number;
  selectedIdsAtStart?: Set<string>;
}

const MINIMAP_WIDTH = 200;
const MINIMAP_HEIGHT = 150;
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 3.0;

const ConnectionCanvas = ({
  cards,
  connections,
  zoom: controlledZoom,
  onZoomChange,
  onBlankClick,
  engine,
  newlyCreatedId,
}: ConnectionCanvasProps) => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [viewport, setViewport] = useState<Viewport>({ x: 0, y: 0, zoom: 1 });
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [hoveredConnId, setHoveredConnId] = useState<string | null>(null);
  const [editingLabelConnId, setEditingLabelConnId] = useState<string | null>(null);
  const [editingLabelText, setEditingLabelText] = useState('');
  const [canvasSize, setCanvasSize] = useState({ w: window.innerWidth, h: window.innerHeight - 56 });
  const lastFrameRef = useRef<number>(0);
  const pendingCardUpdates = useRef<Map<string, { x: number; y: number }>>(new Map());
  const animFrameRef = useRef<number>(0);

  useEffect(() => {
    setViewport((v) => ({ ...v, zoom: controlledZoom }));
  }, [controlledZoom]);

  useEffect(() => {
    const handleResize = () => {
      setCanvasSize({ w: window.innerWidth, h: window.innerHeight - 56 });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const screenToWorld = useCallback(
    (sx: number, sy: number): { x: number; y: number } => {
      const rect = canvasRef.current?.getBoundingClientRect();
      const offsetX = rect ? rect.left : 0;
      const offsetY = rect ? rect.top : 0;
      return {
        x: (sx - offsetX - viewport.x) / viewport.zoom,
        y: (sy - offsetY - viewport.y) / viewport.zoom,
      };
    },
    [viewport]
  );

  const worldToScreen = useCallback(
    (wx: number, wy: number): { x: number; y: number } => {
      return {
        x: wx * viewport.zoom + viewport.x,
        y: wy * viewport.zoom + viewport.y,
      };
    },
    [viewport]
  );

  const flushCardUpdates = useCallback(() => {
    if (pendingCardUpdates.current.size > 0) {
      const updates = Array.from(pendingCardUpdates.current.entries());
      updates.forEach(([id, pos]) => {
        engine.updateCardPosition(id, pos);
      });
      pendingCardUpdates.current.clear();
    }
    animFrameRef.current = 0;
  }, [engine]);

  const scheduleCardFlush = useCallback(() => {
    if (!animFrameRef.current) {
      animFrameRef.current = requestAnimationFrame(flushCardUpdates);
    }
  }, [flushCardUpdates]);

  const getCardAnchor = useCallback(
    (card: NoteCard, side: 'bottom' | 'top' | 'auto' = 'auto'): { x: number; y: number } => {
      if (side === 'bottom') {
        return {
          x: card.position.x + card.width / 2,
          y: card.position.y + card.height - 10,
        };
      }
      if (side === 'top') {
        return {
          x: card.position.x + card.width / 2,
          y: card.position.y + 20,
        };
      }
      return {
        x: card.position.x + card.width / 2,
        y: card.position.y + card.height / 2,
      };
    },
    []
  );

  const computeOptimalAnchors = useCallback(
    (src: NoteCard, tgt: NoteCard) => {
      const srcCenter = { x: src.position.x + src.width / 2, y: src.position.y + src.height / 2 };
      const tgtCenter = { x: tgt.position.x + tgt.width / 2, y: tgt.position.y + tgt.height / 2 };
      const dx = tgtCenter.x - srcCenter.x;
      const dy = tgtCenter.y - srcCenter.y;

      let srcPoint: { x: number; y: number };
      let tgtPoint: { x: number; y: number };

      if (Math.abs(dy) > Math.abs(dx)) {
        if (dy >= 0) {
          srcPoint = { x: src.position.x + src.width / 2, y: src.position.y + src.height - 10 };
          tgtPoint = { x: tgt.position.x + tgt.width / 2, y: tgt.position.y + 20 };
        } else {
          srcPoint = { x: src.position.x + src.width / 2, y: src.position.y + 20 };
          tgtPoint = { x: tgt.position.x + tgt.width / 2, y: tgt.position.y + tgt.height - 10 };
        }
      } else {
        if (dx >= 0) {
          srcPoint = { x: src.position.x + src.width - 10, y: src.position.y + src.height / 2 };
          tgtPoint = { x: tgt.position.x + 10, y: tgt.position.y + tgt.height / 2 };
        } else {
          srcPoint = { x: src.position.x + 10, y: src.position.y + src.height / 2 };
          tgtPoint = { x: tgt.position.x + tgt.width - 10, y: tgt.position.y + tgt.height / 2 };
        }
      }

      return { srcPoint, tgtPoint };
    },
    []
  );

  const buildBezierPath = useCallback(
    (sx: number, sy: number, tx: number, ty: number): string => {
      const dx = Math.abs(tx - sx);
      const dy = Math.abs(ty - sy);
      const offset = Math.max(40, Math.min(120, Math.max(dx, dy) * 0.4));

      const c1x = sx;
      const c1y = sy + offset;
      const c2x = tx;
      const c2y = ty - offset;

      return `M ${sx} ${sy} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${tx} ${ty}`;
    },
    []
  );

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
      }
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;

      const mouseScreenX = e.clientX - rect.left;
      const mouseScreenY = e.clientY - rect.top;
      const mouseWorldX = (mouseScreenX - viewport.x) / viewport.zoom;
      const mouseWorldY = (mouseScreenY - viewport.y) / viewport.zoom;

      const delta = e.deltaY < 0 ? 1.08 : 0.92;
      const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, viewport.zoom * delta));

      const newViewportX = mouseScreenX - mouseWorldX * newZoom;
      const newViewportY = mouseScreenY - mouseWorldY * newZoom;

      setViewport({
        x: newViewportX,
        y: newViewportY,
        zoom: newZoom,
      });
      onZoomChange(newZoom);
    },
    [viewport, onZoomChange]
  );

  const handleCardSelect = useCallback(
    (e: React.MouseEvent, cardId: string) => {
      e.stopPropagation();
      if (e.ctrlKey || e.metaKey) {
        setSelectedIds((prev) => {
          const next = new Set(prev);
          if (next.has(cardId)) {
            next.delete(cardId);
          } else {
            next.add(cardId);
          }
          return next;
        });
      } else if (e.shiftKey) {
        setSelectedIds((prev) => {
          const next = new Set(prev);
          next.add(cardId);
          return next;
        });
      } else {
        setSelectedIds(new Set([cardId]));
      }
    },
    []
  );

  const handleCardDragStart = useCallback(
    (e: React.MouseEvent, cardId: string) => {
      if (e.button !== 0) return;
      e.preventDefault();

      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;

      const world = screenToWorld(e.clientX, e.clientY);
      const card = engine.getCard(cardId);
      if (!card) return;

      const effectiveSelected =
        selectedIds.has(cardId) && selectedIds.size > 1 ? selectedIds : new Set([cardId]);
      if (effectiveSelected.size > 1 && !selectedIds.has(cardId)) {
        setSelectedIds(new Set([cardId]));
      }

      const idsToTrack = effectiveSelected.size > 1 ? effectiveSelected : new Set([cardId]);
      const offsets = new Map<string, { dx: number; dy: number }>();
      idsToTrack.forEach((id) => {
        const c = engine.getCard(id);
        if (c) {
          offsets.set(id, {
            dx: world.x - c.position.x,
            dy: world.y - c.position.y,
          });
        }
      });

      (e.currentTarget as HTMLElement).style.cursor = 'grabbing';

      const startX = e.clientX;
      const startY = e.clientY;

      const onMove = (me: MouseEvent) => {
        const worldNow = screenToWorld(me.clientX, me.clientY);
        idsToTrack.forEach((id) => {
          const off = offsets.get(id);
          const c = engine.getCard(id);
          if (off && c) {
            const newX = worldNow.x - off.dx;
            const newY = worldNow.y - off.dy;
            pendingCardUpdates.current.set(id, { x: newX, y: newY });
          }
        });
        scheduleCardFlush();
        setDragState((ds) =>
          ds ? { ...ds, currentScreenX: me.clientX, currentScreenY: me.clientY } : null
        );
      };

      const onUp = (me: MouseEvent) => {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        flushCardUpdates();
        (e.currentTarget as HTMLElement).style.cursor = '';
        setDragState(null);
      };

      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);

      setDragState({
        type: 'card',
        startScreenX: startX,
        startScreenY: startY,
        cardId,
      });
    },
    [screenToWorld, engine, selectedIds, scheduleCardFlush, flushCardUpdates]
  );

  const handleConnectionStart = useCallback(
    (e: React.MouseEvent, sourceId: string) => {
      e.preventDefault();
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;

      const onMove = (me: MouseEvent) => {
        setDragState((ds) =>
          ds
            ? {
                ...ds,
                currentScreenX: me.clientX,
                currentScreenY: me.clientY,
              }
            : null
        );
      };

      const onUp = (me: MouseEvent) => {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);

        const target = document.elementFromPoint(me.clientX, me.clientY);
        if (target) {
          const cardEl = (target as HTMLElement).closest('[data-card-id]');
          if (cardEl) {
            const targetId = (cardEl as HTMLElement).getAttribute('data-card-id');
            if (targetId && targetId !== sourceId) {
              engine.addConnection(sourceId, targetId);
            }
          }
        }
        setDragState(null);
      };

      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);

      setDragState({
        type: 'connection',
        startScreenX: e.clientX,
        startScreenY: e.clientY,
        connectionSourceId: sourceId,
        currentScreenX: e.clientX,
        currentScreenY: e.clientY,
      });
    },
    [engine]
  );

  const handleCanvasMouseDown = useCallback(
    (e: React.MouseEvent) => {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;

      if (e.button === 1) {
        e.preventDefault();
        const onMove = (me: MouseEvent) => {
          setViewport((v) => ({
            ...v,
            x: v.x + (me.clientX - e.clientX),
            y: v.y + (me.clientY - e.clientY),
          }));
        };
        const onUp = () => {
          document.removeEventListener('mousemove', onMove);
          document.removeEventListener('mouseup', onUp);
          setDragState(null);
        };
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
        setDragState({
          type: 'pan',
          startScreenX: e.clientX,
          startScreenY: e.clientY,
        });
        return;
      }

      if (e.button === 0 && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        const world = screenToWorld(e.clientX, e.clientY);
        const startSelected = new Set(selectedIds);

        const onMove = (me: MouseEvent) => {
          setDragState((ds) =>
            ds
              ? {
                  ...ds,
                  currentScreenX: me.clientX,
                  currentScreenY: me.clientY,
                }
              : null
          );
        };

        const onUp = (me: MouseEvent) => {
          document.removeEventListener('mousemove', onMove);
          document.removeEventListener('mouseup', onUp);

          const worldEnd = screenToWorld(me.clientX, me.clientY);
          const minX = Math.min(world.x, worldEnd.x);
          const maxX = Math.max(world.x, worldEnd.x);
          const minY = Math.min(world.y, worldEnd.y);
          const maxY = Math.max(world.y, worldEnd.y);

          if (Math.abs(maxX - minX) > 5 && Math.abs(maxY - minY) > 5) {
            const newSelected = new Set(startSelected);
            cards.forEach((card) => {
              const cx = card.position.x + card.width / 2;
              const cy = card.position.y + card.height / 2;
              if (
                cx >= minX &&
                cx <= maxX &&
                cy >= minY &&
                cy <= maxY
              ) {
                if (e.shiftKey || startSelected.size === 0) {
                  newSelected.add(card.id);
                } else if (!startSelected.has(card.id)) {
                  newSelected.add(card.id);
                }
              }
            });
            setSelectedIds(newSelected);
          }
          setDragState(null);
        };

        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);

        setDragState({
          type: 'selection',
          startScreenX: e.clientX,
          startScreenY: e.clientY,
          selectionStartWorldX: world.x,
          selectionStartWorldY: world.y,
          currentScreenX: e.clientX,
          currentScreenY: e.clientY,
          selectedIdsAtStart: startSelected,
        });
        return;
      }

      if (e.button === 0) {
        const clickedCard = (e.target as HTMLElement).closest('[data-card-id]');
        if (!clickedCard && !editingLabelConnId) {
          setSelectedIds(new Set());
          const world = screenToWorld(e.clientX, e.clientY);
          onBlankClick(world.x, world.y);
        }
      }
    },
    [screenToWorld, cards, onBlankClick, selectedIds, editingLabelConnId]
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedIds.size > 0) {
        const active = document.activeElement;
        if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) {
          return;
        }
        e.preventDefault();
        engine.deleteCards(Array.from(selectedIds));
        setSelectedIds(new Set());
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedIds, engine]);

  const handleContentChange = useCallback(
    (id: string, title: string, content: string) => {
      engine.updateCard(id, { title, content });
    },
    [engine]
  );

  const handleColorCycle = useCallback(
    (id: string) => {
      engine.cycleCardColor(id);
    },
    [engine]
  );

  const handleSizeChange = useCallback(
    (id: string, width: number, height: number) => {
      engine.updateCardSize(id, width, height);
    },
    [engine]
  );

  const handleLabelDoubleClick = useCallback(
    (connId: string, e: React.MouseEvent) => {
      e.stopPropagation();
      const conn = connections.find((c) => c.id === connId);
      if (conn) {
        setEditingLabelConnId(connId);
        setEditingLabelText(conn.label);
      }
    },
    [connections]
  );

  const handleLabelEditBlur = useCallback(() => {
    if (editingLabelConnId) {
      engine.updateConnectionLabel(editingLabelConnId, editingLabelText || '相关联');
      setEditingLabelConnId(null);
    }
  }, [editingLabelConnId, editingLabelText, engine]);

  const handleMinimapDrag = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      const onMove = (me: MouseEvent) => {
        setDragState((ds) =>
          ds
            ? {
                ...ds,
                currentScreenX: me.clientX,
                currentScreenY: me.clientY,
              }
            : null
        );

        const bbox = (e.currentTarget as HTMLElement).getBoundingClientRect();
        const relX = (me.clientX - bbox.left) / MINIMAP_WIDTH;
        const relY = (me.clientY - bbox.top) / MINIMAP_HEIGHT;

        const bounds = getContentBounds();
        if (bounds) {
          const worldW = bounds.maxX - bounds.minX;
          const worldH = bounds.maxY - bounds.minY;
          const centerX = bounds.minX + worldW * relX;
          const centerY = bounds.minY + worldH * relY;
          setViewport((v) => ({
            ...v,
            x: -(centerX * v.zoom) + (canvasSize.w / 2),
            y: -(centerY * v.zoom) + (canvasSize.h / 2),
          }));
        }
      };
      const onUp = () => {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        setDragState(null);
      };
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
      setDragState({
        type: 'minimap',
        startScreenX: e.clientX,
        startScreenY: e.clientY,
      });
    },
    [canvasSize]
  );

  const getContentBounds = useCallback(() => {
    if (cards.length === 0) return null;
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;
    cards.forEach((c) => {
      minX = Math.min(minX, c.position.x);
      minY = Math.min(minY, c.position.y);
      maxX = Math.max(maxX, c.position.x + c.width);
      maxY = Math.max(maxY, c.position.y + c.height);
    });
    const pad = 200;
    return { minX: minX - pad, minY: minY - pad, maxX: maxX + pad, maxY: maxY + pad };
  }, [cards]);

  const selectionRect = useMemo(() => {
    if (
      dragState?.type !== 'selection' ||
      dragState.currentScreenX == null ||
      dragState.currentScreenY == null ||
      dragState.selectionStartWorldX == null ||
      dragState.selectionStartWorldY == null
    )
      return null;

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return null;

    const worldEnd = screenToWorld(dragState.currentScreenX, dragState.currentScreenY);
    const minX = Math.min(dragState.selectionStartWorldX, worldEnd.x);
    const minY = Math.min(dragState.selectionStartWorldY, worldEnd.y);
    const w = Math.abs(worldEnd.x - dragState.selectionStartWorldX);
    const h = Math.abs(worldEnd.y - dragState.selectionStartWorldY);

    return { x: minX, y: minY, w, h };
  }, [dragState, screenToWorld]);

  const previewConnection = useMemo(() => {
    if (
      dragState?.type !== 'connection' ||
      dragState.currentScreenX == null ||
      dragState.currentScreenY == null ||
      !dragState.connectionSourceId
    )
      return null;

    const src = engine.getCard(dragState.connectionSourceId);
    if (!src) return null;

    const srcScreen = worldToScreen(
      src.position.x + src.width / 2,
      src.position.y + src.height - 10
    );
    const targetWorld = screenToWorld(dragState.currentScreenX, dragState.currentScreenY);
    const tgtScreen = worldToScreen(targetWorld.x, targetWorld.y);

    return {
      srcScreen,
      tgtScreen,
      color: src.color,
    };
  }, [dragState, engine, worldToScreen, screenToWorld]);

  const minimapData = useMemo(() => {
    const bounds = getContentBounds();
    if (!bounds) return null;

    const worldW = bounds.maxX - bounds.minX;
    const worldH = bounds.maxY - bounds.minY;
    const scaleX = MINIMAP_WIDTH / worldW;
    const scaleY = MINIMAP_HEIGHT / worldH;
    const scale = Math.min(scaleX, scaleY);

    const points = cards.map((c) => ({
      x: (c.position.x - bounds.minX) * scale,
      y: (c.position.y - bounds.minY) * scale,
      w: Math.max(4, c.width * scale),
      h: Math.max(4, c.height * scale),
      color: c.color,
      selected: selectedIds.has(c.id),
    }));

    const viewportW = Math.max(20, (canvasSize.w / viewport.zoom) * scale);
    const viewportH = Math.max(20, (canvasSize.h / viewport.zoom) * scale);
    const viewportCenterWorldX = (-viewport.x / viewport.zoom) + (canvasSize.w / 2 / viewport.zoom);
    const viewportCenterWorldY = (-viewport.y / viewport.zoom) + (canvasSize.h / 2 / viewport.zoom);
    const viewportX = (viewportCenterWorldX - bounds.minX) * scale - viewportW / 2;
    const viewportY = (viewportCenterWorldY - bounds.minY) * scale - viewportH / 2;

    return { points, viewport: { x: viewportX, y: viewportY, w: viewportW, h: viewportH }, bounds, scale };
  }, [cards, getContentBounds, canvasSize, viewport, selectedIds]);

  const renderConnections = () => {
    const elements: JSX.Element[] = [];
    const defs: JSX.Element[] = [];
    const arrowColors = new Set<string>();

    connections.forEach((conn) => {
      const src = engine.getCard(conn.sourceId);
      const tgt = engine.getCard(conn.targetId);
      if (!src || !tgt) return;
      arrowColors.add(src.color);
    });

    arrowColors.forEach((color) => {
      defs.push(
        <marker
          key={`arrow-${color}`}
          id={`arrow-${color.replace('#', '')}`}
          viewBox="0 0 10 10"
          refX="9"
          refY="5"
          markerWidth="8"
          markerHeight="8"
          orient="auto-start-reverse"
        >
          <path d="M 0 0 L 10 5 L 0 10 z" fill={color} />
        </marker>
      );
    });

    connections.forEach((conn) => {
      const src = engine.getCard(conn.sourceId);
      const tgt = engine.getCard(conn.targetId);
      if (!src || !tgt) return;

      const { srcPoint, tgtPoint } = computeOptimalAnchors(src, tgt);
      const srcScreen = worldToScreen(srcPoint.x, srcPoint.y);
      const tgtScreen = worldToScreen(tgtPoint.x, tgtPoint.y);
      const path = buildBezierPath(srcScreen.x, srcScreen.y, tgtScreen.x, tgtScreen.y);
      const isHovered = hoveredConnId === conn.id;
      const isEditing = editingLabelConnId === conn.id;
      const stroke = src.color;
      const strokeWidth = isHovered ? 3 : 2;
      const markerEnd = `url(#arrow-${stroke.replace('#', '')})`;

      const midX = (srcScreen.x + tgtScreen.x) / 2;
      const midY = (srcScreen.y + tgtScreen.y) / 2;

      elements.push(
        <g key={conn.id}>
          <path
            d={path}
            stroke="transparent"
            strokeWidth={16}
            fill="none"
            style={{ cursor: 'pointer' }}
            onMouseEnter={() => setHoveredConnId(conn.id)}
            onMouseLeave={() => setHoveredConnId(null)}
          />
          <path
            d={path}
            stroke={stroke}
            strokeWidth={strokeWidth}
            fill="none"
            markerEnd={markerEnd}
            style={{
              transition: 'stroke-width 0.15s ease, opacity 0.15s ease',
              pointerEvents: 'none',
            }}
          />
          {(isHovered || isEditing) && (
            <foreignObject x={midX - 40} y={midY - 14} width={80} height={28}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  width: '100%',
                  height: '100%',
                }}
              >
                {isEditing ? (
                  <input
                    autoFocus
                    value={editingLabelText}
                    onChange={(e) => setEditingLabelText(e.target.value)}
                    onBlur={handleLabelEditBlur}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleLabelEditBlur();
                      if (e.key === 'Escape') {
                        setEditingLabelConnId(null);
                      }
                    }}
                    style={{
                      fontSize: 11,
                      padding: '3px 8px',
                      borderRadius: 4,
                      border: '1px solid #4A90D9',
                      outline: 'none',
                      background: '#fff',
                      width: 76,
                      textAlign: 'center',
                      fontFamily: 'inherit',
                    }}
                  />
                ) : (
                  <div
                    onDoubleClick={(e) => handleLabelDoubleClick(conn.id, e)}
                    style={{
                      fontSize: 11,
                      padding: '3px 10px',
                      background: 'rgba(255,255,255,0.95)',
                      borderRadius: 4,
                      color: '#2C3E50',
                      boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      border: `1px solid ${stroke}44`,
                    }}
                    title="双击修改标签"
                  >
                    {conn.label || '相关联'}
                  </div>
                )}
              </div>
            </foreignObject>
          )}
        </g>
      );
    });

    return (
      <svg
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: canvasSize.w,
          height: canvasSize.h,
          pointerEvents: 'none',
          zIndex: 1,
        }}
      >
        <defs>{defs}</defs>
        <g style={{ pointerEvents: 'auto' }}>{elements}</g>
        {previewConnection && (
          <path
            d={buildBezierPath(
              previewConnection.srcScreen.x,
              previewConnection.srcScreen.y,
              previewConnection.tgtScreen.x,
              previewConnection.tgtScreen.y
            )}
            stroke={previewConnection.color}
            strokeWidth={2}
            strokeDasharray="6 4"
            fill="none"
            opacity={0.8}
          />
        )}
      </svg>
    );
  };

  return (
    <div
      ref={canvasRef}
      onWheel={handleWheel}
      onMouseDown={handleCanvasMouseDown}
      style={{
        flex: 1,
        position: 'relative',
        overflow: 'hidden',
        backgroundImage:
          'radial-gradient(circle, rgba(44,62,80,0.05) 1px, transparent 1px)',
        backgroundSize: `${15 * viewport.zoom}px ${15 * viewport.zoom}px`,
        backgroundPosition: `${viewport.x}px ${viewport.y}px`,
        cursor: dragState?.type === 'pan' ? 'grabbing' : 'default',
      }}
    >
      {renderConnections()}

      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          zIndex: 2,
        }}
      >
        <div
          style={{
            position: 'absolute',
            transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
            transformOrigin: '0 0',
            pointerEvents: 'none',
            width: 1,
            height: 1,
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              pointerEvents: 'auto',
            }}
          >
            {cards.map((card) => (
              <NoteCardComponent
                key={card.id}
                card={card}
                selected={selectedIds.has(card.id)}
                isNew={newlyCreatedId === card.id}
                onSelect={handleCardSelect}
                onDragStart={handleCardDragStart}
                onContentChange={handleContentChange}
                onColorCycle={handleColorCycle}
                onConnectionStart={handleConnectionStart}
                onSizeChange={handleSizeChange}
                zoom={viewport.zoom}
              />
            ))}
          </div>
        </div>
      </div>

      {selectionRect && (
        <div
          style={{
            position: 'absolute',
            left: selectionRect.x * viewport.zoom + viewport.x,
            top: selectionRect.y * viewport.zoom + viewport.y,
            width: selectionRect.w * viewport.zoom,
            height: selectionRect.h * viewport.zoom,
            background: 'rgba(74, 144, 217, 0.15)',
            border: '2px solid rgba(74, 144, 217, 0.7)',
            borderRadius: 6,
            pointerEvents: 'none',
            zIndex: 50,
          }}
        />
      )}

      {minimapData && (
        <div
          style={{
            position: 'absolute',
            bottom: 16,
            left: 16,
            width: MINIMAP_WIDTH,
            height: MINIMAP_HEIGHT,
            background: 'rgba(255,255,255,0.9)',
            backdropFilter: 'blur(8px)',
            borderRadius: 10,
            border: '1px solid rgba(0,0,0,0.08)',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            padding: 6,
            zIndex: 60,
            overflow: 'hidden',
            cursor: 'grab',
          }}
          onMouseDown={handleMinimapDrag}
        >
          <svg
            width={MINIMAP_WIDTH - 12}
            height={MINIMAP_HEIGHT - 12}
            style={{ display: 'block' }}
          >
            {minimapData.points.map((p, i) => (
              <rect
                key={i}
                x={p.x}
                y={p.y}
                width={Math.min(p.w, 6)}
                height={Math.min(p.h, 6)}
                fill={p.color}
                opacity={p.selected ? 1 : 0.7}
                rx={1}
              />
            ))}
            <rect
              x={Math.max(0, Math.min(MINIMAP_WIDTH - minimapData.viewport.w - 12, minimapData.viewport.x))}
              y={Math.max(0, Math.min(MINIMAP_HEIGHT - minimapData.viewport.h - 12, minimapData.viewport.y))}
              width={Math.min(minimapData.viewport.w, MINIMAP_WIDTH - 12)}
              height={Math.min(minimapData.viewport.h, MINIMAP_HEIGHT - 12)}
              fill="none"
              stroke="#4A90D9"
              strokeWidth={2}
              rx={2}
              style={{ pointerEvents: 'none' }}
            />
          </svg>
        </div>
      )}

      {selectedIds.size > 0 && (
        <div
          style={{
            position: 'absolute',
            top: 72,
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(44,62,80,0.9)',
            color: '#fff',
            padding: '6px 16px',
            borderRadius: 20,
            fontSize: 13,
            zIndex: 80,
            backdropFilter: 'blur(4px)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
          }}
        >
          已选中 {selectedIds.size} 张卡片 · 按 Delete 删除
        </div>
      )}

      <style>{`
        button:hover {
          transform: scale(1.05);
        }
        input[type="range"] {
          transition: all 0.2s ease;
        }
        ::-webkit-scrollbar {
          width: 4px;
          height: 4px;
        }
        ::-webkit-scrollbar-thumb {
          background: rgba(74,144,217,0.3);
          border-radius: 2px;
        }
      `}</style>
    </div>
  );
};

export default ConnectionCanvas;
