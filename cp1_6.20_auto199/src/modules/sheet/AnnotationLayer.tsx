import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Annotation, ToolMode, User, AnnotationShape } from '../../types';

interface AnnotationLayerProps {
  annotations: Annotation[];
  toolMode: ToolMode;
  currentUser: User | null;
  onAnnotationAdd: (annotation: Annotation) => void;
  onAnnotationUpdate: (annotation: Annotation) => void;
  onAnnotationRemove: (annotationId: string) => void;
}

const DEFAULT_WIDTH = 80;
const DEFAULT_HEIGHT = 40;

export default function AnnotationLayer({
  annotations,
  toolMode,
  currentUser,
  onAnnotationAdd,
  onAnnotationUpdate,
  onAnnotationRemove,
}: AnnotationLayerProps) {
  const layerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(null);
  const [drawCurrent, setDrawCurrent] = useState<{ x: number; y: number } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const getLayerPoint = useCallback((clientX: number, clientY: number) => {
    const layer = layerRef.current;
    if (!layer) return null;
    const rect = layer.getBoundingClientRect();
    const svg = layer.querySelector('svg');
    if (!svg) return null;
    const svgRect = svg.getBoundingClientRect();
    const scaleX = svg.viewBox.baseVal.width / svgRect.width;
    const scaleY = svg.viewBox.baseVal.height / svgRect.height;
    return {
      x: (clientX - svgRect.left) * scaleX,
      y: (clientY - svgRect.top) * scaleY,
    };
  }, []);

  const getShapeFromToolMode = (mode: ToolMode): AnnotationShape | null => {
    if (mode === 'annotate_rect') return 'rectangle';
    if (mode === 'annotate_circle') return 'circle';
    if (mode === 'annotate_highlight') return 'highlight';
    return null;
  };

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const shape = getShapeFromToolMode(toolMode);
    if (!shape || !currentUser) return;
    const point = getLayerPoint(e.clientX, e.clientY);
    if (!point) return;

    setIsDrawing(true);
    setDrawStart(point);
    setDrawCurrent(point);
  }, [toolMode, currentUser, getLayerPoint]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isDrawing) {
      const point = getLayerPoint(e.clientX, e.clientY);
      if (point) setDrawCurrent(point);
    }
    if (isDragging) {
      const point = getLayerPoint(e.clientX, e.clientY);
      if (point) {
        const ann = annotations.find(a => a.id === isDragging);
        if (ann) {
          onAnnotationUpdate({
            ...ann,
            x: point.x - dragOffset.x,
            y: point.y - dragOffset.y,
          });
        }
      }
    }
  }, [isDrawing, isDragging, getLayerPoint, annotations, dragOffset, onAnnotationUpdate]);

  const handleMouseUp = useCallback(() => {
    if (isDrawing && drawStart && drawCurrent && currentUser) {
      const shape = getShapeFromToolMode(toolMode);
      if (shape) {
        const x = Math.min(drawStart.x, drawCurrent.x);
        const y = Math.min(drawStart.y, drawCurrent.y);
        const width = Math.max(DEFAULT_WIDTH, Math.abs(drawCurrent.x - drawStart.x));
        const height = Math.max(DEFAULT_HEIGHT, Math.abs(drawCurrent.y - drawStart.y));

        const newAnnotation: Annotation = {
          id: `ann-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          shape,
          x,
          y,
          width,
          height,
          color: currentUser.color,
          text: '',
          userId: currentUser.id,
          userName: currentUser.name,
        };
        onAnnotationAdd(newAnnotation);
        setEditingId(newAnnotation.id);
        setEditText('');
      }
    }
    setIsDrawing(false);
    setDrawStart(null);
    setDrawCurrent(null);
    setIsDragging(null);
  }, [isDrawing, drawStart, drawCurrent, currentUser, toolMode, onAnnotationAdd]);

  const startDrag = useCallback((e: React.MouseEvent, annotation: Annotation) => {
    if (toolMode !== 'select') return;
    e.stopPropagation();
    const point = getLayerPoint(e.clientX, e.clientY);
    if (!point) return;
    setIsDragging(annotation.id);
    setDragOffset({
      x: point.x - annotation.x,
      y: point.y - annotation.y,
    });
  }, [toolMode, getLayerPoint]);

  const handleAnnotationClick = useCallback((e: React.MouseEvent, annotation: Annotation) => {
    e.stopPropagation();
    if (toolMode === 'delete') {
      onAnnotationRemove(annotation.id);
    } else if (toolMode === 'select') {
      setSelectedId(annotation.id);
      setEditingId(annotation.id);
      setEditText(annotation.text);
    }
  }, [toolMode, onAnnotationRemove]);

  const confirmTextEdit = useCallback(() => {
    if (editingId) {
      const ann = annotations.find(a => a.id === editingId);
      if (ann) {
        onAnnotationUpdate({ ...ann, text: editText });
      }
    }
    setEditingId(null);
  }, [editingId, annotations, editText, onAnnotationUpdate]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && editingId) {
        confirmTextEdit();
      }
      if (e.key === 'Escape') {
        setEditingId(null);
        setSelectedId(null);
      }
      if (e.key === 'Delete' && selectedId && toolMode === 'select') {
        onAnnotationRemove(selectedId);
        setSelectedId(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [editingId, selectedId, toolMode, confirmTextEdit, onAnnotationRemove]);

  const renderDrawing = () => {
    if (!isDrawing || !drawStart || !drawCurrent) return null;
    const x = Math.min(drawStart.x, drawCurrent.x);
    const y = Math.min(drawStart.y, drawCurrent.y);
    const width = Math.max(DEFAULT_WIDTH, Math.abs(drawCurrent.x - drawStart.x));
    const height = Math.max(DEFAULT_HEIGHT, Math.abs(drawCurrent.y - drawStart.y));
    const shape = getShapeFromToolMode(toolMode);
    const color = currentUser?.color || '#FF6B6B';

    if (shape === 'rectangle') {
      return (
        <motion.rect
          x={x}
          y={y}
          width={width}
          height={height}
          fill="none"
          stroke={color}
          strokeWidth={2}
          strokeDasharray="5,5"
          opacity={0.7}
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.7 }}
        />
      );
    }
    if (shape === 'circle') {
      return (
        <motion.ellipse
          cx={x + width / 2}
          cy={y + height / 2}
          rx={width / 2}
          ry={height / 2}
          fill="none"
          stroke={color}
          strokeWidth={2}
          strokeDasharray="5,5"
          opacity={0.7}
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.7 }}
        />
      );
    }
    if (shape === 'highlight') {
      return (
        <motion.rect
          x={x}
          y={y}
          width={width}
          height={height}
          fill={color}
          opacity={0.25}
          rx={4}
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.25 }}
        />
      );
    }
    return null;
  };

  const renderAnnotation = (annotation: Annotation) => {
    const isEditing = editingId === annotation.id;
    const isSelected = selectedId === annotation.id;

    return (
      <motion.g
        key={annotation.id}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0, opacity: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        onMouseDown={(e) => startDrag(e, annotation)}
        onClick={(e) => handleAnnotationClick(e, annotation)}
        style={{ cursor: toolMode === 'delete' ? 'not-allowed' : toolMode === 'select' ? 'move' : 'default' }}
      >
        {annotation.shape === 'rectangle' && (
          <rect
            x={annotation.x}
            y={annotation.y}
            width={annotation.width}
            height={annotation.height}
            fill="none"
            stroke={annotation.color}
            strokeWidth={isSelected ? 3 : 2}
            rx={4}
          />
        )}
        {annotation.shape === 'circle' && (
          <ellipse
            cx={annotation.x + annotation.width / 2}
            cy={annotation.y + annotation.height / 2}
            rx={annotation.width / 2}
            ry={annotation.height / 2}
            fill="none"
            stroke={annotation.color}
            strokeWidth={isSelected ? 3 : 2}
          />
        )}
        {annotation.shape === 'highlight' && (
          <rect
            x={annotation.x}
            y={annotation.y}
            width={annotation.width}
            height={annotation.height}
            fill={annotation.color}
            opacity={0.3}
            rx={4}
          />
        )}

        {annotation.text && !isEditing && (
          <foreignObject
            x={annotation.x}
            y={annotation.y - 24}
            width={Math.max(annotation.width, 120)}
            height={24}
          >
            <div
              style={{
                background: annotation.color,
                color: '#fff',
                fontSize: '11px',
                padding: '3px 6px',
                borderRadius: '4px',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
              }}
            >
              <strong>{annotation.userName}:</strong> {annotation.text}
            </div>
          </foreignObject>
        )}

        {isEditing && (
          <foreignObject
            x={annotation.x}
            y={annotation.y - 34}
            width={Math.max(annotation.width, 160)}
            height={34}
          >
            <div style={{ display: 'flex', gap: '4px' }}>
              <input
                type="text"
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                onBlur={confirmTextEdit}
                placeholder="输入批注文字..."
                autoFocus
                style={{
                  flex: 1,
                  padding: '4px 6px',
                  fontSize: '11px',
                  borderRadius: '4px',
                  border: `1px solid ${annotation.color}`,
                  outline: 'none',
                  background: '#16213e',
                  color: '#fff',
                }}
              />
            </div>
          </foreignObject>
        )}
      </motion.g>
    );
  };

  const isAnnotateMode = getShapeFromToolMode(toolMode) !== null;

  return (
    <div
      ref={layerRef}
      className={`annotation-layer ${isAnnotateMode ? 'drawing-mode' : ''}`}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <svg className="annotation-svg">
        <AnimatePresence>
          {annotations.map(renderAnnotation)}
        </AnimatePresence>
        {renderDrawing()}
      </svg>
    </div>
  );
}
