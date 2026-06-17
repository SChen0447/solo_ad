import type { Task } from '../types';

interface TaskCardProps {
  task: Task;
  isDragging: boolean;
  onSelect: () => void;
  onDragStart: () => void;
  onDragEnd: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
}

const priorityLabels: Record<Task['priority'], string> = {
  high: '高',
  medium: '中',
  low: '低',
};

function TaskCard({
  task,
  isDragging,
  onSelect,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
}: TaskCardProps) {
  const getInitials = (name: string) => {
    if (!name) return '?';
    return name.charAt(0).toUpperCase();
  };

  return (
    <div
      className={`task-card ${isDragging ? 'dragging' : ''}`}
      draggable
      onClick={onSelect}
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', task.id);
        onDragStart();
      }}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      <div className="task-card-title">{task.title}</div>
      <div className="task-card-meta">
        <span className={`priority-badge ${task.priority}`}>
          {priorityLabels[task.priority]}优先级
        </span>
        <span className="task-assignee">
          <span className="assignee-avatar">{getInitials(task.assignee)}</span>
          {task.assignee || '未分配'}
        </span>
      </div>
    </div>
  );
}

export default TaskCard;
