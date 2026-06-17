import React, { useRef, useEffect, useState, useCallback } from 'react';

export interface FilterParams {
  type: 'pixelate' | 'oil' | 'watercolor' | 'sketch';
  pixelSize: number;
  oilBrushSize: number;
  oilDetail: number;
  watercolorSpread: number;
  watercolorEdgeBlur: number;
  sketchLineWidth: number;
  sketchShadow: number;
}

interface ImagePreviewProps {
  image: HTMLImageElement | null;
  filter: FilterParams;
  compareMode: boolean;
  onCanvasReady: (canvas: HTMLCanvasElement | null) => void;
}

function applyPixelate(ctx: CanvasRenderingContext2D, width: number, height: number, pixelSize: number) {
  const size = Math.max(2, Math.round(pixelSize));
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;

  for (let y = 0; y < height; y += size) {
    for (let x = 0; x < width; x += size) {
      let r = 0, g = 0, b = 0, count = 0;
      for (let dy = 0; dy < size && y + dy < height; dy++) {
        for (let dx = 0; dx < size && x + dx < width; dx++) {
          const idx = ((y + dy) * width + (x + dx)) * 4;
          r += data[idx];
          g += data[idx + 1];
          b += data[idx + 2];
          count++;
        }
      }
      r = Math.round(r / count);
      g = Math.round(g / count);
      b = Math.round(b / count);
      for (let dy = 0; dy < size && y + dy < height; dy++) {
        for (let dx = 0; dx < size && x + dx < width; dx++) {
          const idx = ((y + dy) * width + (x + dx)) * 4;
          data[idx] = r;
          data[idx + 1] = g;
          data[idx + 2] = b;
        }
      }
    }
  }
  ctx.putImageData(imageData, 0, 0);
}

function applyOil(ctx: CanvasRenderingContext2D, width: number, height: number, brushSize: number, _detail: number) {
  const radius = Math.max(1, Math.round(brushSize / 2));
  const imageData = ctx.getImageData(0, 0, width, height);
  const src = new Uint8ClampedArray(imageData.data);
  const dst = imageData.data;
  const intensityLevels = 20;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const count = new Array(intensityLevels).fill(0);
      const avgR = new Array(intensityLevels).fill(0);
      const avgG = new Array(intensityLevels).fill(0);
      const avgB = new Array(intensityLevels).fill(0);

      for (let dy = -radius; dy <= radius; dy++) {
        const ny = Math.min(height - 1, Math.max(0, y + dy));
        for (let dx = -radius; dx <= radius; dx++) {
          const nx = Math.min(width - 1, Math.max(0, x + dx));
          const idx = (ny * width + nx) * 4;
          const intensity = Math.floor(
            ((src[idx] + src[idx + 1] + src[idx + 2]) / 3) * (intensityLevels - 1) / 255
          );
          count[intensity]++;
          avgR[intensity] += src[idx];
          avgG[intensity] += src[idx + 1];
          avgB[intensity] += src[idx + 2];
        }
      }

      let maxCount = 0;
      let maxIdx = 0;
      for (let i = 0; i < intensityLevels; i++) {
        if (count[i] > maxCount) {
          maxCount = count[i];
          maxIdx = i;
        }
      }

      const outIdx = (y * width + x) * 4;
      dst[outIdx] = avgR[maxIdx] / maxCount;
      dst[outIdx + 1] = avgG[maxIdx] / maxCount;
      dst[outIdx + 2] = avgB[maxIdx] / maxCount;
    }
  }
  ctx.putImageData(imageData, 0, 0);
}

function applyWatercolor(ctx: CanvasRenderingContext2D, width: number, height: number, spread: number, edgeBlur: number) {
  const radius = Math.max(1, Math.round(spread));
  const blurPasses = Math.max(0, Math.round(edgeBlur));

  let imageData = ctx.getImageData(0, 0, width, height);

  for (let pass = 0; pass < blurPasses + 1; pass++) {
    const src = new Uint8ClampedArray(imageData.data);
    const dst = imageData.data;
    const r = pass === 0 ? radius : Math.max(1, Math.round(radius * 0.5));

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let totalR = 0, totalG = 0, totalB = 0, count = 0;
        for (let dy = -r; dy <= r; dy++) {
          const ny = Math.min(height - 1, Math.max(0, y + dy));
          for (let dx = -r; dx <= r; dx++) {
            const nx = Math.min(width - 1, Math.max(0, x + dx));
            const idx = (ny * width + nx) * 4;
            totalR += src[idx];
            totalG += src[idx + 1];
            totalB += src[idx + 2];
            count++;
          }
        }
        const outIdx = (y * width + x) * 4;
        dst[outIdx] = totalR / count;
        dst[outIdx + 1] = totalG / count;
        dst[outIdx + 2] = totalB / count;
      }
    }
  }

  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    data[i] = Math.round(data[i] / 8) * 8;
    data[i + 1] = Math.round(data[i + 1] / 8) * 8;
    data[i + 2] = Math.round(data[i + 2] / 8) * 8;
  }

  ctx.putImageData(imageData, 0, 0);
}

