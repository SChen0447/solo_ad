import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import type { OverflowElement } from '../modules/analyzer';
import { exportAsPNG, exportAsJSON, type ExportReportData } from '../modules/exporter';

export const BREAKPOINTS: number[] = [320, 480, 768, 1024, 1280, 1440, 1920, 2560];

export const DEFAULT_HTML = `<div class="container">
  <header class="header">
    <h1>响应式布局测试页面</h1>
    <nav class="nav">
      <a href="#">首页</a>
      <a href="#">产品</a>
      <a href="#">服务</a>
      <a href="#">关于我们</a>
      <a href="#">联系方式</a>
    </nav>
  </header>
  <main class="main">
    <section class="hero">
      <h2>欢迎使用布局诊断工具</h2>
      <p class="long-text">这是一段用来测试溢出效果的超长文本内容，当视口宽度不足或字体放大时，这段文字可能会导致容器溢出或换行异常，请在不同断点下观察表现。</p>
      <button class="btn-primary">开始诊断</button>
    </section>
    <div class="grid">
      <div class="card">
        <h3>卡片标题一</h3>
        <p>卡片内容描述文字，用于测试响应式表现。</p>
      </div>
      <div class="card">
        <h3>卡片标题二</h3>
        <p>这是另一个卡片的内容信息，可能会溢出。</p>
      </div>
      <div class="card">
        <h3>卡片标题三</h3>
        <p>第三张卡片用于测试网格布局在小屏下的表现。</p>
      </div>
    </div>
    <div class="fixed-width-box">
      这个固定宽度的盒子在小屏设备上很可能会出现横向溢出问题
    </div>
  </main>
</div>`;

export const DEFAULT_CSS = `.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
  font-family: system-ui, -apple-system, sans-serif;
}
.header {
  background: #4a6fa5;
  color: white;
  padding: 20px;
  border-radius: 8px;
}
.nav {
  display: flex;
  gap: 20px;
  margin-top: 12px;
  flex-wrap: wrap;
}
.nav a {
  color: white;
  text-decoration: none;
  padding: 8px 16px;
  background: rgba(255,255,255,0.1);
  border-radius: 6px;
  white-space: nowrap;
}
.main {
  margin-top: 24px;
}
.hero {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 40px;
  border-radius: 12px;
  margin-bottom: 24px;
}
.hero h2 { margin-top: 0; }
.long-text { line-height: 1.6; }
.btn-primary {
  background: #f97316;
  color: white;
  border: none;
  padding: 12px 28px;
  border-radius: 8px;
  font-size: 16px;
  cursor: pointer;
  margin-top: 16px;
}
.grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
}
.card {
  background: #f8fafc;
  padding: 20px;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  min-width: 0;
}
.card h3 { margin-top: 0; color: #4a6fa5; }
.fixed-width-box {
  width: 800px;
  background: #fef3c7;
  padding: 20px;
  border-radius: 8px;
  margin-top: 24px;
  font-weight: bold;
  color: #92400e;
}`;

interface KnobSliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  onChange: (value: number) => void;
}

function KnobSlider({ label, value, min, max, step, unit, onChange }: KnobSliderProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const displayValueRef = useRef(value);
  const animationRef = useRef<number | null>(null);
  const targetValueRef = useRef(value);

  const snapToStep = useCallback(
    (raw: number) => {
      const snapped = Math.round(raw / step) * step;
      return Math.max(min, Math.min(max, snapped));
    },
    [min, max, step]
  );

  const updateWithDamping = useCallback(() => {
    const current = displayValueRef.current;
    const target = targetValueRef.current;
    const diff = target - current;

    if (Math.abs(diff) < step / 10) {
      displayValueRef.current = target;
      animationRef.current = null;
      return;
    }

    const damping = 0.25;
    displayValueRef.current = current + diff * damping;
    animationRef.current = requestAnimationFrame(updateWithDamping);
  }, [step]);

  const updateTargetValue = useCallback(
    (clientX: number) => {
      if (!trackRef.current) return;
      const rect = trackRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
      const pct = x / rect.width;
      const rawValue = min + pct * (max - min);
      const snapped = snapToStep(rawValue);
      targetValueRef.current = snapped;
      onChange(snapped);
    },
    [min, max, snapToStep, onChange]
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      setIsDragging(true);
      updateTargetValue(e.clientX);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      updateWithDamping();
      e.preventDefault();
    },
    [updateTargetValue, updateWithDamping]
  );

  useEffect(() => {
    targetValueRef.current = value;
    if (!isDragging && animationRef.current === null) {
      updateWithDamping();
    }
  }, [value, isDragging, updateWithDamping]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        updateTargetValue(e.clientX);
      }
    };
    const handleMouseUp = () => {
      setIsDragging(false);
    };
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, updateTargetValue]);

  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  const displayPercent = ((displayValueRef.current - min) / (max - min)) * 100;

  return (
    <div className="slider-group">
      <div className="slider-label-row">
        <span className="slider-label">{label}</span>
        <span className="slider-value">
          {value.toFixed(step < 1 ? 2 : 0)}
          {unit}
        </span>
      </div>
      <div
        ref={trackRef}
        className={`slider-track ${isDragging ? 'dragging' : ''}`}
        onMouseDown={handleMouseDown}
      >
        <div className="slider-fill" style={{ width: `${displayPercent}%` }} />
        <div
          className={`slider-knob ${isDragging ? 'active' : ''}`}
          style={{ left: `calc(${displayPercent}% - 12px)` }}
        >
          <div className="knob-inner" />
        </div>
      </div>
    </div>
  );
}

