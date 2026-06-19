import React, { useEffect, useRef, useState, useCallback } from 'react';
import Toolbar from './components/Toolbar';
import ColorPalette from './components/ColorPalette';
import { ImageProcessor } from './modules/imageProcessor/ImageProcessor';
import { CanvasEngine } from './modules/canvasEngine/CanvasEngine';
import type { ProcessedImageData, DisplayMode, FilledRegion } from './modules/imageProcessor/types';

const STORAGE_KEY = 'paint-by-numbers-snapshot-v1';

interface ProgressData {
  percentage: number;
  filled: number;
  total: number;
}

const App: React.FC = () => {
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<CanvasEngine | null>(null);
  const processorRef = useRef<ImageProcessor | null>(null);
  const modalImageRef = useRef<HTMLDivElement>(null);

  const [processedData, setProcessedData] = useState<ProcessedImageData | null>(null);
  const [displayMode, setDisplayMode] = useState<DisplayMode>('lineart');
  const [selectedColorIndex, setSelectedColorIndex] = useState<number | null>(null);
  const [filledRegions, setFilledRegions] = useState<FilledRegion[]>([]);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState<ProgressData>({ filled: 0, total: 0, percentage: 0 });
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportImageUrl, setExportImageUrl] = useState<string | null>(null);
  const [exportLoading, setExportLoading] = useState(false);

  const [dragState, setDragState] = useState<{
    isDragging: boolean;
    startX: number;
    startY: number;
    translateX: number;
    translateY: number;
  }>({ isDragging: false, startX: 0, startY: 0, translateX: 0, translateY: 0 });
  const [previewScale, setPreviewScale] = useState(1);

  useEffect(() => {
    if (!processorRef.current) {
      processorRef.current = new ImageProcessor();
    }
    return () => {
      engineRef.current?.destroy();
    };
  }, []);

  useEffect(() => {
    if (!canvasRef.current) return;
    if (!engineRef.current) {
      engineRef.current = new CanvasEngine(canvasRef.current);
      engineRef.current.setClickCallback(handleCanvasClick);
    }

    const updateSize = () => {
      if (!canvasContainerRef.current || !engineRef.current) return;
      const { clientWidth, clientHeight } = canvasContainerRef.current;
      engineRef.current.setDisplaySize(clientWidth, clientHeight);
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  const loadSnapshot = useCallback(async () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const snapshot = JSON.parse(raw);
      if (snapshot.processedImage) {
        const data = snapshot.processedImage;
        const newData: ProcessedImageData = {
          ...data,
          originalImageData: new ImageData(
            new Uint8ClampedArray(data.originalImageData.data),
            data.originalImageData.width,
            data.originalImageData.height
          ),
          lineArtImageData: new ImageData(
            new Uint8ClampedArray(data.lineArtImageData.data),
            data.lineArtImageData.width,
            data.lineArtImageData.height
          ),
          regionMap: new Int32Array(data.regionMap)
        };
        setProcessedData(newData);
        setDisplayMode(snapshot.displayMode || 'lineart');
        setSelectedColorIndex(snapshot.selectedColorIndex ?? null);
        setFilledRegions(snapshot.filledRegions || []);

        if (engineRef.current) {
          engineRef.current.setData(newData);
          engineRef.current.setDisplayMode(snapshot.displayMode || 'lineart');
          engineRef.current.setFilledRegions(snapshot.filledRegions || []);
          updateProgress();
        }
      }
    } catch (e) {
      console.log('No saved snapshot');
    }
  }, []);

  useEffect(() => {
    loadSnapshot();
  }, [loadSnapshot]);

  const saveSnapshot = useCallback(() => {
    try {
      if (!processedData) return;
      const snapshot = {
        filledRegions,
        processedImage: {
          ...processedData,
          originalImageData: {
            width: processedData.originalImageData.width,
            height: processedData.originalImageData.height,
            data: Array.from(processedData.originalImageData.data)
          },
          lineArtImageData: {
            width: processedData.lineArtImageData.width,
            height: processedData.lineArtImageData.height,
            data: Array.from(processedData.lineArtImageData.data)
          },
          regionMap: Array.from(processedData.regionMap)
        },
        displayMode,
        selectedColorIndex,
        timestamp: Date.now()
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
    } catch (e) {
      console.warn('Failed to save snapshot:', e);
    }
  }, [processedData, filledRegions, displayMode, selectedColorIndex]);

  useEffect(() => {
    if (processedData) {
      saveSnapshot();
    }
  }, [filledRegions, displayMode, selectedColorIndex, processedData, saveSnapshot]);

  const updateProgress = useCallback(() => {
    if (!engineRef.current) return;
    const p = engineRef.current.getProgress();
    setProgress(p);
  }, []);

  const handleUpload = async (file: File) => {
    if (!processorRef.current || !engineRef.current) return;

    setProcessing(true);
    setSelectedColorIndex(null);
    setFilledRegions([]);

    try {
      const startTime = performance.now();
      const data = await processorRef.current.processImage(file);
      const elapsed = performance.now() - startTime;
      console.log(`Image processed in ${elapsed.toFixed(0)}ms`);

      setProcessedData(data);
      setDisplayMode('lineart');
      engineRef.current.setData(data);
      updateProgress();
    } catch (err) {
      console.error('Processing failed:', err);
      alert('图片处理失败，请重试');
    } finally {
      setProcessing(false);
    }
  };

  const handleDisplayModeChange = (mode: DisplayMode) => {
    if (!engineRef.current) return;
    setDisplayMode(mode);
    engineRef.current.setDisplayMode(mode);
  };

  const handleCanvasClick = async (regionId: string | null) => {
    if (!regionId || selectedColorIndex === null || !engineRef.current || !processedData) return;

    const result = await engineRef.current.fillRegion(regionId, selectedColorIndex);
    const newFilled = engineRef.current.getFilledRegions();
    setFilledRegions(newFilled);
    updateProgress();

    if (!result.correct) {
      const correctFilled = engineRef.current.getFilledRegions();
      setFilledRegions(correctFilled);
    }
  };

  const handleExport = async () => {
    if (!engineRef.current) return;
    setExportLoading(true);
    setShowExportModal(true);
    setPreviewScale(1);
    setDragState({ isDragging: false, startX: 0, startY: 0, translateX: 0, translateY: 0 });

    try {
      const blob = await engineRef.current.exportPNG();
      const url = URL.createObjectURL(blob);
      setExportImageUrl(url);
    } catch (err) {
      console.error('Export failed:', err);
      alert('导出失败，请重试');
      setShowExportModal(false);
    } finally {
      setExportLoading(false);
    }
  };

  const handleDownload = () => {
    if (!exportImageUrl) return;
    const a = document.createElement('a');
    a.href = exportImageUrl;
    a.download = `paint-by-numbers-${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handlePreviewMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    setDragState(s => ({
      ...s,
      isDragging: true,
      startX: e.clientX - s.translateX,
      startY: e.clientY - s.translateY
    }));
  };

  const handlePreviewMouseMove = (e: React.MouseEvent) => {
    if (!dragState.isDragging) return;
    setDragState(s => ({
      ...s,
      translateX: e.clientX - s.startX,
      translateY: e.clientY - s.startY
    }));
  };

  const handlePreviewMouseUp = () => {
    setDragState(s => ({ ...s, isDragging: false }));
  };

  const handlePreviewWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setPreviewScale(s => Math.max(0.3, Math.min(5, s + delta)));
  };

  const closeExportModal = () => {
    if (exportImageUrl) {
      URL.revokeObjectURL(exportImageUrl);
    }
    setShowExportModal(false);
    setExportImageUrl(null);
  };

  const renderProgressRing = () => {
    const size = 90;
    const stroke = 7;
    const radius = (size - stroke) / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (progress.percentage / 100) * circumference;

    return (
      <div style={styles.progressContainer}>
        <svg width={size} height={size} style={styles.progressSvg}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#E8E2D8"
            strokeWidth={stroke}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="url(#grad)"
            strokeWidth={stroke}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 0.5s ease' }}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
          <defs>
            <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#A7B7A0" />
              <stop offset="100%" stopColor="#D4A5A5" />
            </linearGradient>
          </defs>
        </svg>
        <div style={styles.progressTextWrap}>
          <div style={styles.progressPercent}>{progress.percentage.toFixed(0)}%</div>
          <div style={styles.progressCount}>
            {progress.filled} / {progress.total}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={styles.app}>
      <div style={styles.leftPanel}>
        <Toolbar
          onUpload={handleUpload}
          displayMode={displayMode}
          onDisplayModeChange={handleDisplayModeChange}
          onExport={handleExport}
          processedData={processedData}
          processing={processing}
        />
      </div>

      <div style={styles.centerPanel}>
        <div ref={canvasContainerRef} style={styles.canvasContainer}>
          <canvas ref={canvasRef} style={styles.canvas} />
        </div>
        {renderProgressRing()}
      </div>

      <div style={styles.rightPanel}>
        <ColorPalette
          colorPalette={processedData?.colorPalette || []}
          selectedColorIndex={selectedColorIndex}
          onColorSelect={setSelectedColorIndex}
          processedData={processedData}
          filledRegions={filledRegions}
        />
      </div>

      {showExportModal && (
        <div style={styles.modalOverlay} onClick={closeExportModal}>
          <div
            style={styles.modalContent}
            onClick={e => e.stopPropagation()}
          >
            <div style={styles.modalHeader}>
              <div>
                <div style={styles.modalTitle}>作品预览</div>
                <div style={styles.modalSubtitle}>滚动缩放 · 拖拽查看</div>
              </div>
              <div style={styles.modalActions}>
                <button style={styles.modalBtnSec} onClick={() => setPreviewScale(s => Math.max(0.3, s - 0.2))}>
                  －
                </button>
                <div style={styles.scaleText}>{(previewScale * 100).toFixed(0)}%</div>
                <button style={styles.modalBtnSec} onClick={() => setPreviewScale(s => Math.min(5, s + 0.2))}>
                  ＋
                </button>
                <button style={styles.modalBtnSec} onClick={() => {
                  setPreviewScale(1);
                  setDragState({ isDragging: false, startX: 0, startY: 0, translateX: 0, translateY: 0 });
                }}>
                  重置
                </button>
                <button
                  style={{
                    ...styles.modalBtnPrimary,
                    opacity: !exportImageUrl ? 0.5 : 1,
                    cursor: !exportImageUrl ? 'not-allowed' : 'pointer'
                  }}
                  onClick={handleDownload}
                  disabled={!exportImageUrl}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  下载PNG
                </button>
                <button style={styles.modalClose} onClick={closeExportModal}>
                  ✕
                </button>
              </div>
            </div>

            <div
              style={styles.previewArea}
              onMouseDown={handlePreviewMouseDown}
              onMouseMove={handlePreviewMouseMove}
              onMouseUp={handlePreviewMouseUp}
              onMouseLeave={handlePreviewMouseUp}
              onWheel={handlePreviewWheel}
            >
              {exportLoading && (
                <div style={styles.loadingOverlay}>
                  <div style={styles.spinner} />
                  <div style={styles.loadingText}>正在生成...</div>
                </div>
              )}
              {exportImageUrl && (
                <div
                  ref={modalImageRef}
                  style={{
                    ...styles.previewImageWrap,
                    transform: `translate(${dragState.translateX}px, ${dragState.translateY}px) scale(${previewScale})`,
                    cursor: dragState.isDragging ? 'grabbing' : 'grab'
                  }}
                >
                  <img
                    src={exportImageUrl}
                    alt="作品预览"
                    style={styles.previewImage}
                    draggable={false}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  app: {
    width: '100%',
    height: '100%',
    display: 'flex',
    background: '#F4F0E8'
  },
  leftPanel: {
    flexShrink: 0,
    height: '100%'
  },
  centerPanel: {
    flex: 1,
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    padding: '24px'
  },
  rightPanel: {
    flexShrink: 0,
    height: '100%'
  },
  canvasContainer: {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '12px',
    background: '#FAF8F5',
    boxShadow: '0 4px 24px rgba(0,0,0,0.06)'
  },
  canvas: {
    display: 'block',
    maxWidth: '100%',
    maxHeight: '100%'
  },
  progressContainer: {
    position: 'absolute',
    right: '36px',
    bottom: '36px',
    width: '90px',
    height: '90px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(255,255,255,0.95)',
    borderRadius: '50%',
    boxShadow: '0 4px 16px rgba(0,0,0,0.12)'
  },
  progressSvg: {
    position: 'absolute',
    top: 0,
    left: 0
  },
  progressTextWrap: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center'
  },
  progressPercent: {
    fontSize: '18px',
    fontWeight: 700,
    color: '#4A5043'
  },
  progressCount: {
    fontSize: '9.5px',
    color: '#8A8A8A',
    marginTop: '1px'
  },
  modalOverlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(30,30,30,0.6)',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '24px'
  },
  modalContent: {
    width: '100%',
    maxWidth: '820px',
    maxHeight: '85vh',
    background: '#FAF8F5',
    borderRadius: '16px',
    boxShadow: '0 24px 64px rgba(0,0,0,0.25)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden'
  },
  modalHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '18px 22px',
    borderBottom: '1px solid #E8E2D8'
  },
  modalTitle: {
    fontSize: '17px',
    fontWeight: 600,
    color: '#4A5043'
  },
  modalSubtitle: {
    fontSize: '11.5px',
    color: '#8A8A8A',
    marginTop: '2px'
  },
  modalActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  modalBtnSec: {
    padding: '6px 12px',
    borderRadius: '8px',
    border: '1px solid #DDD4C4',
    background: '#FFFFFF',
    color: '#666',
    fontSize: '13px',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  modalBtnPrimary: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 16px',
    borderRadius: '8px',
    border: 'none',
    background: '#A7B7A0',
    color: '#FFFFFF',
    fontSize: '13px',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  modalClose: {
    width: '32px',
    height: '32px',
    borderRadius: '8px',
    border: 'none',
    background: '#F0EBE2',
    color: '#666',
    fontSize: '14px',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  scaleText: {
    fontSize: '12px',
    fontFamily: 'monospace',
    color: '#666',
    minWidth: '44px',
    textAlign: 'center'
  },
  previewArea: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
    background:
      'repeating-conic-gradient(#E8E2D8 0% 25%, #FAF8F5 0% 50%) 50% / 20px 20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '400px',
    userSelect: 'none'
  },
  previewImageWrap: {
    transition: 'transform 0.08s ease-out',
    transformOrigin: 'center center',
    willChange: 'transform'
  },
  previewImage: {
    maxWidth: '500px',
    maxHeight: '500px',
    objectFit: 'contain',
    borderRadius: '4px',
    boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
    pointerEvents: 'none'
  },
  loadingOverlay: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
    background: 'rgba(250,248,245,0.8)'
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '3px solid #E8E2D8',
    borderTopColor: '#A7B7A0',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite'
  },
  loadingText: {
    fontSize: '13px',
    color: '#8A8A8A'
  }
};

const globalStyles = document.createElement('style');
globalStyles.id = 'app-global-styles';
globalStyles.textContent = `
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
  button:hover:not(:disabled) {
    filter: brightness(0.97);
  }
  ::-webkit-scrollbar {
    width: 6px;
    height: 6px;
  }
  ::-webkit-scrollbar-track {
    background: transparent;
  }
  ::-webkit-scrollbar-thumb {
    background: #DDD4C4;
    border-radius: 3px;
  }
  ::-webkit-scrollbar-thumb:hover {
    background: #C8BEAB;
  }
`;
if (typeof document !== 'undefined' && !document.querySelector('#app-global-styles')) {
  document.head.appendChild(globalStyles);
}

export default App;
