import React, { useEffect, useState, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import { useProjectStore } from './store';
import SequencerPanel from './SequencerPanel';
import MixerPanel from './MixerPanel';
import CollaborationManager from './CollaborationManager';
import { THEME, CollaboratorInfo, EditOperation } from './types';

const collabManager = new CollaborationManager();

const App: React.FC = () => {
  const {
    project,
    navCollapsed,
    toggleNavCollapsed,
    createProject,
    currentUserId,
    setCurrentUserId,
    addActiveUser,
    removeActiveUser,
    applyRemoteOperation,
  } = useProjectStore();

  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [projectName, setProjectName] = useState('');
  const [showNewProject, setShowNewProject] = useState(false);
  const [collabLink, setCollabLink] = useState('');
  const [showInvite, setShowInvite] = useState(false);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const userId = collabManager.getUserId();
    setCurrentUserId(userId);
    if (!project) {
      setShowNewProject(true);
    }
  }, []);

  useEffect(() => {
    if (!project) return;
    collabManager.connect(project.id);

    collabManager.onRemoteOperation((operation: EditOperation, user: CollaboratorInfo) => {
      applyRemoteOperation(operation, user);
    });

    collabManager.onUserJoined((user: CollaboratorInfo) => {
      addActiveUser(user);
    });

    collabManager.onUserLeft((userId: string) => {
      removeActiveUser(userId);
    });

    return () => {
      collabManager.disconnect();
    };
  }, [project?.id]);

  const isMobile = windowWidth < 600;
  const isTablet = windowWidth < 900;
  const effectiveNavCollapsed = navCollapsed || isMobile;
  const navWidth = effectiveNavCollapsed ? 48 : 200;

  const handleCreateProject = useCallback(() => {
    if (!projectName.trim()) return;
    const userId = collabManager.getUserId();
    createProject(projectName.trim(), userId);
    setShowNewProject(false);
    setProjectName('');
  }, [projectName, createProject]);

  const handleInvite = useCallback(() => {
    if (!project) return;
    const link = `${window.location.origin}?join=${project.id}`;
    setCollabLink(link);
    setShowInvite(true);
    navigator.clipboard?.writeText(link);
  }, [project]);

  if (showNewProject && !project) {
    return (
      <div style={{
        width: '100vw',
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: THEME.bg,
      }}>
        <div style={{
          background: THEME.componentBg,
          border: `1px solid ${THEME.border}`,
          borderRadius: 12,
          padding: 32,
          width: 360,
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}>
          <h2 style={{ color: '#fff', fontSize: 20, margin: 0, textAlign: 'center' }}>🎵 Music Collab Studio</h2>
          <p style={{ color: '#888', fontSize: 13, margin: 0, textAlign: 'center' }}>在线协作音乐制作平台</p>
          <input
            autoFocus
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreateProject()}
            placeholder="输入项目名称..."
            style={{
              background: '#0d1b2a',
              border: `1px solid ${THEME.border}`,
              borderRadius: 6,
              padding: '10px 14px',
              color: '#fff',
              fontSize: 14,
              outline: 'none',
            }}
          />
          <button
            className="btn"
            onClick={handleCreateProject}
            style={{
              background: THEME.highlight,
              color: '#fff',
              border: 'none',
              padding: '10px',
              borderRadius: 6,
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            创建项目
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      display: 'flex',
      flexDirection: isTablet ? 'column' : 'row',
      overflow: 'hidden',
      background: THEME.bg,
    }}>
      <div style={{
        width: isTablet ? '100%' : navWidth,
        height: isTablet ? (effectiveNavCollapsed ? 48 : 200) : '100%',
        background: THEME.componentBg,
        borderRight: isTablet ? 'none' : `1px solid ${THEME.border}`,
        borderBottom: isTablet ? `1px solid ${THEME.border}` : 'none',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        transition: 'width 0.3s ease',
        flexShrink: 0,
      }}>
        <div style={{
          padding: effectiveNavCollapsed ? '8px 4px' : '10px 12px',
          display: 'flex',
          flexDirection: effectiveNavCollapsed ? 'column' : 'row',
          alignItems: 'center',
          gap: 4,
          borderBottom: `1px solid ${THEME.border}`,
        }}>
          {!effectiveNavCollapsed && (
            <span style={{ color: '#ccc', fontSize: 13, fontWeight: 600, flex: 1 }}>
              {project?.name || 'Projects'}
            </span>
          )}
          <button
            className="btn"
            onClick={toggleNavCollapsed}
            style={{
              background: 'none',
              border: 'none',
              color: '#888',
              cursor: 'pointer',
              fontSize: 16,
              padding: 4,
            }}
            title={effectiveNavCollapsed ? 'Expand' : 'Collapse'}
          >
            {effectiveNavCollapsed ? '☰' : '◀'}
          </button>
        </div>

        {!effectiveNavCollapsed && project && (
          <div style={{ padding: '8px 12px', flex: 1, overflow: 'auto' }}>
            <div style={{ fontSize: 11, color: '#888', marginBottom: 6 }}>BPM: {project.bpm}</div>
            <div style={{ fontSize: 11, color: '#888', marginBottom: 6 }}>
              Tracks: {project.tracks.length}
            </div>
            <div style={{ fontSize: 11, color: '#888', marginBottom: 12 }}>
              Collaborators: {useProjectStore.getState().activeUsers.length + 1}
            </div>
            <button
              className="btn"
              onClick={handleInvite}
              style={{
                width: '100%',
                background: THEME.border,
                color: '#7ec8e3',
                border: 'none',
                padding: '6px 8px',
                borderRadius: 4,
                cursor: 'pointer',
                fontSize: 11,
              }}
            >
              🔗 Invite
            </button>
            {showInvite && (
              <div style={{
                marginTop: 6,
                padding: '4px 6px',
                background: '#0d1b2a',
                borderRadius: 3,
                fontSize: 9,
                color: '#7ec8e3',
                wordBreak: 'break-all',
              }}>
                Link copied!
              </div>
            )}
          </div>
        )}

        {effectiveNavCollapsed && project && (
          <div style={{ padding: '8px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 28,
              height: 28,
              borderRadius: '50%',
              background: THEME.highlight,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 12,
              color: '#fff',
              fontWeight: 700,
            }}>
              {project.name.charAt(0).toUpperCase()}
            </div>
          </div>
        )}
      </div>

      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: isTablet ? 'column' : 'row',
        overflow: 'hidden',
      }}>
        <SequencerPanel />
        <div style={isTablet ? {
          width: '100%',
          height: 200,
          borderTop: `1px solid ${THEME.border}`,
        } : {}}>
          <MixerPanel />
        </div>
      </div>
    </div>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

const globalStyle = document.createElement('style');
globalStyle.textContent = `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { background: ${THEME.bg}; color: #e0e0e0; font-family: 'Segoe UI', system-ui, sans-serif; overflow: hidden; }
  #root { width: 100vw; height: 100vh; }

  .btn:hover {
    filter: brightness(1.1);
    box-shadow: 0 2px 8px rgba(0,0,0,0.3);
  }
  .btn:active {
    transform: scale(0.95);
  }

  input[type="range"] {
    -webkit-appearance: none;
    appearance: none;
    height: 4px;
    background: #333;
    border-radius: 2px;
    outline: none;
  }
  input[type="range"]::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: #e94560;
    cursor: pointer;
  }

  ::-webkit-scrollbar { width: 6px; height: 6px; }
  ::-webkit-scrollbar-track { background: #0d1b2a; }
  ::-webkit-scrollbar-thumb { background: #333; border-radius: 3px; }
  ::-webkit-scrollbar-thumb:hover { background: #555; }
`;
document.head.appendChild(globalStyle);
