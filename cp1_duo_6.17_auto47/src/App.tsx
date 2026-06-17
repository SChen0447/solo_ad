import React, { useState, useCallback, useRef, useEffect } from 'react';
import { ControlPanel } from './components/ControlPanel';
import { PreviewPanel } from './components/PreviewPanel';
import { analyzeViaBackend, BREAKPOINTS, type BreakpointResult, type AnalyzerConfig } from './modules/analyzer';
import './styles/App.css';

const DEFAULT_HTML = `<div class="container">
  <header class="header">
    <h1>页面标题示例</h1>
    <nav class="nav">
      <a href="#">首页</a>
      <a href="#">产品</a>
      <a href="#">关于我们</a>
      <a href="#">联系我们</a>
    </nav>
  </header>
  <main class="main-content">
    <div class="card">
      <h2>卡片标题</h2>
      <p>这是一段很长的文本内容，用于测试在不同屏幕尺寸和字体设置下是否会发生溢出问题。当字体放大或容器变窄时，文本可能会超出父容器的边界。</p>
    </div>
    <div class="card">
      <h2>另一张卡片</h2>
      <p>这是另一张卡片的内容，同样用于测试布局溢出。</p>
    </div>
  </main>
  <footer class="footer">
    <p>&copy; 2024 布局诊断工具</p>
  </footer>
</div>`;

const DEFAULT_CSS = `.container {
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
}

.header {
  background: linear-gradient(135deg, #4a6fa5, #6a8fc5);
  color: white;
  padding: 20px;
  border-radius: 8px;
  margin-bottom: 20px;
}

.header h1 {
  font-size: 28px;
  margin-bottom: 12px;
}

.nav {
  display: flex;
  gap: 24px;
}

.nav a {
  color: white;
  text-decoration: none;
  padding: 8px 16px;
  border-radius: 4px;
  transition: background 0.2s;
}

.nav a:hover {
  background: rgba(255, 255, 255, 0.2);
}

.main-content {
  display: flex;
  gap: 20px;
  margin-bottom: 20px;
}

.card {
  flex: 1;
  min-width: 250px;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  height: 200px;
  overflow: hidden;
}

.card h2 {
  font-size: 20px;
  margin-bottom: 12px;
  color: #1a1a2a;
}

.card p {
  color: #4b5563;
  line-height: 1.6;
}

.footer {
  background: #2a2a3a;
  color: #e0e0e0;
  padding: 16px;
  border-radius: 8px;
  text-align: center;
}`;

function App() {
  const [htmlCode, setHtmlCode] = useState<string>(DEFAULT_HTML);
  const [cssCode, setCssCode] = useState<string>(DEFAULT_CSS);
  const [fontScale, setFontScale] = useState<number>(1.0);
  const [lineHeight, setLineHeight] = useState<number>(1.5);
  const [padding, setPadding] = useState<number>(8);
  const [selectedBreakpoint, setSelectedBreakpoint] = useState<number | null>(null);
  const [analysisData, setAnalysisData] = useState<Record<string, BreakpointResult>>({});
  const iframeRefs = useRef<Record<number, HTMLIFrameElement | null>>({});

  const config: AnalyzerConfig = {
    fontScale,
    lineHeight,
    padding
  };

  const runAnalysis = useCallback(async () => {
    try {
      const data = await analyzeViaBackend(htmlCode, cssCode, config);
      setAnalysisData(data);
    } catch (error) {
      console.error('Analysis failed:', error);
      const fallbackData: Record<string, BreakpointResult> = {};
      BREAKPOINTS.forEach((bp) => {
        fallbackData[String(bp)] = {
          breakpoint: bp,
          overflowElements: [],
          totalOverflow: 0
        };
      });
      setAnalysisData(fallbackData);
    }
  }, [htmlCode, cssCode, config]);

  useEffect(() => {
    runAnalysis();
  }, [runAnalysis]);

  const handleAnalysisUpdate = useCallback((data: Record<string, BreakpointResult>) => {
    setAnalysisData(data);
  }, []);

  return (
    <div className="app-container">
      <ControlPanel
        htmlCode={htmlCode}
        cssCode={cssCode}
        onHtmlChange={setHtmlCode}
        onCssChange={setCssCode}
        fontScale={fontScale}
        lineHeight={lineHeight}
        padding={padding}
        onFontScaleChange={setFontScale}
        onLineHeightChange={setLineHeight}
        onPaddingChange={setPadding}
        selectedBreakpoint={selectedBreakpoint}
        onBreakpointSelect={setSelectedBreakpoint}
        analysisData={analysisData}
        iframeRefs={iframeRefs}
      />
      <PreviewPanel
        htmlCode={htmlCode}
        cssCode={cssCode}
        config={config}
        selectedBreakpoint={selectedBreakpoint}
        analysisData={analysisData}
        onAnalysisUpdate={handleAnalysisUpdate}
      />
    </div>
  );
}

export default App;
