import React, { useEffect, useState, useCallback } from 'react';
import { useAcousticStore } from './store';
import { getPresetConfig, PresetType } from './simulation/roomModel';
import CanvasView from './components/CanvasView';
import ControlPanel from './components/ControlPanel';
import Toolbar from './components/Toolbar';

const App: React.FC = () => {
  const {
    currentPreset,
    setRoomFromConfig,
    canvasWidth,
    canvasHeight,
    leftPanelCollapsed,
    rightPanelCollapsed,
    toggleLeftPanel,
    toggleRightPanel,
    isSimulating,
    walls,
    sources,
  } = useAcousticStore();

  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const isNarrow = windowWidth < 1024;

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (currentPreset) {
      const config = getPresetConfig(currentPreset, canvasWidth, canvasHeight);
      setRoomFromConfig(config);
    }
  }, [currentPreset, canvasWidth, canvasHeight]);

  const [leftOpen, setLeftOpen] = useState(false);
  const [rightOpen, setRightOpen] = useState(false);

  const handleLeftToggle = useCallback(() => {
    if (isNarrow) {
      setLeftOpen((v) => !v);
    } else {
      toggleLeftPanel();
    }
  }, [isNarrow, toggleLeftPanel]);

  const handleRightToggle = useCallback(() => {
    if (isNarrow) {
      setRightOpen((v) => !v);
    } else {
      toggleRightPanel();
    }
  }, [isNarrow, toggleRightPanel]);

  return (
    <div style={styles.root}>
      <nav style={styles.navbar}>
        <div style={styles.navTitle}>
          <span style={styles.navIcon}>🌊</span>
          <span>声波传播与反射路径模拟器</span>
        </div>
        <div style={styles.navInfo}>
          {isSimulating && <span style={styles.simBadge}>模拟中</span>}
          {walls.length > 0 && (
            <span style={styles.navStat}>墙壁: {walls.length}</span>
          )}
          {sources.length > 0 && (
            <span style={styles.navStat}>声源: {sources.length}</span>
          )}
        </div>
      </nav>

      <div style={styles.main}>
        {isNarrow && (
          <>
            <button style={styles.floatingBtnLeft} onClick={handleLeftToggle}>
              ⚙️
            </button>
            <button style={styles.floatingBtnRight} onClick={handleRightToggle}>
              🛠️
            </button>
          </>
        )}

        {isNarrow && leftOpen && (
          <div style={styles.overlay} onClick={() => setLeftOpen(false)}>
            <div
              style={styles.floatPanelLeft}
              onClick={(e) => e.stopPropagation()}
            >
              <ControlPanel />
            </div>
          </div>
        )}

        {isNarrow && rightOpen && (
          <div style={styles.overlay} onClick={() => setRightOpen(false)}>
            <div
              style={styles.floatPanelRight}
              onClick={(e) => e.stopPropagation()}
            >
              <Toolbar />
            </div>
          </div>
        )}

        {!isNarrow && !leftPanelCollapsed && (
          <div style={styles.leftPanel}>
            <ControlPanel />
          </div>
        )}

        {!isNarrow && leftPanelCollapsed && (
          <button
            style={{ ...styles.collapseBtn, left: 8 }}
            onClick={handleLeftToggle}
          >
            ⚙️
          </button>
        )}

        <div style={styles.canvasContainer}>
          <CanvasView />
        </div>

        {!isNarrow && !rightPanelCollapsed && (
          <div style={styles.rightPanel}>
            <Toolbar />
          </div>
        )}

        {!isNarrow && rightPanelCollapsed && (
          <button
            style={{ ...styles.collapseBtn, right: 8 }}
            onClick={handleRightToggle}
          >
            🛠️
          </button>
        )}
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  root: {
    width: '100%',
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
    background: 'radial-gradient(ellipse at center, #1a1a2e 0%, #16213e 100%)',
    overflow: 'hidden',
  },
  navbar: {
    height: '48px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 20px',
    background: 'rgba(22, 33, 62, 0.6)',
    backdropFilter: 'blur(8px)',
    borderBottom: '1px solid rgba(0,188,212,0.15)',
    zIndex: 100,
    flexShrink: 0,
  },
  navTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '15px',
    fontWeight: 600,
    color: '#e0e0e0',
  },
  navIcon: {
    fontSize: '20px',
  },
  navInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  simBadge: {
    padding: '3px 10px',
    borderRadius: '12px',
    background: 'rgba(0,188,212,0.2)',
    color: '#00e5ff',
    fontSize: '11px',
    fontWeight: 600,
    animation: 'pulse 1.5s infinite',
  },
  navStat: {
    fontSize: '11px',
    color: '#888',
  },
  main: {
    flex: 1,
    display: 'flex',
    position: 'relative',
    overflow: 'hidden',
  },
  leftPanel: {
    width: '240px',
    minWidth: '240px',
    padding: '12px 8px 12px 12px',
    overflow: 'hidden',
  },
  rightPanel: {
    width: '180px',
    minWidth: '180px',
    padding: '12px 12px 12px 8px',
    overflow: 'hidden',
  },
  canvasContainer: {
    flex: 1,
    padding: '12px',
    overflow: 'hidden',
    minWidth: 0,
  },
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.5)',
    zIndex: 200,
    display: 'flex',
  },
  floatPanelLeft: {
    width: '280px',
    height: '100%',
    padding: '12px',
    animation: 'slideInLeft 0.3s ease',
  },
  floatPanelRight: {
    width: '220px',
    height: '100%',
    padding: '12px',
    marginLeft: 'auto',
    animation: 'slideInRight 0.3s ease',
  },
  floatingBtnLeft: {
    position: 'fixed',
    top: '60px',
    left: '12px',
    width: '40px',
    height: '40px',
    borderRadius: '12px',
    border: '1px solid rgba(0,188,212,0.3)',
    background: 'rgba(22,33,62,0.8)',
    backdropFilter: 'blur(8px)',
    color: '#00bcd4',
    fontSize: '18px',
    cursor: 'pointer',
    zIndex: 150,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  floatingBtnRight: {
    position: 'fixed',
    top: '60px',
    right: '12px',
    width: '40px',
    height: '40px',
    borderRadius: '12px',
    border: '1px solid rgba(0,188,212,0.3)',
    background: 'rgba(22,33,62,0.8)',
    backdropFilter: 'blur(8px)',
    color: '#00bcd4',
    fontSize: '18px',
    cursor: 'pointer',
    zIndex: 150,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  collapseBtn: {
    position: 'absolute',
    top: '12px',
    width: '32px',
    height: '32px',
    borderRadius: '8px',
    border: '1px solid rgba(0,188,212,0.3)',
    background: 'rgba(22,33,62,0.8)',
    color: '#00bcd4',
    fontSize: '14px',
    cursor: 'pointer',
    zIndex: 10,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
};

const keyframesStyle = document.createElement('style');
keyframesStyle.textContent = `
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }
  @keyframes slideInLeft {
    from { transform: translateX(-100%); }
    to { transform: translateX(0); }
  }
  @keyframes slideInRight {
    from { transform: translateX(100%); }
    to { transform: translateX(0); }
  }
`;
if (!document.querySelector('[data-acoustic-keyframes]')) {
  keyframesStyle.setAttribute('data-acoustic-keyframes', 'true');
  document.head.appendChild(keyframesStyle);
}

export default App;
