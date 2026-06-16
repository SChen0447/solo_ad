import React, { useState, useRef, useCallback } from 'react';
import * as htmlToImage from 'html-to-image';
import { saveAs } from 'file-saver';
import ColorPalette from './colorPalette';
import ColorHarmonyChart from './colorHarmonyChart';
import ColorEditor from './colorEditor';
import { loadImage, LoadedImage, getPixelAt } from './utils/imageLoader';
import { analyzeColors, rgbToColorInfo } from './colorAnalyzer';
import { Palette, ColorInfo, RGB } from './types';
import './styles.css';

const App: React.FC = () => {
  const [imageUrl, setImageUrl] = useState<string>('');
  const [loadedImage, setLoadedImage] = useState<LoadedImage | null>(null);
  const [palette, setPalette] = useState<Palette>([]);
  const [selectedColorIndex, setSelectedColorIndex] = useState<number | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isPickingColor, setIsPickingColor] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [error, setError] = useState<string>('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const exportContainerRef = useRef<HTMLDivElement>(null);
  const previewImgRef = useRef<HTMLImageElement>(null);

  const handleFile = useCallback(async (file: File) => {
    setError('');
    setIsAnalyzing(true);
    setPalette([]);
    setSelectedColorIndex(null);

    try {
      const loaded = await loadImage(file);
      setLoadedImage(loaded);
      setImageUrl(loaded.imageElement.src);

      const result = await analyzeColors(loaded.imageData, 5);
      setPalette(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : '分析失败');
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleColorSelect = (index: number) => {
    setSelectedColorIndex(index);
  };

  const handleColorChange = (newColor: ColorInfo) => {
    if (selectedColorIndex === null) return;
    setPalette(prev => {
      const next = [...prev];
      next[selectedColorIndex] = newColor;
      return next;
    });
  };

  const handleStartPickColor = () => {
    if (!loadedImage) return;
    setIsPickingColor(true);
  };

  const handlePreviewClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isPickingColor || !loadedImage || selectedColorIndex === null) return;

    const canvas = previewCanvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = Math.floor((e.clientX - rect.left) * scaleX);
    const y = Math.floor((e.clientY - rect.top) * scaleY);

    const pixel = getPixelAt(loadedImage.canvas, x, y);
    if (pixel) {
      const pct = palette[selectedColorIndex]?.percentage ?? 0;
      const newColor = rgbToColorInfo(pixel as RGB, pct);
      handleColorChange(newColor);
    }
    setIsPickingColor(false);
  };

  const drawPreviewWithMask = useCallback(() => {
    if (!loadedImage || !previewCanvasRef.current) return;

    const canvas = previewCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = loadedImage.imageElement;
    const maxW = 400;
    const maxH = 300;
    let w = img.naturalWidth;
    let h = img.naturalHeight;
    const ratio = Math.min(maxW / w, maxH / h, 1);
    w = Math.round(w * ratio);
    h = Math.round(h * ratio);

    canvas.width = w;
    canvas.height = h;
    ctx.drawImage(img, 0, 0, w, h);

    if (selectedColorIndex !== null && palette[selectedColorIndex] && loadedImage.canvas) {
      const targetColor = palette[selectedColorIndex].rgb;
      const srcCtx = loadedImage.canvas.getContext('2d');
      if (srcCtx) {
        const srcData = srcCtx.getImageData(0, 0, loadedImage.canvas.width, loadedImage.canvas.height).data;

        const maskCanvas = document.createElement('canvas');
        maskCanvas.width = w;
        maskCanvas.height = h;
        const maskCtx = maskCanvas.getContext('2d');
        if (maskCtx) {
          const maskData = maskCtx.createImageData(w, h);
          const scaleX = loadedImage.canvas.width / w;
          const scaleY = loadedImage.canvas.height / h;

          for (let py = 0; py < h; py++) {
            for (let px = 0; px < w; px++) {
              const sx = Math.floor(px * scaleX);
              const sy = Math.floor(py * scaleY);
              const si = (sy * loadedImage.canvas.width + sx) * 4;

              const dr = srcData[si] - targetColor.r;
              const dg = srcData[si + 1] - targetColor.g;
              const db = srcData[si + 2] - targetColor.b;
              const dist = Math.sqrt(dr * dr + dg * dg + db * db);

              const di = (py * w + px) * 4;
              if (dist < 60) {
                maskData.data[di] = targetColor.r;
                maskData.data[di + 1] = targetColor.g;
                maskData.data[di + 2] = targetColor.b;
                maskData.data[di + 3] = 120;
              } else {
                maskData.data[di + 3] = 0;
              }
            }
          }

          maskCtx.putImageData(maskData, 0, 0);
          ctx.drawImage(maskCanvas, 0, 0);
        }
      }
    }
  }, [loadedImage, selectedColorIndex, palette]);

  React.useEffect(() => {
    drawPreviewWithMask();
  }, [drawPreviewWithMask]);

  const handleExport = async () => {
    if (!exportContainerRef.current || palette.length === 0) return;

    setIsExporting(true);
    setExportProgress(0);

    try {
      const progressInterval = setInterval(() => {
        setExportProgress(prev => Math.min(prev + 10, 90));
      }, 100);

      const dataUrl = await htmlToImage.toPng(exportContainerRef.current, {
        quality: 1,
        pixelRatio: 2,
        width: 800
      });

      clearInterval(progressInterval);
      setExportProgress(100);

      const blob = await (await fetch(dataUrl)).blob();
      saveAs(blob, 'color-palette.png');

      setTimeout(() => {
        setIsExporting(false);
        setExportProgress(0);
      }, 800);
    } catch (err) {
      console.error('导出失败:', err);
      setError('导出失败，请重试');
      setIsExporting(false);
    }
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>照片色彩分析工具</h1>
        <p className="subtitle">提取主色调 · 可视化分析 · 交互式调色</p>
      </header>

      <div className="app-body">
        <div className="left-panel">
          <div
            className={`upload-area ${isDragging ? 'dragging' : ''}`}
            onClick={() => fileInputRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileInputChange}
              hidden
            />
            <div className="upload-icon">
              <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
            </div>
            <p className="upload-text">点击或拖拽图片到此处</p>
            <p className="upload-hint">支持 JPG、PNG、WebP 格式，最大 5MB</p>
          </div>

          {error && <div className="error-message">{error}</div>}

          {isAnalyzing && (
            <div className="loading-overlay">
              <div className="rainbow-loader" />
              <p>正在分析图片色彩...</p>
            </div>
          )}

          {imageUrl && !isAnalyzing && (
            <div className={`preview-container ${isPickingColor ? 'picking' : ''}`}>
              <div className="preview-label">
                <span>图片预览</span>
                {isPickingColor && <span className="picking-hint">点击图片取色</span>}
              </div>
              <canvas
                ref={previewCanvasRef}
                onClick={handlePreviewClick}
                className="preview-canvas"
              />
              <img ref={previewImgRef} src={imageUrl} alt="preview" style={{ display: 'none' }} />
            </div>
          )}
        </div>

        <div className="right-panel">
          <div ref={exportContainerRef} className="export-container">
            <section className="palette-section">
              <div className="section-header">
                <h2>调色板</h2>
                <span className="section-hint">点击色卡进行编辑</span>
              </div>
              <ColorPalette
                palette={palette}
                selectedIndex={selectedColorIndex}
                onColorSelect={handleColorSelect}
              />
            </section>

            <section className="harmony-section">
              <div className="section-header">
                <h2>色相环分布</h2>
              </div>
              <ColorHarmonyChart
                palette={palette}
                selectedIndex={selectedColorIndex}
                onSegmentHover={(idx) => { if (idx !== null) setSelectedColorIndex(idx); }}
              />
            </section>
          </div>

          <section className="editor-section">
            <div className="section-header">
              <h2>色彩编辑</h2>
            </div>
            <ColorEditor
              color={selectedColorIndex !== null ? palette[selectedColorIndex] : null}
              onColorChange={handleColorChange}
              canvasRef={previewCanvasRef}
              onPickFromImage={handleStartPickColor}
            />
          </section>

          <div className="export-section">
            <button
              className="export-btn"
              onClick={handleExport}
              disabled={palette.length === 0 || isExporting}
            >
              {isExporting ? (
                <>
                  <div className="export-progress-bar">
                    <div
                      className="export-progress-fill"
                      style={{ width: `${exportProgress}%` }}
                    />
                  </div>
                  <span>导出中 {exportProgress}%</span>
                </>
              ) : (
                <>
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  <span>导出调色板为图片</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
