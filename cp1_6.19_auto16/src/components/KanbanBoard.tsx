import React, { useState, useRef, useCallback } from 'react';
import { useTaskStore, Task } from '../store/taskStore';
import TimerPanel from './TimerPanel';

const statusConfig = {
  todo: {
    title: '待办',
    bgColor: '#fee2e2',
    badgeColor: '#fecaca',
    textColor: '#991b1b'
  },
  'in-progress': {
    title: '进行中',
    bgColor: '#fef3c7',
    badgeColor: '#fde68a',
    textColor: '#92400e'
  },
  done: {
    title: '已完成',
    bgColor: '#d1fae5',
    badgeColor: '#a7f3d0',
    textColor: '#065f46'
  }
};

const priorityConfig = {
  high: { label: '高', color: '#ef4444' },
  medium: { label: '中', color: '#f59e0b' },
  low: { label: '低', color: '#22c55e' }
};

function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (diff < 60000) return '刚刚';
  if (minutes < 60) return `${minutes}分钟前`;
  if (hours < 24) return `${hours}小时前`;
  return `${days}天前`;
}

interface TaskCardProps {
  task: Task;
  onDragStart: (e: React.DragEvent, taskId: string) => void;
  onDragEnd: () => void;
  onClick: () => void;
}

const TaskCard: React.FC<TaskCardProps> = ({ task, onDragStart, onDragEnd, onClick }) => {
  const startTimer = useTaskStore(state => state.startTimer);
  const pauseTimer = useTaskStore(state => state.pauseTimer);
  const [isDragging, setIsDragging] = useState(false);

  const handleDragStart = (e: React.DragEvent) => {
    setIsDragging(true);
    onDragStart(e, task.id);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
    onDragEnd();
  };

  const handleTimerClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (task.isRunning) {
      pauseTimer(task.id);
    } else {
      startTimer(task.id);
    }
  };

  const priority = priorityConfig[task.priority];

  return (
    <div
      className={`task-card ${isDragging ? 'dragging' : ''}`}
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onClick={onClick}
    >
      <div className="task-card-header">
        <span
          className="priority-tag"
          style={{ backgroundColor: priority.color + '20', color: priority.color }}
        >
          {priority.label}
        </span>
        <button
          className={`timer-btn ${task.isRunning ? 'running' : ''}`}
          onClick={handleTimerClick}
        >
          {task.isRunning ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="4" width="4" height="16" />
              <rect x="14" y="4" width="4" height="16" />
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="5,3 19,12 5,21" />
            </svg>
          )}
        </button>
      </div>
      <h4 className="task-title">{task.title}</h4>
      <div className="task-meta">
        <span className="task-time">{formatRelativeTime(task.createdAt)}</span>
      </div>

      <style>{`
        .task-card {
          background: white;
          border-radius: 12px;
          padding: 16px;
          margin-bottom: 12px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .task-card:hover {
          transform: translateY(-6px);
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
        }
        .task-card.dragging {
          opacity: 0.7;
          transform: rotate(3deg);
        }
        .task-card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 10px;
        }
        .priority-tag {
          padding: 3px 8px;
          border-radius: 6px;
          font-size: 0.7rem;
          font-weight: 600;
        }
        .timer-btn {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          border: none;
          background: transparent;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #4f46e5;
          transition: all 0.15s ease;
        }
        .timer-btn:hover {
          background: #dbeafe;
        }
        .timer-btn:active {
          transform: scale(0.9);
        }
        .timer-btn.running {
          color: #ef4444;
          animation: pulse 2s ease-in-out infinite;
        }
        @keyframes pulse {
          0%, 100% { transform: rotate(0deg); }
          50% { transform: rotate(180deg); }
        }
        .task-title {
          margin: 0 0 8px 0;
          font-size: 0.95rem;
          font-weight: 600;
          color: #1f2937;
          line-height: 1.4;
        }
        .task-meta {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .task-time {
          font-size: 0.75rem;
          color: #9ca3af;
        }
      `}</style>
    </div>
  );
};

interface ColumnProps {
  status: 'todo' | 'in-progress' | 'done';
  tasks: Task[];
  onDragStart: (e: React.DragEvent, taskId: string) => void;
  onDragEnd: () => void;
  onDrop: (status: Task['status']) => void;
  onDragOver: (e: React.DragEvent) => void;
  isDragOver: boolean;
  onTaskClick: (task: Task) => void;
}

