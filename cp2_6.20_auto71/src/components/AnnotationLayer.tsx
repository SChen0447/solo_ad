import React, { useState, useRef, useCallback } from 'react';

interface AnnotationItem {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  shape: 'rect' | 'circle';
  text: string;
  versionId: string;
}

interface AnnotationLayerProps {
  annotations: AnnotationItem[];
  isActive: boolean;
  shape: 'rect' | 'circle';
  scale: number;
  offsetX: number;
  offsetY: number;
  onAdd: (annotation: Omit<AnnotationItem, 'id'>) => void;
  onUpdate: (id: string, updates: Partial<AnnotationItem>) => void;
  onDelete: (id: string) => void;
}

export default function AnnotationLayer({
  annotations,
  isActive,
  shape,
  scale,
  offsetX,
  offsetY,
  onAdd,
  onUpdate,
  onDelete,
}: AnnotationLayerProps) {
  const [drawing, setDrawing] = useState(false);
  const [startX, setStartX] = useState(0);
  const [startY, setStartY] = useState(0);
  const [currentX, setCurrentX] = useState(0);
  const [currentY, setCurrentY] = useState(0);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const layerRef = useRef<HTMLDivElement>(null);

  const toCanvasCoords = useCallback(
    (clientX: number, clientY: number) => {
      if (!layerRef.current) return { x: 0, y: 0 };
      const rect = layerRef.current.getBoundingClientRect();
      const displayX = clientX - rect.left;
      const displayY = clientY - rect.top;
      const canvasX = (displayX - offsetX) / scale;
      const canvasY = (displayY - offsetY) / scale;
      return { x: canvasX, y: canvasY };
    },
    [scale, offsetX, offsetY]
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (!isActive) return;
      if ((e.target as HTMLElement).closest('.annotation-box')) return;
      e.preventDefault();
      const { x, y } = toCanvasCoords(e.clientX, e.clientY);
      setStartX(x);
      setStartY(y);
      setCurrentX(x);
      setCurrentY(y);
      setDrawing(true);
    },
    [isActive, toCanvasCoords]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!drawing) return;
      const { x, y } = toCanvasCoords(e.clientX, e.clientY);
      setCurrentX(x);
      setCurrentY(y);
    },
    [drawing, toCanvasCoords]
  );

  const handleMouseUp = useCallback(() => {
    if (!drawing) return;
    setDrawing(false);

    const x = Math.min(startX, currentX);
    const y = Math.min(startY, currentY);
    const width = Math.abs(currentX - startX);
    const height = Math.abs(currentY - startY);

    if (width < 5 || height < 5) return;

    onAdd({
      x,
      y,
      width,
      height,
      shape,
      text: '',
      versionId: '',
    });
  }, [drawing, startX, startY, currentX, currentY, shape, onAdd]);

  const handleEditStart = useCallback((annotation: AnnotationItem) => {
    setEditingId(annotation.id);
    setEditText(annotation.text);
  }, []);

  const handleEditKeyDown = useCallback(
    (e: React.KeyboardEvent, id: string) => {
      if (e.key === 'Enter') {
        onUpdate(id, { text: editText });
        setEditingId(null);
        setEditText('');
      } else if (e.key === 'Escape') {
        setEditingId(null);
        setEditText('');
      }
    },
    [editText, onUpdate]
  );

  const drawingBox = drawing
    ? {
        x: Math.min(startX, currentX),
        y: Math.min(startY, currentY),
        width: Math.abs(currentX - startX),
        height: Math.abs(currentY - startY),
      }
    : null;

  return (
    <div
      ref={layerRef}
      className={`annotation-layer${isActive ? ' active' : ''}`}
      style={{
        transform: `scale(${scale}) translate(${offsetX / scale}px, ${offsetY / scale}px)`,
        transformOrigin: '0 0',
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      {annotations.map((annotation) => (
        <div
          key={annotation.id}
          className={`annotation-box${annotation.shape === 'circle' ? ' circle' : ''}`}
          style={{
            position: 'absolute',
            left: annotation.x,
            top: annotation.y,
            width: annotation.width,
            height: annotation.height,
          }}
          onMouseEnter={() => setHoveredId(annotation.id)}
          onMouseLeave={() => setHoveredId(null)}
        >
          {hoveredId === annotation.id && editingId !== annotation.id && (
            <div className="annotation-actions">
              <button
                className="annotation-action-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  handleEditStart(annotation);
                }}
              >
                ✎
              </button>
              <button
                className="annotation-action-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(annotation.id);
                }}
              >
                ✕
              </button>
            </div>
          )}

          {editingId === annotation.id && (
            <input
              className="annotation-text-input"
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              onKeyDown={(e) => handleEditKeyDown(e, annotation.id)}
              autoFocus
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
            />
          )}

          {annotation.text && editingId !== annotation.id && (
            <div className="annotation-bubble">
              <div className="annotation-bubble-pointer" />
              {annotation.text}
            </div>
          )}
        </div>
      ))}

      {drawingBox && (
        <div
          className={`annotation-box${shape === 'circle' ? ' circle' : ''}`}
          style={{
            position: 'absolute',
            left: drawingBox.x,
            top: drawingBox.y,
            width: drawingBox.width,
            height: drawingBox.height,
            pointerEvents: 'none',
          }}
        />
      )}
    </div>
  );
}
