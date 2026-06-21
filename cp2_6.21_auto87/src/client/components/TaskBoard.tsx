import { useState, useEffect, useCallback } from 'react';
import { api } from '@/client/services/api';
import type { Task, CurrentUser, TaskType, TaskUrgency } from '@/types';

interface Props {
  currentUser: CurrentUser;
}

const TASK_TYPES: TaskType[] = ['浇水', '施肥', '除草', '采摘'];
const URGENCY_LEVELS: TaskUrgency[] = ['普通', '紧急', '非常紧急'];

export default function TaskBoard({ currentUser }: Props) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    title: '',
    type: '浇水' as TaskType,
    urgency: '普通' as TaskUrgency,
    deadline: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
  });
  const [loading, setLoading] = useState(false);

  const loadTasks = useCallback(async () => {
    try {
      const data = await api.getTasks();
      setTasks(data);
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const handleCreate = async () => {
    if (!form.title.trim()) return;
    setLoading(true);
    try {
      await api.createTask(form);
      setForm({ title: '', type: '浇水', urgency: '普通', deadline: new Date(Date.now() + 86400000).toISOString().slice(0, 10) });
      setShowForm(false);
      await loadTasks();
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleClaim = async (taskId: string) => {
    try {
      await api.claimTask(taskId, currentUser.id);
      await loadTasks();
    } catch (e) {
      console.error(e);
    }
  };

  const handleComplete = async (taskId: string) => {
    try {
      await api.completeTask(taskId);
      await loadTasks();
    } catch (e) {
      console.error(e);
    }
  };

  const activeTasks = tasks.filter((t) => t.status !== '已完成');
  const historyTasks = tasks.filter((t) => t.status === '已完成').slice(0, 5);

  const urgencyClass = (u: TaskUrgency) => {
    if (u === '非常紧急') return 'very-urgent';
    if (u === '紧急') return 'urgent';
    return '';
  };

  return (
    <section className="panel">
      <div className="panel-title">
        <span>🌱 任务看板</span>
        <div className="actions">
          <button className="accordion-toggle" onClick={() => setShowForm((v) => !v)} title="创建任务">
            {showForm ? '−' : '+'}
          </button>
        </div>
      </div>
      <div className="panel-content">
        {showForm && (
          <div className="card create-task-form">
            <input
              placeholder="任务标题，例如：给番茄浇水"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
            <div className="form-row">
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as TaskType })}>
                {TASK_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
              <select value={form.urgency} onChange={(e) => setForm({ ...form, urgency: e.target.value as TaskUrgency })}>
                {URGENCY_LEVELS.map((u) => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
              <input
                type="date"
                value={form.deadline}
                onChange={(e) => setForm({ ...form, deadline: e.target.value })}
              />
            </div>
            <button className="btn btn-primary btn-block" onClick={handleCreate} disabled={loading}>
              {loading ? '提交中...' : '创建任务'}
            </button>
          </div>
        )}

        {activeTasks.length === 0 && (
          <div className="empty-state">暂无待处理任务，点击右上角 + 创建新任务</div>
        )}

        {activeTasks.map((task) => (
          <div key={task.id} className={`card task-card ${urgencyClass(task.urgency)}`}>
            <div className="task-header">
              <div className="task-title">{task.title}</div>
            </div>
            <div className="task-tags">
              <span className="tag tag-type">{task.type}</span>
              <span className={`tag ${
                task.urgency === '非常紧急' ? 'tag-urgency-very-urgent' :
                task.urgency === '紧急' ? 'tag-urgency-urgent' : 'tag-urgency-normal'
              }`}>{task.urgency}</span>
              <span className="tag tag-status">{task.status}</span>
            </div>
            <div className="task-meta">
              <span>📅 截止：{task.deadline}</span>
              {task.assigneeName && <span>👤 {task.assigneeName}</span>}
            </div>
            <div className="task-actions">
              {task.status === '待认领' && (
                <button className="btn btn-primary btn-sm" onClick={() => handleClaim(task.id)}>认领</button>
              )}
              {task.status === '进行中' && task.assigneeId === currentUser.id && (
                <button className="btn btn-secondary btn-sm" onClick={() => handleComplete(task.id)}>完成</button>
              )}
              {task.status === '进行中' && task.assigneeId !== currentUser.id && (
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>进行中...</span>
              )}
            </div>
          </div>
        ))}

        {historyTasks.length > 0 && (
          <>
            <div style={{ fontWeight: 600, margin: '16px 0 8px', fontSize: 13, color: 'var(--text-muted)' }}>
              📜 历史记录
            </div>
            {historyTasks.map((task) => (
              <div key={task.id} className="card task-card task-history">
                <div className="task-title" style={{ fontSize: 13 }}>
                  ✅ {task.title}
                </div>
                <div className="task-meta" style={{ margin: '4px 0 0' }}>
                  <span>{task.assigneeName ?? '—'}</span>
                  <span>{task.completedAt?.slice(0, 10)}</span>
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </section>
  );
}
