import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { DragDropContext, Droppable, DropResult } from 'react-beautiful-dnd';
import {
  apiService,
  Task,
  TeamMember,
  TaskStatus,
  TaskPriority,
  SprintData,
} from '../api/apiService';
import TaskCard from '../components/TaskCard';

const COLUMNS: {
  id: TaskStatus;
  title: string;
  badgeClass: string;
  progressColor: string;
}[] = [
  { id: 'todo', title: '待办', badgeClass: 'badge-todo', progressColor: '#718096' },
  { id: 'in_progress', title: '进行中', badgeClass: 'badge-progress', progressColor: '#3182ce' },
  { id: 'done', title: '已完成', badgeClass: 'badge-done', progressColor: '#38a169' },
];

const PRIORITY_OPTIONS: { value: TaskPriority; label: string; activeClass: string }[] = [
  { value: 'low', label: '低', activeClass: 'active-low' },
  { value: 'medium', label: '中', activeClass: 'active-medium' },
  { value: 'high', label: '高', activeClass: 'active-high' },
];

const ProgressRing: React.FC<{ percent: number; color: string }> = ({ percent, color }) => {
  const size = 40;
  const stroke = 5;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(100, percent));
  const offset = c - (clamped / 100) * c;
  return (
    <div className="progress-ring">
      <svg width={size} height={size}>
        <circle className="ring-bg" cx={size / 2} cy={size / 2} r={r} strokeWidth={stroke} fill="none" />
        <circle
          className="ring-fg"
          cx={size / 2}
          cy={size / 2}
          r={r}
          strokeWidth={stroke}
          fill="none"
          stroke={color}
          strokeDasharray={c}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="progress-ring-text">{Math.round(clamped)}%</div>
    </div>
  );
};

interface NewTaskForm {
  title: string;
  description: string;
  assigneeId: string;
  priority: TaskPriority;
  storyPoints: number;
}

