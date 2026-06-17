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
}

export default function TaskList({ tasks, selectedDate, onToggleTask }: TaskListProps) {
  const formatDisplayDate = (dateStr: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    return `${d.getMonth() + 1}月${d.getDate()}日 ${weekdays[d.getDay()]}`;
  };

  const totalMinutes = tasks.reduce((sum, t) => sum + t.estimatedMinutes, 0);
  const completedCount = tasks.filter(t => t.completed).length;

  return (
    <div className="task-panel">
      <div className="task-date-title">
        {selectedDate ? formatDisplayDate(selectedDate) : '请选择日期'}
        {tasks.length > 0 && (
          <span style={{ fontSize: '13px', fontWeight: 400, color: '#999', marginLeft: '12px' }}>
            {completedCount}/{tasks.length} 已完成 · 预计{totalMinutes}分钟
          </span>
        )}
      </div>
      {tasks.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-circle">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" /><rect x="9" y="3" width="6" height="4" rx="1" /></svg>
          </div>
          <p className="empty-state-text">该日期暂无学习任务</p>
        </div>
      ) : (
        tasks.map(task => (
          <div key={task.id} className={`task-item ${task.completed ? 'completed' : ''}`}>
            <div
              className={`task-checkbox ${task.completed ? 'checked' : ''}`}
              onClick={() => onToggleTask(task.id, !task.completed)}
            >
              {task.completed && (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M20 6L9 17l-5-5" /></svg>
              )}
            </div>
            <div className="task-info">
              <div className="task-title">{task.title}</div>
              <div className="task-time">预计 {task.estimatedMinutes} 分钟</div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