interface LazyBreakpointCardProps {
  bp: number;
  htmlCode: string;
  cssCode: string;
  fontScale: number;
  lineHeightScale: number;
  containerPadding: number;
  overflowCount: number;
  selected: boolean;
  onIframeRef: (bp: number, el: HTMLIFrameElement | null) => void;
  onClick: () => void;
}

function LazyBreakpointCard({
  bp,
  htmlCode,
  cssCode,
  fontScale,
  lineHeightScale,
  containerPadding,
  overflowCount,
  selected,
  onIframeRef,
  onClick,
}: LazyBreakpointCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const scale = 160 / Math.max(bp, 320);
  const displayWidth = Math.min(bp * scale, 160);
  const displayHeight = displayWidth * 0.65;

  useEffect(() => {
    const card = cardRef.current;
    if (!card) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            observer.disconnect();
          }
        });
      },
      { threshold: 0.1, rootMargin: '100px' }
    );

    observer.observe(card);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isVisible) return;
    const iframe = iframeRef.current;
    if (!iframe) return;

    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (doc) {
      const styleId = '__diag_style__';
      let styleEl = doc.getElementById(styleId) as HTMLStyleElement | null;
      if (!styleEl) {
        styleEl = doc.createElement('style');
        styleEl.id = styleId;
        doc.head.appendChild(styleEl);
      }
      styleEl.textContent = `
        ${cssCode}
        * {
          font-size: calc(1em * ${fontScale}) !important;
          line-height: calc(1.5 * ${lineHeightScale}) !important;
        }
        html, body {
          margin: 0;
          padding: ${containerPadding}px;
          box-sizing: border-box;
          background: #ffffff;
          font-family: system-ui, sans-serif;
        }
        *, *::before, *::after { box-sizing: inherit; }
      `;
      if (doc.body.innerHTML !== htmlCode) {
        doc.body.innerHTML = htmlCode;
      }
    }
  }, [isVisible, htmlCode, cssCode, fontScale, lineHeightScale, containerPadding]);

  const handleRef = (el: HTMLIFrameElement | null) => {
    iframeRef.current = el;
    onIframeRef(bp, el);
  };

  return (
    <div
      ref={cardRef}
      className={`breakpoint-card ${selected ? 'selected' : ''}`}
      onClick={onClick}
    >
      <div className="breakpoint-width-tag">{bp}px</div>
      <div
        className="breakpoint-viewport"
        style={{ width: displayWidth, height: displayHeight }}
      >
        {isVisible ? (
          <div
            className="thumbnail-iframe-container"
            style={{
              width: displayWidth,
              height: displayHeight,
            }}
          >
            <iframe
              ref={handleRef}
              title={`preview-${bp}`}
              className="thumbnail-iframe"
              style={{
                width: bp,
                height: bp * 0.65,
                transform: `scale(${scale})`,
                transformOrigin: 'top left',
              }}
              sandbox="allow-same-origin allow-scripts"
            />
          </div>
        ) : (
          <div className="breakpoint-placeholder">
            <div className="placeholder-skeleton">
              <div className="ph-bar ph-header" />
              <div className="ph-bar ph-hero" />
              <div className="ph-cards">
                <div className="ph-card" />
                <div className="ph-card" />
                <div className="ph-card" />
              </div>
            </div>
          </div>
        )}
      </div>
      <div className="breakpoint-info">
        <span className="breakpoint-name">{bp}</span>
        {overflowCount > 0 ? (
          <span className="overflow-badge">{overflowCount} 溢出</span>
        ) : (
          <span className="ok-badge">OK</span>
        )}
      </div>
    </div>
  );
}

interface ControlPanelProps {
  htmlCode: string;
  cssCode: string;
  setHtmlCode: (code: string) => void;
  setCssCode: (code: string) => void;
  fontScale: number;
  lineHeightScale: number;
  containerPadding: number;
  setFontScale: (v: number) => void;
  setLineHeightScale: (v: number) => void;
  setContainerPadding: (v: number) => void;
  selectedBreakpoint: number | null;
  setSelectedBreakpoint: (bp: number | null) => void;
  overflowMap: Record<number, OverflowElement[]>;
  iframesRef: React.MutableRefObject<Record<number, HTMLIFrameElement | null>>;
  onRequestReanalyze: () => void;
}

