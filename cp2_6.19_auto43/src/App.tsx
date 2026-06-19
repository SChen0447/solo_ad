import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Toolbar } from './components/Toolbar';
import { ColorPalette } from './components/ColorPalette';
import { ImageProcessor } from './modules/imageProcessor/ImageProcessor';
import { CanvasEngine } from './modules/canvasEngine/CanvasEngine';
import type { ProcessedImageData, DisplayMode, FilledRegion, ColorEntry } from './modules/imageProcessor/types';
import { Loader2, X, ZoomIn, ZoomOut, Move, Download, Wand2 } from 'lucide-react';

interface ThumbnailData {
  mode: DisplayMode;
  label: string;
  dataUrl?: string;
}

const STORAGE_KEY = 'paint-by-numbers-snapshot';

const App: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<CanvasEngine | null>(null);
  const processorRef = useRef<ImageProcessor>(new ImageProcessor());

  const [processedData, setProcessedData] = useState<ProcessedImageData | null>(null);
  const [displayMode, setDisplayMode] = useState<DisplayMode>('lineart');
  const [selectedColorIndex, setSelectedColorIndex] = useState<number | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [fadeTransition, setFadeTransition] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportBlobUrl, setExportBlobUrl] = useState<string | null>(null);
  const [progressPercent, setProgressPercent] = useState(0);
  const [colorProgress, setColorProgress] = useState<Record<number, { filled: number; total: number }>>({});
  const [previewScale, setPreviewScale] = useState(1);
  const [previewOffset, setPreviewOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const [thumbnails, setThumbnails] = useState<ThumbnailData[]>([
    { mode: 'original', label: '原图' },
    { mode: 'lineart', label: '线稿' },
    { mode: 'colored', label: '成品' },
  ]);

  const calculateProgress = useCallback((regions: FilledRegion[]) => {
    const total = regions.length;
    const filled = regions.filter(r => r.filled).length;
    setProgressPercent(total > 0 ? Math.round((filled / total) * 100) : 0);

    const colorMap: Record<number, { filled: number; total: number }> = {};
    for (const r of regions) {
      if (!colorMap[r.colorIndex]) {
        colorMap[r.colorIndex] = { filled: 0, total: 0 };
      }
      colorMap[r.colorIndex].total++;
      if (r.filled) colorMap[r.colorIndex].filled++;
    }
    setColorProgress(colorMap);
  }, []);

  const saveSnapshot = useCallback((regions: FilledRegion[]) => {
    try {
      const filledMap: Record<string, number> = {};
      for (const r of regions) {
        if (r.filled && r.filledColorIndex !== undefined) {
          filledMap[r.id] = r.filledColorIndex;
        }
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        filledRegions: filledMap,
        timestamp: Date.now(),
      }));
    } catch {
      // ignore storage errors
    }
  }, []);

  const loadSnapshot = useCallback((regions: FilledRegion[]) => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const data = JSON.parse(raw);
        const filledMap: Record<string, number> = data.filledRegions || {};
        for (const r of regions) {
          if (filledMap[r.id] !== undefined) {
            r.filled = true;
            r.filledColorIndex = filledMap[r.id];
          }
        }
        calculateProgress(regions);
      }
    } catch {
      // ignore
    }
  }, [calculateProgress]);

  const generateThumbnails = useCallback((data: ProcessedImageData) => {
    const result: ThumbnailData[] = [];

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = data.width;
    tempCanvas.height = data.height;
    const tctx = tempCanvas.getContext('2d')!;

    tctx.putImageData(data.originalImageData, 0, 0);
    result.push({ mode: 'original', label: '原图', dataUrl: tempCanvas.toDataURL('image/jpeg', 0.6) });

    tctx.clearRect(0, 0, data.width, data.height);
    tctx.drawImage(data.lineArtCanvas, 0, 0);
    result.push({ mode: 'lineart', label: '线稿', dataUrl: tempCanvas.toDataURL('image/jpeg', 0.6) });

    tctx.clearRect(0, 0, data.width, data.height);
    tctx.putImageData(data.originalImageData, 0, 0);
    for (const region of data.regions) {
      if (region.filled && region.filledColorIndex !== undefined) {
        const color = data.colorPalette[region.filledColorIndex]?.hex || '#888';
        if (region.path2D) {
          tctx.fillStyle = color;
          tctx.fill(region.path2D);
        }
      }
    }
    result.push({ mode: 'colored', label: '成品', dataUrl: tempCanvas.toDataURL('image/jpeg', 0.6) });

    return result;
  }, []);

  const handleUpload = useCallback(async (file: File) => {
    if (!engineRef.current) return;

    setIsProcessing(true);
    try {
      const data = await processorRef.current.processImage(file);
      loadSnapshot(data.regions);
      engineRef.current.setProcessedData(data);
      setProcessedData(data);
      calculateProgress(data.regions);
      setThumbnails(generateThumbnails(data));
      setDisplayMode('lineart');
      setSelectedColorIndex(null);
    } catch (err) {
      console.error('Image processing failed:', err);
    } finally {
      setIsProcessing(false);
    }
  }, [calculateProgress, generateThumbnails, loadSnapshot]);

  const handleDisplayModeChange = useCallback((mode: DisplayMode) => {
    if (mode === displayMode) return;
    setFadeTransition(true);
    setTimeout(() => {
      setDisplayMode(mode);
      engineRef.current?.setDisplayMode(mode);
      setTimeout(() => setFadeTransition(false), 50);
    }, 300);
  }, [displayMode]);

  const handleFillComplete = useCallback((regionId: string, colorIndex: number, correct: boolean) => {
    if (!processedData) return;
    calculateProgress(processedData.regions);
    saveSnapshot(processedData.regions);
    setThumbnails(generateThumbnails(processedData));
  }, [processedData, calculateProgress, saveSnapshot, generateThumbnails]);

  useEffect(() => {
    if (canvasRef.current && !engineRef.current) {
      engineRef.current = new CanvasEngine(canvasRef.current);
      engineRef.current.setOnFillComplete(handleFillComplete);
    }
    return () => {
      engineRef.current?.destroy();
      engineRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.setOnFillComplete(handleFillComplete);
    }
  }, [handleFillComplete]);

  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!engineRef.current || !processedData || selectedColorIndex === null) return;

    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    const region = engineRef.current.findRegionAtPoint(x, y);
    if (region) {
      engineRef.current.fillRegion(region, selectedColorIndex, processedData.colorPalette);
    }
  }, [processedData, selectedColorIndex]);

  const handleCanvasMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!engineRef.current || !processedData) return;

    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    const region = engineRef.current.findRegionAtPoint(x, y);
    engineRef.current.setHoverRegion(region?.id || null);
  }, [processedData]);

  const handleExport = useCallback(async () => {
    if (!engineRef.current) return;
    try {
      const blob = await engineRef.current.exportPNGAsync(1024);
      const url = URL.createObjectURL(blob);
      setExportBlobUrl(url);
      setShowExportModal(true);
      setPreviewScale(1);
      setPreviewOffset({ x: 0, y: 0 });
    } catch (err) {
      console.error('Export failed:', err);
    }
  }, []);

  const handleDownload = useCallback(() => {
    if (!exportBlobUrl) return;
    const a = document.createElement('a');
    a.href = exportBlobUrl;
    a.download = `paint-by-numbers-${Date.now()}.png`;
    a.click();
  }, [exportBlobUrl]);

  const handlePreviewMouseDown = useCallback((e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - previewOffset.x, y: e.clientY - previewOffset.y });
  }, [previewOffset]);

  const handlePreviewMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return;
    setPreviewOffset({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  }, [isDragging, dragStart]);

  const handlePreviewMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setPreviewScale(s => Math.max(0.3, Math.min(3, s + delta)));
  }, []);

  const progressCircumference = 2 * Math.PI * 28;
  const progressOffset = progressCircumference * (1 - progressPercent / 100);

  const getCanvasCursor = () => {
    if (!processedData) return 'default';
    if (selectedColorIndex === null) return 'default';
    return 'crosshair';
  };

  return (
    <div className="app-container">
      <Toolbar
        onUpload={handleUpload}
        displayMode={displayMode}
        onDisplayModeChange={handleDisplayModeChange}
        onExport={handleExport}
        hasImage={!!processedData}
        thumbnails={thumbnails}
      />

      <div className="canvas-area">
        {isProcessing && (
          <div className="processing-overlay">
            <Loader2 size={32} className="spinner" />
            <span>正在处理图片...</span>
          </div>
        )}

        {!processedData && !isProcessing && (
          <div className="empty-canvas">
            <Wand2 size={64} color="#c9c0b5" />
            <h2>开始你的数字油画创作</h2>
            <p>上传一张照片，系统将自动生成带编号的线稿图</p>
            <p className="hint">提示：选择色彩丰富、轮廓清晰的图片效果更佳</p>
          </div>
        )}

        {processedData && (
          <div
            className={`canvas-wrapper ${fadeTransition ? 'fading' : ''}`}
            style={{ cursor: getCanvasCursor() }}
          >
            <canvas
              ref={canvasRef}
              onClick={handleCanvasClick}
              onMouseMove={handleCanvasMove}
              onMouseLeave={() => engineRef.current?.setHoverRegion(null)}
            />
          </div>
        )}

        {processedData && (
          <div className="progress-ring">
            <svg width="70" height="70" viewBox="0 0 70 70">
              <circle
                cx="35"
                cy="35"
                r="28"
                stroke="rgba(139, 165, 181, 0.2)"
                strokeWidth="5"
                fill="none"
              />
              <circle
                cx="35"
                cy="35"
                r="28"
                stroke="#8BA5B5"
                strokeWidth="5"
                fill="none"
                strokeLinecap="round"
                strokeDasharray={progressCircumference}
                strokeDashoffset={progressOffset}
                transform="rotate(-90 35 35)"
                style={{ transition: 'stroke-dashoffset 0.5s ease-out' }}
              />
            </svg>
            <span className="progress-text">{progressPercent}%</span>
          </div>
        )}
      </div>

      <ColorPalette
        colors={processedData?.colorPalette || []}
        selectedColorIndex={selectedColorIndex}
        onSelectColor={setSelectedColorIndex}
        progress={colorProgress}
      />

      {showExportModal && (
        <div className="modal-overlay" onClick={() => setShowExportModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>成品预览</h3>
              <button className="close-btn" onClick={() => setShowExportModal(false)}>
                <X size={18} />
              </button>
            </div>

            <div
              className="preview-container"
              onMouseDown={handlePreviewMouseDown}
              onMouseMove={handlePreviewMouseMove}
              onMouseUp={handlePreviewMouseUp}
              onMouseLeave={handlePreviewMouseUp}
              onWheel={handleWheel}
              style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
            >
              {exportBlobUrl && (
                <img
                  src={exportBlobUrl}
                  alt="成品预览"
                  className="preview-image"
                  style={{
                    transform: `translate(${previewOffset.x}px, ${previewOffset.y}px) scale(${previewScale})`,
                  }}
                  draggable={false}
                />
              )}
            </div>

            <div className="preview-controls">
              <button className="control-btn" onClick={() => setPreviewScale(s => Math.max(0.3, s - 0.2))}>
                <ZoomOut size={18} />
              </button>
              <span className="scale-label">{Math.round(previewScale * 100)}%</span>
              <button className="control-btn" onClick={() => setPreviewScale(s => Math.min(3, s + 0.2))}>
                <ZoomIn size={18} />
              </button>
              <div className="divider" />
              <button className="control-btn" onClick={() => { setPreviewScale(1); setPreviewOffset({ x: 0, y: 0 }); }}>
                <Move size={18} />
              </button>
              <div className="divider" />
              <button className="download-btn" onClick={handleDownload}>
                <Download size={18} />
                <span>下载 PNG (1024×1024)</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
