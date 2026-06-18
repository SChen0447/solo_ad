import { useCallback, useEffect, useRef, useState, type FC } from 'react';
import styles from './SignatureCanvas.module.css';

interface Props {
  label: string;
  signerName: string;
  existingSignature?: string;
  onSignatureChange?: (dataUrl: string | undefined) => void;
}

export const SignatureCanvas: FC<Props> = ({
  label,
  signerName,
  existingSignature,
  onSignatureChange,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(!!existingSignature);
  const [showRipple, setShowRipple] = useState(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);

  const getCanvasPoint = useCallback(
    (e: MouseEvent | TouchEvent): { x: number; y: number } | null => {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;

      if ('touches' in e) {
        if (!e.touches[0]) return null;
        return {
          x: (e.touches[0].clientX - rect.left) * scaleX,
          y: (e.touches[0].clientY - rect.top) * scaleY,
        };
      }
      return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY,
      };
    },
    []
  );

  const drawGrid = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const step = 20;
    ctx.fillStyle = '#D5DBDB';
    for (let x = step; x < canvas.width; x += step) {
      for (let y = step; y < canvas.height; y += step) {
        ctx.beginPath();
        ctx.arc(x, y, 1, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }, []);

  const loadExistingSignature = useCallback(async () => {
    if (!existingSignature) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      drawGrid();
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    };
    img.src = existingSignature;
  }, [existingSignature, drawGrid]);

  const initCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const dpr = window.devicePixelRatio || 1;
    const width = container.clientWidth;
    const height = 200;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const ctx = canvas.getContext('2d');
    if (ctx) ctx.scale(dpr, dpr);
    drawGrid();
    if (existingSignature) {
      loadExistingSignature();
    }
  }, [drawGrid, existingSignature, loadExistingSignature]);

  useEffect(() => {
    initCanvas();
    let resizeTimer: number | undefined;
    const onResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => {
        initCanvas();
        setHasDrawn(!!existingSignature);
        if (existingSignature) onSignatureChange?.(existingSignature);
      }, 150);
    };
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      clearTimeout(resizeTimer);
    };
  }, [initCanvas, existingSignature, onSignatureChange]);

  const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
    const p = getCanvasPoint(e.nativeEvent as MouseEvent | TouchEvent);
    if (!p) return;
    setIsDrawing(true);
    lastPointRef.current = p;
    if (e.nativeEvent instanceof Event) e.nativeEvent.preventDefault();
  };

  const doDraw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const p = getCanvasPoint(e.nativeEvent as MouseEvent | TouchEvent);
    if (!p || !lastPointRef.current) return;

    const dpr = window.devicePixelRatio || 1;
    ctx.strokeStyle = '#2C3E50';
    ctx.lineWidth = 2.2 / dpr;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(lastPointRef.current.x, lastPointRef.current.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    lastPointRef.current = p;
    setHasDrawn(true);
    if (e.nativeEvent instanceof Event) e.nativeEvent.preventDefault();
  };

  const endDraw = () => {
    setIsDrawing(false);
    lastPointRef.current = null;
  };

  const triggerRipple = () => {
    setShowRipple(true);
    setTimeout(() => setShowRipple(false), 700);
  };

  const handleConfirm = () => {
    if (!hasDrawn) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    onSignatureChange?.(dataUrl);
    triggerRipple();
  };

  const handleClear = () => {
    drawGrid();
    setHasDrawn(false);
    onSignatureChange?.(undefined);
  };

  return (
    <div className={styles.wrapper}>
      <div className={styles.header}>
        <span className={styles.label}>{label}</span>
        <span className={styles.signer}>{signerName}</span>
      </div>
      <div
        className={`${styles.canvasContainer} ${showRipple ? styles.rippling : ''}`}
        ref={containerRef}
      >
        {showRipple && (
          <>
            <span className={`${styles.ripple} ${styles.ripple1}`} />
            <span className={`${styles.ripple} ${styles.ripple2}`} />
            <span className={`${styles.ripple} ${styles.ripple3}`} />
          </>
        )}
        <canvas
          ref={canvasRef}
          className={styles.canvas}
          onMouseDown={startDraw}
          onMouseMove={doDraw}
          onMouseUp={endDraw}
          onMouseLeave={endDraw}
          onTouchStart={startDraw}
          onTouchMove={doDraw}
          onTouchEnd={endDraw}
        />
        {!hasDrawn && (
          <div className={styles.placeholder}>请在此处绘制签名（支持鼠标或触摸）</div>
        )}
      </div>
      <div className={styles.actions}>
        <button className={styles.clearBtn} onClick={handleClear} type="button">
          清除
        </button>
        <button
          className={`${styles.confirmBtn} ${!hasDrawn ? styles.disabled : ''}`}
          onClick={handleConfirm}
          disabled={!hasDrawn}
          type="button"
        >
          确认签名
        </button>
      </div>
    </div>
  );
};

export default SignatureCanvas;
