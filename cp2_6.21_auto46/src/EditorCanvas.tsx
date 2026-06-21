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

function SpeechBubbleSVG({ width, height, fill, stroke, tailDirection }: {
  width: number; height: number; fill: string; stroke: string; tailDirection: number;
}) {
  const sw = 2;
  const tailLen = 16;
  const rad = (tailDirection * Math.PI) / 180;
  const cx = width / 2;
  const cy = height;
  const tipX = cx + Math.cos(rad) * tailLen;
  const tipY = cy + Math.sin(rad) * tailLen;
  const baseW = 16;
  const perpX = Math.cos(rad + Math.PI / 2);
  const perpY = Math.sin(rad + Math.PI / 2);
  const leftX = cx + perpX * (baseW / 2);
  const leftY = cy + perpY * (baseW / 2);
  const rightX = cx - perpX * (baseW / 2);
  const rightY = cy - perpY * (baseW / 2);

  const totalW = Math.max(width, Math.ceil(tipX + tailLen));
  const totalH = Math.max(height, Math.ceil(tipY + tailLen));
  const r = 6;

  const path = [
    `M${sw},${sw + r}`,
    `Q${sw},${sw} ${sw + r},${sw}`,
    `L${width - sw - r},${sw}`,
    `Q${width - sw},${sw} ${width - sw},${sw + r}`,
    `L${width - sw},${cy - r}`,
    `Q${width - sw},${cy} ${width - sw - r},${cy}`,
    `L${rightX.toFixed(1)},${rightY.toFixed(1)}`,
    `L${tipX.toFixed(1)},${tipY.toFixed(1)}`,
    `L${leftX.toFixed(1)},${leftY.toFixed(1)}`,
    `L${sw + r},${cy}`,
    `Q${sw},${cy} ${sw},${cy - r}`,
    'Z',
  ].join(' ');

  return { totalW, totalH, path };
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
          padding: '0 8px',
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
          <rect x={sw} y={sw} width={width - sw * 2} height={height - sw * 2} rx={4} fill={fill} stroke={stroke} strokeWidth={sw} />
        </svg>
      );
    case 'circle':
      return (
        <svg width={width} height={height} style={{ display: 'block' }}>
          <ellipse cx={width / 2} cy={height / 2} rx={width / 2 - sw} ry={height / 2 - sw} fill={fill} stroke={stroke} strokeWidth={sw} />
        </svg>
      );
    case 'triangle':
      return (
        <svg width={width} height={height} style={{ display: 'block' }}>
          <polygon points={`${width / 2},${sw} ${width - sw},${height - sw} ${sw},${height - sw}`} fill={fill} stroke={stroke} strokeWidth={sw} />
        </svg>
      );
    case 'dialogBox':
      return (
        <div style={{ position: 'relative', width, height }}>
          <svg width={width} height={height} style={{ display: 'block', position: 'absolute' }}>
            <rect x={sw} y={sw} width={width - sw * 2} height={height - sw * 2} fill={fill} stroke={stroke} strokeWidth={sw} rx={4} />
          </svg>
          {renderText()}
        </div>
      );
    case 'speechBubble': {
      const dir = tailDirection ?? 90;
      const { totalW, totalH, path } = SpeechBubbleSVG({ width, height, fill, stroke, tailDirection: dir });
      return (
        <div style={{ position: 'relative', width: totalW, height: totalH }}>
          <svg width={totalW} height={totalH} style={{ display: 'block', position: 'absolute' }}>
            <path d={path} fill={fill} stroke={stroke} strokeWidth={sw} />
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
  const [showTailAngle, setShowTailAngle] = useState<number | null>(null);
  const [showGrid, setShowGrid] = useState(false);

  const panel = getSelectedPanel();
  const elements = panel?.elements ?? [];

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
    if (dragState.mode === 'move' || dragState.mode === 'resize') {
      setShowGrid(true);
    } else {
      if (!isDropTarget || dragState.mode === null) {
        setShowGrid(false);
      }
    }
  }, [dragState.mode, isDropTarget]);

  useEffect(() => {
    if (dragState.mode === null) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!dragState.startEl || !dragState.elementId || !canvasRef.current) return;

      const rect = canvasRef.current.getBoundingClientRect();
      const dx = e.clientX - dragState.startX;
      const dy = e.clientY - dragState.startY;
      const el = dragState.startEl;

      if (dragState.mode === 'move') {
        const rawX = el.x + dx;
        const rawY = el.y + dy;
        const newX = snapToGrid(rawX);
        const newY = snapToGrid(rawY);
        updateElement(dragState.elementId, { x: newX, y: newY });
      } else if (dragState.mode === 'resize') {
        const newW = Math.max(MIN_SIZE, snapToGrid(el.width + dx));
        const newH = Math.max(MIN_SIZE, snapToGrid(el.height + dy));
        updateElement(dragState.elementId, { width: newW, height: newH });
      } else if (dragState.mode === 'rotate') {
        const cx = el.x + el.width / 2;
        const cy = el.y + el.height / 2;
        const angle = (Math.atan2(e.clientY - rect.top - cy, e.clientX - rect.left - cx) * 180) / Math.PI + 90;
        const snapped = snapRotation(angle);
        setShowRotation(snapped);
        updateElement(dragState.elementId, { rotation: snapped });
      } else if (dragState.mode === 'tail') {
        const cx = el.x + el.width / 2;
        const cy = el.y + el.height;
        const angle = (Math.atan2(e.clientY - rect.top - cy, e.clientX - rect.left - cx) * 180) / Math.PI;
        const snapped = snapTailDirection(angle);
        setShowTailAngle(snapped);
        updateElement(dragState.elementId, { tailDirection: snapped });
      }
    };

    const handleMouseUp = () => {
      setShowRotation(null);
      setShowTailAngle(null);
      setShowGrid(false);
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
    e.preventDefault();
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
    } else if ((e.key === 'Delete' || e.key === 'Backspace') && !editingElementId && state.selectedElementId && panel) {
      dispatch({
        type: 'DELETE_ELEMENT',
        payload: { panelId: panel.id, elementId: state.selectedElementId },
      });
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
    setShowGrid(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (rect) {
      const { clientX, clientY } = e;
      if (clientX < rect.left || clientX > rect.right || clientY < rect.top || clientY > rect.bottom) {
        setShowGrid(false);
      }
    }
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
          ? `linear-gradient(to right, rgba(0,0,0,0.06) 1px, transparent 1px),
             linear-gradient(to bottom, rgba(0,0,0,0.06) 1px, transparent 1px)`
          : 'none',
        backgroundSize: `${GRID_SIZE}px ${GRID_SIZE}px`,
        transition: 'background-image 0.15s ease',
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
          pointerEvents: 'none',
        }}
      >
        分镜 {panel.order}：{panel.description}
      </div>

      {elements.map((element) => {
        const isSelected = element.id === state.selectedElementId;
        const isEditing = element.id === editingElementId;
        const isDragging = dragState.elementId === element.id && dragState.mode !== null;

        let totalW = element.width;
        let totalH = element.height;
        if (element.type === 'speechBubble') {
          const dir = element.tailDirection ?? 90;
          const rad = (dir * Math.PI) / 180;
          const tailLen = 16;
          const tipX = element.width / 2 + Math.cos(rad) * tailLen;
          const tipY = element.height + Math.sin(rad) * tailLen;
          totalW = Math.max(element.width, Math.ceil(tipX + tailLen));
          totalH = Math.max(element.height, Math.ceil(tipY + tailLen));
        }

        return (
          <div
            key={element.id}
            onMouseDown={(e) => handleElementMouseDown(e, element)}
            onDoubleClick={(e) => handleElementDoubleClick(e, element)}
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              width: totalW,
              height: totalH,
              transform: `translate(${element.x}px, ${element.y}px) rotate(${element.rotation}deg)`,
              transformOrigin: `${element.width / 2}px ${element.height / 2}px`,
              cursor: isDragging && dragState.mode === 'move' ? 'grabbing' : 'grab',
              outline: isSelected ? '2px dashed #3B82F6' : 'none',
              outlineOffset: 2,
              willChange: 'transform',
              opacity: isDragging ? 0.9 : 1,
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
                  e.stopPropagation();
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleTextBlur();
                  } else if (e.key === 'Escape') {
                    setEditingElementId(null);
                  }
                }}
                onClick={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
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
                    backgroundColor: 'rgba(255,255,255,0.9)',
                    padding: '1px 6px',
                    borderRadius: 2,
                    whiteSpace: 'nowrap',
                    pointerEvents: 'none',
                    zIndex: 7,
                  }}
                >
                  x:{element.x} y:{element.y}
                </div>

                <div
                  onMouseDown={(e) => handleRotateMouseDown(e, element)}
                  style={{
                    position: 'absolute',
                    top: -20,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: 12,
                    height: 12,
                    borderRadius: '50%',
                    backgroundColor: '#10B981',
                    border: '2px solid #fff',
                    cursor: 'grab',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
                    zIndex: 5,
                  }}
                  title="旋转（每步15°）"
                />

                {showRotation !== null && dragState.elementId === element.id && (
                  <div
                    style={{
                      position: 'absolute',
                      top: -42,
                      left: '50%',
                      transform: 'translateX(-50%)',
                      fontSize: 12,
                      fontWeight: 600,
                      color: '#10B981',
                      backgroundColor: 'rgba(255,255,255,0.95)',
                      padding: '2px 8px',
                      borderRadius: 3,
                      pointerEvents: 'none',
                      zIndex: 8,
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
                    boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
                    zIndex: 5,
                  }}
                  title="缩放"
                />

                {element.type === 'speechBubble' && (
                  <>
                    <div
                      onMouseDown={(e) => handleTailMouseDown(e, element)}
                      style={{
                        position: 'absolute',
                        bottom: element.height - 4,
                        left: element.width / 2 - 4,
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        backgroundColor: '#3B82F6',
                        border: '2px solid #fff',
                        cursor: 'grab',
                        boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
                        zIndex: 6,
                        transition: 'transform 0.1s ease',
                      }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLDivElement).style.transform = 'scale(1.4)';
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLDivElement).style.transform = 'scale(1)';
                      }}
                      title="调整气泡指向（8方向，每步45°）"
                    />
                    {showTailAngle !== null && dragState.elementId === element.id && (
                      <div
                        style={{
                          position: 'absolute',
                          bottom: element.height + 8,
                          left: element.width / 2,
                          transform: 'translateX(-50%)',
                          fontSize: 12,
                          fontWeight: 600,
                          color: '#3B82F6',
                          backgroundColor: 'rgba(255,255,255,0.95)',
                          padding: '2px 8px',
                          borderRadius: 3,
                          pointerEvents: 'none',
                          zIndex: 8,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {showTailAngle}°
                      </div>
                    )}
                  </>
                )}
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}
