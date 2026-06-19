import React from 'react';
import { Calendar, User, MessageSquare } from 'lucide-react';
import type { Task } from '@shared/types';

interface CardProps {
  task: Task;
  onDragStart: (e: React.DragEvent, taskId: string) => void;
  onClick: () => void;
}

const Card: React.FC<CardProps> = ({ task, onDragStart, onClick }) => {
  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN', {
      month: 'short',
      day: 'numeric',
    });
  };

  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date();

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, task.id)}
      onClick={onClick}
      className="card-enter p-4 rounded-lg cursor-pointer transition-all duration-200 hover:shadow-lg"
      style={{
        backgroundColor: 'var(--bg-card)',
        borderLeft: '3px solid var(--accent)',
        marginBottom: '8px',
      }}
    >
      <h4 className="font-medium text-sm mb-2 line-clamp-2" style={{ color: 'var(--text-primary)' }}>
        {task.title}
      </h4>
      
      {task.description && (
        <p className="text-xs mb-3 line-clamp-2" style={{ color: 'var(--text-secondary)' }}>
          {task.description}
        </p>
      )}
      
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-3">
          {task.assignee && (
            <div className="flex items-center gap-1" style={{ color: 'var(--text-secondary)' }}>
              <User size={12} />
              <span>{task.assignee}</span>
            </div>
          )}
          
          {task.dueDate && (
            <div
              className="flex items-center gap-1"
              style={{ color: isOverdue ? '#ef4444' : 'var(--text-secondary)' }}
            >
              <Calendar size={12} />
              <span>{formatDate(task.dueDate)}</span>
            </div>
          )}
        </div>
        
        {task.comments.length > 0 && (
          <div className="flex items-center gap-1" style={{ color: 'var(--accent)' }}>
            <MessageSquare size={12} />
            <span>{task.comments.length}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default Card;
