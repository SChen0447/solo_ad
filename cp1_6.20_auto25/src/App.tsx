import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { io, Socket } from 'socket.io-client';
import KanbanBoard from './components/KanbanBoard';
import GanttChart from './components/GanttChart';
import { Task, TaskStatus, MEMBERS, generateTasks } from './utils/mockData';
import * as apiService from './services/apiService';

const App: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [optimizing, setOptimizing] = useState(false);
  const [optimizedTasks, setOptimizedTasks] = useState<Task[] | null>(null);
  const [showComparison, setShowComparison] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const syncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const loadTasks = async () => {
      try {
        const data = await apiService.fetchTasks();
        setTasks(data);
      } catch {
        setTasks(generateTasks());
      }
    };
    loadTasks();

    const socket = io({ transports: ['websocket', 'polling'] });
    socketRef.current = socket;

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));

    socket.on('task_updated', (data: { memberName: string }) => {
      if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
      setSyncMessage(`${data.memberName} 正在修改…`);
      syncTimeoutRef.current = setTimeout(() => setSyncMessage(null), 2000);
    });

    socket.on('tasks_synced', (updatedTasks: Task[]) => {
      setTasks(updatedTasks);
    });

    return () => {
      socket.disconnect();
      if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
    };
  }, []);

  const handleTaskStatusChange = useCallback(async (taskId: string, newStatus: TaskStatus) => {
    setTasks(prev => {
      const updated = prev.map(t =>
        t.id === taskId ? { ...t, status: newStatus } : t
      );
      try {
        const task = updated.find(t => t.id === taskId);
        if (task) apiService.updateTask(task);
        socketRef.current?.emit('task_update', {
          taskId,
          newStatus,
          memberName: '你',
        });
        socketRef.current?.emit('tasks_update', updated);
      } catch {}
      return updated;
    });
  }, []);

  const handleOptimize = useCallback(async () => {
    setOptimizing(true);
    try {
      const result = await apiService.optimizeSchedule(tasks);
      setOptimizedTasks(result);
      setShowComparison(true);
    } catch {
      const result = [...tasks];
      const memberHours: Record<string, number> = {};
      MEMBERS.forEach(m => { memberHours[m.id] = 0; });
      result.forEach(t => {
        if (t.status !== 'done') {
          memberHours[t.assigneeId] = (memberHours[t.assigneeId] || 0) + t.estimatedHours;
        }
      });

      const overloaded = MEMBERS.filter(m => memberHours[m.id] > 30)
        .sort((a, b) => memberHours[b.id] - memberHours[a.id]);
      const underloaded = MEMBERS.filter(m => memberHours[m.id] < 15)
        .sort((a, b) => memberHours[a.id] - memberHours[b.id]);

      for (const overMember of overloaded) {
        const overloadTasks = result
          .filter(t => t.assigneeId === overMember.id && t.status !== 'done' && t.priority !== 'high')
          .sort((a, b) => {
            const pr = { low: 0, medium: 1, high: 2 };
            return pr[a.priority] - pr[b.priority];
          });
        for (const task of overloadTasks) {
          if (memberHours[overMember.id] <= 30) break;
          const target = underloaded.find(m => memberHours[m.id] + task.estimatedHours <= 30);
          if (target) {
            task.assigneeId = target.id;
            memberHours[overMember.id] -= task.estimatedHours;
            memberHours[target.id] += task.estimatedHours;
          }
        }
      }
      setOptimizedTasks(result);
      setShowComparison(true);
    }
    setOptimizing(false);
  }, [tasks]);

  const handleApplyOptimization = useCallback(() => {
    if (optimizedTasks) {
      setTasks(optimizedTasks);
      try {
        apiService.updateTask(optimizedTasks[0]);
        socketRef.current?.emit('tasks_update', optimizedTasks);
      } catch {}
    }
    setShowComparison(false);
    setOptimizedTasks(null);
  }, [optimizedTasks]);

  const handleCancelOptimization = useCallback(() => {
    setShowComparison(false);
    setOptimizedTasks(null);
  }, []);

  const highlightTaskIds = useMemo(() => {
    if (!showComparison || !optimizedTasks) return undefined;
    const ids = new Set<string>();
    optimizedTasks.forEach(optTask => {
      const origTask = tasks.find(t => t.id === optTask.id);
      if (origTask && origTask.assigneeId !== optTask.assigneeId) {
        ids.add(optTask.id);
      }
    });
    return ids;
  }, [showComparison, optimizedTasks, tasks]);

  return (
    <>
      <style>{globalCSS}</style>
      <div className="app-root">
        <header className="app-header">
          <div className="header-left">
            <h1 className="app-title">
              <span className="title-icon">◈</span>
              团队日程协同
            </h1>
            <span className={`conn-status ${connected ? 'connected' : 'disconnected'}`}>
              {connected ? '已连接' : '未连接'}
            </span>
          </div>
          <div className="header-right">
            <button
              className="optimize-btn"
              onClick={handleOptimize}
              disabled={optimizing}
            >
              {optimizing ? (
                <>
                  <span className="spinner" /> 排期优化中…
                </>
              ) : (
                '⚡ 智能排期优化'
              )}
            </button>
          </div>
        </header>

        <main className="app-main">
          <section className="panel-left">
            <KanbanBoard
              tasks={showComparison && optimizedTasks ? optimizedTasks : tasks}
              members={MEMBERS}
              onTaskStatusChange={handleTaskStatusChange}
              highlightTaskIds={highlightTaskIds}
            />
          </section>
          <section className="panel-right">
            <div className="panel-right-header">
              <h2>团队日程时间线</h2>
            </div>
            <GanttChart
              tasks={showComparison && optimizedTasks ? optimizedTasks : tasks}
              members={MEMBERS}
              highlightTaskIds={highlightTaskIds}
            />
          </section>
        </main>

        {syncMessage && (
          <div className="sync-toast" key={syncMessage}>
            {syncMessage}
          </div>
        )}

        {showComparison && optimizedTasks && (
          <div className="comparison-overlay">
            <div className="comparison-panel">
              <h2>排期优化对比</h2>
              <p className="comparison-desc">
                橙色高亮标记的任务表示负责人已变更，点击"应用"以采纳优化方案。
              </p>
              <div className="comparison-stats">
                {MEMBERS.map(m => {
                  const origHours = tasks
                    .filter(t => t.assigneeId === m.id && t.status !== 'done')
                    .reduce((s, t) => s + t.estimatedHours, 0);
                  const optHours = optimizedTasks
                    .filter(t => t.assigneeId === m.id && t.status !== 'done')
                    .reduce((s, t) => s + t.estimatedHours, 0);
                  const changed = origHours !== optHours;
                  return (
                    <div key={m.id} className={`stat-card ${changed ? 'stat-changed' : ''}`}>
                      <div className="stat-name">{m.name}</div>
                      <div className="stat-hours">
                        <span className="stat-orig">{origHours}h</span>
                        {changed && (
                          <>
                            <span className="stat-arrow">→</span>
                            <span className="stat-new">{optHours}h</span>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="comparison-actions">
                <button className="btn-apply" onClick={handleApplyOptimization}>
                  应用优化
                </button>
                <button className="btn-cancel" onClick={handleCancelOptimization}>
                  取消
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

const globalCSS = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

* { margin: 0; padding: 0; box-sizing: border-box; }

body {
  background: #1A1A2E;
  color: #EAEAEA;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.app-root {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.app-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
  background: rgba(26, 26, 46, 0.95);
  border-bottom: 1px solid rgba(0, 212, 255, 0.15);
  backdrop-filter: blur(12px);
  position: sticky;
  top: 0;
  z-index: 100;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.app-title {
  font-size: 20px;
  font-weight: 700;
  color: #fff;
  display: flex;
  align-items: center;
  gap: 8px;
}

.title-icon {
  color: #00D4FF;
  font-size: 22px;
}

.conn-status {
  font-size: 12px;
  padding: 4px 10px;
  border-radius: 12px;
  font-weight: 500;
}
.conn-status.connected {
  background: rgba(46, 213, 115, 0.15);
  color: #2ED573;
}
.conn-status.disconnected {
  background: rgba(255, 71, 87, 0.15);
  color: #FF4757;
}

.optimize-btn {
  background: linear-gradient(135deg, #00D4FF 0%, #0099CC 100%);
  color: #1A1A2E;
  border: none;
  padding: 10px 24px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  position: relative;
  overflow: hidden;
}
.optimize-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0, 212, 255, 0.35);
}
.optimize-btn:active {
  transform: translateY(0) scale(0.97);
}
.optimize-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
  transform: none;
}

.optimize-btn::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 0;
  height: 0;
  border-radius: 50%;
  background: rgba(255,255,255,0.3);
  transform: translate(-50%, -50%);
  transition: width 0.6s, height 0.6s;
}
.optimize-btn:active::after {
  width: 200px;
  height: 200px;
}

.spinner {
  display: inline-block;
  width: 14px;
  height: 14px;
  border: 2px solid rgba(26,26,46,0.3);
  border-top-color: #1A1A2E;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
  vertical-align: middle;
  margin-right: 6px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.app-main {
  display: flex;
  flex: 1;
  overflow: hidden;
  height: calc(100vh - 64px);
}

.panel-left {
  flex: 1;
  min-width: 0;
  padding: 20px;
  overflow-y: auto;
}

.panel-right {
  width: 520px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  border-left: 1px solid rgba(0, 212, 255, 0.1);
}

.panel-right-header {
  padding: 16px 20px;
  border-bottom: 1px solid rgba(0, 212, 255, 0.1);
}
.panel-right-header h2 {
  font-size: 15px;
  font-weight: 600;
  color: rgba(255,255,255,0.85);
}

/* Kanban Board */
.kanban-board {
  display: flex;
  gap: 16px;
  height: 100%;
}

.kanban-column {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: rgba(45, 45, 68, 0.4);
  border-radius: 12px;
  border: 2px solid transparent;
  transition: border-color 0.25s, background 0.25s;
  min-width: 0;
}
.kanban-column.column-drag-over {
  border-color: rgba(0, 212, 255, 0.5);
  background: rgba(0, 212, 255, 0.05);
}

.column-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px 10px;
}

.column-title {
  font-size: 14px;
  font-weight: 600;
  color: rgba(255,255,255,0.85);
}

.column-count {
  font-size: 12px;
  background: rgba(0, 212, 255, 0.15);
  color: #00D4FF;
  padding: 2px 8px;
  border-radius: 10px;
  font-weight: 500;
}

.column-body {
  flex: 1;
  padding: 0 10px 10px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  overflow-y: auto;
}

.kanban-card {
  background: #2D2D44;
  border-radius: 10px;
  padding: 14px;
  border: 2px solid transparent;
  cursor: grab;
  user-select: none;
  animation: cardFadeIn 0.4s ease both;
  will-change: transform;
}

@keyframes cardFadeIn {
  from {
    opacity: 0;
    transform: translateY(12px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.kanban-card:active {
  cursor: grabbing;
}

.kanban-card:hover {
  border-color: rgba(0, 212, 255, 0.25);
}

.card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}

.priority-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.card-title {
  font-size: 13px;
  font-weight: 600;
  color: #fff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.card-desc {
  font-size: 11px;
  color: rgba(255,255,255,0.5);
  margin-bottom: 10px;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card-footer {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.card-avatar {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: linear-gradient(135deg, #00D4FF, #0099CC);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 9px;
  font-weight: 700;
  color: #1A1A2E;
  flex-shrink: 0;
}

.card-due {
  font-size: 11px;
  color: rgba(255,255,255,0.6);
  margin-left: auto;
}

.card-hours {
  font-size: 11px;
  color: rgba(0, 212, 255, 0.8);
  font-weight: 500;
}

.progress-bar-track {
  height: 3px;
  background: rgba(255,255,255,0.08);
  border-radius: 2px;
  overflow: hidden;
}

.progress-bar-fill {
  height: 100%;
  border-radius: 2px;
  transition: width 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
}

/* Gantt Chart */
.gantt-container {
  flex: 1;
  overflow-x: auto;
  overflow-y: auto;
  padding: 0 8px 8px;
  scrollbar-width: thin;
  scrollbar-color: rgba(0,212,255,0.3) transparent;
}
.gantt-container::-webkit-scrollbar {
  height: 6px;
  width: 6px;
}
.gantt-container::-webkit-scrollbar-thumb {
  background: rgba(0,212,255,0.3);
  border-radius: 3px;
}

.gantt-svg {
  display: block;
}

/* Sync Toast */
.sync-toast {
  position: fixed;
  top: 80px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0, 212, 255, 0.15);
  border: 1px solid rgba(0, 212, 255, 0.3);
  color: #00D4FF;
  padding: 8px 24px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  z-index: 200;
  animation: toastFade 2s ease forwards;
  backdrop-filter: blur(8px);
}

@keyframes toastFade {
  0% { opacity: 0; transform: translateX(-50%) translateY(-8px); }
  10% { opacity: 1; transform: translateX(-50%) translateY(0); }
  80% { opacity: 1; }
  100% { opacity: 0; transform: translateX(-50%) translateY(-4px); }
}

/* Comparison Overlay */
.comparison-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 300;
  animation: overlayIn 0.3s ease;
}

@keyframes overlayIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.comparison-panel {
  background: #2D2D44;
  border: 1px solid rgba(0, 212, 255, 0.2);
  border-radius: 16px;
  padding: 32px;
  max-width: 600px;
  width: 90%;
  animation: panelSlide 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes panelSlide {
  from { opacity: 0; transform: translateY(20px) scale(0.95); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

.comparison-panel h2 {
  font-size: 18px;
  margin-bottom: 8px;
  color: #fff;
}

.comparison-desc {
  font-size: 13px;
  color: rgba(255,255,255,0.6);
  margin-bottom: 20px;
}

.comparison-stats {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 24px;
}

.stat-card {
  background: rgba(255,255,255,0.05);
  border-radius: 10px;
  padding: 14px 18px;
  flex: 1;
  min-width: 90px;
  border: 2px solid transparent;
  transition: border-color 0.3s;
}
.stat-card.stat-changed {
  border-color: #FF8C00;
  background: rgba(255, 140, 0, 0.08);
}

.stat-name {
  font-size: 13px;
  font-weight: 600;
  color: rgba(255,255,255,0.85);
  margin-bottom: 4px;
}

.stat-hours {
  font-size: 18px;
  font-weight: 700;
  color: #fff;
}

.stat-arrow {
  color: #FF8C00;
  margin: 0 6px;
  font-size: 14px;
}

.stat-orig {
  color: rgba(255,255,255,0.5);
  text-decoration: line-through;
  font-size: 14px;
}

.stat-new {
  color: #FF8C00;
}

.comparison-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}

.btn-apply {
  background: linear-gradient(135deg, #FF8C00, #FF6200);
  color: #fff;
  border: none;
  padding: 10px 28px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.btn-apply:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(255, 140, 0, 0.35);
}

.btn-cancel {
  background: rgba(255,255,255,0.08);
  color: rgba(255,255,255,0.7);
  border: 1px solid rgba(255,255,255,0.1);
  padding: 10px 28px;
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.25s;
}
.btn-cancel:hover {
  background: rgba(255,255,255,0.12);
  color: #fff;
}

@media (max-width: 1024px) {
  .app-main {
    flex-direction: column;
  }
  .panel-right {
    width: 100%;
    border-left: none;
    border-top: 1px solid rgba(0, 212, 255, 0.1);
    max-height: 300px;
  }
}
`;

export default App;
