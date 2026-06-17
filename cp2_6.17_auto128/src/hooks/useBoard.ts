import { useMemo, useCallback, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useAppContext } from '../context/AppContext';
import type { Workbench, ColumnType, BoardColumn } from '../types';

export function useBoard() {
  const { state, dispatch } = useAppContext();
  const [draggedCardId, setDraggedCardId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<ColumnType | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number>(0);
  const [justDroppedCardId, setJustDroppedCardId] = useState<string | null>(null);

  const activeWorkbench = useMemo((): Workbench | undefined => {
    return state.workbenches.find(w => w.id === state.activeWorkbenchId);
  }, [state.workbenches, state.activeWorkbenchId]);

  const getColumnCards = useCallback(
    (columnId: ColumnType) => {
      if (!activeWorkbench) return [];
      const column = activeWorkbench.columns.find(c => c.id === columnId);
      if (!column) return [];
      return column.cardIds
        .map(id => state.excerpts.find(e => e.id === id))
        .filter(Boolean);
    },
    [activeWorkbench, state.excerpts]
  );

  const moveCard = useCallback(
    (cardId: string, fromColumn: ColumnType, toColumn: ColumnType, toIndex: number) => {
      dispatch({
        type: 'MOVE_CARD',
        payload: { cardId, fromColumn, toColumn, toIndex },
      });
    },
    [dispatch]
  );

  const addCardToColumn = useCallback(
    (excerptId: string, columnId: ColumnType) => {
      dispatch({
        type: 'ADD_CARD_TO_COLUMN',
        payload: { excerptId, columnId },
      });
    },
    [dispatch]
  );

  const addWorkbench = useCallback(
    (name: string) => {
      const workbench: Workbench = {
        id: uuidv4(),
        name,
        columns: [
          { id: 'todo', title: '待整理', cardIds: [] },
          { id: 'processing', title: '加工中', cardIds: [] },
          { id: 'done', title: '已完成', cardIds: [] },
        ],
      };
      dispatch({ type: 'ADD_WORKBENCH', payload: workbench });
      return workbench;
    },
    [dispatch]
  );

  const setActiveWorkbench = useCallback(
    (id: string) => {
      dispatch({ type: 'SET_ACTIVE_WORKBENCH', payload: id });
    },
    [dispatch]
  );

  const handleDragStart = useCallback((cardId: string) => {
    setDraggedCardId(cardId);
  }, []);

  const handleDragEnd = useCallback((cardId: string) => {
    setJustDroppedCardId(cardId);
    setDraggedCardId(null);
    setDragOverColumn(null);
    setTimeout(() => {
      setJustDroppedCardId(null);
    }, 250);
  }, []);

  const handleDragOver = useCallback((columnId: ColumnType, index: number) => {
    setDragOverColumn(columnId);
    setDragOverIndex(index);
  }, []);

  const findCardColumn = useCallback(
    (cardId: string): ColumnType | null => {
      if (!activeWorkbench) return null;
      for (const column of activeWorkbench.columns) {
        if (column.cardIds.includes(cardId)) {
          return column.id;
        }
      }
      return null;
    },
    [activeWorkbench]
  );

  return {
    workbenches: state.workbenches,
    activeWorkbench,
    activeWorkbenchId: state.activeWorkbenchId,
    draggedCardId,
    dragOverColumn,
    dragOverIndex,
    justDroppedCardId,
    getColumnCards,
    moveCard,
    addCardToColumn,
    addWorkbench,
    setActiveWorkbench,
    handleDragStart,
    handleDragEnd,
    handleDragOver,
    findCardColumn,
  };
}
