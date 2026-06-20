import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { ThemeVars, ThemeContextType, defaultThemeVars, ThemeSide } from './themeTypes';
import ComponentPreview from './ComponentPreview';
import ThemeEditor from './ThemeEditor';
import ThemeManager from './ThemeManager';

export const ThemeContext = createContext<ThemeContextType | null>(null);

export const useThemeContext = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useThemeContext must be used within ThemeProvider');
  }
  return context;
};

const App: React.FC = () => {
  const [leftVars, setLeftVars] = useState<ThemeVars>({ ...defaultThemeVars });
  const [rightVars, setRightVars] = useState<ThemeVars>({ ...defaultThemeVars });
  const [isMobile, setIsMobile] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeSide, setActiveSide] = useState<ThemeSide>('left');
  const leftRef = useRef<HTMLDivElement>(null);
  const rightRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const updateLeftVar = useCallback(
    (key: keyof ThemeVars, value: ThemeVars[keyof ThemeVars]) => {
      setLeftVars((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  const updateRightVar = useCallback(
    (key: keyof ThemeVars, value: ThemeVars[keyof ThemeVars]) => {
      setRightVars((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  const contextValue: ThemeContextType = {
    leftVars,
    rightVars,
    updateLeftVar,
    updateRightVar,
    setLeftVars,
    setRightVars,
  };

  const sidebarContent = (
    <>
      <div style={tabsStyle}>
        <button
          onClick={() => setActiveSide('left')}
          style={{
            ...tabStyle,
            ...(activeSide === 'left' ? activeTabStyle : {}),
            color: activeSide === 'left' ? leftVars['--primary'] : '#6b7280',
            borderBottom: activeSide === 'left' ? `2px solid ${leftVars['--primary']}` : '2px solid transparent',
          }}
        >
          左侧主题
        </button>
        <button
          onClick={() => setActiveSide('right')}
          style={{
            ...tabStyle,
            ...(activeSide === 'right' ? activeTabStyle : {}),
            color: activeSide === 'right' ? rightVars['--primary'] : '#6b7280',
            borderBottom: activeSide === 'right' ? `2px solid ${rightVars['--primary']}` : '2px solid transparent',
          }}
        >
          右侧主题
        </button>
      </div>
      <ThemeEditor
        side={activeSide}
        vars={activeSide === 'left' ? leftVars : rightVars}
        onUpdate={activeSide === 'left' ? updateLeftVar : updateRightVar}
      />
      <ThemeManager
        leftVars={leftVars}
        rightVars={rightVars}
        leftPreviewRef={leftRef}
        rightPreviewRef={rightRef}
        activeSide={activeSide}
      />
    </>
  );

  return (
    <ThemeContext.Provider value={contextValue}>
      <div style={appStyle}>
        <div style={mainAreaStyle}>
          <div style={previewContainerStyle}>
            <div ref={leftRef} style={{ ...previewHalfStyle, borderRight: '2px solid #e5e7eb' }}>
              <ComponentPreview vars={leftVars} side="left" />
            </div>
            <div ref={rightRef} style={previewHalfStyle}>
              <ComponentPreview vars={rightVars} side="right" />
            </div>
          </div>
        </div>

        {!isMobile && (
          <aside style={sidebarStyle}>{sidebarContent}</aside>
        )}

        {isMobile && (
            <>
              <div style={mobileBarStyle} onClick={() => setSidebarOpen(true)}>
                <span style={{ fontSize: '14px', color: '#374151' }}>主题设置</span>
                <span style={{ fontSize: '20px' }}>⚙</span>
              </div>
              {sidebarOpen && (
                <div style={mobileOverlayStyle} onClick={() => setSidebarOpen(false)}>
                  <div
                    style={mobilePanelStyle}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div style={mobileHeaderStyle}>
                      <span style={{ fontWeight: 600, fontSize: '16px' }}>主题设置</span>
                      <button onClick={() => setSidebarOpen(false)} style={closeBtnStyle}>
                      ✕
                      </button>
                    </div>
                    <div style={{ overflowY: 'auto', height: 'calc(100% - 60px)' }}>
                      {sidebarContent}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
      </div>
    </ThemeContext.Provider>
  );
};

const appStyle: React.CSSProperties = {
  display: 'flex',
  width: '100vw',
  height: '100vh',
  backgroundColor: '#f0f2f5',
  overflow: 'hidden',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
};

const mainAreaStyle: React.CSSProperties = {
  flex: 1,
  display: 'flex',
  overflow: 'hidden',
  marginRight: '320px',
};

const previewContainerStyle: React.CSSProperties = {
  display: 'flex',
  width: '100%',
  height: '100%',
};

const previewHalfStyle: React.CSSProperties = {
  flex: 1,
  padding: '24px',
  overflowY: 'auto',
  boxSizing: 'border-box',
};

const sidebarStyle: React.CSSProperties = {
  position: 'fixed',
  right: 0,
  top: 0,
  width: '320px',
  height: '100vh',
  backgroundColor: '#f8f9fa',
  borderLeft: '1px solid #e5e7eb',
  overflowY: 'auto',
  boxSizing: 'border-box',
  zIndex: 10,
};

const tabsStyle: React.CSSProperties = {
  display: 'flex',
  borderBottom: '1px solid #e5e7eb',
  backgroundColor: '#fff',
  position: 'sticky',
  top: 0,
  zIndex: 10,
};

const tabStyle: React.CSSProperties = {
  flex: 1,
  padding: '14px 0',
  border: 'none',
  backgroundColor: 'transparent',
  cursor: 'pointer',
  fontSize: '14px',
  fontWeight: 500,
  transition: 'all 0.2s ease',
};

const activeTabStyle: React.CSSProperties = {
  fontWeight: 600,
};

const mobileBarStyle: React.CSSProperties = {
  position: 'fixed',
  bottom: 0,
  left: 0,
  right: 0,
  height: '64px',
  backgroundColor: '#fff',
  borderTop: '1px solid #e5e7eb',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '8px',
  cursor: 'pointer',
  zIndex: 100,
};

const mobileOverlayStyle: React.CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(0, 0, 0, 0.5)',
  zIndex: 200,
  display: 'flex',
  alignItems: 'flex-end',
};

const mobilePanelStyle: React.CSSProperties = {
  width: '100%',
  height: '80vh',
  backgroundColor: '#f8f9fa',
  borderRadius: '16px 16px 0 0',
  overflow: 'hidden',
};

const mobileHeaderStyle: React.CSSProperties = {
  height: '60px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '0 20px',
  borderBottom: '1px solid #e5e7eb',
  backgroundColor: '#fff',
};

const closeBtnStyle: React.CSSProperties = {
  border: 'none',
  background: 'transparent',
  fontSize: '18px',
  cursor: 'pointer',
  color: '#6b7280',
  padding: '4px 8px',
};

export default App;