const Column: React.FC<ColumnProps> = ({
  status,
  tasks,
  onDragStart,
  onDragEnd,
  onDrop,
  onDragOver,
  isDragOver,
  onTaskClick
}) => {
  const config = statusConfig[status];

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    onDrop(status);
  };

  return (
    <div
      className={`kanban-column ${isDragOver ? 'drag-over' : ''}`}
      style={{ backgroundColor: config.bgColor }}
      onDragOver={onDragOver}
      onDrop={handleDrop}
    >
      <div className="column-header">
        <h3 className="column-title">{config.title}</h3>
        <span
          className="task-count"
          style={{ backgroundColor: config.badgeColor, color: config.textColor }}
        >
          {tasks.length}
        </span>
      </div>
      <div className="task-list">
        {tasks.map(task => (
          <TaskCard
            key={task.id}
            task={task}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            onClick={() => onTaskClick(task)}
          />
        ))}
      </div>

      <style>{`
        .kanban-column {
          flex: 1;
          min-width: 280px;
          border-radius: 12px;
          padding: 16px;
          transition: all 0.3s ease-out;
        }
        .kanban-column.drag-over {
          transform: scale(1.02);
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
        }
        .column-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }
        .column-title {
          margin: 0;
          font-size: 1rem;
          font-weight: 600;
          color: #1f2937;
        }
        .task-count {
          padding: 4px 10px;
          border-radius: 8px;
          font-size: 0.8rem;
          font-weight: 600;
        }
        .task-list {
          min-height: 100px;
        }
      `}</style>
    </div>
  );
};

