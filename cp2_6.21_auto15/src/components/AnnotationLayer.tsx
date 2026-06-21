import React, { useRef, useState, useCallback, useEffect } from 'react';
import { Edit3, Trash2 } from 'lucide-react';
import type { Annotation } from '../types';

interface Props {
  annotations: Annotation[];
  isAnnotating: boolean;
  scale: number;
  offsetX: number;
  offsetY: number;
  canvasWidth: number;
  canvasHeight: number;
  onAdd: (ann: Omit<Annotation, 'id'>) => void;
  onUpdate: (id: string, updates: Partial<Annotation>) => void;
  onDelete: (id: string) => void;
  currentVersionId: string;
}

const AnnotationLayer: React.FC<Props> = ({
  annotations,
  isAnnotating,
  scale,
  offsetX,
  offsetY,
  onAdd,
  onUpdate,
  onDelete,
  currentVersionId,
}) => {
  const [drawing, setDrawing] = useState(false);
  const [drawStart, setDrawStart] = useState({ x: 0, y: 0 });
  const [drawCurrent, setDrawCurrent] = useState({ x: 0, y: 0 });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const layerRef = useRef<HTMLDivElement>(null);

  const toCanvasCoords = useCallback((clientX: number, clientY: number) => {
    const rect = layerRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    const mx = clientX - rect.left;
    const my = clientY - rect.top;
    return {
      x: (mx - offsetX) / scale,
      y: (my - offsetY) / scale,
    };
  }, [scale, offsetX, offsetY]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!isAnnotating) return;
    e.preventDefault();
    e.stopPropagation();
    const coords = toCanvasCoords(e.clientX, e.clientY);
    setDrawing(true);
    setDrawStart(coords);
    setDrawCurrent(coords);
  }, [isAnnotating, toCanvasCoords]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!drawing) return;
    const coords = toCanvasCoords(e.clientX, e.clientY);
    setDrawCurrent(coords);
  }, [drawing, toCanvasCoords]);

  const handleMouseUp = useCallback(() => {
    if (!drawing) return;
    setDrawing(false);
    const w = Math.abs(drawCurrent.x - drawStart.x);
    const h = Math.abs(drawCurrent.y - drawStart.y);
    if (w < 10 || h < 10) return;
    const x = Math.min(drawStart.x, drawCurrent.x);
    const y = Math.min(drawStart.y, drawCurrent.y);
    const isCircle = Math.abs(w - h) < Math.max(w, h) * 0.2;
    onAdd({
      shape: isCircle ? 'circle' : 'rect',
      x,
      y,
      width: w,
      height: h,
      text: '',
      versionId: currentVersionId,
    });
  }, [drawing, drawStart, drawCurrent, onAdd, currentVersionId]);

  const handleEditStart = (id: string, currentText: string) => {
    setEditingId(id);
    setEditText(currentText);
  };

  const handleEditSave = (id: string) => {
    onUpdate(id, { text: editText });
    setEditingId(null);
    setEditText('');
  };

  const handleEditKeyDown = (e: React.KeyboardEvent, id: string) => {
    if (e.key === 'Enter') {
      handleEditSave(id);
    } else if (e.key === 'Escape') {
      setEditingId(null);
      setEditText('');
    }
  };

  const filteredAnnotations = annotations.filter(a => a.versionId === currentVersionId);

  return (
    <div
      ref={layerRef}
      className="annotation-layer"
      style={{ pointerEvents: isAnnotating ? 'auto' : 'none' }}
    >
      <div
        className="annotation-drawing"
        style={{ cursor: isAnnotating ? 'crosshair' : 'default' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      >
        {drawing && (
          <div
            style={{
              position: 'absolute',
              left: `${drawStart.x * scale + offsetX}px`,
              top: `${drawStart.y * scale + offsetY}px`,
              width: `${Math.abs(drawCurrent.x - drawStart.x) * scale}px`,
              height: `${Math.abs(drawCurrent.y - drawStart.y) * scale}px`,
              background: 'rgba(108, 99, 255, 0.15)',
              border: '2px solid rgba(108, 99, 255, 0.6)',
              borderRadius: '6px',
              pointerEvents: 'none',
            }}
          />
        )}

        {filteredAnnotations.map((ann) => {
          const screenX = ann.x * scale + offsetX;
          const screenY = ann.y * scale + offsetY;
          const screenW = ann.width * scale;
          const screenH = ann.height * scale;
          return (
            <div
              key={ann.id}
              className={`annotation-item${ann.shape === 'circle' ? ' circle' : ''}`}
              style={{
                left: `${screenX}px`,
                top: `${screenY}px`,
                width: `${screenW}px`,
                height: `${screenH}px`,
                pointerEvents: 'auto',
                cursor: isAnnotating ? 'move' : 'default',
              }}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <div className="annotation-actions">
                <button
                  className="annotation-action-btn"
                  onClick={(e) => { e.stopPropagation(); handleEditStart(ann.id, ann.text); }}
                >
                  <Edit3 size={10} />
                </button>
                <button
                  className="annotation-action-btn"
                  onClick={(e) => { e.stopPropagation(); onDelete(ann.id); }}
                >
                  <Trash2 size={10} />
                </button>
              </div>

              {editingId === ann.id ? (
                <input
                  className="annotation-input"
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  onKeyDown={(e) => handleEditKeyDown(e, ann.id)}
                  onBlur={() => handleEditSave(ann.id)}
                  autoFocus
                  onClick={(e) => e.stopPropagation()}
                />
              ) : ann.text ? (
                <div className="annotation-bubble">{ann.text}</div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AnnotationLayer;
