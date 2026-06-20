import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import moment from 'moment';
import { Task, TaskPriority, GanttViewScale, Dependency } from '../types';
import { apiService } from '../services/apiService';
import { websocketService } from '../services/websocketService';

interface GanttChartProps {
  projectId: string;
  tasks: Task[];
  dependencies: Dependency[];
  onTasksChange: (tasks: Task[]) => void;
  onDependenciesChange?: (dependencies: Dependency[]) => void;
}

const priorityColors: Record<TaskPriority, string> = {
  high: '#e74c3c',
  medium: '#f39c12',
  low: '#2ecc71',
};

const ROW_HEIGHT = 48;
const TASK_HEIGHT = 32;
const DATE_HEADER_HEIGHT = 60;
const TASK_LIST_WIDTH = 200;

export const GanttChart: React.FC<GanttChartProps> = ({
  projectId,
  tasks,
  dependencies,
  onTasksChange,
  onDependenciesChange,
}) => {
  const [viewScale, setViewScale] = useState<GanttViewScale>(GanttViewScale.WEEK);
  const [draggingTask, setDraggingTask] = useState<string | null>(null);
  const [dragType, setDragType] = useState<'start' | 'end' | 'move' | null>(null);
  const [showDependencyMenu, setShowDependencyMenu] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const [isCompact, setIsCompact] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const checkCompact = () => setIsCompact(window.innerWidth <= 480);
    checkCompact();
    window.addEventListener('resize', checkCompact);
    return () => window.removeEventListener('resize', checkCompact);
  }, []);

  const { dateRange, dayWidth } = useMemo(() => {
    if (tasks.length === 0) {
      const start = moment().startOf('month');
      const end = moment().endOf('month').add(7, 'days');
      return { dateRange: [start, end] as [moment.Moment, moment.Moment], dayWidth: 40 };
    }

    const startDates = tasks.map((t) => moment(t.startDate));
    const endDates = tasks.map((t) => moment(t.endDate));
    const minDate = moment.min(...startDates).subtract(7, 'days');
    const maxDate = moment.max(...endDates).add(7, 'days');
    const totalDays = maxDate.diff(minDate, 'days');

    let width = 40;
    if (viewScale === GanttViewScale.DAY) width = 80;
    else if (viewScale === GanttViewScale.WEEK) width = 40;
    else if (viewScale === GanttViewScale.MONTH) width = 15;

    return {
      dateRange: [minDate, maxDate] as [moment.Moment, moment.Moment],
      dayWidth: Math.max(width, totalDays > 0 ? 800 / totalDays : 40),
    };
  }, [tasks, viewScale]);

  const totalWidth = useMemo(() => {
    const days = dateRange[1].diff(dateRange[0], 'days');
    return days * dayWidth;
  }, [dateRange, dayWidth]);

  const getDatePosition = useCallback(
    (date: string) => {
      return moment(date).diff(dateRange[0], 'days') * dayWidth;
    },
    [dateRange, dayWidth]
  );

  const snapToDate = useCallback(
    (pixelX: number) => {
      const days = Math.round(pixelX / dayWidth);
      return dateRange[0].clone().add(days, 'days');
    },
    [dateRange, dayWidth]
  );

  const handleTaskMouseDown = (e: React.MouseEvent, taskId: string, type: 'start' | 'end' | 'move') => {
    e.preventDefault();
    e.stopPropagation();
    setDraggingTask(taskId);
    setDragType(type);

    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    const startX = e.clientX;
    const originalStart = moment(task.startDate);
    const originalEnd = moment(task.endDate);
    const originalDuration = originalEnd.diff(originalStart, 'days');

    const handleMouseMove = async (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const deltaDays = Math.round(deltaX / dayWidth);

      let newStart = originalStart.clone();
      let newEnd = originalEnd.clone();

      if (type === 'start') {
        newStart = originalStart.clone().add(deltaDays, 'days');
        if (newStart.isAfter(newEnd)) newStart = newEnd.clone().subtract(1, 'day');
      } else if (type === 'end') {
        newEnd = originalEnd.clone().add(deltaDays, 'days');
        if (newEnd.isBefore(newStart)) newEnd = newStart.clone().add(1, 'day');
      } else if (type === 'move') {
        newStart = originalStart.clone().add(deltaDays, 'days');
        newEnd = newStart.clone().add(originalDuration, 'days');
      }

      const updatedTasks = tasks.map((t) =>
        t.id === taskId
          ? { ...t, startDate: newStart.format('YYYY-MM-DD'), endDate: newEnd.format('YYYY-MM-DD') }
          : t
      );
      onTasksChange(updatedTasks);
    };

    const handleMouseUp = async () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);

      const updatedTask = tasks.find((t) => t.id === taskId);
      if (updatedTask) {
        try {
          const saved = await apiService.updateTask(taskId, {
            startDate: updatedTask.startDate,
            endDate: updatedTask.endDate,
          });
          websocketService.emitTaskUpdate(saved);
          onTasksChange(tasks.map((t) => (t.id === taskId ? saved : t)));
        } catch (error) {
          console.error('Failed to update task dates:', error);
        }
      }

      setDraggingTask(null);
      setDragType(null);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleContextMenu = (e: React.MouseEvent, taskId: string) => {
    e.preventDefault();
    setShowDependencyMenu(taskId);
    setMenuPosition({ x: e.clientX, y: e.clientY });
  };

  const handleAddDependency = async (fromTaskId: string, toTaskId: string) => {
    if (fromTaskId === toTaskId) return;
    try {
      const dep = await apiService.addDependency(projectId, fromTaskId, toTaskId);
      if (onDependenciesChange) {
        onDependenciesChange([...dependencies, dep]);
      }
    } catch (error) {
      console.error('Failed to add dependency:', error);
    }
    setShowDependencyMenu(null);
  };

  const renderDateHeaders = () => {
    const headers: JSX.Element[] = [];
    const [start, end] = dateRange;
    let current = start.clone();

    while (current.isBefore(end)) {
      const isMonthBoundary = current.date() === 1 || current.isSame(start, 'day');

      if (isMonthBoundary && !isCompact) {
        const monthWidth = Math.min(
          current.clone().endOf('month').diff(current, 'days') * dayWidth,
          totalWidth - getDatePosition(current.format('YYYY-MM-DD'))
        );
        headers.push(
          <div
            key={`month-${current.format('YYYY-MM')}`}
            style={{
              position: 'absolute',
              left: getDatePosition(current.format('YYYY-MM-DD')),
              width: monthWidth,
              height: DATE_HEADER_HEIGHT / 2,
              borderBottom: '1px solid rgba(255,255,255,0.1)',
              borderRight: '1px solid rgba(255,255,255,0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#8892b0',
              fontSize: '12px',
              fontFamily: 'Inter, sans-serif',
              fontWeight: 600,
            }}
          >
            {current.format('YYYY年MM月')}
          </div>
        );
      }

      if (viewScale !== GanttViewScale.MONTH || isMonthBoundary || isCompact) {
        headers.push(
          <div
            key={`day-${current.format('YYYY-MM-DD')}`}
            style={{
              position: 'absolute',
              left: getDatePosition(current.format('YYYY-MM-DD')),
              top: DATE_HEADER_HEIGHT / 2,
              width: dayWidth,
              height: DATE_HEADER_HEIGHT / 2,
              borderRight: '1px solid rgba(255,255,255,0.05)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: isCompact && viewScale === GanttViewScale.MONTH ? 'transparent' : '#8892b0',
              fontSize: '10px',
              fontFamily: 'Inter, sans-serif',
            }}
          >
            {viewScale === GanttViewScale.DAY ? current.format('MM/DD') : current.format('DD')}
          </div>
        );
      }

      if (current.isSame(moment(), 'day')) {
        headers.push(
          <div
            key="today-line"
            style={{
              position: 'absolute',
              left: getDatePosition(current.format('YYYY-MM-DD')) + dayWidth / 2,
              top: DATE_HEADER_HEIGHT,
              bottom: 0,
              width: 2,
              background: 'repeating-linear-gradient(to bottom, #e94560 0px, #e94560 4px, transparent 4px, transparent 8px)',
              zIndex: 10,
              pointerEvents: 'none',
            }}
          />
        );
      }

      current.add(1, 'days');
    }

    return headers;
  };

  const renderTask = (task: Task, index: number) => {
    const color = priorityColors[task.priority];
    const start = getDatePosition(task.startDate);
    const width = Math.max(dayWidth, getDatePosition(task.endDate) - start);
    const isDone = task.status === 'done';
    const isDragging = draggingTask === task.id;

    return (
      <div
        key={task.id}
        style={{
          position: 'absolute',
          top: DATE_HEADER_HEIGHT + index * ROW_HEIGHT + (ROW_HEIGHT - TASK_HEIGHT) / 2,
          left: start,
          width,
          height: TASK_HEIGHT,
          borderRadius: '6px',
          background: isDone
            ? `repeating-linear-gradient(45deg, ${color}, ${color} 8px, rgba(0,0,0,0.3) 8px, rgba(0,0,0,0.3) 16px)`
            : `linear-gradient(180deg, ${color}, ${color}dd)`,
          boxShadow: isDragging ? '0 4px 12px rgba(0,0,0,0.5)' : '0 2px 4px rgba(0,0,0,0.3)',
          cursor: isDragging ? 'grabbing' : 'grab',
          transition: 'box-shadow 0.15s ease, transform 0.15s ease',
          opacity: isDragging ? 0.9 : 1,
          zIndex: isDragging ? 20 : 5,
        }}
        onMouseDown={(e) => handleTaskMouseDown(e, task.id, 'move')}
        onContextMenu={(e) => handleContextMenu(e, task.id)}
        onMouseEnter={(e) => {
          if (!isDragging) {
            (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-1px)';
          }
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: '8px',
            height: '100%',
            cursor: 'ew-resize',
            borderTopLeftRadius: '6px',
            borderBottomLeftRadius: '6px',
          }}
          onMouseDown={(e) => handleTaskMouseDown(e, task.id, 'start')}
        />
        <div
          style={{
            position: 'absolute',
            right: 0,
            top: 0,
            width: '8px',
            height: '100%',
            cursor: 'ew-resize',
            borderTopRightRadius: '6px',
            borderBottomRightRadius: '6px',
          }}
          onMouseDown={(e) => handleTaskMouseDown(e, task.id, 'end')}
        />
        <div
          style={{
            padding: '0 12px',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            color: '#ffffff',
            fontSize: '12px',
            fontFamily: 'Inter, sans-serif',
            fontWeight: 500,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            userSelect: 'none',
          }}
        >
          {task.name}
        </div>
      </div>
    );
  };

  const renderDependencyLines = () => {
    return dependencies.map((dep) => {
      const fromTask = tasks.find((t) => t.id === dep.fromTaskId);
      const toTask = tasks.find((t) => t.id === dep.toTaskId);
      if (!fromTask || !toTask) return null;

      const fromIndex = tasks.findIndex((t) => t.id === dep.fromTaskId);
      const toIndex = tasks.findIndex((t) => t.id === dep.toTaskId);

      const x1 = getDatePosition(fromTask.endDate);
      const y1 = DATE_HEADER_HEIGHT + fromIndex * ROW_HEIGHT + ROW_HEIGHT / 2;
      const x2 = getDatePosition(toTask.startDate);
      const y2 = DATE_HEADER_HEIGHT + toIndex * ROW_HEIGHT + ROW_HEIGHT / 2;

      const midX = (x1 + x2) / 2;

      return (
        <svg
          key={dep.id}
          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 2 }}
        >
          <path
            d={`M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`}
            stroke="#8892b0"
            strokeWidth="2"
            fill="none"
            opacity="0.6"
          />
          <circle cx={x2} cy={y2} r="4" fill="#8892b0" />
        </svg>
      );
    });
  };

  const scaleOptions = [
    { value: GanttViewScale.DAY, label: '1天' },
    { value: GanttViewScale.WEEK, label: '1周' },
    { value: GanttViewScale.MONTH, label: '1月' },
  ];

  return (
    <div
      className="gantt-chart"
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        padding: '16px',
        backgroundColor: '#1a1a2e',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '16px',
        }}
      >
        <h3
          style={{
            margin: 0,
            color: '#e0e0e0',
            fontSize: '18px',
            fontWeight: 600,
            fontFamily: 'Inter, sans-serif',
          }}
        >
          甘特图
        </h3>
        <div style={{ display: 'flex', gap: '8px' }}>
          {scaleOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setViewScale(opt.value)}
              style={{
                padding: '6px 16px',
                backgroundColor: viewScale === opt.value ? '#e94560' : '#0f3460',
                color: '#e0e0e0',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '12px',
                fontFamily: 'Inter, sans-serif',
                fontWeight: 500,
                transition: 'all 0.3s ease',
              }}
              onMouseEnter={(e) => {
                if (viewScale !== opt.value) {
                  (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#1a4a7a';
                }
              }}
              onMouseLeave={(e) => {
                if (viewScale !== opt.value) {
                  (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#0f3460';
                }
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          flex: 1,
          backgroundColor: '#16213e',
          borderRadius: '12px',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: TASK_LIST_WIDTH,
            flexShrink: 0,
            borderRight: '1px solid rgba(255,255,255,0.1)',
            backgroundColor: 'rgba(15, 52, 96, 0.3)',
          }}
        >
          <div
            style={{
              height: DATE_HEADER_HEIGHT,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderBottom: '1px solid rgba(255,255,255,0.1)',
              color: '#8892b0',
              fontSize: '12px',
              fontFamily: 'Inter, sans-serif',
              fontWeight: 600,
            }}
          >
            任务名称
          </div>
          {tasks.map((task, index) => (
            <div
              key={task.id}
              style={{
                height: ROW_HEIGHT,
                display: 'flex',
                alignItems: 'center',
                padding: '0 16px',
                borderBottom: '1px solid rgba(255,255,255,0.05)',
                color: '#e0e0e0',
                fontSize: '13px',
                fontFamily: 'Inter, sans-serif',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                backgroundColor: index % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent',
              }}
            >
              {task.name}
            </div>
          ))}
        </div>

        <div
          ref={containerRef}
          style={{
            flex: 1,
            overflow: 'auto',
            position: 'relative',
          }}
          onClick={() => setShowDependencyMenu(null)}
        >
          <div
            style={{
              position: 'relative',
              width: totalWidth,
              height: DATE_HEADER_HEIGHT + tasks.length * ROW_HEIGHT,
              minWidth: '100%',
              minHeight: '100%',
            }}
          >
            {renderDateHeaders()}

            {tasks.map((task, index) => (
              <div
                key={`row-${task.id}`}
                style={{
                  position: 'absolute',
                  left: 0,
                  top: DATE_HEADER_HEIGHT + index * ROW_HEIGHT,
                  width: totalWidth,
                  height: ROW_HEIGHT,
                  borderBottom: '1px solid rgba(255,255,255,0.05)',
                  backgroundColor: index % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent',
                }}
              />
            ))}

            {renderDependencyLines()}
            {tasks.map((task, index) => renderTask(task, index))}
          </div>
        </div>
      </div>

      {showDependencyMenu && (
        <div
          style={{
            position: 'fixed',
            left: menuPosition.x,
            top: menuPosition.y,
            backgroundColor: '#16213e',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '8px',
            padding: '8px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
            zIndex: 100,
            minWidth: '200px',
          }}
        >
          <div
            style={{
              padding: '8px 12px',
              color: '#8892b0',
              fontSize: '11px',
              fontFamily: 'Inter, sans-serif',
              fontWeight: 600,
              borderBottom: '1px solid rgba(255,255,255,0.1)',
              marginBottom: '4px',
            }}
          >
            设置前置任务
          </div>
          {tasks
            .filter((t) => t.id !== showDependencyMenu)
            .map((task) => {
              const hasDep = dependencies.some(
                (d) => d.fromTaskId === task.id && d.toTaskId === showDependencyMenu
              );
              return (
                <div
                  key={task.id}
                  onClick={() => !hasDep && handleAddDependency(task.id, showDependencyMenu)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '8px 12px',
                    borderRadius: '4px',
                    cursor: hasDep ? 'default' : 'pointer',
                    opacity: hasDep ? 1 : 1,
                    transition: 'background-color 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    if (!hasDep) {
                      (e.currentTarget as HTMLDivElement).style.backgroundColor = 'rgba(255,255,255,0.05)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLDivElement).style.backgroundColor = 'transparent';
                  }}
                >
                  <span
                    style={{
                      marginRight: '8px',
                      color: task.status === 'done' ? '#2ecc71' : '#8892b0',
                    }}
                  >
                    {task.status === 'done' ? '✓' : '○'}
                  </span>
                  <span
                    style={{
                      color: '#e0e0e0',
                      fontSize: '13px',
                      fontFamily: 'Inter, sans-serif',
                      flex: 1,
                    }}
                  >
                    {task.name}
                  </span>
                  {hasDep && (
                    <span style={{ color: '#2ecc71', fontSize: '11px' }}>已设置</span>
                  )}
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
};
