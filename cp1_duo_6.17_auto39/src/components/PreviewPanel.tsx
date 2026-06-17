import { useEffect, useRef, useState } from 'react';
import type { OverflowElement } from '../modules/analyzer';

interface PreviewPanelProps {
  htmlCode: string;
  cssCode: string;
  breakpoints: number[];
  selectedBreakpoint: number | null;
  fontScale: number;
  lineHeightScale: number;
  containerPadding: number;
  onIframeRef: (bp: number, iframe: HTMLIFrameElement | null) => void;
  onOverflowDetected: (bp: number, elements: OverflowElement[]) => void;
  overflowElements: OverflowElement[];
}

function injectStylesIntoIframe(
  doc: Document,
  htmlCode: string,
  cssCode: string,
  fontScale: number,
  lineHeightScale: number,
  containerPadding: number
) {
  const styleTagId = '__diagnostic_injected_styles__';
  let styleEl = doc.getElementById(styleTagId) as HTMLStyleElement | null;
  if (!styleEl) {
    styleEl = doc.createElement('style');
    styleEl.id = styleTagId;
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
      font-family: system-ui, -apple-system, sans-serif;
    }
    *, *::before, *::after {
      box-sizing: inherit;
    }
  `;

  const bodyContent = htmlCode;
  if (doc.body.innerHTML !== bodyContent) {
    doc.body.innerHTML = bodyContent;
  }
}

function BreakpointThumbnail({
  bp,
  htmlCode,
  cssCode,
  fontScale,
  lineHeightScale,
  containerPadding,
  onRef,
  overflowCount,
  selected,
  onClick,
}: {
  bp: number;
  htmlCode: string;
  cssCode: string;
  fontScale: number;
  lineHeightScale: number;
  containerPadding: number;
  onRef: (el: HTMLIFrameElement | null) => void;
  overflowCount: number;
  selected: boolean;
  onClick: () => void;
}) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const scale = bp > 1024 ? 140 / bp : 140 / 1024;
  const displayWidth = Math.min(bp * scale, 180);
  const displayHeight = displayWidth * 0.7;

  const handleRef = (el: HTMLIFrameElement | null) => {
    iframeRef.current = el;
    onRef(el);
  };

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (doc) {
      injectStylesIntoIframe(doc, htmlCode, cssCode, fontScale, lineHeightScale, containerPadding);
    }
  }, [htmlCode, cssCode, fontScale, lineHeightScale, containerPadding]);

  return (
    <div
      className={`thumbnail-wrapper ${selected ? 'active' : ''}`}
      onClick={onClick}
      style={{
        width: displayWidth + 20,
        height: displayHeight + 40,
      }}
    >
      <div className="thumbnail-header">
        <span className="thumbnail-width">{bp}px</span>
        {overflowCount > 0 ? (
          <span className="thumbnail-overflow">{overflowCount} 溢出</span>
        ) : (
          <span className="thumbnail-ok">✓</span>
        )}
      </div>
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
            height: bp * 0.7,
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
          }}
          sandbox="allow-same-origin allow-scripts"
        />
      </div>
    </div>
  );
}

function OverlayMarker({
  element,
  containerWidth,
  containerHeight,
  scale,
}: {
  element: OverflowElement;
  containerWidth: number;
  containerHeight: number;
  scale: number;
}) {
  const left = Math.min(0, element.parentWidth - element.actualWidth);
  const top = Math.min(0, element.parentHeight - element.actualHeight);
  const markerLeft = element.overflowX > 0 ? (element.parentWidth - 4) * scale : 0;
  const markerTop = element.overflowY > 0 ? (element.parentHeight - 4) * scale : 0;
  const markerWidth = Math.max(element.overflowX * scale, 20);
  const markerHeight = Math.max(element.overflowY * scale, 20);

  return (
    <div className="overflow-marker" style={{ left: markerLeft, top: markerTop }}>
      <div
        className="overflow-mask"
        style={{
          width: markerWidth,
          height: markerHeight,
        }}
      />
      <div className="overflow-value">
        {element.overflowX > 0 && `${element.overflowX}px →`}
        {element.overflowX > 0 && element.overflowY > 0 && ' '}
        {element.overflowY > 0 && `↓ ${element.overflowY}px`}
      </div>
    </div>
  );
}

export default function PreviewPanel({
  htmlCode,
  cssCode,
  breakpoints,
  selectedBreakpoint,
  fontScale,
  lineHeightScale,
  containerPadding,
  onIframeRef,
  onOverflowDetected,
  overflowElements,
}: PreviewPanelProps) {
  const detailIframeRef = useRef<HTMLIFrameElement | null>(null);
  const [detailScale, setDetailScale] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);

  const viewportWidth = selectedBreakpoint ?? 1024;
  const viewportHeight = viewportWidth * 0.7;

  useEffect(() => {
    const updateScale = () => {
      if (containerRef.current) {
        const availableWidth = containerRef.current.clientWidth - 80;
        const availableHeight = containerRef.current.clientHeight - 280;
        const scaleX = availableWidth / viewportWidth;
        const scaleY = availableHeight / viewportHeight;
        setDetailScale(Math.min(1, scaleX, scaleY));
      }
    };
    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, [viewportWidth, viewportHeight]);

  useEffect(() => {
    const iframe = detailIframeRef.current;
    if (!iframe) return;
    const handleLoad = () => {
      const doc = iframe.contentDocument || iframe.contentWindow?.document;
      if (doc) {
        injectStylesIntoIframe(doc, htmlCode, cssCode, fontScale, lineHeightScale, containerPadding);
      }
    };
    iframe.addEventListener('load', handleLoad);
    return () => iframe.removeEventListener('load', handleLoad);
  }, []);

  useEffect(() => {
    const iframe = detailIframeRef.current;
    if (!iframe) return;
    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (doc && doc.readyState === 'complete') {
      injectStylesIntoIframe(doc, htmlCode, cssCode, fontScale, lineHeightScale, containerPadding);
    }
  }, [htmlCode, cssCode, fontScale, lineHeightScale, containerPadding]);

  const handleDetailIframeRef = (el: HTMLIFrameElement | null) => {
    detailIframeRef.current = el;
    onIframeRef(selectedBreakpoint ?? 1024, el);
  };

  return (
    <div className="preview-panel" ref={containerRef}>
      {!selectedBreakpoint ? (
        <div className="grid-view">
          <div className="grid-header">
            <h2>断点网格视图</h2>
            <p className="grid-subtitle">
              同时展示 {breakpoints.length} 个预设断点的渲染结果，点击卡片进入详情视图查看溢出标记
            </p>
          </div>
          <div className="thumbnails-grid">
            {breakpoints.map((bp) => (
              <BreakpointThumbnail
                key={bp}
                bp={bp}
                htmlCode={htmlCode}
                cssCode={cssCode}
                fontScale={fontScale}
                lineHeightScale={lineHeightScale}
                containerPadding={containerPadding}
                onRef={(el) => onIframeRef(bp, el)}
                overflowCount={0}
                selected={false}
                onClick={() => {}}
              />
            ))}
          </div>
        </div>
      ) : (
        <div className="detail-view">
          <div className="detail-header">
            <h2>
              <span className="detail-badge">{viewportWidth}px</span>
              独立预览视图
            </h2>
            <div className="detail-stats">
              <span className="stat-item">
                <span className="stat-label">溢出元素</span>
                <span
                  className={`stat-value ${overflowElements.length > 0 ? 'warning' : 'success'}`}
                >
                  {overflowElements.length}
                </span>
              </span>
              <span className="stat-item">
                <span className="stat-label">字体缩放</span>
                <span className="stat-value">{fontScale.toFixed(2)}x</span>
              </span>
              <span className="stat-item">
                <span className="stat-label">行高</span>
                <span className="stat-value">{lineHeightScale.toFixed(1)}x</span>
              </span>
              <span className="stat-item">
                <span className="stat-label">内边距</span>
                <span className="stat-value">{containerPadding}px</span>
              </span>
            </div>
          </div>

          <div className="detail-viewport-container">
            <div
              className="detail-viewport-frame"
              style={{
                width: viewportWidth * detailScale,
                height: viewportHeight * detailScale,
              }}
            >
              <div
                className="detail-iframe-wrapper"
                style={{
                  width: viewportWidth,
                  height: viewportHeight,
                  transform: `scale(${detailScale})`,
                }}
              >
                <iframe
                  ref={handleDetailIframeRef}
                  title="detail-preview"
                  className="detail-iframe"
                  style={{
                    width: viewportWidth,
                    height: viewportHeight,
                  }}
                  sandbox="allow-same-origin allow-scripts"
                />
                <div className="overflow-overlay">
                  {overflowElements.map((el, idx) => (
                    <OverlayMarker
                      key={idx}
                      element={el}
                      containerWidth={viewportWidth}
                      containerHeight={viewportHeight}
                      scale={1}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="overflow-report">
            <h3>📋 溢出报告</h3>
            {overflowElements.length === 0 ? (
              <div className="report-empty">
                ✅ 未检测到溢出问题，布局在 {viewportWidth}px 视口下表现良好
              </div>
            ) : (
              <div className="report-list">
                {overflowElements.map((el, idx) => (
                  <div key={idx} className="report-item">
                    <div className="report-item-header">
                      <span className="report-selector">{el.selector}</span>
                      <span className={`report-direction dir-${el.overflowDirection.replace(', ', '-')}`}>
                        {el.overflowDirection}
                      </span>
                    </div>
                    <div className="report-dimensions">
                      <span>
                        实际: <strong>{el.actualWidth}×{el.actualHeight}px</strong>
                      </span>
                      <span>
                        父容器: <strong>{el.parentWidth}×{el.parentHeight}px</strong>
                      </span>
                      <span>
                        溢出: <strong className="overflow-value-text">
                          {el.overflowX > 0 && `X=${el.overflowX}px`}
                          {el.overflowX > 0 && el.overflowY > 0 && ', '}
                          {el.overflowY > 0 && `Y=${el.overflowY}px`}
                        </strong>
                      </span>
                    </div>
                    <ul className="report-suggestions">
                      {el.suggestions.map((s, sIdx) => (
                        <li key={sIdx}>💡 {s}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
