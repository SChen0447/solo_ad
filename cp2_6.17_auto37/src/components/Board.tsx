import { useState, useRef } from 'react';
import type { Task } from '../types';
import TaskCard from './TaskCard';

interface BoardProps {
  tasks: Task[];
  onSelectTask: (taskId: string) => void;
  onOpenCreateModal: (status: Task['status']) => void;
  onUpdateTaskStatus: (id: string, status: Task['status']) => Promise<Task | null>;
  onUpdateTaskOrder: (id: string, order: number) => Promise<Task | null>;
}

interface ColumnConfig {
  status: Task['status'];
  title: string;
  className: string;
}

const columns: ColumnConfig[] = [
  { status: 'todo', title: '待办', className: 'todo' },
  { status: 'in-progress', title: '进行中', className: 'in-progress' },
  { status: 'done', title: '已完成', className: 'done' },
];

function Board({
  tasks,
  onSelectTask,
  onOpenCreateModal,
  onUpdateTaskStatus,
  onUpdateTaskOrder,
}: BoardProps) {
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<Task['status'] | null>(null);
  const localTasksRef = useRef<Task[]>([]);

  const getTasksForColumn = (status: Task['status']) => {
    const source = localTasksRef.current.length > 0 ? localTasksRef.current : tasks;
    return source
      .filter(t => t.status === status)
      .sort((a, b) => a.order - b.order);
  };

  const handleDragStart = (taskId: string) => {
    setDraggingTaskId(taskId);
    localTasksRef.current = [...tasks];
  };

  const handleDragEnd = () => {
    setDraggingTaskId(null);
    setDragOverColumn(null);
    localTasksRef.current = [];
  };

  const handleDragOver = (e: React.DragEvent, status: Task['status']) => {
    e.preventDefault();
    if (dragOverColumn !== status) {
      setDragOverColumn(status);
    }
  };

  const handleDropOnColumn = async (e: React.DragEvent, targetStatus: Task['status'], targetIndex: number) => {
    e.preventDefault();
    if (!draggingTaskId) return;

    const draggingTask = tasks.find(t => t.id === draggingTaskId);
    if (!draggingTask) return;

    if (draggingTask.status !== targetStatus) {
      await onUpdateTaskStatus(draggingTaskId, targetStatus);
    }

    const updatedTasks = localTasksRef.current.length > 0 ? localTasksRef.current : tasks;
    const columnTasks = updatedTasks
      .filter(t => t.status === targetStatus && t.id !== draggingTaskId)
      .sort((a, b) => a.order - b.order);

    const insertIndex = Math.min(targetIndex, columnTasks.length);
    await onUpdateTaskOrder(draggingTaskId, insertIndex);

    handleDragEnd();
  };

  const handleDragOverCard = (e: React.DragEvent, task: Task) => {
    e.preventDefault();
    e.stopPropagation();

    if (!draggingTaskId || draggingTaskId === task.id) return;
    if (!localTasksRef.current.length) localTasksRef.current = [...tasks];

    const draggingTask = localTasksRef.current.find(t => t.id === draggingTaskId);
    if (!draggingTask) return;

    const targetStatus = task.status;
    const allColumnTasks = localTasksRef.current
      .filter(t => t.status === targetStatus)
      .sort((a, b) => a.order - b.order);

    const currentDraggingIndex = allColumnTasks.findIndex(t => t.id === draggingTaskId);
    const targetTaskIndex = allColumnTasks.findIndex(t => t.id === task.id);

    if (currentDraggingIndex === -1) {
      const otherColumnTasks = localTasksRef.current
        .filter(t => t.status === draggingTask.status && t.id !== draggingTaskId)
        .sort((a, b) => a.order - b.order)
        .map((t, i) => ({ ...t, order: i }));

      const newColumnTasks = [...allColumnTasks];
      const insertIdx = Math.min(targetTaskIndex, newColumnTasks.length);
      newColumnTasks.splice(insertIdx, 0, { ...draggingTask, status: targetStatus, order: insertIdx });

      const reordered = newColumnTasks.map((t, i) => ({ ...t, order: i }));
      localTasksRef.current = [
        ...localTasksRef.current.filter(t => t.status !== draggingTask.status && t.status !== targetStatus),
        ...otherColumnTasks,
        ...reordered,
      ];
    } else if (currentDraggingIndex !== targetTaskIndex) {
      const newColumnTasks = allColumnTasks.filter(t => t.id !== draggingTaskId);
      const insertIdx = targetTaskIndex > currentDraggingIndex ? targetTaskIndex : targetTaskIndex;
      newColumnTasks.splice(insertIdx, 0, draggingTask);

      const reordered = newColumnTasks.map((t, i) => ({ ...t, order: i }));
      localTasksRef.current = [
        ...localTasksRef.current.filter(t => t.status !== targetStatus),
        ...reordered,
      ];
    }

    setDragOverColumn(targetStatus);
  };

  return (
    <div className="board-container">
      {columns.map(column => {
        const columnTasks = getTasksForColumn(column.status);
        return (
          <div
            key={column.status}
            className={`board-column ${column.className} ${dragOverColumn === column.status ? 'drag-over' : ''}`}
            onDragOver={(e) => handleDragOver(e, column.status)}
            onDrop={(e) => handleDropOnColumn(e, column.status, columnTasks.length)}
          >
            <div className="column-header">
              <span className="column-title">{column.title}</span>
              <span className="column-count">{columnTasks.length}</span>
            </div>
            <div className="cards-container">
              {columnTasks.map(task => (
                <TaskCard
                  key={task.id}
                  task={task}
                  isDragging={draggingTaskId === task.id}
                  onSelect={() => onSelectTask(task.id)}
                  onDragStart={() => handleDragStart(task.id)}
                  onDragEnd={handleDragEnd}
                  onDragOver={(e) => handleDragOverCard(e, task)}
                  onDrop={(e) => {
                    const idx = columnTasks.findIndex(t => t.id === task.id);
                    handleDropOnColumn(e, column.status, idx);
                  }}
                />
              ))}
            </div>
            <button
              className="add-task-btn"
              onClick={() => onOpenCreateModal(column.status)}
            >
              + 添加任务
            </button>
          </div>
        );
      })}
    </div>
  );
}

export default Board;
