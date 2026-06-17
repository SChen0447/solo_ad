import { useRef, useCallback, useEffect, useState } from 'react';
import type { DragData } from '../types';

interface DragState {
  isDragging: boolean;
  data: DragData | null;
  position: { x: number; y: number };
}

const applyDragStyles = (el: HTMLElement) => {
  el.dataset.origTransform = el.style.transform;
  el.dataset.origBoxShadow = el.style.boxShadow;
  el.dataset.origTransition = el.style.transition;
  el.dataset.origZIndex = el.style.zIndex;
  el.style.transform = 'scale(1.05)';
  el.style.boxShadow = '0 12px 28px rgba(0,0,0,0.35)';
  el.style.transition = 'transform 0.15s ease, box-shadow 0.15s ease';
  el.style.zIndex = '1000';
};

const restoreDragStyles = (el: HTMLElement) => {
  el.style.transform = el.dataset.origTransform || '';
  el.style.boxShadow = el.dataset.origBoxShadow || '';
  el.style.transition = el.dataset.origTransition || '';
  el.style.zIndex = el.dataset.origZIndex || '';
  delete el.dataset.origTransform;
  delete el.dataset.origBoxShadow;
  delete el.dataset.origTransition;
  delete el.dataset.origZIndex;
};

export const useDrag = <T extends DragData>(
  elementRef: React.RefObject<HTMLElement>,
  data: T
) => {
  const [isDragging, setIsDragging] = useState(false);
  const dragDataRef = useRef<{
    startX: number;
    startY: number;
    offsetX: number;
    offsetY: number;
    animationId: number | null;
  }>({
    startX: 0,
    startY: 0,
    offsetX: 0,
    offsetY: 0,
    animationId: null,
  });

  const onDragStart = useCallback((e: MouseEvent | TouchEvent) => {
    e.preventDefault();
    const target = elementRef.current;
    if (!target) return;

    const rect = target.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    dragDataRef.current = {
      startX: clientX,
      startY: clientY,
      offsetX: clientX - rect.left,
      offsetY: clientY - rect.top,
      animationId: null,
    };

    applyDragStyles(target);
    setIsDragging(true);

    const customEvent = new CustomEvent<DragData>('dnd:start', {
      detail: data,
      bubbles: true,
    });
    target.dispatchEvent(customEvent);
  }, [elementRef, data]);

  const onDragEnd = useCallback(() => {
    const target = elementRef.current;
    if (target) {
      restoreDragStyles(target);
    }
    setIsDragging(false);
  }, [elementRef]);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    element.addEventListener('mousedown', onDragStart);
    element.addEventListener('touchstart', onDragStart, { passive: false });
    document.addEventListener('mouseup', onDragEnd);
    document.addEventListener('touchend', onDragEnd);

    return () => {
      element.removeEventListener('mousedown', onDragStart);
      element.removeEventListener('touchstart', onDragStart);
      document.removeEventListener('mouseup', onDragEnd);
      document.removeEventListener('touchend', onDragEnd);
    };
  }, [elementRef, onDragStart, onDragEnd]);

  return {
    isDragging,
  };
};

interface UseDropOptions {
  onDrop: (data: DragData, position: { x: number; y: number }) => void;
  onDragOver?: (position: { x: number; y: number }) => void;
  onDragEnter?: () => void;
  onDragLeave?: () => void;
}

export const useDrop = (
  containerRef: React.RefObject<HTMLElement>,
  options: UseDropOptions
) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const dragStateRef = useRef<{
    isDragging: boolean;
    data: DragData | null;
    position: { x: number; y: number };
  }>({
    isDragging: false,
    data: null,
    position: { x: 0, y: 0 },
  });

  const handleDragStart = useCallback((e: CustomEvent<DragData>) => {
    dragStateRef.current.isDragging = true;
    dragStateRef.current.data = e.detail;
    setIsDragOver(true);
    if (options.onDragEnter) {
      options.onDragEnter();
    }
  }, [options]);

  const handleDragEnd = useCallback(() => {
    dragStateRef.current.isDragging = false;
    dragStateRef.current.data = null;
    setIsDragOver(false);
    if (options.onDragLeave) {
      options.onDragLeave();
    }
  }, [options]);

  const handleMove = useCallback((e: MouseEvent | TouchEvent) => {
    if (!dragStateRef.current.isDragging) return;

    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    const x = clientX - rect.left;
    const y = clientY - rect.top;

    dragStateRef.current.position = { x, y };

    if (options.onDragOver) {
      options.onDragOver({ x, y });
    }

    const moveEvent = new CustomEvent<{ data: DragData; position: { x: number; y: number } }>('dnd:move', {
      detail: {
        data: dragStateRef.current.data!,
        position: { x, y },
      },
      bubbles: true,
    });
    container.dispatchEvent(moveEvent);
  }, [containerRef, options]);

  const handleDrop = useCallback((e: MouseEvent | TouchEvent) => {
    if (!dragStateRef.current.isDragging || !dragStateRef.current.data) return;

    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const clientX = 'changedTouches' in e ? e.changedTouches[0].clientX : e.clientX;
    const clientY = 'changedTouches' in e ? e.changedTouches[0].clientY : e.clientY;

    const x = clientX - rect.left;
    const y = clientY - rect.top;

    options.onDrop(dragStateRef.current.data, { x, y });
    handleDragEnd();
  }, [containerRef, options, handleDragEnd]);

  useEffect(() => {
    const handleGlobalStart = (e: Event) => {
      const target = e.target as HTMLElement;
      if (target.closest('[draggable="true"]')) {
        const dataAttr = target.getAttribute('data-drag');
        if (dataAttr) {
          try {
            const data = JSON.parse(dataAttr) as DragData;
            dragStateRef.current.isDragging = true;
            dragStateRef.current.data = data;
            setIsDragOver(true);
          } catch {
            // ignore
          }
        }
      }
    };

    document.addEventListener('dnd:start', handleDragStart as EventListener);
    document.addEventListener('mousemove', handleMove);
    document.addEventListener('touchmove', handleMove, { passive: false });
    document.addEventListener('mouseup', handleDrop);
    document.addEventListener('touchend', handleDrop);
    document.addEventListener('mousedown', handleGlobalStart);

    return () => {
      document.removeEventListener('dnd:start', handleDragStart as EventListener);
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('touchmove', handleMove);
      document.removeEventListener('mouseup', handleDrop);
      document.removeEventListener('touchend', handleDrop);
      document.removeEventListener('mousedown', handleGlobalStart);
    };
  }, [handleDragStart, handleMove, handleDrop]);

  return {
    isDragOver,
    dragState: dragStateRef.current as DragState,
  };
};

export const useDragDrop = () => {
  return {
    useDrag,
    useDrop,
  };
};
