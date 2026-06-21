import { useState, useCallback, useRef, useEffect } from 'react';
import {
  CanvasElement,
  AlignmentType,
  BaseStyle,
  TextStyle,
  DEFAULT_BASE_STYLE,
  DEFAULT_TEXT_STYLE,
  ElementType,
} from '../types';

const generateId = (): string => Math.random().toString(36).substring(2, 11);

interface HistoryState {
  elements: CanvasElement[];
}

const MAX_HISTORY = 50;

export function useElementManager() {
  const [elements, setElements] = useState<CanvasElement[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const historyRef = useRef<HistoryState[]>([]);
  const historyIndexRef = useRef(-1);
  const isHistoryActionRef = useRef(false);

  const pushHistory = useCallback((els: CanvasElement[]) => {
    if (isHistoryActionRef.current) return;
    const newState: HistoryState = { elements: JSON.parse(JSON.stringify(els)) };
    historyRef.current = historyRef.current.slice(0, historyIndexRef.current + 1);
    historyRef.current.push(newState);
    if (historyRef.current.length > MAX_HISTORY) {
      historyRef.current.shift();
    }
    historyIndexRef.current = historyRef.current.length - 1;
  }, []);

  useEffect(() => {
    if (historyRef.current.length === 0) {
      historyRef.current.push({ elements: [] });
      historyIndexRef.current = 0;
    }
  }, []);

  const addElement = useCallback(
    (type: ElementType, x: number, y: number, width = 120, height = 80) => {
      setElements((prev) => {
        let style: BaseStyle | TextStyle;
        if (type === 'text' || type === 'date') {
          style = {
            ...DEFAULT_TEXT_STYLE,
            content: type === 'date' ? new Date().toLocaleDateString('zh-CN') : '文本内容',
          };
        } else if (type === 'line') {
          style = {
            ...DEFAULT_BASE_STYLE,
            backgroundColor: 'transparent',
          };
        } else {
          style = { ...DEFAULT_BASE_STYLE };
        }

        const newElement: CanvasElement = {
          id: generateId(),
          type,
          x,
          y,
          width: type === 'line' ? 150 : width,
          height: type === 'line' ? 2 : height,
          rotation: 0,
          style,
        };
        const next = [...prev, newElement];
        pushHistory(next);
        return next;
      });
      setSelectedIds([]);
    },
    [pushHistory]
  );

  const updateElement = useCallback(
    (id: string, updates: Partial<CanvasElement>) => {
      setElements((prev) => {
        const next = prev.map((el) =>
          el.id === id ? { ...el, ...updates, style: updates.style ? { ...el.style, ...updates.style } : el.style } : el
        );
        pushHistory(next);
        return next;
      });
    },
    [pushHistory]
  );

  const updateElementStyle = useCallback(
    (id: string, styleUpdates: Partial<BaseStyle | TextStyle>) => {
      setElements((prev) => {
        const next = prev.map((el) =>
          el.id === id ? { ...el, style: { ...el.style, ...styleUpdates } } : el
        );
        pushHistory(next);
        return next;
      });
    },
    [pushHistory]
  );

  const updateElements = useCallback(
    (updates: { id: string; changes: Partial<CanvasElement> }[]) => {
      setElements((prev) => {
        const next = prev.map((el) => {
          const upd = updates.find((u) => u.id === el.id);
          if (upd) {
            return {
              ...el,
              ...upd.changes,
              style: upd.changes.style ? { ...el.style, ...upd.changes.style } : el.style,
            };
          }
          return el;
        });
        pushHistory(next);
        return next;
      });
    },
    [pushHistory]
  );

  const deleteElement = useCallback(
    (id: string) => {
      setElements((prev) => {
        const next = prev.filter((el) => el.id !== id);
        pushHistory(next);
        return next;
      });
      setSelectedIds((prev) => prev.filter((s) => s !== id));
    },
    [pushHistory]
  );

  const deleteSelected = useCallback(() => {
    if (selectedIds.length === 0) return;
    setElements((prev) => {
      const next = prev.filter((el) => !selectedIds.includes(el.id));
      pushHistory(next);
      return next;
    });
    setSelectedIds([]);
  }, [selectedIds, pushHistory]);

  const selectElement = useCallback((id: string, additive = false) => {
    if (additive) {
      setSelectedIds((prev) =>
        prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
      );
    } else {
      setSelectedIds([id]);
    }
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedIds([]);
  }, []);

  const alignElements = useCallback(
    (type: AlignmentType) => {
      if (selectedIds.length < 2) return;
      const selected = elements.filter((el) => selectedIds.includes(el.id));
      if (selected.length < 2) return;

      const bounds = selected.map((el) => ({
        id: el.id,
        x: el.x,
        y: el.y,
        w: el.width,
        h: el.height,
      }));

      const minX = Math.min(...bounds.map((b) => b.x));
      const maxX = Math.max(...bounds.map((b) => b.x + b.w));
      const minY = Math.min(...bounds.map((b) => b.y));
      const maxY = Math.max(...bounds.map((b) => b.y + b.h));
      const centerX = (minX + maxX) / 2;
      const centerY = (minY + maxY) / 2;

      const updates: { id: string; changes: Partial<CanvasElement> }[] = [];

      bounds.forEach((b) => {
        let newX = b.x;
        let newY = b.y;
        switch (type) {
          case 'left':
            newX = minX;
            break;
          case 'right':
            newX = maxX - b.w;
            break;
          case 'top':
            newY = minY;
            break;
          case 'bottom':
            newY = maxY - b.h;
            break;
          case 'center-h':
            newX = centerX - b.w / 2;
            break;
          case 'center-v':
            newY = centerY - b.h / 2;
            break;
        }
        if (newX !== b.x || newY !== b.y) {
          updates.push({ id: b.id, changes: { x: Math.round(newX), y: Math.round(newY) } });
        }
      });

      if (updates.length > 0) {
        updateElements(updates);
      }
    },
    [elements, selectedIds, updateElements]
  );

  const undo = useCallback(() => {
    if (historyIndexRef.current <= 0) return;
    isHistoryActionRef.current = true;
    historyIndexRef.current--;
    const state = historyRef.current[historyIndexRef.current];
    setElements(JSON.parse(JSON.stringify(state.elements)));
    setTimeout(() => {
      isHistoryActionRef.current = false;
    }, 0);
  }, []);

  const redo = useCallback(() => {
    if (historyIndexRef.current >= historyRef.current.length - 1) return;
    isHistoryActionRef.current = true;
    historyIndexRef.current++;
    const state = historyRef.current[historyIndexRef.current];
    setElements(JSON.parse(JSON.stringify(state.elements)));
    setTimeout(() => {
      isHistoryActionRef.current = false;
    }, 0);
  }, []);

  const canUndo = historyIndexRef.current > 0;
  const canRedo = historyIndexRef.current < historyRef.current.length - 1;

  const setAllElements = useCallback((els: CanvasElement[]) => {
    setElements(els);
    pushHistory(els);
    setSelectedIds([]);
  }, [pushHistory]);

  return {
    elements,
    selectedIds,
    selectedElements: elements.filter((el) => selectedIds.includes(el.id)),
    addElement,
    updateElement,
    updateElementStyle,
    updateElements,
    deleteElement,
    deleteSelected,
    selectElement,
    clearSelection,
    alignElements,
    undo,
    redo,
    canUndo,
    canRedo,
    setAllElements,
  };
}
