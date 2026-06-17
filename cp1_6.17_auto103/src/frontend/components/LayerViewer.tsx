import { useRef, useEffect, useCallback, useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import type { Layer } from '../types';

interface LayerImageCache {
  [key: string]: HTMLImageElement;
}

export default function LayerViewer() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imageCacheRef = useRef<LayerImageCache>({});
  const animatingLayersRef = useRef<Set<string>>(new Set());
  const rafRef = useRef<number | null>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });
  const [zoom, setZoom] = useState(1);
  const [loadingImages, setLoadingImages] = useState(true);

  const { layers, currentWork } = useAppStore();

  const preloadImages = useCallback(async (layerList: Layer[]) => {
    setLoadingImages(true);
    const cache = imageCacheRef.current;
    const promises: Promise<void>[] = [];

    layerList.forEach((layer) => {
      if (!cache[layer.id]) {
        promises.push(
          new Promise((resolve) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
              cache[layer.id] = img;
              resolve();
            };
            img.onerror = () => resolve();
            img.src = layer.imageBase64;
          })
        );
      }
    });

    await Promise.all(promises);
    setLoadingImages(false);
  }, []);

  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const startTime = performance.now();

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#0a0a14';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const sortedLayers = [...layers].sort((a, b) => a.order - b.order);

    sortedLayers.forEach((layer) => {
      if (!layer.visible && !animatingLayersRef.current.has(layer.id)) return;

      const img = imageCacheRef.current[layer.id];
      if (!img) return;

      const dpr = window.devicePixelRatio || 1;
      const drawWidth = canvas.width / dpr / zoom;
      const drawHeight = canvas.height / dpr / zoom;
      const imgAspect = img.width / img.height;
      const canvasAspect = drawWidth / drawHeight;

      let renderW: number, renderH: number, offsetX: number, offsetY: number;

      if (imgAspect > canvasAspect) {
        renderW = drawWidth;
        renderH = drawWidth / imgAspect;
        offsetX = 0;
        offsetY = (drawHeight - renderH) / 2;
      } else {
        renderH = drawHeight;
        renderW = drawHeight * imgAspect;
        offsetX = (drawWidth - renderW) / 2;
        offsetY = 0;
      }

      ctx.save();
      ctx.globalAlpha = layer.visible ? layer.opacity : 0;
      ctx.drawImage(img, offsetX, offsetY, renderW, renderH);
      ctx.restore();
    });

    const elapsed = performance.now() - startTime;
    if (elapsed > 16) {
      console.warn(`Canvas render took ${elapsed.toFixed(2)}ms (target < 16ms)`);
    }
  }, [layers, zoom]);

  useEffect(() => {
    preloadImages(layers);
  }, [layers, preloadImages]);

  useEffect(() => {
    const updateSize = () => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const width = Math.max(300, rect.width);
      const height = Math.max(400, rect.height);
      setCanvasSize({ width, height });

      const canvas = canvasRef.current;
      if (canvas) {
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
        const ctx = canvas.getContext('2d');
        if (ctx) ctx.scale(dpr, dpr);
      }
    };

    updateSize();
    const ro = new ResizeObserver(updateSize);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (loadingImages) return;

    const render = () => {
      drawCanvas();
      if (animatingLayersRef.current.size > 0) {
        rafRef.current = requestAnimationFrame(render);
      }
    };

    drawCanvas();

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [drawCanvas, loadingImages, canvasSize]);

  useEffect(() => {
    const handler = () => {
      const startTime = performance.now();
      drawCanvas();
      const elapsed = performance.now() - startTime;
      console.log(`Layer reorder redraw: ${elapsed.toFixed(2)}ms`);
    };
    handler();
  }, [layers.map((l) => `${l.id}-${l.order}-${l.visible}-${l.opacity}`).join(','), drawCanvas]);

  const animateVisibility = (layerId: string, targetVisible: boolean) => {
    animatingLayersRef.current.add(layerId);

    const render = () => {
      drawCanvas();
      setTimeout(() => {
        animatingLayersRef.current.delete(layerId);
        drawCanvas();
      }, 200);
    };
    render();
  };

  const { toggleLayerVisibility } = useAppStore();

  const handleToggleVisibility = (layerId: string) => {
    const layer = layers.find((l) => l.id === layerId);
    if (layer) {
      animateVisibility(layerId, !layer.visible);
      toggleLayerVisibility(layerId);
    }
  };

  return (
    <div ref={containerRef} style={styles.container}>
      <div style={styles.toolbar}>
        <span style={styles.workTitle}>
          {currentWork?.title || '作品预览'}
        </span>
        <div style={styles.zoomControls}>
          <button
            onClick={() => setZoom((z) => Math.max(0.5, z - 0.1))}
            style={styles.zoomBtn}
          >
            −
          </button>
          <span style={styles.zoomLabel}>{Math.round(zoom * 100)}%</span>
          <button
            onClick={() => setZoom((z) => Math.min(2, z + 0.1))}
            style={styles.zoomBtn}
          >
            +
          </button>
          <button onClick={() => setZoom(1)} style={styles.resetBtn}>
            重置
          </button>
        </div>
      </div>

      <div style={styles.canvasWrap}>
        {loadingImages && (
          <div style={styles.loadingOverlay}>
            <div style={styles.loadingSpinner} />
            <span style={styles.loadingText}>正在加载图层...</span>
          </div>
        )}
        <canvas
          ref={canvasRef}
          style={{
            ...styles.canvas,
            opacity: loadingImages ? 0 : 1,
            transition: 'opacity 0.2s ease'
          }}
        />
      </div>

      <div style={styles.hintBar}>
        <span style={styles.hintText}>
          图层: {layers.filter((l) => l.visible).length}/{layers.length} 可见 ·
          拖拽右侧图层列表可调整顺序 · 点击眼睛图标开关可见性
        </span>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: '#0f0f1a',
    position: 'relative',
    overflow: 'hidden'
  },
  toolbar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 20px',
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderBottom: '1px solid rgba(255,255,255,0.05)'
  },
  workTitle: {
    fontSize: 15,
    fontWeight: 600
  },
  zoomControls: {
    display: 'flex',
    alignItems: 'center',
    gap: 8
  },
  zoomBtn: {
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: 'var(--bg-tertiary)',
    color: 'var(--text-primary)',
    fontSize: 18,
    fontWeight: 600,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  zoomLabel: {
    fontSize: 13,
    color: 'var(--text-secondary)',
    minWidth: 48,
    textAlign: 'center'
  },
  resetBtn: {
    padding: '6px 12px',
    borderRadius: 6,
    backgroundColor: 'var(--secondary)',
    color: 'var(--text-primary)',
    fontSize: 12
  },
  canvasWrap: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
    backgroundImage:
      'linear-gradient(45deg, #1a1a2e 25%, transparent 25%), linear-gradient(-45deg, #1a1a2e 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #1a1a2e 75%), linear-gradient(-45deg, transparent 75%, #1a1a2e 75%)',
    backgroundSize: '20px 20px',
    backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px'
  },
  canvas: {
    maxWidth: '100%',
    maxHeight: '100%',
    borderRadius: 4,
    boxShadow: '0 4px 24px rgba(0,0,0,0.5)'
  },
  loadingOverlay: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    zIndex: 10
  },
  loadingSpinner: {
    width: 40,
    height: 40,
    border: '3px solid var(--border)',
    borderTopColor: 'var(--accent)',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  },
  loadingText: {
    fontSize: 14,
    color: 'var(--text-muted)'
  },
  hintBar: {
    padding: '10px 20px',
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderTop: '1px solid rgba(255,255,255,0.05)'
  },
  hintText: {
    fontSize: 12,
    color: 'var(--text-muted)'
  }
};
