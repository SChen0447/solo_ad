import React, { useState, useEffect } from 'react';
import InputPanel from './InputPanel';
import ChartPanel from './ChartPanel';
import { ChartData } from './MarkdownParser';
import { themes, Theme } from './themes';

const defaultMarkdown = `# 季度销售数据

| 季度 | 销售额(万) | 利润(万) |
|------|------------|----------|
| Q1   | 120        | 30       |
| Q2   | 180        | 45       |
| Q3   | 250        | 60       |
| Q4   | 320        | 80       |
`;

const App: React.FC = () => {
  const [markdown, setMarkdown] = useState(defaultMarkdown);
  const [chartData, setChartData] = useState<ChartData | null>(null);
  const [currentTheme, setCurrentTheme] = useState<Theme>(themes[4]);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleGenerate = (data: ChartData) => {
    setChartData(data);
  };

  const appStyle: React.CSSProperties = {
    width: '100vw',
    height: '100vh',
    backgroundColor: '#1a202c',
    display: 'flex',
    flexDirection: isMobile ? 'column' : 'row',
    padding: '16px',
    boxSizing: 'border-box',
    gap: '16px',
    overflow: 'hidden',
  };

  const leftPanelStyle: React.CSSProperties = {
    width: isMobile ? '100%' : '350px',
    flexShrink: 0,
    borderRadius: '8px',
    backgroundColor: '#ffffff',
    border: '1px solid #e2e8f0',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    ...(isMobile ? { maxHeight: '40vh' } : { height: '100%' }),
  };

  const themeSwitcherStyle: React.CSSProperties = {
    display: 'flex',
    gap: '8px',
    padding: '12px 20px',
    backgroundColor: '#1a202c',
    borderBottom: '1px solid #2d3748',
  };

  const themeButtonStyle = (theme: Theme): React.CSSProperties => ({
    padding: '6px 14px',
    borderRadius: '6px',
    border: currentTheme.name === theme.name ? '2px solid #ffffff' : '2px solid transparent',
    background: theme.background,
    color: '#ffffff',
    fontSize: '12px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 200ms ease-in-out',
    boxShadow: currentTheme.name === theme.name ? '0 4px 12px rgba(0,0,0,0.3)' : '0 2px 4px rgba(0,0,0,0.2)',
  });

  return (
    <div style={appStyle}>
      <div style={leftPanelStyle}>
        <div style={themeSwitcherStyle}>
          {themes.map((theme) => (
            <button
              key={theme.name}
              style={themeButtonStyle(theme)}
              onClick={() => setCurrentTheme(theme)}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow =
                  currentTheme.name === theme.name
                    ? '0 4px 12px rgba(0,0,0,0.3)'
                    : '0 2px 4px rgba(0,0,0,0.2)';
              }}
            >
              {theme.name}
            </button>
          ))}
        </div>
        <div style={{ flex: 1, overflow: 'auto' }}>
          <InputPanel
            markdown={markdown}
            onMarkdownChange={setMarkdown}
            onGenerate={handleGenerate}
          />
        </div>
      </div>
      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
        <ChartPanel chartData={chartData} theme={currentTheme} />
      </div>
    </div>
  );
};

export default App;
