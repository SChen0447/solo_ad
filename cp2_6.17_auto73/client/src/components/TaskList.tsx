import { useState, useRef } from 'react';

interface Task {
  id: string;
  planId: string;
  date: string;
  title: string;
  estimatedMinutes: number;
  completed: boolean;
}

interface TaskListProps {
  tasks: Task[];
  selectedDate: string;
  onToggleTask: (taskId: string, completed: boolean) => void;
  onReorderTasks: (planId: string, date: string, taskIds: string[]) => Promise<boolean>;
}

export default function TaskList({ tasks, selectedDate, onToggleTask, onReorderTasks }: TaskListProps) {
  const [localTasks, setLocalTasks] = useState<Task[]>(tasks);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [overIdx, setOverIdx] = useState<number | null>(null);
  const [toast, setToast] = useState('');
  const dragNode = useRef<HTMLDivElement | null>(null);

  const prevTasksRef = useRef<Task[]>(tasks);
  if (tasks !== prevTasksRef.current) {
    prevTasksRef.current = tasks;
    setLocalTasks(tasks);
  }

  const formatDisplayDate = (dateStr: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    return `${d.getMonth() + 1}月${d.getDate()}日 ${weekdays[d.getDay()]}`;
  };

  const totalMinutes = localTasks.reduce((sum, t) => sum + t.estimatedMinutes, 0);
  const completedCount = localTasks.filter(t => t.completed).length;

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, idx: number) => {
    if (localTasks[idx].completed) {
      e.preventDefault();
      return;
    }
    dragNode.current = e.currentTarget;
    setDragIdx(idx);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', idx.toString());
    setTimeout(() => {
      if (dragNode.current) {
        dragNode.current.classList.add('dragging');
      }
    }, 0);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>, idx: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragIdx === null || dragIdx === idx) return;
    if (localTasks[idx].completed) return;

    setOverIdx(idx);
  };

  const handleDragLeave = () => {
    setOverIdx(null);
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>, dropIdx: number) => {
    e.preventDefault();
    if (dragIdx === null || dragIdx === dropIdx) {
      setDragIdx(null);
      setOverIdx(null);
      return;
    }

    const reordered = [...localTasks];
    const [moved] = reordered.splice(dragIdx, 1);
    reordered.splice(dropIdx, 0, moved);

    const prevOrder = [...localTasks];
    setLocalTasks(reordered);
    setDragIdx(null);
    setOverIdx(null);

    const planId = moved.planId;
    const date = moved.date;
    const taskIds = reordered.map(t => t.id);

    const success = await onReorderTasks(planId, date, taskIds);
    if (!success) {
      setLocalTasks(prevOrder);
      setToast('排序保存失败，已恢复原顺序');
      setTimeout(() => setToast(''), 3000);
    }
  };

  const handleDragEnd = () => {
    if (dragNode.current) {
      dragNode.current.classList.remove('dragging');
      dragNode.current = null;
    }
    setDragIdx(null);
    setOverIdx(null);
  };

  return (
    <div className="task-panel">
      <div className="task-date-title">
        {selectedDate ? formatDisplayDate(selectedDate) : '请选择日期'}
        {localTasks.length > 0 && (
          <span style={{ fontSize: '13px', fontWeight: 400, color: '#999', marginLeft: '12px' }}>
            {completedCount}/{localTasks.length} 已完成 · 预计{totalMinutes}分钟
          </span>
        )}
      </div>
      {localTasks.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-circle">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" /><rect x="9" y="3" width="6" height="4" rx="1" /></svg>
          </div>
          <p className="empty-state-text">该日期暂无学习任务</p>
        </div>
      ) : (
        localTasks.map((task, idx) => (
          <div
            key={task.id}
            className={`task-item ${task.completed ? 'completed' : ''} ${overIdx === idx ? 'drag-over' : ''}`}
            draggable={!task.completed}
            onDragStart={e => handleDragStart(e, idx)}
            onDragOver={e => handleDragOver(e, idx)}
            onDragLeave={handleDragLeave}
            onDrop={e => handleDrop(e, idx)}
            onDragEnd={handleDragEnd}
          >
            {!task.completed && (
              <div className="task-drag-handle">
                <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                  <circle cx="9" cy="6" r="1.5" />
                  <circle cx="15" cy="6" r="1.5" />
                  <circle cx="9" cy="12" r="1.5" />
                  <circle cx="15" cy="12" r="1.5" />
                  <circle cx="9" cy="18" r="1.5" />
                  <circle cx="15" cy="18" r="1.5" />
                </svg>
              </div>
            )}
            <div
              className={`task-checkbox ${task.completed ? 'checked' : ''}`}
              onClick={() => onToggleTask(task.id, !task.completed)}
            >
              {task.completed && (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M20 6L9 17l-5-5" /></svg>
              )}
            </div>
            <div className="task-info">
              <div className="task-title-row">
                <span className="task-title">{task.title}</span>
                <span className="task-estimated">{task.estimatedMinutes}分钟</span>
              </div>
            </div>
          </div>
        ))
      )}
      {toast && <div className="notification-toast">{toast}</div>}
    </div>
  );
}
