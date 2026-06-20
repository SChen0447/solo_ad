import React, { useState, useEffect, useCallback } from 'react';
import { Task, TaskStatus } from '../types';
import { TaskCard } from './TaskCard';
import { websocketService } from '../services/websocketService';
import { apiService } from '../services/apiService';

interface ProjectBoardProps {
  projectId: string;
  tasks: Task[];
  onTasksChange: (tasks: Task[]) => void;
  onTaskClick?: (task: Task) => void;
  filterUserId?: string | null;
}

const COLUMN_CONFIG: { status: TaskStatus; title: string }[] = [
  { status: TaskStatus.TODO, title: '待办' },
  { status: TaskStatus.IN_PROGRESS, title: '进行中' },
  { status: TaskStatus.DONE, title: '已完成' },
];

export const ProjectBoard: React.FC<ProjectBoardProps> = ({
  projectId,
  tasks,
  onTasksChange,
  onTaskClick,
  filterUserId,
}) => {
  const [draggedTask, setDraggedTask] = useState<Task | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<TaskStatus | null>(null);

  useEffect(() => {
    websocketService.subscribeToProject(projectId);

    const handleTaskUpdated = (updatedTask: Task) => {
      onTasksChange(
        tasks.map((t) => (t.id === updatedTask.id ? updatedTask : t))
      );
    };

    const handleTaskCreated = (newTask: Task) => {
      onTasksChange([...tasks, newTask]);
    };

    const handleTaskDeleted = (taskId: string) => {
      onTasksChange(tasks.filter((t) => t.id !== taskId));
    };

    const unsubUpdated = websocketService.onTaskUpdated(handleTaskUpdated);
    const unsubCreated = websocketService.onTaskCreated(handleTaskCreated);
    const unsubDeleted = websocketService.onTaskDeleted(handleTaskDeleted);

    return () => {
      websocketService.unsubscribeFromProject(projectId);
      unsubUpdated();
      unsubCreated();
      unsubDeleted();
    };
  }, [projectId, tasks, onTasksChange]);

  const filteredTasks = filterUserId
    ? tasks.filter((t) => t.assigneeId === filterUserId)
    : tasks;

  const getTasksByStatus = useCallback(
    (status: TaskStatus) => filteredTasks.filter((t) => t.status === status),
    [filteredTasks]
  );

  const handleDragStart = (e: React.DragEvent, task: Task) => {
    setDraggedTask(task);
    e.dataTransfer.effectAllowed = 'move';
    const target = e.currentTarget as HTMLElement;
    target.style.opacity = '0.4';
  };

  const handleDragEnd = (e: React.DragEvent) => {
    setDraggedTask(null);
    setDragOverColumn(null);
    const target = e.currentTarget as HTMLElement;
    target.style.opacity = '1';
  };

  const handleDragOver = (e: React.DragEvent, status: TaskStatus) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverColumn(status);
  };

  const handleDragLeave = () => {
    setDragOverColumn(null);
  };

  const handleDrop = async (e: React.DragEvent, newStatus: TaskStatus) => {
    e.preventDefault();
    setDragOverColumn(null);

    if (!draggedTask || draggedTask.status === newStatus) {
      setDraggedTask(null);
      return;
    }

    try {
      const updatedTask = await apiService.updateTaskStatus(draggedTask.id, newStatus);
      websocketService.emitTaskUpdate(updatedTask);
      onTasksChange(
        tasks.map((t) => (t.id === updatedTask.id ? updatedTask : t))
      );
    } catch (error) {
      console.error('Failed to update task status:', error);
    }

    setDraggedTask(null);
  };

  const renderColumn = (status: TaskStatus, title: string) => {
    const columnTasks = getTasksByStatus(status);
    const isHighlighted = dragOverColumn === status;

    return (
      <div
        key={status}
        className="board-column"
        onDragOver={(e) => handleDragOver(e, status)}
        onDragLeave={handleDragLeave}
        onDrop={(e) => handleDrop(e, status)}
        style={{
          flex: 1,
          minWidth: '280px',
          backgroundColor: 'rgba(22, 33, 62, 0.5)',
          borderRadius: '12px',
          padding: '16px',
          border: isHighlighted ? '2px solid #e94560' : '2px solid transparent',
          transition: 'border 0.2s ease, background-color 0.2s ease',
          margin: '0 8px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <h3
            style={{
              margin: 0,
              color: '#e0e0e0',
              fontSize: '15px',
              fontWeight: 600,
              fontFamily: 'Inter, sans-serif',
            }}
          >
            {title}
          </h3>
          <span
            style={{
              backgroundColor: '#0f3460',
              color: '#e0e0e0',
              fontSize: '12px',
              fontWeight: 600,
              padding: '2px 10px',
              borderRadius: '12px',
              fontFamily: 'Inter, sans-serif',
            }}
          >
            {columnTasks.length}
          </span>
        </div>

        <div style={{ minHeight: '100px' }}>
          {columnTasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              onClick={onTaskClick}
            />
          ))}
        </div>
      </div>
    );
  };

  return (
    <div
      className="project-board"
      style={{
        display: 'flex',
        padding: '20px',
        height: '100%',
        overflowX: 'auto',
        overflowY: 'auto',
      }}
    >
      {COLUMN_CONFIG.map((col) => renderColumn(col.status, col.title))}
    </div>
  );
};
