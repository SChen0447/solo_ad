import React, { useState, useEffect, useCallback } from 'react';
import { ControlPanel } from './components/ControlPanel';
import { PreviewPanel } from './components/PreviewPanel';
import { TypesetRenderer, RenderConfig } from './TypesetRenderer';

export const App: React.FC = () => {
  const [isMobile, setIsMobile] = useState(false);
  const [isPanelExpanded, setIsPanelExpanded] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleExport = useCallback(async () => {
    try {
      const getConfigs = (window as unknown as { getColumnConfigs?: () => RenderConfig[] }).getColumnConfigs;
      if (!getConfigs) {
        alert('导出功能暂不可用');
        return;
      }

      const configs = getConfigs();
      if (configs.length === 0) {
        alert('没有可导出的内容');
        return;
      }

      const dataUrl = await TypesetRenderer.renderToImage(configs, 400, 2);

      const link = document.createElement('a');
      link.download = `font-typesetting-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
    } catch (error) {
      alert('导出失败: ' + (error as Error).message);
    }
  }, []);

  return (
    <div style={styles.app}>
      {isMobile ? (
        <>
          <div style={{
            ...styles.mobileHeader,
            height: isPanelExpanded ? 'auto' : '60px',
            maxHeight: isPanelExpanded ? '50vh' : '60px',
            overflow: isPanelExpanded ? 'auto' : 'hidden',
          }}>
            <div style={styles.mobileHeaderBar}>
              <div style={styles.logo}>
                <span style={styles.logoIcon}>🔤</span>
                <span style={styles.logoText}>字体排印实验室</span>
              </div>
              <button
                onClick={() => setIsPanelExpanded(!isPanelExpanded)}
                style={styles.mobileToggle}
              >
                {isPanelExpanded ? '收起 ▲' : '展开控制面板 ▼'}
              </button>
            </div>
            {isPanelExpanded && (
              <div style={styles.mobilePanelContent}>
                <ControlPanel />
              </div>
            )}
          </div>
          <div style={styles.mobileMain}>
            <PreviewPanel onExport={handleExport} />
          </div>
        </>
      ) : (
        <>
          <div style={styles.leftPanel}>
            <div style={styles.panelHeader}>
              <span style={styles.logoIcon}>🔤</span>
              <span style={styles.logoText}>字体排印实验室</span>
            </div>
            <div style={styles.leftPanelContent}>
              <ControlPanel />
            </div>
          </div>
          <div style={styles.mainArea}>
            <PreviewPanel onExport={handleExport} />
          </div>
        </>
      )}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  app: {
    display: 'flex',
    flexDirection: 'row',
    width: '100vw',
    height: '100vh',
    backgroundColor: '#fafafa',
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    overflow: 'hidden',
  },
  leftPanel: {
    width: '320px',
    flexShrink: 0,
    backgroundColor: 'white',
    borderRight: '1px solid #e8e8e8',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '2px 0 8px rgba(0,0,0,0.03)',
  },
  panelHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '16px 20px',
    borderBottom: '1px solid #f0f0f0',
    flexShrink: 0,
  },
  logoIcon: {
    fontSize: '24px',
  },
  logoText: {
    fontSize: '16px',
    fontWeight: 700,
    color: '#333',
  },
  leftPanelContent: {
    flex: 1,
    overflowY: 'auto',
    minHeight: 0,
  },
  mainArea: {
    flex: 1,
    padding: '20px',
    minWidth: 0,
    overflow: 'hidden',
  },
  mobileHeader: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: 'white',
    borderBottom: '1px solid #e8e8e8',
    zIndex: 100,
    transition: 'max-height 0.3s ease',
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
  },
  mobileHeaderBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 16px',
    height: '60px',
    boxSizing: 'border-box',
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  mobileToggle: {
    padding: '6px 12px',
    fontSize: '12px',
    backgroundColor: '#4a90d9',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  mobilePanelContent: {
    maxHeight: 'calc(50vh - 60px)',
    overflowY: 'auto',
  },
  mobileMain: {
    position: 'fixed',
    top: '60px',
    left: 0,
    right: 0,
    bottom: 0,
    padding: '12px',
    overflow: 'hidden',
  },
};

const globalStyles = document.createElement('style');
globalStyles.textContent = `
  * {
    box-sizing: border-box;
  }
  body {
    margin: 0;
    padding: 0;
    overflow: hidden;
  }
  #root {
    width: 100%;
    height: 100%;
  }
  button:hover {
    filter: brightness(1.1);
  }
  button:active {
    transform: scale(0.98);
  }
  .control-panel-scroll::-webkit-scrollbar {
    width: 6px;
  }
  .control-panel-scroll::-webkit-scrollbar-track {
    background: #f1f1f1;
  }
  .control-panel-scroll::-webkit-scrollbar-thumb {
    background: #ddd;
    border-radius: 3px;
  }
  .control-panel-scroll::-webkit-scrollbar-thumb:hover {
    background: #ccc;
  }
  input[type="color"]::-webkit-color-swatch-wrapper {
    padding: 0;
  }
  input[type="color"]::-webkit-color-swatch {
    border: none;
    border-radius: 6px;
  }
`;
document.head.appendChild(globalStyles);
