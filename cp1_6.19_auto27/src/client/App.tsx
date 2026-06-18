import { useEffect, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAppStore } from './store';
import ProjectBoard from './components/ProjectBoard';
import HealthPanel from './components/HealthPanel';
import type { SearchResult } from './types';

let socket: Socket | null = null;

export default function App() {
  const {
    projects,
    currentProject,
    currentProjectId,
    searchResults,
    alerts,
    sidebarCollapsed,
    sidebarWidth,
    loadProjects,
    loadProject,
    loadHealth,
    search,
    clearSearch,
    createProject,
    createTask,
    toggleSidebar,
    setSidebarWidth,
    dismissAlert,
  } = useAppStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [showNewTaskModal, setShowNewTaskModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectMembers, setNewProjectMembers] = useState('');
  const [newTask, setNewTask] = useState({ title: '', description: '', assignee: '', estimatedHours: 4, dueDate: '' });
  const [resizing, setResizing] = useState(false);
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1440);

  useEffect(() => {
    const onResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  useEffect(() => {
    const healthInterval = setInterval(() => {
      if (currentProjectId) loadHealth(currentProjectId);
    }, 5 * 60 * 1000);
    return () => clearInterval(healthInterval);
  }, [currentProjectId, loadHealth]);

  useEffect(() => {
    socket = io();
    socket.on('connect', () => console.log('socket connected'));
    socket.on('project:created', () => loadProjects());
    socket.onAny((event: string) => {
      if (currentProjectId && event.includes(`project:${currentProjectId}`)) {
        loadProject(currentProjectId);
      }
    });
    return () => {
      socket?.disconnect();
    };
  }, [currentProjectId, loadProject, loadProjects]);

  useEffect(() => {
    const onOpenNewTask = () => setShowNewTaskModal(true);
    window.addEventListener('openNewTaskModal', onOpenNewTask);
    return () => window.removeEventListener('openNewTaskModal', onOpenNewTask);
  }, []);

  useEffect(() => {
    if (!searchQuery.trim()) {
      clearSearch();
      return;
    }
    const t = setTimeout(() => search(searchQuery), 150);
    return () => clearTimeout(t);
  }, [searchQuery, search, clearSearch]);

  const handleMouseDown = useCallback(() => {
    setResizing(true);
  }, []);

  useEffect(() => {
    if (!resizing) return;
    const handleMove = (e: MouseEvent) => {
      const width = Math.max(260, Math.min(600, window.innerWidth - e.clientX));
      setSidebarWidth(width);
    };
    const handleUp = () => setResizing(false);
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, [resizing, setSidebarWidth]);

  const handleSearchClick = (r: SearchResult) => {
    loadProject(r.projectId);
    setSearchQuery('');
    setShowSearch(false);
  };

  const handleCreateProject = async () => {
    if (!newProjectName.trim() || !newProjectMembers.trim()) return;
    const members = newProjectMembers.split(/[,，\s]+/).filter(Boolean);
    await createProject(newProjectName.trim(), members);
    setNewProjectName('');
    setNewProjectMembers('');
    setShowNewProjectModal(false);
  };

  const handleCreateTask = async () => {
    if (!newTask.title.trim() || !newTask.assignee.trim() || !currentProjectId) return;
    const payload = {
      ...newTask,
      dueDate: newTask.dueDate
        ? new Date(newTask.dueDate).toISOString()
        : new Date(Date.now() + 3 * 24 * 3600 * 1000).toISOString(),
    };
    await createTask(currentProjectId, payload);
    setNewTask({ title: '', description: '', assignee: '', estimatedHours: 4, dueDate: '' });
    setShowNewTaskModal(false);
  };

  const displayedProjects = projects.slice(0, 6);
  const isDesktop = windowWidth >= 1024;
  const showSidebar = isDesktop && !sidebarCollapsed;

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#1a1a2e' }}>
      {/* Top Nav */}
      <nav
        style={{
          height: 64,
          display: 'flex',
          alignItems: 'center',
          padding: '0 24px',
          background: 'rgba(22, 33, 62, 0.85)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          borderBottom: '1px solid rgba(74, 74, 106, 0.5)',
          position: 'sticky',
          top: 0,
          zIndex: 100,
          gap: 16,
          flexShrink: 0,
        }}
      >
        <div
          style={{
            fontFamily: "'Poppins', sans-serif",
            fontWeight: 700,
            fontSize: '1.4rem',
            color: '#e94560',
            letterSpacing: 0.5,
            flexShrink: 0,
          }}
        >
          FlowDash
        </div>

        <div style={{ display: 'flex', gap: 4, flex: 1, justifyContent: 'center', flexWrap: 'wrap' }}>
          {displayedProjects.map(p => (
            <button
              key={p.id}
              onClick={() => loadProject(p.id)}
              style={{
                padding: '8px 16px',
                borderRadius: 8,
                background: currentProjectId === p.id ? '#e94560' : 'transparent',
                color: currentProjectId === p.id ? '#fff' : '#c4c4d8',
                border: 'none',
                fontSize: 14,
                fontWeight: 500,
                transition: 'all 0.2s ease',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = '#e94560';
                e.currentTarget.style.color = '#fff';
              }}
              onMouseLeave={e => {
                if (currentProjectId !== p.id) {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = '#c4c4d8';
                }
              }}
            >
              {p.name}
            </button>
          ))}
          <button
            onClick={() => setShowNewProjectModal(true)}
            style={{
              padding: '8px 14px',
              borderRadius: 8,
              background: 'transparent',
              color: '#e94560',
              border: '1px dashed #e94560',
              fontSize: 14,
              fontWeight: 500,
              transition: 'all 0.2s ease',
            }}
          >
            + 新建
          </button>
        </div>

        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              placeholder="搜索项目、任务、负责人..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onFocus={() => setShowSearch(true)}
              onBlur={() => setTimeout(() => setShowSearch(false), 200)}
              style={{
                width: isDesktop ? 260 : 160,
                padding: '10px 16px',
                borderRadius: 12,
                background: 'rgba(45, 45, 68, 0.6)',
                border: '1px solid #4a4a6a',
                color: '#e4e4f0',
                fontSize: 14,
                transition: 'all 0.3s ease',
                outline: 'none',
              }}
              onFocusCapture={e => {
                e.currentTarget.style.borderRadius = '16px';
                e.currentTarget.style.borderColor = '#e94560';
              }}
              onBlurCapture={e => {
                e.currentTarget.style.borderRadius = '12px';
                e.currentTarget.style.borderColor = '#4a4a6a';
              }}
            />
            {showSearch && searchResults.length > 0 && (
              <div
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 8px)',
                  right: 0,
                  width: 320,
                  maxHeight: 380,
                  overflowY: 'auto',
                  background: '#16213e',
                  border: '1px solid #4a4a6a',
                  borderRadius: 12,
                  boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                  zIndex: 1000,
                  animation: 'slide-in 0.2s ease',
                }}
              >
                {searchResults.map((r, i) => (
                  <div
                    key={`${r.type}-${r.id}-${i}`}
                    onMouseDown={() => handleSearchClick(r)}
                    style={{
                      padding: '12px 16px',
                      borderBottom: i < searchResults.length - 1 ? '1px solid rgba(74,74,106,0.3)' : 'none',
                      cursor: 'pointer',
                      transition: 'background 0.15s ease',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#2d2d44')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span
                        style={{
                          fontSize: 11,
                          padding: '2px 8px',
                          borderRadius: 4,
                          background: r.type === 'project' ? '#3d6b93' : '#b8860b',
                          color: '#fff',
                          textTransform: 'uppercase',
                          fontWeight: 600,
                        }}
                      >
                        {r.type === 'project' ? '项目' : '任务'}
                      </span>
                      <span style={{ fontWeight: 600, fontSize: 14, color: '#e4e4f0' }}>{r.title}</span>
                    </div>
                    <div style={{ fontSize: 12, color: '#8888a8' }}>{r.subtitle}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #e94560, #3d6b93)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: 14,
              color: '#fff',
              flexShrink: 0,
            }}
          >
            U
          </div>
        </div>
      </nav>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div
          style={{
            background: 'linear-gradient(90deg, #e94560, #c03550)',
            padding: '10px 24px',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            flexWrap: 'wrap',
            flexShrink: 0,
          }}
        >
          {alerts.map((a, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                color: '#fff',
                fontSize: 13,
                fontWeight: 500,
              }}
            >
              <span>{a}</span>
              <button
                onClick={() => dismissAlert(i)}
                style={{
                  background: 'rgba(255,255,255,0.2)',
                  color: '#fff',
                  borderRadius: 4,
                  width: 20,
                  height: 20,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 12,
                }}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Main content */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative' }}>
        <div style={{ flex: 1, overflow: 'auto', minWidth: 0 }}>
          <ProjectBoard />
        </div>

        {showSidebar && (
          <>
            <div
              onMouseDown={handleMouseDown}
              style={{
                width: resizing ? 4 : 2,
                cursor: 'col-resize',
                background: resizing ? '#e94560' : 'rgba(74,74,106,0.5)',
                flexShrink: 0,
                transition: 'all 0.15s ease',
              }}
            />
            <div
              style={{
                width: sidebarWidth,
                background: '#16213e',
                borderLeft: '1px solid rgba(74, 74, 106, 0.3)',
                overflowY: 'auto',
                flexShrink: 0,
              }}
            >
              <HealthPanel />
            </div>
          </>
        )}

        {!showSidebar && (
          <button
            onClick={toggleSidebar}
            style={{
              position: 'fixed',
              right: 20,
              bottom: 20,
              width: 52,
              height: 52,
              borderRadius: 16,
              background: '#e94560',
              color: '#fff',
              fontSize: 20,
              boxShadow: '0 4px 20px rgba(233,69,96,0.5)',
              transition: 'all 0.2s ease',
              zIndex: 50,
            }}
          >
            📊
          </button>
        )}
      </div>

      {/* New Project Modal */}
      {showNewProjectModal && (
        <div
          onClick={() => setShowNewProjectModal(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backdropFilter: 'blur(4px)',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: '#16213e',
              padding: 28,
              borderRadius: 16,
              width: 420,
              border: '1px solid #4a4a6a',
            }}
          >
            <h3 style={{ color: '#e4e4f0', marginBottom: 20, fontSize: 20 }}>新建项目</h3>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', color: '#a0a0b8', fontSize: 13, marginBottom: 6 }}>项目名称</label>
              <input
                value={newProjectName}
                onChange={e => setNewProjectName(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: 10,
                  background: '#2d2d44',
                  border: '1px solid #4a4a6a',
                  color: '#e4e4f0',
                  fontSize: 14,
                }}
                placeholder="例如：官网重构"
              />
            </div>
            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', color: '#a0a0b8', fontSize: 13, marginBottom: 6 }}>成员（用逗号分隔）</label>
              <input
                value={newProjectMembers}
                onChange={e => setNewProjectMembers(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: 10,
                  background: '#2d2d44',
                  border: '1px solid #4a4a6a',
                  color: '#e4e4f0',
                  fontSize: 14,
                }}
                placeholder="例如：张小明, 李华, 王芳"
              />
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowNewProjectModal(false)}
                style={{
                  padding: '10px 20px',
                  borderRadius: 12,
                  background: 'transparent',
                  border: '1px solid #4a4a6a',
                  color: '#a0a0b8',
                  fontSize: 14,
                }}
              >
                取消
              </button>
              <button
                onClick={handleCreateProject}
                style={{
                  padding: '10px 24px',
                  borderRadius: 12,
                  background: '#e94560',
                  color: '#fff',
                  fontSize: 14,
                  fontWeight: 600,
                }}
              >
                创建
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Task Modal */}
      {showNewTaskModal && currentProject && (
        <div
          onClick={() => setShowNewTaskModal(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backdropFilter: 'blur(4px)',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: '#16213e',
              padding: 28,
              borderRadius: 16,
              width: 460,
              border: '1px solid #4a4a6a',
            }}
          >
            <h3 style={{ color: '#e4e4f0', marginBottom: 20, fontSize: 20 }}>新建任务</h3>
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', color: '#a0a0b8', fontSize: 13, marginBottom: 6 }}>任务标题</label>
              <input
                value={newTask.title}
                onChange={e => setNewTask({ ...newTask, title: e.target.value })}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: 10,
                  background: '#2d2d44',
                  border: '1px solid #4a4a6a',
                  color: '#e4e4f0',
                  fontSize: 14,
                }}
              />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', color: '#a0a0b8', fontSize: 13, marginBottom: 6 }}>描述</label>
              <textarea
                value={newTask.description}
                onChange={e => setNewTask({ ...newTask, description: e.target.value })}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: 10,
                  background: '#2d2d44',
                  border: '1px solid #4a4a6a',
                  color: '#e4e4f0',
                  fontSize: 14,
                  minHeight: 72,
                  resize: 'vertical',
                }}
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
              <div>
                <label style={{ display: 'block', color: '#a0a0b8', fontSize: 13, marginBottom: 6 }}>负责人</label>
                <select
                  value={newTask.assignee}
                  onChange={e => setNewTask({ ...newTask, assignee: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: 10,
                    background: '#2d2d44',
                    border: '1px solid #4a4a6a',
                    color: '#e4e4f0',
                    fontSize: 14,
                  }}
                >
                  <option value="">请选择</option>
                  {currentProject.members.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', color: '#a0a0b8', fontSize: 13, marginBottom: 6 }}>预计工时（小时）</label>
                <input
                  type="number"
                  min={1}
                  value={newTask.estimatedHours}
                  onChange={e => setNewTask({ ...newTask, estimatedHours: Number(e.target.value) })}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: 10,
                    background: '#2d2d44',
                    border: '1px solid #4a4a6a',
                    color: '#e4e4f0',
                    fontSize: 14,
                  }}
                />
              </div>
            </div>
            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', color: '#a0a0b8', fontSize: 13, marginBottom: 6 }}>截止日期</label>
              <input
                type="date"
                value={newTask.dueDate}
                onChange={e => setNewTask({ ...newTask, dueDate: e.target.value })}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: 10,
                  background: '#2d2d44',
                  border: '1px solid #4a4a6a',
                  color: '#e4e4f0',
                  fontSize: 14,
                }}
              />
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowNewTaskModal(false)}
                style={{
                  padding: '10px 20px',
                  borderRadius: 12,
                  background: 'transparent',
                  border: '1px solid #4a4a6a',
                  color: '#a0a0b8',
                  fontSize: 14,
                }}
              >
                取消
              </button>
              <button
                onClick={handleCreateTask}
                style={{
                  padding: '10px 24px',
                  borderRadius: 12,
                  background: '#e94560',
                  color: '#fff',
                  fontSize: 14,
                  fontWeight: 600,
                }}
              >
                创建
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
