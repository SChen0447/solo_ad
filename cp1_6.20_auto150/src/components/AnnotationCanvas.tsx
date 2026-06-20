import React, { useState, useRef, useCallback, useEffect } from 'react';
import type { Annotation } from '../types';

interface AnnotationCanvasProps {
  annotations: Annotation[];
  target: 'A' | 'B';
  imageWidth: number;
  imageHeight: number;
  onAddAnnotation: (annotation: Annotation) => void;
  onUpdateAnnotation: (annotation: Annotation) => void;
  onDeleteAnnotation: (id: string) => void;
}

interface BubblePosition {
  x: number;
  y: number;
}

export const AnnotationCanvas: React.FC<AnnotationCanvasProps> = ({
  annotations,
  target,
  imageWidth,
  imageHeight,
  onAddAnnotation,
  onUpdateAnnotation,
  onDeleteAnnotation,
}) => {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [bubbleOffsets, setBubbleOffsets] = useState<Record<string, BubblePosition>>({});
  const dragStartRef = useRef<{ mouseX: number; mouseY: number; bubbleX: number; bubbleY: number } | null>(null);
  const rafRef = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const handleDoubleClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const newAnnotation: Annotation = {
      id: generateId(),
      x,
      y,
      text: '',
      target,
    };

    onAddAnnotation(newAnnotation);
    setEditingId(newAnnotation.id);
    setEditingText('');
    setBubbleOffsets(prev => ({
      ...prev,
      [newAnnotation.id]: { x: 20, y: -20 },
    }));
  }, [target, onAddAnnotation]);

  const handleSaveEdit = useCallback(() => {
    if (editingId) {
      const ann = annotations.find(a => a.id === editingId);
      if (ann) {
        onUpdateAnnotation({ ...ann, text: editingText });
      }
      setEditingId(null);
      setEditingText('');
    }
  }, [editingId, editingText, annotations, onUpdateAnnotation]);

  useEffect(() => {
    if (!editingId) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.annotation-bubble')) {
        handleSaveEdit();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [editingId, handleSaveEdit]);

  useEffect(() => {
    if (!draggingId) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!dragStartRef.current) return;
      const dx = e.clientX - dragStartRef.current.mouseX;
      const dy = e.clientY - dragStartRef.current.mouseY;
      const newBubbleX = dragStartRef.current.bubbleX + dx;
      const newBubbleY = dragStartRef.current.bubbleY + dy;

      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        setBubbleOffsets(prev => ({
          ...prev,
          [draggingId]: { x: newBubbleX, y: newBubbleY },
        }));
      });
    };

    const handleMouseUp = () => {
      setDraggingId(null);
      dragStartRef.current = null;
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [draggingId]);

  const handleBubbleMouseDown = (e: React.MouseEvent, ann: Annotation) => {
    e.stopPropagation();
    const offset = bubbleOffsets[ann.id] || { x: 20, y: -20 };
    dragStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      bubbleX: offset.x,
      bubbleY: offset.y,
    };
    setDraggingId(ann.id);
  };

  const targetAnnotations = annotations.filter(a => a.target === target);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: imageWidth,
        height: imageHeight,
        pointerEvents: 'auto',
      }}
      onDoubleClick={handleDoubleClick}
    >
      <svg
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: imageWidth,
          height: imageHeight,
          pointerEvents: 'none',
          zIndex: 1,
        }}
      >
        {targetAnnotations.map(ann => {
          const offset = bubbleOffsets[ann.id] || { x: 20, y: -20 };
          const bubbleX = ann.x + offset.x;
          const bubbleY = ann.y + offset.y;
          return (
            <line
              key={`line-${ann.id}`}
              x1={ann.x}
              y1={ann.y}
              x2={bubbleX}
              y2={bubbleY + 30}
              stroke="#3a86ff"
              strokeWidth="1.5"
              style={{
                opacity: hoveredId && hoveredId !== ann.id ? 0.3 : 1,
                transition: 'opacity 0.3s ease',
              }}
            />
          );
        })}
      </svg>

      {targetAnnotations.map(ann => {
        const offset = bubbleOffsets[ann.id] || { x: 20, y: -20 };
        const isDimmed = hoveredId && hoveredId !== ann.id;
        const isEditing = editingId === ann.id;
        const isDragging = draggingId === ann.id;

        return (
          <div
            key={ann.id}
            className="annotation-bubble"
            style={{
              position: 'absolute',
              left: ann.x + offset.x,
              top: ann.y + offset.y,
              width: 240,
              height: 'auto',
              background: '#ffffff',
              borderRadius: 12,
              border: '2px solid #3a86ff',
              boxShadow: '0 4px 12px rgba(58,134,255,0.25)',
              padding: 12,
              zIndex: isEditing || isDragging ? 10 : 2,
              opacity: isDimmed ? 0.3 : 1,
              transition: 'opacity 0.3s ease',
              cursor: isEditing ? 'text' : 'move',
              userSelect: isDragging ? 'none' : 'auto',
            }}
            onMouseEnter={() => setHoveredId(ann.id)}
            onMouseLeave={() => setHoveredId(null)}
            onMouseDown={(e) => !isEditing && handleBubbleMouseDown(e, ann)}
            onClick={(e) => {
              e.stopPropagation();
              if (!isEditing && !isDragging) {
                setEditingId(ann.id);
                setEditingText(ann.text);
              }
            }}
          >
            <button
              style={{
                position: 'absolute',
                top: -8,
                right: -8,
                width: 20,
                height: 20,
                borderRadius: '50%',
                background: '#e63946',
                color: '#ffffff',
                border: 'none',
                fontSize: 14,
                lineHeight: '20px',
                textAlign: 'center',
                padding: 0,
                cursor: 'pointer',
                transition: 'transform 0.2s ease, background 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'rotate(90deg)';
                e.currentTarget.style.background = '#c92a37';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'rotate(0deg)';
                e.currentTarget.style.background = '#e63946';
              }}
              onClick={(e) => {
                e.stopPropagation();
                onDeleteAnnotation(ann.id);
              }}
            >
              ×
            </button>

            {isEditing ? (
              <>
                <textarea
                  autoFocus
                  value={editingText}
                  onChange={(e) => setEditingText(e.target.value)}
                  style={{
                    width: '100%',
                    minHeight: 60,
                    padding: 6,
                    border: '1px solid #ddd',
                    borderRadius: 6,
                    resize: 'vertical',
                    fontSize: 14,
                    outline: 'none',
                  }}
                  onClick={(e) => e.stopPropagation()}
                />
                <button
                  style={{
                    marginTop: 8,
                    width: '100%',
                    padding: '6px 12px',
                    background: '#2d6a4f',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: 6,
                    fontSize: 14,
                    cursor: 'pointer',
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSaveEdit();
                  }}
                >
                  保存
                </button>
              </>
            ) : (
              <div
                style={{
                  fontSize: 14,
                  lineHeight: 1.5,
                  color: '#333',
                  minHeight: 20,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}
              >
                {ann.text || <span style={{ color: '#aaa' }}>点击编辑...</span>}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
