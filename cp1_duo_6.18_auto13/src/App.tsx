import { useCallback, useRef, useEffect, useState } from 'react';
import { Upload, FileText, Download, Eye, ChevronDown } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { useColorBlind } from '@/hooks/useColorBlind';
import { useContrastAnalyzer } from '@/hooks/useContrastAnalyzer';
import { COLOR_BLIND_LABELS, type ColorBlindType } from '@/utils/colorBlindMatrices';
import { exportPdfReport } from '@/utils/pdfExporter';
import DualPanel from '@/components/DualPanel';

export default function App() {
  const colorBlindType = useAppStore((s) => s.colorBlindType);
  const setColorBlindType = useAppStore((s) => s.setColorBlindType);
  const originalImageData = useAppStore((s) => s.originalImageData);
  const setOriginalImageData = useAppStore((s) => s.setOriginalImageData);
  const setSimulatedImageData = useAppStore((s) => s.setSimulatedImageData);
  const setMetrics = useAppStore((s) => s.setMetrics);
  const setUploadedImageUrl = useAppStore((s) => s.setUploadedImageUrl);
  const uploadedImageUrl = useAppStore((s) => s.uploadedImageUrl);
  const inputText = useAppStore((s) => s.inputText);
  const setInputText = useAppStore((s) => s.setInputText);
  const isDraggingFile = useAppStore((s) => s.isDraggingFile);
  const setIsDraggingFile = useAppStore((s) => s.setIsDraggingFile);
  const simulatedImageData = useAppStore((s) => s.simulatedImageData);
  const metrics = useAppStore((s) => s.metrics);

  const { simulate } = useColorBlind();
  const { analyze } = useContrastAnalyzer();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const hiddenCanvasRef = useRef<HTMLCanvasElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [inputMode, setInputMode] = useState<'image' | 'text' | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [transitionKey, setTransitionKey] = useState(0);

  const processImage = useCallback(
    (img: HTMLImageElement) => {
      const canvas = hiddenCanvasRef.current;
      if (!canvas) return;

      const maxDim = 1200;
      let w = img.naturalWidth;
      let h = img.naturalHeight;
      if (w > maxDim || h > maxDim) {
        const scale = maxDim / Math.max(w, h);
        w = Math.round(w * scale);
        h = Math.round(h * scale);
      }

      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.drawImage(img, 0, 0, w, h);
      const origData = ctx.getImageData(0, 0, w, h);
      setOriginalImageData(origData);

      setIsProcessing(true);
      requestAnimationFrame(() => {
        const simData = simulate(origData, colorBlindType);
        setSimulatedImageData(simData);

        const result = analyze(origData, simData);
        setMetrics(result);
        setIsProcessing(false);
      });
    },
    [colorBlindType, simulate, analyze, setOriginalImageData, setSimulatedImageData, setMetrics]
  );

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      if (!file.type.match(/^image\/(jpeg|png)$/)) {
        alert('Please upload a JPG or PNG image.');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        alert('File size exceeds 5MB limit.');
        return;
      }

      const url = URL.createObjectURL(file);
      setUploadedImageUrl(url);
      setInputMode('image');

      const img = new Image();
      img.onload = () => processImage(img);
      img.src = url;
    },
    [processImage, setUploadedImageUrl]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDraggingFile(false);
      const file = e.dataTransfer.files[0];
      if (!file) return;

      if (!file.type.match(/^image\/(jpeg|png)$/)) {
        alert('Please upload a JPG or PNG image.');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        alert('File size exceeds 5MB limit.');
        return;
      }

      const url = URL.createObjectURL(file);
      setUploadedImageUrl(url);
      setInputMode('image');

      const img = new Image();
      img.onload = () => processImage(img);
      img.src = url;
    },
    [processImage, setUploadedImageUrl, setIsDraggingFile]
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDraggingFile(true);
    },
    [setIsDraggingFile]
  );

  const handleDragLeave = useCallback(() => {
    setIsDraggingFile(false);
  }, [setIsDraggingFile]);

  const handleTextSubmit = useCallback(() => {
    if (!inputText.trim()) return;
    setInputMode('text');

    const canvas = hiddenCanvasRef.current;
    if (!canvas) return;

    const w = 800;
    const h = 600;
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#333333';
    ctx.font = '16px monospace';
    const lines = inputText.split('\n');
    let y = 30;
    for (const line of lines) {
      ctx.fillText(line, 20, y, w - 40);
      y += 24;
      if (y > h - 20) break;
    }

    const origData = ctx.getImageData(0, 0, w, h);
    setOriginalImageData(origData);

    setIsProcessing(true);
    requestAnimationFrame(() => {
      const simData = simulate(origData, colorBlindType);
      setSimulatedImageData(simData);
      const result = analyze(origData, simData);
      setMetrics(result);
      setIsProcessing(false);
    });
  }, [inputText, colorBlindType, simulate, analyze, setOriginalImageData, setSimulatedImageData, setMetrics]);

  useEffect(() => {
    if (!originalImageData || !inputMode) return;

    setIsProcessing(true);
    setTransitionKey((k) => k + 1);
    requestAnimationFrame(() => {
      const simData = simulate(originalImageData, colorBlindType);
      setSimulatedImageData(simData);
      const result = analyze(originalImageData, simData);
      setMetrics(result);
      setIsProcessing(false);
    });
  }, [colorBlindType]);

  const handleExport = useCallback(async () => {
    const origCanvas = hiddenCanvasRef.current;
    let simCanvas: HTMLCanvasElement | null = null;
    let heatmapCanvas: HTMLCanvasElement | null = null;

    if (simulatedImageData) {
      simCanvas = document.createElement('canvas');
      simCanvas.width = simulatedImageData.width;
      simCanvas.height = simulatedImageData.height;
      const ctx = simCanvas.getContext('2d');
      if (ctx) ctx.putImageData(simulatedImageData, 0, 0);
    }

    if (originalImageData && metrics?.heatmapData) {
      heatmapCanvas = document.createElement('canvas');
      heatmapCanvas.width = originalImageData.width;
      heatmapCanvas.height = originalImageData.height;
      const ctx = heatmapCanvas.getContext('2d');
      if (ctx) {
        const heatImgData = new ImageData(
          new Uint8ClampedArray(metrics.heatmapData),
          originalImageData.width,
          originalImageData.height
        );
        ctx.putImageData(heatImgData, 0, 0);
      }
    }

    await exportPdfReport(origCanvas, simCanvas, heatmapCanvas, colorBlindType, metrics);
  }, [simulatedImageData, originalImageData, metrics, colorBlindType]);

  const hasContent = !!(uploadedImageUrl || (inputMode === 'text' && inputText));

  return (
    <div className="app-root">
      <canvas ref={hiddenCanvasRef} style={{ display: 'none' }} />

      <header className="toolbar">
        <div className="toolbar-left">
          <div className="app-logo">
            <Eye size={20} />
            <span className="app-title">ColorVision</span>
          </div>
        </div>

        <div className="toolbar-center">
          <div className="dropdown-wrapper">
            <button
              className="dropdown-trigger"
              onClick={() => setDropdownOpen(!dropdownOpen)}
            >
              <span>{COLOR_BLIND_LABELS[colorBlindType]}</span>
              <ChevronDown size={16} className={dropdownOpen ? 'rotate' : ''} />
            </button>
            {dropdownOpen && (
              <div className="dropdown-menu">
                {(Object.keys(COLOR_BLIND_LABELS) as ColorBlindType[]).map((type) => (
                  <button
                    key={type}
                    className={`dropdown-item ${type === colorBlindType ? 'active' : ''}`}
                    onClick={() => {
                      setColorBlindType(type);
                      setDropdownOpen(false);
                    }}
                  >
                    {COLOR_BLIND_LABELS[type]}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="toolbar-right">
          <button
            className="export-btn"
            onClick={handleExport}
            disabled={!hasContent}
          >
            <Download size={16} />
            <span>导出报告</span>
          </button>
        </div>
      </header>

      {!hasContent ? (
        <div className="upload-section">
          <div
            className={`upload-zone ${isDraggingFile ? 'drag-over' : ''}`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload size={32} className="upload-icon" />
            <p className="upload-text">点击或拖拽上传图片</p>
            <p className="upload-hint">支持 JPG / PNG，最大 5MB</p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png"
              onChange={handleFileChange}
              style={{ display: 'none' }}
            />
          </div>

          <div className="divider-or">
            <span>或</span>
          </div>

          <div className="text-input-zone">
            <FileText size={20} className="text-icon" />
            <textarea
              className="text-input"
              placeholder="输入文本以模拟色盲效果..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              maxLength={500}
              rows={4}
            />
            <div className="text-input-footer">
              <span className="char-count">{inputText.length}/500</span>
              <button
                className="text-submit-btn"
                onClick={handleTextSubmit}
                disabled={!inputText.trim()}
              >
                渲染预览
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="main-content" key={transitionKey}>
          {isProcessing && (
            <div className="processing-overlay">
              <div className="processing-spinner" />
              <span>正在处理...</span>
            </div>
          )}
          <DualPanel />
        </div>
      )}

      {dropdownOpen && (
        <div className="dropdown-backdrop" onClick={() => setDropdownOpen(false)} />
      )}
    </div>
  );
}
