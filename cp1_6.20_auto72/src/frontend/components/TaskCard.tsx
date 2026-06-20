import React from 'react';
import moment from 'moment';
import { Task, TaskPriority } from '../types';
import { Avatar } from './Avatar';

interface TaskCardProps {
  task: Task;
  onDragStart: (e: React.DragEvent, task: Task) => void;
  onDragEnd: (e: React.DragEvent) => void;
  onClick?: (task: Task) => void;
}

const priorityColors: Record<TaskPriority, string> = {
  high: '#e74c3c',
  medium: '#f39c12',
  low: '#2ecc71',
};

const priorityLabels: Record<TaskPriority, string> = {
  high: '高',
  medium: '中',
  low: '低',
};

export const TaskCard: React.FC<TaskCardProps> = ({ task, onDragStart, onDragEnd, onClick }) => {
  const remainingDays = moment(task.endDate).diff(moment(), 'days');
  const isOverdue = remainingDays < 0 && task.status !== 'done';

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, task)}
      onDragEnd={onDragEnd}
      onClick={() => onClick?.(task)}
      className="task-card"
      style={{
        backgroundColor: '#16213e',
        borderRadius: '8px',
        padding: '12px',
        marginBottom: '10px',
        boxShadow: '0 4px 6px rgba(0,0,0,0.3)',
        cursor: 'grab',
        transition: 'all 0.2s ease',
        border: '1px solid rgba(255,255,255,0.05)',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = '0 8px 16px rgba(0,0,0,0.4)';
        (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 6px rgba(0,0,0,0.3)';
        (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '8px' }}>
        <h4
          style={{
            margin: 0,
            color: '#e0e0e0',
            fontSize: '14px',
            fontWeight: 500,
            fontFamily: 'Inter, sans-serif',
            lineHeight: 1.4,
            flex: 1,
          }}
        >
          {task.name}
        </h4>
        <span
          style={{
            backgroundColor: priorityColors[task.priority],
            color: '#ffffff',
            fontSize: '10px',
            fontWeight: 600,
            padding: '2px 8px',
            borderRadius: '4px',
            marginLeft: '8px',
            fontFamily: 'Inter, sans-serif',
          }}
        >
          {priorityLabels[task.priority]}
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          {task.assignee && <Avatar name={task.assignee.name} size="sm" />}
        </div>
        <span
          style={{
            fontSize: '12px',
            fontFamily: 'Inter, sans-serif',
            color: isOverdue ? '#e74c3c' : '#8892b0',
            fontWeight: isOverdue ? 600 : 400,
          }}
        >
          {remainingDays >= 0 ? `${remainingDays}天` : `超期${Math.abs(remainingDays)}天`}
        </span>
      </div>
    </div>
  );
};
