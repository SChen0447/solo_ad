import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useApp, CanvasElement, createElement, ElementType } from './store';

const GRID_SIZE = 8;
const ROTATION_STEP = 15;
const TAIL_STEP = 45;
const MIN_SIZE = 20;

interface DragState {
  mode: 'move' | 'resize' | 'rotate' | 'tail' | null;
  elementId: string | null;
  startX: number;
  startY: number;
  startEl: CanvasElement | null;
}

function snapToGrid(value: number): number {
  return Math.round(value / GRID_SIZE) * GRID_SIZE;
}

function snapRotation(angle: number): number {
  return Math.round(angle / ROTATION_STEP) * ROTATION_STEP;
}

function snapTailDirection(angle: number): number {
  let snapped = Math.round(angle / TAIL_STEP) * TAIL_STEP;
  while (snapped < 0) snapped += 360;
  while (snapped >= 360) snapped -= 360;
  return snapped;
}

function ShapeRenderer({ element }: { element: CanvasElement }) {
  const { type, width, height, fill, stroke, text, tailDirection } = element;
  const sw = 2;

  const textColor = fill === '#1F2937' || fill === '#111827' ? '#FFFFFF' : '#374151';

  const renderText = () => {
    if (text === undefined) return null;
    return (
      <div
        style={{
          position: 'absolute',
          top: 8,
          left: '50%',
          transform: 'translateX(-50%)',
          width: '90%',
          maxWidth: '90%',
          fontSize: 14,
          color: textColor,
          textAlign: 'center',
          wordBreak: 'break-word',
          lineHeight: 1.4,
          pointerEvents: 'none',
          userSelect: 'none',
        }}
      >
        {text}
      </div>
    );
  };

  switch (type) {
    case 'rectangle':
      return (
        <svg width={width} height={height} style={{ display: 'block' }}>
          <rect
            x={sw}
            y={sw}
            width={width - sw * 2}
            height={height - sw * 2}
            rx={4}
            fill={fill}
            stroke={stroke}
            strokeWidth={sw}
          />
        </svg>
      );
    case 'circle':
      return (
        <svg width={width} height={height} style={{ display: 'block' }}>
          <ellipse
            cx={width / 2}
            cy={height / 2}
            rx={width / 2 - sw}
            ry={height / 2 - sw}
            fill={fill}
            stroke={stroke}
            strokeWidth={sw}
          />
        </svg>
      );
    case 'triangle':
      return (
        <svg width={width} height={height} style={{ display: 'block' }}>
          <polygon
            points={`${width / 2},${sw} ${width - sw},${height - sw} ${sw},${height - sw}`}
            fill={fill}
            stroke={stroke}
            strokeWidth={sw}
          />
        </svg>
      );
    case 'dialogBox':
      return (
        <div style={{ position: 'relative', width, height }}>
          <svg width={width} height={height} style={{ display: 'block', position: 'absolute' }}>
            <rect
              x={sw}
              y={sw}
              width={width - sw * 2}
              height={height - sw * 2}
              fill={fill}
              stroke={stroke}
              strokeWidth={sw}
              rx={4}
            />
          </svg>
          {renderText()}
        </div>
      );
    case 'speechBubble': {
      const tailDir = tailDirection ?? 180;
      const rad = (tailDir * Math.PI) / 180;
      const tailLen = 16;
      const cx = width / 2;
      const cy = height;
      const tipX = cx + Math.cos(rad) * tailLen;
      const tipY = cy + Math.sin(rad) * tailLen;
      const baseW = 16;
      const leftX = cx - baseW / 2 + Math.cos(rad + Math.PI / 2) * (baseW / 2);
      const leftY = cy + Math.sin(rad + Math.PI / 2) * (baseW / 2);
      const rightX = cx + Math.cos(rad + Math.PI / 2) * (baseW / 2);
      const rightY = cy + Math.sin(rad + Math.PI / 2) * (baseW / 2);

      const totalW = Math.max(width, tipX + 10);
      const totalH = Math.max(height, tipY + 10);

      return (
        <div style={{ position: 'relative', width: totalW, height: totalH }}>
          <svg width={totalW} height={totalH} style={{ display: 'block', position: 'absolute' }}>
            <path
              d={`M${sw},${sw + 6}
                  Q${sw},${sw} ${sw + 6},${sw}
                  L${width - sw - 6},${sw}
                  Q${width - sw},${sw} ${width - sw},${sw + 6}
                  L${width - sw},${height - sw - 6}
                  Q${width - sw},${height - sw} ${width - sw - 6},${height - sw}
                  L${rightX},${height - sw}
                  L${tipX},${tipY}
                  L${leftX},${height - sw}
                  L${sw + 6},${height - sw}
                  Q${sw},${height - sw} ${sw},${height - sw - 6}
                  Z`}
              fill={fill}
              stroke={stroke}
              strokeWidth={sw}
            />
          </svg>
          <div style={{ position: 'absolute', top: 0, left: 0, width, height }}>
            {renderText()}
          </div>
        </div>
      );
    }
  }
}

