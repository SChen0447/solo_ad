import { useState, useRef, useEffect } from 'react';
import type { Annotation } from '../types';
import './AnnotationOverlay.css';

interface AnnotationOverlayProps {
  annotations: Annotation[];
  measureCount: number;
  onAddAnnotation: (measure: number, text: string, color: string) => void;
  onDeleteAnnotation: (annotationId: string) => void;
  children: React.ReactNode;
}

const STICKY_COLORS = ['#fff9c4', '#c8e6c9', '#bbdefb', '#f8bbd9', '#ffe0b2'];

export function AnnotationOverlay({
  annotations,
  measureCount,
  onAddAnnotation,
  onDeleteAnnotation,
  children,
}: AnnotationOverlayProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newAnnotation, setNewAnnotation] = useState({ measure: 1, text: '', color: STICKY_COLORS[0] });
  const containerRef = useRef<HTMLDivElement>(null);

  const handleAddClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowAddForm(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newAnnotation.text.trim()) {
      onAddAnnotation(newAnnotation.measure, newAnnotation.text.trim(), newAnnotation.color);
      setNewAnnotation({ measure: 1, text: '', color: STICKY_COLORS[0] });
      setShowAddForm(false);
    }
  };

  const getAnnotationPosition = (measure: number) => {
    if (measureCount === 0) return { left: '50%' };
    const percentage = ((measure - 0.5) / Math.max(measureCount, 1)) * 100;
    return { left: `${Math.min(Math.max(percentage, 5), 95)}%` };
  };

  return (
    <div className="annotation-overlay-container" ref={containerRef}>
      {children}
      
      <div className="measure-markers">
        {Array.from({ length: measureCount }, (_, i) => (
          <div key={i} className="measure-marker" style={{ left: `${((i + 0.5) / measureCount) * 100}%` }}>
            <span className="measure-number">{i + 1}</span>
          </div>
        ))}
      </div>

      <div className="annotations-layer">
        {annotations.map((annotation, index) => {
          const pos = getAnnotationPosition(annotation.measure);
          const verticalOffset = (index % 3) * 60;
          return (
            <div
              key={annotation.id}
              className="sticky-note"
              style={{
                ...pos,
                top: `${20 + verticalOffset}px`,
                backgroundColor: annotation.color,
                transform: `rotate(${(index % 2 === 0 ? 1 : -1) * (2 + (index % 3))}deg)`,
              }}
            >
              <button
                className="delete-note-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteAnnotation(annotation.id);
                }}
              >
                ×
              </button>
              <div className="note-measure">第 {annotation.measure} 小节</div>
              <p className="note-text">{annotation.text}</p>
              <div className="note-author">— {annotation.author}</div>
            </div>
          );
        })}
      </div>

      <button className="add-annotation-btn" onClick={handleAddClick}>
        <span className="plus-icon">+</span>
        添加注释
      </button>

      {showAddForm && (
        <div className="annotation-form-overlay" onClick={() => setShowAddForm(false)}>
          <div className="annotation-form" onClick={(e) => e.stopPropagation()}>
            <h4>添加书签注释</h4>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>小节号</label>
                <input
                  type="number"
                  min="1"
                  max={measureCount || 100}
                  value={newAnnotation.measure}
                  onChange={(e) => setNewAnnotation((prev) => ({ ...prev, measure: parseInt(e.target.value) || 1 }))}
                />
              </div>
              <div className="form-group">
                <label>注释内容</label>
                <textarea
                  value={newAnnotation.text}
                  onChange={(e) => setNewAnnotation((prev) => ({ ...prev, text: e.target.value }))}
                  placeholder="标记难点、力度提示..."
                  rows={3}
                />
              </div>
              <div className="form-group">
                <label>便签颜色</label>
                <div className="color-picker">
                  {STICKY_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      className={`color-option ${newAnnotation.color === color ? 'selected' : ''}`}
                      style={{ backgroundColor: color }}
                      onClick={() => setNewAnnotation((prev) => ({ ...prev, color }))}
                    />
                  ))}
                </div>
              </div>
              <div className="form-actions">
                <button type="button" className="cancel-btn" onClick={() => setShowAddForm(false)}>
                  取消
                </button>
                <button type="submit" className="submit-btn">
                  添加
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