const BoardPage: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [sprint, setSprint] = useState<SprintData['sprint'] | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showModal, setShowModal] = useState(false);
  const [newTask, setNewTask] = useState<NewTaskForm>({
    title: '',
    description: '',
    assigneeId: '',
    priority: 'medium',
    storyPoints: 3,
  });
  const [submitting, setSubmitting] = useState(false);

  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [editForm, setEditForm] = useState<{ description: string; assigneeId: string }>({
    description: '',
    assigneeId: '',
  });
  const [savingEdit, setSavingEdit] = useState(false);

  const showError = useCallback((msg: string) => {
    setError(msg);
    setTimeout(() => setError(null), 3000);
  }, []);

  const loadAll = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const [tasksRes, membersRes, sprintRes] = await Promise.all([
        apiService.getTasks(),
        apiService.getMembers(),
        apiService.getSprintData(),
      ]);
      setTasks(tasksRes);
      setMembers(membersRes);
      setSprint(sprintRes.sprint);
    } catch (e: any) {
      showError(e.message || '加载数据失败');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [showError]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const memberMap = useMemo(() => {
    const m: Record<string, TeamMember> = {};
    members.forEach((mem) => (m[mem.id] = mem));
    return m;
  }, [members]);

  const groupedTasks = useMemo(() => {
    const g: Record<TaskStatus, Task[]> = { todo: [], in_progress: [], done: [] };
    tasks.forEach((t) => {
      if (g[t.status]) g[t.status].push(t);
    });
    return g;
  }, [tasks]);

  const columnStats = useMemo(() => {
    const total = tasks.length || 1;
    return COLUMNS.map((col) => {
      const count = groupedTasks[col.id].length;
      return { ...col, count, percent: (count / total) * 100 };
    });
  }, [groupedTasks, tasks.length]);

  const handleDragEnd = async (result: DropResult) => {
    const { source, destination } = result;
    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    const taskId = result.draggableId;
    const newStatus = destination.droppableId as TaskStatus;

    setTasks((prev) => {
      const next = prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t));
      return next;
    });

    try {
      await apiService.updateTaskStatus(taskId, newStatus);
    } catch (e: any) {
      showError(e.message || '更新状态失败');
      await loadAll();
    }
  };

  const openCreateModal = () => {
    setNewTask({ title: '', description: '', assigneeId: '', priority: 'medium', storyPoints: 3 });
    setShowModal(true);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.title.trim()) return;
    setSubmitting(true);
    try {
      const created = await apiService.createTask({
        title: newTask.title,
        description: newTask.description,
        assigneeId: newTask.assigneeId || null,
        priority: newTask.priority,
        storyPoints: newTask.storyPoints,
      });
      setTasks((prev) => [created, ...prev]);
      setShowModal(false);
    } catch (err: any) {
      showError(err.message || '创建任务失败');
    } finally {
      setSubmitting(false);
    }
  };

  const openTaskDrawer = (task: Task) => {
    setSelectedTask(task);
    setEditForm({
      description: task.description,
      assigneeId: task.assigneeId || '',
    });
  };

  const closeDrawer = () => {
    setSelectedTask(null);
  };

  const saveTaskEdits = async () => {
    if (!selectedTask) return;
    setSavingEdit(true);
    try {
      const updated = await apiService.updateTask(selectedTask.id, {
        description: editForm.description,
        assigneeId: editForm.assigneeId || null,
      });
      setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      setSelectedTask(updated);
    } catch (e: any) {
      showError(e.message || '保存失败');
    } finally {
      setSavingEdit(false);
    }
  };

  const deleteSelectedTask = async () => {
    if (!selectedTask) return;
    if (!confirm(`确认删除任务「${selectedTask.title}」？`)) return;
    try {
      await apiService.deleteTask(selectedTask.id);
      setTasks((prev) => prev.filter((t) => t.id !== selectedTask.id));
      setSelectedTask(null);
    } catch (e: any) {
      showError(e.message || '删除失败');
    }
  };

  if (loading) {
    return (
      <div className="loading-wrap">
        <div className="spinner" />
      </div>
    );
  }

  const selectedAssignee = selectedTask?.assigneeId ? memberMap[selectedTask.assigneeId] : null;

  return (
    <>
      <div className="page-header">
        <div className="page-title-group">
          <h1 className="page-title">任务看板</h1>
          <div className="page-subtitle">
            {sprint ? `${sprint.name} · ${sprint.startDate} 至 ${sprint.endDate}` : '当前迭代'}
          </div>
        </div>
        <div className="header-actions">
          <button
            className={`refresh-btn ${refreshing ? 'spinning' : ''}`}
            onClick={() => loadAll(true)}
            title="刷新数据"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 4v6h-6" /><path d="M1 20v-6h6" /><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
            </svg>
          </button>
          <button className="btn btn-primary" onClick={openCreateModal}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            新建任务
          </button>
        </div>
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="kanban-board">
          {columnStats.map((col) => (
            <div className="kanban-column" key={col.id}>
              <div className="column-header">
                <ProgressRing percent={col.percent} color={col.progressColor} />
                <div className="column-title-row">
                  <div className="column-title">
                    {col.title}
                    <span className={`count-badge ${col.badgeClass}`}>{col.count}</span>
                  </div>
                </div>
              </div>

              <Droppable droppableId={col.id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`column-droppable ${snapshot.isDraggingOver ? 'is-dragging-over' : ''}`}
                  >
                    {groupedTasks[col.id].length === 0 ? (
                      <div className="empty-state">暂无任务</div>
                    ) : (
                      groupedTasks[col.id].map((task, idx) => (
                        <TaskCard
                          key={task.id}
                          task={task}
                          index={idx}
                          memberMap={memberMap}
                          onClick={() => openTaskDrawer(task)}
                        />
                      ))
                    )}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          ))}
        </div>
      </DragDropContext>

      {showModal && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false); }}>
          <form className="modal" onSubmit={handleCreateSubmit}>
            <div className="modal-header">
              <h2 className="modal-title">新建任务</h2>
              <button type="button" className="modal-close" onClick={() => setShowModal(false)}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <div className="form-group">
              <label className="form-label">任务标题 *</label>
              <input
                type="text"
                className="form-input"
                placeholder="请输入任务标题..."
                value={newTask.title}
                onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                autoFocus
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">任务描述</label>
              <textarea
                className="form-textarea"
                placeholder="请输入任务描述..."
                value={newTask.description}
                onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div className="form-group">
                <label className="form-label">负责人</label>
                <select
                  className="form-select"
                  value={newTask.assigneeId}
                  onChange={(e) => setNewTask({ ...newTask, assigneeId: e.target.value })}
                >
                  <option value="">未分配</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">故事点数</label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  className="form-input"
                  value={newTask.storyPoints}
                  onChange={(e) => setNewTask({ ...newTask, storyPoints: Number(e.target.value) || 0 })}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">优先级</label>
              <div className="priority-picker">
                {PRIORITY_OPTIONS.map((opt) => (
                  <div
                    key={opt.value}
                    className={`priority-option ${newTask.priority === opt.value ? opt.activeClass : ''}`}
                    onClick={() => setNewTask({ ...newTask, priority: opt.value })}
                  >
                    {opt.label}
                  </div>
                ))}
              </div>
            </div>

            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                取消
              </button>
              <button type="submit" className="btn btn-primary" disabled={submitting || !newTask.title.trim()}>
                {submitting ? '创建中...' : '创建任务'}
              </button>
            </div>
          </form>
        </div>
      )}

      {selectedTask && (
        <>
          <div className="drawer-overlay" onClick={closeDrawer} />
          <aside className="drawer">
            <div className="drawer-header">
              <h2 className="drawer-title">{selectedTask.title}</h2>
              <button className="drawer-close" onClick={closeDrawer}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <div className="drawer-body">
              <div className="meta-row">
                <div className="meta-item">
                  <span className={`priority-tag priority-${selectedTask.priority}`}>
                    {{ low: '低', medium: '中', high: '高' }[selectedTask.priority]}优先级
                  </span>
                </div>
                <div className="meta-item">
                  <span className="story-points">{selectedTask.storyPoints} 故事点</span>
                </div>
                <div className="meta-item">
                  <span className="dot" style={{
                    background: COLUMNS.find((c) => c.id === selectedTask.status)?.progressColor,
                  }} />
                  {COLUMNS.find((c) => c.id === selectedTask.status)?.title}
                </div>
              </div>

              <div className="drawer-section">
                <div className="drawer-label">任务描述</div>
                <div className="drawer-value">
                  <textarea
                    value={editForm.description}
                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                    placeholder="暂无描述"
                  />
                </div>
              </div>

              <div className="drawer-section">
                <div className="drawer-label">负责人</div>
                <div className="drawer-value">
                  <select
                    value={editForm.assigneeId}
                    onChange={(e) => setEditForm({ ...editForm, assigneeId: e.target.value })}
                  >
                    <option value="">未分配</option>
                    {members.map((m) => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="drawer-section">
                <div className="drawer-label">创建信息</div>
                <div className="drawer-value" style={{ background: 'transparent', border: 'none', padding: 0, fontSize: 13, color: '#a0aec0' }}>
                  创建时间：{new Date(selectedTask.createdAt).toLocaleString('zh-CN')}
                  <br />
                  更新时间：{new Date(selectedTask.updatedAt).toLocaleString('zh-CN')}
                </div>
              </div>

              <div className="drawer-section">
                <div className="drawer-label">当前负责人</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {selectedAssignee ? (
                    <>
                      <div className="avatar" style={{ background: selectedAssignee.avatarColor, width: 32, height: 32, fontSize: 12 }}>
                        {/^[\u4e00-\u9fa5]/.test(selectedAssignee.name)
                          ? selectedAssignee.name.slice(selectedAssignee.name.length - 1)
                          : selectedAssignee.name[0]}
                      </div>
                      <span style={{ color: '#e2e8f0', fontWeight: 600 }}>{selectedAssignee.name}</span>
                    </>
                  ) : (
                    <span style={{ color: '#718096' }}>未分配负责人</span>
                  )}
                </div>
              </div>
            </div>

            <div className="drawer-footer">
              <button className="btn btn-danger" onClick={deleteSelectedTask}>
                删除
              </button>
              <button className="btn btn-secondary" onClick={closeDrawer}>
                关闭
              </button>
              <button className="btn btn-primary" onClick={saveTaskEdits} disabled={savingEdit}>
                {savingEdit ? '保存中...' : '保存修改'}
              </button>
            </div>
          </aside>
        </>
      )}

      {error && <div className="error-toast">{error}</div>}
    </>
  );
};

export default BoardPage;
