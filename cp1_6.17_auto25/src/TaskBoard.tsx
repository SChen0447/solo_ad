import React, { useMemo } from 'react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  DragOverlay,
  defaultDropAnimationSideEffects,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { Task, TaskStatus, STATUS_META } from './utils';
import TaskCard from './TaskCard';

const COLUMNS: { id: TaskStatus }[] = [
  { id: 'todo' },
  { id: 'in-progress' },
  { id: 'done' },
];

interface TaskBoardProps {
  tasks: Task[];
  onTasksChange: (tasks: Task[]) => void;
  onTaskClick: (taskId: string) => void;
  isFiltering: boolean;
}

const dropAnimation = {
  sideEffects: defaultDropAnimationSideEffects({
    styles: {
      active: {
        opacity: '0.5',
      },
    },
  }),
};

const TaskBoard: React.FC<TaskBoardProps> = ({
  tasks,
  onTasksChange,
  onTaskClick,
  isFiltering,
}) => {
  const [activeId, setActiveId] = React.useState<string | null>(null);
  const [overColumn, setOverColumn] = React.useState<TaskStatus | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    })
  );

  const activeTask = useMemo(
    () => tasks.find(t => t.id === activeId) || null,
    [tasks, activeId]
  );

  const tasksByStatus = useMemo(() => {
    const result: Record<TaskStatus, Task[]> = {
      todo: [],
      'in-progress': [],
      done: [],
    };
    for (const task of tasks) {
      result[task.status].push(task);
    }
    return result;
  }, [tasks]);

  const findColumn = (taskId: string): TaskStatus | null => {
    const task = tasks.find(t => t.id === taskId);
    return task?.status || null;
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) {
      setOverColumn(null);
      return;
    }

    const overId = String(over.id);
    if (COLUMNS.some(c => c.id === overId)) {
      setOverColumn(overId as TaskStatus);
      return;
    }

    const overTaskStatus = findColumn(overId);
    setOverColumn(overTaskStatus);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    setOverColumn(null);

    if (!over) return;

    const activeIdStr = String(active.id);
    const overIdStr = String(over.id);
    const activeStatus = findColumn(activeIdStr);
    if (!activeStatus) return;

    const activeColumnTasks = tasksByStatus[activeStatus];
    const activeIndex = activeColumnTasks.findIndex(t => t.id === activeIdStr);

    if (COLUMNS.some(c => c.id === overIdStr)) {
      const newStatus = overIdStr as TaskStatus;
      if (newStatus === activeStatus) return;

      const newColumnTasks = tasksByStatus[newStatus];
      const newTasks = tasks.filter(t => t.id !== activeIdStr);
      const task = tasks.find(t => t.id === activeIdStr)!;
      const updatedTask = { ...task, status: newStatus };

      const newIndex = activeStatus === newStatus
        ? activeColumnTasks.length - 1
        : newColumnTasks.length;

      const result: Task[] = [];
      for (const col of COLUMNS) {
        const colTasks = newTasks.filter(t => t.status === col.id);
        if (col.id === newStatus) {
          colTasks.splice(newIndex, 0, updatedTask);
        }
        result.push(...colTasks);
      }
      onTasksChange(result);
      return;
    }

    const overStatus = findColumn(overIdStr);
    if (!overStatus) return;

    const overColumnTasks = tasksByStatus[overStatus];
    const overIndex = overColumnTasks.findIndex(t => t.id === overIdStr);

    if (activeStatus === overStatus) {
      if (activeIndex === overIndex) return;
      const newColTasks = arrayMove(activeColumnTasks, activeIndex, overIndex);
      const result: Task[] = [];
      for (const col of COLUMNS) {
        if (col.id === activeStatus) {
          result.push(...newColTasks);
        } else {
          result.push(...tasksByStatus[col.id]);
        }
      }
      onTasksChange(result);
      return;
    }

    const newTasks = tasks.filter(t => t.id !== activeIdStr);
    const task = tasks.find(t => t.id === activeIdStr)!;
    const updatedTask = { ...task, status: overStatus };

    const result: Task[] = [];
    for (const col of COLUMNS) {
      const colTasks = newTasks.filter(t => t.status === col.id);
      if (col.id === overStatus) {
        colTasks.splice(overIndex, 0, updatedTask);
      }
      result.push(...colTasks);
    }
    onTasksChange(result);
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="board">
        {COLUMNS.map(column => {
          const colTasks = tasksByStatus[column.id];
          const meta = STATUS_META[column.id];
          const isOver = overColumn === column.id;

          return (
            <div
              key={column.id}
              data-column-id={column.id}
              className="column"
            >
              <div className="column-header">
                <div className="column-title">
                  <span
                    className="column-status-dot"
                    style={{ backgroundColor: meta.color, boxShadow: `0 0 8px ${meta.color}80` }}
                  />
                  {meta.label}
                  <span className="column-count">{colTasks.length}</span>
                </div>
                <button
                  className="btn btn-secondary"
                  style={{ padding: '6px 12px', fontSize: '12px' }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                  </svg>
                </button>
              </div>

              <div
                className={`column-content ${isFiltering ? 'fading' : ''} ${isOver ? 'drag-over' : ''}`}
              >
                <SortableContext
                  items={colTasks.map(t => t.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {colTasks.length === 0 ? (
                    <div className="empty-state">
                      <div style={{ fontSize: '28px', marginBottom: '8px' }}>📋</div>
                      暂无任务
                    </div>
                  ) : (
                    colTasks.map(task => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        onClick={() => onTaskClick(task.id)}
                      />
                    ))
                  )}
                </SortableContext>
              </div>
            </div>
          );
        })}
      </div>

      <DragOverlay dropAnimation={dropAnimation}>
        {activeTask ? (
          <div
            className="task-card dragging"
            style={{
              width: '360px',
              transform: 'rotate(3deg)',
              cursor: 'grabbing',
            }}
          >
            <div className="task-card-header">
              <div className="task-title">{activeTask.title}</div>
              <div className="drag-handle" style={{ opacity: 1 }}>
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
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};

export default TaskBoard;
