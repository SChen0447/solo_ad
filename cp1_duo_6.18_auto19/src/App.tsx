import React, { useState, useEffect } from 'react';
import SceneList from './components/SceneList';
import ChatWindow from './components/ChatWindow';
import RolePanel from './components/RolePanel';
import './App.css';

type ViewMode = 'scenes' | 'chat' | 'roles';

const App: React.FC = () => {
  const [rolePanelOpen, setRolePanelOpen] = useState(false);
  const [mobileView, setMobileView] = useState<ViewMode>('chat');
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);

  useEffect(() => {
    const checkScreenSize = () => {
      const width = window.innerWidth;
      setIsMobile(width < 768);
      setIsTablet(width >= 768 && width < 1024);
    };
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  const toggleRolePanel = () => {
    setRolePanelOpen(!rolePanelOpen);
  };

  if (isMobile) {
    return (
      <div className="app mobile">
        <div className="mobile-tabs">
          <button
            className={`tab ${mobileView === 'scenes' ? 'active' : ''}`}
            onClick={() => setMobileView('scenes')}
          >
            场景
          </button>
          <button
            className={`tab ${mobileView === 'chat' ? 'active' : ''}`}
            onClick={() => setMobileView('chat')}
          >
            对话
          </button>
          <button
            className={`tab ${mobileView === 'roles' ? 'active' : ''}`}
            onClick={() => setMobileView('roles')}
          >
            角色
          </button>
        </div>
        <div className="mobile-content">
          {mobileView === 'scenes' && <SceneList />}
          {mobileView === 'chat' && <ChatWindow />}
          {mobileView === 'roles' && <RolePanel />}
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <SceneList />
      <div className="main-content">
        <ChatWindow />
        {isTablet && (
          <button className="role-toggle-btn" onClick={toggleRolePanel}>
            {rolePanelOpen ? '→' : '←'}
          </button>
        )}
      </div>
      <div className={`role-panel-wrapper ${rolePanelOpen || !isTablet ? 'visible' : ''}`}>
        <RolePanel />
      </div>
    </div>
  );
};

export default App;
