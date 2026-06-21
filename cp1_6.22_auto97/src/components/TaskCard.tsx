import React from 'react';
import { Draggable } from 'react-beautiful-dnd';
import type { Task, TaskPriority, TeamMember } from '../api/apiService';

interface TaskCardProps {
  task: Task;
  index: number;
  memberMap: Record<string, TeamMember>;
  onClick?: () => void;
}

const PRIORITY_LABEL: Record<TaskPriority, string> = {
  low: '低',
  medium: '中',
  high: '高',
};

function getInitials(name: string): string {
  if (!name) return '?';
  const trimmed = name.trim();
  if (/^[\u4e00-\u9fa5]/.test(trimmed)) {
    return trimmed.slice(trimmed.length - 1);
  }
  const parts = trimmed.split(/\s+/);
  return (parts[0]?.[0] || '') + (parts[1]?.[0] || '');
}

export const TaskCard: React.FC<TaskCardProps> = ({ task, index, memberMap, onClick }) => {
  const assignee = task.assigneeId ? memberMap[task.assigneeId] : null;

  return (
    <Draggable draggableId={task.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={`task-card ${snapshot.isDragging ? 'dragging' : ''}`}
          onClick={onClick}
          style={{ ...provided.draggableProps.style }}
        >
          <div className="task-card-top">
            <div className="task-title">{task.title}</div>
            <span className={`priority-tag priority-${task.priority}`}>
              {PRIORITY_LABEL[task.priority]}
            </span>
          </div>

          {task.description && (
            <div className="task-description">{task.description}</div>
          )}

          <div className="task-card-bottom">
            <div className="assignee-chip">
              {assignee ? (
                <>
                  <div className="avatar" style={{ background: assignee.avatarColor }}>
                    {getInitials(assignee.name)}
                  </div>
                  <span className="assignee-name">{assignee.name}</span>
                </>
              ) : (
                <span className="assignee-name" style={{ color: '#718096' }}>未分配</span>
              )}
            </div>
            <span className="story-points">{task.storyPoints} SP</span>
          </div>
        </div>
      )}
    </Draggable>
  );
};

export default TaskCard;