interface EditorCanvasProps {
  isDropTarget?: boolean;
}

export default function EditorCanvas({ isDropTarget = true }: EditorCanvasProps) {
  const { state, dispatch, getSelectedPanel } = useApp();
  const canvasRef = useRef<HTMLDivElement>(null);
  const [dragState, setDragState] = useState<DragState>({
    mode: null,
    elementId: null,
    startX: 0,
    startY: 0,
    startEl: null,
  });
  const [editingElementId, setEditingElementId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [showRotation, setShowRotation] = useState<number | null>(null);
  const [showGrid, setShowGrid] = useState(false);

  const panel = getSelectedPanel();
  const elements = panel?.elements ?? [];
  const selectedEl = elements.find((e) => e.id === state.selectedElementId);

  const updateElement = useCallback(
    (elementId: string, updates: Partial<CanvasElement>) => {
      if (!panel) return;
      dispatch({
        type: 'UPDATE_ELEMENT',
        payload: { panelId: panel.id, elementId, updates },
      });
    },
    [panel, dispatch]
  );

  useEffect(() => {
    if (dragState.mode === null) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!dragState.startEl || !dragState.elementId || !canvasRef.current) return;

      const rect = canvasRef.current.getBoundingClientRect();
      const dx = e.clientX - dragState.startX;
      const dy = e.clientY - dragState.startY;
      const el = dragState.startEl;

      if (dragState.mode === 'move') {
        const newX = snapToGrid(el.x + dx);
        const newY = snapToGrid(el.y + dy);
        updateElement(dragState.elementId, { x: newX, y: newY });
      } else if (dragState.mode === 'resize') {
        const newW = Math.max(MIN_SIZE, snapToGrid(el.width + dx));
        const newH = Math.max(MIN_SIZE, snapToGrid(el.height + dy));
        updateElement(dragState.elementId, { width: newW, height: newH });
      } else if (dragState.mode === 'rotate') {
        const cx = el.x + el.width / 2 - rect.left;
        const cy = el.y + el.height / 2 - rect.top;
        const angle = (Math.atan2(e.clientY - rect.top - cy, e.clientX - rect.left - cx) * 180) / Math.PI + 90;
        const snapped = snapRotation(angle);
        setShowRotation(snapped);
        updateElement(dragState.elementId, { rotation: snapped });
      } else if (dragState.mode === 'tail') {
        const cx = el.x + el.width / 2 - rect.left;
        const cy = el.y + el.height - rect.top;
        const angle = (Math.atan2(e.clientY - rect.top - cy, e.clientX - rect.left - cx) * 180) / Math.PI;
        const snapped = snapTailDirection(angle);
        updateElement(dragState.elementId, { tailDirection: snapped });
      }
    };

    const handleMouseUp = () => {
      setShowRotation(null);
      setDragState({ mode: null, elementId: null, startX: 0, startY: 0, startEl: null });
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragState, updateElement]);

  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (e.target === canvasRef.current) {
      dispatch({ type: 'SELECT_ELEMENT', payload: null });
      setEditingElementId(null);
    }
  };

  const handleElementMouseDown = (e: React.MouseEvent, element: CanvasElement) => {
    e.stopPropagation();
    dispatch({ type: 'SELECT_ELEMENT', payload: element.id });
    setEditingElementId(null);
    setDragState({
      mode: 'move',
      elementId: element.id,
      startX: e.clientX,
      startY: e.clientY,
      startEl: { ...element },
    });
  };

  const handleElementDoubleClick = (e: React.MouseEvent, element: CanvasElement) => {
    e.stopPropagation();
    if (element.type === 'speechBubble' || element.type === 'dialogBox') {
      setEditingElementId(element.id);
      setEditText(element.text || '');
    }
  };

  const handleResizeMouseDown = (e: React.MouseEvent, element: CanvasElement) => {
    e.stopPropagation();
    setDragState({
      mode: 'resize',
      elementId: element.id,
      startX: e.clientX,
      startY: e.clientY,
      startEl: { ...element },
    });
  };

  const handleRotateMouseDown = (e: React.MouseEvent, element: CanvasElement) => {
    e.stopPropagation();
    setDragState({
      mode: 'rotate',
      elementId: element.id,
      startX: e.clientX,
      startY: e.clientY,
      startEl: { ...element },
    });
  };

  const handleTailMouseDown = (e: React.MouseEvent, element: CanvasElement) => {
    e.stopPropagation();
    setDragState({
      mode: 'tail',
      elementId: element.id,
      startX: e.clientX,
      startY: e.clientY,
      startEl: { ...element },
    });
  };

  const handleTextBlur = () => {
    if (editingElementId) {
      updateElement(editingElementId, { text: editText });
      setEditingElementId(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleTextBlur();
    } else if (e.key === 'Escape') {
      setEditingElementId(null);
    } else if (e.key === 'Delete' || e.key === 'Backspace') {
      if (!editingElementId && state.selectedElementId && panel) {
        dispatch({
          type: 'DELETE_ELEMENT',
          payload: { panelId: panel.id, elementId: state.selectedElementId },
        });
      }
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setShowGrid(false);
    if (!panel || !canvasRef.current) return;

    const type = e.dataTransfer.getData('application/element-type') as ElementType;
    const colorIndexStr = e.dataTransfer.getData('application/color-index');
    if (!type) return;

    const colorIndex = parseInt(colorIndexStr || '0', 10);
    const rect = canvasRef.current.getBoundingClientRect();
    const x = snapToGrid(e.clientX - rect.left - 40);
    const y = snapToGrid(e.clientY - rect.top - 30);

    const newElement = createElement(type, Math.max(0, x), Math.max(0, y), colorIndex);
    dispatch({
      type: 'ADD_ELEMENT',
      payload: { panelId: panel.id, element: newElement },
    });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    if (isDropTarget) setShowGrid(true);
  };

  const handleDragLeave = () => {
    setShowGrid(false);
  };

  if (!panel) {
    return (
      <div
        style={{
          flex: 1,
          backgroundColor: '#F5F5F5',
          border: '2px solid #1F2937',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#6B7280',
          fontSize: 16,
        }}
      >
        请从左侧选择或创建一个分镜开始编辑
      </div>
    );
  }

  return (
    <div
      ref={canvasRef}
      onMouseDown={handleCanvasMouseDown}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      style={{
        flex: 1,
        backgroundColor: '#F5F5F5',
        border: '2px solid #1F2937',
        position: 'relative',
        overflow: 'hidden',
        outline: 'none',
        backgroundImage: showGrid
          ? `
            linear-gradient(to right, #e5e7eb 1px, transparent 1px),
            linear-gradient(to bottom, #e5e7eb 1px, transparent 1px)
          `
          : 'none',
        backgroundSize: `${GRID_SIZE}px ${GRID_SIZE}px`,
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 8,
          left: 8,
          padding: '4px 10px',
          backgroundColor: 'rgba(45, 45, 68, 0.9)',
          borderRadius: 4,
          color: '#fff',
          fontSize: 12,
          fontWeight: 500,
          zIndex: 100,
        }}
      >
        分镜 {panel.order}：{panel.description}
      </div>

      {elements.map((element) => {
        const isSelected = element.id === state.selectedElementId;
        const isEditing = element.id === editingElementId;

        return (
          <div
            key={element.id}
            onMouseDown={(e) => handleElementMouseDown(e, element)}
            onDoubleClick={(e) => handleElementDoubleClick(e, element)}
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              transform: `translate(${element.x}px, ${element.y}px) rotate(${element.rotation}deg)`,
              transformOrigin: 'center center',
              cursor: dragState.mode === 'move' && dragState.elementId === element.id ? 'grabbing' : 'grab',
              transition: dragState.mode === null ? 'opacity 0.3s ease-in-out' : 'none',
              outline: isSelected ? '2px dashed #3B82F6' : 'none',
              outlineOffset: 2,
              willChange: 'transform',
            }}
          >
            <ShapeRenderer element={element} />

            {isEditing && (
              <textarea
                autoFocus
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                onBlur={handleTextBlur}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleTextBlur();
                  } else if (e.key === 'Escape') {
                    setEditingElementId(null);
                  }
                }}
                onClick={(e) => e.stopPropagation()}
                style={{
                  position: 'absolute',
                  top: 8,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: '90%',
                  maxWidth: '90%',
                  minHeight: 30,
                  padding: '4px 6px',
                  fontSize: 14,
                  color: '#374151',
                  textAlign: 'center',
                  border: '1px solid #3B82F6',
                  borderRadius: 4,
                  backgroundColor: 'rgba(255,255,255,0.95)',
                  resize: 'none',
                  lineHeight: 1.4,
                  zIndex: 10,
                }}
              />
            )}

            {isSelected && (
              <>
                <div
                  style={{
                    position: 'absolute',
                    top: -20,
                    left: 0,
                    fontSize: 12,
                    color: '#6B7280',
                    backgroundColor: 'rgba(255,255,255,0.8)',
                    padding: '1px 4px',
                    borderRadius: 2,
                    whiteSpace: 'nowrap',
                  }}
                >
                  x:{element.x} y:{element.y}
                </div>

                <div
                  onMouseDown={(e) => handleRotateMouseDown(e, element)}
                  style={{
                    position: 'absolute',
                    top: -18,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: 12,
                    height: 12,
                    borderRadius: '50%',
                    backgroundColor: '#10B981',
                    border: '2px solid #fff',
                    cursor: 'grab',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                    zIndex: 5,
                  }}
                  title="旋转（每步15°）"
                />

                {showRotation !== null && (
                  <div
                    style={{
                      position: 'absolute',
                      top: -38,
                      left: '50%',
                      transform: 'translateX(-50%)',
                      fontSize: 12,
                      fontWeight: 600,
                      color: '#10B981',
                      backgroundColor: 'rgba(255,255,255,0.95)',
                      padding: '2px 6px',
                      borderRadius: 3,
                      animation: 'fadeInOut 0.3s ease',
                    }}
                  >
                    {showRotation}°
                  </div>
                )}

                <div
                  onMouseDown={(e) => handleResizeMouseDown(e, element)}
                  style={{
                    position: 'absolute',
                    right: -6,
                    bottom: -6,
                    width: 12,
                    height: 12,
                    borderRadius: 2,
                    backgroundColor: '#3B82F6',
                    border: '2px solid #fff',
                    cursor: 'nwse-resize',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                    zIndex: 5,
                  }}
                  title="缩放"
                />

                {element.type === 'speechBubble' && (
                  <div
                    onMouseDown={(e) => handleTailMouseDown(e, element)}
                    style={{
                      position: 'absolute',
                      bottom: -4,
                      left: '50%',
                      transform: 'translateX(-50%)',
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      backgroundColor: '#3B82F6',
                      border: '2px solid #fff',
                      cursor: 'grab',
                      zIndex: 6,
                    }}
                    title="调整气泡指向（每步45°）"
                  />
                )}
              </>
            )}
          </div>
        );
      })}

      <style>{`
        @keyframes fadeInOut {
          0% { opacity: 0; transform: translateX(-50%) translateY(-4px); }
          100% { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
      `}</style>
    </div>
  );
}
