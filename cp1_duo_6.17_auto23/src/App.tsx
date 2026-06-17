import React, { useState, useEffect, useCallback } from 'react';
import ComponentTree from './components/ComponentTree';
import TestConfig from './components/TestConfig';
import DiffPanel from './components/DiffPanel';
import { useTestRunner } from './hooks/useTestRunner';

export interface ComponentInfo {
  name: string;
  path: string;
  size: number;
  lastModified: string;
  props: string[];
  dependencies: string[];
}

export interface TestResult {
  state: string;
  thumbnail: string;
  renderTime: number;
}

const SIDEBAR_WIDTH = 300;

const App: React.FC = () => {
  const [selectedComponent, setSelectedComponent] = useState<ComponentInfo | null>(null);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);
  const [isCompact, setIsCompact] = useState(false);

  const { running, runTest } = useTestRunner();

  useEffect(() => {
    const handleResize = () => {
      setIsCompact(window.innerWidth < 1024);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleSelectComponent = useCallback((comp: ComponentInfo) => {
    setSelectedComponent(comp);
    setTestResults([]);
  }, []);

  const handleRunTest = useCallback(async (states: string[]) => {
    if (!selectedComponent) return;
    const results = await runTest(selectedComponent.path, states);
    setTestResults(results);
  }, [selectedComponent, runTest]);

  const containerStyle: React.CSSProperties = {
    display: 'flex',
    width: '100%',
    height: '100%',
    background: '#1e1e2e',
    position: 'relative',
    overflow: 'hidden',
  };

  const panelStyle = (side: 'left' | 'right'): React.CSSProperties => ({
    width: SIDEBAR_WIDTH,
    minWidth: SIDEBAR_WIDTH,
    height: '100%',
    background: '#2d2d44',
    overflow: 'auto',
    transition: 'transform 0.3s ease',
    position: isCompact ? 'absolute' : 'relative',
    zIndex: isCompact ? 100 : 1,
    top: 0,
    [side]: 0,
    transform: (side === 'left' && !leftOpen) || (side === 'right' && !rightOpen)
      ? `translateX(${side === 'left' ? '-100%' : '100%'})`
      : 'translateX(0)',
    boxShadow: isCompact ? '2px 0 12px rgba(0,0,0,0.5)' : 'none',
  });

  const centerStyle: React.CSSProperties = {
    flex: 1,
    height: '100%',
    overflow: 'auto',
    background: '#1e1e2e',
  };

  const dividerStyle: React.CSSProperties = {
    width: '1px',
    background: 'rgba(205,214,244,0.15)',
    flexShrink: 0,
  };

  const toggleBtnStyle = (side: 'left' | 'right'): React.CSSProperties => ({
    position: 'fixed',
    [side]: 8,
    top: '50%',
    transform: 'translateY(-50%)',
    zIndex: 200,
    width: 36,
    height: 36,
    borderRadius: 8,
    border: 'none',
    background: '#2d2d44',
    color: '#cdd6f4',
    cursor: 'pointer',
    display: isCompact ? 'flex' : 'none',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 18,
    transition: 'background 0.2s',
  });

  return (
    <div style={containerStyle}>
      <button
        style={toggleBtnStyle('left')}
        onClick={() => setLeftOpen((v) => !v)}
        title={leftOpen ? '收起' : '展开'}
      >
        {leftOpen ? '◁' : '▷'}
      </button>

      <div style={panelStyle('left')}>
        <ComponentTree onSelect={handleSelectComponent} selected={selectedComponent} />
      </div>

      {!isCompact && <div style={dividerStyle} />}

      <div style={centerStyle}>
        <TestConfig
          component={selectedComponent}
          testResults={testResults}
          onRunTest={handleRunTest}
          running={running}
        />
      </div>

      {!isCompact && <div style={dividerStyle} />}

      <div style={panelStyle('right')}>
        <DiffPanel testResults={testResults} />
      </div>

      <button
        style={toggleBtnStyle('right')}
        onClick={() => setRightOpen((v) => !v)}
        title={rightOpen ? '收起' : '展开'}
      >
        {rightOpen ? '▷' : '◁'}
      </button>
    </div>
  );
};

export default App;
