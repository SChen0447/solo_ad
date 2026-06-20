import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Stage, Layer, Rect as KonvaRect, Circle as KonvaCircle, Line, Text, Group } from 'react-konva';
import type KonvaType from 'konva';
import { AnimatePresence, motion } from 'framer-motion';
import type { Annotation, AnnotationType, CanvasElement, Point } from '../types';
import { CANVAS_WIDTH, CANVAS_HEIGHT, DEFAULT_COLOR, DEFAULT_STROKE_WIDTH } from '../types';

interface AnnotationEngineProps {
  annotations: Annotation[];
  activeTool: AnnotationType | null;
  onAnnotationChange: (annotation: Annotation) => void;
  showAnnotations: boolean;
  selectedAnnotationId: string | null;
  onSelectAnnotation: (id: string | null) => void;
  onDeleteAnnotation: (id: string) => void;
}

interface TextInputState {
  visible: boolean;
  position: Point;
  element: CanvasElement | null;
  annotationId: string | null;
}

const generateId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

const AnnotationEngine: React.FC<AnnotationEngineProps> = ({
  annotations,
  activeTool,
  onAnnotationChange,
  showAnnotations,
  selectedAnnotationId,
  onSelectAnnotation,
  onDeleteAnnotation,
}) => {
  const stageRef = useRef<KonvaType.Stage>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawingStart, setDrawingStart] = useState<Point | null>(null);
  const [currentEnd, setCurrentEnd] = useState<Point | null>(null);
  const [textInput, setTextInput] = useState<TextInputState>({
    visible: false,
    position: { x: 0, y: 0 },
    element: null,
    annotationId: null,
  });
  const [tempText, setTempText] = useState('');

  const getPointerPosition = useCallback((): Point | null => {
    const stage = stageRef.current;
    if (!stage) return null;
    const pos = stage.getPointerPosition();
    if (!pos) return null;
    return { x: Math.max(0, Math.min(pos.x, CANVAS_WIDTH)), y: Math.max(0, Math.min(pos.y, CANVAS_HEIGHT)) };
  }, []);

  const handleMouseDown = useCallback(() => {
    if (!activeTool) return;
    const pos = getPointerPosition();
    if (!pos) return;
    setIsDrawing(true);
    setDrawingStart(pos);
    setCurrentEnd(pos);
    onSelectAnnotation(null);
  }, [activeTool, getPointerPosition, onSelectAnnotation]);

  const handleMouseMove = useCallback(() => {
    if (!isDrawing) return;
    const pos = getPointerPosition();
    if (pos) {
      setCurrentEnd(pos);
    }
  }, [isDrawing, getPointerPosition]);

  const getCenterPoint = (start: Point, end: Point): Point => ({
    x: (start.x + end.x) / 2,
    y: (start.y + end.y) / 2,
  });

  const handleMouseUp = useCallback(() => {
    if (!isDrawing || !drawingStart || !currentEnd || !activeTool) {
      setIsDrawing(false);
      return;
    }

    const minDist = 10;
    const dx = currentEnd.x - drawingStart.x;
    const dy = currentEnd.y - drawingStart.y;
    if (Math.sqrt(dx * dx + dy * dy) < minDist) {
      setIsDrawing(false);
      setDrawingStart(null);
      setCurrentEnd(null);
      return;
    }

    const elementId = generateId();
    const element: CanvasElement = {
      id: elementId,
      type: activeTool,
      color: DEFAULT_COLOR,
      strokeWidth: DEFAULT_STROKE_WIDTH,
      startPoint: { ...drawingStart },
      endPoint: { ...currentEnd },
    };

    const center = getCenterPoint(drawingStart, currentEnd);
    setTextInput({
      visible: true,
      position: center,
      element,
      annotationId: null,
    });
    setTempText('');

    setIsDrawing(false);
    setDrawingStart(null);
    setCurrentEnd(null);
  }, [isDrawing, drawingStart, currentEnd, activeTool]);

  const handleTextSubmit = useCallback(() => {
    if (!textInput.element) return;

    const annotationId = textInput.annotationId ?? generateId();
    const annotation: Annotation = {
      id: annotationId,
      element: textInput.element,
      text: tempText.trim(),
      createdAt: Date.now(),
    };

    onAnnotationChange(annotation);
    setTextInput({ visible: false, position: { x: 0, y: 0 }, element: null, annotationId: null });
    setTempText('');
  }, [textInput, tempText, onAnnotationChange]);

  const handleTextCancel = useCallback(() => {
    setTextInput({ visible: false, position: { x: 0, y: 0 }, element: null, annotationId: null });
    setTempText('');
  }, []);

  const handleAnnotationClick = useCallback((annotation: Annotation, e: KonvaType.KonvaEventObject<MouseEvent>) => {
    e.cancelBubble = true;
    onSelectAnnotation(annotation.id);
  }, [onSelectAnnotation]);

  const handleAnnotationDblClick = useCallback((annotation: Annotation) => {
    const center = getCenterPoint(annotation.element.startPoint, annotation.element.endPoint);
    setTextInput({
      visible: true,
      position: center,
      element: annotation.element,
      annotationId: annotation.id,
    });
    setTempText(annotation.text);
  }, []);

  const handleStageClick = useCallback(() => {
    onSelectAnnotation(null);
  }, [onSelectAnnotation]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedAnnotationId) {
        if (document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
          onDeleteAnnotation(selectedAnnotationId);
        }
      }
      if (e.key === 'Escape') {
        if (textInput.visible) {
          handleTextCancel();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedAnnotationId, onDeleteAnnotation, textInput.visible, handleTextCancel]);

  const renderElement = (element: CanvasElement, isPreview = false) => {
    const { startPoint: sp, endPoint: ep, color, strokeWidth } = element;
    const commonProps = {
      stroke: color,
      strokeWidth,
      opacity: isPreview ? 0.8 : 1,
      hitStrokeWidth: 10,
    };

    if (element.type === 'arrow') {
      const dx = ep.x - sp.x;
      const dy = ep.y - sp.y;
      const angle = Math.atan2(dy, dx);
      const headLength = 15;
      const headWidth = 10;

      const arrowTip = { x: ep.x, y: ep.y };
      const base1 = {
        x: arrowTip.x - headLength * Math.cos(angle) + headWidth * Math.sin(angle) / 2,
        y: arrowTip.y - headLength * Math.sin(angle) - headWidth * Math.cos(angle) / 2,
      };
      const base2 = {
        x: arrowTip.x - headLength * Math.cos(angle) - headWidth * Math.sin(angle) / 2,
        y: arrowTip.y - headLength * Math.sin(angle) + headWidth * Math.cos(angle) / 2,
      };

      return (
        <Group key={element.id}>
          <Line
            points={[sp.x, sp.y, ep.x, ep.y]}
            {...commonProps}
          />
          <Line
            points={[base1.x, base1.y, arrowTip.x, arrowTip.y, base2.x, base2.y]}
            {...commonProps}
            closed
            fill={color}
          />
        </Group>
      );
    }

    if (element.type === 'rect') {
      const x = Math.min(sp.x, ep.x);
      const y = Math.min(sp.y, ep.y);
      const width = Math.abs(ep.x - sp.x);
      const height = Math.abs(ep.y - sp.y);
      return (
        <KonvaRect
          key={element.id}
          x={x}
          y={y}
          width={width}
          height={height}
          {...commonProps}
        />
      );
    }

    if (element.type === 'circle') {
      const cx = (sp.x + ep.x) / 2;
      const cy = (sp.y + ep.y) / 2;
      const rx = Math.abs(ep.x - sp.x) / 2;
      const ry = Math.abs(ep.y - sp.y) / 2;
      return (
        <KonvaCircle
          key={element.id}
          x={cx}
          y={cy}
          radiusX={rx}
          radiusY={ry}
          {...commonProps}
          strokeScaleEnabled={false}
        />
      );
    }

    return null;
  };

  const getTextPosition = (element: CanvasElement): Point => {
    const { startPoint: sp, endPoint: ep } = element;
    return {
      x: Math.max(sp.x, ep.x) + 12,
      y: Math.min(sp.y, ep.y) - 8,
    };
  };

  const previewElement = useMemo(() => {
    if (!isDrawing || !drawingStart || !currentEnd || !activeTool) return null;
    const previewEl: CanvasElement = {
      id: 'preview',
      type: activeTool,
      color: DEFAULT_COLOR,
      strokeWidth: DEFAULT_STROKE_WIDTH,
      startPoint: drawingStart,
      endPoint: currentEnd,
    };
    return renderElement(previewEl, true);
  }, [isDrawing, drawingStart, currentEnd, activeTool]);

  const emptyState = annotations.length === 0 && showAnnotations;

  return (
    <div style={{ position: 'relative', width: CANVAS_WIDTH, height: CANVAS_HEIGHT }}>
      <Stage
        ref={stageRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        style={{ backgroundColor: '#FFFFFF', borderRadius: 8, cursor: activeTool ? 'crosshair' : 'default' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onClick={handleStageClick}
      >
        <Layer>
          <AnimatePresence mode="wait">
            {showAnnotations && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                key="annotation-layer"
              >
                <>
                  {annotations.map((annotation) => {
                    const isSelected = selectedAnnotationId === annotation.id;
                    const textPos = getTextPosition(annotation.element);
                    return (
                      <Group
                        key={annotation.id}
                        onClick={(e) => handleAnnotationClick(annotation, e)}
                        onDblClick={() => handleAnnotationDblClick(annotation)}
                      >
                        {isSelected && (
                          <KonvaRect
                            x={Math.min(annotation.element.startPoint.x, annotation.element.endPoint.x) - 5}
                            y={Math.min(annotation.element.startPoint.y, annotation.element.endPoint.y) - 5}
                            width={Math.abs(annotation.element.endPoint.x - annotation.element.startPoint.x) + 10}
                            height={Math.abs(annotation.element.endPoint.y - annotation.element.startPoint.y) + 10}
                            stroke="#FF3366"
                            strokeWidth={1}
                            dash={[5, 5]}
                            listening={false}
                          />
                        )}
                        {renderElement(annotation.element)}
                        {annotation.text && (
                          <Text
                            x={textPos.x}
                            y={textPos.y}
                            text={annotation.text}
                            fontSize={14}
                            fill="#FFFFFF"
                            fontFamily="system-ui"
                            padding={6}
                            background="#1A1A2E"
                            cornerRadius={8}
                            wrap="char"
                            width={200}
                            listening={false}
                          />
                        )}
                      </Group>
                    );
                  })}
                  {previewElement}
                </>
              </motion.div>
            )}
          </AnimatePresence>
        </Layer>
      </Stage>

      {emptyState && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            color: '#666',
            fontSize: 16,
            pointerEvents: 'none',
            fontFamily: 'system-ui',
          }}
        >
          添加批注开始点评
        </motion.div>
      )}

      <AnimatePresence>
        {textInput.visible && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.2 }}
            style={{
              position: 'absolute',
              left: Math.min(Math.max(textInput.position.x - 120, 0), CANVAS_WIDTH - 260),
              top: Math.min(Math.max(textInput.position.y + 20, 0), CANVAS_HEIGHT - 140),
              width: 260,
              padding: 16,
              backgroundColor: '#1A1A2E',
              border: '1px solid #FF3366',
              borderRadius: 12,
              boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
              zIndex: 1000,
            }}
          >
            <textarea
              autoFocus
              value={tempText}
              onChange={(e) => setTempText(e.target.value)}
              placeholder="输入批注说明..."
              style={{
                width: '100%',
                minHeight: 60,
                padding: 10,
                borderRadius: 8,
                border: '1px solid #2A2A4A',
                backgroundColor: '#0F0F1E',
                color: '#FFFFFF',
                fontSize: 14,
                fontFamily: 'system-ui',
                resize: 'vertical',
                outline: 'none',
              }}
              onFocus={(e) => (e.target.style.borderColor = '#FF3366')}
              onBlur={(e) => (e.target.style.borderColor = '#2A2A4A')}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
              <button
                onClick={handleTextCancel}
                style={{
                  padding: '8px 16px',
                  borderRadius: 8,
                  border: 'none',
                  backgroundColor: '#2A2A4A',
                  color: '#FFFFFF',
                  cursor: 'pointer',
                  fontSize: 13,
                  fontFamily: 'system-ui',
                }}
              >
                取消
              </button>
              <button
                onClick={handleTextSubmit}
                style={{
                  padding: '8px 16px',
                  borderRadius: 8,
                  border: 'none',
                  backgroundColor: '#FF3366',
                  color: '#FFFFFF',
                  cursor: 'pointer',
                  fontSize: 13,
                  fontFamily: 'system-ui',
                }}
              >
                确定
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AnnotationEngine;
