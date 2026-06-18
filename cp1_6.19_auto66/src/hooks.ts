import { useCallback, useRef } from 'react';
import { useExhibitionStore } from './store';
import { SHIFT_STEP } from './types';

interface DragState {
  startX: number;
  startY: number;
  offsetX: number;
  offsetY: number;
  isDragging: boolean;
}

export function useDragMove(
  frameId: string,
  onMove: (id: string, x: number, y: number) => void
) {
  const dragRef = useRef<DragState>({
    startX: 0,
    startY: 0,
    offsetX: 0,
    offsetY: 0,
    isDragging: false,
  });

  const frames = useExhibitionStore((s) => s.frames);
  const frame = frames.find((f) => f.id === frameId);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!frame) return;

      dragRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        offsetX: frame.x,
        offsetY: frame.y,
        isDragging: true,
      };

      const handleMouseMove = (ev: MouseEvent) => {
        if (!dragRef.current.isDragging) return;

        let dx = ev.clientX - dragRef.current.startX;
        let dy = ev.clientY - dragRef.current.startY;

        if (ev.shiftKey) {
          dx = Math.round(dx / SHIFT_STEP) * SHIFT_STEP;
          dy = Math.round(dy / SHIFT_STEP) * SHIFT_STEP;
        }

        const newX = dragRef.current.offsetX + dx;
        const newY = dragRef.current.offsetY + dy;
        onMove(frameId, newX, newY);
      };

      const handleMouseUp = () => {
        dragRef.current.isDragging = false;
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };

      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    },
    [frame, frameId, onMove]
  );

  return { handleMouseDown };
}

export function usePathNodeDrag(
  nodeId: string,
  onMove: (id: string, x: number, y: number) => void
) {
  const dragRef = useRef<DragState>({
    startX: 0,
    startY: 0,
    offsetX: 0,
    offsetY: 0,
    isDragging: false,
  });

  const pathNodes = useExhibitionStore((s) => s.pathNodes);
  const node = pathNodes.find((n) => n.id === nodeId);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!node) return;

      dragRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        offsetX: node.x,
        offsetY: node.y,
        isDragging: true,
      };

      const handleMouseMove = (ev: MouseEvent) => {
        if (!dragRef.current.isDragging) return;

        const dx = ev.clientX - dragRef.current.startX;
        const dy = ev.clientY - dragRef.current.startY;
        onMove(nodeId, dragRef.current.offsetX + dx, dragRef.current.offsetY + dy);
      };

      const handleMouseUp = () => {
        dragRef.current.isDragging = false;
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };

      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    },
    [node, nodeId, onMove]
  );

  return { handleMouseDown };
}
