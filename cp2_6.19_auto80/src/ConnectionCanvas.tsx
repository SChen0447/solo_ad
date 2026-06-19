import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import type { NoteCard as NoteCardType, Connection as ConnectionType } from './types';
import { DEFAULT_CARD_WIDTH } from './types';
import NoteCard from './NoteCard';
import { calculateBezierPath } from './GraphEngine';

interface ConnectionCanvasProps {
  cards: NoteCardType[];
  connections: ConnectionType[];
  scale: number;
  offset: { x: number; y: number };
  selectedCardIds: Set<string>;
  onScaleChange: (scale: number) => void;
  onOffsetChange: (offset: { x: number; y: number }) => void;
  onCardPositionChange: (id: string, position: { x: number; y: number }) => void;
  onCardColorCycle: (id: string) => void;
  onCardUpdate: (id: string, updates: Partial<Omit<NoteCardType, 'id'>>) => void;
  onCardDelete: (id: string) => void;
  onCardsDelete: (ids: string[]) => void;
  onAddConnection: (sourceId: string, targetId: string, label?: string) => void;
  onConnectionLabelUpdate: (id: string, label: string) => void;
  onCanvasClick: (worldPos: { x: number; y: number }, screenPos: { x: number; y: number }) => void;
  onSelectionChange: (selectedIds: Set<string>) => void;
}

interface ActiveConnection {
  sourceId: string;
  startScreenPos: { x: number; y: number };
  currentScreenPos: { x: number; y: number };
}

interface HoveredConnection {
  connectionId: string;
}

