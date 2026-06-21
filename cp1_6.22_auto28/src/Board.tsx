import React, { useState, useRef, useEffect, useCallback } from 'react';
import { StickyNote as StickyNoteType, Connection } from './types';
import StickyNote from './StickyNote';
import './Board.css';

interface BoardProps {
  stickies: StickyNoteType[];
  connections: Connection[];
  votedStickyIds: Set<string>;
  selectedStickyId: string | null;
  selectedConnectionId: string | null;
  onSelectSticky: (id: string | null) => void;
  onSelectConnection: (id: string | null) => void;
  onCreateSticky: (x: number, y: number, content: string) => void;
  onUpdateStickyPosition: (id: string, x: number, y: number) => void;
  onUpdateStickyContent: (id: string, content: string) => void;
  onUpdateStickyColor: (id: string, color: string) => void;
  onDeleteSticky: (id: string) => void;
  onVoteSticky: (id: string) => void;
  onCreateConnection: (fromId: string, toId: string) => void;
  onDeleteConnection: (id: string) => void;
}

const GRID_SIZE = 10;
const MIN_SCALE = 0.5;
const MAX_SCALE = 2;

const snapToGrid = (value: number): number => {
  return Math.round(value / GRID_SIZE) * GRID_SIZE;
};

const Board: React.FC<BoardProps> = ({
  stickies,
  connections,
  votedStickyIds,
  selectedStickyId,
  selectedConnectionId,
  onSelectSticky,
  onSelectConnection,
  onCreateSticky,
  onUpdateStickyPosition,
  onUpdateStickyContent,
  onUpdateStickyColor,
  onDeleteSticky,
  onVoteSticky,
  onCreateConnection,
  onDeleteConnection,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [offsetStart, setOffsetStart] = useState({ x: 0, y: 0 });
  
  const [draggingStickyId, setDraggingStickyId] = useState<string | null>(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [stickyStartPos, setStickyStartPos] = useState({ x: 0, y: 0 });

  const [isCreatingConnection, setIsCreatingConnection] = useState(false);
  const [connectionFromId, setConnectionFromId] = useState<string | null>(null);
  const [connectionEndPos, setConnectionEndPos] = useState({ x: 0, y: 0 });

  const [showNewStickyInput, setShowNewStickyInput] = useState(false);
  const [newStickyPos, setNewStickyPos] = useState({ x: 0, y: 0 });
  const [newStickyContent, setNewStickyContent] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (showNewStickyInput && inputRef.current) {
      inputRef.current.focus();
    }
  }, [showNewStickyInput]);

  const screenToWorld = useCallback((screenX: number, screenY: number) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return {
      x: (screenX - rect.left - offset.x) / scale,
      y: (screenY - rect.top - offset.y) / scale,
    };
  }, [offset, scale]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, scale * delta));
    
    const scaleRatio = newScale / scale;
    const newOffsetX = mouseX - (mouseX - offset.x) * scaleRatio;
    const newOffsetY = mouseY - (mouseY - offset.y) * scaleRatio;

    setScale(newScale);
    setOffset({ x: newOffsetX, y: newOffsetY });
  }, [scale, offset]);

  const handleCanvasMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.target !== e.currentTarget && !(e.target as HTMLElement).classList.contains('board-canvas')) {
      return;
    }
    
    if (e.button === 0) {
      onSelectSticky(null);
      onSelectConnection(null);
      
      setIsPanning(true);
      setPanStart({ x: e.clientX, y: e.clientY });
      setOffsetStart({ ...offset });
    }
  }, [offset, onSelectSticky, onSelectConnection]);

  const handleCanvasMouseMove = useCallback((e: React.MouseEvent) => {
    if (isPanning) {
      const dx = e.clientX - panStart.x;
      const dy = e.clientY - panStart.y;
      setOffset({
        x: offsetStart.x + dx,
        y: offsetStart.y + dy,
      });
    }

    if (draggingStickyId) {
      const dx = (e.clientX - dragStart.x) / scale;
      const dy = (e.clientY - dragStart.y) / scale;
      const newX = stickyStartPos.x + dx;
      const newY = stickyStartPos.y + dy;
      onUpdateStickyPosition(draggingStickyId, newX, newY);
    }

    if (isCreatingConnection) {
      const worldPos = screenToWorld(e.clientX, e.clientY);
      setConnectionEndPos(worldPos);
    }
  }, [isPanning, panStart, offsetStart, draggingStickyId, dragStart, stickyStartPos, scale, isCreatingConnection, screenToWorld, onUpdateStickyPosition]);

  const handleCanvasMouseUp = useCallback((e: React.MouseEvent) => {
    if (isPanning) {
      setIsPanning(false);
    }

    if (draggingStickyId) {
      const sticky = stickies.find(s => s.id === draggingStickyId);
      if (sticky) {
        const snappedX = snapToGrid(sticky.x);
        const snappedY = snapToGrid(sticky.y);
        if (snappedX !== sticky.x || snappedY !== sticky.y) {
          onUpdateStickyPosition(draggingStickyId, snappedX, snappedY);
        }
      }
      setDraggingStickyId(null);
    }

    if (isCreatingConnection && connectionFromId) {
      const worldPos = screenToWorld(e.clientX, e.clientY);
      const targetSticky = stickies.find(s => {
        return (
          worldPos.x >= s.x &&
          worldPos.x <= s.x + s.width &&
          worldPos.y >= s.y &&
          worldPos.y <= s.y + s.height &&
          s.id !== connectionFromId
        );
      });

      if (targetSticky) {
        onCreateConnection(connectionFromId, targetSticky.id);
      }
      setIsCreatingConnection(false);
      setConnectionFromId(null);
    }
  }, [isPanning, draggingStickyId, isCreatingConnection, connectionFromId, stickies, screenToWorld, onUpdateStickyPosition, onCreateConnection]);

  const handleCanvasDoubleClick = useCallback((e: React.MouseEvent) => {
    if (e.target !== e.currentTarget && !(e.target as HTMLElement).classList.contains('board-canvas')) {
      return;
    }

    const worldPos = screenToWorld(e.clientX, e.clientY);
    setNewStickyPos(worldPos);
    setNewStickyContent('');
    setShowNewStickyInput(true);
  }, [screenToWorld]);

  const handleCreateStickySubmit = () => {
    if (newStickyContent.trim()) {
      onCreateSticky(newStickyPos.x, newStickyPos.y, newStickyContent.trim());
    }
    setShowNewStickyInput(false);
    setNewStickyContent('');
  };

  const handleStickyDragStart = (stickyId: string, e: React.MouseEvent) => {
    const sticky = stickies.find(s => s.id === stickyId);
    if (!sticky) return;

    setDraggingStickyId(stickyId);
    setDragStart({ x: e.clientX, y: e.clientY });
    setStickyStartPos({ x: sticky.x, y: sticky.y });
  };

  const handleConnectionStart = (stickyId: string, e: React.MouseEvent) => {
    const sticky = stickies.find(s => s.id === stickyId);
    if (!sticky) return;

    setIsCreatingConnection(true);
    setConnectionFromId(stickyId);
    setConnectionEndPos({
      x: sticky.x + sticky.width / 2,
      y: sticky.y + sticky.height,
    });
  };

  const handleConnectionClick = (connectionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onSelectConnection(connectionId);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedConnectionId) {
          onDeleteConnection(selectedConnectionId);
          onSelectConnection(null);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedConnectionId, onDeleteConnection, onSelectConnection]);

  const renderConnections = () => {
    return connections.map((conn) => {
      const fromSticky = stickies.find(s => s.id === conn.from_sticky_id);
      const toSticky = stickies.find(s => s.id === conn.to_sticky_id);
      if (!fromSticky || !toSticky) return null;

      const fromX = fromSticky.x + fromSticky.width / 2;
      const fromY = fromSticky.y + fromSticky.height;
      const toX = toSticky.x + toSticky.width / 2;
      const toY = toSticky.y;

      const isSelected = selectedConnectionId === conn.id;
      const midY = (fromY + toY) / 2;

      return (
        <g key={conn.id} onClick={(e) => handleConnectionClick(conn.id, e)} style={{ cursor: 'pointer' }}>
          <path
            d={`M ${fromX} ${fromY} Q ${fromX} ${midY} ${(fromX + toX) / 2} ${midY} T ${toX} ${toY}`}
            fill="none"
            stroke={isSelected ? '#FF8C00' : '#B0B0B0'}
            strokeWidth={isSelected ? 3 : 2}
            strokeDasharray={isSelected ? 'none' : '6,4'}
            className="connection-line"
          />
          <circle cx={fromX} cy={fromY} r={4} fill={isSelected ? '#FF8C00' : '#B0B0B0'} />
          <polygon
            points={`${toX},${toY} ${toX - 6},${toY - 8} ${toX + 6},${toY - 8}`}
            fill={isSelected ? '#FF8C00' : '#B0B0B0'}
          />
        </g>
      );
    });
  };

  const renderTempConnection = () => {
    if (!isCreatingConnection || !connectionFromId) return null;

    const fromSticky = stickies.find(s => s.id === connectionFromId);
    if (!fromSticky) return null;

    const fromX = fromSticky.x + fromSticky.width / 2;
    const fromY = fromSticky.y + fromSticky.height;

    return (
      <g className="temp-connection">
        <line
          x1={fromX}
          y1={fromY}
          x2={connectionEndPos.x}
          y2={connectionEndPos.y}
          stroke="#FF8C00"
          strokeWidth={2}
          strokeDasharray="6,4"
        />
        <circle cx={fromX} cy={fromY} r={4} fill="#FF8C00" />
      </g>
    );
  };

  return (
    <div
      ref={containerRef}
      className={`board-container ${isPanning ? 'panning' : ''}`}
      onWheel={handleWheel}
      onMouseDown={handleCanvasMouseDown}
      onMouseMove={handleCanvasMouseMove}
      onMouseUp={handleCanvasMouseUp}
      onMouseLeave={handleCanvasMouseUp}
      onDoubleClick={handleCanvasDoubleClick}
    >
      <div
        className="board-canvas"
        style={{
          transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
          transformOrigin: '0 0',
        }}
      >
        <svg
          className="connections-layer"
          style={{
            position: 'absolute',
            left: -5000,
            top: -5000,
            width: 10000,
            height: 10000,
            pointerEvents: 'none',
          }}
        >
          <g transform="translate(5000, 5000)">
            {renderConnections()}
            {renderTempConnection()}
          </g>
        </svg>

        {stickies.map((sticky) => (
          <StickyNote
            key={sticky.id}
            sticky={sticky}
            isSelected={selectedStickyId === sticky.id}
            hasVoted={votedStickyIds.has(sticky.id)}
            onSelect={() => onSelectSticky(sticky.id)}
            onContentChange={(content) => onUpdateStickyContent(sticky.id, content)}
            onColorChange={(color) => onUpdateStickyColor(sticky.id, color)}
            onVote={() => onVoteSticky(sticky.id)}
            onDelete={() => onDeleteSticky(sticky.id)}
            onDragStart={(e) => handleStickyDragStart(sticky.id, e)}
            onConnectionStart={(e) => handleConnectionStart(sticky.id, e)}
            onConnectionEnd={() => null as any}
            isDragging={draggingStickyId === sticky.id}
          />
        ))}

        {showNewStickyInput && (
          <div
            className="new-sticky-input"
            style={{
              left: newStickyPos.x,
              top: newStickyPos.y,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <input
              ref={inputRef}
              type="text"
              value={newStickyContent}
              onChange={(e) => setNewStickyContent(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleCreateStickySubmit();
                } else if (e.key === 'Escape') {
                  setShowNewStickyInput(false);
                  setNewStickyContent('');
                }
              }}
              placeholder="输入便签内容..."
              maxLength={200}
              autoFocus
            />
            <button onClick={handleCreateStickySubmit}>创建</button>
            <button onClick={() => {
              setShowNewStickyInput(false);
              setNewStickyContent('');
            }}>取消</button>
          </div>
        )}
      </div>

      <div className="zoom-controls">
        <button onClick={() => setScale(s => Math.min(MAX_SCALE, s * 1.2))} title="放大">+</button>
        <span className="zoom-level">{Math.round(scale * 100)}%</span>
        <button onClick={() => setScale(s => Math.max(MIN_SCALE, s * 0.8))} title="缩小">−</button>
        <button onClick={() => {
          setScale(1);
          setOffset({ x: 0, y: 0 });
        }} title="重置视图">⟳</button>
      </div>

      <div className="board-hint">
        双击空白处创建便签 · 滚轮缩放 · 拖拽空白平移
      </div>
    </div>
  );
};

export default Board;
