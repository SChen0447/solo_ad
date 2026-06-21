import React, { useState, useCallback } from 'react';
import ScreenCapture from './components/ScreenCapture';
import ComparePanel from './components/ComparePanel';
import CropAnnotate from './components/CropAnnotate';
import { Screenshot, CompareState, CropRegion } from './types';

type ViewMode = 'compare' | 'annotate';

const App: React.FC = () => {
  const [screenshots, setScreenshots] = useState<Screenshot[]>([]);
  const [compareState, setCompareState] = useState<CompareState>({
    topImage: null,
    bottomImage: null,
    mode: 'split-vertical',
    splitPosition: 50,
    scale: 1,
    offsetX: 0,
    offsetY: 0,
  });
  const [viewMode, setViewMode] = useState<ViewMode>('compare');
  const [annotateImage, setAnnotateImage] = useState<string | null>(null);
  const [annotateCropRegion, setAnnotateCropRegion] = useState<CropRegion | null>(null);
  const [draggedScreenshot, setDraggedScreenshot] = useState<Screenshot | null>(null);

  const handleCompareStateChange = useCallback((updates: Partial<CompareState>) => {
    setCompareState((prev) => ({ ...prev, ...updates }));
  }, []);

  const handleDragStart = useCallback((screenshot: Screenshot) => {
    setDraggedScreenshot(screenshot);
  }, []);

  const handleCropComplete = useCallback((imageDataUrl: string, cropRegion: CropRegion) => {
    setAnnotateImage(imageDataUrl);
    setAnnotateCropRegion(cropRegion);
    setViewMode('annotate');
  }, []);

  const handleAnnotateClose = useCallback(() => {
    setViewMode('compare');
    setAnnotateImage(null);
    setAnnotateCropRegion(null);
  }, []);

  const resetCompare = () => {
    setCompareState({
      topImage: null,
      bottomImage: null,
      mode: 'split-vertical',
      splitPosition: 50,
      scale: 1,
      offsetX: 0,
      offsetY: 0,
    });
  };

  return (
    <div style={styles.app}>
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .app-header {
          box-shadow: 0 2px 20px rgba(0, 0, 0, 0.3), 0 0 30px rgba(181, 55, 242, 0.15);
        }
        .view-tab:hover {
          color: #00d2ff !important;
        }
        .view-tab.active {
          color: #00d2ff !important;
          border-bottom-color: #00d2ff !important;
        }
        .reset-btn:hover {
          box-shadow: 0 0 20px rgba(255, 71, 87, 0.5) !important;
        }
        .main-layout {
          background: linear-gradient(135deg, #1a1b2e 0%, #161728 100%);
        }
        .left-panel {
          box-shadow: 2px 0 30px rgba(0, 0, 0, 0.2);
        }
      `}</style>

      <header style={styles.header} className="app-header">
        <div style={styles.headerLeft}>
          <div style={styles.logo}>
            <span style={styles.logoIcon}>🔍</span>
            <span style={styles.logoText}>UI Compare Tool</span>
          </div>
          <div style={styles.viewTabs}>
            <button
              onClick={() => setViewMode('compare')}
              style={{
                ...styles.viewTab,
                ...(viewMode === 'compare' ? styles.viewTabActive : {}),
              }}
              className={`view-tab ${viewMode === 'compare' ? 'active' : ''}`}
            >
              🖼️ 对比模式
            </button>
            <button
              onClick={() => setViewMode('annotate')}
              style={{
                ...styles.viewTab,
                ...(viewMode === 'annotate' ? styles.viewTabActive : {}),
              }}
              className={`view-tab ${viewMode === 'annotate' ? 'active' : ''}`}
              disabled={!annotateImage}
            >
              ✏️ 标注模式
            </button>
          </div>
        </div>
        <div style={styles.headerRight}>
          {compareState.topImage && (
            <button onClick={resetCompare} style={styles.resetBtn} className="reset-btn">
              🔄 重置对比
            </button>
          )}
          <span style={styles.version}>v1.0.0</span>
        </div>
      </header>

      {viewMode === 'compare' ? (
        <div style={styles.mainLayout} className="main-layout">
          <div style={styles.leftPanel} className="left-panel">
            <ScreenCapture
              screenshots={screenshots}
              onScreenshotsChange={setScreenshots}
              onDragStart={handleDragStart}
            />
          </div>
          <div style={styles.rightPanel}>
            <ComparePanel
              compareState={compareState}
              onCompareStateChange={handleCompareStateChange}
              onCropComplete={handleCropComplete}
            />
          </div>
        </div>
      ) : (
        <div style={styles.annotateLayout}>
          <CropAnnotate
            imageDataUrl={annotateImage}
            cropRegion={annotateCropRegion}
            onClose={handleAnnotateClose}
          />
        </div>
      )}

      {draggedScreenshot && (
        <div style={styles.dragIndicator}>
          <span>正在拖拽: 截图 #{draggedScreenshot.number}</span>
        </div>
      )}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  app: {
    width: '100vw',
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
    background: '#1a1b2e',
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 24px',
    background: '#252640',
    borderBottom: '1px solid #3a3b5c',
    zIndex: 100,
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '32px',
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  logoIcon: {
    fontSize: '24px',
  },
  logoText: {
    color: '#fff',
    fontSize: '18px',
    fontWeight: 700,
    background: 'linear-gradient(135deg, #00d2ff, #b537f2)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
  },
  viewTabs: {
    display: 'flex',
    gap: '4px',
  },
  viewTab: {
    padding: '10px 20px',
    background: 'transparent',
    border: 'none',
    borderBottom: '2px solid transparent',
    color: '#8b8ca8',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  viewTabActive: {
    color: '#00d2ff',
    borderBottomColor: '#00d2ff',
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  resetBtn: {
    padding: '8px 16px',
    background: 'rgba(255, 71, 87, 0.15)',
    border: '1px solid rgba(255, 71, 87, 0.3)',
    borderRadius: '8px',
    color: '#ff4757',
    fontSize: '13px',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  version: {
    color: '#5a5b7c',
    fontSize: '12px',
  },
  mainLayout: {
    flex: 1,
    display: 'flex',
    minHeight: 0,
  },
  leftPanel: {
    width: '45%',
    minWidth: '400px',
    display: 'flex',
    flexDirection: 'column',
    borderRight: '1px solid #3a3b5c',
    background: '#1a1b2e',
  },
  rightPanel: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    minWidth: 0,
  },
  annotateLayout: {
    flex: 1,
    display: 'flex',
    minHeight: 0,
  },
  dragIndicator: {
    position: 'fixed',
    bottom: '20px',
    left: '50%',
    transform: 'translateX(-50%)',
    padding: '10px 24px',
    background: 'linear-gradient(135deg, #00d2ff, #3a7bd5)',
    borderRadius: '100px',
    color: '#fff',
    fontSize: '13px',
    fontWeight: 500,
    zIndex: 1000,
    boxShadow: '0 4px 20px rgba(0, 210, 255, 0.4)',
    pointerEvents: 'none',
  },
};

export default App;
