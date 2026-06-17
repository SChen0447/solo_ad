import React, { useState, useRef, useCallback } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import ControlPanel, { BREAKPOINTS, DEFAULT_HTML, DEFAULT_CSS } from './components/ControlPanel';
import PreviewPanel from './components/PreviewPanel';
import type { OverflowElement } from './modules/analyzer';
import './styles.css';

function App() {
  const [htmlCode, setHtmlCode] = useState(DEFAULT_HTML);
  const [cssCode, setCssCode] = useState(DEFAULT_CSS);
  const [fontScale, setFontScale] = useState(1.0);
  const [lineHeightScale, setLineHeightScale] = useState(1.2);
  const [containerPadding, setContainerPadding] = useState(0);
  const [selectedBreakpoint, setSelectedBreakpoint] = useState<number | null>(null);
  const [overflowMap, setOverflowMap] = useState<Record<number, OverflowElement[]>>({});
  const iframesRef = useRef<Record<number, HTMLIFrameElement | null>>({});

  const handleOverflowDetected = useCallback((bp: number, elements: OverflowElement[]) => {
    setOverflowMap((prev) => ({
      ...prev,
      [bp]: elements,
    }));
  }, []);

  const handleIframeRef = useCallback((bp: number, iframe: HTMLIFrameElement | null) => {
    iframesRef.current[bp] = iframe;
  }, []);

  const handleRequestReanalyze = useCallback(() => {
    const bp = selectedBreakpoint ?? 1024;
    const iframe = iframesRef.current[bp];
    if (iframe) {
      const doc = iframe.contentDocument || iframe.contentWindow?.document;
      if (doc && doc.defaultView) {
        try {
          const win = doc.defaultView;
          const analyzeDom = (
            d: Document,
            vw: number,
            fs: number,
            lh: number,
            cp: number
          ): OverflowElement[] => {
            const results: OverflowElement[] = [];
            const allElements = d.querySelectorAll(
              'body *:not(script):not(style):not(meta):not(link):not(br):not(hr)'
            );
            allElements.forEach((el, index) => {
              const htmlEl = el as HTMLElement;
              const style = win.getComputedStyle(htmlEl);
              if (style.display === 'none' || style.display === 'contents') return;

              const parent = htmlEl.offsetParent as HTMLElement;
              if (!parent && htmlEl.tagName !== 'BODY') return;

              const parentWidth = parent ? parent.clientWidth : vw - cp * 2;
              const parentHeight = parent ? parent.clientHeight : vw * 0.7;

              const scaledWidth = htmlEl.offsetWidth * (1 + (fs - 1) * 0.3);
              const scaledHeight = htmlEl.offsetHeight * lh;

              const overflowX = Math.max(0, scaledWidth - parentWidth);
              const overflowY = Math.max(0, scaledHeight - parentHeight);

              if (overflowX > 0.5 || overflowY > 0.5) {
                const directions: string[] = [];
                if (overflowX > 0.5) directions.push('horizontal');
                if (overflowY > 0.5) directions.push('vertical');

                results.push({
                  selector: generateSelector(htmlEl),
                  tag: htmlEl.tagName.toLowerCase(),
                  actualWidth: Math.round(scaledWidth * 10) / 10,
                  actualHeight: Math.round(scaledHeight * 10) / 10,
                  parentWidth: Math.round(parentWidth * 10) / 10,
                  parentHeight: Math.round(parentHeight * 10) / 10,
                  overflowX: Math.round(overflowX * 10) / 10,
                  overflowY: Math.round(overflowY * 10) / 10,
                  overflowDirection: directions.join(', '),
                  suggestions: generateSuggestions(directions, style),
                  index,
                  offsetLeft: htmlEl.offsetLeft,
                  offsetTop: htmlEl.offsetTop,
                  scrollLeft: parent ? parent.scrollLeft : 0,
                  scrollTop: parent ? parent.scrollTop : 0,
                  parentBorderLeft: 0,
                  parentBorderTop: 0,
                  parentPaddingLeft: 0,
                  parentPaddingTop: 0,
                });
              }
            });
            return results;
          };

          const generateSelector = (el: HTMLElement): string => {
            if (el.id) return `#${el.id}`;
            let selector = el.tagName.toLowerCase();
            if (el.className && typeof el.className === 'string') {
              const cls = el.className.trim().split(/\s+/)[0];
              if (cls) selector += `.${cls}`;
            }
            return selector;
          };

          const generateSuggestions = (dirs: string[], style: CSSStyleDeclaration): string[] => {
            const sugs: string[] = [];
            if (dirs.includes('horizontal')) {
              sugs.push('考虑设置 width: 100% 或 max-width: 100% 限制元素宽度');
              sugs.push('检查 padding/margin 是否使用了固定像素值');
              if (style.boxSizing !== 'border-box') {
                sugs.push('使用 box-sizing: border-box 确保内边距包含在宽度内');
              }
            }
            if (dirs.includes('vertical')) {
              sugs.push('考虑设置 overflow: auto 或 overflow: hidden 处理纵向溢出');
              sugs.push('检查子元素高度是否超出父容器限制');
            }
            return sugs.length > 0 ? sugs : ['检查元素尺寸和父容器约束关系'];
          };

          const results = analyzeDom(doc, bp, fontScale, lineHeightScale, containerPadding);
          handleOverflowDetected(bp, results);
        } catch (e) {
          console.error('Analyze error:', e);
        }
      }
    }
  }, [selectedBreakpoint, fontScale, lineHeightScale, containerPadding, handleOverflowDetected]);

  return (
    <div className="app-container">
      <ControlPanel
        htmlCode={htmlCode}
        cssCode={cssCode}
        setHtmlCode={setHtmlCode}
        setCssCode={setCssCode}
        fontScale={fontScale}
        lineHeightScale={lineHeightScale}
        containerPadding={containerPadding}
        setFontScale={setFontScale}
        setLineHeightScale={setLineHeightScale}
        setContainerPadding={setContainerPadding}
        selectedBreakpoint={selectedBreakpoint}
        setSelectedBreakpoint={setSelectedBreakpoint}
        overflowMap={overflowMap}
        iframesRef={iframesRef}
        onRequestReanalyze={handleRequestReanalyze}
      />
      <PreviewPanel
        htmlCode={htmlCode}
        cssCode={cssCode}
        breakpoints={BREAKPOINTS}
        selectedBreakpoint={selectedBreakpoint}
        fontScale={fontScale}
        lineHeightScale={lineHeightScale}
        containerPadding={containerPadding}
        onIframeRef={handleIframeRef}
        onOverflowDetected={handleOverflowDetected}
        overflowElements={selectedBreakpoint ? overflowMap[selectedBreakpoint] || [] : []}
      />
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
