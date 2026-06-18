import { useRef, useEffect, useCallback, useState, useMemo } from 'react';
import { RotateCcw } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';

export default function DualPanel() {
  const originalImageData = useAppStore((s) => s.originalImageData);
  const simulatedImageData = useAppStore((s) => s.simulatedImageData);
  const metrics = useAppStore((s) => s.metrics);
  const sliderPosition = useAppStore((s) => s.sliderPosition);
  const setSliderPosition = useAppStore((s) => s.setSliderPosition);
  const uploadedImageUrl = useAppStore((s) => s.uploadedImageUrl);
  const inputText = useAppStore((s) => s.inputText);
  const panelSplit = useAppStore((s) => s.panelSplit);
  const setPanelSplit = useAppStore((s) => s.setPanelSplit);
  const colorBlindType = useAppStore((s) => s.colorBlindType);
  const zoom = useAppStore((s) => s.zoom);
  const setZoom = useAppStore((s) => s.setZoom);
  const pan = useAppStore((s) => s.pan);
  const setPan = useAppStore((s) => s.setPan);
  const resetView = useAppStore((s) => s.resetView);

  const containerRef = useRef<HTMLDivElement>(null);
  const leftPanelRef = useRef<HTMLDivElement>(null);
  const rightPanelRef = useRef<HTMLDivElement>(null);
  const originalImgRef = useRef<HTMLImageElement | null>(null);
  const simulatedImgRef = useRef<HTMLImageElement | null>(null);
  const leftContentRef = useRef<HTMLDivElement>(null);
  const rightContentRef = useRef<HTMLDivElement>(null);
  const revealContentRef = useRef<HTMLDivElement>(null);

  const [isDraggingSlider, setIsDraggingSlider] = useState(false);
  const [isDraggingSplit, setIsDraggingSplit] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [showResetTooltip, setShowResetTooltip] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [panelSize, setPanelSize] = useState({ width: 0, height: 0 });

  const hasContent = !!(uploadedImageUrl || inputText);

  const imageSize = useMemo(() => {
    if (originalImageData) {
      return { width: originalImageData.width, height: originalImageData.height };
    }
    if (inputText) {
      return { width: 800, height: 600 };
    }
    return { width: 0, height: 0 };
  }, [originalImageData, inputText]);

  const edgeShadows = useMemo(() => {
    if (!hasContent || imageSize.width === 0 || panelSize.width === 0) {
      return { left: false, right: false, top: false, bottom: false };
    }

    const scaledWidth = imageSize.width * zoom;
    const scaledHeight = imageSize.height * zoom;

    const contentLeft = (panelSize.width - scaledWidth) / 2 + pan.x;
    const contentRight = contentLeft + scaledWidth;
    const contentTop = (panelSize.height - scaledHeight) / 2 + pan.y;
    const contentBottom = contentTop + scaledHeight;

    return {
      left: contentLeft < 0,
      right: contentRight > panelSize.width,
      top: contentTop < 0,
      bottom: contentBottom > panelSize.height,
    };
  }, [zoom, pan, imageSize, hasContent, panelSize]);

  useEffect(() => {
    if (!hasContent) return;
    const panel = leftPanelRef.current;
    if (!panel) return;

    const updateSize = () => {
      setPanelSize({
        width: panel.clientWidth,
        height: panel.clientHeight,
      });
    };

    updateSize();

    const observer = new ResizeObserver(updateSize);
    observer.observe(panel);

    window.addEventListener('resize', updateSize);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateSize);
    };
  }, [hasContent, panelSplit]);

  useEffect(() => {
    if (!uploadedImageUrl) {
      originalImgRef.current = null;
      simulatedImgRef.current = null;
      return;
    }
    const img = new Image();
    img.onload = () => {
      originalImgRef.current = img;
    };
    img.src = uploadedImageUrl;
  }, [uploadedImageUrl]);

  useEffect(() => {
    if (!simulatedImageData) {
      simulatedImgRef.current = null;
      return;
    }
    const canvas = document.createElement('canvas');
    canvas.width = simulatedImageData.width;
    canvas.height = simulatedImageData.height;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.putImageData(simulatedImageData, 0, 0);
    }
    const img = new Image();
    img.onload = () => {
      simulatedImgRef.current = img;
    };
    img.src = canvas.toDataURL();
  }, [simulatedImageData]);

  const renderContentImage = useCallback(
    (img: HTMLImageElement | null, isText: boolean) => {
      if (!hasContent || imageSize.width === 0) return null;

      if (isText && inputText) {
        return (
          <div
            className="content-text"
            style={{ width: imageSize.width, height: imageSize.height }}
          >
            {inputText}
          </div>
        );
      }

      if (img) {
        return (
          <img
            src={img.src}
            alt=""
            style={{ width: imageSize.width, height: imageSize.height }}
            draggable={false}
          />
        );
      }

      return null;
    },
    [inputText, hasContent, imageSize]
  );

  const renderHeatmap = useCallback(() => {
    if (!metrics?.heatmapData || !originalImageData) return null;

    const canvas = document.createElement('canvas');
    canvas.width = originalImageData.width;
    canvas.height = originalImageData.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const heatImageData = new ImageData(
      new Uint8ClampedArray(metrics.heatmapData),
      originalImageData.width,
      originalImageData.height
    );
    ctx.putImageData(heatImageData, 0, 0);

    return (
      <img
        src={canvas.toDataURL()}
        alt=""
        className="heatmap-image"
        style={{ width: imageSize.width, height: imageSize.height }}
        draggable={false}
      />
    );
  }, [metrics, originalImageData, imageSize]);

  const contentTransform = `translate(-50%, -50%) translate(${pan.x}px, ${pan.y}px) scale(${zoom})`;
  const transformOrigin = 'center center';

  const handleSliderMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingSlider(true);
  }, []);

  const handleSliderTouchStart = useCallback((e: React.TouchEvent) => {
    e.stopPropagation();
    setIsDraggingSlider(true);
  }, []);

  useEffect(() => {
    if (!isDraggingSlider) return;

    const handleMove = (clientX: number) => {
      const container = rightPanelRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const x = clientX - rect.left;
      const pos = Math.max(0, Math.min(1, x / rect.width));
      setSliderPosition(pos);
    };

    const handleMouseMove = (e: MouseEvent) => handleMove(e.clientX);
    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) handleMove(e.touches[0].clientX);
    };
    const handleUp = () => setIsDraggingSlider(false);

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleUp);
    window.addEventListener('touchmove', handleTouchMove);
    window.addEventListener('touchend', handleUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleUp);
    };
  }, [isDraggingSlider, setSliderPosition]);

  const handleSplitMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingSplit(true);
  }, []);

  useEffect(() => {
    if (!isDraggingSplit) return;

    const handleMove = (clientX: number) => {
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const split = (clientX - rect.left) / rect.width;
      setPanelSplit(split);
    };

    const handleMouseMove = (e: MouseEvent) => handleMove(e.clientX);
    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) handleMove(e.touches[0].clientX);
    };
    const handleUp = () => setIsDraggingSplit(false);

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleUp);
    window.addEventListener('touchmove', handleTouchMove);
    window.addEventListener('touchend', handleUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleUp);
    };
  }, [isDraggingSplit, setPanelSplit]);

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      setIsTransitioning(true);
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      const newZoom = Math.max(0.5, Math.min(3, zoom * delta));
      setZoom(newZoom);
      setTimeout(() => setIsTransitioning(false), 200);
    },
    [zoom, setZoom]
  );

  const handleZoomSliderChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newZoom = parseFloat(e.target.value);
      setIsTransitioning(true);
      setZoom(newZoom);
      setTimeout(() => setIsTransitioning(false), 200);
    },
    [setZoom]
  );

  const handleContentMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button === 1 || (e.button === 0 && e.altKey)) {
        e.preventDefault();
        setIsPanning(true);
        setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      }
    },
    [pan]
  );

  useEffect(() => {
    if (!isPanning) return;
    const handleMove = (e: MouseEvent) => {
      setPan({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
    };
    const handleUp = () => setIsPanning(false);
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, [isPanning, panStart, setPan]);

  const handleResetView = useCallback(() => {
    setIsTransitioning(true);
    resetView();
    setTimeout(() => setIsTransitioning(false), 200);
  }, [resetView]);

  const getContrastColor = (val: number) => {
    if (val < 1.0) return '#2e7d32';
    if (val < 2.0) return '#f57f17';
    return '#c62828';
  };

  const zoomPercent = Math.round(zoom * 100);

  if (!hasContent) {
    return null;
  }

  const isText = !uploadedImageUrl && !!inputText;

  return (
    <div
      ref={containerRef}
      className="dual-panel-container"
      onWheel={handleWheel}
    >
      <button
        className="reset-view-btn"
        onClick={handleResetView}
        onMouseEnter={() => setShowResetTooltip(true)}
        onMouseLeave={() => setShowResetTooltip(false)}
      >
        <RotateCcw size={16} />
        {showResetTooltip && <span className="reset-tooltip">重置视图</span>}
      </button>

      <div key={zoomPercent} className="zoom-percent-indicator">
        {zoomPercent}%
      </div>

      <div
        ref={leftPanelRef}
        className="panel panel-left"
        style={{ width: `${panelSplit * 100}%` }}
      >
        <div className="panel-label">原始视图</div>
        {imageSize.width > 0 && (
          <div className="dimension-label">
            {imageSize.width}x{imageSize.height}
          </div>
        )}

        <div
          className={`edge-shadow edge-shadow-left ${edgeShadows.left ? 'visible' : ''}`}
        />
        <div
          className={`edge-shadow edge-shadow-right ${edgeShadows.right ? 'visible' : ''}`}
        />
        <div
          className={`edge-shadow edge-shadow-top ${edgeShadows.top ? 'visible' : ''}`}
        />
        <div
          className={`edge-shadow edge-shadow-bottom ${edgeShadows.bottom ? 'visible' : ''}`}
        />

        <div
          ref={leftContentRef}
          className={`content-wrapper ${isTransitioning ? 'with-transition' : ''}`}
          style={{
            transform: contentTransform,
            transformOrigin,
            width: imageSize.width,
            height: imageSize.height,
          }}
          onMouseDown={handleContentMouseDown}
        >
          {renderContentImage(originalImgRef.current, isText)}
        </div>
      </div>

      <div
        className={`panel-splitter ${isDraggingSplit ? 'active' : ''}`}
        onMouseDown={handleSplitMouseDown}
      >
        <div className="splitter-line" />
      </div>

      <div
        ref={rightPanelRef}
        className="panel panel-right"
        style={{ width: `${(1 - panelSplit) * 100}%` }}
      >
        <div className="panel-label">模拟视图</div>
        {imageSize.width > 0 && (
          <div className="dimension-label">
            {imageSize.width}x{imageSize.height}
          </div>
        )}

        <div
          className={`edge-shadow edge-shadow-left ${edgeShadows.left ? 'visible' : ''}`}
        />
        <div
          className={`edge-shadow edge-shadow-right ${edgeShadows.right ? 'visible' : ''}`}
        />
        <div
          className={`edge-shadow edge-shadow-top ${edgeShadows.top ? 'visible' : ''}`}
        />
        <div
          className={`edge-shadow edge-shadow-bottom ${edgeShadows.bottom ? 'visible' : ''}`}
        />

        <div
          ref={rightContentRef}
          className={`content-wrapper ${isTransitioning ? 'with-transition' : ''}`}
          style={{
            transform: contentTransform,
            transformOrigin,
            width: imageSize.width,
            height: imageSize.height,
          }}
          onMouseDown={handleContentMouseDown}
        >
          {renderContentImage(simulatedImgRef.current, isText)}
          {renderHeatmap()}
        </div>

        <div
          className="slider-reveal"
          style={{ width: `${sliderPosition * 100}%` }}
        >
          <div
            ref={revealContentRef}
            className={`content-wrapper ${isTransitioning ? 'with-transition' : ''}`}
            style={{
              transform: contentTransform,
              transformOrigin,
              width: imageSize.width,
              height: imageSize.height,
            }}
            onMouseDown={handleContentMouseDown}
          >
            {renderContentImage(originalImgRef.current, isText)}
          </div>
        </div>

        <div
          className="comparison-slider"
          style={{ left: `${sliderPosition * 100}%` }}
          onMouseDown={handleSliderMouseDown}
          onTouchStart={handleSliderTouchStart}
        >
          <div className="slider-line" />
          <div className="slider-handle" />
        </div>
      </div>

      {metrics && (
        <div className="metrics-bar">
          <div className="metric-item">
            <span className="metric-label">ΔE (平均色差)</span>
            <span
              className="metric-value"
              style={{ color: getContrastColor(metrics.avgDeltaE / 10) }}
            >
              {metrics.avgDeltaE.toFixed(2)}
            </span>
          </div>
          <div className="metric-item">
            <span className="metric-label">WCAG对比度差异</span>
            <span
              className="metric-value"
              style={{ color: getContrastColor(metrics.wcagContrastDiff) }}
            >
              {metrics.wcagContrastDiff.toFixed(2)}
            </span>
          </div>
          <div className="metric-item">
            <span className="metric-label">差异区域</span>
            <span className="metric-value">
              {metrics.diffRegions.length}
            </span>
          </div>
        </div>
      )}

      <div className="zoom-control-bar">
        <span className="zoom-label">缩放</span>
        <input
          type="range"
          min="0.5"
          max="3"
          step="0.1"
          value={zoom}
          onChange={handleZoomSliderChange}
          className="zoom-slider"
        />
        <span className="zoom-value">{zoom.toFixed(1)}x</span>
      </div>
    </div>
  );
}
