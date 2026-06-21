import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Screenshot, CompareState, CropRegion } from '../types';

interface ComparePanelProps {
  compareState: CompareState;
  onCompareStateChange: (state: Partial<CompareState>) => void;
  onCropComplete: (imageDataUrl: string, cropRegion: CropRegion) => void;
}

type CompareMode = 'split-vertical' | 'split-horizontal' | 'overlay' | 'difference';

const modeLabels: Record<CompareMode, string> = {
  'split-vertical': '左右分割',
  'split-horizontal': '上下分割',
  'overlay': '透明度叠加',
  'difference': '差异高亮',
};

const ComparePanel: React.FC<ComparePanelProps> = ({
  compareState,
  onCompareStateChange,
  onCropComplete,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionStart, setSelectionStart] = useState({ x: 0, y: 0 });
  const [selection, setSelection] = useState<CropRegion | null>(null);
  const animationRef = useRef<number | null>(null);
  const lastFrameTime = useRef<number>(0);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleDrop = (e: React.DragEvent, slot: 'top' | 'bottom') => {
    e.preventDefault();
    const data = e.dataTransfer.getData('screenshot');
    if (data) {
      const screenshot: Screenshot = JSON.parse(data);
      if (slot === 'top') {
        onCompareStateChange({ topImage: screenshot });
      } else {
        onCompareStateChange({ bottomImage: screenshot });
      }
    }
  };

  const handleModeChange = (mode: CompareMode) => {
    onCompareStateChange({ mode });
  };

  const handleSplitDragStart = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (isDragging && containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        if (compareState.mode === 'split-vertical') {
          const newPosition = ((e.clientX - rect.left) / rect.width) * 100;
          onCompareStateChange({ splitPosition: Math.max(0, Math.min(100, newPosition)) });
        } else if (compareState.mode === 'split-horizontal') {
          const newPosition = ((e.clientY - rect.top) / rect.height) * 100;
          onCompareStateChange({ splitPosition: Math.max(0, Math.min(100, newPosition)) });
        }
      }

      if (isPanning) {
        const now = performance.now();
        if (now - lastFrameTime.current >= 20) {
          lastFrameTime.current = now;
          const dx = e.clientX - dragStart.x;
          const dy = e.clientY - dragStart.y;
          onCompareStateChange({
            offsetX: compareState.offsetX + dx,
            offsetY: compareState.offsetY + dy,
          });
          setDragStart({ x: e.clientX, y: e.clientY });
        }
      }

      if (isSelecting && containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const x = Math.min(selectionStart.x, e.clientX - rect.left);
        const y = Math.min(selectionStart.y, e.clientY - rect.top);
        const width = Math.abs(e.clientX - rect.left - selectionStart.x);
        const height = Math.abs(e.clientY - rect.top - selectionStart.y);
        setSelection({ x, y, width, height });
      }
    },
    [isDragging, isPanning, isSelecting, compareState.mode, compareState.offsetX, compareState.offsetY, dragStart, selectionStart, onCompareStateChange]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setIsPanning(false);
    setIsSelecting(false);
  }, []);

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (e.ctrlKey || e.metaKey) {
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      const newScale = Math.max(0.1, Math.min(5, compareState.scale * delta));
      onCompareStateChange({ scale: Number(newScale.toFixed(1)) });
    } else {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      animationRef.current = requestAnimationFrame(() => {
        onCompareStateChange({
          offsetX: compareState.offsetX - e.deltaX,
          offsetY: compareState.offsetY - e.deltaY,
        });
      });
    }
  };

  const handleImageMouseDown = (e: React.MouseEvent) => {
    if (e.shiftKey && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setIsSelecting(true);
      setSelectionStart({ x: e.clientX - rect.left, y: e.clientY - rect.top });
      setSelection(null);
    } else {
      setIsPanning(true);
      setDragStart({ x: e.clientX, y: e.clientY });
    }
  };

  const handleCrop = () => {
    if (selection && selection.width > 10 && selection.height > 10 && compareState.topImage) {
      onCropComplete(compareState.topImage.dataUrl, selection);
      setSelection(null);
    }
  };

  const resetView = () => {
    onCompareStateChange({ scale: 1, offsetX: 0, offsetY: 0, splitPosition: 50 });
  };

  const renderComparisonContent = () => {
    const { topImage, bottomImage, mode, splitPosition, scale, offsetX, offsetY } = compareState;

    if (!topImage && !bottomImage) {
      return (
        <div style={styles.emptyState}>
          <div style={styles.emptyIcon}>🔄</div>
          <p style={styles.emptyText}>拖拽两张截图到这里开始对比</p>
          <p style={styles.emptyHint}>左侧拖到底层，右侧拖到顶层</p>
        </div>
      );
    }

    const imageStyle: React.CSSProperties = {
      position: 'absolute',
      maxWidth: 'none',
      transform: `translate(${offsetX}px, ${offsetY}px) scale(${scale})`,
      transformOrigin: 'center center',
      transition: isDragging || isPanning ? 'none' : 'transform 0.1s ease-out',
      pointerEvents: 'none',
    };

    const topClipStyle: React.CSSProperties = {
      ...imageStyle,
      ...(mode === 'split-vertical'
        ? { clipPath: `inset(0 ${100 - splitPosition}% 0 0)` }
        : mode === 'split-horizontal'
        ? { clipPath: `inset(0 0 ${100 - splitPosition}% 0)` }
        : mode === 'overlay'
        ? { opacity: 0.6 }
        : {}),
    };

    return (
      <>
        {bottomImage && (
          <img
            src={bottomImage.dataUrl}
            alt="Bottom"
            style={imageStyle}
            draggable={false}
          />
        )}
        {topImage && (
          <img
            src={topImage.dataUrl}
            alt="Top"
            style={topClipStyle}
            draggable={false}
          />
        )}

        {mode === 'difference' && topImage && bottomImage && (
          <canvas
            ref={(canvas) => {
              if (canvas) {
                const ctx = canvas.getContext('2d');
                if (ctx) {
                  const img1 = new Image();
                  const img2 = new Image();
                  img1.onload = () => {
                    img2.src = bottomImage.dataUrl;
                  };
                  img2.onload = () => {
                    canvas.width = Math.max(img1.width, img2.width);
                    canvas.height = Math.max(img1.height, img2.height);
                    ctx.drawImage(img1, 0, 0);
                    ctx.globalCompositeOperation = 'difference';
                    ctx.drawImage(img2, 0, 0);
                    ctx.globalCompositeOperation = 'source-over';
                  };
                  img1.src = topImage.dataUrl;
                }
              }
            }}
            style={{
              position: 'absolute',
              maxWidth: 'none',
              transform: `translate(${offsetX}px, ${offsetY}px) scale(${scale})`,
              transformOrigin: 'center center',
              pointerEvents: 'none',
              opacity: 0.8,
            }}
          />
        )}

        {(mode === 'split-vertical' || mode === 'split-horizontal') && (
          <div
            style={{
              ...styles.splitHandle,
              ...(mode === 'split-vertical'
                ? { left: `${splitPosition}%`, top: 0, height: '100%', width: '4px', cursor: 'ew-resize' }
                : { top: `${splitPosition}%`, left: 0, width: '100%', height: '4px', cursor: 'ns-resize' }),
            }}
            onMouseDown={handleSplitDragStart}
          >
            <div style={styles.splitHandleGrip} />
          </div>
        )}

        {selection && selection.width > 0 && selection.height > 0 && (
          <div style={{ ...styles.selectionBox, ...selection }}>
            <div style={styles.selectionHandleTL} />
            <div style={styles.selectionHandleTR} />
            <div style={styles.selectionHandleBL} />
            <div style={styles.selectionHandleBR} />
          </div>
        )}
      </>
    );
  };

  return (
    <div style={styles.container}>
      <style>{`
        .mode-btn:hover {
          box-shadow: 0 0 15px rgba(0, 210, 255, 0.5) !important;
          transform: translateY(-1px);
        }
        .mode-btn.active {
          background: linear-gradient(135deg, #00d2ff, #3a7bd5) !important;
          color: #fff !important;
          box-shadow: 0 0 20px rgba(0, 210, 255, 0.6) !important;
        }
        .action-btn:hover {
          box-shadow: 0 0 15px rgba(181, 55, 242, 0.5) !important;
          transform: translateY(-1px);
        }
        .drop-zone:hover {
          border-color: #00d2ff !important;
          background: rgba(0, 210, 255, 0.05) !important;
        }
        .compare-container {
          transition: all 0.4s ease-in-out;
        }
        .compare-image {
          transition: opacity 0.4s ease-in-out, clip-path 0.4s ease-in-out;
        }
        .crop-btn:hover:not(:disabled) {
          box-shadow: 0 0 20px rgba(0, 210, 255, 0.6) !important;
        }
      `}</style>

      <div style={styles.header}>
        <h3 style={styles.title}>对比面板</h3>
        <div style={styles.modeButtons}>
          {(Object.keys(modeLabels) as CompareMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => handleModeChange(mode)}
              style={{
                ...styles.modeBtn,
                ...(compareState.mode === mode ? styles.modeBtnActive : {}),
              }}
              className={`mode-btn ${compareState.mode === mode ? 'active' : ''}`}
            >
              {modeLabels[mode]}
            </button>
          ))}
        </div>
      </div>

      <div style={styles.scaleIndicator}>
        <span>缩放: {compareState.scale.toFixed(1)}x</span>
        <button onClick={resetView} style={styles.resetBtn} className="action-btn">
          重置视图
        </button>
      </div>

      <div
        ref={containerRef}
        style={styles.compareArea}
        className="compare-container"
        onDragOver={handleDragOver}
        onMouseDown={handleImageMouseDown}
        onWheel={handleWheel}
      >
        <div
          style={{ ...styles.dropZone, ...styles.dropZoneBottom }}
          className="drop-zone"
          onDragOver={handleDragOver}
          onDrop={(e) => handleDrop(e, 'bottom')}
        >
          {!compareState.bottomImage && <span style={styles.dropZoneLabel}>拖入底层图片</span>}
        </div>
        <div
          style={{ ...styles.dropZone, ...styles.dropZoneTop }}
          className="drop-zone"
          onDragOver={handleDragOver}
          onDrop={(e) => handleDrop(e, 'top')}
        >
          {!compareState.topImage && <span style={styles.dropZoneLabel}>拖入顶层图片</span>}
        </div>

        {renderComparisonContent()}
      </div>

      {selection && selection.width > 20 && selection.height > 20 && (
        <div style={styles.cropToolbar}>
          <span style={styles.cropInfo}>
            选框: {Math.round(selection.width)} × {Math.round(selection.height)}px
          </span>
          <button
            onClick={handleCrop}
            style={styles.cropBtn}
            className="crop-btn"
          >
            ✂️ 截取并标注
          </button>
          <button
            onClick={() => setSelection(null)}
            style={styles.cancelBtn}
          >
            取消
          </button>
        </div>
      )}

      <div style={styles.hintBar}>
        <span>💡 提示: 按住 Shift 拖动可框选区域 | Ctrl+滚轮缩放 | 滚轮拖动平移</span>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    background: '#1a1b2e',
    padding: '16px',
    gap: '12px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    color: '#fff',
    fontSize: '16px',
    fontWeight: 600,
    margin: 0,
  },
  modeButtons: {
    display: 'flex',
    gap: '6px',
  },
  modeBtn: {
    padding: '8px 14px',
    background: '#252640',
    border: '1px solid #3a3b5c',
    borderRadius: '8px',
    color: '#8b8ca8',
    fontSize: '12px',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  modeBtnActive: {
    background: 'linear-gradient(135deg, #00d2ff, #3a7bd5)',
    color: '#fff',
    borderColor: 'transparent',
  },
  scaleIndicator: {
    display: 'flex',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: '12px',
    color: '#00d2ff',
    fontSize: '13px',
    fontWeight: 600,
  },
  resetBtn: {
    padding: '6px 12px',
    background: '#252640',
    border: '1px solid #3a3b5c',
    borderRadius: '6px',
    color: '#8b8ca8',
    fontSize: '11px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  compareArea: {
    flex: 1,
    position: 'relative',
    background: '#252640',
    borderRadius: '12px',
    overflow: 'hidden',
    cursor: 'grab',
    border: '2px solid #b537f2',
    boxShadow: '0 0 30px rgba(181, 55, 242, 0.3), inset 0 0 60px rgba(181, 55, 242, 0.1)',
    userSelect: 'none',
  },
  emptyState: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#5a5b7c',
  },
  emptyIcon: {
    fontSize: '48px',
    marginBottom: '16px',
    opacity: 0.5,
  },
  emptyText: {
    fontSize: '16px',
    margin: '0 0 8px 0',
  },
  emptyHint: {
    fontSize: '13px',
    opacity: 0.7,
    margin: 0,
  },
  dropZone: {
    position: 'absolute',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '2px dashed #3a3b5c',
    borderRadius: '8px',
    transition: 'all 0.3s ease',
    zIndex: 1,
    background: 'rgba(255, 255, 255, 0.02)',
  },
  dropZoneBottom: {
    left: '8px',
    top: '50%',
    transform: 'translateY(-50%)',
    width: '45%',
    height: '80%',
  },
  dropZoneTop: {
    right: '8px',
    top: '50%',
    transform: 'translateY(-50%)',
    width: '45%',
    height: '80%',
  },
  dropZoneLabel: {
    color: '#5a5b7c',
    fontSize: '13px',
    fontWeight: 500,
  },
  splitHandle: {
    position: 'absolute',
    background: 'linear-gradient(90deg, #b537f2, #00d2ff)',
    zIndex: 10,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 0 20px rgba(181, 55, 242, 0.8)',
  },
  splitHandleGrip: {
    width: '30px',
    height: '6px',
    background: 'rgba(255, 255, 255, 0.8)',
    borderRadius: '3px',
    boxShadow: '0 2px 6px rgba(0, 0, 0, 0.3)',
  },
  selectionBox: {
    position: 'absolute',
    border: '2px dashed #00d2ff',
    background: 'rgba(0, 210, 255, 0.1)',
    zIndex: 20,
    pointerEvents: 'none',
  },
  selectionHandleTL: {
    position: 'absolute',
    top: '-5px',
    left: '-5px',
    width: '10px',
    height: '10px',
    background: '#00d2ff',
    borderRadius: '50%',
    boxShadow: '0 0 8px rgba(0, 210, 255, 0.8)',
  },
  selectionHandleTR: {
    position: 'absolute',
    top: '-5px',
    right: '-5px',
    width: '10px',
    height: '10px',
    background: '#00d2ff',
    borderRadius: '50%',
    boxShadow: '0 0 8px rgba(0, 210, 255, 0.8)',
  },
  selectionHandleBL: {
    position: 'absolute',
    bottom: '-5px',
    left: '-5px',
    width: '10px',
    height: '10px',
    background: '#00d2ff',
    borderRadius: '50%',
    boxShadow: '0 0 8px rgba(0, 210, 255, 0.8)',
  },
  selectionHandleBR: {
    position: 'absolute',
    bottom: '-5px',
    right: '-5px',
    width: '10px',
    height: '10px',
    background: '#00d2ff',
    borderRadius: '50%',
    boxShadow: '0 0 8px rgba(0, 210, 255, 0.8)',
  },
  cropToolbar: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 16px',
    background: '#252640',
    borderRadius: '10px',
    border: '1px solid #3a3b5c',
  },
  cropInfo: {
    color: '#8b8ca8',
    fontSize: '13px',
    flex: 1,
  },
  cropBtn: {
    padding: '10px 18px',
    background: 'linear-gradient(135deg, #00d2ff, #3a7bd5)',
    border: 'none',
    borderRadius: '8px',
    color: '#fff',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  cancelBtn: {
    padding: '10px 16px',
    background: 'transparent',
    border: '1px solid #3a3b5c',
    borderRadius: '8px',
    color: '#8b8ca8',
    fontSize: '13px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  hintBar: {
    padding: '8px 16px',
    background: 'rgba(0, 210, 255, 0.08)',
    border: '1px solid rgba(0, 210, 255, 0.2)',
    borderRadius: '8px',
    color: '#00d2ff',
    fontSize: '12px',
    textAlign: 'center',
  },
};

export default ComparePanel;
