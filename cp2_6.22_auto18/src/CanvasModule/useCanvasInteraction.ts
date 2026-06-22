import { useState, useRef, useCallback, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { CanvasElement, PathElement, PathPoint, SnapLine, ToolType, StickyElement, RectangleElement } from '../types';

interface UseCanvasInteractionProps {
  elements: CanvasElement[];
  setElements: React.Dispatch<React.SetStateAction<CanvasElement[]>>;
  selectedId: string | null;
  setSelectedId: (id: string | null) => void;
  currentTool: ToolType;
  onHistoryPush: (elements: CanvasElement[], action: string) => void;
}

interface DragState {
  isDragging: boolean;
  isPanning: boolean;
  isDrawing: boolean;
  dragStartX: number;
  dragStartY: number;
  elementStartX: number;
  elementStartY: number;
  draggingId: string | null;
  currentPathPoints: PathPoint[];
  tempRectangle: { x: number; y: number; width: number; height: number } | null;
}

const SNAP_THRESHOLD = 15;
const MIN_SCALE = 0.3;
const MAX_SCALE = 3.0;
const SCALE_ANIMATION_DURATION = 200;

function easeOutQuad(t: number): number {
  return t * (2 - t);
}

function getCanvasPoint(
  clientX: number,
  clientY: number,
  viewportX: number,
  viewportY: number,
  scale: number,
  canvasRect: DOMRect
): { x: number; y: number } {
  return {
    x: (clientX - canvasRect.left - viewportX) / scale,
    y: (clientY - canvasRect.top - viewportY) / scale,
  };
}

function smoothPath(points: PathPoint[]): string {
  if (points.length < 2) return '';
  let path = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    const p0 = points[i - 1];
    const p1 = points[i];
    const midX = (p0.x + p1.x) / 2;
    const midY = (p0.y + p1.y) / 2;
    path += ` Q ${p0.x} ${p0.y} ${midX} ${midY}`;
  }
  if (points.length >= 2) {
    const last = points[points.length - 1];
    path += ` L ${last.x} ${last.y}`;
  }
  return path;
}

