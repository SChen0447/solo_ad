import React, { useCallback } from 'react';
import type { BreakpointResult, OverflowElement } from '../modules/analyzer';
import { BREAKPOINTS, buildFullHtml } from '../modules/analyzer';
import { exportToPng, exportToJson } from '../modules/exporter';

interface ControlPanelProps {
  htmlCode: string;
  cssCode: string;
  onHtmlChange: (value: string) => void;
  onCssChange: (value: string) => void;
  fontScale: number;
  lineHeight: number;
  padding: number;
  onFontScaleChange: (value: number) => void;
  onLineHeightChange: (value: number) => void;
  onPaddingChange: (value: number) => void;
  selectedBreakpoint: number | null;
  onBreakpointSelect: (breakpoint: number | null) => void;
  analysisData: Record<string, BreakpointResult>;
  iframeRefs: React.MutableRefObject<Record<number, HTMLIFrameElement | null>>;
}

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  onChange: (value: number) => void;
}

const Slider: React.FC<SliderProps> = ({ label, value, min, max, step, unit, onChange }) => {
  const percentage = ((value - min) / (max - min)) * 100;

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const track = e.currentTarget as HTMLElement;
    const startX = e.clientX;
    const startValue = value;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const delta = moveEvent.clientX - startX;
      const trackRect = track.getBoundingClientRect();
      const deltaPercent = delta / trackRect.width;
      const newValue = Math.min(max, Math.max(min, startValue + deltaPercent * (max - min)));
      const roundedValue = Math.round(newValue / step) * step;
      onChange(Number(roundedValue.toFixed(2)));
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [value, min, max, step, onChange]);

  const handleTrackClick = useCallback((e: React.MouseEvent) => {
    const track = e.currentTarget as HTMLElement;
    const rect = track.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = clickX / rect.width;
    const newValue = min + percentage * (max - min);
    const roundedValue = Math.round(newValue / step) * step;
    onChange(Number(roundedValue.toFixed(2)));
  }, [min, max, step, onChange]);

  const displayValue = unit === 'x' ? `${value}${unit}` : `${value}${unit}`;

  return (
    <div className="slider-group">
      <div className="slider-header">
        <span className="slider-label">{label}</span>
        <span className="slider-value">{displayValue}</span>
      </div>
      <div className="slider-track" onClick={handleTrackClick}>
        <div className="slider-track-filled" style={{ width: `${percentage}%` }} />
        <div
          className="slider-thumb"
          style={{ left: `${percentage}%` }}
          onMouseDown={handleMouseDown}
        />
      </div>
    </div>
  );
};

export const ControlPanel: React.FC<ControlPanelProps> = ({
  htmlCode,
  cssCode,
  onHtmlChange,
  onCssChange,
  fontScale,
  lineHeight,
  padding,
  onFontScaleChange,
  onLineHeightChange,
  onPaddingChange,
  selectedBreakpoint,
  onBreakpointSelect,
  analysisData,
  iframeRefs
}) => {
  const handleExportPng = useCallback(async () => {
    if (!selectedBreakpoint) return;
    const iframe = iframeRefs.current[selectedBreakpoint];
    if (!iframe) return;
    const data = analysisData[String(selectedBreakpoint)];
    await exportToPng(iframe, data?.overflowElements || [], selectedBreakpoint);
  }, [selectedBreakpoint, analysisData, iframeRefs]);

  const handleExportJson = useCallback(() => {
    exportToJson(analysisData, { fontScale, lineHeight, padding });
  }, [analysisData, fontScale, lineHeight, padding]);

  return (
    <div className="control-panel">
      <div>
        <h1 className="panel-title">布局诊断工具</h1>
        <p className="panel-subtitle">响应式布局溢出检测与分析</p>
      </div>

      {selectedBreakpoint && (
        <button className="back-btn" onClick={() => onBreakpointSelect(null)}>
          ← 返回网格视图
        </button>
      )}

      <div className="code-input-section">
        <label className="code-label">HTML 代码</label>
        <textarea
          className="code-textarea"
          placeholder="粘贴HTML代码，支持内联样式..."
          value={htmlCode}
          onChange={(e) => onHtmlChange(e.target.value)}
        />
        <label className="code-label">CSS 代码</label>
        <textarea
          className="code-textarea"
          placeholder="粘贴CSS代码..."
          value={cssCode}
          onChange={(e) => onCssChange(e.target.value)}
        />
      </div>

      <div className="breakpoint-grid-section">
        <h2 className="section-title">断点网格视图</h2>
        <div className="breakpoint-grid">
          {BREAKPOINTS.map((bp) => {
            const data = analysisData[String(bp)];
            const overflowCount = data?.totalOverflow || 0;
            return (
              <div
                key={bp}
                className={`breakpoint-card ${selectedBreakpoint === bp ? 'active' : ''}`}
                onClick={() => onBreakpointSelect(bp)}
              >
                <iframe
                  ref={(el) => { iframeRefs.current[bp] = el; }}
                  className="breakpoint-preview-iframe"
                  srcDoc={buildFullHtml(htmlCode, cssCode, { fontScale, lineHeight, padding })}
                  title={`${bp}px preview`}
                />
                <div className="breakpoint-badge">{bp}px</div>
                <div className={`overflow-count-badge ${overflowCount === 0 ? 'zero' : ''}`}>
                  {overflowCount}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="sliders-section">
        <h2 className="section-title">字体与间距配置</h2>
        <Slider
          label="字体缩放率"
          value={fontScale}
          min={0.75}
          max={1.5}
          step={0.05}
          unit="x"
          onChange={onFontScaleChange}
        />
        <Slider
          label="行高倍率"
          value={lineHeight}
          min={1.0}
          max={2.0}
          step={0.1}
          unit="x"
          onChange={onLineHeightChange}
        />
        <Slider
          label="容器内边距"
          value={padding}
          min={0}
          max={40}
          step={2}
          unit="px"
          onChange={onPaddingChange}
        />
      </div>

      <div className="export-section">
        <h2 className="section-title">导出报告</h2>
        <div className="export-buttons">
          <button
            className="export-btn"
            onClick={handleExportPng}
            disabled={!selectedBreakpoint}
            title={!selectedBreakpoint ? '请先选择一个断点' : ''}
          >
            📸 导出 PNG
          </button>
          <button className="export-btn secondary" onClick={handleExportJson}>
            📄 导出 JSON
          </button>
        </div>
      </div>
    </div>
  );
};
