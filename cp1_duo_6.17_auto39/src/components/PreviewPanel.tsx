import { useEffect, useRef, useState, useCallback } from 'react';
import type { OverflowElement } from '../modules/analyzer';
import { analyzeDom } from '../modules/analyzer';

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

  if (doc.body.innerHTML !== htmlCode) {
    doc.body.innerHTML = htmlCode;
  }
}

function OverflowOverlay({
  element,
  containerScale,
}: {
  element: OverflowElement;
  containerScale: number;
}) {
  const markerLeft = (element.offsetLeft + element.parentWidth) * containerScale;
  const markerTop = (element.offsetTop + element.parentHeight) * containerScale;
  const markerWidth = Math.max(element.overflowX * containerScale, 24);
  const markerHeight = Math.max(element.overflowY * containerScale, 20);

  const horizontalOverlayLeft = (element.offsetLeft + element.parentWidth) * containerScale;
  const horizontalOverlayTop = element.offsetTop * containerScale;
  const horizontalOverlayWidth = element.overflowX * containerScale;
  const horizontalOverlayHeight = element.actualHeight * containerScale;

  const verticalOverlayLeft = element.offsetLeft * containerScale;
  const verticalOverlayTop = (element.offsetTop + element.parentHeight) * containerScale;
  const verticalOverlayWidth = element.actualWidth * containerScale;
  const verticalOverlayHeight = element.overflowY * containerScale;

  const hasHorizontal = element.overflowX > 0.5;
  const hasVertical = element.overflowY > 0.5;

  return (
    <div className="overflow-marker-group" style={{ pointerEvents: 'none' }}>
      {hasHorizontal && (
        <div
          className="overflow-mask horizontal-mask"
          style={{
            left: horizontalOverlayLeft,
            top: horizontalOverlayTop,
            width: horizontalOverlayWidth,
            height: horizontalOverlayHeight,
          }}
        />
      )}
      {hasVertical && (
        <div
          className="overflow-mask vertical-mask"
          style={{
            left: verticalOverlayLeft,
            top: verticalOverlayTop,
            width: verticalOverlayWidth,
            height: verticalOverlayHeight,
          }}
        />
      )}
      <div
        className="overflow-value-label"
        style={{
          left: markerLeft + 4,
          top: markerTop + 4,
        }}
      >
        {hasHorizontal && <span className="overflow-val-x">→ {element.overflowX.toFixed(1)}px</span>}
        {hasHorizontal && hasVertical && <br />}
        {hasVertical && <span className="overflow-val-y">↓ {element.overflowY.toFixed(1)}px</span>}
      </div>
    </div>
  );
}

interface DetailViewProps {
  viewportWidth: number;
  htmlCode: string;
  cssCode: string;
  fontScale: number;
  lineHeightScale: number;
  containerPadding: number;
  overflowElements: OverflowElement[];
  onIframeRef: (el: HTMLIFrameElement | null) => void;
  onAnalyze: () => void;
}

