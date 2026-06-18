import React, { useState, useEffect } from 'react';
import { useTaskStore } from './store/taskStore';
import KanbanBoard from './components/KanbanBoard';
import TaskDetail from './components/TaskDetail';

function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (diff < 60000) return '刚刚';
  if (minutes < 60) return `${minutes}分钟前`;
  if (hours < 24) return `${hours}小时前`;
  return `${days}天前`;
}

const App: React.FC = () => {
  const projects = useTaskStore(state => state.projects);
  const selectedProjectId = useTaskStore(state => state.selectedProjectId);
  const searchQuery = useTaskStore(state => state.searchQuery);
  const sidebarOpen = useTaskStore(state => state.sidebarOpen);
  const tasks = useTaskStore(state => state.tasks);
  const selectedTask = useTaskStore(state => state.selectedTask);

  const fetchProjects = useTaskStore(state => state.fetchProjects);
  const selectProject = useTaskStore(state => state.selectProject);
  const setSearchQuery = useTaskStore(state => state.setSearchQuery);
  const toggleSidebar = useTaskStore(state => state.toggleSidebar);
  const createProject = useTaskStore(state => state.createProject);
  const initSocket = useTaskStore(state => state.initSocket);
  const disconnectSocket = useTaskStore(state => state.disconnectSocket);
  const getFilteredProjects = useTaskStore(state => state.getFilteredProjects);
  const fetchTasks = useTaskStore(state => state.fetchTasks);

  const [showNewProject, setShowNewProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDesc, setNewProjectDesc] = useState('');

  useEffect(() => {
    initSocket();
    fetchProjects();
    return () => disconnectSocket();
  }, []);

  useEffect(() => {
    if (selectedProjectId) {
      fetchTasks(selectedProjectId);
    }
  }, [selectedProjectId]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        if (sidebarOpen) toggleSidebar();
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [sidebarOpen]);

  const handleCreateProject = () => {
    if (newProjectName.trim()) {
      createProject(newProjectName.trim(), newProjectDesc.trim());
      setNewProjectName('');
      setNewProjectDesc('');
      setShowNewProject(false);
    }
  };

  const filteredProjects = getFilteredProjects();
  const selectedProject = projects.find(p => p.id === selectedProjectId);

  const getProjectTaskCount = (projectId: string) => {
    return tasks.filter(t => t.projectId === projectId).length;
  };

  return (
    <div className="app">
      <aside className={`sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-header">
          <div className="logo">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="M9 9h6v6H9z" />
            </svg>
            <span className="logo-text">任务看板</span>
          </div>
        </div>

        <div className="sidebar-search">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            placeholder="搜索项目..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="sidebar-section">
          <div className="section-header">
            <span>我的项目</span>
            <button className="add-project-btn" onClick={() => setShowNewProject(true)}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </button>
          </div>

          <div className="project-list">
            {filteredProjects.map(project => (
              <div
                key={project.id}
                className={`project-item ${selectedProjectId === project.id ? 'active' : ''}`}
                onClick={() => selectProject(project.id)}
              >
                <div className="project-icon">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                  </svg>
                </div>
                <div className="project-info">
                  <span className="project-name">{project.name}</span>
                  <span className="project-meta">
                    {getProjectTaskCount(project.id)} 个任务 · {formatRelativeTime(project.createdAt)}
                  </span>
                </div>
              </div>
            ))}
            {filteredProjects.length === 0 && (
              <div className="empty-projects">
                {searchQuery ? '未找到匹配的项目' : '暂无项目'}
              </div>
            )}
          </div>
        </div>
      </aside>

      <main className="main-content">
        <header className="top-header">
          <button className="menu-btn" onClick={toggleSidebar}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          <div className="header-info">
            <h1 className="page-title">{selectedProject?.name || '任务看板'}</h1>
            {selectedProject && (
              <p className="page-subtitle">{selectedProject.description}</p>
            )}
          </div>
        </header>

        <KanbanBoard />
      </main>

      {showNewProject && (
        <div className="modal-overlay" onClick={() => setShowNewProject(false)}>
          <div className="new-project-modal" onClick={e => e.stopPropagation()}>
            <h3>创建新项目</h3>
            <div className="form-group">
              <label>项目名称</label>
              <input
                type="text"
                value={newProjectName}
                onChange={e => setNewProjectName(e.target.value)}
                placeholder="输入项目名称"
                autoFocus
              />
            </div>
            <div className="form-group">
              <label>项目描述</label>
              <textarea
                value={newProjectDesc}
                onChange={e => setNewProjectDesc(e.target.value)}
                placeholder="输入项目描述（可选）"
                rows={3}
              />
            </div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowNewProject(false)}>
                取消
              </button>
              <button className="btn btn-primary" onClick={handleCreateProject}>
                创建项目
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedTask && <TaskDetail />}

      <style>{`
        * {
          box-sizing: border-box;
        }
        html, body, #root {
          margin: 0;
          padding: 0;
          height: 100%;
          width: 100%;
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
          color: #1f2937;
          background: #f3f4f6;
        }
        .app {
          display: flex;
          height: 100vh;
          width: 100%;
          overflow: hidden;
        }
        .sidebar {
          background: white;
          border-right: 1px solid #e5e7eb;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          transition: width 0.3s ease;
        }
        .sidebar.open {
          width: 240px;
        }
        .sidebar.closed {
          width: 0;
          border-right: none;
        }
        .sidebar-header {
          padding: 20px 16px;
          border-bottom: 1px solid #f3f4f6;
        }
        .logo {
          display: flex;
          align-items: center;
          gap: 10px;
          color: #4f46e5;
        }
        .logo-text {
          font-size: 1.1rem;
          font-weight: 700;
        }
        .sidebar-search {
          padding: 12px 16px;
          display: flex;
          align-items: center;
          gap: 8px;
          border-bottom: 1px solid #f3f4f6;
        }
        .sidebar-search svg {
          color: #9ca3af;
        }
        .sidebar-search input {
          flex: 1;
          border: none;
          outline: none;
          font-size: 0.85rem;
          font-family: inherit;
          background: transparent;
        }
        .sidebar-search input::placeholder {
          color: #9ca3af;
        }
        .sidebar-section {
          flex: 1;
          overflow-y: auto;
        }
        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 16px 8px;
          font-size: 0.75rem;
          font-weight: 600;
          color: #6b7280;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .add-project-btn {
          width: 24px;
          height: 24px;
          border-radius: 6px;
          border: none;
          background: #f3f4f6;
          color: #6b7280;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
        }
        .add-project-btn:hover {
          background: #4f46e5;
          color: white;
        }
        .project-list {
          padding: 4px 8px;
        }
        .project-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 12px;
          border-radius: 8px;
          cursor: pointer;
          transition: background 0.2s;
          margin-bottom: 2px;
        }
        .project-item:hover {
          background: #f9fafb;
        }
        .project-item.active {
          background: #eef2ff;
        }
        .project-item.active .project-name {
          color: #4f46e5;
          font-weight: 600;
        }
        .project-icon {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          background: #f3f4f6;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #6b7280;
          flex-shrink: 0;
        }
        .project-item.active .project-icon {
          background: #c7d2fe;
          color: #4f46e5;
        }
        .project-info {
          flex: 1;
          min-width: 0;
        }
        .project-name {
          display: block;
          font-size: 0.9rem;
          font-weight: 500;
          color: #1f2937;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .project-meta {
          display: block;
          font-size: 0.75rem;
          color: #9ca3af;
          margin-top: 2px;
        }
        .empty-projects {
          padding: 20px;
          text-align: center;
          color: #9ca3af;
          font-size: 0.85rem;
        }
        .main-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          min-width: 0;
        }
        .top-header {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 16px 24px;
          background: white;
          border-bottom: 1px solid #e5e7eb;
        }
        .menu-btn {
          width: 40px;
          height: 40px;
          border-radius: 8px;
          border: none;
          background: transparent;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #4b5563;
          transition: background 0.2s;
        }
        .menu-btn:hover {
          background: #f3f4f6;
        }
        .header-info {
          flex: 1;
          min-width: 0;
        }
        .page-title {
          margin: 0;
          font-size: 1.25rem;
          font-weight: 700;
          color: #1f2937;
        }
        .page-subtitle {
          margin: 4px 0 0 0;
          font-size: 0.85rem;
          color: #6b7280;
        }
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.4);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 150;
          animation: fadeIn 0.2s ease;
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .new-project-modal {
          background: white;
          border-radius: 16px;
          padding: 28px;
          width: 90%;
          max-width: 420px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
          animation: slideUp 0.3s ease-out;
        }
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .new-project-modal h3 {
          margin: 0 0 20px 0;
          font-size: 1.3rem;
          font-weight: 600;
          color: #1f2937;
        }
        .form-group {
          margin-bottom: 16px;
        }
        .form-group label {
          display: block;
          margin-bottom: 8px;
          font-size: 0.85rem;
          font-weight: 500;
          color: #4b5563;
        }
        .form-group input,
        .form-group textarea {
          width: 100%;
          padding: 10px 14px;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          font-size: 0.9rem;
          font-family: inherit;
          box-sizing: border-box;
          transition: border-color 0.2s;
        }
        .form-group input:focus,
        .form-group textarea:focus {
          outline: none;
          border-color: #4f46e5;
        }
        .modal-actions {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          margin-top: 24px;
        }
        .btn {
          padding: 10px 20px;
          border-radius: 8px;
          border: none;
          cursor: pointer;
          font-size: 0.9rem;
          font-weight: 500;
          transition: all 0.2s;
        }
        .btn-primary {
          background: #4f46e5;
          color: white;
        }
        .btn-primary:hover {
          background: #4338ca;
        }
        .btn-secondary {
          background: #f3f4f6;
          color: #4b5563;
        }
        .btn-secondary:hover {
          background: #e5e7eb;
        }
        @media (max-width: 768px) {
          .sidebar {
            position: fixed;
            left: 0;
            top: 0;
            bottom: 0;
            z-index: 90;
            box-shadow: 2px 0 20px rgba(0, 0, 0, 0.1);
          }
          .top-header {
            padding: 12px 16px;
          }
        }
      `}</style>
    </div>
  );
};

export default App;
