import React, { useRef, useEffect, useCallback, useState, useMemo } from 'react';
import { lab } from 'd3-color';
import { useBoardStore, type CardData, type Connection } from './boardStore';
import { Card } from './Card';
import './BoardCanvas.css';

interface BoardCanvasProps {
  onCardDoubleClick: (card: CardData) => void;
  draggingSidebarCard: CardData | null;
  onSidebarDragEnd: () => void;
}

const MIN_SCALE = 0.25;
const MAX_SCALE = 4;
const GRID_SIZE = 48;

export const BoardCanvas: React.FC<BoardCanvasProps> = ({
  onCardDoubleClick,
  draggingSidebarCard,
  onSidebarDragEnd,
}) => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const isPanning = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });
  const [draggingCardId, setDraggingCardId] = useState<string | null>(null);
  const dragOffset = useRef({ x: 0, y: 0 });
  const [editingConnectionId, setEditingConnectionId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [newlyAddedCardId, setNewlyAddedCardId] = useState<string | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const {
    cards,
    connections,
    viewport,
    selectedCardId,
    selectedConnectionId,
    connectingFromId,
    setViewport,
    addCardToBoard,
    updateCardPosition,
    setSelectedCard,
    setSelectedConnection,
    startConnection,
    completeConnection,
    cancelConnection,
    removeCardFromBoard,
    toggleFavorite,
    setConnectionLabel,
  } = useBoardStore();

  const screenToWorld = useCallback(
    (screenX: number, screenY: number) => {
      if (!canvasRef.current) return { x: 0, y: 0 };
      const rect = canvasRef.current.getBoundingClientRect();
      return {
        x: (screenX - rect.left - viewport.x) / viewport.scale,
        y: (screenY - rect.top - viewport.y) / viewport.scale,
      };
    },
    [viewport]
  );

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();

      if (e.ctrlKey || e.metaKey) {
        const delta = -e.deltaY * 0.001;
        const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, viewport.scale + delta * viewport.scale));

        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect) return;

        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const worldX = (mouseX - viewport.x) / viewport.scale;
        const worldY = (mouseY - viewport.y) / viewport.scale;

        const newX = mouseX - worldX * newScale;
        const newY = mouseY - worldY * newScale;

        setViewport({ x: newX, y: newY, scale: newScale });
      } else {
        setViewport({
          ...viewport,
          x: viewport.x - e.deltaX,
          y: viewport.y - e.deltaY,
        });
      }
    },
    [viewport, setViewport]
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button === 1 || (e.button === 0 && e.altKey)) {
        isPanning.current = true;
        lastPos.current = { x: e.clientX, y: e.clientY };
        e.preventDefault();
        return;
      }

      if (e.button === 0 && !connectingFromId) {
        setSelectedCard(null);
        setSelectedConnection(null);
        setEditingConnectionId(null);
      }
    },
    [connectingFromId, setSelectedCard, setSelectedConnection]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });

      if (isPanning.current) {
        const dx = e.clientX - lastPos.current.x;
        const dy = e.clientY - lastPos.current.y;
        setViewport({
          ...viewport,
          x: viewport.x + dx,
          y: viewport.y + dy,
        });
        lastPos.current = { x: e.clientX, y: e.clientY };
        return;
      }

      if (draggingCardId) {
        const worldPos = screenToWorld(e.clientX, e.clientY);
        updateCardPosition(
          draggingCardId,
          worldPos.x - dragOffset.current.x,
          worldPos.y - dragOffset.current.y
        );
      }
    },
    [viewport, draggingCardId, screenToWorld, setViewport, updateCardPosition]
  );

  const handleMouseUp = useCallback(() => {
    isPanning.current = false;
    if (draggingCardId) {
      setDraggingCardId(null);
    }
  }, [draggingCardId]);

  const handleCardDragStart = useCallback(
    (e: React.MouseEvent, card: CardData) => {
      e.stopPropagation();

      if (connectingFromId) {
        completeConnection(card.id);
        return;
      }

      const worldPos = screenToWorld(e.clientX, e.clientY);
      dragOffset.current = {
        x: worldPos.x - card.x,
        y: worldPos.y - card.y,
      };
      setDraggingCardId(card.id);
      setSelectedCard(card.id);
    },
    [connectingFromId, screenToWorld, completeConnection, setSelectedCard]
  );

  const handleCardClick = useCallback(
    (card: CardData) => {
      if (connectingFromId) {
        completeConnection(card.id);
      } else {
        setSelectedCard(card.id);
        setSelectedConnection(null);
      }
    },
    [connectingFromId, completeConnection, setSelectedCard, setSelectedConnection]
  );

  const handleCardDoubleClick = useCallback(
    (card: CardData) => {
      if (!connectingFromId) {
        onCardDoubleClick(card);
      }
    },
    [connectingFromId, onCardDoubleClick]
  );

  const handleCanvasDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  }, []);

  const handleCanvasDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (!draggingSidebarCard) return;

      const worldPos = screenToWorld(e.clientX, e.clientY);
      addCardToBoard(
        draggingSidebarCard.id,
        worldPos.x - 120,
        worldPos.y - 100
      );
      setNewlyAddedCardId(draggingSidebarCard.id);
      setTimeout(() => setNewlyAddedCardId(null), 500);
      onSidebarDragEnd();
    },
    [draggingSidebarCard, screenToWorld, addCardToBoard, onSidebarDragEnd]
  );

  const handleConnectionClick = useCallback(
    (e: React.MouseEvent, connection: Connection) => {
      e.stopPropagation();
      setSelectedConnection(connection.id);
      setSelectedCard(null);
      setEditingConnectionId(connection.id);
      setEditLabel(connection.label);
    },
    [setSelectedConnection, setSelectedCard]
  );

  const handleLabelBlur = useCallback(() => {
    if (editingConnectionId) {
      setConnectionLabel(editingConnectionId, editLabel);
      setEditingConnectionId(null);
    }
  }, [editingConnectionId, editLabel, setConnectionLabel]);

  const handleLabelKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        handleLabelBlur();
      } else if (e.key === 'Escape') {
        setEditingConnectionId(null);
      }
    },
    [handleLabelBlur]
  );

  const getConnectionPath = useCallback(
    (from: CardData, to: CardData) => {
      const fromX = from.x + from.width / 2;
      const fromY = from.y + from.height / 2;
      const toX = to.x + to.width / 2;
      const toY = to.y + to.height / 2;

      const dx = toX - fromX;
      const dy = toY - fromY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const curvature = Math.min(dist * 0.3, 80);

      const midX = (fromX + toX) / 2;
      const midY = (fromY + toY) / 2;
      const perpX = -dy / dist * curvature;
      const perpY = dx / dist * curvature;

      const ctrlX = midX + perpX;
      const ctrlY = midY + perpY;

      const path = `M ${fromX} ${fromY} Q ${ctrlX} ${ctrlY} ${toX} ${toY}`;
      const midPointX = (fromX + 2 * ctrlX + toX) / 4;
      const midPointY = (fromY + 2 * ctrlY + toY) / 4;

      return { path, midX: midPointX, midY: midPointY, fromX, fromY, toX, toY };
    },
    []
  );

  const getMixedColor = useCallback((fromColors: string[], toColors: string[]) => {
    const color1 = fromColors[0] || '#6c63ff';
    const color2 = toColors[0] || '#6c63ff';

    const c1 = lab(color1);
    const c2 = lab(color2);

    const mixed = lab(
      (c1.l + c2.l) / 2,
      (c1.a + c2.a) / 2,
      (c1.b + c2.b) / 2
    );

    return mixed.formatHex();
  }, []);

  const getArrowPoints = useCallback(
    (fromX: number, fromY: number, toX: number, toY: number, size: number = 10) => {
      const angle = Math.atan2(toY - fromY, toX - fromX);
      const arrowAngle = Math.PI / 6;

      const x1 = toX - size * Math.cos(angle - arrowAngle);
      const y1 = toY - size * Math.sin(angle - arrowAngle);
      const x2 = toX - size * Math.cos(angle + arrowAngle);
      const y2 = toY - size * Math.sin(angle + arrowAngle);

      return `${toX},${toY} ${x1},${y1} ${x2},${y2}`;
    },
    []
  );

  const gridPatternId = useMemo(() => `grid-pattern-${Math.random().toString(36).slice(2)}`, []);

  const connectingFromCard = useMemo(
    () => cards.find((c) => c.id === connectingFromId),
    [cards, connectingFromId]
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        cancelConnection();
        setEditingConnectionId(null);
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedCardId) {
        removeCardFromBoard(selectedCardId);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cancelConnection, selectedCardId, removeCardFromBoard]);

  return (
    <div
      ref={canvasRef}
      className="board-canvas"
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onDragOver={handleCanvasDragOver}
      onDrop={handleCanvasDrop}
    >
      <svg
        className="board-svg"
        style={{
          transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.scale})`,
        }}
      >
        <defs>
          <pattern
            id={gridPatternId}
            x="0"
            y="0"
            width={GRID_SIZE}
            height={GRID_SIZE}
            patternUnits="userSpaceOnUse"
          >
            <circle cx="2" cy="2" r="1.5" fill="#d0d5dd" />
          </pattern>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <rect
          x="-10000"
          y="-10000"
          width="20000"
          height="20000"
          fill={`url(#${gridPatternId})`}
        />

        <g className="connections-layer">
          {connections.map((conn) => {
            const fromCard = cards.find((c) => c.id === conn.fromId);
            const toCard = cards.find((c) => c.id === conn.toId);
            if (!fromCard || !toCard) return null;

            const { path, midX, midY, fromX, fromY, toX, toY } = getConnectionPath(
              fromCard,
              toCard
            );
            const color = getMixedColor(fromCard.colors, toCard.colors);
            const isSelected = selectedConnectionId === conn.id;
            const isEditing = editingConnectionId === conn.id;

            return (
              <g key={conn.id} className="connection-group">
                <path
                  d={path}
                  fill="none"
                  stroke="transparent"
                  strokeWidth={20}
                  style={{ cursor: 'pointer' }}
                  onClick={(e) => handleConnectionClick(e, conn)}
                />
                <path
                  d={path}
                  fill="none"
                  stroke={color}
                  strokeWidth={isSelected ? 3 : 2}
                  strokeLinecap="round"
                  className="connection-line"
                  filter={isSelected ? 'url(#glow)' : undefined}
                  style={{
                    strokeDasharray: 'none',
                    animation: 'draw-line 0.6s ease-out forwards',
                  }}
                />
                <polygon
                  points={getArrowPoints(fromX, fromY, toX, toY, 12)}
                  fill={color}
                  className="connection-arrow"
                />

                {conn.label && !isEditing && (
                  <g transform={`translate(${midX}, ${midY})`}>
                    <rect
                      x={-conn.label.length * 4 - 8}
                      y={-10}
                      width={conn.label.length * 8 + 16}
                      height={20}
                      rx={4}
                      fill="rgba(255, 255, 255, 0.9)"
                      stroke={color}
                      strokeWidth={1}
                    />
                    <text
                      x="0"
                      y="4"
                      textAnchor="middle"
                      fill="#2c3e50"
                      fontSize="12"
                      style={{ pointerEvents: 'none' }}
                    >
                      {conn.label}
                    </text>
                  </g>
                )}

                {isEditing && (
                  <foreignObject
                    x={midX - 80}
                    y={midY - 14}
                    width={160}
                    height={28}
                  >
                    <input
                      type="text"
                      value={editLabel}
                      onChange={(e) => setEditLabel(e.target.value)}
                      onBlur={handleLabelBlur}
                      onKeyDown={handleLabelKeyDown}
                      autoFocus
                      className="connection-label-input"
                      placeholder="输入标签..."
                    />
                  </foreignObject>
                )}
              </g>
            );
          })}

          {connectingFromCard && (
            <line
              x1={connectingFromCard.x + connectingFromCard.width / 2}
              y1={connectingFromCard.y + connectingFromCard.height / 2}
              x2={screenToWorld(mousePos.x, mousePos.y).x}
              y2={screenToWorld(mousePos.x, mousePos.y).y}
              stroke="#6c63ff"
              strokeWidth={2}
              strokeDasharray="8,4"
              style={{ pointerEvents: 'none' }}
            />
          )}
        </g>
      </svg>

      <div
        className="cards-layer"
        style={{
          transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.scale})`,
        }}
      >
        {cards.map((card) => (
          <div
            key={card.id}
            className={`card-wrapper ${
              newlyAddedCardId === card.id ? 'card-bounce-in' : ''
            }`}
            style={{
              left: card.x,
              top: card.y,
              width: card.width,
              height: card.height,
              zIndex:
                draggingCardId === card.id
                  ? 1000
                  : selectedCardId === card.id
                  ? 100
                  : 1,
            }}
          >
            <Card
              card={card}
              variant="board"
              isDragging={draggingCardId === card.id}
              isSelected={selectedCardId === card.id}
              isConnecting={connectingFromId === card.id}
              onDelete={removeCardFromBoard}
              onToggleFavorite={toggleFavorite}
              onDragStart={handleCardDragStart}
              onClick={handleCardClick}
              onDoubleClick={handleCardDoubleClick}
            />
          </div>
        ))}
      </div>

      {draggingSidebarCard && (
        <div
          className="drag-preview"
          style={{
            left: mousePos.x - 120,
            top: mousePos.y - 100,
          }}
        >
          <Card card={draggingSidebarCard} variant="board" isDragging />
        </div>
      )}

      {connectingFromId && (
        <div className="connecting-hint">
          点击另一张卡片完成连接，按 ESC 取消
        </div>
      )}
    </div>
  );
};

export default BoardCanvas;
