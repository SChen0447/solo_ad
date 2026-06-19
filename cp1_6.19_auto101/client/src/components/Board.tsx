import React, { useState, useCallback } from 'react';
import Column from './Column';
import { useBoardStore } from '../store/useBoardStore';

const Board: React.FC = () => {
  const { columns, moveTask, isLoading } = useBoardStore();
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);

  const handleDragStart = useCallback((e: React.DragEvent, taskId: string) => {
    setDraggedTaskId(taskId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', taskId);
    
    const target = e.target as HTMLElement;
    target.classList.add('dragging');
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, columnId: string) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('text/plain') || draggedTaskId;
    
    if (taskId) {
      moveTask(taskId, columnId);
    }
    
    setDraggedTaskId(null);
  }, [draggedTaskId, moveTask]);

  const handleDragEnd = useCallback(() => {
    setDraggedTaskId(null);
    document.querySelectorAll('.dragging').forEach(el => {
      el.classList.remove('dragging');
    });
  }, []);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-lg" style={{ color: 'var(--text-secondary)' }}>
          加载中...
        </div>
      </div>
    );
  }

  return (
    <div
      className="board-container flex-1 flex gap-4 p-6 overflow-x-auto scrollbar-thin"
      style={{ backgroundColor: 'var(--bg-primary)' }}
    >
      {columns.map((column) => (
        <Column
          key={column.id}
          column={column}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onDragEnd={handleDragEnd}
        />
      ))}
    </div>
  );
};

export default Board;
