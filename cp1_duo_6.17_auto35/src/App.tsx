import React, { useState, useEffect, useCallback } from 'react';
import ParameterPanel from './components/ParameterPanel';
import PreviewArea from './components/PreviewArea';
import CodeOutput from './components/CodeOutput';
import type { TypographyParams } from './utils/textSample';
import { DEFAULT_PARAMS } from './utils/textSample';

const App: React.FC = () => {
  const [params, setParams] = useState<TypographyParams>(DEFAULT_PARAMS);
  const [panelCollapsed, setPanelCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleParamsChange = useCallback((newParams: TypographyParams) => {
    setParams(newParams);
  }, []);

  const handleToggleCollapse = useCallback(() => {
    setPanelCollapsed(prev => !prev);
  }, []);

  return (
    <div className={`app-container ${isMobile ? 'mobile' : 'desktop'}`}>
      {isMobile ? (
        <div className="mobile-layout">
          <div className="mobile-top">
            <PreviewArea params={params} />
          </div>
          <div className="mobile-bottom">
            <div className="mobile-panels">
              <ParameterPanel
                params={params}
                onParamsChange={handleParamsChange}
                collapsed={panelCollapsed}
                onToggleCollapse={handleToggleCollapse}
              />
              <CodeOutput params={params} />
            </div>
          </div>
        </div>
      ) : (
        <div className="desktop-layout">
          <ParameterPanel
            params={params}
            onParamsChange={handleParamsChange}
            collapsed={panelCollapsed}
            onToggleCollapse={handleToggleCollapse}
          />
          <PreviewArea params={params} />
          <CodeOutput params={params} />
        </div>
      )}

      <style>{`
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        .app-container {
          width: 100vw;
          height: 100vh;
          background-color: #1a1a2e;
          color: #eaeaea;
          font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          overflow: hidden;
        }

        .desktop-layout {
          display: flex;
          width: 100%;
          height: 100%;
        }

        .mobile-layout {
          display: flex;
          flex-direction: column;
          width: 100%;
          height: 100%;
          overflow: hidden;
        }

        .mobile-top {
          flex: 1;
          min-height: 0;
          overflow: hidden;
        }

        .mobile-bottom {
          height: 50%;
          min-height: 0;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }

        .mobile-panels {
          display: flex;
          flex-direction: column;
          height: 100%;
          overflow: hidden;
        }

        button {
          font-family: inherit;
        }

        input[type="range"] {
          font-family: inherit;
        }

        ::selection {
          background-color: #e94560;
          color: #fff;
        }
      `}</style>
    </div>
  );
};

export default App;