const KanbanBoard: React.FC = () => {
  const tasks = useTaskStore(state => state.tasks);
  const selectedProjectId = useTaskStore(state => state.selectedProjectId);
  const moveTask = useTaskStore(state => state.moveTask);
  const createTask = useTaskStore(state => state.createTask);
  const setSelectedTask = useTaskStore(state => state.setSelectedTask);
  const getTasksByStatus = useTaskStore(state => state.getTasksByStatus);

  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverStatus, setDragOverStatus] = useState<string | null>(null);
  const [showAddTask, setShowAddTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDesc, setNewTaskDesc] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<Task['priority']>('medium');

  const handleDragStart = useCallback((e: React.DragEvent, taskId: string) => {
    setDraggedTaskId(taskId);
    e.dataTransfer.effectAllowed = 'move';
  }, []);

  const handleDragEnd = useCallback(() => {
    setDraggedTaskId(null);
    setDragOverStatus(null);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const handleDrop = useCallback((status: Task['status']) => {
    if (draggedTaskId) {
      moveTask(draggedTaskId, status);
    }
    setDraggedTaskId(null);
    setDragOverStatus(null);
  }, [draggedTaskId, moveTask]);

  const handleColumnDragEnter = (status: string) => {
    setDragOverStatus(status);
  };

  const handleColumnDragLeave = () => {
    setDragOverStatus(null);
  };

  const handleAddTask = () => {
    if (newTaskTitle.trim() && selectedProjectId) {
      createTask(selectedProjectId, newTaskTitle.trim(), newTaskDesc.trim(), newTaskPriority);
      setNewTaskTitle('');
      setNewTaskDesc('');
      setNewTaskPriority('medium');
      setShowAddTask(false);
    }
  };

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
  };

  const todoTasks = getTasksByStatus('todo');
  const inProgressTasks = getTasksByStatus('in-progress');
  const doneTasks = getTasksByStatus('done');

  if (!selectedProjectId) {
    return (
      <div className="kanban-container empty">
        <div className="empty-state">
          <p>请选择一个项目或创建新项目</p>
        </div>
        <style>{`
          .kanban-container.empty {
            flex: 1;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .empty-state p {
            color: #9ca3af;
            font-size: 1.1rem;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="kanban-container">
      <div className="kanban-header">
        <h2 className="kanban-title">任务看板</h2>
        <button className="add-task-btn" onClick={() => setShowAddTask(true)}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          添加任务
        </button>
      </div>

      <div className="kanban-columns">
        <Column
          status="todo"
          tasks={todoTasks}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          isDragOver={dragOverStatus === 'todo'}
          onTaskClick={handleTaskClick}
        />
        <Column
          status="in-progress"
          tasks={inProgressTasks}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          isDragOver={dragOverStatus === 'in-progress'}
          onTaskClick={handleTaskClick}
        />
        <Column
          status="done"
          tasks={doneTasks}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          isDragOver={dragOverStatus === 'done'}
          onTaskClick={handleTaskClick}
        />
      </div>

      {showAddTask && (
        <div className="modal-overlay" onClick={() => setShowAddTask(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3>新建任务</h3>
            <div className="form-group">
              <label>任务标题</label>
              <input
                type="text"
                value={newTaskTitle}
                onChange={e => setNewTaskTitle(e.target.value)}
                placeholder="输入任务标题"
                autoFocus
              />
            </div>
            <div className="form-group">
              <label>任务描述</label>
              <textarea
                value={newTaskDesc}
                onChange={e => setNewTaskDesc(e.target.value)}
                placeholder="输入任务描述"
                rows={3}
              />
            </div>
            <div className="form-group">
              <label>优先级</label>
              <div className="priority-options">
                {(['high', 'medium', 'low'] as const).map(p => (
                  <button
                    key={p}
                    className={`priority-option ${newTaskPriority === p ? 'active' : ''}`}
                    style={{
                      borderColor: priorityConfig[p].color,
                      color: newTaskPriority === p ? 'white' : priorityConfig[p].color,
                      backgroundColor: newTaskPriority === p ? priorityConfig[p].color : 'transparent'
                    }}
                    onClick={() => setNewTaskPriority(p)}
                  >
                    {priorityConfig[p].label}
                  </button>
                ))}
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowAddTask(false)}>
                取消
              </button>
              <button className="btn btn-primary" onClick={handleAddTask}>
                创建
              </button>
            </div>
          </div>
        </div>
      )}

      <TimerPanel />

      <style>{`
        .kanban-container {
          flex: 1;
          display: flex;
          flex-direction: column;
          padding: 24px;
          overflow: auto;
          min-width: 900px;
        }
        .kanban-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
        }
        .kanban-title {
          margin: 0;
          font-size: 1.5rem;
          font-weight: 700;
          color: #1f2937;
        }
        .add-task-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 20px;
          background: #4f46e5;
          color: white;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-size: 0.9rem;
          font-weight: 500;
          transition: background 0.2s;
        }
        .add-task-btn:hover {
          background: #4338ca;
        }
        .kanban-columns {
          display: flex;
          gap: 20px;
          flex: 1;
        }
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.4);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 100;
          animation: fadeIn 0.2s ease;
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .modal-content {
          background: white;
          border-radius: 16px;
          padding: 28px;
          width: 90%;
          max-width: 500px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
          animation: slideUp 0.3s ease-out;
        }
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .modal-content h3 {
          margin: 0 0 20px 0;
          font-size: 1.3rem;
          font-weight: 600;
          color: #1f2937;
        }
        .form-group {
          margin-bottom: 16px;
        }
        .form-group label {
          display: block;
          margin-bottom: 8px;
          font-size: 0.85rem;
          font-weight: 500;
          color: #4b5563;
        }
        .form-group input,
        .form-group textarea {
          width: 100%;
          padding: 10px 14px;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          font-size: 0.9rem;
          font-family: inherit;
          box-sizing: border-box;
          transition: border-color 0.2s;
        }
        .form-group input:focus,
        .form-group textarea:focus {
          outline: none;
          border-color: #4f46e5;
        }
        .priority-options {
          display: flex;
          gap: 10px;
        }
        .priority-option {
          flex: 1;
          padding: 10px;
          border: 2px solid;
          border-radius: 8px;
          background: transparent;
          cursor: pointer;
          font-weight: 600;
          transition: all 0.2s;
        }
        .priority-option:hover {
          transform: translateY(-2px);
        }
        .modal-actions {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          margin-top: 24px;
        }
        .btn {
          padding: 10px 20px;
          border-radius: 8px;
          border: none;
          cursor: pointer;
          font-size: 0.9rem;
          font-weight: 500;
          transition: all 0.2s;
        }
        .btn-primary {
          background: #4f46e5;
          color: white;
        }
        .btn-primary:hover {
          background: #4338ca;
        }
        .btn-secondary {
          background: #f3f4f6;
          color: #4b5563;
        }
        .btn-secondary:hover {
          background: #e5e7eb;
        }
        @media (max-width: 768px) {
          .kanban-container {
            min-width: auto;
            padding: 16px;
          }
          .kanban-columns {
            flex-direction: column;
          }
        }
      `}</style>
    </div>
  );
};

export default KanbanBoard;
