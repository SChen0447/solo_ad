import React, { useEffect, useState, useCallback, useRef } from 'react';
import type { OverflowElement, BreakpointResult, AnalyzerConfig } from '../modules/analyzer';
import { BREAKPOINTS, analyzeOverflowInDocument, buildFullHtml } from '../modules/analyzer';

interface PreviewPanelProps {
  htmlCode: string;
  cssCode: string;
  config: AnalyzerConfig;
  selectedBreakpoint: number | null;
  analysisData: Record<string, BreakpointResult>;
  onAnalysisUpdate: (data: Record<string, BreakpointResult>) => void;
}

interface OverflowMarker {
  id: string;
  left: number;
  top: number;
  width: number;
  height: number;
  overflowX: number;
  overflowY: number;
  element: OverflowElement;
}

export const PreviewPanel: React.FC<PreviewPanelProps> = ({
  htmlCode,
  cssCode,
  config,
  selectedBreakpoint,
  analysisData,
  onAnalysisUpdate
}) => {
  const [overflowMarkers, setOverflowMarkers] = useState<OverflowMarker[]>([]);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const animationFrameRef = useRef<number>();
  const lastUpdateRef = useRef<number>(0);

  const analyzeIframeContent = useCallback(() => {
    const iframe = iframeRef.current;
    if (!iframe || !iframe.contentDocument || !selectedBreakpoint) return;

    const now = performance.now();
    if (now - lastUpdateRef.current < 41) return;
    lastUpdateRef.current = now;

    try {
      const overflowElements = analyzeOverflowInDocument(iframe.contentDocument, config);
      const markers: OverflowMarker[] = [];
      const doc = iframe.contentDocument;
      const body = doc.body;
      const rect = body.getBoundingClientRect();
      const scale = Math.min(1, (1000) / selectedBreakpoint);

      overflowElements.forEach((elem, index) => {
        const target = doc.querySelector(elem.selector) as HTMLElement;
        if (target) {
          const targetRect = target.getBoundingClientRect();
          const bodyRect = body.getBoundingClientRect();
          const relativeLeft = (targetRect.left - bodyRect.left) * scale;
          const relativeTop = (targetRect.top - bodyRect.top) * scale;
          const scaledWidth = (elem.overflowX > 0 ? elem.parentWidth + elem.overflowX : targetRect.width) * scale;
          const scaledHeight = (elem.overflowY > 0 ? elem.parentHeight + elem.overflowY : targetRect.height) * scale;

          markers.push({
            id: `overflow-${index}`,
            left: relativeLeft,
            top: relativeTop,
            width: scaledWidth,
            height: scaledHeight,
            overflowX: elem.overflowX,
            overflowY: elem.overflowY,
            element: elem
          });
        }
      });

      setOverflowMarkers(markers);
    } catch (e) {
      console.warn('Failed to analyze iframe content:', e);
    }
  }, [selectedBreakpoint, config]);

  useEffect(() => {
    if (!selectedBreakpoint) {
      setOverflowMarkers([]);
      return;
    }

    const updateAnalysis = () => {
      analyzeIframeContent();
      animationFrameRef.current = requestAnimationFrame(updateAnalysis);
    };

    animationFrameRef.current = requestAnimationFrame(updateAnalysis);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [selectedBreakpoint, analyzeIframeContent]);

  useEffect(() => {
    if (!htmlCode || !cssCode) return;

    const debounceTimer = setTimeout(() => {
      const newData: Record<string, BreakpointResult> = {};
      BREAKPOINTS.forEach((bp) => {
        const existing = analysisData[String(bp)];
        newData[String(bp)] = existing || {
          breakpoint: bp,
          overflowElements: [],
          totalOverflow: 0
        };
      });
      onAnalysisUpdate(newData);
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [htmlCode, cssCode, config, analysisData, onAnalysisUpdate]);

  const currentData = selectedBreakpoint ? analysisData[String(selectedBreakpoint)] : null;
  const overflowElements = currentData?.overflowElements || [];

  return (
    <div className="preview-panel">
      <div className="preview-header">
        <span className="preview-title">
          {selectedBreakpoint ? `断点详情视图 - ${selectedBreakpoint}px` : '断点网格视图'}
        </span>
        <span className="preview-info">
          {selectedBreakpoint
            ? `检测到 ${overflowElements.length} 个溢出元素`
            : '共 8 个预设断点，点击卡片查看详情'}
        </span>
      </div>

      <div className="preview-content">
        {!selectedBreakpoint ? (
          <div className="preview-grid-view">
            <div className="grid-header">
              <h2 className="grid-title">响应式布局诊断平台</h2>
              <p className="grid-desc">
                在左侧输入 HTML 和 CSS 代码，系统将自动检测每个断点下的布局溢出问题
              </p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '24px', width: '100%', maxWidth: '1200px' }}>
              {BREAKPOINTS.map((bp) => {
                const data = analysisData[String(bp)];
                const count = data?.totalOverflow || 0;
                return (
                  <div key={bp} style={{
                    background: '#ffffff',
                    borderRadius: '12px',
                    padding: '16px',
                    boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
                    border: count > 0 ? '2px solid #fee2e2' : '2px solid #d1fae5',
                    textAlign: 'center'
                  }}>
                    <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#4a6fa5', marginBottom: '8px' }}>
                      {bp}px
                    </div>
                    <div style={{
                      fontSize: count > 0 ? '16px' : '14px',
                      fontWeight: '700',
                      color: count > 0 ? '#ef4444' : '#10b981',
                      background: count > 0 ? '#fef2f2' : '#f0fdf4',
                      padding: '6px 12px',
                      borderRadius: '20px',
                      display: 'inline-block'
                    }}>
                      {count > 0 ? `${count} 个溢出` : '无溢出'}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="detail-view">
            <div className="detail-preview-wrapper">
              <div className="detail-preview-header">
                <h3 className="detail-breakpoint-label">
                  当前视口宽度：<span>{selectedBreakpoint}px</span>
                </h3>
                <span className={`detail-overflow-count ${overflowMarkers.length === 0 ? 'safe' : ''}`}>
                  {overflowMarkers.length > 0 ? `${overflowMarkers.length} 个溢出问题` : '布局正常'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'center', overflow: 'auto' }}>
                <div className="iframe-wrapper" style={{ width: selectedBreakpoint }}>
                  <iframe
                    ref={iframeRef}
                    className="detail-iframe"
                    srcDoc={buildFullHtml(htmlCode, cssCode, config)}
                    title={`${selectedBreakpoint}px detailed preview`}
                    style={{ width: selectedBreakpoint, height: 800 }}
                  />
                  {overflowMarkers.map((marker) => (
                    <div
                      key={marker.id}
                      className="overflow-marker"
                      style={{
                        left: marker.left,
                        top: marker.top,
                        width: marker.width,
                        height: marker.height
                      }}
                    >
                      <div className="overflow-marker-label">
                        {(marker.overflowX + marker.overflowY).toFixed(0)}px
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="overflow-report-section">
              <h3 className="report-title">溢出报告</h3>
              {overflowElements.length === 0 ? (
                <div className="no-overflow">
                  <div className="no-overflow-icon">✅</div>
                  <div className="no-overflow-text">
                    在此断点下未检测到布局溢出问题，页面渲染正常
                  </div>
                </div>
              ) : (
                <div className="overflow-list">
                  {overflowElements.map((elem, index) => (
                    <div key={index} className="overflow-item">
                      <div className="overflow-item-header">
                        <span className="overflow-selector">{elem.selector}</span>
                        <div className="overflow-types">
                          {elem.overflowType.map((type) => (
                            <span
                              key={type}
                              className={`overflow-type-badge ${type}`}
                            >
                              {type === 'horizontal' ? '水平溢出' : '垂直溢出'}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="overflow-dimensions">
                        <div>
                          实际尺寸：<span>{elem.actualWidth}px × {elem.actualHeight}px</span>
                        </div>
                        <div>
                          父容器：<span>{elem.parentWidth}px × {elem.parentHeight}px</span>
                        </div>
                        {elem.overflowX > 0 && (
                          <div>
                            水平溢出：<span>{elem.overflowX}px</span>
                          </div>
                        )}
                        {elem.overflowY > 0 && (
                          <div>
                            垂直溢出：<span>{elem.overflowY}px</span>
                          </div>
                        )}
                      </div>
                      <div className="overflow-suggestions">
                        <div className="suggestions-label">修复建议：</div>
                        <ul className="suggestions-list">
                          {elem.suggestions.map((suggestion, i) => (
                            <li key={i}>{suggestion}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
