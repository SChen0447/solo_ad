import { useState, useEffect, useRef, useCallback } from 'react';
import type { Task, TaskUrgency } from './types';
import { URGENCY_COLORS } from './types';

interface TaskBoardProps {
  onNotify: (message: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
}

function TaskBoard({ onNotify }: TaskBoardProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    reward: 20,
    deadline: '',
    urgency: 'normal' as TaskUrgency,
    maxAccepts: 1,
  });
  const observerRef = useRef<HTMLDivElement>(null);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      const response = await fetch('/api/tasks');
      const data = await response.json();
      setTasks(data);
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
      onNotify('获取任务列表失败', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadMore = useCallback(() => {
    if (hasMore) {
      setTimeout(() => {
        setHasMore(false);
      }, 500);
    }
  }, [hasMore]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMore();
        }
      },
      { threshold: 0.1 }
    );

    if (observerRef.current) {
      observer.observe(observerRef.current);
    }

    return () => observer.disconnect();
  }, [loadMore]);

  const handleAcceptTask = async (taskId: string) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}/accept`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const updatedTask = await response.json();
        setTasks(prev => prev.map(t => t.id === updatedTask.id ? updatedTask : t));
        onNotify('接单成功！请尽快联系任务发起人', 'success');
      } else {
        const error = await response.json();
        onNotify(error.error || '接单失败', 'error');
      }
    } catch (error) {
      console.error('Failed to accept task:', error);
      onNotify('接单失败，请重试', 'error');
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...newTask,
          creatorId: 'user-001',
          creatorNickname: '我',
        }),
      });

      if (response.ok) {
        const createdTask = await response.json();
        setTasks(prev => [createdTask, ...prev]);
        setShowCreateModal(false);
        setNewTask({
          title: '',
          description: '',
          reward: 20,
          deadline: '',
          urgency: 'normal',
          maxAccepts: 1,
        });
        onNotify('任务发布成功！等待邻居接单', 'success');
      } else {
        const error = await response.json();
        onNotify(error.error || '发布失败', 'error');
      }
    } catch (error) {
      console.error('Failed to create task:', error);
      onNotify('发布失败，请重试', 'error');
    }
  };

  const formatDateTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    
    if (hours < 1) {
      const minutes = Math.floor(diff / (1000 * 60));
      return minutes <= 0 ? '刚刚' : `${minutes}分钟前`;
    } else if (hours < 24) {
      return `${hours}小时前`;
    } else {
      const days = Math.floor(hours / 24);
      return `${days}天前`;
    }
  };

  const formatDeadline = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getUrgencyLabel = (urgency: TaskUrgency) => {
    switch (urgency) {
      case 'very-urgent': return '非常紧急';
      case 'urgent': return '紧急';
      default: return '普通';
    }
  };

  const getStatusLabel = (status: Task['status']) => {
    switch (status) {
      case 'pending': return '待接单';
      case 'in-progress': return '进行中';
      case 'completed': return '已完成';
    }
  };

  if (loading) {
    return (
      <div className="page-container">
        <h1 className="page-title">任务看板</h1>
        <div className="loading">加载中...</div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '24px',
      }}>
        <div>
          <h1 className="page-title" style={{ marginBottom: '4px' }}>任务看板</h1>
          <p style={{ color: '#718096' }}>帮助邻居解决问题，赚取积分奖励</p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => setShowCreateModal(true)}
        >
          + 发布任务
        </button>
      </div>

      <div 
        className="task-board"
        style={{
          columnCount: 3,
          columnGap: '24px',
        }}
      >
        {tasks.map(task => (
          <div
            key={task.id}
            className="task-card"
            style={{
              breakInside: 'avoid',
              marginBottom: '24px',
              borderRadius: '16px',
              padding: '20px',
              backgroundColor: URGENCY_COLORS[task.urgency],
              boxShadow: '0px 4px 12px rgba(0,0,0,0.08)',
              transition: 'all 300ms ease',
              cursor: task.status === 'pending' ? 'pointer' : 'default',
            }}
            onMouseEnter={(e) => {
              if (task.status === 'pending') {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = '0px 8px 24px rgba(0,0,0,0.15)';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0px 4px 12px rgba(0,0,0,0.08)';
            }}
          >
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              marginBottom: '12px',
            }}>
              <h3 style={{
                fontSize: '16px',
                fontWeight: 600,
                color: '#5b4637',
                flex: 1,
                marginRight: '12px',
                lineHeight: 1.4,
              }}>
                {task.title}
              </h3>
              <span style={{
                padding: '4px 10px',
                borderRadius: '12px',
                fontSize: '11px',
                fontWeight: 500,
                backgroundColor: task.urgency === 'very-urgent' ? '#e53e3e' 
                  : task.urgency === 'urgent' ? '#ed8936' 
                  : '#3182ce',
                color: '#ffffff',
                flexShrink: 0,
              }}>
                {getUrgencyLabel(task.urgency)}
              </span>
            </div>

            <p style={{
              fontSize: '13px',
              color: '#5b4637',
              opacity: 0.8,
              marginBottom: '16px',
              lineHeight: 1.6,
              display: '-webkit-box',
              WebkitLineClamp: 3,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}>
              {task.description}
            </p>

            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '12px',
              padding: '10px 14px',
              backgroundColor: 'rgba(255,255,255,0.6)',
              borderRadius: '10px',
            }}>
              <div>
                <span style={{ fontSize: '12px', color: '#718096' }}>报酬</span>
                <p style={{ fontSize: '18px', fontWeight: 600, color: '#c4a882', margin: 0 }}>
                  {task.reward} <span style={{ fontSize: '12px', fontWeight: 400 }}>积分</span>
                </p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '12px', color: '#718096' }}>状态</span>
                <p style={{ 
                  fontSize: '13px', 
                  fontWeight: 500, 
                  color: task.status === 'completed' ? '#38a169' 
                    : task.status === 'in-progress' ? '#d69e2e' 
                    : '#3182ce',
                  margin: 0,
                }}>
                  {getStatusLabel(task.status)}
                </p>
              </div>
            </div>

            <div style={{
              fontSize: '12px',
              color: '#718096',
              marginBottom: '12px',
              display: 'flex',
              justifyContent: 'space-between',
            }}>
              <span>发布：{formatDateTime(task.createdAt)}</span>
              <span>截止：{formatDeadline(task.deadline)}</span>
            </div>

            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingTop: '12px',
              borderTop: '1px solid rgba(91,70,55,0.1)',
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}>
                <div style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  backgroundColor: '#c4a882',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                  fontSize: '10px',
                  fontWeight: 500,
                }}>
                  {task.creatorNickname.charAt(0)}
                </div>
                <span style={{ fontSize: '12px', color: '#5b4637' }}>
                  {task.creatorNickname}
                </span>
              </div>
              
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}>
                <span style={{ fontSize: '12px', color: '#718096' }}>
                  {task.acceptedBy.length}/{task.maxAccepts} 人响应
                </span>
                {task.status === 'pending' && task.acceptedBy.length < task.maxAccepts && (
                  <button
                    className="btn btn-primary"
                    style={{
                      padding: '8px 16px',
                      fontSize: '13px',
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAcceptTask(task.id);
                    }}
                  >
                    接单
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div ref={observerRef} style={{
        height: '40px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#718096',
        fontSize: '13px',
      }}>
        {hasMore ? '加载更多任务...' : '已加载全部任务'}
      </div>

      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2 className="modal-title">发布求助任务</h2>
            
            <form onSubmit={handleCreateTask}>
              <div className="form-group">
                <label className="form-label">任务标题</label>
                <input
                  type="text"
                  className="form-input"
                  value={newTask.title}
                  onChange={e => setNewTask(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="请简要描述您需要的帮助"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">详细描述</label>
                <textarea
                  className="form-input form-textarea"
                  value={newTask.description}
                  onChange={e => setNewTask(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="请详细说明任务要求和注意事项"
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: '16px' }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">报酬积分</label>
                  <input
                    type="number"
                    className="form-input"
                    value={newTask.reward}
                    onChange={e => setNewTask(prev => ({ ...prev, reward: Math.max(1, parseInt(e.target.value) || 1) }))}
                    min="1"
                    max="1000"
                    required
                  />
                </div>

                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">需要人数</label>
                  <input
                    type="number"
                    className="form-input"
                    value={newTask.maxAccepts}
                    onChange={e => setNewTask(prev => ({ ...prev, maxAccepts: Math.min(5, Math.max(1, parseInt(e.target.value) || 1)) }))}
                    min="1"
                    max="5"
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">截止时间</label>
                <input
                  type="datetime-local"
                  className="form-input"
                  value={newTask.deadline}
                  onChange={e => setNewTask(prev => ({ ...prev, deadline: e.target.value }))}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">紧急程度</label>
                <select
                  className="form-input"
                  value={newTask.urgency}
                  onChange={e => setNewTask(prev => ({ ...prev, urgency: e.target.value as TaskUrgency }))}
                >
                  <option value="normal">普通</option>
                  <option value="urgent">紧急</option>
                  <option value="very-urgent">非常紧急</option>
                </select>
              </div>

              <div className="btn-group">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowCreateModal(false)}
                >
                  取消
                </button>
                <button type="submit" className="btn btn-primary">
                  发布任务
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default TaskBoard;
