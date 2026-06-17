import React, { useState, useRef, useCallback, useEffect } from 'react';
import type { Annotation, AnnotationType } from '../../types';
import { createAnnotation } from '../../services/api';
import './AnnotationLayer.css';

interface SelectionRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

interface AnnotationLayerProps {
  visible: boolean;
  containerRef: React.RefObject<HTMLDivElement>;
  annotations: Annotation[];
  submissionId: string;
  onAnnotationCreated: (annotation: Annotation) => void;
  onAnnotationClick?: (annotation: Annotation) => void;
  highlightId?: string | null;
}

const AnnotationLayer: React.FC<AnnotationLayerProps> = ({
  visible,
  containerRef,
  annotations,
  submissionId,
  onAnnotationCreated,
  onAnnotationClick,
  highlightId
}) => {
  const layerRef = useRef<HTMLDivElement>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const [selection, setSelection] = useState<SelectionRect | null>(null);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [showPanel, setShowPanel] = useState(false);
  const [panelPos, setPanelPos] = useState({ left: 0, top: 0 });
  const [annotationText, setAnnotationText] = useState('');
  const [annotationType, setAnnotationType] = useState<AnnotationType>('suggestion');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const getRelativePosition = useCallback((clientX: number, clientY: number) => {
    if (!layerRef.current) return { x: 0, y: 0 };
    const rect = layerRef.current.getBoundingClientRect();
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!visible) return;
    if (e.button !== 0) return;

    const pos = getRelativePosition(e.clientX, e.clientY);
    setStartPos(pos);
    setSelection({ left: pos.x, top: pos.y, width: 0, height: 0 });
    setIsSelecting(true);
    setShowPanel(false);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isSelecting) return;

    const pos = getRelativePosition(e.clientX, e.clientY);
    const left = Math.min(startPos.x, pos.x);
    const top = Math.min(startPos.y, pos.y);
    const width = Math.abs(pos.x - startPos.x);
    const height = Math.abs(pos.y - startPos.y);

    setSelection({ left, top, width, height });
  };

  const [panelTransformOrigin, setPanelTransformOrigin] = useState('center bottom');
  const [panelVisible, setPanelVisible] = useState(false);

  const handleMouseUp = (e: React.MouseEvent) => {
    if (!isSelecting) return;
    setIsSelecting(false);

    if (selection && selection.width > 10 && selection.height > 10) {
      const panelLeft = selection.left + selection.width / 2;
      const panelTop = selection.top - 10;

      const panelWidth = 320;
      const selectionCenterX = selection.left + selection.width / 2;
      const panelLeftEdge = selectionCenterX - panelWidth / 2;
      const originX = selectionCenterX - panelLeftEdge;
      const transformOrigin = `${originX}px bottom`;

      setPanelPos({ left: panelLeft, top: panelTop });
      setPanelTransformOrigin(transformOrigin);
      setPanelVisible(false);
      setShowPanel(true);
      setAnnotationText('');
      setAnnotationType('suggestion');

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setPanelVisible(true);
        });
      });
    } else {
      setSelection(null);
      setShowPanel(false);
    }
  };

  const handleSubmit = async () => {
    if (!selection || !annotationText.trim() || !submissionId) return;

    setIsSubmitting(true);
    try {
      const codeSnippet = annotationText.substring(0, 30);
      const annotation = await createAnnotation({
        type: annotationType,
        text: annotationText,
        selection: selection,
        codeSnippet: codeSnippet,
        submissionId: submissionId
      });
      onAnnotationCreated(annotation);
      setShowPanel(false);
      setSelection(null);
    } catch (error) {
      console.error('Failed to create annotation:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setPanelVisible(false);
    setTimeout(() => {
      setShowPanel(false);
      setSelection(null);
    }, 200);
  };

  const getAnnotationColor = (type: AnnotationType) => {
    switch (type) {
      case 'suggestion': return '#4CAF50';
      case 'error': return '#F44336';
      case 'question': return '#FF9800';
      default: return '#2196F3';
    }
  };

  const getAnnotationLabel = (type: AnnotationType) => {
    switch (type) {
      case 'suggestion': return '建议';
      case 'error': return '错误';
      case 'question': return '疑问';
      default: return '批注';
    }
  };

  if (!visible) return null;

  return (
    <div
      ref={layerRef}
      className="annotation-layer"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {annotations.map((annotation) => (
        <div
          key={annotation.id}
          className={`annotation-marker ${highlightId === annotation.id ? 'highlight' : ''}`}
          style={{
            left: annotation.selection.left,
            top: annotation.selection.top,
            width: annotation.selection.width,
            height: annotation.selection.height,
            borderColor: getAnnotationColor(annotation.type),
            backgroundColor: `${getAnnotationColor(annotation.type)}22`
          }}
          onClick={() => onAnnotationClick?.(annotation)}
        >
          <div
            className="annotation-marker-label"
            style={{ backgroundColor: getAnnotationColor(annotation.type) }}
          >
            {getAnnotationLabel(annotation.type)}
          </div>
        </div>
      ))}

      {selection && (
        <div
          className="selection-rect"
          style={{
            left: selection.left,
            top: selection.top,
            width: selection.width,
            height: selection.height
          }}
        />
      )}

      {showPanel && selection && (
        <div
          className={`annotation-panel ${panelVisible ? 'panel-visible' : 'panel-hidden'}`}
          style={{
            left: panelPos.left,
            top: panelPos.top,
            transform: 'translate(-50%, -100%)',
            transformOrigin: panelTransformOrigin
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="panel-header">
            <span>添加批注</span>
            <button className="panel-close" onClick={handleCancel}>×</button>
          </div>
          <div className="panel-types">
            {(['suggestion', 'error', 'question'] as AnnotationType[]).map((type) => (
              <button
                key={type}
                className={`type-btn ${annotationType === type ? 'active' : ''}`}
                style={{
                  borderColor: getAnnotationColor(type),
                  color: annotationType === type ? '#fff' : getAnnotationColor(type),
                  backgroundColor: annotationType === type ? getAnnotationColor(type) : 'transparent'
                }}
                onClick={() => setAnnotationType(type)}
              >
                <span
                  className="type-dot"
                  style={{ backgroundColor: getAnnotationColor(type) }}
                />
                {getAnnotationLabel(type)}
              </button>
            ))}
          </div>
          <textarea
            className="panel-textarea"
            value={annotationText}
            onChange={(e) => setAnnotationText(e.target.value.slice(0, 200))}
            placeholder="输入批注内容（最多200字）..."
            rows={4}
          />
          <div className="panel-footer">
            <span className="char-count">{annotationText.length}/200</span>
            <div className="panel-actions">
              <button className="btn-cancel" onClick={handleCancel}>
                取消
              </button>
              <button
                className="btn-confirm"
                onClick={handleSubmit}
                disabled={!annotationText.trim() || isSubmitting}
              >
                {isSubmitting ? '保存中...' : '确认'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AnnotationLayer;