export default function ControlPanel({
  htmlCode,
  cssCode,
  setHtmlCode,
  setCssCode,
  fontScale,
  lineHeightScale,
  containerPadding,
  setFontScale,
  setLineHeightScale,
  setContainerPadding,
  selectedBreakpoint,
  setSelectedBreakpoint,
  overflowMap,
  iframesRef,
  onRequestReanalyze,
}: ControlPanelProps) {
  const [activeTab, setActiveTab] = useState<'code' | 'params'>('code');

  const handleExportPNG = useCallback(async () => {
    const bp = selectedBreakpoint ?? 1024;
    const iframe = iframesRef.current[bp];
    const overflowElements = overflowMap[bp] || [];
    if (iframe) {
      try {
        await exportAsPNG(iframe, overflowElements, bp, `layout-report-${bp}px.png`);
      } catch (err) {
        console.error('Export PNG failed:', err);
      }
    }
  }, [selectedBreakpoint, overflowMap, iframesRef]);

  const handleExportJSON = useCallback(async () => {
    const reportData: ExportReportData = {
      exportedAt: new Date().toISOString(),
      breakpoints: BREAKPOINTS.map((bp) => ({
        viewportWidth: bp,
        overflowElements: overflowMap[bp] || [],
        totalOverflow: (overflowMap[bp] || []).length,
      })),
      fontScale,
      lineHeightScale,
      containerPadding,
      htmlCode,
      cssCode,
    };
    await exportAsJSON(reportData);
  }, [overflowMap, fontScale, lineHeightScale, containerPadding, htmlCode, cssCode]);

  const handleIframeRef = useCallback(
    (bp: number, el: HTMLIFrameElement | null) => {
      iframesRef.current[bp] = el;
    },
    [iframesRef]
  );

  const cards = useMemo(
    () =>
      BREAKPOINTS.map((bp) => (
        <LazyBreakpointCard
          key={bp}
          bp={bp}
          htmlCode={htmlCode}
          cssCode={cssCode}
          fontScale={fontScale}
          lineHeightScale={lineHeightScale}
          containerPadding={containerPadding}
          overflowCount={(overflowMap[bp] || []).length}
          selected={selectedBreakpoint === bp}
          onIframeRef={handleIframeRef}
          onClick={() =>
            setSelectedBreakpoint(selectedBreakpoint === bp ? null : bp)
          }
        />
      )),
    [
      htmlCode,
      cssCode,
      fontScale,
      lineHeightScale,
      containerPadding,
      overflowMap,
      selectedBreakpoint,
      handleIframeRef,
      setSelectedBreakpoint,
    ]
  );

  return (
    <div className="control-panel">
      <div className="panel-header">
        <h1 className="app-title">布局诊断工具</h1>
        <p className="app-subtitle">Responsive Layout Diagnostic</p>
      </div>

      <div className="breakpoint-grid-section">
        <div className="section-title">断点预览（点击进入详情）</div>
        <div className="breakpoint-cards">{cards}</div>
      </div>

      <div className="tabs">
        <button
          className={`tab-btn ${activeTab === 'code' ? 'active' : ''}`}
          onClick={() => setActiveTab('code')}
        >
          代码输入
        </button>
        <button
          className={`tab-btn ${activeTab === 'params' ? 'active' : ''}`}
          onClick={() => setActiveTab('params')}
        >
          参数控制
        </button>
      </div>

      <div className="tab-content">
        {activeTab === 'code' && (
          <div className="code-section">
            <div className="code-group">
              <label className="code-label">HTML 代码</label>
              <textarea
                className="code-editor"
                value={htmlCode}
                onChange={(e) => setHtmlCode(e.target.value)}
                spellCheck={false}
                placeholder="粘贴HTML代码..."
              />
            </div>
            <div className="code-group">
              <label className="code-label">CSS 代码</label>
              <textarea
                className="code-editor css-editor"
                value={cssCode}
                onChange={(e) => setCssCode(e.target.value)}
                spellCheck={false}
                placeholder="粘贴CSS代码，或在HTML中使用内联/style标签..."
              />
            </div>
            <button className="analyze-btn" onClick={onRequestReanalyze}>
              🔍 重新分析布局
            </button>
          </div>
        )}

        {activeTab === 'params' && (
          <div className="params-section">
            <KnobSlider
              label="字体缩放率"
              value={fontScale}
              min={0.75}
              max={1.5}
              step={0.05}
              unit="x"
              onChange={setFontScale}
            />
            <KnobSlider
              label="行高倍率"
              value={lineHeightScale}
              min={1.0}
              max={2.0}
              step={0.1}
              unit="x"
              onChange={setLineHeightScale}
            />
            <KnobSlider
              label="容器内边距"
              value={containerPadding}
              min={0}
              max={40}
              step={2}
              unit="px"
              onChange={setContainerPadding}
            />
          </div>
        )}
      </div>

      <div className="export-section">
        <div className="section-title">导出报告</div>
        <div className="export-buttons">
          <button className="export-btn png-btn" onClick={handleExportPNG}>
            📷 导出 PNG 截图
          </button>
          <button className="export-btn json-btn" onClick={handleExportJSON}>
            📄 导出 JSON 报告
          </button>
        </div>
      </div>
    </div>
  );
}
