import { useState, useCallback, useRef } from 'react';
import type { CanvasElement, CanvasView, ImageElement, TextElement, DrawingElement, Point } from './types';

const generateId = () => Math.random().toString(36).slice(2, 11);

export function useCanvasState() {
  const [elements, setElements] = useState<CanvasElement[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [view, setView] = useState<CanvasView>({
    offsetX: 0,
    offsetY: 0,
    scale: 1,
  });
  const zIndexCounter = useRef(1);

  const getNextZIndex = useCallback(() => {
    zIndexCounter.current += 1;
    return zIndexCounter.current;
  }, []);

  const addImageElement = useCallback((src: string, centerX: number, centerY: number) => {
    const id = generateId();
    const width = 150;
    const height = 150;
    const newElement: ImageElement = {
      id,
      type: 'image',
      x: centerX - width / 2,
      y: centerY - height / 2,
      width,
      height,
      rotation: 0,
      zIndex: getNextZIndex(),
      locked: false,
      src,
    };
    setElements((prev) => [...prev, newElement]);
    setSelectedId(id);
    return id;
  }, [getNextZIndex]);

  const addTextElement = useCallback((centerX: number, centerY: number) => {
    const id = generateId();
    const width = 200;
    const height = 60;
    const newElement: TextElement = {
      id,
      type: 'text',
      x: centerX - width / 2,
      y: centerY - height / 2,
      width,
      height,
      rotation: 0,
      zIndex: getNextZIndex(),
      locked: false,
      content: '双击编辑文字',
      fontSize: 18,
      fontWeight: 'normal',
      fontStyle: 'normal',
    };
    setElements((prev) => [...prev, newElement]);
    setSelectedId(id);
    return id;
  }, [getNextZIndex]);

  const addDrawingElement = useCallback(
    (points: Point[], strokeColor: string, strokeWidth: 2 | 4 | 6, bounds: { x: number; y: number; width: number; height: number }) => {
      const id = generateId();
      const newElement: DrawingElement = {
        id,
        type: 'drawing',
        x: bounds.x,
        y: bounds.y,
        width: bounds.width,
        height: bounds.height,
        rotation: 0,
        zIndex: getNextZIndex(),
        locked: false,
        points,
        strokeColor,
        strokeWidth,
      };
      setElements((prev) => [...prev, newElement]);
      setSelectedId(id);
      return id;
    },
    [getNextZIndex]
  );

  const updateElement = useCallback((id: string, updates: Partial<CanvasElement>) => {
    setElements((prev) =>
      prev.map((el) => (el.id === id ? { ...el, ...updates } as CanvasElement : el))
    );
  }, []);

  const deleteElement = useCallback((id: string) => {
    setElements((prev) => prev.filter((el) => el.id !== id));
    if (selectedId === id) {
      setSelectedId(null);
    }
  }, [selectedId]);

  const duplicateElement = useCallback((id: string) => {
    const element = elements.find((el) => el.id === id);
    if (!element) return;
    const newId = generateId();
    const newElement = {
      ...element,
      id: newId,
      x: element.x + 20,
      y: element.y + 20,
      zIndex: getNextZIndex(),
    } as CanvasElement;
    setElements((prev) => [...prev, newElement]);
    setSelectedId(newId);
  }, [elements, getNextZIndex]);

  const bringToFront = useCallback((id: string) => {
    updateElement(id, { zIndex: getNextZIndex() });
  }, [updateElement, getNextZIndex]);

  const sendToBack = useCallback((id: string) => {
    const minZ = Math.min(...elements.map((el) => el.zIndex));
    updateElement(id, { zIndex: minZ - 1 });
  }, [elements, updateElement]);

  const toggleLock = useCallback((id: string) => {
    const element = elements.find((el) => el.id === id);
    if (element) {
      updateElement(id, { locked: !element.locked });
    }
  }, [elements, updateElement]);

  const setViewOffset = useCallback((offsetX: number, offsetY: number) => {
    setView((prev) => ({ ...prev, offsetX, offsetY }));
  }, []);

  const setViewScale = useCallback((scale: number, offsetX: number, offsetY: number) => {
    setView({ scale, offsetX, offsetY });
  }, []);

  return {
    elements,
    selectedId,
    setSelectedId,
    view,
    setViewOffset,
    setViewScale,
    addImageElement,
    addTextElement,
    addDrawingElement,
    updateElement,
    deleteElement,
    duplicateElement,
    bringToFront,
    sendToBack,
    toggleLock,
  };
}
