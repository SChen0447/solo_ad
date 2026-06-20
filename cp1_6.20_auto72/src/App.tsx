import React, { useState, useEffect, useCallback } from 'react';
import { Project, Task, Dependency, User, Notification as NotificationType } from './frontend/types';
import { ProjectBoard } from './frontend/components/ProjectBoard';
import { GanttChart } from './frontend/components/GanttChart';
import { Dashboard } from './frontend/components/Dashboard';
import { ProjectSidebar } from './frontend/components/ProjectSidebar';
import { NotificationCenter } from './frontend/components/NotificationCenter';
import { apiService } from './frontend/services/apiService';
import { websocketService } from './frontend/services/websocketService';

type TabType = 'board' | 'gantt' | 'dashboard';

const App: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProjectId, setCurrentProjectId] = useState<string>('');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [dependencies, setDependencies] = useState<Dependency[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>('board');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [filterUserId, setFilterUserId] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);

  useEffect(() => {
    const checkResponsive = () => {
      const w = window.innerWidth;
      setIsMobile(w <= 480);
      setIsTablet(w <= 768);
    };
    checkResponsive();
    window.addEventListener('resize', checkResponsive);
    return () => window.removeEventListener('resize', checkResponsive);
  }, []);

  useEffect(() => {
    websocketService.connect();
    loadInitialData();
    return () => websocketService.disconnect();
  }, []);

  useEffect(() => {
    if (currentProjectId) {
      loadProjectData(currentProjectId);
    }
  }, [currentProjectId]);

  const loadInitialData = async () => {
    try {
      const [fetchedProjects, users] = await Promise.all([
        apiService.fetchProjects(),
        apiService.fetchUsers(),
      ]);
      setProjects(fetchedProjects);
      if (users.length > 0) {
        setCurrentUser(users[0]);
      }
      if (fetchedProjects.length > 0) {
        setCurrentProjectId(fetchedProjects[0].id);
      }
    } catch (error) {
      console.error('Failed to load initial data:', error);
    }
  };

  const loadProjectData = async (projectId: string) => {
    try {
      const [fetchedTasks, fetchedDeps, updatedProjects] = await Promise.all([
        apiService.fetchTasks(projectId),
        apiService.fetchDependencies(projectId),
        apiService.fetchProjects(),
      ]);
      setTasks(fetchedTasks);
      setDependencies(fetchedDeps);
      setProjects(updatedProjects);
    } catch (error) {
      console.error('Failed to load project data:', error);
    }
  };

  const handleTasksChange = useCallback((newTasks: Task[]) => {
    setTasks(newTasks);
  }, []);

  const handleDependenciesChange = useCallback((newDeps: Dependency[]) => {
    setDependencies(newDeps);
  }, []);

  const handleProjectSelect = useCallback((projectId: string) => {
    setCurrentProjectId(projectId);
    setFilterUserId(null);
  }, []);

  const handleNotificationClick = useCallback((notification: NotificationType) => {
    if (notification.projectId) {
      setCurrentProjectId(notification.projectId);
      setActiveTab('board');
    }
  }, []);

  const currentProject = projects.find((p) => p.id === currentProjectId);
  const tabs: { key: TabType; label: string; icon: string }[] = [
    { key: 'board', label: '看板', icon: '📋' },
    { key: 'gantt', label: '甘特图', icon: '📊' },
    { key: 'dashboard', label: '仪表盘', icon: '📈' },
  ];

  return (
    <div
      style={{
        display: 'flex',
        height: '100vh',
        backgroundColor: '#1a1a2e',
        fontFamily: 'Inter, sans-serif',
        overflow: 'hidden',
      }}
    >
      <ProjectSidebar
        projects={projects}
        currentProjectId={currentProjectId}
        collapsed={sidebarCollapsed}
        onProjectSelect={handleProjectSelect}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        currentUser={currentUser || undefined}
      />

      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          minWidth: 0,
        }}
      >
        <header
          style={{
            height: '60px',
            backgroundColor: '#16213e',
            borderBottom: '1px solid rgba(255,255,255,0.05)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 24px',
            flexShrink: 0,
          }}
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              minWidth: 0,
              marginRight: '16px',
            }}
          >
            <h2
              style={{
                margin: 0,
                color: '#e0e0e0',
                fontSize: isMobile ? '14px' : '16px',
                fontWeight: 600,
                fontFamily: 'Inter, sans-serif',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {currentProject?.name || '选择项目'}
            </h2>
            {currentProject && !isMobile && (
              <span
                style={{
                  color: '#8892b0',
                  fontSize: '11px',
                  fontFamily: 'Inter, sans-serif',
                  marginTop: '2px',
                }}
              >
                {currentProject.description?.slice(0, 50) || ''}
              </span>
            )}
          </div>

          <nav
            style={{
              display: 'flex',
              alignItems: 'center',
              height: '100%',
              gap: isMobile ? '4px' : '8px',
            }}
          >
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                style={{
                  position: 'relative',
                  height: '100%',
                  padding: isMobile ? '0 8px' : '0 20px',
                  border: 'none',
                  backgroundColor: 'transparent',
                  color: activeTab === tab.key ? '#e0e0e0' : '#8892b0',
                  cursor: 'pointer',
                  fontSize: isMobile ? '12px' : '13px',
                  fontFamily: 'Inter, sans-serif',
                  fontWeight: activeTab === tab.key ? 600 : 400,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'color 0.25s ease',
                }}
                onMouseEnter={(e) => {
                  if (activeTab !== tab.key) {
                    (e.currentTarget as HTMLButtonElement).style.color = '#e0e0e0';
                  }
                }}
                onMouseLeave={(e) => {
                  if (activeTab !== tab.key) {
                    (e.currentTarget as HTMLButtonElement).style.color = '#8892b0';
                  }
                }}
              >
                {!isMobile && tab.icon}
                {tab.label}
                {activeTab === tab.key && (
                  <span
                    style={{
                      position: 'absolute',
                      bottom: 0,
                      left: isMobile ? '8px' : '20px',
                      right: isMobile ? '8px' : '20px',
                      height: '3px',
                      backgroundColor: '#e94560',
                      borderRadius: '3px 3px 0 0',
                      transition: 'all 0.3s ease',
                    }}
                  />
                )}
              </button>
            ))}
          </nav>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: '16px' }}>
            <NotificationCenter onNotificationClick={handleNotificationClick} />
          </div>
        </header>

        <main
          style={{
            flex: 1,
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          <div
            style={{
              position: 'absolute',
              inset: 0,
              transition: 'opacity 0.3s ease, transform 0.3s ease',
            }}
          >
            {activeTab === 'board' && currentProjectId && (
              <div
                style={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: isTablet ? 'column' : 'row',
                }}
              >
                <ProjectBoard
                  projectId={currentProjectId}
                  tasks={tasks}
                  onTasksChange={handleTasksChange}
                  filterUserId={filterUserId}
                />
              </div>
            )}
            {activeTab === 'gantt' && currentProjectId && (
              <GanttChart
                projectId={currentProjectId}
                tasks={tasks}
                dependencies={dependencies}
                onTasksChange={handleTasksChange}
                onDependenciesChange={handleDependenciesChange}
              />
            )}
            {activeTab === 'dashboard' && currentProjectId && (
              <Dashboard
                projectId={currentProjectId}
                onMemberFilter={setFilterUserId}
                filterUserId={filterUserId}
              />
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default App;
