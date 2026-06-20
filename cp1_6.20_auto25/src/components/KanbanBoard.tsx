import React, { useCallback, useRef, useState } from 'react';
import { Task, TaskStatus, Member } from '../utils/mockData';

const COLUMNS: { key: TaskStatus; label: string }[] = [
  { key: 'todo', label: '待办' },
  { key: 'inProgress', label: '进行中' },
  { key: 'done', label: '已完成' },
];

const PRIORITY_COLORS: Record<string, string> = {
  high: '#FF4757',
  medium: '#FFA502',
  low: '#2ED573',
};

interface Props {
  tasks: Task[];
  members: Member[];
  onTaskStatusChange: (taskId: string, newStatus: TaskStatus) => void;
  highlightTaskIds?: Set<string>;
}

const KanbanBoard: React.FC<Props> = ({ tasks, members, onTaskStatusChange, highlightTaskIds }) => {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<TaskStatus | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const dragStartPos = useRef({ x: 0, y: 0 });
  const cardRefMap = useRef<Map<string, HTMLDivElement>>(new Map());

  const memberMap = useRef(new Map(members.map(m => [m.id, m]))).current;

  const handleDragStart = useCallback((e: React.DragEvent, taskId: string) => {
    setDraggingId(taskId);
    dragStartPos.current = { x: e.clientX, y: e.clientY };
    const el = e.currentTarget as HTMLElement;
    el.style.opacity = '0.5';
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', taskId);
  }, []);

  const handleDragEnd = useCallback((e: React.DragEvent) => {
    const el = e.currentTarget as HTMLElement;
    el.style.opacity = '1';
    setDraggingId(null);
    setDragOverColumn(null);
    setDragOffset({ x: 0, y: 0 });
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, status: TaskStatus) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverColumn(status);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOverColumn(null);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, newStatus: TaskStatus) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('text/plain');
    if (taskId) {
      onTaskStatusChange(taskId, newStatus);
    }
    setDragOverColumn(null);
  }, [onTaskStatusChange]);

  const getProgressPercent = (task: Task) => {
    if (task.status === 'done') return 100;
    if (task.status === 'inProgress') return Math.round((task.estimatedHours * 0.4) / task.estimatedHours * 100);
    return 0;
  };

  const renderCard = (task: Task, index: number) => {
    const member = memberMap.get(task.assigneeId);
    const isHighlighted = highlightTaskIds?.has(task.id);
    const isDragging = draggingId === task.id;

    return (
      <div
        key={task.id}
        ref={el => { if (el) cardRefMap.current.set(task.id, el); }}
        draggable
        onDragStart={e => handleDragStart(e, task.id)}
        onDragEnd={handleDragEnd}
        className="kanban-card"
        style={{
          animationDelay: `${index * 60}ms`,
          transform: isDragging ? `scale(1.05) translate(${dragOffset.x}px, ${dragOffset.y}px)` : undefined,
          boxShadow: isDragging ? '0 12px 40px rgba(0,212,255,0.3)' : isHighlighted ? `0 0 0 2px #FF8C00, 0 4px 16px rgba(255,140,0,0.4)` : undefined,
          borderColor: isHighlighted ? '#FF8C00' : 'transparent',
          transition: isDragging ? 'box-shadow 0.2s' : 'transform 0.3s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.3s',
        }}
      >
        <div className="card-header">
          <span
            className="priority-dot"
            style={{ backgroundColor: PRIORITY_COLORS[task.priority] }}
          />
          <span className="card-title">{task.title}</span>
        </div>
        <p className="card-desc">{task.description}</p>
        <div className="card-footer">
          <div className="card-avatar" title={member?.name}>
            {member?.avatar}
          </div>
          <span className="card-due">{task.dueDate.slice(5)}</span>
          <span className="card-hours">{task.estimatedHours}h</span>
        </div>
        <div className="progress-bar-track">
          <div
            className="progress-bar-fill"
            style={{
              width: `${getProgressPercent(task)}%`,
              background: task.status === 'done'
                ? '#2ED573'
                : task.priority === 'high'
                  ? 'linear-gradient(90deg, #FF4757, #FF6B81)'
                  : 'linear-gradient(90deg, #00D4FF, #0099CC)',
            }}
          />
        </div>
      </div>
    );
  };

  return (
    <div className="kanban-board">
      {COLUMNS.map(col => {
        const columnTasks = tasks.filter(t => t.status === col.key);
        return (
          <div
            key={col.key}
            className={`kanban-column ${dragOverColumn === col.key ? 'column-drag-over' : ''}`}
            onDragOver={e => handleDragOver(e, col.key)}
            onDragLeave={handleDragLeave}
            onDrop={e => handleDrop(e, col.key)}
          >
            <div className="column-header">
              <span className="column-title">{col.label}</span>
              <span className="column-count">{columnTasks.length}</span>
            </div>
            <div className="column-body">
              {columnTasks.map((task, i) => renderCard(task, i))}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default KanbanBoard;
