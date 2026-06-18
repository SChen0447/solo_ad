import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Undo2, Redo2, Download, Pen, Brush, Highlighter, Menu, X } from 'lucide-react';
import { useDrawingStore } from './store';
import {
  drawBackground,
  drawLine,
  drawStroke,
  redrawCanvas,
  type Stroke,
  type Point,
} from './canvasEngine';
import { exportAsPng, exportAsJpg, exportAsGif } from './exportManager';

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

const App: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(true);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportFormat, setExportFormat] = useState<'png' | 'jpg' | 'gif'>('png');
  const [gifDelay, setGifDelay] = useState(0.3);
  const [gifLoop, setGifLoop] = useState(1);
  const [exportProgress, setExportProgress] = useState(0);
  const [isExporting, setIsExporting] = useState(false);

  const {
    strokes,
    currentStroke,
    previewStroke,
    color,
    brushSize,
    brushType,
    timelineIndex,
    isAnimating,
    paletteColors,
    setCurrentStroke,
    setPreviewStroke,
    addStroke,
    undo,
    redo,
    clear,
    setColor,
    setBrushSize,
    setBrushType,
    setTimelineIndex,
  } = useDrawingStore();

  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const wrapper = wrapperRef.current;
    if (!canvas || !wrapper) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = wrapper.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = rect.width + 'px';
    canvas.style.height = rect.height + 'px';
    const ctx = canvas.getContext('2d')!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }, []);

  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const rect = canvas.getBoundingClientRect();
    const limit = timelineIndex >= 0 ? timelineIndex + 1 : strokes.length;
    redrawCanvas(ctx, strokes, rect.width, rect.height, limit);
    if (currentStroke) drawStroke(ctx, currentStroke);
    if (previewStroke && timelineIndex < 0) drawStroke(ctx, previewStroke);
  }, [strokes, currentStroke, previewStroke, timelineIndex]);

  useEffect(() => {
    resizeCanvas();
    const handler = () => {
      resizeCanvas();
    };
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, [resizeCanvas]);

  useEffect(() => {
    renderCanvas();
  }, [renderCanvas]);

  const getPoint = (e: React.PointerEvent<HTMLCanvasElement>): Point => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      pressure: e.pressure > 0 ? e.pressure : 0.5,
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (isAnimating) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const point = getPoint(e);
    setIsDrawing(true);
    const stroke: Stroke = {
      id: uid(),
      points: [point],
      color,
      brushSize,
      brushType,
      timestamp: Date.now(),
    };
    setCurrentStroke(stroke);
    if (timelineIndex >= 0) setTimelineIndex(-1);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !currentStroke) return;
    const point = getPoint(e);
    const lastPoint = currentStroke.points[currentStroke.points.length - 1];
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    drawLine(ctx, lastPoint, point, color, brushSize, brushType);
    setCurrentStroke({ ...currentStroke, points: [...currentStroke.points, point] });
  };

  const handlePointerUp = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    if (currentStroke && currentStroke.points.length >= 2) {
      addStroke(currentStroke);
    } else {
      setCurrentStroke(null);
    }
  };

  const handleColorSelect = (c: string) => {
    setColor(c);
    setTimeout(() => setPaletteOpen(false), 150);
  };

  const handleTimelineChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseInt(e.target.value, 10);
    setTimelineIndex(v);
  };

  const doExport = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setIsExporting(true);
    setExportProgress(0);

    try {
      if (exportFormat === 'png') {
        await exportAsPng(canvas);
        setExportProgress(1);
      } else if (exportFormat === 'jpg') {
        await exportAsJpg(canvas);
        setExportProgress(1);
      } else {
        await exportAsGif(canvas, strokes, {
          frameDelay: gifDelay,
          loopCount: gifLoop,
          onProgress: (p) => setExportProgress(p),
        });
      }
      setTimeout(() => {
        setShowExportModal(false);
        setIsExporting(false);
        setExportProgress(0);
      }, 600);
    } catch (err) {
      console.error('导出失败:', err);
      setIsExporting(false);
    }
  };

  const maxTimeline = Math.max(0, strokes.length - 1);
  const currentTimeline = timelineIndex >= 0 ? timelineIndex : maxTimeline;

  return (
    <div className="app">
      <div className="app-title">
        墨迹<span>速写本</span>
      </div>

      <div className="top-bar">
        <button
          className="btn btn-icon"
          onClick={undo}
          disabled={strokes.length === 0 || isAnimating}
          title="撤销"
        >
          <Undo2 size={18} />
        </button>
        <button
          className="btn btn-icon"
          onClick={redo}
          disabled={useDrawingStore.getState().redoStack.length === 0 || isAnimating}
          title="重做"
        >
          <Redo2 size={18} />
        </button>
        <button
          className="btn btn-icon"
          onClick={clear}
          disabled={strokes.length === 0}
          title="清空"
        >
          <X size={18} />
        </button>
      </div>

      {strokes.length > 0 && (
        <div className="timeline-wrapper">
          <input
            type="range"
            className="timeline-slider"
            min={0}
            max={Math.max(0, strokes.length - 1)}
            value={currentTimeline}
            onChange={handleTimelineChange}
          />
          <div className="timeline-label">
            <span>起始</span>
            <span>{currentTimeline + 1} / {strokes.length} 笔</span>
            <span>当前</span>
          </div>
        </div>
      )}

      <div className="canvas-wrapper" ref={wrapperRef}>
        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onPointerLeave={handlePointerUp}
        />
      </div>

      <button
        className="btn btn-icon mobile-menu-btn"
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
      >
        {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      <div className={`bottom-toolbar ${mobileMenuOpen ? '' : 'collapsed'}`}>
        <div className="brush-group">
          <button
            className={`brush-btn ${brushType === 'hard' ? 'active' : ''}`}
            onClick={() => setBrushType('hard')}
            title="硬笔"
          >
            <Pen size={18} />
          </button>
          <button
            className={`brush-btn ${brushType === 'soft' ? 'active' : ''}`}
            onClick={() => setBrushType('soft')}
            title="毛笔"
          >
            <Brush size={18} />
          </button>
          <button
            className={`brush-btn ${brushType === 'marker' ? 'active' : ''}`}
            onClick={() => setBrushType('marker')}
            title="马克笔"
          >
            <Highlighter size={18} />
          </button>
        </div>

        <div className="divider" />

        <div className="size-control">
          <div className="size-preview">
            <div
              className="size-dot"
              style={{
                width: Math.max(4, brushSize * 1.5),
                height: Math.max(4, brushSize * 1.5),
                color,
              }}
            />
          </div>
          <input
            type="range"
            className="size-slider"
            min={1}
            max={20}
            value={brushSize}
            onChange={(e) => setBrushSize(parseInt(e.target.value, 10))}
          />
          <span className="size-label">{brushSize}px</span>
        </div>

        <div className="divider" />

        <div style={{ position: 'relative' }}>
          <button
            className="color-trigger"
            onClick={() => setPaletteOpen(!paletteOpen)}
            title="调色盘"
          >
            <div className="color-dot" style={{ background: color }} />
          </button>
          <div className={`palette-wrapper ${paletteOpen ? 'open' : ''}`}>
            <div className="palette-ring">
              {paletteColors.map((c, i) => {
                const angle = (Math.PI * i) / (paletteColors.length - 1);
                const radius = 100;
                const x = 130 - Math.cos(angle) * radius;
                const y = 130 - Math.sin(angle) * radius;
                return (
                  <div
                    key={c}
                    className={`palette-color ${color === c ? 'selected' : ''}`}
                    style={{
                      left: x,
                      top: y,
                      background: c,
                      transitionDelay: paletteOpen ? `${i * 20}ms` : `${(paletteColors.length - i) * 15}ms`,
                    }}
                    onClick={() => handleColorSelect(c)}
                  />
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <button
        className="btn btn-accent export-btn"
        onClick={() => setShowExportModal(true)}
        disabled={strokes.length === 0 && !previewStroke}
      >
        <Download size={18} />
        导出
      </button>

      {showExportModal && (
        <div className="modal-overlay" onClick={() => !isExporting && setShowExportModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-title">导出作品</div>

            <div className="format-group">
              {(['png', 'jpg', 'gif'] as const).map((f) => (
                <button
                  key={f}
                  className={`format-btn ${exportFormat === f ? 'active' : ''}`}
                  onClick={() => setExportFormat(f)}
                  disabled={isExporting}
                >
                  <span className="format-icon">{f.toUpperCase()}</span>
                  <span>
                    {f === 'png' ? '高清透明' : f === 'jpg' ? '压缩图' : '动画'}
                  </span>
                </button>
              ))}
            </div>

            {exportFormat === 'gif' && (
              <>
                <div className="option-row">
                  <span className="option-label">帧延迟</span>
                  <input
                    type="range"
                    className="option-slider"
                    min={0.1}
                    max={1}
                    step={0.05}
                    value={gifDelay}
                    onChange={(e) => setGifDelay(parseFloat(e.target.value))}
                    disabled={isExporting}
                  />
                  <span className="option-value">{gifDelay.toFixed(2)}s</span>
                </div>
                <div className="option-row">
                  <span className="option-label">循环次数</span>
                  <input
                    type="range"
                    className="option-slider"
                    min={0}
                    max={10}
                    step={1}
                    value={gifLoop}
                    onChange={(e) => setGifLoop(parseInt(e.target.value, 10))}
                    disabled={isExporting}
                  />
                  <span className="option-value">{gifLoop === 0 ? '无限' : gifLoop + ' 次'}</span>
                </div>
              </>
            )}

            {(isExporting || exportProgress > 0) && (
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{ width: `${Math.round(exportProgress * 100)}%` }}
                />
              </div>
            )}

            <div className="modal-actions">
              <button
                className="btn btn-secondary"
                onClick={() => setShowExportModal(false)}
                disabled={isExporting}
              >
                取消
              </button>
              <button className="btn btn-accent" onClick={doExport} disabled={isExporting}>
                {isExporting ? '导出中...' : '开始导出'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
