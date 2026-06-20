import React, { useRef, useEffect, useCallback } from 'react';

interface ComparisonViewProps {
  imageA: string | null;
  imageB: string | null;
  mode: 'opacity' | 'split';
  opacity: number;
  sliderPos: number;
  onOpacityChange: (val: number) => void;
  onSliderChange: (val: number) => void;
  scale: number;
  offsetX: number;
  offsetY: number;
  canvasRef: React.RefObject<HTMLCanvasElement>;
  containerRef: React.RefObject<HTMLDivElement>;
}

const ComparisonView: React.FC<ComparisonViewProps> = ({
  imageA,
  imageB,
  mode,
  opacity,
  sliderPos,
  onOpacityChange,
  onSliderChange,
  scale,
  offsetX,
  offsetY,
  canvasRef,
  containerRef,
}) => {
  const imgARef = useRef<HTMLImageElement | null>(null);
  const imgBRef = useRef<HTMLImageElement | null>(null);
  const rafRef = useRef<number>(0);

  const loadImage = useCallback(
    (src: string | null, ref: React.MutableRefObject<HTMLImageElement | null>) => {
      if (!src) {
        ref.current = null;
        return;
      }
      const img = new Image();
      img.onload = () => {
        ref.current = img;
      };
      img.src = src;
    },
    []
  );

  useEffect(() => {
    loadImage(imageA, imgARef);
  }, [imageA, loadImage]);

  useEffect(() => {
    loadImage(imageB, imgBRef);
  }, [imageB, loadImage]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const container = containerRef.current;
    if (!container) return;

    const w = container.clientWidth;
    const h = container.clientHeight;

    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }

    ctx.clearRect(0, 0, w, h);

    const imgA = imgARef.current;
    const imgB = imgBRef.current;

    const fitImage = (img: HTMLImageElement) => {
      const imgAspect = img.naturalWidth / img.naturalHeight;
      const canvasAspect = w / h;
      let drawW: number, drawH: number, drawX: number, drawY: number;
      if (imgAspect > canvasAspect) {
        drawW = w;
        drawH = w / imgAspect;
        drawX = 0;
        drawY = (h - drawH) / 2;
      } else {
        drawH = h;
        drawW = h * imgAspect;
        drawX = (w - drawW) / 2;
        drawY = 0;
      }
      return { drawX, drawY, drawW, drawH };
    };

    if (mode === 'opacity') {
      if (imgA) {
        const { drawX, drawY, drawW, drawH } = fitImage(imgA);
        ctx.globalAlpha = 1;
        ctx.drawImage(imgA, drawX, drawY, drawW, drawH);
      }
      if (imgB) {
        const { drawX, drawY, drawW, drawH } = fitImage(imgB);
        ctx.globalAlpha = opacity / 100;
        ctx.drawImage(imgB, drawX, drawY, drawW, drawH);
      }
      ctx.globalAlpha = 1;
    } else if (mode === 'split') {
      const splitX = (sliderPos / 100) * w;

      if (imgA) {
        const { drawX, drawY, drawW, drawH } = fitImage(imgA);
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, 0, splitX, h);
        ctx.clip();
        ctx.drawImage(imgA, drawX, drawY, drawW, drawH);
        ctx.restore();
      }

      if (imgB) {
        const { drawX, drawY, drawW, drawH } = fitImage(imgB);
        ctx.save();
        ctx.beginPath();
        ctx.rect(splitX, 0, w - splitX, h);
        ctx.clip();
        ctx.drawImage(imgB, drawX, drawY, drawW, drawH);
        ctx.restore();
      }
    }
  }, [canvasRef, containerRef, mode, opacity, sliderPos]);

  useEffect(() => {
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, [draw]);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const resizeObserver = new ResizeObserver(() => {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(draw);
    });
    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, [containerRef, canvasRef, draw]);

  return (
    <div className="canvas-area" ref={containerRef}>
      <div
        className="canvas-container"
        style={{
          transform: `scale(${scale}) translate(${offsetX}px, ${offsetY}px)`,
        }}
      >
        <canvas ref={canvasRef} className="comparison-canvas" />
      </div>
      <div className="zoom-indicator">{scale.toFixed(1)}x</div>
    </div>
  );
};

export default ComparisonView;
