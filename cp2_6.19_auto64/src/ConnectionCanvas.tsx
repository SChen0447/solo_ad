import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { NoteCard as NoteCardType, Connection, Position } from './types';
import NoteCard from './NoteCard';
import { GraphEngine } from './GraphEngine';

interface ConnectionCanvasProps {
  cards: NoteCardType[];
  connections: Connection[];
  engine: GraphEngine;
  scale: number;
  onScaleChange: (s: number) => void;
  onCanvasClick: (position: Position) => void;
  onCardsChange: (cards: NoteCardType[]) => void;
  onConnectionsChange: (connections: Connection[]) => void;
  onAddConnection: (sourceId: string, targetId: string) => void;
  onUpdateConnectionLabel: (id: string, label: string) => void;
}

const ConnectionCanvas: React.FC<ConnectionCanvasProps> = ({
  cards,
  connections,
  engine,
  scale,
  onScaleChange,
  onCanvasClick,
  onCardsChange,
  onConnectionsChange,
  onAddConnection,
  onUpdateConnectionLabel
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [translate, setTranslate] = useState<Position>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef<Position>({ x: 0, y: 0 });
  const translateStart = useRef<Position>({ x: 0, y: 0 });

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBoxSelecting, setIsBoxSelecting] = useState(false);
  const [boxSelectStart, setBoxSelectStart] = useState<Position | null>(null);
  const [boxSelectEnd, setBoxSelectEnd] = useState<Position | null>(null);

  const [connecting, setConnecting] = useState<{
    sourceId: string;
    startPos: Position;
    currentPos: Position;
  } | null>(null);

  const [hoveredConnection, setHoveredConnection] = useState<string | null>(null);
  const [editingLabelId, setEditingLabelId] = useState<string | null>(null);
  const [editingLabelText, setEditingLabelText] = useState('');

  const [cardHeights, setCardHeights] = useState<Map<string, number>>(new Map());

  const handleHeightUpdate = useCallback((id: string, height: number) => {
    setCardHeights((prev) => {
      if (prev.get(id) === height) return prev;
      const next = new Map(prev);
      next.set(id, height);
      return next;
    });
  }, []);

  const syncEngineCards = useCallback(() => {
    engine.getAllCards().forEach((card) => {
      const h = cardHeights.get(card.id);
      if (h) {
        engine.updateCard(card.id, { height: h });
      }
    });
  }, [engine, cardHeights]);

  const screenToWorld = useCallback(
    (screenX: number, screenY: number): Position => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return { x: screenX, y: screenY };
      const x = (screenX - rect.left - translate.x) / scale;
      const y = (screenY - rect.top - translate.y) / scale;
      return { x, y };
    },
    [scale, translate]
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.target !== e.currentTarget && !(e.target as HTMLElement).classList.contains('canvas-bg')) {
        return;
      }

      if (e.button === 1) {
        e.preventDefault();
        setIsPanning(true);
        panStart.current = { x: e.clientX, y: e.clientY };
        translateStart.current = { ...translate };
        return;
      }

      if (e.button === 0 && e.ctrlKey) {
        e.preventDefault();
        const worldPos = screenToWorld(e.clientX, e.clientY);
        setIsBoxSelecting(true);
        setBoxSelectStart(worldPos);
        setBoxSelectEnd(worldPos);
        return;
      }

      if (e.button === 0 && !e.ctrlKey) {
        setSelectedIds(new Set());
        const rect = containerRef.current?.getBoundingClientRect();
        if (rect) {
          const worldPos = screenToWorld(e.clientX, e.clientY);
          onCanvasClick(worldPos);
        }
      }
    },
    [translate, onCanvasClick, screenToWorld]
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (isPanning) {
        const dx = e.clientX - panStart.current.x;
        const dy = e.clientY - panStart.current.y;
        setTranslate({
          x: translateStart.current.x + dx,
          y: translateStart.current.y + dy
        });
        return;
      }

      if (isBoxSelecting && boxSelectStart) {
        const worldPos = screenToWorld(e.clientX, e.clientY);
        setBoxSelectEnd(worldPos);

        const minX = Math.min(boxSelectStart.x, worldPos.x);
        const maxX = Math.max(boxSelectStart.x, worldPos.x);
        const minY = Math.min(boxSelectStart.y, worldPos.y);
        const maxY = Math.max(boxSelectStart.y, worldPos.y);

        const newSelected = new Set<string>();
        cards.forEach((card) => {
          const w = card.width || 220;
          const h = cardHeights.get(card.id) || 150;
          if (
            card.position.x + w >= minX &&
            card.position.x <= maxX &&
            card.position.y + h >= minY &&
            card.position.y <= maxY
          ) {
            newSelected.add(card.id);
          }
        });
        setSelectedIds(newSelected);
      }
    },
    [isPanning, isBoxSelecting, boxSelectStart, cards, cardHeights, screenToWorld]
  );

  const handleMouseUp = useCallback(() => {
    if (isPanning) {
      setIsPanning(false);
    }
    if (isBoxSelecting) {
      setIsBoxSelecting(false);
      setBoxSelectStart(null);
      setBoxSelectEnd(null);
    }
  }, [isPanning, isBoxSelecting]);

  useEffect(() => {
    if (isPanning || isBoxSelecting) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isPanning, isBoxSelecting, handleMouseMove, handleMouseUp]);

  const handleWheel = useCallback(
    (e: WheelEvent) => {
      if (!containerRef.current) return;
      e.preventDefault();
      const rect = containerRef.current.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const delta = -e.deltaY;
      const zoomFactor = delta > 0 ? 1.1 : 0.9;
      let newScale = scale * zoomFactor;
      newScale = Math.max(0.5, Math.min(3, newScale));

      const worldX = (mouseX - translate.x) / scale;
      const worldY = (mouseY - translate.y) / scale;

      const newTranslateX = mouseX - worldX * newScale;
      const newTranslateY = mouseY - worldY * newScale;

      setTranslate({ x: newTranslateX, y: newTranslateY });
      onScaleChange(newScale);
    },
    [scale, translate, onScaleChange]
  );

  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      container.addEventListener('wheel', handleWheel, { passive: false });
      return () => container.removeEventListener('wheel', handleWheel);
    }
  }, [handleWheel]);

  const handleCardPositionChange = useCallback(
    (id: string, position: Position) => {
      const updated = engine.updateCardPosition(id, position);
      if (updated) {
        const newCards = cards.map((c) => (c.id === id ? updated : c));
        onCardsChange(newCards);
      }
    },
    [cards, engine, onCardsChange]
  );

  const handleCardColorChange = useCallback(
    (id: string) => {
      const updated = engine.cycleCardColor(id);
      if (updated) {
        const newCards = cards.map((c) => (c.id === id ? updated : c));
        onCardsChange(newCards);
      }
    },
    [cards, engine, onCardsChange]
  );

  const handleStartConnection = useCallback((sourceId: string, startPos: Position) => {
    setConnecting({ sourceId, startPos, currentPos: startPos });
  }, []);

  const handleUpdateConnectionStart = useCallback((pos: Position) => {
    setConnecting((prev) => (prev ? { ...prev, currentPos: pos } : null));
  }, []);

  const handleEndConnection = useCallback(
    (targetId: string) => {
      if (connecting && targetId) {
        onAddConnection(connecting.sourceId, targetId);
      }
      setConnecting(null);
    },
    [connecting, onAddConnection]
  );

  const handleUpdateCardContent = useCallback(
    (id: string, updates: Partial<NoteCardType>) => {
      const updated = engine.updateCard(id, updates);
      if (updated) {
        const newCards = cards.map((c) => (c.id === id ? updated : c));
        onCardsChange(newCards);
      }
    },
    [cards, engine, onCardsChange]
  );

  const handleCardMouseDown = useCallback(
    (e: React.MouseEvent, id: string) => {
      if (e.shiftKey) {
        setSelectedIds((prev) => {
          const next = new Set(prev);
          if (next.has(id)) {
            next.delete(id);
          } else {
            next.add(id);
          }
          return next;
        });
      } else if (!selectedIds.has(id)) {
        setSelectedIds(new Set([id]));
      }
    },
    [selectedIds]
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedIds.size > 0 && editingLabelId === null) {
          e.preventDefault();
          const idsArray = Array.from(selectedIds);
          engine.deleteCards(idsArray);
          const newCards = cards.filter((c) => !selectedIds.has(c.id));
          const relatedConnIds = new Set<string>();
          connections.forEach((conn) => {
            if (idsArray.includes(conn.sourceId) || idsArray.includes(conn.targetId)) {
              relatedConnIds.add(conn.id);
            }
          });
          const newConns = connections.filter((c) => !relatedConnIds.has(c.id));
          onCardsChange(newCards);
          onConnectionsChange(newConns);
          setSelectedIds(new Set());
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedIds, cards, connections, engine, editingLabelId, onCardsChange, onConnectionsChange]);

  const renderConnections = useMemo(() => {
    return connections.map((conn) => {
      const sourceCard = cards.find((c) => c.id === conn.sourceId);
      const targetCard = cards.find((c) => c.id === conn.targetId);
      if (!sourceCard || !targetCard) return null;

      const sourceH = cardHeights.get(conn.sourceId) || 150;
      const targetH = cardHeights.get(conn.targetId) || 150;
      const sourceW = sourceCard.width || 220;
      const targetW = targetCard.width || 220;

      const start: Position = {
        x: sourceCard.position.x + sourceW,
        y: sourceCard.position.y + sourceH / 2
      };
      const end: Position = {
        x: targetCard.position.x,
        y: targetCard.position.y + targetH / 2
      };

      const path = engine.getBezierPath(start, end);
      const isHovered = hoveredConnection === conn.id;
      const strokeWidth = isHovered ? 3 : 2;

      const dx = end.x - start.x;
      const dy = end.y - start.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const arrowAngle = Math.atan2(dy, dx);
      const arrowLength = 10;
      const arrowP1X = end.x - arrowLength * Math.cos(arrowAngle - Math.PI / 6);
      const arrowP1Y = end.y - arrowLength * Math.sin(arrowAngle - Math.PI / 6);
      const arrowP2X = end.x - arrowLength * Math.cos(arrowAngle + Math.PI / 6);
      const arrowP2Y = end.y - arrowLength * Math.sin(arrowAngle + Math.PI / 6);

      const midX = (start.x + end.x) / 2;
      const midY = (start.y + end.y) / 2;

      return (
        <g key={conn.id}>
          <path
            d={path}
            stroke="transparent"
            strokeWidth={16}
            fill="none"
            style={{ cursor: 'pointer' }}
            onMouseEnter={() => setHoveredConnection(conn.id)}
            onMouseLeave={() => setHoveredConnection(null)}
            onDoubleClick={() => {
              setEditingLabelId(conn.id);
              setEditingLabelText(conn.label);
            }}
          />
          <path
            d={path}
            stroke={sourceCard.color}
            strokeWidth={strokeWidth}
            fill="none"
            style={{
              transition: 'stroke-width 0.2s ease',
              pointerEvents: 'none'
            }}
          />
          <polygon
            points={`${end.x},${end.y} ${arrowP1X},${arrowP1Y} ${arrowP2X},${arrowP2Y}`}
            fill={sourceCard.color}
            style={{ pointerEvents: 'none' }}
          />
          {isHovered && (
            <g>
              <rect
                x={midX - conn.label.length * 8 - 10}
                y={midY - 14}
                rx={6}
                ry={6}
                width={conn.label.length * 16 + 20}
                height={28}
                fill="rgba(255,255,255,0.95)"
                stroke="rgba(0,0,0,0.08)"
                strokeWidth={1}
                style={{ filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.1))' }}
              />
              <text
                x={midX}
                y={midY + 5}
                textAnchor="middle"
                fontSize={13}
                fill="#2C3E50"
                style={{ userSelect: 'none' }}
                onDoubleClick={() => {
                  setEditingLabelId(conn.id);
                  setEditingLabelText(conn.label);
                }}
              >
                {conn.label}
              </text>
            </g>
          )}
          {editingLabelId === conn.id && (
            <foreignObject x={midX - 100} y={midY - 20} width={200} height={40}>
              <input
                autoFocus
                value={editingLabelText}
                onChange={(e) => setEditingLabelText(e.target.value)}
                onBlur={() => {
                  onUpdateConnectionLabel(conn.id, editingLabelText);
                  setEditingLabelId(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    onUpdateConnectionLabel(conn.id, editingLabelText);
                    setEditingLabelId(null);
                  }
                }}
                style={{
                  width: '100%',
                  height: 32,
                  border: '1px solid #4A90D9',
                  borderRadius: 6,
                  padding: '0 8px',
                  fontSize: 13,
                  outline: 'none',
                  background: 'white'
                }}
              />
            </foreignObject>
          )}
          {dist < 1 && null}
        </g>
      );
    });
  }, [connections, cards, cardHeights, engine, hoveredConnection, editingLabelId, editingLabelText, onUpdateConnectionLabel]);

  const renderConnectingLine = useMemo(() => {
    if (!connecting) return null;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return null;

    const worldStart = screenToWorld(connecting.startPos.x, connecting.startPos.y);
    const worldEnd = screenToWorld(connecting.currentPos.x, connecting.currentPos.y);

    const sourceCard = cards.find((c) => c.id === connecting.sourceId);
    const color = sourceCard?.color || '#4A90D9';

    const path = engine.getBezierPath(worldStart, worldEnd);

    const dx = worldEnd.x - worldStart.x;
    const dy = worldEnd.y - worldStart.y;
    const arrowAngle = Math.atan2(dy, dx);
    const arrowLength = 10;
    const arrowP1X = worldEnd.x - arrowLength * Math.cos(arrowAngle - Math.PI / 6);
    const arrowP1Y = worldEnd.y - arrowLength * Math.sin(arrowAngle - Math.PI / 6);
    const arrowP2X = worldEnd.x - arrowLength * Math.cos(arrowAngle + Math.PI / 6);
    const arrowP2Y = worldEnd.y - arrowLength * Math.sin(arrowAngle + Math.PI / 6);

    return (
      <g>
        <path d={path} stroke={color} strokeWidth={2} fill="none" strokeDasharray="6 4" opacity={0.8} />
        <polygon
          points={`${worldEnd.x},${worldEnd.y} ${arrowP1X},${arrowP1Y} ${arrowP2X},${arrowP2Y}`}
          fill={color}
          opacity={0.8}
        />
      </g>
    );
  }, [connecting, cards, engine, screenToWorld]);

  const boxSelectRect = useMemo(() => {
    if (!boxSelectStart || !boxSelectEnd) return null;
    const x = Math.min(boxSelectStart.x, boxSelectEnd.x);
    const y = Math.min(boxSelectStart.y, boxSelectEnd.y);
    const w = Math.abs(boxSelectEnd.x - boxSelectStart.x);
    const h = Math.abs(boxSelectEnd.y - boxSelectStart.y);
    return { x, y, w, h };
  }, [boxSelectStart, boxSelectEnd]);

  const miniMapBounds = useMemo(() => {
    if (cards.length === 0) {
      return { minX: 0, minY: 0, maxX: 1000, maxY: 800 };
    }
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;
    cards.forEach((c) => {
      minX = Math.min(minX, c.position.x);
      minY = Math.min(minY, c.position.y);
      const w = c.width || 220;
      const h = cardHeights.get(c.id) || 150;
      maxX = Math.max(maxX, c.position.x + w);
      maxY = Math.max(maxY, c.position.y + h);
    });
    const padding = 200;
    return {
      minX: minX - padding,
      minY: minY - padding,
      maxX: maxX + padding,
      maxY: maxY + padding
    };
  }, [cards, cardHeights]);

  const MINIMAP_SIZE = 180;
  const worldWidth = miniMapBounds.maxX - miniMapBounds.minX;
  const worldHeight = miniMapBounds.maxY - miniMapBounds.minY;
  const minimapScale = Math.min(MINIMAP_SIZE / worldWidth, MINIMAP_SIZE / worldHeight);
  const minimapW = worldWidth * minimapScale;
  const minimapH = worldHeight * minimapScale;

  const handleMinimapViewportDrag = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      const minimapEl = (e.currentTarget as HTMLElement).parentElement;
      const startClientX = e.clientX;
      const startClientY = e.clientY;

      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;

      const startTranslate = { ...translate };

      const handleMove = (ev: MouseEvent) => {
        const dx = ev.clientX - startClientX;
        const dy = ev.clientY - startClientY;
        const worldDx = -dx / minimapScale;
        const worldDy = -dy / minimapScale;
        setTranslate({
          x: startTranslate.x + worldDx * scale,
          y: startTranslate.y + worldDy * scale
        });
      };

      const handleUp = () => {
        window.removeEventListener('mousemove', handleMove);
        window.removeEventListener('mouseup', handleUp);
      };

      window.addEventListener('mousemove', handleMove);
      window.addEventListener('mouseup', handleUp);
    },
    [translate, scale, minimapScale]
  );

  return (
    <div
      ref={containerRef}
      className="canvas-bg"
      onMouseDown={handleMouseDown}
      style={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        cursor: isPanning ? 'grabbing' : isBoxSelecting ? 'crosshair' : 'default',
        backgroundImage: `
          linear-gradient(rgba(44, 62, 80, 0.05) 1px, transparent 1px),
          linear-gradient(90deg, rgba(44, 62, 80, 0.05) 1px, transparent 1px)
        `,
        backgroundSize: `${15 * scale}px ${15 * scale}px`,
        backgroundPosition: `${translate.x}px ${translate.y}px`,
        backgroundColor: '#F8FAFC'
      }}
    >
      <div
        style={{
          position: 'absolute',
          transformOrigin: '0 0',
          transform: `translate(${translate.x}px, ${translate.y}px) scale(${scale})`,
          width: '100%',
          height: '100%',
          willChange: 'transform'
        }}
      >
        <svg
          style={{
            position: 'absolute',
            inset: 0,
            width: '100vw',
            height: '100vh',
            overflow: 'visible',
            pointerEvents: 'none'
          }}
        >
          <g style={{ pointerEvents: 'auto' }}>{renderConnections}</g>
          <g>{renderConnectingLine}</g>
          {boxSelectRect && (
            <rect
              x={boxSelectRect.x}
              y={boxSelectRect.y}
              width={boxSelectRect.w}
              height={boxSelectRect.h}
              fill="rgba(74, 144, 217, 0.15)"
              stroke="#4A90D9"
              strokeWidth={1.5}
              rx={6}
              ry={6}
              style={{ pointerEvents: 'none' }}
            />
          )}
        </svg>

        {cards.map((card) => (
          <NoteCard
            key={card.id}
            card={{ ...card, height: cardHeights.get(card.id) }}
            isSelected={selectedIds.has(card.id)}
            onPositionChange={handleCardPositionChange}
            onColorChange={handleCardColorChange}
            onStartConnection={handleStartConnection}
            onUpdateConnectionStart={handleUpdateConnectionStart}
            onEndConnection={handleEndConnection}
            onUpdateCardContent={handleUpdateCardContent}
            onHeightUpdate={handleHeightUpdate}
            onMouseDown={handleCardMouseDown}
          />
        ))}
      </div>

      <div
        style={{
          position: 'absolute',
          left: 20,
          bottom: 20,
          width: minimapW + 14,
          height: minimapH + 14,
          padding: 7,
          borderRadius: 12,
          background: 'rgba(255, 255, 255, 0.85)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(255, 255, 255, 0.6)',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
          zIndex: 500
        }}
      >
        <svg
          width={minimapW}
          height={minimapH}
          style={{
            display: 'block',
            borderRadius: 6,
            background: '#F1F5F9'
          }}
        >
          {cards.map((c) => {
            const cx = (c.position.x - miniMapBounds.minX) * minimapScale + 3;
            const cy = (c.position.y - miniMapBounds.minY) * minimapScale + 3;
            return (
              <circle
                key={c.id}
                cx={cx}
                cy={cy}
                r={3}
                fill={c.color}
                opacity={0.9}
              />
            );
          })}
          <rect
            x={(-translate.x / scale - miniMapBounds.minX) * minimapScale}
            y={(-translate.y / scale - miniMapBounds.minY) * minimapScale}
            width={(containerRef.current?.clientWidth || 1000) / scale * minimapScale}
            height={(containerRef.current?.clientHeight || 800) / scale * minimapScale}
            fill="rgba(74, 144, 217, 0.2)"
            stroke="#4A90D9"
            strokeWidth={1.5}
            rx={2}
            ry={2}
            style={{
              cursor: 'move'
            }}
            onMouseDown={handleMinimapViewportDrag}
            ref={() => {}}
          />
        </svg>
      </div>
    </div>
  );
};

export default ConnectionCanvas;
