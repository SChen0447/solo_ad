import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Task, formatDate, calculateSubtaskProgress } from './utils';

interface TaskCardProps {
  task: Task;
  onClick: () => void;
}

function getDueDateClass(dueDate: string | null): string {
  if (!dueDate) return '';
  const date = new Date(dueDate);
  const now = new Date();
  const diff = date.getTime() - now.getTime();
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
  if (days < 0) return 'overdue';
  if (days <= 2) return 'urgent';
  return '';
}

const CheckIcon: React.FC = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"></polyline>
  </svg>
);

const TaskCard: React.FC<TaskCardProps> = ({ task, onClick }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const progress = calculateSubtaskProgress(task.subtasks);
  const dueLabel = formatDate(task.dueDate);
  const dueClass = getDueDateClass(task.dueDate);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`task-card ${isDragging ? 'dragging' : ''}`}
      onClick={onClick}
    >
      <div className="task-card-header">
        <div className="task-title">{task.title}</div>
        <div className="drag-handle" {...attributes} {...listeners}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <span />
            <span />
            <span />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <span />
            <span />
            <span />
          </div>
        </div>
      </div>

      <div className="task-meta">
        <span className={`priority-badge priority-${task.priority}`}>
          {task.priority}
        </span>
        {dueLabel && (
          <span className={`due-date ${dueClass}`}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
            {dueLabel}
          </span>
        )}
      </div>

      <div className="task-footer">
        {task.subtasks.length > 0 ? (
          <div className="subtask-indicator">
            <div className="subtask-bar">
              <div className="subtask-bar-fill" style={{ width: `${progress}%` }} />
            </div>
            <span>{progress}%</span>
          </div>
        ) : (
          <div style={{ flex: 1 }} />
        )}
        <div className="comment-count">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
          </svg>
          {task.comments.length}
        </div>
      </div>

      {task.status === 'done' && (
        <div
          style={{
            position: 'absolute',
            top: 16,
            right: 52,
            width: 24,
            height: 24,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            boxShadow: '0 2px 8px rgba(16, 185, 129, 0.4)',
          }}
        >
          <CheckIcon />
        </div>
      )}
    </div>
  );
};

export default TaskCard;
