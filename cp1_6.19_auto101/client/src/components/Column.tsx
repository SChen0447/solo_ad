import React, { useState } from 'react';
import Card from './Card';
import { useBoardStore } from '../store/useBoardStore';
import type { Column as ColumnType } from '@shared/types';

interface ColumnProps {
  column: ColumnType;
  onDragStart: (e: React.DragEvent, taskId: string) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, columnId: string) => void;
  onDragEnd: () => void;
}

const Column: React.FC<ColumnProps> = ({
  column,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
}) => {
  const { getFilteredTasks, openModal } = useBoardStore();
  const [isDragOver, setIsDragOver] = useState(false);
  const tasks = getFilteredTasks(column.id);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    onDragOver(e);
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    onDrop(e, column.id);
    onDragEnd();
  };

  const getColumnColor = () => {
    switch (column.id) {
      case 'todo':
        return '#6b7280';
      case 'in-progress':
        return '#3b82f6';
      case 'done':
        return '#10b981';
      default:
        return 'var(--accent)';
    }
  };

  return (
    <div
      className="column-wrapper flex-shrink-0 flex flex-col h-full rounded-xl p-4 transition-all duration-200"
      style={{
        width: '280px',
        minWidth: '280px',
        backgroundColor: 'rgba(22, 33, 62, 0.5)',
        border: isDragOver ? '2px dashed var(--accent)' : '1px solid var(--border)',
      }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: getColumnColor() }}
          />
          <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>
            {column.title}
          </h3>
          <span
            className="px-2 py-0.5 rounded-full text-xs font-medium"
            style={{
              backgroundColor: 'var(--bg-primary)',
              color: 'var(--text-secondary)',
            }}
          >
            {tasks.length}
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin pr-1">
        {tasks.map((task) => (
          <Card
            key={task.id}
            task={task}
            onDragStart={onDragStart}
            onClick={() => openModal(task)}
          />
        ))}
        
        {tasks.length === 0 && (
          <div
            className="flex items-center justify-center h-24 rounded-lg text-sm"
            style={{
              border: '2px dashed var(--border)',
              color: 'var(--text-secondary)',
            }}
          >
            拖拽任务到这里
          </div>
        )}
      </div>
    </div>
  );
};

export default Column;
