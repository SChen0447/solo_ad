import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Calendar from '../components/Calendar';
import TaskList from '../components/TaskList';

interface Task {
  id: string;
  planId: string;
  date: string;
  title: string;
  estimatedMinutes: number;
  completed: boolean;
}

interface Plan {
  id: string;
  userId: string;
  goalName: string;
  goalDescription: string;
  dailyHours: number;
  duration: number;
  tasks: Task[];
  createdAt: string;
  progress: number;
}

export default function PlanDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [plan, setPlan] = useState<Plan | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [loading, setLoading] = useState(true);

  const fetchPlan = useCallback(async () => {
    if (!id) return;
    try {
      const res = await fetch(`/api/plans/${id}`);
      if (res.ok) {
        const data = await res.json();
        setPlan(data);
        if (!selectedDate && data.tasks.length > 0) {
          setSelectedDate(data.tasks[0].date);
        }
      }
    } catch {} finally {
      setLoading(false);
    }
  }, [id, selectedDate]);

  useEffect(() => { fetchPlan(); }, [fetchPlan]);

  const handleToggleTask = async (taskId: string, completed: boolean) => {
    try {
      const res = await fetch(`/task-api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed }),
      });
      if (res.ok) {
        const data = await res.json();
        setPlan(prev => prev ? {
          ...prev,
          progress: data.progress,
          tasks: prev.tasks.map(t => t.id === taskId ? { ...t, completed } : t),
        } : null);
      }
    } catch {}
  };

  if (loading) return <div className="page-body"><p>加载中...</p></div>;
  if (!plan) return <div className="page-body"><p>计划不存在</p></div>;

  const taskDates = [...new Set(plan.tasks.map(t => t.date))];

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1>{plan.goalName}</h1>
          <p>进度 {plan.progress}% · {plan.duration}天计划 · 每日{plan.dailyHours}小时</p>
        </div>
        <button className="btn-secondary" onClick={() => navigate('/')}>← 返回列表</button>
      </div>
      <div className="page-body">
        <div className="progress-bar-wrapper" style={{ marginBottom: '24px' }}>
          <div className="progress-bar-fill" style={{ width: `${plan.progress}%` }} />
          <span className="progress-bar-text">{plan.progress}%</span>
        </div>
        <div className="plan-detail-layout">
          <Calendar
            tasks={plan.tasks}
            taskDates={taskDates}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
          />
          <TaskList
            tasks={plan.tasks.filter(t => t.date === selectedDate)}
            selectedDate={selectedDate}
            onToggleTask={handleToggleTask}
          />
        </div>
      </div>
    </div>
  );
}