export const ConnectionCanvas: React.FC<ConnectionCanvasProps> = ({
  cards,
  connections,
  scale,
  offset,
  selectedCardIds,
  onScaleChange,
  onOffsetChange,
  onCardPositionChange,
  onCardColorCycle,
  onCardUpdate,
  onCardDelete,
  onCardsDelete,
  onAddConnection,
  onConnectionLabelUpdate,
  onCanvasClick,
  onSelectionChange,
}) => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef<{ x: number; y: number; offsetX: number; offsetY: number } | null>(null);

  const [isBoxSelecting, setIsBoxSelecting] = useState(false);
  const boxSelectStartRef = useRef<{ x: number; y: number } | null>(null);
  const [boxSelectRect, setBoxSelectRect] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const boxSelectInitialSelection = useRef<Set<string>>(new Set());

  const [activeConnection, setActiveConnection] = useState<ActiveConnection | null>(null);
  const [hoveredConnection, setHoveredConnection] = useState<HoveredConnection | null>(null);
  const [editingLabelId, setEditingLabelId] = useState<string | null>(null);
  const [editingLabelText, setEditingLabelText] = useState('');

  const cardHeightMap = useRef<Map<string, number>>(new Map());

  const screenToWorld = useCallback((screenX: number, screenY: number) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return {
      x: (screenX - rect.left - offset.x) / scale,
      y: (screenY - rect.top - offset.y) / scale,
    };
  }, [offset, scale]);

  const worldToScreen = useCallback((worldX: number, worldY: number) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return {
      x: worldX * scale + offset.x + rect.left,
      y: worldY * scale + offset.y + rect.top,
    };
  }, [offset, scale]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newScale = Math.min(3, Math.max(0.5, scale * delta));

    const scaleRatio = newScale / scale;
    const newOffsetX = mouseX - (mouseX - offset.x) * scaleRatio;
    const newOffsetY = mouseY - (mouseY - offset.y) * scaleRatio;

    onScaleChange(newScale);
    onOffsetChange({ x: newOffsetX, y: newOffsetY });
  }, [scale, offset, onScaleChange, onOffsetChange]);

  const handleCanvasMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      e.preventDefault();
      setIsPanning(true);
      panStartRef.current = {
        x: e.clientX,
        y: e.clientY,
        offsetX: offset.x,
        offsetY: offset.y,
      };
      return;
    }

    if (e.button === 0 && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      setIsBoxSelecting(true);
      boxSelectStartRef.current = { x: e.clientX, y: e.clientY };
      boxSelectInitialSelection.current = new Set(selectedCardIds);
      setBoxSelectRect({ x: e.clientX, y: e.clientY, width: 0, height: 0 });
      return;
    }

    if (e.button === 0 && !activeConnection) {
      const worldPos = screenToWorld(e.clientX, e.clientY);
      const screenPos = { x: e.clientX, y: e.clientY };
      const target = e.target as HTMLElement;
      if (target === canvasRef.current || target.closest('.canvas-bg')) {
        onSelectionChange(new Set());
        onCanvasClick(worldPos, screenPos);
      }
    }
  }, [offset, e, selectedCardIds, activeConnection, screenToWorld, onCanvasClick, onSelectionChange]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isPanning && panStartRef.current) {
        const dx = e.clientX - panStartRef.current.x;
        const dy = e.clientY - panStartRef.current.y;
        onOffsetChange({
          x: panStartRef.current.offsetX + dx,
          y: panStartRef.current.offsetY + dy,
        });
      }

      if (isBoxSelecting && boxSelectStartRef.current) {
        const startX = Math.min(boxSelectStartRef.current.x, e.clientX);
        const startY = Math.min(boxSelectStartRef.current.y, e.clientY);
        const width = Math.abs(e.clientX - boxSelectStartRef.current.x);
        const height = Math.abs(e.clientY - boxSelectStartRef.current.y);

        const rect = canvasRef.current?.getBoundingClientRect();
        if (rect) {
          setBoxSelectRect({
            x: startX - rect.left,
            y: startY - rect.top,
            width,
            height,
          });

          const newSelection = new Set(boxSelectInitialSelection.current);
          cards.forEach((card) => {
            const cardScreenX = card.position.x * scale + offset.x;
            const cardScreenY = card.position.y * scale + offset.y;
            const cardWidth = DEFAULT_CARD_WIDTH * scale;
            const cardHeight = (cardHeightMap.current.get(card.id) || 150) * scale;

            if (
              cardScreenX < startX - rect.left + width &&
              cardScreenX + cardWidth > startX - rect.left &&
              cardScreenY < startY - rect.top + height &&
              cardScreenY + cardHeight > startY - rect.top
            ) {
              newSelection.add(card.id);
            }
          });
          onSelectionChange(newSelection);
        }
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (isPanning) {
        setIsPanning(false);
        panStartRef.current = null;
      }
      if (isBoxSelecting) {
        setIsBoxSelecting(false);
        boxSelectStartRef.current = null;
        setBoxSelectRect(null);
      }
    };

    if (isPanning || isBoxSelecting) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isPanning, isBoxSelecting, cards, scale, offset, onOffsetChange, onSelectionChange]);

  const handleStartConnection = useCallback((sourceId: string, startPos: { x: number; y: number }) => {
    setActiveConnection({
      sourceId,
      startScreenPos: startPos,
      currentScreenPos: startPos,
    });
  }, []);

  const handleConnectionDrag = useCallback((currentPos: { x: number; y: number }) => {
    setActiveConnection((prev) => prev ? { ...prev, currentScreenPos: currentPos } : null);
  }, []);

  const handleEndConnection = useCallback((targetId: string | null) => {
    if (activeConnection && targetId) {
      onAddConnection(activeConnection.sourceId, targetId);
    }
    setActiveConnection(null);
  }, [activeConnection, onAddConnection]);

  const handleCardMouseDown = useCallback((e: React.MouseEvent, id: string) => {
    // 预留处理逻辑
  }, []);

  const handleSelectCard = useCallback((id: string, additive: boolean) => {
    const newSelection = additive ? new Set(selectedCardIds) : new Set();
    if (additive && selectedCardIds.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    onSelectionChange(newSelection);
  }, [selectedCardIds, onSelectionChange]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedCardIds.size > 0) {
        const activeElement = document.activeElement;
        if (
          activeElement &&
          (activeElement.tagName === 'INPUT' ||
            activeElement.tagName === 'TEXTAREA' ||
            activeElement.isContentEditable)
        ) {
          return;
        }
        e.preventDefault();
        onCardsDelete(Array.from(selectedCardIds));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedCardIds, onCardsDelete]);

  const cardMap = useMemo(() => {
    const map = new Map<string, NoteCardType>();
    cards.forEach((c) => map.set(c.id, c));
    return map;
  }, [cards]);

  const renderConnections = () => {
    return connections.map((conn) => {
      const sourceCard = cardMap.get(conn.sourceId);
      const targetCard = cardMap.get(conn.targetId);
      if (!sourceCard || !targetCard) return null;

      const sourceHeight = cardHeightMap.current.get(sourceCard.id) || 150;
      const targetHeight = cardHeightMap.current.get(targetCard.id) || 150;
      const { path, arrowPos, angle } = calculateBezierPath(
        sourceCard.position,
        targetCard.position,
        DEFAULT_CARD_WIDTH,
        sourceHeight
      );

      const isHovered = hoveredConnection?.connectionId === conn.id;
      const strokeWidth = isHovered ? 3 : 2;
      const arrowSize = 8;
      const arrowPoints = [
        { x: 0, y: 0 },
        { x: -arrowSize, y: arrowSize * 0.6 },
        { x: -arrowSize, y: -arrowSize * 0.6 },
      ].map(p => {
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        return `${arrowPos.x + p.x * cos - p.y * sin},${arrowPos.y + p.x * sin + p.y * cos}`;
      }).join(' ');

      const midT = 0.5;
      const sourceCenter = { x: sourceCard.position.x + DEFAULT_CARD_WIDTH / 2, y: sourceCard.position.y + sourceHeight / 2 };
      const targetCenter = { x: targetCard.position.x + DEFAULT_CARD_WIDTH / 2, y: targetCard.position.y + targetHeight / 2 };
      const dx = targetCenter.x - sourceCenter.x;
      const dy = targetCenter.y - sourceCenter.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const controlOffset = Math.min(distance * 0.5, 150);
      const cp1x = sourceCenter.x + dx * 0.25;
      const cp1y = sourceCenter.y + (dy * 0.25 - controlOffset * 0.3);
      const cp2x = sourceCenter.x + dx * 0.75;
      const cp2y = sourceCenter.y + (dy * 0.75 + controlOffset * 0.3);

      const labelX = sourceCenter.x * Math.pow(1 - midT, 3) + 3 * cp1x * midT * Math.pow(1 - midT, 2) + 3 * cp2x * midT * midT * (1 - midT) + targetCenter.x * Math.pow(midT, 3);
      const labelY = sourceCenter.y * Math.pow(1 - midT, 3) + 3 * cp1y * midT * Math.pow(1 - midT, 2) + 3 * cp2y * midT * midT * (1 - midT) + targetCenter.y * Math.pow(midT, 3);

      return (
        <g key={conn.id}>
          <path
            d={path}
            fill="none"
            stroke="transparent"
            strokeWidth={12}
            style={{ cursor: 'pointer' }}
            onMouseEnter={() => setHoveredConnection({ connectionId: conn.id })}
            onMouseLeave={() => setHoveredConnection(null)}
            onDoubleClick={(e) => {
              e.stopPropagation();
              setEditingLabelId(conn.id);
              setEditingLabelText(conn.label);
            }}
          />
          <path
            d={path}
            fill="none"
            stroke={sourceCard.color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            style={{
              pointerEvents: 'none',
              transition: 'stroke-width 0.2s ease',
            }}
          />
          <polygon
            points={arrowPoints}
            fill={sourceCard.color}
            style={{ pointerEvents: 'none' }}
          />
          {isHovered && (
            <foreignObject
              x={labelX - 50}
              y={labelY - 14}
              width={100}
              height={28}
              style={{ overflow: 'visible', pointerEvents: 'none' }}
            >
              {editingLabelId === conn.id ? (
                <input
                  value={editingLabelText}
                  onChange={(e) => setEditingLabelText(e.target.value)}
                  onBlur={() => {
                    onConnectionLabelUpdate(conn.id, editingLabelText);
                    setEditingLabelId(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      onConnectionLabelUpdate(conn.id, editingLabelText);
                      setEditingLabelId(null);
                    }
                    if (e.key === 'Escape') {
                      setEditingLabelId(null);
                    }
                  }}
                  autoFocus
                  style={{
                    width: '100%',
                    padding: '2px 6px',
                    fontSize: 11,
                    border: '1px solid #4A90D9',
                    borderRadius: 4,
                    background: 'white',
                    outline: 'none',
                    boxSizing: 'border-box',
                    pointerEvents: 'auto',
                  }}
                />
              ) : (
                <div
                  style={{
                    textAlign: 'center',
                    fontSize: 11,
                    color: '#555',
                    background: 'rgba(255, 255, 255, 0.95)',
                    padding: '3px 8px',
                    borderRadius: 4,
                    boxShadow: '0 1px 4px rgba(0, 0, 0, 0.1)',
                    border: '1px solid rgba(0, 0, 0, 0.05)',
                    userSelect: 'none',
                  }}
                >
                  {conn.label}
                </div>
              )}
            </foreignObject>
          )}
        </g>
      );
    });
  };

  const renderActiveConnection = () => {
    if (!activeConnection || !canvasRef.current) return null;
    const rect = canvasRef.current.getBoundingClientRect();
    const startX = (activeConnection.startScreenPos.x - rect.left - offset.x) / scale;
    const startY = (activeConnection.startScreenPos.y - rect.top - offset.y) / scale;
    const endX = (activeConnection.currentScreenPos.x - rect.left - offset.x) / scale;
    const endY = (activeConnection.currentScreenPos.y - rect.top - offset.y) / scale;

    const dx = endX - startX;
    const dy = endY - startY;
    const midX = (startX + endX) / 2;
    const midY = (startY + endY) / 2 - 30;
    const path = `M ${startX} ${startY} Q ${midX} ${midY}, ${endX} ${endY}`;

    const sourceCard = cardMap.get(activeConnection.sourceId);

    return (
      <path
        d={path}
        fill="none"
        stroke={sourceCard?.color || '#4A90D9'}
        strokeWidth={2}
        strokeDasharray="6,4"
        strokeLinecap="round"
        style={{ pointerEvents: 'none' }}
      />
    );
  };

  const renderMinimap = () => {
    if (cards.length === 0) return null;

    const minimapWidth = 180;
    const minimapHeight = 120;
    const padding = 10;

    const xs = cards.map(c => c.position.x);
    const ys = cards.map(c => c.position.y);
    const heights = cards.map(c => cardHeightMap.current.get(c.id) || 150);
    const minX = Math.min(...xs) - 50;
    const minY = Math.min(...ys) - 50;
    const maxX = Math.max(...xs) + DEFAULT_CARD_WIDTH + 50;
    const maxY = Math.max(...ys.map((y, i) => y + heights[i])) + 50;

    const worldWidth = Math.max(maxX - minX, 1);
    const worldHeight = Math.max(maxY - minY, 1);
    const minimapScale = Math.min((minimapWidth - 2 * padding) / worldWidth, (minimapHeight - 2 * padding) / worldHeight);

    const rect = canvasRef.current?.getBoundingClientRect();
    const viewportWidth = rect ? rect.width / scale : 800;
    const viewportHeight = rect ? rect.height / scale : 600;
    const viewportWorldX = rect ? (-offset.x) / scale : 0;
    const viewportWorldY = rect ? (-offset.y) / scale : 0;

    const handleMinimapDrag = (e: React.MouseEvent) => {
      e.preventDefault();
      const minimapRect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const updateViewport = (moveEvent: MouseEvent) => {
        const x = moveEvent.clientX - minimapRect.left - padding;
        const y = moveEvent.clientY - minimapRect.top - padding;
        const worldX = minX + x / minimapScale - viewportWidth / 2;
        const worldY = minY + y / minimapScale - viewportHeight / 2;
        if (rect) {
          onOffsetChange({
            x: -worldX * scale,
            y: -worldY * scale,
          });
        }
      };
      updateViewport(e.nativeEvent);
      const handleMove = (moveEvent: MouseEvent) => updateViewport(moveEvent);
      const handleUp = () => {
        document.removeEventListener('mousemove', handleMove);
        document.removeEventListener('mouseup', handleUp);
      };
      document.addEventListener('mousemove', handleMove);
      document.addEventListener('mouseup', handleUp);
    };

    return (
      <div
        style={{
          position: 'absolute',
          left: 16,
          bottom: 16,
          width: minimapWidth,
          height: minimapHeight,
          background: 'rgba(255, 255, 255, 0.85)',
          backdropFilter: 'blur(8px)',
          borderRadius: 8,
          border: '1px solid rgba(0, 0, 0, 0.08)',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
          overflow: 'hidden',
          zIndex: 50,
        }}
        onMouseDown={handleMinimapDrag}
      >
        <svg width={minimapWidth} height={minimapHeight}>
          {cards.map((card) => {
            const x = padding + (card.position.x - minX) * minimapScale;
            const y = padding + (card.position.y - minY) * minimapScale;
            const w = DEFAULT_CARD_WIDTH * minimapScale;
            const h = (cardHeightMap.current.get(card.id) || 150) * minimapScale;
            const isSelected = selectedCardIds.has(card.id);
            return (
              <rect
                key={card.id}
                x={x}
                y={y}
                width={Math.max(w, 2)}
                height={Math.max(h, 2)}
                fill={isSelected ? '#4A90D9' : card.color}
                opacity={0.8}
                rx={1}
              />
            );
          })}
          <rect
            x={padding + (viewportWorldX - minX) * minimapScale}
            y={padding + (viewportWorldY - minY) * minimapScale}
            width={viewportWidth * minimapScale}
            height={viewportHeight * minimapScale}
            fill="none"
            stroke="#4A90D9"
            strokeWidth={1.5}
            strokeDasharray="3,2"
            rx={2}
          />
        </svg>
      </div>
    );
  };

  return (
    <div
      ref={canvasRef}
      onWheel={handleWheel}
      onMouseDown={handleCanvasMouseDown}
      style={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        cursor: isPanning ? 'grabbing' : 'default',
        background: `
          linear-gradient(135deg, #f5f7fa 0%, #e4e8ec 100%),
          repeating-linear-gradient(0deg, transparent, transparent 14.5px, rgba(0,0,0,0.05) 14.5px, rgba(0,0,0,0.05) 15px),
          repeating-linear-gradient(90deg, transparent, transparent 14.5px, rgba(0,0,0,0.05) 14.5px, rgba(0,0,0,0.05) 15px)
        `,
        backgroundBlendMode: 'normal',
      }}
    >
      <div
        className="canvas-bg"
        style={{
          position: 'absolute',
          inset: 0,
        }}
      />

      <div
        style={{
          position: 'absolute',
          inset: 0,
          transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
          transformOrigin: '0 0',
          transition: isPanning || isBoxSelecting ? 'none' : 'transform 0.08s ease-out',
        }}
      >
        <svg
          ref={svgRef}
          style={{
            position: 'absolute',
            left: -5000,
            top: -5000,
            width: 10000,
            height: 10000,
            overflow: 'visible',
            pointerEvents: 'none',
          }}
        >
          <g transform="translate(5000, 5000)" style={{ pointerEvents: 'auto' }}>
            {renderConnections()}
            {renderActiveConnection()}
          </g>
        </svg>

        {cards.map((card) => (
          <div
            key={card.id}
            ref={(el) => {
              if (el) {
                cardHeightMap.current.set(card.id, el.offsetHeight);
              }
            }}
          >
            <NoteCard
              card={card}
              isSelected={selectedCardIds.has(card.id)}
              scale={scale}
              onPositionChange={onCardPositionChange}
              onColorCycle={onCardColorCycle}
              onUpdate={onCardUpdate}
              onDelete={onCardDelete}
              onStartConnection={handleStartConnection}
              onConnectionDrag={handleConnectionDrag}
              onEndConnection={handleEndConnection}
              onSelect={handleSelectCard}
              onCardMouseDown={handleCardMouseDown}
            />
          </div>
        ))}
      </div>

      {boxSelectRect && (
        <div
          style={{
            position: 'absolute',
            left: boxSelectRect.x,
            top: boxSelectRect.y,
            width: boxSelectRect.width,
            height: boxSelectRect.height,
            background: 'rgba(74, 144, 217, 0.15)',
            border: '1px solid rgba(74, 144, 217, 0.6)',
            borderRadius: 6,
            pointerEvents: 'none',
            zIndex: 200,
          }}
        />
      )}

      {renderMinimap()}
    </div>
  );
};

export default ConnectionCanvas;