export function useCanvasInteraction({
  elements,
  setElements,
  selectedId,
  setSelectedId,
  currentTool,
  onHistoryPush,
}: UseCanvasInteractionProps) {
  const [viewportX, setViewportX] = useState(0);
  const [viewportY, setViewportY] = useState(0);
  const [scale, setScale] = useState(1);
  const [snapLines, setSnapLines] = useState<SnapLine[]>([]);
  const [isAnimating, setIsAnimating] = useState(false);

  const canvasRef = useRef<HTMLDivElement>(null);
  const dragStateRef = useRef<DragState>({
    isDragging: false,
    isPanning: false,
    isDrawing: false,
    dragStartX: 0,
    dragStartY: 0,
    elementStartX: 0,
    elementStartY: 0,
    draggingId: null,
    currentPathPoints: [],
    tempRectangle: null,
  });
  const scaleAnimationRef = useRef<number | null>(null);

  const detectSnapLines = useCallback(
    (movingElement: CanvasElement, newX: number, newY: number): SnapLine[] => {
      const lines: SnapLine[] = [];
      const movingLeft = newX;
      const movingRight = newX + (movingElement.type !== 'path' ? (movingElement as StickyElement | RectangleElement).width : 0);
      const movingTop = newY;
      const movingBottom = newY + (movingElement.type !== 'path' ? (movingElement as StickyElement | RectangleElement).height : 0);
      const movingCenterX = newX + (movingElement.type !== 'path' ? (movingElement as StickyElement | RectangleElement).width / 2 : 0);
      const movingCenterY = newY + (movingElement.type !== 'path' ? (movingElement as StickyElement | RectangleElement).height / 2 : 0);

      for (const elem of elements) {
        if (elem.id === movingElement.id) continue;
        if (elem.type === 'path') continue;

        const elemLeft = elem.x;
        const elemRight = elem.x + (elem as StickyElement | RectangleElement).width;
        const elemTop = elem.y;
        const elemBottom = elem.y + (elem as StickyElement | RectangleElement).height;
        const elemCenterX = elem.x + (elem as StickyElement | RectangleElement).width / 2;
        const elemCenterY = elem.y + (elem as StickyElement | RectangleElement).height / 2;

        if (Math.abs(movingLeft - elemLeft) < SNAP_THRESHOLD) {
          lines.push({ type: 'vertical', position: elemLeft });
        }
        if (Math.abs(movingRight - elemRight) < SNAP_THRESHOLD) {
          lines.push({ type: 'vertical', position: elemRight });
        }
        if (Math.abs(movingLeft - elemRight) < SNAP_THRESHOLD) {
          lines.push({ type: 'vertical', position: elemRight });
        }
        if (Math.abs(movingRight - elemLeft) < SNAP_THRESHOLD) {
          lines.push({ type: 'vertical', position: elemLeft });
        }
        if (Math.abs(movingCenterX - elemCenterX) < SNAP_THRESHOLD) {
          lines.push({ type: 'vertical', position: elemCenterX });
        }

        if (Math.abs(movingTop - elemTop) < SNAP_THRESHOLD) {
          lines.push({ type: 'horizontal', position: elemTop });
        }
        if (Math.abs(movingBottom - elemBottom) < SNAP_THRESHOLD) {
          lines.push({ type: 'horizontal', position: elemBottom });
        }
        if (Math.abs(movingTop - elemBottom) < SNAP_THRESHOLD) {
          lines.push({ type: 'horizontal', position: elemBottom });
        }
        if (Math.abs(movingBottom - elemTop) < SNAP_THRESHOLD) {
          lines.push({ type: 'horizontal', position: elemTop });
        }
        if (Math.abs(movingCenterY - elemCenterY) < SNAP_THRESHOLD) {
          lines.push({ type: 'horizontal', position: elemCenterY });
        }
      }

      return lines;
    },
    [elements]
  );

  const applySnap = useCallback(
    (movingElement: CanvasElement, newX: number, newY: number): { x: number; y: number } => {
      let snappedX = newX;
      let snappedY = newY;

      if (movingElement.type === 'path') {
        return { x: snappedX, y: snappedY };
      }

      const width = (movingElement as StickyElement | RectangleElement).width;
      const height = (movingElement as StickyElement | RectangleElement).height;
      const movingLeft = newX;
      const movingRight = newX + width;
      const movingTop = newY;
      const movingBottom = newY + height;
      const movingCenterX = newX + width / 2;
      const movingCenterY = newY + height / 2;

      for (const elem of elements) {
        if (elem.id === movingElement.id) continue;
        if (elem.type === 'path') continue;

        const elemWidth = (elem as StickyElement | RectangleElement).width;
        const elemHeight = (elem as StickyElement | RectangleElement).height;
        const elemLeft = elem.x;
        const elemRight = elem.x + elemWidth;
        const elemTop = elem.y;
        const elemBottom = elem.y + elemHeight;
        const elemCenterX = elem.x + elemWidth / 2;
        const elemCenterY = elem.y + elemHeight / 2;

        if (Math.abs(movingLeft - elemLeft) < SNAP_THRESHOLD) snappedX = elemLeft;
        else if (Math.abs(movingRight - elemRight) < SNAP_THRESHOLD) snappedX = elemRight - width;
        else if (Math.abs(movingLeft - elemRight) < SNAP_THRESHOLD) snappedX = elemRight;
        else if (Math.abs(movingRight - elemLeft) < SNAP_THRESHOLD) snappedX = elemLeft - width;
        else if (Math.abs(movingCenterX - elemCenterX) < SNAP_THRESHOLD) snappedX = elemCenterX - width / 2;

        if (Math.abs(movingTop - elemTop) < SNAP_THRESHOLD) snappedY = elemTop;
        else if (Math.abs(movingBottom - elemBottom) < SNAP_THRESHOLD) snappedY = elemBottom - height;
        else if (Math.abs(movingTop - elemBottom) < SNAP_THRESHOLD) snappedY = elemBottom;
        else if (Math.abs(movingBottom - elemTop) < SNAP_THRESHOLD) snappedY = elemTop - height;
        else if (Math.abs(movingCenterY - elemCenterY) < SNAP_THRESHOLD) snappedY = elemCenterY - height / 2;
      }

      return { x: snappedX, y: snappedY };
    },
    [elements]
  );

  const handleWheel = useCallback(
    (e: WheelEvent) => {
      e.preventDefault();
      if (isAnimating) return;

      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      const targetScale = Math.min(Math.max(scale + delta, MIN_SCALE), MAX_SCALE);

      if (targetScale === scale) return;

      const canvasRect = canvasRef.current?.getBoundingClientRect();
      if (!canvasRect) return;

      const mouseX = e.clientX - canvasRect.left;
      const mouseY = e.clientY - canvasRect.top;

      const startScale = scale;
      const startTime = performance.now();
      setIsAnimating(true);

      const animate = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / SCALE_ANIMATION_DURATION, 1);
        const easeProgress = easeOutQuad(progress);
        const newScale = startScale + (targetScale - startScale) * easeProgress;

        const scaleRatio = newScale / startScale;
        const newViewportX = mouseX - (mouseX - viewportX) * scaleRatio;
        const newViewportY = mouseY - (mouseY - viewportY) * scaleRatio;

        setScale(newScale);
        setViewportX(newViewportX);
        setViewportY(newViewportY);

        if (progress < 1) {
          scaleAnimationRef.current = requestAnimationFrame(animate);
        } else {
          setIsAnimating(false);
          scaleAnimationRef.current = null;
        }
      };

      scaleAnimationRef.current = requestAnimationFrame(animate);
    },
    [scale, viewportX, viewportY, isAnimating]
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      const canvasRect = canvasRef.current?.getBoundingClientRect();
      if (!canvasRect) return;

      const point = getCanvasPoint(e.clientX, e.clientY, viewportX, viewportY, scale, canvasRect);

      if (currentTool === 'select') {
        const target = e.target as HTMLElement;
        const elementNode = target.closest('[data-element-id]');
        
        if (elementNode) {
          const elementId = elementNode.getAttribute('data-element-id');
          if (elementId) {
            const element = elements.find((el) => el.id === elementId);
            if (element) {
              setSelectedId(elementId);
              dragStateRef.current = {
                isDragging: true,
                isPanning: false,
                isDrawing: false,
                dragStartX: e.clientX,
                dragStartY: e.clientY,
                elementStartX: element.x,
                elementStartY: element.y,
                draggingId: elementId,
                currentPathPoints: [],
                tempRectangle: null,
              };
            }
          }
        } else {
          setSelectedId(null);
          dragStateRef.current = {
            isDragging: false,
            isPanning: true,
            isDrawing: false,
            dragStartX: e.clientX,
            dragStartY: e.clientY,
            elementStartX: viewportX,
            elementStartY: viewportY,
            draggingId: null,
            currentPathPoints: [],
            tempRectangle: null,
          };
        }
      } else if (currentTool === 'path') {
        dragStateRef.current = {
          isDragging: false,
          isPanning: false,
          isDrawing: true,
          dragStartX: e.clientX,
          dragStartY: e.clientY,
          elementStartX: 0,
          elementStartY: 0,
          draggingId: null,
          currentPathPoints: [point],
          tempRectangle: null,
        };
      } else if (currentTool === 'rectangle') {
        dragStateRef.current = {
          isDragging: false,
          isPanning: false,
          isDrawing: true,
          dragStartX: e.clientX,
          dragStartY: e.clientY,
          elementStartX: point.x,
          elementStartY: point.y,
          draggingId: null,
          currentPathPoints: [],
          tempRectangle: { x: point.x, y: point.y, width: 0, height: 0 },
        };
      } else if (currentTool === 'sticky') {
        const newSticky: StickyElement = {
          id: uuidv4(),
          type: 'sticky',
          x: point.x - 120,
          y: point.y - 80,
          zIndex: elements.length + 1,
          width: 240,
          height: 160,
          text: '',
          backgroundColor: '#FEF08A',
          borderColor: '#EAB308',
        };
        const newElements = [...elements, newSticky];
        onHistoryPush(newElements, 'add');
        setElements(newElements);
        setSelectedId(newSticky.id);
      }
    },
    [currentTool, elements, viewportX, viewportY, scale, setElements, setSelectedId, onHistoryPush]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      const canvasRect = canvasRef.current?.getBoundingClientRect();
      if (!canvasRect) return;

      const state = dragStateRef.current;
      const point = getCanvasPoint(e.clientX, e.clientY, viewportX, viewportY, scale, canvasRect);

      if (state.isPanning) {
        const dx = e.clientX - state.dragStartX;
        const dy = e.clientY - state.dragStartY;
        setViewportX(state.elementStartX + dx);
        setViewportY(state.elementStartY + dy);
      } else if (state.isDragging && state.draggingId) {
        const dx = (e.clientX - state.dragStartX) / scale;
        const dy = (e.clientY - state.dragStartY) / scale;
        const newX = state.elementStartX + dx;
        const newY = state.elementStartY + dy;

        const element = elements.find((el) => el.id === state.draggingId);
        if (element) {
          const { x: snappedX, y: snappedY } = applySnap(element, newX, newY);
          const lines = detectSnapLines(element, newX, newY);
          setSnapLines(lines);

          setElements((prev) =>
            prev.map((el) =>
              el.id === state.draggingId
                ? { ...el, x: snappedX, y: snappedY }
                : el
            )
          );
        }
      } else if (state.isDrawing && currentTool === 'path') {
        state.currentPathPoints.push(point);
        setElements([...elements]);
      } else if (state.isDrawing && currentTool === 'rectangle' && state.tempRectangle) {
        const width = point.x - state.elementStartX;
        const height = point.y - state.elementStartY;
        state.tempRectangle = {
          x: width >= 0 ? state.elementStartX : point.x,
          y: height >= 0 ? state.elementStartY : point.y,
          width: Math.abs(width),
          height: Math.abs(height),
        };
        setElements([...elements]);
      }
    },
    [viewportX, viewportY, scale, elements, currentTool, setElements, applySnap, detectSnapLines]
  );

  const handleMouseUp = useCallback(() => {
    const state = dragStateRef.current;

    if (state.isDragging && state.draggingId) {
      onHistoryPush(elements, 'move');
      setSnapLines([]);
    } else if (state.isDrawing && currentTool === 'path' && state.currentPathPoints.length > 1) {
      const newPath: PathElement = {
        id: uuidv4(),
        type: 'path',
        x: 0,
        y: 0,
        zIndex: elements.length + 1,
        points: state.currentPathPoints,
        strokeColor: '#6366F1',
        strokeWidth: 3,
        opacity: 0.85,
      };
      const newElements = [...elements, newPath];
      onHistoryPush(newElements, 'add');
      setElements(newElements);
    } else if (state.isDrawing && currentTool === 'rectangle' && state.tempRectangle) {
      const { x, y, width, height } = state.tempRectangle;
      if (width > 5 && height > 5) {
        const newRect: RectangleElement = {
          id: uuidv4(),
          type: 'rectangle',
          x,
          y,
          zIndex: elements.length + 1,
          width,
          height,
          fillColor: '#DBEAFE',
          borderColor: '#3B82F6',
          borderWidth: 1,
        };
        const newElements = [...elements, newRect];
        onHistoryPush(newElements, 'add');
        setElements(newElements);
      }
    }

    dragStateRef.current = {
      isDragging: false,
      isPanning: false,
      isDrawing: false,
      dragStartX: 0,
      dragStartY: 0,
      elementStartX: 0,
      elementStartY: 0,
      draggingId: null,
      currentPathPoints: [],
      tempRectangle: null,
    };
  }, [elements, currentTool, setElements, onHistoryPush]);

  const deleteElement = useCallback(
    (id: string) => {
      const newElements = elements.filter((el) => el.id !== id);
      onHistoryPush(newElements, 'delete');
      setElements(newElements);
      if (selectedId === id) {
        setSelectedId(null);
      }
    },
    [elements, selectedId, setElements, setSelectedId, onHistoryPush]
  );

  const updateElement = useCallback(
    (id: string, updates: Partial<CanvasElement>) => {
      const newElements = elements.map((el) =>
        el.id === id ? { ...el, ...updates } as CanvasElement : el
      );
      onHistoryPush(newElements, 'modify');
      setElements(newElements);
    },
    [elements, setElements, onHistoryPush]
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      canvas.removeEventListener('wheel', handleWheel);
      if (scaleAnimationRef.current) {
        cancelAnimationFrame(scaleAnimationRef.current);
      }
    };
  }, [handleWheel]);

  const currentPathPoints = dragStateRef.current.currentPathPoints;
  const tempRectangle = dragStateRef.current.tempRectangle;

  return {
    canvasRef,
    viewportX,
    viewportY,
    scale,
    snapLines,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    deleteElement,
    updateElement,
    currentPathPoints,
    tempRectangle,
    smoothPath,
  };
}
