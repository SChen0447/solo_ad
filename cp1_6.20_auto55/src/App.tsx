import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { UIComponent, Project, OnlineUser, ComponentTemplate } from './types';
import { COMPONENT_TEMPLATES } from './types';
import { projectApi, componentApi, versionApi, getSocket, downloadBlob } from './api';
import { ComponentPanel } from './components/module/ComponentPanel';
import { CanvasArea } from './components/module/CanvasArea';
import { PropertyEditor } from './components/module/PropertyEditor';
import { VersionHistory } from './components/module/VersionHistory';

const USER_COLORS = ['#f38ba8', '#a6e3a1', '#f9e2af', '#89b4fa', '#fab387', '#cba6f7', '#94e2d5'];

function generateUserId(): string {
  return 'user_' + Math.random().toString(36).substr(2, 9);
}

function generateUsername(): string {
  const names = ['设计师', '开发者', '产品', '测试', '美术'];
  return names[Math.floor(Math.random() * names.length)] + Math.floor(Math.random() * 1000);
}

const App: React.FC = () => {
  const [project, setProject] = useState<Project | null>(null);
  const [components, setComponents] = useState<UIComponent[]>([]);
  const [selectedComponentId, setSelectedComponentId] = useState<string | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [currentUserId] = useState<string>(generateUserId());
  const [currentUsername] = useState<string>(generateUsername());
  const [userColor] = useState<string>(USER_COLORS[Math.floor(Math.random() * USER_COLORS.length)]);
  const [leftPanelCollapsed, setLeftPanelCollapsed] = useState(false);
  const [rightPanelCollapsed, setRightPanelCollapsed] = useState(false);
  const [rightTab, setRightTab] = useState<'properties' | 'versions'>('properties');
  const [showConflictBanner, setShowConflictBanner] = useState(false);
  const [showExportProgress, setShowExportProgress] = useState(false);
  const [showVersionConfirm, setShowVersionConfirm] = useState(false);
  const [pendingRestoreId, setPendingRestoreId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const socketRef = useRef<ReturnType<typeof getSocket> | null>(null);
  const conflictTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const selectedComponent = components.find((c) => c.id === selectedComponentId) || null;

  const createRipple = (e: React.MouseEvent<HTMLButtonElement>) => {
    const btn = e.currentTarget;
    const circle = document.createElement('span');
    const diameter = Math.max(btn.clientWidth, btn.clientHeight);
    const radius = diameter / 2;
    circle.style.width = circle.style.height = `${diameter}px`;
    circle.style.left = `${e.clientX - btn.getBoundingClientRect().left - radius}px`;
    circle.style.top = `${e.clientY - btn.getBoundingClientRect().top - radius}px`;
    circle.classList.add('btn-ripple');
    const existingRipple = btn.getElementsByClassName('btn-ripple')[0];
    if (existingRipple) existingRipple.remove();
    btn.appendChild(circle);
    setTimeout(() => circle.remove(), 600);
  };

  const showConflict = useCallback(() => {
    setShowConflictBanner(true);
    if (conflictTimeoutRef.current) clearTimeout(conflictTimeoutRef.current);
    conflictTimeoutRef.current = setTimeout(() => setShowConflictBanner(false), 5000);
  }, []);

  const loadProjectData = useCallback(async (projectId: string) => {
    try {
      const data = await projectApi.get(projectId);
      setProject(data.project);
      setComponents(data.components);
    } catch (err) {
      console.error('加载项目数据失败:', err);
    }
  }, []);

  useEffect(() => {
    const initProject = async () => {
      setIsLoading(true);
      try {
        const savedProjectId = localStorage.getItem('current_project_id');
        let projectData;
        if (savedProjectId) {
          try {
            projectData = await projectApi.get(savedProjectId);
          } catch {
            projectData = await projectApi.create();
            localStorage.setItem('current_project_id', projectData.id);
            projectData = await projectApi.get(projectData.id);
          }
        } else {
          const newProject = await projectApi.create();
          localStorage.setItem('current_project_id', newProject.id);
          projectData = await projectApi.get(newProject.id);
        }
        setProject(projectData.project);
        setComponents(projectData.components);
      } catch (err) {
        console.error('初始化项目失败:', err);
      } finally {
        setIsLoading(false);
      }
    };
    initProject();
  }, []);

  useEffect(() => {
    if (!project || !project.id) return;
    const socket = getSocket();
    socketRef.current = socket;

    socket.emit('join:project', {
      projectId: project.id,
      userId: currentUserId,
      username: currentUsername,
    });

    socket.on('user:joined', (data: { userId: string; username: string }) => {
      setOnlineUsers((prev) => {
        if (prev.find((u) => u.userId === data.userId)) return prev;
        return [
          ...prev,
          {
            userId: data.userId,
            username: data.username,
            x: 0,
            y: 0,
            color: USER_COLORS[prev.length % USER_COLORS.length],
          },
        ];
      });
    });

    socket.on('user:left', (data: { userId: string }) => {
      setOnlineUsers((prev) => prev.filter((u) => u.userId !== data.userId));
    });

    socket.on('cursor:update', (data: { userId: string; x: number; y: number }) => {
      setOnlineUsers((prev) =>
        prev.map((u) => (u.userId === data.userId ? { ...u, x: data.x, y: data.y } : u))
      );
    });

    socket.on('component:added', (data: { component: UIComponent }) => {
      setComponents((prev) => {
        if (prev.find((c) => c.id === data.component.id)) return prev;
        showConflict();
        return [...prev, data.component];
      });
    });

    socket.on('component:updated', (data: { component: UIComponent }) => {
      setComponents((prev) => {
        const exists = prev.find((c) => c.id === data.component.id);
        if (exists) {
          showConflict();
        }
        return prev.map((c) => (c.id === data.component.id ? data.component : c));
      });
    });

    socket.on('component:deleted', (data: { componentId: string }) => {
      setComponents((prev) => prev.filter((c) => c.id !== data.componentId));
      if (selectedComponentId === data.componentId) {
        setSelectedComponentId(null);
      }
      showConflict();
    });

    socket.on('version:restored', () => {
      loadProjectData(project.id);
      showConflict();
    });

    return () => {
      socket.emit('leave:project', {
        projectId: project.id,
        userId: currentUserId,
        username: currentUsername,
      });
      socket.off('user:joined');
      socket.off('user:left');
      socket.off('cursor:update');
      socket.off('component:added');
      socket.off('component:updated');
      socket.off('component:deleted');
      socket.off('version:restored');
    };
  }, [project?.id, currentUserId, currentUsername, loadProjectData, showConflict]);

  const handleCursorMove = useCallback(
    (x: number, y: number) => {
      if (socketRef.current && project) {
        socketRef.current.emit('cursor:move', {
          projectId: project.id,
          userId: currentUserId,
          x,
          y,
        });
      }
    },
    [project, currentUserId]
  );

  const handleDragStartComponent = (id: string, e: React.DragEvent) => {
    e.dataTransfer.setData('application/component-id', id);
  };

  const handleDragStartTemplate = (template: ComponentTemplate, e: React.DragEvent) => {
    e.dataTransfer.setData('application/template', JSON.stringify(template));
  };

  const handleAddComponent = async (template: ComponentTemplate) => {
    if (!project) return;
    try {
      const newComp = await projectApi.addComponent(project.id, {
        type: template.type,
        name: template.name,
        x: 200 + Math.random() * 100,
        y: 200 + Math.random() * 100,
        width: template.defaultWidth,
        height: template.defaultHeight,
        styles: template.defaultStyles,
        props: template.defaultProps,
        author: currentUsername,
      });
      setComponents((prev) => [...prev, newComp]);
      setSelectedComponentId(newComp.id);
    } catch (err) {
      console.error('添加组件失败:', err);
    }
  };

  const handleAddFromTemplate = async (template: ComponentTemplate, x: number, y: number) => {
    if (!project) return;
    try {
      const newComp = await projectApi.addComponent(project.id, {
        type: template.type,
        name: template.name,
        x,
        y,
        width: template.defaultWidth,
        height: template.defaultHeight,
        styles: template.defaultStyles,
        props: template.defaultProps,
        author: currentUsername,
      });
      setComponents((prev) => [...prev, newComp]);
      setSelectedComponentId(newComp.id);
    } catch (err) {
      console.error('添加组件失败:', err);
    }
  };

  const handleUpdateComponent = async (id: string, updates: Partial<UIComponent>) => {
    setComponents((prev) => prev.map((c) => (c.id === id ? { ...c, ...updates } : c)));
    try {
      await componentApi.update(id, { ...updates, author: currentUsername });
    } catch (err) {
      console.error('更新组件失败:', err);
    }
  };

  const handleDeleteComponent = async () => {
    if (!selectedComponentId) return;
    try {
      await componentApi.delete(selectedComponentId);
      setComponents((prev) => prev.filter((c) => c.id !== selectedComponentId));
      setSelectedComponentId(null);
    } catch (err) {
      console.error('删除组件失败:', err);
    }
  };

  const handleExport = async () => {
    if (!project) return;
    setShowExportProgress(true);
    try {
      const blob = await projectApi.export(project.id);
      downloadBlob(blob, `${project.name}_components.zip`);
    } catch (err) {
      console.error('导出失败:', err);
    } finally {
      setTimeout(() => setShowExportProgress(false), 1500);
    }
  };

  const handleRestoreVersion = async (versionId: string) => {
    try {
      await versionApi.restore(versionId);
      if (project) {
        await loadProjectData(project.id);
      }
    } catch (err) {
      console.error('回滚版本失败:', err);
    }
  };

  if (isLoading) {
    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--bg-primary)',
          color: 'var(--text-primary)',
          fontSize: 14,
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          <div
            style={{
              width: 32,
              height: 32,
              border: '3px solid var(--bg-tertiary)',
              borderTopColor: 'var(--accent)',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
            }}
          />
          <div>正在加载项目...</div>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="toolbar">
        <div className="toolbar-left">
          <span className="toolbar-title">🎨 UI组件库协作设计平台</span>
          <span className="toolbar-project-name">{project?.name || '未命名项目'}</span>
          <div style={{ display: 'flex', gap: 6, marginLeft: 8 }}>
            {onlineUsers.slice(0, 4).map((user) => (
              <div
                key={user.userId}
                className="user-avatar"
                style={{ background: user.color }}
                title={user.username}
              >
                {user.username.charAt(0)}
              </div>
            ))}
            {onlineUsers.length > 4 && (
              <div
                className="user-avatar"
                style={{ background: 'var(--bg-tertiary)' }}
                title={`还有 ${onlineUsers.length - 4} 人在线`}
              >
                +{onlineUsers.length - 4}
              </div>
            )}
          </div>
        </div>
        <div className="toolbar-right">
          <div className="user-avatar" style={{ background: userColor }} title={currentUsername}>
            {currentUsername.charAt(0)}
          </div>
          <button
            className="btn"
            onClick={(e) => {
              createRipple(e);
              setShowVersionConfirm(true);
              setRightTab('versions');
            }}
          >
            🕐 历史版本
          </button>
          <button
            className="btn"
            onClick={(e) => {
              createRipple(e);
            }}
          >
            💾 保存
          </button>
          <button
            className="btn btn-primary"
            onClick={(e) => {
              createRipple(e);
              handleExport();
            }}
          >
            📦 导出代码
          </button>
        </div>
      </header>

      {showConflictBanner && (
        <div className="conflict-banner">
          ⚠️ 检测到其他用户的编辑操作，已自动同步最新内容
        </div>
      )}

      <div className="main-content">
        <ComponentPanel
          components={components}
          selectedComponentId={selectedComponentId}
          onSelectComponent={setSelectedComponentId}
          onAddComponent={handleAddComponent}
          onDragStartComponent={handleDragStartComponent}
          onDragStartTemplate={handleDragStartTemplate}
          isCollapsed={leftPanelCollapsed}
          onToggleCollapse={() => setLeftPanelCollapsed(!leftPanelCollapsed)}
        />

        <CanvasArea
          components={components}
          selectedComponentId={selectedComponentId}
          onSelectComponent={setSelectedComponentId}
          onUpdateComponent={handleUpdateComponent}
          onAddFromTemplate={handleAddFromTemplate}
          onlineUsers={onlineUsers}
          currentUserId={currentUserId}
          onCursorMove={handleCursorMove}
        />

        <aside className={`panel panel-right ${rightPanelCollapsed ? '' : ''}`}>
          <div className="panel-header">
            <div className="tabs" style={{ borderBottom: 'none', marginBottom: 0 }}>
              <button
                className={`tab ${rightTab === 'properties' ? 'active' : ''}`}
                onClick={() => setRightTab('properties')}
              >
                属性
              </button>
              <button
                className={`tab ${rightTab === 'versions' ? 'active' : ''}`}
                onClick={() => setRightTab('versions')}
              >
                版本
              </button>
            </div>
          </div>

          <div className="panel-content">
            {rightTab === 'properties' ? (
              <PropertyEditor
                component={selectedComponent}
                onUpdate={(updates) => selectedComponentId && handleUpdateComponent(selectedComponentId, updates)}
                onDelete={handleDeleteComponent}
                isCollapsed={rightPanelCollapsed}
                onToggleCollapse={() => setRightPanelCollapsed(!rightPanelCollapsed)}
              />
            ) : (
              project && (
                <VersionHistory
                  projectId={project.id}
                  onRestore={handleRestoreVersion}
                  showConfirmModal={showVersionConfirm}
                  setShowConfirmModal={setShowVersionConfirm}
                  pendingRestoreId={pendingRestoreId}
                  setPendingRestoreId={setPendingRestoreId}
                />
              )
            )}
          </div>
        </aside>

        {rightPanelCollapsed && (
          <button
            className="panel-toggle-btn right"
            onClick={() => setRightPanelCollapsed(false)}
            title="展开面板"
          >
            ⚙
          </button>
        )}
        {leftPanelCollapsed && (
          <button
            className="panel-toggle-btn left"
            onClick={() => setLeftPanelCollapsed(false)}
            title="展开面板"
          >
            ⊞
          </button>
        )}
      </div>

      {showExportProgress && (
        <div className="export-progress-overlay">
          <div className="export-progress-text">正在生成组件代码...</div>
          <div className="export-progress-bar">
            <div className="export-progress-fill" />
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
