import { useState, useEffect, useCallback } from 'react';
import ParameterPanel from './components/ParameterPanel';
import PreviewArea from './components/PreviewArea';
import CodeOutput from './components/CodeOutput';
import { TypographyParams } from './utils/generateCode';
import { textSample } from './utils/textSample';
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/700.css';
import '@fontsource/noto-sans-sc/400.css';
import '@fontsource/noto-sans-sc/700.css';
import '@fontsource/playfair-display/400.css';
import '@fontsource/playfair-display/700.css';
import '@fontsource/source-code-pro/400.css';
import '@fontsource/source-code-pro/700.css';

const defaultParams: TypographyParams = {
  fontFamily: 'Roboto',
  fontSize: 16,
  lineHeight: 1.6,
  letterSpacing: 0,
  textAlign: 'left',
  containerWidth: 720
};

function App() {
  const [params, setParams] = useState<TypographyParams>(defaultParams);
  const [panelCollapsed, setPanelCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleParamsChange = useCallback((newParams: TypographyParams) => {
    setParams(newParams);
  }, []);

  const togglePanel = useCallback(() => {
    setPanelCollapsed((prev) => !prev);
  }, []);

  if (isMobile) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        width: '100vw',
        backgroundColor: '#1a1a2e',
        overflow: 'hidden'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 16px',
          backgroundColor: '#16213e',
          borderBottom: '1px solid #0f3460',
          flexShrink: 0
        }}>
          <h1 style={{
            fontSize: '18px',
            color: '#eaeaea',
            fontWeight: 600,
            margin: 0
          }}>
            Typography Lab
          </h1>
          <button
            onClick={togglePanel}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: '#0f3460',
              color: '#eaeaea',
              cursor: 'pointer',
              fontSize: '13px'
            }}
          >
            {panelCollapsed ? '展开面板' : '收起面板'}
          </button>
        </div>

        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          position: 'relative'
        }}>
          <div style={{
            display: panelCollapsed ? 'none' : 'block',
            height: '40vh',
            overflow: 'hidden',
            borderBottom: '1px solid #0f3460'
          }}>
            <ParameterPanel
              params={params}
              onParamsChange={handleParamsChange}
              collapsed={false}
              onToggleCollapse={togglePanel}
            />
          </div>

          <div style={{ flex: 1, overflow: 'hidden' }}>
            <PreviewArea params={params} text={textSample} />
          </div>
        </div>

        <div style={{
          height: '40vh',
          borderTop: '1px solid #0f3460',
          flexShrink: 0,
          display: 'flex'
        }}>
          <div style={{ flex: 1 }}>
            <CodeOutput params={params} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex',
      height: '100vh',
      width: '100vw',
      backgroundColor: '#1a1a2e',
      overflow: 'hidden'
    }}>
      <ParameterPanel
        params={params}
        onParamsChange={handleParamsChange}
        collapsed={panelCollapsed}
        onToggleCollapse={togglePanel}
      />

      {panelCollapsed && (
        <button
          onClick={togglePanel}
          style={{
            position: 'fixed',
            left: '12px',
            top: '50%',
            transform: 'translateY(-50%)',
            zIndex: 100,
            width: '36px',
            height: '36px',
            borderRadius: '8px',
            border: 'none',
            backgroundColor: '#16213e',
            color: '#eaeaea',
            cursor: 'pointer',
            fontSize: '18px',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
            transition: 'all 0.2s',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.backgroundColor = '#e94560';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.backgroundColor = '#16213e';
          }}
        >
          ›
        </button>
      )}

      <PreviewArea params={params} text={textSample} />

      <CodeOutput params={params} />
    </div>
  );
}

export default App;
