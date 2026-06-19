import React, { useState, useRef } from 'react';
import { ActionItem as ActionItemType } from '../api';

interface ActionItemProps {
  item: ActionItemType;
  index: number;
  onToggleComplete: (id: string) => void;
  onDelete: (id: string) => void;
  onDragStart: (e: React.DragEvent, id: string, index: number) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, index: number) => void;
  onDragEnd: () => void;
  isDragging: boolean;
}

const getDueDateStatus = (dueDate: string, completed: boolean) => {
  if (!dueDate || completed) return 'normal';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  const diff = due.getTime() - today.getTime();
  const dayMs = 24 * 60 * 60 * 1000;
  if (diff < 0) return 'overdue';
  if (diff <= 3 * dayMs) return 'urgent';
  return 'normal';
};

const ActionItem: React.FC<ActionItemProps> = ({
  item,
  index,
  onToggleComplete,
  onDelete,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  isDragging
}) => {
  const [showCheck, setShowCheck] = useState(item.completed);
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLongPress = useRef(false);

  const status = getDueDateStatus(item.dueDate, item.completed);

  const handleCheckboxClick = () => {
    if (item.completed) return;
    setShowCheck(true);
    onToggleComplete(item.id);
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    const target = e.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.closest('.checkbox-wrapper')) return;

    isLongPress.current = false;
    pressTimer.current = setTimeout(() => {
      isLongPress.current = true;
    }, 200);
  };

  const handlePointerUp = () => {
    if (pressTimer.current) {
      clearTimeout(pressTimer.current);
    }
  };

  const handlePointerLeave = () => {
    if (pressTimer.current) {
      clearTimeout(pressTimer.current);
    }
  };

  const handleDragStart = (e: React.DragEvent) => {
    if (!isLongPress.current) {
      e.preventDefault();
      return;
    }
    onDragStart(e, item.id, index);
  };

  return (
    <div
      className={`action-item-card ${item.completed ? 'completed' : ''} ${
        status === 'overdue' && !item.completed ? 'overdue' : ''
      } ${isDragging ? 'dragging' : ''}`}
      draggable
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerLeave}
      onDragStart={handleDragStart}
      onDragOver={onDragOver}
      onDrop={(e) => onDrop(e, index)}
      onDragEnd={onDragEnd}
      style={{ animationDelay: `${index * 0.02}s` }}
    >
      <div className="action-item-header">
        <div className="checkbox-wrapper">
          <input
            type="checkbox"
            className="action-checkbox"
            checked={item.completed}
            disabled={item.completed}
            onChange={handleCheckboxClick}
          />
          {showCheck && item.completed && (
            <span className="check-icon" key={`check-${item.id}-${item.completed}`}>
              ✓
            </span>
          )}
        </div>
        <div className="action-item-content">{item.content}</div>
        <button
          className="delete-item-btn"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(item.id);
          }}
          title="删除"
        >
          ✕
        </button>
      </div>
      <div className="action-item-meta">
        {item.assignee && (
          <span className="assignee-badge">
            👤 {item.assignee}
          </span>
        )}
        {item.dueDate && (
          <span className={`due-date ${status}`}>
            📅 {item.dueDate}
            {status === 'overdue' && ' ⚠️ 已逾期'}
            {status === 'urgent' && ' 🔥 临近'}
          </span>
        )}
      </div>
    </div>
  );
};

export default ActionItem;
