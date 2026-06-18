import { useRef, useEffect, useCallback, useState } from 'react';
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

  const containerRef = useRef<HTMLDivElement>(null);
  const leftCanvasRef = useRef<HTMLCanvasElement>(null);
  const rightCanvasRef = useRef<HTMLCanvasElement>(null);
  const heatmapCanvasRef = useRef<HTMLCanvasElement>(null);
  const originalImgRef = useRef<HTMLImageElement | null>(null);
  const simulatedImgRef = useRef<HTMLImageElement | null>(null);

  const [isDraggingSlider, setIsDraggingSlider] = useState(false);
  const [isDraggingSplit, setIsDraggingSplit] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  const hasContent = !!(uploadedImageUrl || inputText);

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

  const drawPanel = useCallback(
    (canvas: HTMLCanvasElement | null, img: HTMLImageElement | null, isText: boolean) => {
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, rect.width, rect.height);

      ctx.save();
      ctx.translate(pan.x, pan.y);
      ctx.scale(zoom, zoom);

      if (isText && inputText) {
        ctx.fillStyle = '#333333';
        ctx.font = '16px monospace';
        const lines = inputText.split('\n');
        const lineHeight = 24;
        const maxWidth = rect.width / zoom - 40;
        let y = 30;
        for (const line of lines) {
          const words = line || ' ';
          ctx.fillText(words, 20, y, maxWidth);
          y += lineHeight;
          if (y > rect.height / zoom) break;
        }
      } else if (img) {
        const imgW = img.width;
        const imgH = img.height;
        const canvasW = rect.width / zoom;
        const canvasH = rect.height / zoom;
        const scale = Math.min(canvasW / imgW, canvasH / imgH, 1);
        const drawW = imgW * scale;
        const drawH = imgH * scale;
        const offsetX = (canvasW - drawW) / 2;
        const offsetY = (canvasH - drawH) / 2;
        ctx.drawImage(img, offsetX, offsetY, drawW, drawH);
      }

      ctx.restore();
    },
    [zoom, pan, inputText]
  );

  const drawHeatmap = useCallback(
    (canvas: HTMLCanvasElement | null) => {
      if (!canvas || !metrics?.heatmapData || !originalImageData) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, rect.width, rect.height);

      const heatImageData = new ImageData(
        new Uint8ClampedArray(metrics.heatmapData),
        originalImageData.width,
        originalImageData.height
      );
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = originalImageData.width;
      tempCanvas.height = originalImageData.height;
      const tempCtx = tempCanvas.getContext('2d');
      if (!tempCtx) return;
      tempCtx.putImageData(heatImageData, 0, 0);

      ctx.save();
      ctx.translate(pan.x, pan.y);
      ctx.scale(zoom, zoom);

      const imgW = originalImageData.width;
      const imgH = originalImageData.height;
      const canvasW = rect.width / zoom;
      const canvasH = rect.height / zoom;
      const scale = Math.min(canvasW / imgW, canvasH / imgH, 1);
      const drawW = imgW * scale;
      const drawH = imgH * scale;
      const offsetX = (canvasW - drawW) / 2;
      const offsetY = (canvasH - drawH) / 2;
      ctx.drawImage(tempCanvas, offsetX, offsetY, drawW, drawH);

      ctx.restore();
    },
    [metrics, originalImageData, zoom, pan]
  );

  useEffect(() => {
    if (!hasContent) return;
    const isText = !uploadedImageUrl && !!inputText;
    drawPanel(leftCanvasRef.current, originalImgRef.current, isText);
    drawPanel(rightCanvasRef.current, simulatedImgRef.current, isText);
    drawHeatmap(heatmapCanvasRef.current);
  }, [hasContent, uploadedImageUrl, inputText, drawPanel, drawHeatmap, simulatedImageData]);

  useEffect(() => {
    const handleResize = () => {
      if (!hasContent) return;
      const isText = !uploadedImageUrl && !!inputText;
      drawPanel(leftCanvasRef.current, originalImgRef.current, isText);
      drawPanel(rightCanvasRef.current, simulatedImgRef.current, isText);
      drawHeatmap(heatmapCanvasRef.current);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [hasContent, uploadedImageUrl, inputText, drawPanel, drawHeatmap]);

  const handleSliderMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDraggingSlider(true);
  }, []);

  const handleSliderTouchStart = useCallback((e: React.TouchEvent) => {
    setIsDraggingSlider(true);
  }, []);

  useEffect(() => {
    if (!isDraggingSlider) return;

    const handleMove = (clientX: number) => {
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const rightPanelStart = rect.left + rect.width * panelSplit;
      const rightPanelWidth = rect.width * (1 - panelSplit);
      const x = clientX - rightPanelStart;
      const pos = Math.max(0, Math.min(1, x / rightPanelWidth));
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
  }, [isDraggingSlider, panelSplit, setSliderPosition]);

  const handleSplitMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
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

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom((z) => Math.max(0.1, Math.min(10, z * delta)));
  }, []);

  const handleCanvasMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button === 1 || (e.button === 0 && e.altKey)) {
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
  }, [isPanning, panStart]);

  const getContrastColor = (val: number) => {
    if (val < 1.0) return '#2e7d32';
    if (val < 2.0) return '#f57f17';
    return '#c62828';
  };

  if (!hasContent) {
    return null;
  }

  return (
    <div
      ref={containerRef}
      className="dual-panel-container"
      onWheel={handleWheel}
    >
      <div
        className="panel panel-left"
        style={{ width: `${panelSplit * 100}%` }}
      >
        <div className="panel-label">原始视图</div>
        <canvas
          ref={leftCanvasRef}
          className="panel-canvas"
          onMouseDown={handleCanvasMouseDown}
        />
      </div>

      <div
        className={`panel-splitter ${isDraggingSplit ? 'active' : ''}`}
        onMouseDown={handleSplitMouseDown}
      >
        <div className="splitter-line" />
      </div>

      <div
        className="panel panel-right"
        style={{ width: `${(1 - panelSplit) * 100}%` }}
      >
        <div className="panel-label">模拟视图</div>
        <canvas
          ref={rightCanvasRef}
          className="panel-canvas"
          onMouseDown={handleCanvasMouseDown}
        />
        <canvas
          ref={heatmapCanvasRef}
          className="heatmap-overlay"
        />

        <div
          className="comparison-slider"
          style={{ left: `${sliderPosition * 100}%` }}
          onMouseDown={handleSliderMouseDown}
          onTouchStart={handleSliderTouchStart}
        >
          <div className="slider-line" />
          <div className="slider-handle" />
        </div>

        <div
          className="slider-reveal"
          style={{ width: `${sliderPosition * 100}%` }}
        >
          <canvas
            ref={leftCanvasRef}
            className="panel-canvas reveal-canvas"
            onMouseDown={handleCanvasMouseDown}
          />
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
    </div>
  );
}
