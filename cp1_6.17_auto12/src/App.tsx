import React, { useState, useRef, useCallback, useEffect } from 'react';
import GraphContainer from './components/GraphContainer';
import ControlPanel, { ThemeName, themes } from './components/ControlPanel';
import {
  RawGraphData,
  ParsedGraphData,
  parseGraphData,
  validateGraphData
} from './utils/dataParser';
import { toPng } from 'html-to-image';

const sampleData: RawGraphData = {
  nodes: [
    { id: '1', label: 'App.tsx', group: 1 },
    { id: '2', label: 'GraphContainer', group: 2 },
    { id: '3', label: 'ControlPanel', group: 3 },
    { id: '4', label: 'dataParser', group: 4 },
    { id: '5', label: 'React', group: 5 },
    { id: '6', label: 'D3 Force', group: 6 },
    { id: '7', label: 'Node A', group: 1 },
    { id: '8', label: 'Node B', group: 2 },
    { id: '9', label: 'Node C', group: 3 },
    { id: '10', label: 'Node D', group: 4 },
    { id: '11', label: 'Utils', group: 5 },
    { id: '12', label: 'Hooks', group: 6 },
    { id: '13', label: 'Node E', group: 1 },
    { id: '14', label: 'Node F', group: 2 },
    { id: '15', label: 'Node G', group: 3 }
  ],
  links: [
    { source: '1', target: '2' },
    { source: '1', target: '3' },
    { source: '1', target: '4' },
    { source: '2', target: '5' },
    { source: '2', target: '6' },
    { source: '3', target: '5' },
    { source: '4', target: '5' },
    { source: '7', target: '8' },
    { source: '8', target: '9' },
    { source: '9', target: '10' },
    { source: '10', target: '7' },
    { source: '11', target: '12' },
    { source: '12', target: '13' },
    { source: '13', target: '14' },
    { source: '14', target: '15' },
    { source: '15', target: '11' },
    { source: '1', target: '7' },
    { source: '2', target: '11' },
    { source: '5', target: '6' }
  ]
};

const App: React.FC = () => {
  const [graphData, setGraphData] = useState<ParsedGraphData>({ nodes: [], links: [] });
  const [theme, setTheme] = useState<ThemeName>('classicBlue');
  const [nodeSpacing, setNodeSpacing] = useState(150);
  const [showLabels, setShowLabels] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [resetKey, setResetKey] = useState(0);

  const graphRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const parsed = parseGraphData(sampleData);
    setGraphData(parsed);
  }, []);

  const handleDataImport = useCallback((rawData: RawGraphData) => {
    if (!validateGraphData(rawData)) {
      alert('数据格式不正确，请确保包含 nodes 和 links 数组，且格式正确');
      return;
    }
    const parsed = parseGraphData(rawData);
    setGraphData(parsed);
    setResetKey(prev => prev + 1);
  }, []);

  const handleExportPNG = useCallback(async () => {
    if (!graphRef.current) return;

    setIsExporting(true);

    try {
      await new Promise(resolve => setTimeout(resolve, 500));

      const dataUrl = await toPng(graphRef.current, {
        quality: 1,
        pixelRatio: 2,
        backgroundColor: '#f5f5f5'
      });

      const link = document.createElement('a');
      link.download = `dependency-graph-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
    } catch (error) {
      console.error('导出图片失败:', error);
      alert('导出图片失败，请重试');
    } finally {
      setIsExporting(false);
    }
  }, []);

  const handleReset = useCallback(() => {
    setResetKey(prev => prev + 1);
  }, []);

  const handleThemeChange = useCallback((newTheme: ThemeName) => {
    setTheme(newTheme);
  }, []);

  const handleNodeSpacingChange = useCallback((value: number) => {
    setNodeSpacing(value);
    setResetKey(prev => prev + 1);
  }, []);

  const handleShowLabelsChange = useCallback((show: boolean) => {
    setShowLabels(show);
  }, []);

  return (
    <div className="app">
      <ControlPanel
        onDataImport={handleDataImport}
        onExportPNG={handleExportPNG}
        onReset={handleReset}
        theme={theme}
        onThemeChange={handleThemeChange}
        nodeSpacing={nodeSpacing}
        onNodeSpacingChange={handleNodeSpacingChange}
        showLabels={showLabels}
        onShowLabelsChange={handleShowLabelsChange}
        isExporting={isExporting}
      />
      <GraphContainer
        key={resetKey}
        nodes={graphData.nodes}
        links={graphData.links}
        themeColors={themes[theme]}
        nodeSpacing={nodeSpacing}
        showLabels={showLabels}
        isExporting={isExporting}
        graphRef={graphRef}
      />
    </div>
  );
};

export default App;