function DetailView({
  viewportWidth,
  htmlCode,
  cssCode,
  fontScale,
  lineHeightScale,
  containerPadding,
  overflowElements,
  onIframeRef,
  onAnalyze,
}: DetailViewProps) {
  const detailIframeRef = useRef<HTMLIFrameElement | null>(null);
  const [detailScale, setDetailScale] = useState(0.8);
  const containerRef = useRef<HTMLDivElement>(null);
  const viewportHeight = viewportWidth * 0.7;

  useEffect(() => {
    const updateScale = () => {
      if (containerRef.current) {
        const availableWidth = containerRef.current.clientWidth - 60;
        const availableHeight = containerRef.current.clientHeight - 260;
        const scaleX = availableWidth / viewportWidth;
        const scaleY = availableHeight / viewportHeight;
        setDetailScale(Math.min(1, scaleX, scaleY, 1));
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
        setTimeout(() => onAnalyze(), 50);
      }
    };

    iframe.addEventListener('load', handleLoad);
    return () => iframe.removeEventListener('load', handleLoad);
  }, [htmlCode, cssCode, fontScale, lineHeightScale, containerPadding, onAnalyze]);

  const handleRef = useCallback(
    (el: HTMLIFrameElement | null) => {
      detailIframeRef.current = el;
      onIframeRef(el);
    },
    [onIframeRef]
  );

  return (
    <div className="detail-view" ref={containerRef}>
      <div className="detail-header">
        <h2>
          <span className="detail-badge">{viewportWidth}px</span>
          独立预览视图
        </h2>
        <div className="detail-stats">
          <div className="stat-item">
            <span className="stat-label">溢出元素</span>
            <span
              className={`stat-value ${overflowElements.length > 0 ? 'warning' : 'success'}`}
            >
              {overflowElements.length}
            </span>
          </div>
          <div className="stat-item">
            <span className="stat-label">字体缩放</span>
            <span className="stat-value">{fontScale.toFixed(2)}x</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">行高</span>
            <span className="stat-value">{lineHeightScale.toFixed(1)}x</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">内边距</span>
            <span className="stat-value">{containerPadding}px</span>
          </div>
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
              ref={handleRef}
              title="detail-preview"
              className="detail-iframe"
              style={{
                width: viewportWidth,
                height: viewportHeight,
              }}
              sandbox="allow-same-origin allow-scripts"
            />
            <div
              className="overflow-overlay"
              style={{
                width: viewportWidth,
                height: viewportHeight,
              }}
            >
              {overflowElements.map((el, idx) => (
                <OverflowOverlay key={idx} element={el} containerScale={1} />
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
                  <span
                    className={`report-direction dir-${el.overflowDirection
                      .split(', ')
                      .join('-')}`}
                  >
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
                    溢出:{' '}
                    <strong className="overflow-value-text">
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
  );
}

interface GridViewProps {
  breakpoints: number[];
}

function GridView({ breakpoints }: GridViewProps) {
  return (
    <div className="grid-view">
      <div className="grid-header">
        <h2>断点网格视图</h2>
        <p className="grid-subtitle">
          从左侧控制面板中点击任意断点卡片，即可进入详情视图查看完整的溢出标记和报告
        </p>
      </div>
      <div className="grid-placeholder">
        <div className="grid-illustration">
          <div className="phone-device">
            <div className="device-screen small">
              <div className="mock-header" />
              <div className="mock-content">
                <div className="mock-line short" />
                <div className="mock-line long" />
                <div className="mock-line medium" />
              </div>
            </div>
            <span className="device-label">320px</span>
          </div>
          <div className="arrow">→</div>
          <div className="tablet-device">
            <div className="device-screen medium">
              <div className="mock-header" />
              <div className="mock-content">
                <div className="mock-line short" />
                <div className="mock-line long" />
                <div className="mock-line medium" />
                <div className="mock-cards">
                  <div className="mock-card" />
                  <div className="mock-card" />
                </div>
              </div>
            </div>
            <span className="device-label">768px</span>
          </div>
          <div className="arrow">→</div>
          <div className="desktop-device">
            <div className="device-screen large">
              <div className="mock-header" />
              <div className="mock-content">
                <div className="mock-line short" />
                <div className="mock-line long" />
                <div className="mock-cards">
                  <div className="mock-card" />
                  <div className="mock-card" />
                  <div className="mock-card" />
                </div>
              </div>
            </div>
            <span className="device-label">1440px</span>
          </div>
        </div>
        <p className="grid-hint">
          👈 在左侧选择一个断点卡片开始详细诊断
        </p>
        <p className="grid-hint-secondary">
          共 {breakpoints.length} 个预设断点：{breakpoints.map((bp) => `${bp}px`).join(' / ')}
        </p>
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
  const handleDetailIframeRef = useCallback(
    (el: HTMLIFrameElement | null) => {
      onIframeRef(selectedBreakpoint ?? 1024, el);
    },
    [selectedBreakpoint, onIframeRef]
  );

  const handleAnalyze = useCallback(() => {
    const bp = selectedBreakpoint ?? 1024;
    const iframe = document.querySelector(
      `iframe[title="detail-preview"]`
    ) as HTMLIFrameElement | null;
    if (iframe) {
      const doc = iframe.contentDocument || iframe.contentWindow?.document;
      if (doc) {
        const result = analyzeDom(doc, bp, fontScale, lineHeightScale, containerPadding);
        onOverflowDetected(bp, result);
      }
    }
  }, [selectedBreakpoint, fontScale, lineHeightScale, containerPadding, onOverflowDetected]);

  return (
    <div className="preview-panel">
      {selectedBreakpoint === null ? (
        <GridView breakpoints={breakpoints} />
      ) : (
        <DetailView
          viewportWidth={selectedBreakpoint}
          htmlCode={htmlCode}
          cssCode={cssCode}
          fontScale={fontScale}
          lineHeightScale={lineHeightScale}
          containerPadding={containerPadding}
          overflowElements={overflowElements}
          onIframeRef={handleDetailIframeRef}
          onAnalyze={handleAnalyze}
        />
      )}
    </div>
  );
}
