import React, { useState, useRef, useEffect, useCallback } from 'react';
import type { Annotation, ToolType, Point, User } from '../types';
import type {
  ArrowAnnotation,
  RectangleAnnotation,
  TextAnnotation,
  BrushAnnotation,
} from '../types';
import { v4 as uuidv4 } from 'uuid';

interface CanvasEditorProps {
  imageUrl: string;
  annotations: Annotation[];
  visibleAnnotationIds?: string[];
  currentTool: ToolType | null;
  color: string;
  strokeWidth: number;
  user: User;
  sessionId: string;
  selectedAnnotationId: string | null;
  highlightedAnnotationId: string | null;
  onAnnotationCreate: (annotation: Annotation) => void;
  onAnnotationSelect: (id: string | null) => void;
  onAnnotationUpdate: (annotation: Annotation) => void;
  disabled?: boolean;
}

type DrawingState =
  | { type: 'none' }
  | { type: 'arrow'; startPoint: Point }
  | { type: 'rectangle'; startPoint: Point }
  | { type: 'brush'; points: Point[] }
  | { type: 'text'; position: Point };

const CanvasEditor: React.FC<CanvasEditorProps> = ({
  imageUrl,
  annotations,
  visibleAnnotationIds,
  currentTool,
  color,
  strokeWidth,
  user,
  sessionId,
  selectedAnnotationId,
  highlightedAnnotationId,
  onAnnotationCreate,
  onAnnotationSelect,
  onAnnotationUpdate,
  disabled = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [drawingState, setDrawingState] = useState<DrawingState>({ type: 'none' });
  const [currentPosition, setCurrentPosition] = useState<Point | null>(null);
  const [textInput, setTextInput] = useState('');
  const [showTextInput, setShowTextInput] = useState(false);
  const [textInputPosition, setTextInputPosition] = useState<Point>({ x: 0, y: 0 });

  const getSvgPoint = useCallback((clientX: number, clientY: number): Point => {
    if (!svgRef.current) return { x: 0, y: 0 };
    const rect = svgRef.current.getBoundingClientRect();
    return {
      x: (clientX - rect.left - offset.x) / scale,
      y: (clientY - rect.top - offset.y) / scale,
    };
  }, [offset, scale]);

  useEffect(() => {
    const updateLayout = () => {
      if (!containerRef.current || imageSize.width === 0) return;
      
      const container = containerRef.current;
      const containerWidth = container.clientWidth;
      const containerHeight = container.clientHeight;
      
      const scaleX = containerWidth / imageSize.width;
      const scaleY = containerHeight / imageSize.height;
      const newScale = Math.min(scaleX, scaleY, 1);
      
      const scaledWidth = imageSize.width * newScale;
      const scaledHeight = imageSize.height * newScale;
      
      setScale(newScale);
      setOffset({
        x: (containerWidth - scaledWidth) / 2,
        y: (containerHeight - scaledHeight) / 2,
      });
    };

    updateLayout();
    window.addEventListener('resize', updateLayout);
    return () => window.removeEventListener('resize', updateLayout);
  }, [imageSize]);

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    setImageSize({ width: img.naturalWidth, height: img.naturalHeight });
    setImageLoaded(true);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (disabled || !currentTool) return;
    
    const point = getSvgPoint(e.clientX, e.clientY);
    
    switch (currentTool) {
      case 'arrow':
        setDrawingState({ type: 'arrow', startPoint: point });
        setCurrentPosition(point);
        break;
      case 'rectangle':
        setDrawingState({ type: 'rectangle', startPoint: point });
        setCurrentPosition(point);
        break;
      case 'brush':
        setDrawingState({ type: 'brush', points: [point] });
        break;
      case 'text':
        setTextInputPosition(point);
        setShowTextInput(true);
        setTextInput('');
        setDrawingState({ type: 'text', position: point });
        break;
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (disabled) return;
    
    const point = getSvgPoint(e.clientX, e.clientY);
    setCurrentPosition(point);

    if (drawingState.type === 'brush') {
      setDrawingState({
        ...drawingState,
        points: [...drawingState.points, point],
      });
    }
  };

  const handleMouseUp = () => {
    if (disabled || !currentTool) return;

    const now = Date.now();

    switch (drawingState.type) {
      case 'arrow':
        if (currentPosition) {
          const dx = currentPosition.x - drawingState.startPoint.x;
          const dy = currentPosition.y - drawingState.startPoint.y;
          if (Math.sqrt(dx * dx + dy * dy) > 5) {
            const annotation: ArrowAnnotation = {
              id: uuidv4(),
              type: 'arrow',
              userId: user.id,
              userName: user.name,
              userAvatar: user.avatar,
              timestamp: now,
              sessionId,
              color,
              startPoint: drawingState.startPoint,
              endPoint: currentPosition,
              strokeWidth,
            };
            onAnnotationCreate(annotation);
          }
        }
        break;

      case 'rectangle':
        if (currentPosition) {
          const x = Math.min(drawingState.startPoint.x, currentPosition.x);
          const y = Math.min(drawingState.startPoint.y, currentPosition.y);
          const width = Math.abs(currentPosition.x - drawingState.startPoint.x);
          const height = Math.abs(currentPosition.y - drawingState.startPoint.y);
          if (width > 5 && height > 5) {
            const annotation: RectangleAnnotation = {
              id: uuidv4(),
              type: 'rectangle',
              userId: user.id,
              userName: user.name,
              userAvatar: user.avatar,
              timestamp: now,
              sessionId,
              color,
              x,
              y,
              width,
              height,
              strokeWidth,
              fillOpacity: 0.2,
            };
            onAnnotationCreate(annotation);
          }
        }
        break;

      case 'brush':
        if (drawingState.points.length > 2) {
          const annotation: BrushAnnotation = {
            id: uuidv4(),
            type: 'brush',
            userId: user.id,
            userName: user.name,
            userAvatar: user.avatar,
            timestamp: now,
            sessionId,
            color,
            points: drawingState.points,
            strokeWidth,
          };
          onAnnotationCreate(annotation);
        }
        break;
    }

    setDrawingState({ type: 'none' });
    setCurrentPosition(null);
  };

  const handleTextSubmit = () => {
    if (!textInput.trim()) {
      setShowTextInput(false);
      setDrawingState({ type: 'none' });
      return;
    }

    const annotation: TextAnnotation = {
      id: uuidv4(),
      type: 'text',
      userId: user.id,
      userName: user.name,
      userAvatar: user.avatar,
      timestamp: Date.now(),
      sessionId,
      color,
      x: textInputPosition.x,
      y: textInputPosition.y,
      text: textInput.trim(),
      fontSize: 16,
    };
    onAnnotationCreate(annotation);
    setShowTextInput(false);
    setTextInput('');
    setDrawingState({ type: 'none' });
  };

  const renderAnnotation = (annotation: Annotation) => {
    const isVisible = !visibleAnnotationIds || visibleAnnotationIds.includes(annotation.id);
    const isSelected = annotation.id === selectedAnnotationId;
    const isHighlighted = annotation.id === highlightedAnnotationId;
    
    if (!isVisible) return null;

    const commonProps = {
      key: annotation.id,
      onClick: (e: React.MouseEvent) => {
        e.stopPropagation();
        onAnnotationSelect(annotation.id);
      },
      style: {
        cursor: disabled ? 'default' : 'pointer',
        filter: isHighlighted ? 'url(#highlight-glow)' : undefined,
      },
    };

    switch (annotation.type) {
      case 'arrow':
        return (
          <g {...commonProps}>
            <line
              x1={annotation.startPoint.x}
              y1={annotation.startPoint.y}
              x2={annotation.endPoint.x}
              y2={annotation.endPoint.y}
              stroke={annotation.color}
              strokeWidth={annotation.strokeWidth}
              strokeLinecap="round"
            />
            <polygon
              points={getArrowPoints(annotation.startPoint, annotation.endPoint, annotation.strokeWidth)}
              fill={annotation.color}
            />
            {isSelected && !disabled && renderSelectionBox(
              Math.min(annotation.startPoint.x, annotation.endPoint.x) - 10,
              Math.min(annotation.startPoint.y, annotation.endPoint.y) - 10,
              Math.abs(annotation.endPoint.x - annotation.startPoint.x) + 20,
              Math.abs(annotation.endPoint.y - annotation.startPoint.y) + 20,
              annotation.id
            )}
          </g>
        );

      case 'rectangle':
        return (
          <g {...commonProps}>
            <rect
              x={annotation.x}
              y={annotation.y}
              width={annotation.width}
              height={annotation.height}
              stroke={annotation.color}
              strokeWidth={annotation.strokeWidth}
              fill={annotation.color}
              fillOpacity={annotation.fillOpacity}
              rx={4}
            />
            {isSelected && !disabled && renderSelectionBox(
              annotation.x - 5,
              annotation.y - 5,
              annotation.width + 10,
              annotation.height + 10,
              annotation.id
            )}
          </g>
        );

      case 'text':
        return (
          <g {...commonProps}>
            <rect
              x={annotation.x - 8}
              y={annotation.y - annotation.fontSize - 4}
              width={annotation.text.length * annotation.fontSize * 0.6 + 16}
              height={annotation.fontSize + 16}
              rx={8}
              fill={annotation.color}
              fillOpacity={0.9}
            />
            <text
              x={annotation.x}
              y={annotation.y}
              fill="white"
              fontSize={annotation.fontSize}
              fontWeight={500}
              dominantBaseline="middle"
            >
              {annotation.text}
            </text>
            {isSelected && !disabled && renderSelectionBox(
              annotation.x - 10,
              annotation.y - annotation.fontSize - 10,
              annotation.text.length * annotation.fontSize * 0.6 + 20,
              annotation.fontSize + 20,
              annotation.id
            )}
          </g>
        );

      case 'brush':
        if (annotation.points.length < 2) return null;
        const pathData = annotation.points.reduce(
          (acc, point, i) => `${acc}${i === 0 ? 'M' : 'L'} ${point.x} ${point.y}`,
          ''
        );
        return (
          <g {...commonProps}>
            <path
              d={pathData}
              stroke={annotation.color}
              strokeWidth={annotation.strokeWidth}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {isSelected && !disabled && renderSelectionBox(
              Math.min(...annotation.points.map(p => p.x)) - 5,
              Math.min(...annotation.points.map(p => p.y)) - 5,
              Math.max(...annotation.points.map(p => p.x)) - Math.min(...annotation.points.map(p => p.x)) + 10,
              Math.max(...annotation.points.map(p => p.y)) - Math.min(...annotation.points.map(p => p.y)) + 10,
              annotation.id
            )}
          </g>
        );
    }
  };

  const renderSelectionBox = (x: number, y: number, width: number, height: number, annotationId: string) => (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill="none"
        stroke="var(--primary-color)"
        strokeWidth={2}
        strokeDasharray="5,5"
      />
      {[
        { x: x, y: y },
        { x: x + width, y: y },
        { x: x, y: y + height },
        { x: x + width, y: y + height },
      ].map((corner, i) => (
        <rect
          key={i}
          x={corner.x - 4}
          y={corner.y - 4}
          width={8}
          height={8}
          fill="var(--primary-color)"
          stroke="white"
          strokeWidth={1}
          style={{ cursor: 'nwse-resize' }}
          onMouseDown={(e) => {
            e.stopPropagation();
          }}
        />
      ))}
    </g>
  );

  const renderPreview = () => {
    if (!currentPosition || drawingState.type === 'none' || drawingState.type === 'text') return null;

    switch (drawingState.type) {
      case 'arrow':
        return (
          <g>
            <line
              x1={drawingState.startPoint.x}
              y1={drawingState.startPoint.y}
              x2={currentPosition.x}
              y2={currentPosition.y}
              stroke={color}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              opacity={0.7}
            />
            <polygon
              points={getArrowPoints(drawingState.startPoint, currentPosition, strokeWidth)}
              fill={color}
              opacity={0.7}
            />
          </g>
        );
      case 'rectangle':
        const x = Math.min(drawingState.startPoint.x, currentPosition.x);
        const y = Math.min(drawingState.startPoint.y, currentPosition.y);
        const w = Math.abs(currentPosition.x - drawingState.startPoint.x);
        const h = Math.abs(currentPosition.y - drawingState.startPoint.y);
        return (
          <rect
            x={x}
            y={y}
            width={w}
            height={h}
            stroke={color}
            strokeWidth={strokeWidth}
            fill={color}
            fillOpacity={0.2}
            rx={4}
            opacity={0.7}
          />
        );
      case 'brush':
        if (drawingState.points.length < 2) return null;
        const brushPath = drawingState.points.reduce(
          (acc, point, i) => `${acc}${i === 0 ? 'M' : 'L'} ${point.x} ${point.y}`,
          ''
        );
        return (
          <path
            d={brushPath}
            stroke={color}
            strokeWidth={strokeWidth}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={0.7}
          />
        );
    }
  };

  const getArrowPoints = (start: Point, end: Point, size: number): string => {
    const angle = Math.atan2(end.y - start.y, end.x - start.x);
    const headLen = size * 4;
    const p1x = end.x - headLen * Math.cos(angle - Math.PI / 6);
    const p1y = end.y - headLen * Math.sin(angle - Math.PI / 6);
    const p2x = end.x - headLen * Math.cos(angle + Math.PI / 6);
    const p2y = end.y - headLen * Math.sin(angle + Math.PI / 6);
    return `${end.x},${end.y} ${p1x},${p1y} ${p2x},${p2y}`;
  };

  const handleCanvasClick = (e: React.MouseEvent) => {
    if ((e.target as SVGElement).tagName === 'svg' || (e.target as SVGElement).tagName === 'image') {
      onAnnotationSelect(null);
    }
  };

  return (
    <div 
      ref={containerRef} 
      style={styles.container}
      onClick={handleCanvasClick}
    >
      {!imageLoaded && (
        <div style={styles.loading}>
          <div style={styles.spinner} />
          <span style={styles.loadingText}>加载图片中...</span>
        </div>
      )}
      
      <svg
        ref={svgRef}
        style={{
          ...styles.svg,
          transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
          cursor: currentTool && !disabled ? getCursor(currentTool) : 'default',
        }}
        width={imageSize.width}
        height={imageSize.height}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <defs>
          <filter id="highlight-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <image
          href={imageUrl}
          width={imageSize.width}
          height={imageSize.height}
          onLoad={handleImageLoad}
          style={{ pointerEvents: 'none' }}
        />

        {annotations.map(renderAnnotation)}
        {renderPreview()}
      </svg>

      {showTextInput && (
        <div
          style={{
            ...styles.textInputContainer,
            left: offset.x + textInputPosition.x * scale,
            top: offset.y + textInputPosition.y * scale,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <input
            type="text"
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleTextSubmit();
              if (e.key === 'Escape') {
                setShowTextInput(false);
                setDrawingState({ type: 'none' });
              }
            }}
            style={{
              ...styles.textInput,
              backgroundColor: color,
            }}
            autoFocus
            placeholder="输入文字..."
          />
          <div style={styles.textInputActions}>
            <button style={styles.textInputBtn} onClick={handleTextSubmit}>确定</button>
            <button 
              style={{ ...styles.textInputBtn, ...styles.textInputBtnCancel }}
              onClick={() => {
                setShowTextInput(false);
                setDrawingState({ type: 'none' });
              }}
            >
              取消
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const getCursor = (tool: ToolType): string => {
  switch (tool) {
    case 'arrow':
    case 'rectangle':
      return 'crosshair';
    case 'text':
      return 'text';
    case 'brush':
      return 'cell';
    default:
      return 'default';
  }
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    width: '100%',
    height: '100%',
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: '#0f0f1a',
  },
  svg: {
    position: 'absolute',
    transformOrigin: 'top left',
    userSelect: 'none',
  },
  loading: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    zIndex: 10,
  },
  spinner: {
    width: 40,
    height: 40,
    border: '3px solid var(--border-color)',
    borderTopColor: 'var(--primary-color)',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  loadingText: {
    color: 'var(--text-secondary)',
    fontSize: 14,
  },
  textInputContainer: {
    position: 'absolute',
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    zIndex: 1000,
    animation: 'fadeIn 0.2s ease-out',
  },
  textInput: {
    padding: '8px 12px',
    border: 'none',
    borderRadius: 'var(--border-radius)',
    color: 'white',
    fontSize: 14,
    minWidth: 150,
    outline: 'none',
    boxShadow: 'var(--shadow-md)',
  },
  textInputActions: {
    display: 'flex',
    gap: 8,
  },
  textInputBtn: {
    padding: '6px 16px',
    backgroundColor: 'var(--primary-color)',
    color: 'white',
    borderRadius: 'var(--border-radius-sm)',
    fontSize: 12,
    fontWeight: 500,
  },
  textInputBtnCancel: {
    backgroundColor: 'var(--border-color)',
    color: 'var(--text-secondary)',
  },
};

export default CanvasEditor;
