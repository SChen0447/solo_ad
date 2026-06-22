import { useCallback, useRef, useEffect, useState } from 'react';
import { useWhiteboardStore } from '@/store';

interface InteractionState {
  isPanning: boolean;
  isDragging: boolean;
  isDrawing: boolean;
  dragStartX: number;
  dragStartY: number;
  dragElementStartX: number;
  dragElementStartY: number;
  panStartOffsetX: number;
  panStartOffsetY: number;
  drawingPoints: { x: number; y: number }[];
  moved: boolean;
}

export function useCanvasInteraction(containerRef: React.RefObject<HTMLDivElement | null>) {
  const offset = useWhiteboardStore(s => s.offset);
  const zoom = useWhiteboardStore(s => s.zoom);
  const tool = useWhiteboardStore(s => s.tool);
  const selectedId = useWhiteboardStore(s => s.selectedId);
  const drawing = useWhiteboardStore(s => s.drawing);

  const setOffset = useWhiteboardStore(s => s.setOffset);
  const setZoom = useWhiteboardStore(s => s.setZoom);
  const setTool = useWhiteboardStore(s => s.setTool);
  const setSelectedId = useWhiteboardStore(s => s.setSelectedId);
  const setDragging = useWhiteboardStore(s => s.setDragging);
  const addSticky = useWhiteboardStore(s => s.addSticky);
  const addRectangle = useWhiteboardStore(s => s.addRectangle);
  const addPath = useWhiteboardStore(s => s.addPath);
  const moveElement = useWhiteboardStore(s => s.moveElement);
  const updateElement = useWhiteboardStore(s => s.updateElement);
  const setDrawing = useWhiteboardStore(s => s.setDrawing);

  const [drawTick, setTick] = useState(0);

  const stateRef = useRef<InteractionState>({
    isPanning: false,
    isDragging: false,
    isDrawing: false,
    dragStartX: 0,
    dragStartY: 0,
    dragElementStartX: 0,
    dragElementStartY: 0,
    panStartOffsetX: 0,
    panStartOffsetY: 0,
    drawingPoints: [],
    moved: false,
  });

  const targetZoomRef = useRef(zoom);
  const animationFrameRef = useRef<number>(0);

  useEffect(() => {
    targetZoomRef.current = zoom;
  }, [zoom]);

  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  const screenToCanvas = useCallback(
    (screenX: number, screenY: number) => {
      const container = containerRef.current;
      if (!container) return { x: 0, y: 0 };
      const rect = container.getBoundingClientRect();
      return {
        x: (screenX - rect.left - offset.x) / zoom,
        y: (screenY - rect.top - offset.y) / zoom,
      };
    },
    [offset, zoom, containerRef]
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button === 1 || (e.button === 0 && e.altKey)) {
        stateRef.current = {
          ...stateRef.current,
          isPanning: true,
          panStartOffsetX: offset.x,
          panStartOffsetY: offset.y,
          dragStartX: e.clientX,
          dragStartY: e.clientY,
          moved: false,
        };
        setDragging(true);
        return;
      }

      if (e.button === 0) {
        if (tool === 'path') {
          const pos = screenToCanvas(e.clientX, e.clientY);
          stateRef.current = {
            ...stateRef.current,
            isDrawing: true,
            drawingPoints: [pos],
            moved: false,
          };
          setDrawing(true);
          return;
        }

        if (tool === 'sticky') {
          const pos = screenToCanvas(e.clientX, e.clientY);
          addSticky(pos.x - 120, pos.y - 80);
          setTool('select');
          return;
        }

        if (tool === 'rectangle') {
          const pos = screenToCanvas(e.clientX, e.clientY);
          addRectangle(pos.x - 100, pos.y - 70);
          setTool('select');
          return;
        }

        if (tool === 'select') {
          const canvasPos = screenToCanvas(e.clientX, e.clientY);
          const elements = useWhiteboardStore.getState().elements;
          const hitElement = [...elements].reverse().find(el => {
            if (el.type === 'path') return false;
            return (
              canvasPos.x >= el.x &&
              canvasPos.x <= el.x + el.width &&
              canvasPos.y >= el.y &&
              canvasPos.y <= el.y + el.height
            );
          });

          if (hitElement) {
            setSelectedId(hitElement.id);
            stateRef.current = {
              ...stateRef.current,
              isDragging: true,
              dragStartX: e.clientX,
              dragStartY: e.clientY,
              dragElementStartX: hitElement.x,
              dragElementStartY: hitElement.y,
              moved: false,
            };
            setDragging(true);
          } else {
            setSelectedId(null);
            stateRef.current = {
              ...stateRef.current,
              isPanning: true,
              panStartOffsetX: offset.x,
              panStartOffsetY: offset.y,
              dragStartX: e.clientX,
              dragStartY: e.clientY,
              moved: false,
            };
            setDragging(true);
          }
        }
      }
    },
    [tool, offset, zoom, screenToCanvas, setDragging, setDrawing, setSelectedId, addSticky, addRectangle, setTool]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      const s = stateRef.current;

      if (s.isPanning) {
        const dx = e.clientX - s.dragStartX;
        const dy = e.clientY - s.dragStartY;
        if (Math.abs(dx) > 2 || Math.abs(dy) > 2) {
          s.moved = true;
        }
        setOffset({
          x: s.panStartOffsetX + dx,
          y: s.panStartOffsetY + dy,
        });
        return;
      }

      if (s.isDragging && selectedId) {
        const dx = (e.clientX - s.dragStartX) / zoom;
        const dy = (e.clientY - s.dragStartY) / zoom;
        if (Math.abs(dx) > 2 || Math.abs(dy) > 2) {
          s.moved = true;
        }
        moveElement(selectedId, s.dragElementStartX + dx, s.dragElementStartY + dy);
        return;
      }

      if (s.isDrawing) {
        const pos = screenToCanvas(e.clientX, e.clientY);
        s.drawingPoints = [...s.drawingPoints, pos];
        s.moved = true;
        setTick(t => t + 1);
        return;
      }
    },
    [selectedId, zoom, screenToCanvas, setOffset, moveElement]
  );

  const handleMouseUp = useCallback(
    (_e: React.MouseEvent) => {
      const s = stateRef.current;

      if (s.isDragging && selectedId && s.moved) {
        const el = useWhiteboardStore.getState().elements.find(e => e.id === selectedId);
        if (el) {
          updateElement(selectedId, { x: el.x, y: el.y });
        }
      }

      if (s.isDrawing && s.drawingPoints.length >= 2) {
        addPath(s.drawingPoints);
      } else if (s.isDrawing) {
        setDrawing(false);
      }

      stateRef.current = {
        ...stateRef.current,
        isPanning: false,
        isDragging: false,
        isDrawing: false,
        drawingPoints: [],
        moved: false,
      };
      setDragging(false);
    },
    [selectedId, updateElement, addPath, setDrawing]
  );

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      const container = containerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      const newZoom = Math.max(0.3, Math.min(3.0, zoom * delta));

      const newOffsetX = mouseX - (mouseX - offset.x) * (newZoom / zoom);
      const newOffsetY = mouseY - (mouseY - offset.y) * (newZoom / zoom);

      targetZoomRef.current = newZoom;

      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }

      const startZoom = zoom;
      const startOffset = { ...offset };
      const startTime = performance.now();
      const duration = 200;

      const animate = (now: number) => {
        const elapsed = now - startTime;
        const t = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - t, 3);

        const currentZoom = startZoom + (newZoom - startZoom) * eased;
        const currentOffsetX = startOffset.x + (newOffsetX - startOffset.x) * eased;
        const currentOffsetY = startOffset.y + (newOffsetY - startOffset.y) * eased;

        setZoom(currentZoom);
        setOffset({ x: currentOffsetX, y: currentOffsetY });

        if (t < 1) {
          animationFrameRef.current = requestAnimationFrame(animate);
        }
      };

      animationFrameRef.current = requestAnimationFrame(animate);
    },
    [zoom, offset, containerRef, setZoom, setOffset]
  );

  return {
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleWheel,
    screenToCanvas,
    drawingPoints: drawing ? stateRef.current.drawingPoints : [],
    drawTick,
  };
}
