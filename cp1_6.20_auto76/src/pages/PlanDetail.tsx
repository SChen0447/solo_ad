import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams, useSearchParams } from 'react-router-dom';
import { 
  Plus, X, Play, Pause, ChevronDown, ChevronUp, 
  Loader2, Upload, Link2, Check, RotateCcw, FileText 
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import api from '../utils/api';
import { Plan, Task, TimeSession } from '../types';

const taskColors = ['#4f46e5', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

const PlanDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const taskIdParam = searchParams.get('taskId');
  
  const [plan, setPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [expandedTasks, setExpandedTasks] = useState<Set<number>>(new Set());
  const [timingTasks, setTimingTasks] = useState<Set<number>>(new Set());
  const [elapsedTime, setElapsedTime] = useState<Record<number, number>>({});
  const timerRefs = useRef<Record<number, NodeJS.Timeout>>({});
  const autoSaveRefs = useRef<Record<number, NodeJS.Timeout>>({});
  
  const [taskForm, setTaskForm] = useState({
    name: '',
    estimated_duration: 60,
    material_link: '',
    file: null as File | null,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (id) {
      fetchPlan();
    }
    return () => {
      Object.values(timerRefs.current).forEach(clearInterval);
      Object.values(autoSaveRefs.current).forEach(clearInterval);
    };
  }, [id]);

  useEffect(() => {
    if (taskIdParam && plan?.tasks) {
      const taskId = parseInt(taskIdParam);
      const task = plan.tasks.find(t => t.id === taskId);
      if (task && !task.is_reviewed && task.is_completed) {
        handleReviewTask(taskId);
      }
    }
  }, [taskIdParam, plan]);

  const fetchPlan = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/plans/${id}`);
      setPlan(response.data);
      
      const initialElapsed: Record<number, number> = {};
      response.data.tasks.forEach((task: Task) => {
        initialElapsed[task.id] = task.total_time_spent;
      });
      setElapsedTime(initialElapsed);
    } catch (error) {
      console.error('Failed to fetch plan:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const formatDateTime = (isoStr: string): string => {
    const date = new Date(isoStr);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const toggleTimer = async (taskId: number) => {
    const isTiming = timingTasks.has(taskId);
    
    if (isTiming) {
      clearInterval(timerRefs.current[taskId]);
      clearInterval(autoSaveRefs.current[taskId]);
      delete timerRefs.current[taskId];
      delete autoSaveRefs.current[taskId];
      
      setTimingTasks(prev => {
        const newSet = new Set(prev);
        newSet.delete(taskId);
        return newSet;
      });
      
      try {
        await api.put(`/tasks/${taskId}/time`, { action: 'pause' });
      } catch (error) {
        console.error('Failed to pause timer:', error);
      }
    } else {
      try {
        await api.put(`/tasks/${taskId}/time`, { action: 'start' });
        
        setTimingTasks(prev => new Set([...prev, taskId]));
        
        timerRefs.current[taskId] = setInterval(() => {
          setElapsedTime(prev => ({
            ...prev,
            [taskId]: (prev[taskId] || 0) + 1
          }));
        }, 1000);
        
        autoSaveRefs.current[taskId] = setInterval(async () => {
          try {
            const currentTime = elapsedTime[taskId] || 0;
            await api.put(`/tasks/${taskId}/time`, { 
              action: 'update', 
              time_spent: currentTime 
            });
          } catch (error) {
            console.error('Auto-save failed:', error);
          }
        }, 10000);
      } catch (error) {
        console.error('Failed to start timer:', error);
      }
    }
  };

  const toggleComplete = async (taskId: number, currentStatus: boolean) => {
    try {
      await api.put(`/tasks/${taskId}/complete`, { is_completed: !currentStatus });
      fetchPlan();
    } catch (error) {
      console.error('Failed to update task status:', error);
    }
  };

  const handleReviewTask = async (taskId: number) => {
    try {
      await api.put(`/tasks/${taskId}/review`);
      fetchPlan();
    } catch (error) {
      console.error('Failed to review task:', error);
    }
  };

  const toggleExpand = (taskId: number) => {
    setExpandedTasks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(taskId)) {
        newSet.delete(taskId);
      } else {
        newSet.add(taskId);
      }
      return newSet;
    });
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!taskForm.name || !taskForm.estimated_duration) {
      setError('请填写任务名称和预计耗时');
      return;
    }

    try {
      setSubmitting(true);
      const formData = new FormData();
      formData.append('name', taskForm.name);
      formData.append('estimated_duration', taskForm.estimated_duration.toString());
      if (taskForm.material_link) {
        formData.append('material_link', taskForm.material_link);
      }
      if (taskForm.file) {
        formData.append('file', taskForm.file);
      }

      await api.post(`/plans/${id}/tasks`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      
      setShowAddModal(false);
      setTaskForm({ name: '', estimated_duration: 60, material_link: '', file: null });
      fetchPlan();
    } catch (err: any) {
      setError(err.response?.data?.message || '创建失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  const getGanttData = () => {
    if (!plan?.tasks) return [];
    
    const dailyData: Record<string, { date: string; hours: number; taskName: string }[]> = {};
    
    plan.tasks.forEach((task, taskIndex) => {
      task.time_sessions.forEach((session: TimeSession) => {
        if (session.end) {
          const date = session.end.split('T')[0];
          const start = new Date(session.start);
          const end = new Date(session.end);
          const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
          
          if (!dailyData[date]) {
            dailyData[date] = [];
          }
          dailyData[date].push({
            date,
            hours: Math.round(hours * 100) / 100,
            taskName: task.name,
          });
        }
      });
    });
    
    const sortedDates = Object.keys(dailyData).sort();
    return sortedDates.map(date => {
      const dayData = dailyData[date];
      const totalHours = dayData.reduce((sum, d) => sum + d.hours, 0);
      return {
        date: date.slice(5),
        hours: Math.round(totalHours * 100) / 100,
        taskName: dayData.map(d => d.taskName).join(', '),
      };
    });
  };

  const ganttData = getGanttData();

  if (loading) {
    return (
      <div className="loading-container">
        <Loader2 size={32} className="spinner" />
      </div>
    );
  }

  if (!plan) {
    return <div className="error-state">计划不存在</div>;
  }

  return (
    <div className="plan-detail">
      <div className="plan-header">
        <div>
          <h1 className="page-title">{plan.name}</h1>
          <p className="page-subtitle">{plan.description}</p>
          <div className="plan-meta">
            <span>{plan.start_date} 至 {plan.end_date}</span>
            <span>•</span>
            <span>{plan.completed_tasks}/{plan.total_tasks} 任务完成</span>
          </div>
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setShowAddModal(true)}
          className="btn btn-primary"
        >
          <Plus size={18} />
          添加任务
        </motion.button>
      </div>

      {ganttData.length > 0 && (
        <div className="chart-section">
          <h2 className="section-title">每日学习进度</h2>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={ganttData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} />
                <YAxis stroke="#94a3b8" fontSize={12} label={{ value: '小时', angle: -90, position: 'insideLeft', fill: '#94a3b8' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    border: 'none',
                    borderRadius: '8px',
                    boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
                  }}
                  labelStyle={{ color: '#e2e8f0' }}
                  itemStyle={{ color: '#4facfe' }}
                  formatter={(value: number) => [`${value} 小时`, '学习时长']}
                />
                <Bar dataKey="hours" radius={[4, 4, 0, 0]}>
                  {ganttData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={taskColors[index % taskColors.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="tasks-section">
        <h2 className="section-title">学习任务</h2>
        {plan.tasks?.length === 0 ? (
          <div className="empty-state">
            <FileText size={48} className="empty-icon" />
            <h3>还没有任务</h3>
            <p>点击上方按钮添加学习任务</p>
          </div>
        ) : (
          <div className="tasks-list">
            {plan.tasks?.map((task, index) => (
              <motion.div
                key={task.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`task-item ${task.is_completed ? 'completed' : ''}`}
              >
                <div className="task-main">
                  <button
                    onClick={() => toggleComplete(task.id, task.is_completed)}
                    className={`task-checkbox ${task.is_completed ? 'checked' : ''}`}
                  >
                    {task.is_completed && <Check size={12} />}
                  </button>
                  
                  <div className="task-info">
                    <h3 className="task-name">{task.name}</h3>
                    <div className="task-meta">
                      <span>预计: {task.estimated_duration} 分钟</span>
                      {task.material_link && (
                        <a 
                          href={task.material_link} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="task-link"
                        >
                          <Link2 size={12} />
                          资料链接
                        </a>
                      )}
                      {task.material_content && (
                        <span className="task-file">
                          <FileText size={12} />
                          已上传资料
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="task-actions">
                    <div className="task-time">
                      {formatDuration(elapsedTime[task.id] || task.total_time_spent || 0)}
                    </div>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => toggleTimer(task.id)}
                      className={`timer-btn ${timingTasks.has(task.id) ? 'running' : ''}`}
                    >
                      {timingTasks.has(task.id) ? <Pause size={16} /> : <Play size={16} />}
                    </motion.button>
                    
                    {task.is_completed && !task.is_reviewed && (
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleReviewTask(task.id)}
                        className="btn btn-secondary btn-sm"
                        title="标记为已复习"
                      >
                        <RotateCcw size={14} />
                        复习
                      </motion.button>
                    )}
                    