function applySketch(ctx: CanvasRenderingContext2D, width: number, height: number, lineWidth: number, shadow: number) {
  const imageData = ctx.getImageData(0, 0, width, height);
  const src = new Uint8ClampedArray(imageData.data);
  const gray = new Float32Array(width * height);

  for (let i = 0; i < gray.length; i++) {
    const idx = i * 4;
    gray[i] = 0.299 * src[idx] + 0.587 * src[idx + 1] + 0.114 * src[idx + 2];
  }

  const edge = new Float32Array(width * height);
  const strength = lineWidth;

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = y * width + x;
      const gx = -gray[idx - width - 1] - 2 * gray[idx - 1] - gray[idx + width - 1]
        + gray[idx - width + 1] + 2 * gray[idx + 1] + gray[idx + width + 1];
      const gy = -gray[idx - width - 1] - 2 * gray[idx - width] - gray[idx - width + 1]
        + gray[idx + width - 1] + 2 * gray[idx + width] + gray[idx + width + 1];
      edge[idx] = Math.sqrt(gx * gx + gy * gy) * strength / 4;
    }
  }

  const dst = imageData.data;
  for (let i = 0; i < edge.length; i++) {
    const v = Math.max(0, Math.min(255, 255 - edge[i] * shadow));
    dst[i * 4] = v;
    dst[i * 4 + 1] = v;
    dst[i * 4 + 2] = v;
  }

  ctx.putImageData(imageData, 0, 0);
}

const ImagePreview: React.FC<ImagePreviewProps> = ({ image, filter, compareMode, onCanvasReady }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const originalCanvasRef = useRef<HTMLCanvasElement>(null);
  const [fps, setFps] = useState(0);
  const [dividerPos, setDividerPos] = useState(0.5);
  const isDraggingDivider = useRef(false);
  const frameCount = useRef(0);
  const lastFpsTime = useRef(performance.now());
  const rafRef = useRef<number>(0);

  const renderFiltered = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !image) return;

    const maxW = 1920;
    const maxH = 1080;
    let w = image.naturalWidth;
    let h = image.naturalHeight;
    if (w > maxW || h > maxH) {
      const scale = Math.min(maxW / w, maxH / h);
      w = Math.round(w * scale);
      h = Math.round(h * scale);
    }

    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    ctx.drawImage(image, 0, 0, w, h);

    switch (filter.type) {
      case 'pixelate':
        applyPixelate(ctx, w, h, filter.pixelSize);
        break;
      case 'oil':
        applyOil(ctx, w, h, filter.oilBrushSize, filter.oilDetail);
        break;
      case 'watercolor':
        applyWatercolor(ctx, w, h, filter.watercolorSpread, filter.watercolorEdgeBlur);
        break;
      case 'sketch':
        applySketch(ctx, w, h, filter.sketchLineWidth, filter.sketchShadow);
        break;
    }

    frameCount.current++;
    const now = performance.now();
    if (now - lastFpsTime.current >= 1000) {
      setFps(frameCount.current);
      frameCount.current = 0;
      lastFpsTime.current = now;
    }
  }, [image, filter]);

  useEffect(() => {
    onCanvasReady(canvasRef.current);
  }, [onCanvasReady]);

  useEffect(() => {
    if (!image) return;
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      renderFiltered();
    });
    return () => cancelAnimationFrame(rafRef.current);
  }, [renderFiltered, image]);

  useEffect(() => {
    if (!image || !compareMode) return;
    const oc = originalCanvasRef.current;
    if (!oc) return;

    let w = image.naturalWidth;
    let h = image.naturalHeight;
    const maxW = 1920;
    const maxH = 1080;
    if (w > maxW || h > maxH) {
      const scale = Math.min(maxW / w, maxH / h);
      w = Math.round(w * scale);
      h = Math.round(h * scale);
    }
    oc.width = w;
    oc.height = h;
    const ctx = oc.getContext('2d');
    if (ctx) ctx.drawImage(image, 0, 0, w, h);
  }, [image, compareMode]);

  const handleDividerMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDraggingDivider.current = true;
  }, []);

  useEffect(() => {
    if (!compareMode) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingDivider.current) return;
      const container = document.getElementById('compare-container');
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const pos = (e.clientX - rect.left) / rect.width;
      setDividerPos(Math.max(0.05, Math.min(0.95, pos)));
    };

    const handleMouseUp = () => {
      isDraggingDivider.current = false;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [compareMode]);

  if (!image) {
    return (
      <div className="preview-area">
        <div className="no-image-placeholder">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <polyline points="21 15 16 10 5 21" />
          </svg>
          <p>Upload an image to start editing</p>
        </div>
      </div>
    );
  }

  if (compareMode) {
    return (
      <div className="preview-area">
        <div className="fps-counter">{fps} FPS</div>
        <div className="compare-container" id="compare-container">
          <div className="compare-canvas-wrapper" style={{ clipPath: `inset(0 ${(1 - dividerPos) * 100}% 0 0)` }}>
            <canvas ref={originalCanvasRef} style={{ maxWidth: '100%', maxHeight: 'calc(100vh - 80px)', borderRadius: 8 }} />
          </div>
          <div className="compare-canvas-wrapper" style={{ clipPath: `inset(0 0 0 ${dividerPos * 100}%)` }}>
            <canvas ref={canvasRef} style={{ maxWidth: '100%', maxHeight: 'calc(100vh - 80px)', borderRadius: 8 }} />
          </div>
          <div
            className="compare-divider"
            style={{ left: `${dividerPos * 100}%` }}
            onMouseDown={handleDividerMouseDown}
          />
          <div className="compare-label original">Original</div>
          <div className="compare-label filtered">Filtered</div>
        </div>
      </div>
    );
  }

  return (
    <div className="preview-area">
      <div className="fps-counter">{fps} FPS</div>
      <div className="canvas-wrapper">
        <canvas ref={canvasRef} />
      </div>
    </div>
  );
};

export default ImagePreview;
